"""
Enhance sheet-music images and PDFs before Audiveris OMR.

Reads files from backend/input (by default), applies contrast/sharpen/denoise
and optional upscaling, then writes:

    original_name_better_quality.ext

into the same folder.

Usage:
    python enhance_quality.py
    python enhance_quality.py --input-dir input
    python enhance_quality.py --input-dir input --force
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import cv2
import fitz  # PyMuPDF
import numpy as np

SUFFIX = "_better_quality"
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff", ".bmp", ".gif"}
PDF_EXTENSIONS = {".pdf"}

# Audiveris reads better from higher-resolution, high-contrast grayscale input.
MIN_WIDTH_PX = 2400
PDF_RENDER_DPI = 300


def _output_path(source: Path) -> Path:
    return source.with_name(f"{source.stem}{SUFFIX}{source.suffix.lower()}")


def _should_skip(source: Path) -> bool:
    return SUFFIX in source.stem


def enhance_grayscale(gray: np.ndarray) -> np.ndarray:
    """Apply OMR-oriented enhancement to a single-channel image."""
    if gray.ndim != 2:
        raise ValueError("Expected a grayscale image")

    height, width = gray.shape[:2]
    if width < MIN_WIDTH_PX:
        scale = MIN_WIDTH_PX / width
        gray = cv2.resize(
            gray,
            None,
            fx=scale,
            fy=scale,
            interpolation=cv2.INTER_LANCZOS4,
        )

    denoised = cv2.fastNlMeansDenoising(gray, None, h=10, templateWindowSize=7, searchWindowSize=21)

    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    contrast = clahe.apply(denoised)

    blurred = cv2.GaussianBlur(contrast, (0, 0), sigmaX=1.0)
    sharp = cv2.addWeighted(contrast, 1.5, blurred, -0.5, 0)

    return np.clip(sharp, 0, 255).astype(np.uint8)


def _load_bgr(path: Path) -> np.ndarray:
    data = np.fromfile(str(path), dtype=np.uint8)
    image = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if image is None:
        raise RuntimeError(f"Could not decode image: {path.name}")
    return image


def _save_image(path: Path, gray: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    suffix = path.suffix.lower()

    if suffix in {".jpg", ".jpeg"}:
        bgr = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
        ok, encoded = cv2.imencode(".jpg", bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
    else:
        ok, encoded = cv2.imencode(".png", gray, [int(cv2.IMWRITE_PNG_COMPRESSION), 3])

    if not ok:
        raise RuntimeError(f"Could not encode enhanced image: {path.name}")

    encoded.tofile(str(path))


def enhance_image_file(source: Path, destination: Path) -> None:
    bgr = _load_bgr(source)
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    enhanced = enhance_grayscale(gray)
    _save_image(destination, enhanced)


def _page_to_gray(page: fitz.Page, dpi: int = PDF_RENDER_DPI) -> np.ndarray:
    scale = dpi / 72.0
    matrix = fitz.Matrix(scale, scale)
    pixmap = page.get_pixmap(matrix=matrix, alpha=False)
    array = np.frombuffer(pixmap.samples, dtype=np.uint8).reshape(pixmap.height, pixmap.width, 3)
    bgr = cv2.cvtColor(array, cv2.COLOR_RGB2BGR)
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)


def enhance_pdf_file(source: Path, destination: Path) -> None:
    source_doc = fitz.open(source)
    output_doc = fitz.open()

    try:
        for page_index in range(len(source_doc)):
            gray = _page_to_gray(source_doc[page_index], PDF_RENDER_DPI)
            enhanced = enhance_grayscale(gray)

            ok, png_bytes = cv2.imencode(".png", enhanced)
            if not ok:
                raise RuntimeError(f"Could not encode PDF page {page_index + 1}")

            page_rect = source_doc[page_index].rect
            new_page = output_doc.new_page(width=page_rect.width, height=page_rect.height)
            new_page.insert_image(new_page.rect, stream=png_bytes.tobytes())

        destination.parent.mkdir(parents=True, exist_ok=True)
        output_doc.save(destination)
    finally:
        output_doc.close()
        source_doc.close()


def process_file(source: Path, force: bool = False) -> Path | None:
    if _should_skip(source):
        print(f"  skip (already enhanced): {source.name}")
        return None

    destination = _output_path(source)
    if destination.exists() and not force:
        print(f"  skip (exists): {destination.name}")
        return destination

    suffix = source.suffix.lower()
    print(f"  enhancing: {source.name} -> {destination.name}")

    if suffix in IMAGE_EXTENSIONS:
        enhance_image_file(source, destination)
    elif suffix in PDF_EXTENSIONS:
        enhance_pdf_file(source, destination)
    else:
        print(f"  skip (unsupported type): {source.name}")
        return None

    return destination


def process_input_folder(input_dir: Path, force: bool = False) -> list[Path]:
    if not input_dir.exists():
        raise FileNotFoundError(f"Input folder not found: {input_dir}")

    files = sorted(
        p
        for p in input_dir.iterdir()
        if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS | PDF_EXTENSIONS
    )

    if not files:
        print(f"No supported files found in {input_dir}")
        return []

    print(f"Processing {len(files)} file(s) in {input_dir.resolve()}\n")

    written: list[Path] = []
    errors: list[tuple[str, str]] = []

    for source in files:
        try:
            result = process_file(source, force=force)
            if result is not None:
                written.append(result)
        except Exception as exc:  # noqa: BLE001 — batch script should continue on failure
            errors.append((source.name, str(exc)))
            print(f"  error: {source.name}: {exc}")

    print(f"\nDone. Enhanced files written: {len(written)}")
    for path in written:
        print(f"  - {path.name}")

    if errors:
        print(f"\nFailed: {len(errors)}")
        for name, message in errors:
            print(f"  - {name}: {message}")
        return written

    return written


def main() -> int:
    parser = argparse.ArgumentParser(description="Enhance sheet music images/PDFs for Audiveris.")
    parser.add_argument(
        "--input-dir",
        type=Path,
        default=Path(__file__).resolve().parent / "input",
        help="Folder containing source images/PDFs (default: backend/input)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing *_better_quality files",
    )
    args = parser.parse_args()

    try:
        process_input_folder(args.input_dir, force=args.force)
    except FileNotFoundError as exc:
        print(exc, file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
