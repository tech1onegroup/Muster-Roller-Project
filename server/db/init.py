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


async def init_db():
    db = await get_db()
    schema = SCHEMA_PATH.read_text()
    await db.executescript(schema)
    await db.commit()


async def close_db():
    global _db
    if _db:
        await _db.close()
        _db = None
