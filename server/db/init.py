import aiosqlite
from server.config import DB_PATH, SCHEMA_PATH

_db = None


async def get_db() -> aiosqlite.Connection:
    global _db
    if _db is None:
        _db = await aiosqlite.connect(str(DB_PATH))
        _db.row_factory = aiosqlite.Row
        await _db.execute("PRAGMA journal_mode=WAL")
        await _db.execute("PRAGMA foreign_keys=ON")
    return _db


async def _ensure_columns(db, table: str, columns: dict[str, str]):
    rows = await db.execute_fetchall(f"PRAGMA table_info({table})")
    existing = {r["name"] for r in rows}
    for col, ddl in columns.items():
        if col not in existing:
            await db.execute(f"ALTER TABLE {table} ADD COLUMN {col} {ddl}")


async def init_db():
    db = await get_db()
    schema = SCHEMA_PATH.read_text()
    await db.executescript(schema)
    # Idempotent migrations for existing databases
    await _ensure_columns(db, "attendance", {
        "edited": "INTEGER NOT NULL DEFAULT 0",
        "edited_at": "TIMESTAMP",
    })
    await db.commit()


async def close_db():
    global _db
    if _db:
        await _db.close()
        _db = None
