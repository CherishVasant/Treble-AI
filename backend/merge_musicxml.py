"""
Merge multiple per-system MusicXML files into one coherent score.

Carry-over rule
---------------
Standard notation does not repeat the clef, key signature, or time signature
at the start of every system -- only when a change occurs or on the very first
system.  Audiveris therefore produces per-strip MXL files where systems 2, 3 ...
have no opening attributes.

This module injects the missing attributes by tracking the last seen clef / key
/ time across measures and inserting a copy into the first measure of each
subsequent system -- but ONLY when Audiveris did not already produce one (so a
genuine key change that appears in the image of a later system is never
overwritten).
"""

from __future__ import annotations

import copy

from music21 import (
    clef as m21_clef,
    converter,
    instrument as m21_instrument,
    key as m21_key,
    metadata as m21_metadata,
    meter,
    stream,
)


def merge_system_mxls(
    mxl_paths: list[str],
    *,
    title: str = "",
    composer: str = "",
) -> stream.Score:
    """
    Parse and merge per-system MXL files into a single music21 Score.

    Parameters
    ----------
    mxl_paths : list of str
        Ordered list of MXL file paths, one per system (system 0 first).
    title : str, optional
        Score title to embed in the output MusicXML (e.g. extracted via OCR
        from a non-music title strip).  If empty, the first source score's
        metadata title is used; if that is also missing, the field is left
        blank (OSMD will not show a bogus "Music21 Fragment" heading).
    composer : str, optional
        Composer / arranger name.  Same fallback logic as ``title``.

    Returns
    -------
    stream.Score
        A merged Score with continuously numbered measures, correct
        carry-over attributes, proper part names, and populated metadata.
    """
    if not mxl_paths:
        raise ValueError("merge_system_mxls: mxl_paths must not be empty")

    # Fast path: nothing to merge
    if len(mxl_paths) == 1:
        score = converter.parse(mxl_paths[0])
        _apply_metadata(score, title, composer)
        return score

    print(f"[merge] Parsing {len(mxl_paths)} system MXL files...")
    scores = [converter.parse(p) for p in mxl_paths]

    num_parts = len(scores[0].parts)
    if num_parts == 0:
        raise RuntimeError(
            "First system MXL has no parts -- Audiveris may have failed on that strip."
        )

    merged = stream.Score()

    # ---- Metadata -----------------------------------------------------------
    # Prefer explicit args; fall back to the first source score's metadata.
    _apply_metadata(merged, title, composer, fallback_score=scores[0])

    # ---- Parts --------------------------------------------------------------
    for part_idx in range(num_parts):
        merged_part = stream.Part()

        # Copy part ID, name, and instrument from the first source that has it.
        # This prevents music21 from assigning a random UUID as the part ID
        # (which OSMD would then display as "Instr. P<uuid>").
        for score in scores:
            if part_idx < len(score.parts):
                src = score.parts[part_idx]
                merged_part.id = src.id
                if getattr(src, "partName", None):
                    merged_part.partName = src.partName

                # Copy any instrument object sitting directly on the part.
                src_insts = list(src.getElementsByClass(m21_instrument.Instrument))
                if src_insts:
                    merged_part.insert(0, copy.deepcopy(src_insts[0]))
                break

        measure_number = 1

        # Carry-over state updated after every processed measure
        last_clef: m21_clef.Clef | None = None
        last_key: m21_key.KeySignature | None = None
        last_time: meter.TimeSignature | None = None

        for sys_idx, score in enumerate(scores):
            if part_idx >= len(score.parts):
                print(
                    f"[merge] Warning: system {sys_idx} has fewer parts than expected; "
                    f"skipping part {part_idx}."
                )
                continue

            part = score.parts[part_idx]
            measures = list(part.getElementsByClass(stream.Measure))

            if not measures:
                print(f"[merge] Warning: system {sys_idx}, part {part_idx} has no measures.")
                continue

            for m_idx, measure in enumerate(measures):
                new_measure = copy.deepcopy(measure)
                new_measure.number = measure_number

                # -- Inject carry-over into the first measure of each system > 0 --
                if sys_idx > 0 and m_idx == 0:
                    has_clef = bool(list(new_measure.getElementsByClass(m21_clef.Clef)))
                    has_key  = bool(list(new_measure.getElementsByClass(m21_key.KeySignature)))
                    has_time = bool(list(new_measure.getElementsByClass(meter.TimeSignature)))

                    # Only inject when Audiveris produced nothing -- never overwrite
                    # a genuine key/clef change present in the strip image.
                    if not has_clef and last_clef is not None:
                        new_measure.insert(0, copy.deepcopy(last_clef))
                    if not has_key and last_key is not None:
                        new_measure.insert(0, copy.deepcopy(last_key))
                    if not has_time and last_time is not None:
                        new_measure.insert(0, copy.deepcopy(last_time))

                # -- Update carry-over state from this measure --
                clefs = list(new_measure.getElementsByClass(m21_clef.Clef))
                keys  = list(new_measure.getElementsByClass(m21_key.KeySignature))
                times = list(new_measure.getElementsByClass(meter.TimeSignature))

                if clefs:
                    last_clef = clefs[-1]
                if keys:
                    last_key = keys[-1]
                if times:
                    last_time = times[-1]

                merged_part.append(new_measure)
                measure_number += 1

        merged.append(merged_part)

    print(f"[merge] Merged {measure_number - 1} total measures across {num_parts} part(s).")
    return merged


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _apply_metadata(
    score: stream.Score,
    title: str,
    composer: str,
    *,
    fallback_score: stream.Score | None = None,
) -> None:
    """
    Set title and composer on *score*.

    Priority: explicit arg > source score metadata > leave blank.
    Never writes the generic "Music21 Fragment" placeholder.
    """
    MUSIC21_PLACEHOLDERS = {"music21 fragment", "music21", ""}

    # Derive effective values
    src_meta = getattr(fallback_score, "metadata", None) if fallback_score else None

    def _pick(explicit: str, attr: str) -> str:
        if explicit and explicit.lower() not in MUSIC21_PLACEHOLDERS:
            return explicit
        if src_meta:
            raw = getattr(src_meta, attr, None)
            # music21 can return a Text object instead of a plain str
            val = str(raw).strip() if raw is not None else ""
            if val and val.lower() not in MUSIC21_PLACEHOLDERS:
                return val
        return ""

    eff_title    = _pick(title, "title")
    eff_composer = _pick(composer, "composer")

    if not eff_title and not eff_composer:
        return  # nothing to write; leave whatever was there (could be blank)

    # Ensure the score has a Metadata object.
    # Use assignment (`score.metadata = ...`) — NOT `score.insert(0, ...)`.
    # The `metadata` property reads from `score._metadata`; inserting into the
    # stream does not update that attribute, so subsequent property reads would
    # still return None and raise AttributeError on `.title = ...`.
    if not getattr(score, "metadata", None):
        score.metadata = m21_metadata.Metadata()

    if eff_title:
        score.metadata.title = eff_title
    if eff_composer:
        score.metadata.composer = eff_composer
