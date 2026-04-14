import uuid
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional

from server.config import UPLOAD_DIR
from server.db.init import get_db

router = APIRouter()


@router.get("")
async def list_laborers(contractor_id: Optional[str] = None, status: Optional[str] = None):
    db = await get_db()
    query = """SELECT l.*, c.name as contractor_name,
                      (SELECT MAX(a.work_date) FROM attendance a WHERE a.laborer_id = l.id) as last_attendance_date
               FROM laborers l
               LEFT JOIN contractors c ON c.id = l.contractor_id
               WHERE 1=1"""
    params = []
    if contractor_id:
        query += " AND l.contractor_id = ?"
        params.append(contractor_id)
    if status:
        query += " AND l.status = ?"
        params.append(status)
    query += " ORDER BY l.created_at DESC"
    rows = await db.execute_fetchall(query, params)
    return [dict(r) for r in rows]


@router.post("")
async def create_laborer(
    name: str = Form(...),
    contractor_id: str = Form(...),
    daily_wage: float = Form(...),
    shift_type: str = Form("8hr"),
    phone: Optional[str] = Form(None),
    role: Optional[str] = Form(None),
    emergency_contact: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    aadhaar_photo: Optional[UploadFile] = File(None),
):
    db = await get_db()
    lid = str(uuid.uuid4())
    photo_path = None
    aadhaar_photo_path = None
    aadhaar_last4 = None

    # Save face photo to disk (enrollment happens after DB insert)
    face_dest = None
    if photo:
        ext = Path(photo.filename).suffix or ".jpg"
        photo_path = f"enrollments/{lid}{ext}"
        face_dest = UPLOAD_DIR / photo_path
        face_dest.write_bytes(await photo.read())

    # Save Aadhaar photo & OCR
    if aadhaar_photo:
        ext = Path(aadhaar_photo.filename).suffix or ".jpg"
        aadhaar_photo_path = f"aadhaar/{lid}{ext}"
        dest = UPLOAD_DIR / aadhaar_photo_path
        dest.write_bytes(await aadhaar_photo.read())

        try:
            from server.services.ocr import extract_aadhaar
            aadhaar_last4 = await extract_aadhaar(str(dest))
        except Exception:
            pass  # OCR failure is non-blocking

    # Insert laborer row FIRST (so face_embeddings FK is satisfied)
    await db.execute(
        """INSERT INTO laborers (id, name, contractor_id, phone, role, daily_wage, shift_type,
           photo_path, aadhaar_photo_path, aadhaar_last4, emergency_contact)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (lid, name, contractor_id, phone, role, daily_wage, shift_type,
         photo_path, aadhaar_photo_path, aadhaar_last4, emergency_contact),
    )
    await db.commit()

    # Now enroll face (FK to laborers row is satisfied)
    if face_dest:
        try:
            from server.services.face import enroll_face
            await enroll_face(lid, str(face_dest))
        except Exception as e:
            face_dest.unlink(missing_ok=True)
            # Laborer was created but face enrollment failed — update photo_path to null
            await db.execute("UPDATE laborers SET photo_path = NULL WHERE id = ?", (lid,))
            await db.commit()
            raise HTTPException(400, f"Laborer created but face enrollment failed: {e}")
    rows = await db.execute_fetchall(
        "SELECT l.*, c.name as contractor_name FROM laborers l LEFT JOIN contractors c ON c.id = l.contractor_id WHERE l.id = ?",
        (lid,),
    )
    return dict(rows[0])


@router.put("/{laborer_id}")
async def update_laborer(
    laborer_id: str,
    name: Optional[str] = Form(None),
    contractor_id: Optional[str] = Form(None),
    daily_wage: Optional[float] = Form(None),
    shift_type: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    role: Optional[str] = Form(None),
    emergency_contact: Optional[str] = Form(None),
):
    db = await get_db()
    existing = await db.execute_fetchall("SELECT * FROM laborers WHERE id = ?", (laborer_id,))
    if not existing:
        raise HTTPException(404, "Laborer not found")

    fields = {"name": name, "contractor_id": contractor_id, "daily_wage": daily_wage,
              "shift_type": shift_type, "phone": phone, "role": role, "emergency_contact": emergency_contact}
    updates = {k: v for k, v in fields.items() if v is not None}
    if not updates:
        return dict(existing[0])

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [laborer_id]
    await db.execute(f"UPDATE laborers SET {set_clause} WHERE id = ?", values)
    await db.commit()
    rows = await db.execute_fetchall(
        "SELECT l.*, c.name as contractor_name FROM laborers l LEFT JOIN contractors c ON c.id = l.contractor_id WHERE l.id = ?",
        (laborer_id,),
    )
    return dict(rows[0])


@router.post("/{laborer_id}/re-enroll")
async def re_enroll(laborer_id: str, photo: UploadFile = File(...)):
    db = await get_db()
    existing = await db.execute_fetchall("SELECT * FROM laborers WHERE id = ?", (laborer_id,))
    if not existing:
        raise HTTPException(404, "Laborer not found")

    ext = Path(photo.filename).suffix or ".jpg"
    photo_path = f"enrollments/{laborer_id}{ext}"
    dest = UPLOAD_DIR / photo_path
    dest.write_bytes(await photo.read())

    try:
        from server.services.face import enroll_face
        await enroll_face(laborer_id, str(dest))
    except Exception as e:
        dest.unlink(missing_ok=True)
        raise HTTPException(400, f"Face enrollment failed: {e}")

    await db.execute("UPDATE laborers SET photo_path = ? WHERE id = ?", (photo_path, laborer_id))
    await db.commit()
    return {"ok": True, "photo_path": photo_path}


@router.patch("/{laborer_id}/status")
async def update_status(laborer_id: str, status: str = Form(...)):
    db = await get_db()
    if status not in ("active", "inactive"):
        raise HTTPException(400, "Status must be 'active' or 'inactive'")
    await db.execute("UPDATE laborers SET status = ? WHERE id = ?", (status, laborer_id))
    await db.commit()
    return {"ok": True}
