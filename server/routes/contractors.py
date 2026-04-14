import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from server.db.init import get_db

router = APIRouter()


class ContractorCreate(BaseModel):
    name: str
    company: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class ContractorUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


@router.get("")
async def list_contractors():
    db = await get_db()
    rows = await db.execute_fetchall(
        """SELECT c.*, COUNT(l.id) as laborer_count
           FROM contractors c
           LEFT JOIN laborers l ON l.contractor_id = c.id AND l.status = 'active'
           WHERE c.status = 'active'
           GROUP BY c.id
           ORDER BY c.created_at DESC"""
    )
    return [dict(r) for r in rows]


@router.post("")
async def create_contractor(data: ContractorCreate):
    db = await get_db()
    cid = str(uuid.uuid4())
    await db.execute(
        "INSERT INTO contractors (id, name, company, phone, email) VALUES (?, ?, ?, ?, ?)",
        (cid, data.name, data.company, data.phone, data.email),
    )
    await db.commit()
    row = await db.execute_fetchall("SELECT * FROM contractors WHERE id = ?", (cid,))
    return dict(row[0])


@router.put("/{contractor_id}")
async def update_contractor(contractor_id: str, data: ContractorUpdate):
    db = await get_db()
    existing = await db.execute_fetchall("SELECT * FROM contractors WHERE id = ?", (contractor_id,))
    if not existing:
        raise HTTPException(404, "Contractor not found")

    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        return dict(existing[0])

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [contractor_id]
    await db.execute(f"UPDATE contractors SET {set_clause} WHERE id = ?", values)
    await db.commit()
    row = await db.execute_fetchall("SELECT * FROM contractors WHERE id = ?", (contractor_id,))
    return dict(row[0])


@router.delete("/{contractor_id}")
async def delete_contractor(contractor_id: str):
    db = await get_db()
    active = await db.execute_fetchall(
        "SELECT COUNT(*) as cnt FROM laborers WHERE contractor_id = ? AND status = 'active'",
        (contractor_id,),
    )
    if active[0]["cnt"] > 0:
        raise HTTPException(400, "Cannot delete contractor with active laborers")

    await db.execute("UPDATE contractors SET status = 'inactive' WHERE id = ?", (contractor_id,))
    await db.commit()
    return {"ok": True}
