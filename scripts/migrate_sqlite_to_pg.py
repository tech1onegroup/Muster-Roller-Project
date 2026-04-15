"""One-shot migration: copies rows from local SQLite attendance.db into
Postgres (muster_roller schema). Safe to re-run — uses ON CONFLICT DO NOTHING
so existing Postgres rows are not overwritten.

Run from repo root:
    python -m scripts.migrate_sqlite_to_pg
"""
import asyncio
import aiosqlite

from server.config import DB_PATH
from server.db.init import init_db, get_db, close_db

TABLES = [
    ("contractors",
     ["id", "name", "company", "phone", "email", "status", "created_at"]),
    ("laborers",
     ["id", "name", "contractor_id", "phone", "role", "daily_wage", "shift_type",
      "photo_path", "aadhaar_photo_path", "aadhaar_last4", "emergency_contact",
      "status", "created_at"]),
    ("face_embeddings",
     ["id", "laborer_id", "embedding", "model", "created_at"]),
    ("attendance_sessions",
     ["id", "photo_path", "session_type", "work_date", "captured_at",
      "confirmed", "created_at"]),
    ("attendance",
     ["id", "laborer_id", "work_date", "check_in_session_id", "check_out_session_id",
      "check_in_time", "check_out_time", "hours_worked", "shift_hours",
      "overtime_hours", "status", "confidence_in", "confidence_out",
      "manual_override", "edited", "edited_at", "created_at"]),
]

BOOL_COLS = {
    "attendance_sessions": {"confirmed"},
    "attendance": {"manual_override"},
}


def _coerce(table: str, col: str, val):
    if val is None:
        return None
    if table in BOOL_COLS and col in BOOL_COLS[table]:
        return bool(val)
    return val


async def migrate():
    await init_db()
    pg = await get_db()

    sqlite = await aiosqlite.connect(str(DB_PATH))
    sqlite.row_factory = aiosqlite.Row

    total = 0
    for table, cols in TABLES:
        col_list = ", ".join(cols)
        placeholders = ", ".join("?" for _ in cols)
        sql = (f"INSERT INTO {table} ({col_list}) VALUES ({placeholders}) "
               f"ON CONFLICT (id) DO NOTHING")

        cursor = await sqlite.execute(f"SELECT {col_list} FROM {table}")
        rows = await cursor.fetchall()
        inserted = 0
        for r in rows:
            params = tuple(_coerce(table, c, r[c]) for c in cols)
            await pg.execute(sql, params)
            inserted += 1
        print(f"{table}: {inserted} rows")
        total += inserted

    await sqlite.close()
    await close_db()
    print(f"done — {total} rows migrated")


if __name__ == "__main__":
    asyncio.run(migrate())
