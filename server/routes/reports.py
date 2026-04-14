import csv
import io
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from typing import Optional

from server.db.init import get_db

router = APIRouter()


@router.get("/export")
async def export_csv(start: str = "", end: str = "", contractor_id: Optional[str] = None):
    db = await get_db()
    query = """SELECT a.work_date, l.name as laborer_name, c.name as contractor_name,
                      l.role, l.daily_wage, l.shift_type,
                      a.check_in_time, a.check_out_time, a.hours_worked,
                      a.shift_hours, a.overtime_hours, a.status
               FROM attendance a
               JOIN laborers l ON l.id = a.laborer_id
               LEFT JOIN contractors c ON c.id = l.contractor_id
               WHERE a.work_date BETWEEN ? AND ?"""
    params = [start, end]
    if contractor_id:
        query += " AND l.contractor_id = ?"
        params.append(contractor_id)
    query += " ORDER BY a.work_date, l.name"

    rows = await db.execute_fetchall(query, params)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Date", "Laborer", "Contractor", "Role", "Daily Wage", "Shift Type",
        "Check In", "Check Out", "Hours Worked", "Shift Hours", "Overtime", "Status"
    ])
    for r in rows:
        writer.writerow([
            r["work_date"], r["laborer_name"], r["contractor_name"],
            r["role"], r["daily_wage"], r["shift_type"],
            r["check_in_time"], r["check_out_time"],
            round(r["hours_worked"], 2) if r["hours_worked"] else "",
            r["shift_hours"], r["overtime_hours"] or 0, r["status"],
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=attendance_{start}_to_{end}.csv"},
    )
