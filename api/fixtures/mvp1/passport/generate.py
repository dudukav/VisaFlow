import json
from pathlib import Path

from reportlab.lib.pagesizes import A5
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parent
DOCUMENT_ID = "11111111-1111-4111-8111-111111111111"
FIELDS = {
    "surname": "SYNTHETIC",
    "givenName": "TEST",
    "documentNumber": "SYNTH-0001",
    "expiresOn": "2032-12-31",
}


def write_json(filename: str, data: object) -> None:
    path = ROOT / filename
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def write_example(name: str, summary: str, payload: object) -> None:
    write_json(name + ".example.json", {"summary": summary, "value": payload})


def main() -> None:
    pdf = canvas.Canvas(str(ROOT / "passport.pdf"), pagesize=A5, invariant=1)
    pdf.setTitle("VisaFlow synthetic passport fixture")
    pdf.setFont("Helvetica-Bold", 20)
    pdf.drawString(36, 536, "SYNTHETIC TEST DOCUMENT")
    pdf.setFont("Helvetica", 11)
    pdf.drawString(36, 509, "VisaFlow QA fixture - not an identity document")
    pdf.line(36, 492, A5[0] - 36, 492)
    pdf.setFont("Helvetica", 13)
    for index, (key, value) in enumerate(FIELDS.items()):
        pdf.drawString(36, 462 - index * 27, f"{key}: {value}")
    pdf.showPage()
    pdf.save()

    write_json("expected-fields.json", FIELDS)
    write_example("extracted-fields", "Synthetic passport before confirmation", {
        "documentId": DOCUMENT_ID,
        "ocrEngineVersion": "fixture-ocr/1",
        "fields": [
            {"key": key, "value": value, "confidence": 0.99, "confirmed": False}
            for key, value in FIELDS.items()
        ],
    })
    write_example("checks", "Synthetic check after confirmation", {
        "status": "completed",
        "disclaimer": "Synthetic fixture for automated testing.",
        "items": [{
            "id": "22222222-2222-4222-8222-222222222222",
            "level": "passed",
            "explanation": "The synthetic document number is present.",
            "ruleId": "33333333-3333-4333-8333-333333333333",
            "sourceId": "44444444-4444-4444-8444-444444444444",
        }],
    })
    write_example("consent-required", "Upload without current consent", {
        "type": "about:blank",
        "title": "Consent required",
        "status": 409,
        "code": "CONSENT_REQUIRED",
        "requestId": "fixture-consent-409",
    })


if __name__ == "__main__":
    main()
