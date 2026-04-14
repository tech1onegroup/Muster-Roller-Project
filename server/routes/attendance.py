import uuid
import math
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional

from server.config import UPLOAD_DIR
from server.db.init import get_db
from server.services.attendance import update_attendance_record

router = APIRouter()


@router.post("/upload")
async def upload_group_photo(
    photo: UploadFile = File(...),
    session_type: str = Form(...),
    work_date: str = Form(...),
):
    if session_type not in ("check_in", "check_out"):
        raise HTTPException(400, "session_type must be 'check_in' or 'check_out'")

    # Save photo
    ext = Path(photo.filename).suffix or ".jpg"
    filename = f"{work_date}_{session_type}_{uuid.uuid4().hex[:8]}{ext}"
    photo_path = f"group_photos/{filename}"
    dest = UPLOAD_DIR / photo_path
    dest.write_bytes(await photo.read())

    # Run face detection + matching
    from server.services.face import detect_and_match
    results = await detect_and_match(str(dest))

    # Create session record
    session_id = str(uuid.uuid4())
    db = await get_db()
    await db.execute(
        """INSERT INTO attendance_sessions (id, photo_path, session_type, work_date, captured_at)
           VALUES (?, ?, ?, ?, ?)""",
        (session_id, photo_path, session_type, work_date, datetime.now().isoformat()),
    )
    await db.commit()

    return {
        "session_id": session_id,
        "session_type": session_type,
        "work_date": work_date,
        "faces": results,
        "photo_path": photo_path,
    }


@router.post("/confirm")
async def confirm_attendance(
    session_id: str = Form(...),
    session_type: str = Form(...),
    work_date: str = Form(...),
    matches: str = Form(...),  # JSON string: [{laborer_id, confidence, manual_override}]
):
    import json
    match_list = json.loads(matches)
    db = await get_db()
    now = datetime.now().isoformat()

    for m in match_list:
        laborer_id = m["laborer_id"]
        confidence = m.get("confidence", 0)
        manual = m.get("manual_override", False)

        if session_type == "check_in":
            # Check for existing record
            existing = await db.execute_fetchall(
                "SELECT * FROM attendance WHERE laborer_id = ? AND work_date = ?",
                (laborer_id, work_date),
            )
            if existing:
                # Update existing check-in
                await db.execute(
                    """UPDATE attendance SET check_in_session_id = ?, check_in_time = ?,
                       confidence_in = ?, manual_override = ? WHERE laborer_id = ? AND work_date = ?""",
                    (session_id, now, confidence, manual, laborer_id, work_date),
                )
            else:
                aid = str(uuid.uuid4())
                # Get laborer shift info
                lab = await db.execute_fetchall("SELECT shift_type FROM laborers WHERE id = ?", (laborer_id,))
                shift_hours = 12.0 if lab and lab[0]["shift_type"] == "12hr" else 8.0
                await db.execute(
                    """INSERT INTO attendance (id, laborer_id, work_date, check_in_session_id,
                       check_in_time, shift_hours, confidence_in, manual_override, status)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'present')""",
                    (aid, laborer_id, work_date, session_id, now, shift_hours, confidence, manual),
                )

        elif session_type == "check_out":
            existing = await db.execute_fetchall(
                "SELECT * FROM attendance WHERE laborer_id = ? AND work_date = ?",
                (laborer_id, work_date),
            )
            if existing:
                rec = dict(existing[0])
                check_in_time = rec.get("check_in_time")
                hours_worked = None
                overtime_hours = 0
                status = "present"
                shift_hours = rec.get("shift_hours") or 8.0

                if check_in_time:
                    ci = datetime.fromisoformat(check_in_time)
                    co = datetime.fromisoformat(now)
                    hours_worked = (co - ci).total_seconds() / 3600

                    if hours_worked >= shift_hours:
                        status = "present"
                        remainder = hours_worked - shift_hours
                        overtime_hours = math.ceil(remainder) if remainder >= (10 / 60) else 0
                    elif hours_worked >= shift_hours / 2:
                        status = "half_day"
                    else:
                        status = "not_productive"

                await db.execute(
                    """UPDATE attendance SET check_out_session_id = ?, check_out_time = ?,
                       hours_worked = ?, overtime_hours = ?, status = ?,
                       confidence_out = ?, manual_override = ? WHERE laborer_id = ? AND work_date = ?""",
                    (session_id, now, hours_worked, overtime_hours, status,
                     confidence, manual, laborer_id, work_date),
                )
            else:
                # No check-in exists — create record with check-out only
                aid = str(uuid.uuid4())
                lab = await db.execute_fetchall("SELECT shift_type FROM laborers WHERE id = ?", (laborer_id,))
                shift_hours = 12.0 if lab and lab[0]["shift_type"] == "12hr" else 8.0
                await db.execute(
                    """INSERT INTO attendance (id, laborer_id, work_date, check_out_session_id,
                       check_out_time, shift_hours, confidence_out, manual_override, status)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'present')""",
                    (aid, laborer_id, work_date, session_id, now, shift_hours, confidence, manual),
                )

    # Mark session as confirmed
    await db.execute("UPDATE attendance_sessions SET confirmed = 1 WHERE id = ?", (session_id,))
    await db.commit()
    return {"ok": True, "confirmed_count": len(match_list)}


@router.get("")
async def get_attendance(date: Optional[str] = None):
    db = await get_db()
    if date:
        rows = await db.execute_fetchall(
            """SELECT a.*, l.name as laborer_name, l.daily_wage, l.role,
                      c.name as contractor_name
               FROM attendance a
               JOIN laborers l ON l.id = a.laborer_id
               LEFT JOIN contractors c ON c.id = l.contractor_id
               WHERE a.work_date = ?
               ORDER BY l.name""",
            (date,),
        )
    else:
        rows = await db.execute_fetchall(
            """SELECT a.*, l.name as laborer_name, l.daily_wage, l.role,
                      c.name as contractor_name
               FROM attendance a
               JOIN laborers l ON l.id = a.laborer_id
               LEFT JOIN contractors c ON c.id = l.contractor_id
               ORDER BY a.work_date DESC, l.name"""
        )
    return [dict(r) for r in rows]


@router.get("/range")
async def get_attendance_range(
    start: str = "",
    end: str = "",
    contractor_id: Optional[str] = None,
):
    db = await get_db()
    query = """SELECT a.*, l.name as laborer_name, l.daily_wage, l.role, l.shift_type,
                      c.name as contractor_name
               FROM attendance a
               JOIN laborers l ON l.id = a.laborer_id
               LEFT JOIN contractors c ON c.id = l.contractor_id
               WHERE a.work_date BETWEEN ? AND ?"""
    params = [start, end]
    if contractor_id:
        query += " AND l.contractor_id = ?"
        params.append(contractor_id)
    query += " ORDER BY a.work_date DESC, l.name"
    rows = await db.execute_fetchall(query, params)
    return [dict(r) for r in rows]


@router.patch("/{record_id}")
async def patch_attendance(
    record_id: str,
    status: Optional[str] = Form(None),
    check_in_time: Optional[str] = Form(None),
    check_out_time: Optional[str] = Form(None),
    overtime_hours: Optional[float] = Form(None),
):
    db = await get_db()
    try:
        updated = await update_attendance_record(db, record_id, {
            "status": status,
            "check_in_time": check_in_time,
            "check_out_time": check_out_time,
            "overtime_hours": overtime_hours,
        })
    except ValueError as e:
        raise HTTPException(400, str(e))
    return updated
