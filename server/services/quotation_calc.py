"""Quotation calculation and comparison logic."""

from server.db.init import get_db


def calculate_line_item(gross_rate: float, discount_percent: float, quantity: float) -> dict:
    """Calculate net rate and line total for a single item."""
    discount_amount = gross_rate * (discount_percent / 100)
    net_rate = gross_rate - discount_amount
    line_total = net_rate * quantity
    return {
        "net_rate": round(net_rate, 2),
        "line_total": round(line_total, 2),
    }


def calculate_quotation_totals(
    items: list,
    gst_type: str,
    gst_percent: float,
    logistics_cost: float = 0,
    installation_cost: float = 0,
    other_charges: float = 0,
) -> dict:
    """Calculate full quotation totals from line items."""
    base_amount = sum(item.get("line_total", 0) for item in items)
    discount_amount = sum(
        item.get("gross_rate", 0) * item.get("quantity", 1) - item.get("line_total", 0)
        for item in items
    )
    discount_percent = round((discount_amount / (base_amount + discount_amount) * 100) if (base_amount + discount_amount) > 0 else 0, 2)

    net_amount = base_amount

    if gst_type == "exclusive":
        gst_amount = round(net_amount * (gst_percent / 100), 2)
    elif gst_type == "inclusive":
        gst_amount = round(net_amount - (net_amount / (1 + gst_percent / 100)), 2)
        net_amount = round(net_amount - gst_amount, 2)
    else:
        gst_amount = 0

    total_landed_cost = round(net_amount + gst_amount + logistics_cost + installation_cost + other_charges, 2)

    return {
        "base_amount": round(base_amount + discount_amount, 2),
        "discount_percent": discount_percent,
        "discount_amount": round(discount_amount, 2),
        "net_amount": round(net_amount, 2),
        "gst_amount": gst_amount,
        "total_landed_cost": total_landed_cost,
    }


async def generate_comparison(project_id: str) -> dict:
    """Generate full comparison data for a project."""
    db = await get_db()

    # Get project
    proj_rows = await db.execute_fetchall("SELECT * FROM quotation_projects WHERE id = ?", (project_id,))
    if not proj_rows:
        return None
    project = dict(proj_rows[0])

    # Get all quotations with vendor info
    quotes = await db.execute_fetchall(
        """SELECT q.*, v.name as vendor_name, v.company as vendor_company,
                  v.gst_number as vendor_gst_number
           FROM quotations q
           JOIN vendors v ON v.id = q.vendor_id
           WHERE q.project_id = ?
           ORDER BY q.created_at""",
        (project_id,),
    )
    quotes = [dict(q) for q in quotes]

    # Get all line items for all quotations
    for quote in quotes:
        items = await db.execute_fetchall(
            "SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY sort_order",
            (quote["id"],),
        )
        quote["items"] = [dict(i) for i in items]

    # Build comparison
    comparison = {
        "project": project,
        "vendors": quotes,
        "pricing": _compare_pricing(quotes),
        "items": _compare_items(quotes),
        "brands": _compare_brands(quotes),
        "terms": _compare_terms(quotes),
        "verdict": _generate_verdict(quotes),
    }
    return comparison


def _compare_pricing(quotes: list) -> list:
    """Build pricing comparison rows."""
    rows = [
        "base_amount", "discount_amount", "net_amount", "gst_type", "gst_percent",
        "gst_amount", "logistics_cost", "installation_cost", "other_charges", "total_landed_cost",
    ]
    labels = {
        "base_amount": "Base Quote Value",
        "discount_amount": "Discount",
        "net_amount": "Net Material Cost",
        "gst_type": "GST Status",
        "gst_percent": "GST %",
        "gst_amount": "GST Amount",
        "logistics_cost": "Logistics / Freight",
        "installation_cost": "Installation",
        "other_charges": "Other Charges",
        "total_landed_cost": "TOTAL LANDED COST",
    }
    result = []
    for key in rows:
        row = {"label": labels[key], "key": key, "values": {}}
        for q in quotes:
            val = q.get(key, 0)
            if key == "gst_type":
                val = val or "not_mentioned"
            row["values"][q["id"]] = val
        result.append(row)
    return result


def _compare_items(quotes: list) -> list:
    """Build item-by-item comparison. Flag missing items."""
    all_items = {}
    for q in quotes:
        for item in q.get("items", []):
            desc = item["item_description"].strip().lower()
            if desc not in all_items:
                all_items[desc] = {
                    "description": item["item_description"],
                    "specification": item.get("specification", ""),
                    "vendors": {},
                }
            all_items[desc]["vendors"][q["id"]] = {
                "brand": item.get("brand", ""),
                "quantity": item.get("quantity", 0),
                "unit": item.get("unit", ""),
                "gross_rate": item.get("gross_rate", 0),
                "net_rate": item.get("net_rate", 0),
                "line_total": item.get("line_total", 0),
                "hsn_code": item.get("hsn_code", ""),
            }

    # Mark missing items
    quote_ids = [q["id"] for q in quotes]
    result = []
    for desc, data in all_items.items():
        for qid in quote_ids:
            if qid not in data["vendors"]:
                data["vendors"][qid] = None  # Not Quoted
        result.append(data)
    return result


def _compare_brands(quotes: list) -> list:
    """Build brand audit comparison."""
    all_items = {}
    for q in quotes:
        for item in q.get("items", []):
            desc = item["item_description"].strip().lower()
            if desc not in all_items:
                all_items[desc] = {"description": item["item_description"], "vendors": {}}
            all_items[desc]["vendors"][q["id"]] = item.get("brand", "") or "Not Specified"

    result = []
    quote_ids = [q["id"] for q in quotes]
    for desc, data in all_items.items():
        for qid in quote_ids:
            if qid not in data["vendors"]:
                data["vendors"][qid] = "Not Quoted"
        result.append(data)
    return result


def _compare_terms(quotes: list) -> list:
    """Build commercial terms comparison."""
    terms = [
        ("payment_terms", "Payment Terms"),
        ("delivery_days", "Delivery (days)"),
        ("warranty_months", "Warranty (months)"),
        ("validity_days", "Quote Validity (days)"),
    ]
    result = []
    for key, label in terms:
        row = {"label": label, "key": key, "values": {}}
        for q in quotes:
            val = q.get(key)
            row["values"][q["id"]] = val if val is not None else "Not Mentioned"
        result.append(row)

    # GST number
    gst_row = {"label": "GST Number", "key": "vendor_gst_number", "values": {}}
    for q in quotes:
        gst_row["values"][q["id"]] = q.get("vendor_gst_number") or "Missing"
    result.append(gst_row)

    # HSN code presence
    hsn_row = {"label": "HSN Codes", "key": "hsn_codes", "values": {}}
    for q in quotes:
        items = q.get("items", [])
        with_hsn = sum(1 for i in items if i.get("hsn_code"))
        total = len(items)
        if total == 0:
            hsn_row["values"][q["id"]] = "No Items"
        elif with_hsn == total:
            hsn_row["values"][q["id"]] = "All Present"
        elif with_hsn == 0:
            hsn_row["values"][q["id"]] = "Missing"
        else:
            hsn_row["values"][q["id"]] = f"{with_hsn}/{total} Present"
    result.append(hsn_row)

    return result


def _generate_verdict(quotes: list) -> dict:
    """Generate executive verdict."""
    if not quotes:
        return {"winner": None, "metrics": [], "recommendation": "No quotes to compare."}

    metrics = []

    # Lowest total landed cost
    valid = [(q, q["total_landed_cost"]) for q in quotes if q["total_landed_cost"] > 0]
    if valid:
        best = min(valid, key=lambda x: x[1])
        worst = max(valid, key=lambda x: x[1])
        savings = round(worst[1] - best[1], 2)
        metrics.append({
            "metric": "Lowest Total Landed Cost",
            "winner_id": best[0]["id"],
            "winner_name": best[0]["vendor_name"],
            "reason": f"₹{savings:,.2f} cheaper than highest quote",
        })

    # Best GST compliance
    for q in quotes:
        q["_gst_score"] = 0
        if q.get("gst_type") == "exclusive":
            q["_gst_score"] += 2
        elif q.get("gst_type") == "inclusive":
            q["_gst_score"] += 1
        if q.get("vendor_gst_number"):
            q["_gst_score"] += 2
        items = q.get("items", [])
        if items and all(i.get("hsn_code") for i in items):
            q["_gst_score"] += 1

    best_gst = max(quotes, key=lambda q: q["_gst_score"])
    metrics.append({
        "metric": "Best GST Compliance",
        "winner_id": best_gst["id"],
        "winner_name": best_gst["vendor_name"],
        "reason": "Best combination of GST type, GSTIN, and HSN codes",
    })

    # Best brand quality
    for q in quotes:
        items = q.get("items", [])
        q["_brand_score"] = sum(1 for i in items if i.get("brand") and i["brand"].lower() not in ("", "generic", "local", "not specified"))

    best_brand = max(quotes, key=lambda q: q["_brand_score"])
    if best_brand["_brand_score"] > 0:
        metrics.append({
            "metric": "Best Brand Quality",
            "winner_id": best_brand["id"],
            "winner_name": best_brand["vendor_name"],
            "reason": f"{best_brand['_brand_score']} items with named brands",
        })

    # Most inclusive scope
    for q in quotes:
        q["_scope_score"] = 0
        if q.get("logistics_cost", 0) == 0:
            q["_scope_score"] += 1  # Free logistics
        if q.get("installation_cost", 0) > 0:
            q["_scope_score"] += 1  # Installation included

    best_scope = max(quotes, key=lambda q: q["_scope_score"])
    metrics.append({
        "metric": "Most Inclusive Scope",
        "winner_id": best_scope["id"],
        "winner_name": best_scope["vendor_name"],
        "reason": "Best combination of included services",
    })

    # Overall recommendation
    scores = {}
    for m in metrics:
        wid = m["winner_id"]
        scores[wid] = scores.get(wid, 0) + 1
    recommended_id = max(scores, key=scores.get) if scores else None
    recommended = next((q for q in quotes if q["id"] == recommended_id), None)

    # Risk flags
    risk_flags = []
    for q in quotes:
        if not q.get("vendor_gst_number"):
            risk_flags.append(f"{q['vendor_name']}: GST number missing")
        if q.get("gst_type") == "not_mentioned":
            risk_flags.append(f"{q['vendor_name']}: GST treatment unclear")
        items = q.get("items", [])
        missing_hsn = [i["item_description"] for i in items if not i.get("hsn_code")]
        if missing_hsn:
            risk_flags.append(f"{q['vendor_name']}: HSN codes missing for {len(missing_hsn)} items")
        if not q.get("warranty_months"):
            risk_flags.append(f"{q['vendor_name']}: No warranty terms specified")

    return {
        "winner": {
            "id": recommended["id"] if recommended else None,
            "name": recommended["vendor_name"] if recommended else None,
        },
        "metrics": metrics,
        "risk_flags": risk_flags,
        "recommendation": f"Based on overall scoring across price, compliance, quality, and scope, {recommended['vendor_name'] if recommended else 'N/A'} offers the best value." if recommended else "",
    }
