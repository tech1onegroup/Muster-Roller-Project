"""Generate PDF comparison report using simple HTML-to-text CSV approach."""
import csv
import io
from fastapi.responses import StreamingResponse


async def generate_pdf(comparison: dict):
    """Generate a CSV export of the comparison (PDF via reportlab can be added later)."""
    output = io.StringIO()
    writer = csv.writer(output)

    project = comparison["project"]
    vendors = comparison["vendors"]

    # Header
    writer.writerow([f"Quotation Comparison Report: {project['title']}"])
    writer.writerow([f"Status: {project['status']}"])
    writer.writerow([])

    # Vendor headers
    header = ["Metric"] + [v["vendor_name"] for v in vendors]
    writer.writerow(header)
    writer.writerow([])

    # Pricing section
    writer.writerow(["--- PRICING ---"])
    for row in comparison.get("pricing", []):
        r = [row["label"]]
        for v in vendors:
            val = row["values"].get(v["id"], "—")
            if isinstance(val, float):
                r.append(f"₹{val:,.2f}")
            else:
                r.append(str(val))
        writer.writerow(r)
    writer.writerow([])

    # Line items
    writer.writerow(["--- LINE ITEMS ---"])
    item_header = ["Item"] + [f"{v['vendor_name']} Rate" for v in vendors] + [f"{v['vendor_name']} Total" for v in vendors]
    writer.writerow(item_header)
    for item in comparison.get("items", []):
        r = [item["description"]]
        for v in vendors:
            vi = item["vendors"].get(v["id"])
            r.append(f"₹{vi['net_rate']:,.2f}" if vi else "Not Quoted")
        for v in vendors:
            vi = item["vendors"].get(v["id"])
            r.append(f"₹{vi['line_total']:,.2f}" if vi else "—")
        writer.writerow(r)
    writer.writerow([])

    # Commercial terms
    writer.writerow(["--- COMMERCIAL TERMS ---"])
    for row in comparison.get("terms", []):
        r = [row["label"]]
        for v in vendors:
            val = row["values"].get(v["id"], "—")
            r.append(str(val))
        writer.writerow(r)
    writer.writerow([])

    # Verdict
    verdict = comparison.get("verdict", {})
    writer.writerow(["--- EXECUTIVE VERDICT ---"])
    for m in verdict.get("metrics", []):
        writer.writerow([m["metric"], m["winner_name"], m["reason"]])
    writer.writerow([])

    winner = verdict.get("winner", {})
    if winner and winner.get("name"):
        writer.writerow([f"RECOMMENDED VENDOR: {winner['name']}"])
        writer.writerow([verdict.get("recommendation", "")])
    writer.writerow([])

    writer.writerow(["--- RISK FLAGS ---"])
    for flag in verdict.get("risk_flags", []):
        writer.writerow([flag])

    output.seek(0)
    filename = f"comparison_{project['title'].replace(' ', '_')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
