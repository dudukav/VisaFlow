import argparse
import csv
import io
import json
import os
import platform
import re
import subprocess
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from tempfile import NamedTemporaryFile, TemporaryDirectory
from time import perf_counter

import pypdf
from pypdf.errors import PdfReadError

ROOT = Path(__file__).resolve().parent
FIELD_KEYS = ("surname", "givenName", "documentNumber", "expiresOn")
LABELS = {key.casefold(): key for key in FIELD_KEYS}
ISO_DATE = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}")
DPI = 300
LANGUAGE = "eng"
OEM = 1
PSM = 6
RENDER_TIMEOUT = 20
OCR_TIMEOUT = 30
HIGH_CONFIDENCE = 0.85
COMPLETED = {"ok", "no_text_layer", "no_ocr_text"}


@dataclass(frozen=True)
class Word:
    text: str
    confidence: float | None = None


def read_text_layer(pdf: Path) -> list[list[Word]]:
    with pdf.open("rb") as source:
        text = pypdf.PdfReader(source).pages[0].extract_text()
    return [[Word(value) for value in line.split()] for line in text.splitlines() if line.strip()]


def read_ocr(pdf: Path) -> list[list[Word]]:
    with TemporaryDirectory(prefix="visaflow-ocr-") as work:
        prefix = Path(work) / "page"
        subprocess.run(
            ["pdftoppm", "-f", "1", "-l", "1", "-singlefile", "-r", str(DPI),
             "-png", str(pdf), str(prefix)],
            capture_output=True,
            check=True,
            timeout=RENDER_TIMEOUT,
        )
        result = subprocess.run(
            ["tesseract", str(prefix.with_suffix(".png")), "stdout",
             "-l", LANGUAGE, "--oem", str(OEM), "--psm", str(PSM), "tsv"],
            capture_output=True,
            check=True,
            encoding="utf-8",
            timeout=OCR_TIMEOUT,
        )

    lines = defaultdict(list)
    for row in csv.DictReader(io.StringIO(result.stdout), delimiter="\t", quoting=csv.QUOTE_NONE):
        text = row["text"].strip()
        if row["level"] != "5" or not text:
            continue
        confidence = float(row["conf"])
        if 0 <= confidence <= 100:
            line_id = tuple(int(row[key]) for key in ("page_num", "block_num", "par_num", "line_num"))
            lines[line_id].append((int(row["word_num"]), Word(text, confidence / 100)))

    return [
        [word for _, word in sorted(tokens, key=lambda token: token[0])]
        for _, tokens in sorted(lines.items())
    ]


def parse_fields(lines: list[list[Word]]) -> dict[str, Word]:
    fields = {}
    for line in lines:
        colon = next((index for index, word in enumerate(line) if ":" in word.text), None)
        if colon is None:
            continue

        delimiter_word = line[colon]
        label_tail, _, value_head = delimiter_word.text.partition(":")
        label = ("".join(word.text for word in line[:colon]) + label_tail).casefold()
        key = LABELS.get(label)
        if key is None or key in fields:
            continue

        value_words = line[colon + 1 :]
        if value_head:
            value_words = [Word(value_head, delimiter_word.confidence), *value_words]
        value = " ".join(" ".join(word.text for word in value_words).split())
        if value:
            scores = [word.confidence for word in value_words if word.confidence is not None]
            fields[key] = Word(value, min(scores) if scores else None)
    return fields


def is_iso_date(value: str) -> bool:
    if not ISO_DATE.fullmatch(value):
        return False
    try:
        date.fromisoformat(value)
    except ValueError:
        return False
    return True


def evaluate(fields: dict[str, Word], expected: dict[str, str]) -> dict:
    result = {}
    for key in FIELD_KEYS:
        word = fields.get(key)
        if word is None:
            result[key] = {"value": None, "confidence": None, "status": "missing"}
            continue

        if key == "expiresOn" and not is_iso_date(word.text):
            status = "invalid_format"
        elif word.text == " ".join(expected[key].split()):
            status = "exact"
        else:
            status = "mismatch"
        result[key] = {"value": word.text, "confidence": word.confidence, "status": status}
    return result


def run_once(method: str, pdf: Path, expected: dict[str, str], number: int) -> dict:
    started = perf_counter()
    fields = {}
    error_stage = None
    try:
        lines = EXTRACTORS[method](pdf)
        fields = parse_fields(lines)
        if lines:
            status = "ok"
        else:
            status = "no_text_layer" if method == "pypdf" else "no_ocr_text"
    except subprocess.TimeoutExpired as error:
        status = "timeout"
        error_stage = error.cmd[0]
    except subprocess.CalledProcessError as error:
        status = "error"
        error_stage = error.cmd[0]
    except (OSError, PdfReadError, IndexError):
        status = "error"
        error_stage = method

    elapsed_ms = round((perf_counter() - started) * 1_000, 3)
    return {
        "run": number,
        "status": status,
        "error_stage": error_stage,
        "elapsed_ms": elapsed_ms,
        "fields": evaluate(fields, expected),
    }


EXTRACTORS = {"pypdf": read_text_layer, "tesseract": read_ocr}


def benchmark_case(pdf: Path, expected: dict[str, str], repeats: int) -> dict:
    methods = {}
    for method in EXTRACTORS:
        runs = [run_once(method, pdf, expected, number) for number in range(1, repeats + 1)]
        quality_run = next((run for run in runs if run["status"] in COMPLETED), runs[0])
        signatures = {
            (run["status"], tuple((field["value"], field["status"]) for field in run["fields"].values()))
            for run in runs
        }
        methods[method] = {
            "quality_run": quality_run["run"],
            "stable_across_runs": len(signatures) == 1,
            "runs": runs,
        }
    return methods


def percentile(samples: list[float], quantile: float) -> float | None:
    if not samples:
        return None
    ordered = sorted(samples)
    offset = (len(ordered) - 1) * quantile
    before = int(offset)
    after = min(before + 1, len(ordered) - 1)
    return round(ordered[before] + (ordered[after] - ordered[before]) * (offset - before), 3)


def summarize(records: list[dict]) -> dict:
    quality_runs = [record["runs"][record["quality_run"] - 1] for record in records]
    all_runs = [run for record in records for run in record["runs"]]
    timings = [run["elapsed_ms"] for run in all_runs if run["status"] in COMPLETED]
    fields = {}

    for key in FIELD_KEYS:
        values = [run["fields"][key] for run in quality_runs]
        status_counts = Counter(field["status"] for field in values)
        fields[key] = {
            "expected": len(values),
            **{status: status_counts[status] for status in ("exact", "missing", "invalid_format", "mismatch")},
            "accuracy": round(status_counts["exact"] / len(values), 6) if values else None,
            "high_confidence_errors": sum(
                field["status"] in {"mismatch", "invalid_format"}
                and field["confidence"] is not None
                and field["confidence"] >= HIGH_CONFIDENCE
                for field in values
            ),
        }

    return {
        "pdfs": len(records),
        "perfect_pdfs": sum(
            all(field["status"] == "exact" for field in run["fields"].values())
            for run in quality_runs
        ),
        "unstable_pdfs": sum(not record["stable_across_runs"] for record in records),
        "document_statuses": dict(Counter(run["status"] for run in quality_runs)),
        "run_statuses": dict(Counter(run["status"] for run in all_runs)),
        "latency_ms": {
            "samples": len(timings),
            "p50": percentile(timings, 0.50),
            "p95": percentile(timings, 0.95),
        },
        "fields": fields,
    }


def read_manifest(path: Path) -> list[dict]:
    cases = json.loads(path.read_text(encoding="utf-8"))
    source = path.parent
    if not cases:
        raise ValueError("The manifest must contain at least one fixture")

    ids = set()
    for case in cases:
        if case["id"] in ids or set(case["expected"]) != set(FIELD_KEYS):
            raise ValueError(f"Duplicate ID or invalid expected fields: {case['id']}")
        ids.add(case["id"])
        pdf = (source / case["pdf"]).resolve()
        if not pdf.is_relative_to(source) or not pdf.is_file() or pdf.suffix.lower() != ".pdf":
            raise ValueError(f"Invalid fixture path: {case['pdf']}")
    return cases


def tool_version(command: list[str]) -> str:
    version = subprocess.run(command, capture_output=True, check=True, text=True, timeout=5)
    return (version.stdout or version.stderr).splitlines()[0]


def write_report(report: dict, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with NamedTemporaryFile(mode="w", encoding="utf-8", dir=output.parent, delete=False) as temp:
        temp_path = Path(temp.name)
        try:
            json.dump(report, temp, ensure_ascii=False, indent=2, allow_nan=False)
            temp.write("\n")
            temp.flush()
            temp_path.replace(output)
        finally:
            temp_path.unlink(missing_ok=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Benchmark text extraction and OCR on VisaFlow PDFs.")
    parser.add_argument("--manifest", type=Path, default=ROOT / "cases/manifest.json")
    parser.add_argument("--runs", type=int, default=3)
    parser.add_argument("--output", type=Path, default=ROOT / "report.json")
    args = parser.parse_args()
    if args.runs < 1:
        parser.error("--runs must be positive")

    manifest = args.manifest.resolve()
    output = args.output.resolve()
    cases = read_manifest(manifest)
    tools = {
        "pypdf": pypdf.__version__,
        "tesseract": tool_version(["tesseract", "--version"]),
        "pdftoppm": tool_version(["pdftoppm", "-v"]),
    }

    results = []
    for index, case in enumerate(cases, start=1):
        pdf = manifest.parent / case["pdf"]
        methods = benchmark_case(pdf, case["expected"], args.runs)
        results.append({**case, "methods": methods})
        print(f"[{index}/{len(cases)}] {case['id']}", flush=True)

    variants = dict.fromkeys(case["variant"] for case in results)
    summary = {}
    for method in EXTRACTORS:
        summary[method] = {
            "overall": summarize([case["methods"][method] for case in results]),
            "scans_only": summarize([
                case["methods"][method] for case in results if case["variant"] != "text_layer"
            ]),
            "by_variant": {
                variant: summarize([
                    case["methods"][method] for case in results if case["variant"] == variant
                ])
                for variant in variants
            },
        }

    write_report({
        "created_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "manifest": os.path.relpath(manifest, output.parent),
        "tools": tools,
        "environment": {
            "python": platform.python_version(),
            "system": platform.system(),
            "os_version": platform.mac_ver()[0] or platform.release(),
            "architecture": platform.machine(),
            "logical_cpus": os.cpu_count(),
        },
        "settings": {
            "runs_per_pdf_per_method": args.runs,
            "warmup_runs": 0,
            "page": 1,
            "ocr": {
                "dpi": DPI, "language": LANGUAGE, "oem": OEM, "psm": PSM,
                "render_timeout_seconds": RENDER_TIMEOUT, "ocr_timeout_seconds": OCR_TIMEOUT,
            },
            "high_confidence_threshold": HIGH_CONFIDENCE,
            "quality_basis": "First completed run per PDF; first attempt represents a PDF if all attempts failed.",
            "confidence": "Minimum value-token Tesseract confidence divided by 100; null for pypdf.",
            "normalization": "Collapse whitespace; case and lookalike characters are preserved in values.",
            "latency": "Extraction through normalized fields, including rendering and subprocess/temporary I/O for OCR. "
                       "Percentiles use linear interpolation over completed runs.",
        },
        "summary": summary,
        "results": results,
    }, output)
    print(f"Report saved to {output}")


if __name__ == "__main__":
    main()
