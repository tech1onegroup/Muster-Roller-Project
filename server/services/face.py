import uuid
import base64
import urllib.request
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort

from server.config import FACE_MATCH_THRESHOLD, MAX_IMAGE_SIZE, BASE_DIR
from server.db.init import get_db

MODELS_DIR = BASE_DIR / "models"
MODELS_DIR.mkdir(exist_ok=True)

ARCFACE_MODEL = MODELS_DIR / "w600k_r50.onnx"
YUNET_MODEL = MODELS_DIR / "yunet_2023mar.onnx"

ARCFACE_URL = "https://huggingface.co/public-data/insightface/resolve/main/models/buffalo_l/w600k_r50.onnx"
YUNET_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"

# Detection knobs — tuned for low-quality group photos with up to ~15 people.
# Lower score threshold catches small / blurry / off-axis faces; tighter NMS
# avoids merging neighbouring faces in dense groups.
DETECT_SCORE_THRESHOLD = 0.45
DETECT_NMS_THRESHOLD = 0.3
DETECT_TOP_K = 200

# Standard ArcFace 112x112 landmark template (right eye, left eye, nose,
# right mouth corner, left mouth corner). Aligning faces to this template
# before embedding gives a large accuracy boost vs. naive crop+resize.
ARCFACE_TEMPLATE = np.array(
    [
        [38.2946, 51.6963],
        [73.5318, 51.5014],
        [56.0252, 71.7366],
        [41.5493, 92.3655],
        [70.7299, 92.2041],
    ],
    dtype=np.float32,
)

_arcface_session = None


def _download_model(url: str, dest: Path):
    if dest.exists():
        return
    print(f"Downloading model to {dest.name}...")
    urllib.request.urlretrieve(url, str(dest))
    print(f"Downloaded {dest.name}")


def _get_arcface():
    global _arcface_session
    if _arcface_session is None:
        _download_model(ARCFACE_URL, ARCFACE_MODEL)
        _arcface_session = ort.InferenceSession(str(ARCFACE_MODEL))
    return _arcface_session


def _get_yunet(width: int, height: int):
    _download_model(YUNET_URL, YUNET_MODEL)
    detector = cv2.FaceDetectorYN.create(
        str(YUNET_MODEL),
        "",
        (width, height),
        DETECT_SCORE_THRESHOLD,
        DETECT_NMS_THRESHOLD,
        DETECT_TOP_K,
    )
    return detector


def _resize_image_cv(img: np.ndarray) -> np.ndarray:
    h, w = img.shape[:2]
    if max(w, h) <= MAX_IMAGE_SIZE:
        return img
    scale = MAX_IMAGE_SIZE / max(w, h)
    return cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)


def _enhance(img: np.ndarray) -> np.ndarray:
    """Boost low-light / low-contrast group photos before detection.

    Why: phone shots on construction sites are often backlit or noisy. CLAHE
    on the L channel restores facial detail without colour shift.
    """
    try:
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l = clahe.apply(l)
        merged = cv2.merge((l, a, b))
        return cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)
    except Exception:
        return img


def _align_face(img: np.ndarray, landmarks: np.ndarray) -> np.ndarray:
    """Warp face to canonical 112x112 using 5-point similarity transform."""
    try:
        src = landmarks.astype(np.float32).reshape(5, 2)
        M, _ = cv2.estimateAffinePartial2D(src, ARCFACE_TEMPLATE, method=cv2.LMEDS)
        if M is None:
            return None
        return cv2.warpAffine(img, M, (112, 112), borderValue=0.0)
    except Exception:
        return None


def _preprocess_face(face_img: np.ndarray) -> np.ndarray:
    face = face_img
    if face.shape[0] != 112 or face.shape[1] != 112:
        face = cv2.resize(face, (112, 112))
    face = cv2.cvtColor(face, cv2.COLOR_BGR2RGB)
    face = face.astype(np.float32)
    face = (face / 255.0 - 0.5) / 0.5
    face = face.transpose(2, 0, 1)
    face = np.expand_dims(face, 0)
    return face


def _embed(face_112: np.ndarray) -> np.ndarray:
    session = _get_arcface()
    input_name = session.get_inputs()[0].name
    out = session.run(None, {input_name: _preprocess_face(face_112)})[0][0]
    n = np.linalg.norm(out)
    return out / n if n > 0 else out


def _get_embedding(face_112: np.ndarray) -> np.ndarray:
    """Embedding with horizontal-flip TTA — averages two views for robustness
    against pose / lighting asymmetry. Costs 2x forward passes per face but
    measurably improves matching on low-quality crops.
    """
    e1 = _embed(face_112)
    e2 = _embed(cv2.flip(face_112, 1))
    avg = e1 + e2
    n = np.linalg.norm(avg)
    return avg / n if n > 0 else avg


def _detect_faces(img: np.ndarray):
    """Returns list of dicts: {bbox:(x,y,w,h), landmarks:np.ndarray(5,2), score:float}."""
    h, w = img.shape[:2]
    detector = _get_yunet(w, h)
    _, faces = detector.detect(img)
    if faces is None:
        return []
    out = []
    for face in faces:
        x, y, fw, fh = int(face[0]), int(face[1]), int(face[2]), int(face[3])
        x = max(0, x)
        y = max(0, y)
        fw = min(fw, w - x)
        fh = min(fh, h - y)
        if fw <= 10 or fh <= 10:
            continue
        landmarks = np.array(face[4:14], dtype=np.float32).reshape(5, 2)
        score = float(face[14])
        out.append({"bbox": (x, y, fw, fh), "landmarks": landmarks, "score": score})
    return out


def _crop_and_embed(img: np.ndarray, det: dict) -> np.ndarray:
    aligned = _align_face(img, det["landmarks"])
    if aligned is None:
        x, y, w, h = det["bbox"]
        aligned = img[y : y + h, x : x + w]
    return _get_embedding(aligned)


def _embedding_to_bytes(embedding: np.ndarray) -> bytes:
    return embedding.astype(np.float32).tobytes()


def _bytes_to_embedding(data: bytes) -> np.ndarray:
    return np.frombuffer(data, dtype=np.float32)


def _cosine_distance(a: np.ndarray, b: np.ndarray) -> float:
    dot = float(np.dot(a, b))
    norm = float(np.linalg.norm(a) * np.linalg.norm(b))
    if norm == 0:
        return 1.0
    return 1.0 - (dot / norm)


async def enroll_face(laborer_id: str, photo_path: str):
    img = cv2.imread(photo_path)
    if img is None:
        raise ValueError("Could not read image file")

    img = _enhance(img)
    detections = _detect_faces(img)
    if not detections:
        raise ValueError("No face detected in the photo")

    # Pick the largest face by bbox area — most reliable for enrollment shots.
    det = max(detections, key=lambda d: d["bbox"][2] * d["bbox"][3])
    embedding = _crop_and_embed(img, det)
    emb_bytes = _embedding_to_bytes(embedding)

    db = await get_db()
    await db.execute("DELETE FROM face_embeddings WHERE laborer_id = ?", (laborer_id,))
    eid = str(uuid.uuid4())
    await db.execute(
        "INSERT INTO face_embeddings (id, laborer_id, embedding, model) VALUES (?, ?, ?, ?)",
        (eid, laborer_id, emb_bytes, "ArcFace-ONNX-aligned"),
    )
    await db.commit()


async def detect_and_match(photo_path: str) -> list:
    img = cv2.imread(photo_path)
    if img is None:
        return []

    img = _resize_image_cv(img)
    img = _enhance(img)
    detections = _detect_faces(img)
    if not detections:
        return []

    db = await get_db()
    enrolled = await db.execute_fetchall(
        """SELECT fe.embedding, fe.laborer_id, l.name as laborer_name
           FROM face_embeddings fe
           JOIN laborers l ON l.id = fe.laborer_id
           WHERE l.status = 'active'"""
    )

    enrolled_data = []
    for row in enrolled:
        enrolled_data.append(
            {
                "laborer_id": row["laborer_id"],
                "laborer_name": row["laborer_name"],
                "embedding": _bytes_to_embedding(row["embedding"]),
            }
        )

    # Two-pass assignment: compute every face↔enrolled distance, then assign
    # greedily by best score so the strongest match wins each laborer instead
    # of locking it to whichever face was processed first.
    face_records = []
    for det in detections:
        x, y, w, h = det["bbox"]
        emb = _crop_and_embed(img, det)

        thumbnail_b64 = None
        try:
            pad = 20
            cx, cy = max(0, x - pad), max(0, y - pad)
            cw, ch = min(img.shape[1], x + w + pad), min(img.shape[0], y + h + pad)
            thumb = img[cy:ch, cx:cw]
            thumb = cv2.resize(thumb, (160, 160))
            _, buf = cv2.imencode(".jpg", thumb, [cv2.IMWRITE_JPEG_QUALITY, 85])
            thumbnail_b64 = base64.b64encode(buf.tobytes()).decode()
        except Exception:
            pass

        face_records.append(
            {
                "bbox": {"x": x, "y": y, "w": w, "h": h},
                "thumbnail": thumbnail_b64,
                "embedding": emb,
                "matched": False,
                "laborer_id": None,
                "laborer_name": None,
                "confidence": 0,
            }
        )

    # Build candidate list (face_idx, enrolled_idx, distance) and sort.
    candidates = []
    for fi, fr in enumerate(face_records):
        for ei, en in enumerate(enrolled_data):
            d = _cosine_distance(fr["embedding"], en["embedding"])
            if d < FACE_MATCH_THRESHOLD:
                candidates.append((d, fi, ei))
    candidates.sort()

    used_faces = set()
    used_enrolled = set()
    for d, fi, ei in candidates:
        if fi in used_faces or ei in used_enrolled:
            continue
        en = enrolled_data[ei]
        face_records[fi]["matched"] = True
        face_records[fi]["laborer_id"] = en["laborer_id"]
        face_records[fi]["laborer_name"] = en["laborer_name"]
        face_records[fi]["confidence"] = round(1 - d, 3)
        used_faces.add(fi)
        used_enrolled.add(ei)

    # Strip embeddings before returning to client.
    for fr in face_records:
        fr.pop("embedding", None)
    return face_records
