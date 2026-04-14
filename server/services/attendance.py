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
