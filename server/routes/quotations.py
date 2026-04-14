import uuid
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from server.config import UPLOAD_DIR
from server.db.init import get_db
from server.services.quotation_calc import (
    calculate_line_item, calculate_quotation_totals, generate_comparison,
)

router = APIRouter()

# Ensure upload dir
(UPLOAD_DIR / "quotations").mkdir(exist_ok=True)


# ─── Vendor CRUD ──────────────────────────────────────────

class VendorCreate(BaseModel):
    name: str
    company: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gst_number: Optional[str] = None
    address: Optional[str] = None
    rating: Optional[int] = 0
    notes: Optional[str] = None


@router.get("/vendors")
async def list_vendors():
    db = await get_db()
    rows = await db.execute_fetchall(
        """SELECT v.*, COUNT(q.id) as quote_count
           FROM vendors v LEFT JOIN quotations q ON q.vendor_id = v.id
           WHERE v.status = 'active'
           GROUP BY v.id ORDER BY v.created_at DESC"""
    )
    return [dict(r) for r in rows]


@router.post("/vendors")
async def create_vendor(data: VendorCreate):
    db = await get_db()
    vid = str(uuid.uuid4())
    await db.execute(
        """INSERT INTO vendors (id, name, company, phone, email, gst_number, address, rating, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (vid, data.name, data.company, data.phone, data.email,
         data.gst_number, data.address, data.rating, data.notes),
    )
    await db.commit()
    row = await db.execute_fetchall("SELECT * FROM vendors WHERE id = ?", (vid,))
    return dict(row[0])


class VendorUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gst_number: Optional[str] = None
    address: Optional[str] = None
    rating: Optional[int] = None
    notes: Optional[str] = None


@router.put("/vendors/{vendor_id}")
async def update_vendor(vendor_id: str, data: VendorUpdate):
    db = await get_db()
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [vendor_id]
    await db.execute(f"UPDATE vendors SET {set_clause} WHERE id = ?", values)
    await db.commit()
    row = await db.execute_fetchall("SELECT * FROM vendors WHERE id = ?", (vendor_id,))
    return dict(row[0])


# ─── Project CRUD ─────────────────────────────────────────

class ProjectCreate(BaseModel):
    title: str
    description: Optional[str] = None


@router.get("/projects")
async def list_projects():
    db = await get_db()
    rows = await db.execute_fetchall(
        """SELECT p.*, COUNT(q.id) as quote_count,
                  v.name as approved_vendor_name
           FROM quotation_projects p
           LEFT JOIN quotations q ON q.project_id = p.id
           LEFT JOIN vendors v ON v.id = p.approved_vendor_id
           GROUP BY p.id ORDER BY p.created_at DESC"""
    )
    return [dict(r) for r in rows]


@router.post("/projects")
async def create_project(data: ProjectCreate):
    db = await get_db()
    pid = str(uuid.uuid4())
    await db.execute(
        "INSERT INTO quotation_projects (id, title, description) VALUES (?, ?, ?)",
        (pid, data.title, data.description),
    )
    await db.commit()
    row = await db.execute_fetchall("SELECT * FROM quotation_projects WHERE id = ?", (pid,))
    return dict(row[0])


@router.put("/projects/{project_id}")
async def update_project(project_id: str, data: ProjectCreate):
    db = await get_db()
    await db.execute(
        "UPDATE quotation_projects SET title = ?, description = ? WHERE id = ?",
        (data.title, data.description, project_id),
    )
    await db.commit()
    row = await db.execute_fetchall("SELECT * FROM quotation_projects WHERE id = ?", (project_id,))
    return dict(row[0])


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    db = await get_db()
    # Delete items, quotes, then project
    quotes = await db.execute_fetchall("SELECT id FROM quotations WHERE project_id = ?", (project_id,))
    for q in quotes:
        await db.execute("DELETE FROM quotation_items WHERE quotation_id = ?", (q["id"],))
    await db.execute("DELETE FROM quotations WHERE project_id = ?", (project_id,))
    await db.execute("DELETE FROM quotation_projects WHERE id = ?", (project_id,))
    await db.commit()
    return {"ok": True}


class ApproveData(BaseModel):
    vendor_id: str
    notes: Optional[str] = None


@router.patch("/projects/{project_id}/approve")
async def approve_project(project_id: str, data: ApproveData):
    db = await get_db()
    await db.execute(
        """UPDATE quotation_projects SET status = 'approved', approved_vendor_id = ?,
           approval_notes = ?, approved_at = ? WHERE id = ?""",
        (data.vendor_id, data.notes, datetime.now().isoformat(), project_id),
    )
    await db.commit()
    row = await db.execute_fetchall("SELECT * FROM quotation_projects WHERE id = ?", (project_id,))
    return dict(row[0])


class RejectData(BaseModel):
    notes: Optional[str] = None


@router.patch("/projects/{project_id}/reject")
async def reject_project(project_id: str, data: RejectData):
    db = await get_db()
    await db.execute(
        "UPDATE quotation_projects SET status = 'rejected', approval_notes = ? WHERE id = ?",
        (data.notes, project_id),
    )
    await db.commit()
    row = await db.execute_fetchall("SELECT * FROM quotation_projects WHERE id = ?", (project_id,))
    return dict(row[0])


# ─── Quotations (per project) ────────────────────────────

@router.get("/projects/{project_id}/quotes")
async def list_quotes(project_id: str):
    db = await get_db()
    rows = await db.execute_fetchall(
        """SELECT q.*, v.name as vendor_name, v.company as vendor_company,
                  v.gst_number as vendor_gst_number,
                  (SELECT COUNT(*) FROM quotation_items qi WHERE qi.quotation_id = q.id) as item_count
           FROM quotations q
           JOIN vendors v ON v.id = q.vendor_id
           WHERE q.project_id = ?
           ORDER BY q.created_at""",
        (project_id,),
    )
    return [dict(r) for r in rows]


@router.post("/projects/{project_id}/quotes")
async def create_quote(
    project_id: str,
    vendor_id: str = Form(...),
    gst_type: str = Form("exclusive"),
    gst_percent: float = Form(18),
    logistics_cost: float = Form(0),
    installation_cost: float = Form(0),
    other_charges: float = Form(0),
    payment_terms: Optional[str] = Form(None),
    delivery_days: Optional[int] = Form(None),
    warranty_months: Optional[int] = Form(None),
    validity_days: Optional[int] = Form(30),
    notes: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
):
    db = await get_db()
    qid = str(uuid.uuid4())
    file_path = None

    if file:
        ext = Path(file.filename).suffix or ".pdf"
        file_path = f"quotations/{qid}{ext}"
        dest = UPLOAD_DIR / file_path
        dest.write_bytes(await file.read())

    await db.execute(
        """INSERT INTO quotations (id, project_id, vendor_id, file_path, gst_type, gst_percent,
           logistics_cost, installation_cost, other_charges, payment_terms, delivery_days,
           warranty_months, validity_days, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (qid, project_id, vendor_id, file_path, gst_type, gst_percent,
         logistics_cost, installation_cost, other_charges, payment_terms,
         delivery_days, warranty_months, validity_days, notes),
    )
    # Update project status to comparing
    await db.execute(
        "UPDATE quotation_projects SET status = 'comparing' WHERE id = ? AND status = 'draft'",
        (project_id,),
    )
    await db.commit()

    row = await db.execute_fetchall(
        """SELECT q.*, v.name as vendor_name FROM quotations q
           JOIN vendors v ON v.id = q.vendor_id WHERE q.id = ?""",
        (qid,),
    )
    return dict(row[0])


@router.put("/quotes/{quote_id}")
async def update_quote(
    quote_id: str,
    gst_type: str = Form("exclusive"),
    gst_percent: float = Form(18),
    logistics_cost: float = Form(0),
    installation_cost: float = Form(0),
    other_charges: float = Form(0),
    payment_terms: Optional[str] = Form(None),
    delivery_days: Optional[int] = Form(None),
    warranty_months: Optional[int] = Form(None),
    validity_days: Optional[int] = Form(30),
    notes: Optional[str] = Form(None),
):
    db = await get_db()
    await db.execute(
        """UPDATE quotations SET gst_type=?, gst_percent=?, logistics_cost=?,
           installation_cost=?, other_charges=?, payment_terms=?, delivery_days=?,
           warranty_months=?, validity_days=?, notes=? WHERE id=?""",
        (gst_type, gst_percent, logistics_cost, installation_cost, other_charges,
         payment_terms, delivery_days, warranty_months, validity_days, notes, quote_id),
    )
    await db.commit()
    await _recalculate_quote(quote_id)
    row = await db.execute_fetchall("SELECT * FROM quotations WHERE id = ?", (quote_id,))
    return dict(row[0])


@router.delete("/quotes/{quote_id}")
async def delete_quote(quote_id: str):
    db = await get_db()
    await db.execute("DELETE FROM quotation_items WHERE quotation_id = ?", (quote_id,))
    await db.execute("DELETE FROM quotations WHERE id = ?", (quote_id,))
    await db.commit()
    return {"ok": True}


# ─── Line Items ───────────────────────────────────────────

class ItemCreate(BaseModel):
    item_description: str
    specification: Optional[str] = None
    brand: Optional[str] = None
    hsn_code: Optional[str] = None
    quantity: float = 1
    unit: str = "Nos"
    gross_rate: float = 0
    discount_percent: float = 0


@router.get("/quotes/{quote_id}/items")
async def list_items(quote_id: str):
    db = await get_db()
    rows = await db.execute_fetchall(
        "SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY sort_order",
        (quote_id,),
    )
    return [dict(r) for r in rows]


@router.post("/quotes/{quote_id}/items")
async def create_item(quote_id: str, data: ItemCreate):
    db = await get_db()
    iid = str(uuid.uuid4())
    calc = calculate_line_item(data.gross_rate, data.discount_percent, data.quantity)

    # Get next sort order
    max_order = await db.execute_fetchall(
        "SELECT MAX(sort_order) as mx FROM quotation_items WHERE quotation_id = ?", (quote_id,)
    )
    sort_order = (max_order[0]["mx"] or 0) + 1

    await db.execute(
        """INSERT INTO quotation_items (id, quotation_id, item_description, specification,
           brand, hsn_code, quantity, unit, gross_rate, discount_percent, net_rate, line_total, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (iid, quote_id, data.item_description, data.specification, data.brand,
         data.hsn_code, data.quantity, data.unit, data.gross_rate, data.discount_percent,
         calc["net_rate"], calc["line_total"], sort_order),
    )
    await db.commit()
    await _recalculate_quote(quote_id)
    row = await db.execute_fetchall("SELECT * FROM quotation_items WHERE id = ?", (iid,))
    return dict(row[0])


@router.put("/items/{item_id}")
async def update_item(item_id: str, data: ItemCreate):
    db = await get_db()
    calc = calculate_line_item(data.gross_rate, data.discount_percent, data.quantity)

    await db.execute(
        """UPDATE quotation_items SET item_description=?, specification=?, brand=?,
           hsn_code=?, quantity=?, unit=?, gross_rate=?, discount_percent=?,
           net_rate=?, line_total=? WHERE id=?""",
        (data.item_description, data.specification, data.brand, data.hsn_code,
         data.quantity, data.unit, data.gross_rate, data.discount_percent,
         calc["net_rate"], calc["line_total"], item_id),
    )
    await db.commit()

    # Get quote_id and recalculate
    item = await db.execute_fetchall("SELECT quotation_id FROM quotation_items WHERE id = ?", (item_id,))
    if item:
        await _recalculate_quote(item[0]["quotation_id"])
    row = await db.execute_fetchall("SELECT * FROM quotation_items WHERE id = ?", (item_id,))
    return dict(row[0])


@router.delete("/items/{item_id}")
async def delete_item(item_id: str):
    db = await get_db()
    item = await db.execute_fetchall("SELECT quotation_id FROM quotation_items WHERE id = ?", (item_id,))
    await db.execute("DELETE FROM quotation_items WHERE id = ?", (item_id,))
    await db.commit()
    if item:
        await _recalculate_quote(item[0]["quotation_id"])
    return {"ok": True}


# ─── Comparison ───────────────────────────────────────────

@router.get("/projects/{project_id}/compare")
async def compare_project(project_id: str):
    comparison = await generate_comparison(project_id)
    if not comparison:
        raise HTTPException(404, "Project not found")
    return comparison


@router.get("/projects/{project_id}/export-pdf")
async def export_pdf(project_id: str):
    from server.services.quotation_pdf import generate_pdf
    comparison = await generate_comparison(project_id)
    if not comparison:
        raise HTTPException(404, "Project not found")
    return await generate_pdf(comparison)


# ─── Helpers ──────────────────────────────────────────────

async def _recalculate_quote(quote_id: str):
    """Recalculate quotation totals from its line items."""
    db = await get_db()
    quote = await db.execute_fetchall("SELECT * FROM quotations WHERE id = ?", (quote_id,))
    if not quote:
        return
    q = dict(quote[0])
    items = await db.execute_fetchall(
        "SELECT * FROM quotation_items WHERE quotation_id = ?", (quote_id,)
    )
    item_list = [dict(i) for i in items]

    totals = calculate_quotation_totals(
        item_list,
        q["gst_type"],
        q["gst_percent"],
        q["logistics_cost"],
        q["installation_cost"],
        q["other_charges"],
    )

    await db.execute(
        """UPDATE quotations SET base_amount=?, discount_percent=?, discount_amount=?,
           net_amount=?, gst_amount=?, total_landed_cost=? WHERE id=?""",
        (totals["base_amount"], totals["discount_percent"], totals["discount_amount"],
         totals["net_amount"], totals["gst_amount"], totals["total_landed_cost"], quote_id),
    )
    await db.commit()
