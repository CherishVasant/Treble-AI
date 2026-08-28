"""
Split a sheet music image into individual staff-system strips,
then enhance each strip independently for Audiveris OMR.

Each output strip is saved as a high-resolution PNG with DPI metadata
explicitly set to 300 so Audiveris calibrates staff-line detection correctly.
"""

from __future__ import annotations

from pathlib import Path
from typing import NamedTuple

import cv2
import numpy as np
from PIL import Image

from enhance_quality import enhance_grayscale


class SystemStrip(NamedTuple):
    index: int
    path: Path


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _load_gray(image_path: str) -> np.ndarray:
    """Load any supported image as a grayscale numpy array."""
    data = np.fromfile(image_path, dtype=np.uint8)
    bgr = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if bgr is None:
        raise RuntimeError(f"Cannot decode image: {image_path}")
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)


def _find_system_row_ranges(
    gray: np.ndarray,
    *,
    min_gap_rows: int = 15,
    margin_rows: int = 30,
) -> list[tuple[int, int]]:
    """
    Return (start_row, end_row) pairs for each staff system found in the image.

    Algorithm: horizontal projection profile.
      1. Binarise to dark-ink / white-paper.
      2. Sum dark pixels per row → row_sums.
      3. Any row with < 1 % of the maximum density is classified as blank.
      4. A run of ≥ min_gap_rows consecutive blank rows is an inter-system gap.
      5. Each content region is expanded by margin_rows on both sides so that
         ledger lines and dynamics in the margin are not clipped.
    """
    _, binary = cv2.threshold(gray, 200, 1, cv2.THRESH_BINARY_INV)
    row_sums = binary.sum(axis=1).astype(float)

    blank_thresh = max(row_sums.max() * 0.01, 1.0)
    is_blank = row_sums < blank_thresh

    h = len(is_blank)
    ranges: list[tuple[int, int]] = []
    in_content = False
    start = 0
    i = 0

    while i < h:
        if not is_blank[i] and not in_content:
            start = max(0, i - margin_rows)
            in_content = True
            i += 1
        elif is_blank[i] and in_content:
            gap_start = i
            while i < h and is_blank[i]:
                i += 1
            gap_len = i - gap_start
            if gap_len >= min_gap_rows:
                # Real inter-system gap — close the current system
                end = min(h, gap_start + margin_rows)
                ranges.append((start, end))
                in_content = False
            # else: short blank run inside a system (e.g. between piano staves)
            #       — do NOT close; stay in_content and continue
        else:
            i += 1

    if in_content:
        ranges.append((start, h))

    return ranges


def _save_strip(gray: np.ndarray, dest: Path, dpi: int = 300) -> None:
    """
    Save a grayscale numpy array as PNG with explicit DPI metadata.
    OpenCV imwrite does not write DPI — PIL does.
    """
    dest.parent.mkdir(parents=True, exist_ok=True)
    pil_img = Image.fromarray(gray, mode="L")
    pil_img.save(str(dest), dpi=(dpi, dpi))


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def segment_and_enhance(
    image_path: str,
    output_dir: str,
    *,
    min_gap_rows: int = 15,
    margin_rows: int = 30,
    target_dpi: int = 300,
) -> list[SystemStrip]:
    """
    Detect staff systems in *image_path*, crop each one, enhance it, and
    save it to *output_dir* as ``system_000.png``, ``system_001.png``, …

    Enhancement (upscale, CLAHE contrast, unsharp-mask sharpening, denoise)
    is applied **per strip** so each system reaches the minimum resolution
    Audiveris needs, regardless of the original image size.

    Falls back to returning the full enhanced image as a single strip when:
      • fewer than 2 systems are detected (e.g. the image is already one line), or
      • the projection profile cannot find any blank rows above the threshold.
    """
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    gray = _load_gray(image_path)
    ranges = _find_system_row_ranges(gray, min_gap_rows=min_gap_rows, margin_rows=margin_rows)

    if len(ranges) < 2:
        print(f"[segment] Fewer than 2 systems detected — treating whole image as one strip.")
        ranges = [(0, gray.shape[0])]

    strips: list[SystemStrip] = []
    for idx, (r0, r1) in enumerate(ranges):
        strip_gray = gray[r0:r1, :]

        # Per-strip quality enhancement: upscale → CLAHE → unsharp-mask → denoise
        enhanced = enhance_grayscale(strip_gray)

        dest = output_path / f"system_{idx:03d}.png"
        _save_strip(enhanced, dest, dpi=target_dpi)
        strips.append(SystemStrip(index=idx, path=dest))
        print(f"[segment] System {idx}: rows {r0}–{r1}  →  {dest.name}  "
              f"({enhanced.shape[1]}×{enhanced.shape[0]} px)")

    return strips
