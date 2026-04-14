import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "server" / "uploads"
DB_PATH = BASE_DIR / "data" / "attendance.db"
SCHEMA_PATH = Path(__file__).resolve().parent / "db" / "schema.sql"

# Face recognition
FACE_MATCH_THRESHOLD = 0.55  # cosine distance threshold (aligned + TTA embeddings)
FACE_MODEL = "ArcFace"
FACE_DETECTOR = "retinaface"
MAX_IMAGE_SIZE = 2048  # px on longest side

# Ensure directories exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
(UPLOAD_DIR / "enrollments").mkdir(exist_ok=True)
(UPLOAD_DIR / "aadhaar").mkdir(exist_ok=True)
(UPLOAD_DIR / "group_photos").mkdir(exist_ok=True)
(BASE_DIR / "data").mkdir(parents=True, exist_ok=True)
