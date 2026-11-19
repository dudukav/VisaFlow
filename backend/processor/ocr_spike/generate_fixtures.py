import argparse
import json
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory

from PIL import Image, ImageEnhance
from pypdf import PdfReader
from reportlab.lib.pagesizes import A5
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

SPIKE_DIR = Path(__file__).resolve().parent
BASELINE_DIR = SPIKE_DIR.parents[2] / "api/fixtures/mvp1/passport"
FIELD_KEYS = ("surname", "givenName", "documentNumber", "expiresOn")
MARKER = "SYNTHETIC TEST DOCUMENT"
SCAN_VARIANTS = (
    ("scan_300dpi", 300),
    ("scan_150dpi", 150),
    ("scan_rotated", 300),
    ("scan_low_contrast", 300),
)


def write_text_pdf(path: Path, fields: dict[str, str]) -> None:
    """Use the page geometry and typography of the shared #2 fixture."""
    pdf = canvas.Canvas(str(path), pagesize=A5, invariant=1)
    pdf.setTitle("VisaFlow synthetic passport fixture")
    pdf.setFont("Helvetica-Bold", 20)
    pdf.drawString(36, 536, MARKER)
    pdf.setFont("Helvetica", 11)
    pdf.drawString(36, 509, "VisaFlow QA fixture - not an identity document")
    pdf.line(36, 492, A5[0] - 36, 492)
    pdf.setFont("Helvetica", 13)
    for index, key in enumerate(FIELD_KEYS):
        pdf.drawString(36, 462 - index * 27, f"{key}: {fields[key]}")
    pdf.showPage()
    pdf.save()


def render_page(path: Path, dpi: int, prefix: Path) -> Image.Image:
    subprocess.run(
        ["pdftoppm", "-f", "1", "-l", "1", "-singlefile", "-r", str(dpi),
         "-png", str(path), str(prefix)],
        check=True,
    )
    with Image.open(prefix.with_suffix(".png")) as page:
        return page.convert("RGB")


def write_image_pdf(path: Path, page: Image.Image) -> None:
    pdf = canvas.Canvas(str(path), pagesize=A5, invariant=1)
    pdf.setTitle("VisaFlow synthetic passport fixture - raster scan")
    pdf.drawImage(ImageReader(page), 0, 0, width=A5[0], height=A5[1])
    pdf.showPage()
    pdf.save()


def validate_pdf(path: Path, variant: str, expected: dict[str, str]) -> None:
    pdf = PdfReader(path)
    if len(pdf.pages) != 1:
        raise ValueError(f"{path.name}: expected one page")

    page = pdf.pages[0]
    text = page.extract_text().strip()
    if variant == "text_layer":
        lines = text.splitlines()
        if MARKER not in lines or any(
            f"{key}: {expected[key]}" not in lines for key in FIELD_KEYS
        ):
            raise ValueError(f"{path.name}: missing marker or expected field values")
    elif text or len(page.images) != 1:
        raise ValueError(f"{path.name}: scan must contain one image and no text layer")


def generate(baseline_dir: Path, output: Path) -> None:
    baseline = json.loads(
        (baseline_dir / "expected-fields.json").read_text(encoding="utf-8")
    )
    if set(baseline) != set(FIELD_KEYS):
        raise ValueError("The #2 baseline must contain exactly the four expected fields")

    data_sets = {
        "baseline": baseline,
        "short-name": {
            "surname": "SAMPLE",
            "givenName": "AI",
            "documentNumber": "SYNTH-O01I",
            "expiresOn": "2030-02-28",
        },
        "long-name": {
            "surname": "ILLUSTRATIVE",
            "givenName": "ALEXANDRIA-MARIE",
            "documentNumber": "SYNTH-I10O",
            "expiresOn": "2034-07-19",
        },
        "two-part-name": {
            "surname": "EXAMPLE-RECORD",
            "givenName": "NOVA LEE",
            "documentNumber": "SYNTH-4072",
            "expiresOn": "2036-02-29",
        },
    }

    if output.exists():
        raise FileExistsError(f"Choose a new output directory: {output}")

    output.parent.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(prefix=".ocr-fixtures-", dir=output.parent) as tmp:
        work = Path(tmp)
        staging = work / "cases"
        staging.mkdir()
        cases = []

        for data_id, expected in data_sets.items():
            text_pdf = staging / f"{data_id}__text_layer.pdf"
            write_text_pdf(text_pdf, expected)

            with render_page(text_pdf, 300, work / "page-300") as page_300:
                with render_page(text_pdf, 150, work / "page-150") as page_150:
                    for variant, dpi in SCAN_VARIANTS:
                        path = staging / f"{data_id}__{variant}.pdf"
                        if variant == "scan_rotated":
                            with page_300.rotate(
                                3, resample=Image.Resampling.BICUBIC, fillcolor="white"
                            ) as rotated:
                                write_image_pdf(path, rotated)
                        elif variant == "scan_low_contrast":
                            with ImageEnhance.Contrast(page_300).enhance(0.60) as faded:
                                write_image_pdf(path, faded)
                        else:
                            write_image_pdf(path, page_150 if dpi == 150 else page_300)

            for variant in ("text_layer", *(name for name, _ in SCAN_VARIANTS)):
                case_id = f"{data_id}__{variant}"
                pdf_path = staging / f"{case_id}.pdf"
                validate_pdf(pdf_path, variant, expected)
                cases.append(
                    {"id": case_id, "variant": variant, "pdf": pdf_path.name,
                     "expected": expected}
                )

        (staging / "manifest.json").write_text(
            json.dumps(cases, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        staging.rename(output)
    print(f"Generated {len(cases)} PDF fixtures in {output}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate the VisaFlow OCR spike fixtures.")
    parser.add_argument("--baseline", type=Path, default=BASELINE_DIR)
    parser.add_argument("--output", type=Path, default=SPIKE_DIR / "cases")
    args = parser.parse_args()
    generate(args.baseline.resolve(), args.output.resolve())


if __name__ == "__main__":
    main()
