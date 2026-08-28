"""
Merge multiple per-system MusicXML files into one coherent score.

Carry-over rule
───────────────
Standard notation does not repeat the clef, key signature, or time signature
at the start of every system — only when a change occurs or on the very first
system.  Audiveris therefore produces per-strip MXL files where systems 2, 3 …
have no opening attributes.

This module injects the missing attributes by tracking the last seen clef / key
/ time across measures and inserting a copy into the first measure of each
subsequent system — but ONLY when Audiveris did not already produce one (so a
genuine key change that appears in the image of a later system is never
overwritten).
"""

from __future__ import annotations

import copy

from music21 import clef as m21_clef, converter, key as m21_key, meter, stream


def merge_system_mxls(mxl_paths: list[str]) -> stream.Score:
    """
    Parse and merge per-system MXL files into a single music21 Score.

    Parameters
    ----------
    mxl_paths : list of str
        Ordered list of MXL file paths, one per system (system 0 first).

    Returns
    -------
    stream.Score
        A merged Score with continuously numbered measures and correct
        carry-over attributes.
    """
    if not mxl_paths:
        raise ValueError("merge_system_mxls: mxl_paths must not be empty")

    # Fast path: nothing to merge
    if len(mxl_paths) == 1:
        return converter.parse(mxl_paths[0])

    print(f"[merge] Parsing {len(mxl_paths)} system MXL files…")
    scores = [converter.parse(p) for p in mxl_paths]

    num_parts = len(scores[0].parts)
    if num_parts == 0:
        raise RuntimeError("First system MXL has no parts — Audiveris may have failed on that strip.")

    merged = stream.Score()

    for part_idx in range(num_parts):
        merged_part = stream.Part()
        measure_number = 1

        # Carry-over state updated after every processed measure
        last_clef: m21_clef.Clef | None = None
        last_key: m21_key.KeySignature | None = None
        last_time: meter.TimeSignature | None = None

        for sys_idx, score in enumerate(scores):
            if part_idx >= len(score.parts):
                # Fewer parts in this system than the first — skip gracefully
                print(f"[merge] Warning: system {sys_idx} has fewer parts than expected; skipping part {part_idx}.")
                continue

            part = score.parts[part_idx]
            measures = list(part.getElementsByClass(stream.Measure))

            if not measures:
                print(f"[merge] Warning: system {sys_idx}, part {part_idx} has no measures.")
                continue

            for m_idx, measure in enumerate(measures):
                new_measure = copy.deepcopy(measure)
                new_measure.number = measure_number

                # ── Inject carry-over into the first measure of each system > 0 ── #
                if sys_idx > 0 and m_idx == 0:
                    has_clef = bool(list(new_measure.getElementsByClass(m21_clef.Clef)))
                    has_key  = bool(list(new_measure.getElementsByClass(m21_key.KeySignature)))
                    has_time = bool(list(new_measure.getElementsByClass(meter.TimeSignature)))

                    # Only inject when Audiveris produced nothing — never overwrite
                    # a genuine key/clef change that IS present in the strip image.
                    if not has_clef and last_clef is not None:
                        new_measure.insert(0, copy.deepcopy(last_clef))
                    if not has_key and last_key is not None:
                        new_measure.insert(0, copy.deepcopy(last_key))
                    if not has_time and last_time is not None:
                        new_measure.insert(0, copy.deepcopy(last_time))

                # ── Update carry-over state from this measure ─────────────────── #
                clefs = list(new_measure.getElementsByClass(m21_clef.Clef))
                keys  = list(new_measure.getElementsByClass(m21_key.KeySignature))
                times = list(new_measure.getElementsByClass(meter.TimeSignature))

                if clefs:
                    last_clef = clefs[-1]   # use last in case of mid-measure change
                if keys:
                    last_key = keys[-1]
                if times:
                    last_time = times[-1]

                merged_part.append(new_measure)
                measure_number += 1

        merged.append(merged_part)

    print(f"[merge] Merged {measure_number - 1} total measures across {num_parts} part(s).")
    return merged
