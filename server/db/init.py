import re
from pathlib import Path
from server.db.pg import get_pool, close_pool, DB_SCHEMA

SCHEMA_PG_PATH = Path(__file__).resolve().parent / "schema_pg.sql"

_db = None
_PH_RE = re.compile(r"\?")


def _convert_placeholders(sql: str) -> str:
    counter = {"i": 0}

    def repl(_):
        counter["i"] += 1
        return f"${counter['i']}"

    return _PH_RE.sub(repl, sql)


class PgConn:
    """aiosqlite-compatible shim over an asyncpg pool.

    Why: keeps route/service code unchanged. Translates `?` placeholders to
    `$N`, and surfaces the `execute` / `execute_fetchall` / `commit` methods
    the codebase already uses. asyncpg autocommits per statement, so
    `commit()` is a no-op.
    """

    def __init__(self, pool):
        self.pool = pool

    async def execute(self, sql, params=None):
        sql2 = _convert_placeholders(sql)
        args = list(params) if params else []
        async with self.pool.acquire() as conn:
            await conn.execute(sql2, *args)

    async def execute_fetchall(self, sql, params=None):
        sql2 = _convert_placeholders(sql)
        args = list(params) if params else []
        async with self.pool.acquire() as conn:
            return await conn.fetch(sql2, *args)

    async def executescript(self, script: str):
        async with self.pool.acquire() as conn:
            await conn.execute(script)

    async def commit(self):
        return None


async def get_db() -> PgConn:
    global _db
    if _db is None:
        pool = await get_pool()
        _db = PgConn(pool)
    return _db


async def init_db():
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(f'CREATE SCHEMA IF NOT EXISTS "{DB_SCHEMA}"')
        await conn.execute(f'SET search_path TO "{DB_SCHEMA}"')
        schema = SCHEMA_PG_PATH.read_text()
        await conn.execute(schema)


async def close_db():
    global _db
    _db = None
    await close_pool()
