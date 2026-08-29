
Float division by zero issue.
Scales are being synthesized at real time (recordings are not used)










# Line-by-Line OMR — Known Limitations & Open Issues

This file tracks every known disadvantage or risk of the per-system Audiveris approach.
Review before declaring the feature "done". Items are roughly ordered by severity.

---

## 🔴 High Priority

### 1. Cross-system slurs and ties are lost
**What happens:** A slur or tie that starts at the end of system N and ends at the
start of system N+1 appears in the sheet music, but Audiveris sees each strip as an
independent image. It cannot "see" the matching endpoint in another image, so the
slur/tie is silently dropped from both MXL files.

**Impact:** Phrasing and legato are lost in the audio. Notes that should be tied
(same pitch, no re-attack) become two separate notes.

**Mitigation ideas:**
- Post-process: detect suspiciously short notes at system boundaries and try to merge
  them heuristically.
- Overlap: pass each system image with a small vertical overlap (bottom of N + top of N+1)
  so Audiveris sees both endpoints. Then de-duplicate the overlapping measures in the merger.
- Accept for now: affects audio rendering quality, not correctness of the score.

**Status:** Not addressed yet.

---

### 2. Staff-line detection can fail on complex scores
**What happens:** The horizontal projection profile segmenter works by finding rows with
near-zero ink density. Scores with:
- Very tight system spacing (no clear whitespace gap)
- Ornaments, dynamics, or fingerings in the margin between systems
- Handwritten notation
- Watermarks or stains

...may not produce clean gap rows, causing two systems to be merged into one strip
(which Audiveris then takes too long on) or one system to be split incorrectly (which
Audiveris fails on entirely).

**Mitigation ideas:**
- Tune the `blank_threshold` and minimum gap size per image.
- Fall back to the original single-image approach when segmentation produces < 2 or > N
  systems (where N can be bounded by image height / expected staff height).
- Add a manual override: let the user specify how many lines are in the image.

**Status:** Not addressed yet.

---

## 🟡 Medium Priority

### 3. JVM startup cost per system
**What happens:** Each Audiveris invocation starts a fresh JVM. On the free Render
instance this takes ~3–5 seconds per system. For a 3-system page that's ~10–15 s of
pure overhead before any recognition work begins.

**Impact:** Minimal for typical scores (2–4 systems). Could matter for a full orchestra
score with 10+ systems per page.

**Mitigation ideas:**
- Use Audiveris's internal batch mode if it ever supports feeding multiple images in one
  JVM session (not currently exposed cleanly via CLI).
- Acceptable for now.

**Status:** Accepted / not worth fixing.

---

### 4. Audiveris fails to detect key/clef/time on some system openings
**What happens:** When a system doesn't show a key/clef/time signature (because
standard notation only repeats them on the first system or at changes), Audiveris may
produce a MXL that defaults to C major / treble clef / 4/4. The merger injects the
correct carry-over value — but only if it was correctly detected in the previous system.

If Audiveris *mis-recognizes* the key on system 1 (e.g., mistakes a 3-flat key for
2 flats), every subsequent system will inherit the wrong key.

**Impact:** Wrong pitch spelling in the merged MXL. Audio will sound wrong.

**Mitigation ideas:**
- Show the user the intermediate MXL for each system so they can spot-check.
- Allow a "key override" in the UI.
- This is an OMR accuracy issue, not specific to line-by-line processing.

**Status:** Not addressed yet.

---

### 5. Segmented strips must maintain high DPI
**What happens:** Audiveris requires ~300 DPI or higher for reliable recognition.
When you crop a strip from the original image, the DPI metadata may be lost or
incorrect (PIL/OpenCV don't always preserve it). Audiveris reads DPI from EXIF/metadata
to set its internal scale; if it sees 72 DPI it may miscalibrate staff-line detection.

**Mitigation:** When saving each system strip as PNG, explicitly set the DPI in the
image metadata:
```python
from PIL import Image
img_pil = Image.fromarray(system_img_array)
img_pil.save(out_path, dpi=(300, 300))
```

**Status:** Not implemented yet — add this to the segmenter.

---

## 🟢 Low Priority / Accepted

### 6. Multi-part (multi-staff) scores
**What happens:** Piano music or choral scores have 2+ staves per system (e.g., treble
and bass clef braced together). The segmenter must keep both staves of each system in
the same strip. The projection profile naturally does this as long as the gap between
systems is larger than the gap between staves within a system — which is almost always
true for printed music.

**Risk:** If the inter-staff gap equals the inter-system gap, the segmenter might split
within a system. Check that the minimum gap size constant (15 rows by default) is
appropriate.

**Status:** Likely fine for most scores; verify during testing.

---

### 7. Checkpoint file left on disk after completion
**What happens:** `checkpoint.json` is not cleaned up after a successful merge. It's
a few hundred bytes — harmless — but could confuse a re-run if the user uploads the
same image twice and the job lands in the same output directory.

**Mitigation:** Delete checkpoint file at the end of a successful pipeline run.

**Status:** Trivial fix; do it when wiring up the main pipeline change.

---

*Last updated: 2026-08-28*
*Relates to: [`backend/pipeline.py`](../backend/pipeline.py), planned `backend/segment_systems.py`, `backend/merge_musicxml.py`*
