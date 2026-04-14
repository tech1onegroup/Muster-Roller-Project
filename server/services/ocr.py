import re


async def extract_aadhaar(image_path: str) -> str | None:
    """Extract last 4 digits of Aadhaar number from card image using EasyOCR."""
    import easyocr

    reader = easyocr.Reader(["en"], gpu=False)
    results = reader.readtext(image_path)

    full_text = " ".join([r[1] for r in results])

    # Match 12-digit Aadhaar pattern (with optional spaces)
    match = re.search(r"\d{4}\s?\d{4}\s?\d{4}", full_text)
    if match:
        digits = re.sub(r"\s", "", match.group())
        return digits[-4:]

    return None
