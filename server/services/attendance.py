import math
from datetime import datetime


def calculate_attendance(check_in_time: str, check_out_time: str, shift_type: str) -> dict:
    """Calculate hours worked, overtime, and status from check-in/out times."""
    ci = datetime.fromisoformat(check_in_time)
    co = datetime.fromisoformat(check_out_time)
    hours_worked = (co - ci).total_seconds() / 3600
    shift_hours = 8.0 if shift_type == "8hr" else 12.0

    if hours_worked >= shift_hours:
        status = "present"
        remainder = hours_worked - shift_hours
        overtime_hours = math.ceil(remainder) if remainder >= (10 / 60) else 0
    elif hours_worked >= shift_hours / 2:
        status = "half_day"
        overtime_hours = 0
    else:
        status = "not_productive"
        overtime_hours = 0

    return {
        "hours_worked": round(hours_worked, 2),
        "shift_hours": shift_hours,
        "overtime_hours": overtime_hours,
        "status": status,
    }


VALID_STATUSES = {"present", "half_day", "not_productive"}


async def update_attendance_record(db, record_id: str, fields: dict) -> dict:
    """Patch an attendance row. Recomputes hours_worked when both times present.
    Sets edited=1 and edited_at=now. Returns the updated row as dict."""
    rows = await db.execute_fetchall("SELECT * FROM attendance WHERE id = ?", (record_id,))
    if not rows:
        raise ValueError("Attendance record not found")
    rec = dict(rows[0])

    updates = {}

    if "status" in fields and fields["status"] is not None:
        if fields["status"] not in VALID_STATUSES:
            raise ValueError(f"status must be one of {VALID_STATUSES}")
        updates["status"] = fields["status"]

    for time_field in ("check_in_time", "check_out_time"):
        if time_field in fields and fields[time_field] is not None:
            val = fields[time_field]
            # Validate ISO parseable
            datetime.fromisoformat(val)
            updates[time_field] = val

    if "overtime_hours" in fields and fields["overtime_hours"] is not None:
        ot = float(fields["overtime_hours"])
        if ot < 0:
            raise ValueError("overtime_hours must be >= 0")
        updates["overtime_hours"] = ot

    # Recompute hours_worked if both times now exist
    new_ci = updates.get("check_in_time", rec.get("check_in_time"))
    new_co = updates.get("check_out_time", rec.get("check_out_time"))
    if new_ci and new_co and ("check_in_time" in updates or "check_out_time" in updates):
        ci = datetime.fromisoformat(new_ci)
        co = datetime.fromisoformat(new_co)
        hours = (co - ci).total_seconds() / 3600
        if hours >= 0:
            updates["hours_worked"] = round(hours, 2)

    updates["edited"] = 1
    updates["edited_at"] = datetime.now().isoformat()

    set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
    params = list(updates.values()) + [record_id]
    await db.execute(f"UPDATE attendance SET {set_clause} WHERE id = ?", params)
    await db.commit()

    rows = await db.execute_fetchall("SELECT * FROM attendance WHERE id = ?", (record_id,))
    return dict(rows[0])
