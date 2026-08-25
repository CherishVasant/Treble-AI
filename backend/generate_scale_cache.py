#!/usr/bin/env python3
"""Pre-generate all scale audio WAV files for the music reference library.

Run once during Docker build (or locally) to warm the output/scales/ cache.
All 24 scales (12 major + 12 minor) from the Circle of Fifths panel in the
frontend music library are generated here.  At runtime the endpoint simply
serves these files instantly — no FluidSynth synthesis delay on first play.
"""
import hashlib
import subprocess
import sys
from pathlib import Path
from music21 import stream, note, tempo

# --------------------------------------------------------------------------- #
# Paths — must match reference.py                                              #
# --------------------------------------------------------------------------- #
SCALES_DIR = Path("output") / "scales"
SOUNDFONT  = Path(__file__).parent / "soundfonts" / "GeneralUser-GS.sf2"
FLUIDSYNTH = "fluidsynth"

# --------------------------------------------------------------------------- #
# Note arrays — must match the playNotesMajor / playNotesMinor fields in     #
#   frontend/app/music-library/page.tsx  (CIRCLE_SECTORS array).             #
# The endpoint plays ascending then descending, so we extend automatically.   #
# --------------------------------------------------------------------------- #
SCALE_NOTES = [
    # C major / A minor
    ["C4",  "D4",  "E4",  "F4",  "G4",  "A4",  "B4",  "C5"],
    ["A3",  "B3",  "C4",  "D4",  "E4",  "F4",  "G4",  "A4"],
    # G major / E minor
    ["G4",  "A4",  "B4",  "C5",  "D5",  "E5",  "F#5", "G5"],
    ["E4",  "F#4", "G4",  "A4",  "B4",  "C5",  "D5",  "E5"],
    # D major / B minor
    ["D4",  "E4",  "F#4", "G4",  "A4",  "B4",  "C#5", "D5"],
    ["B3",  "C#4", "D4",  "E4",  "F#4", "G4",  "A4",  "B4"],
    # A major / F# minor
    ["A4",  "B4",  "C#5", "D5",  "E5",  "F#5", "G#5", "A5"],
    ["F#4", "G#4", "A4",  "B4",  "C#5", "D5",  "E5",  "F#5"],
    # E major / C# minor
    ["E4",  "F#4", "G#4", "A4",  "B4",  "C#5", "D#5", "E5"],
    ["C#4", "D#4", "E4",  "F#4", "G#4", "A4",  "B4",  "C#5"],
    # B major / G# minor
    ["B3",  "C#4", "D#4", "E4",  "F#4", "G#4", "A#4", "B4"],
    ["G#4", "A#4", "B4",  "C#5", "D#5", "E5",  "F#5", "G#5"],
    # F# major / D# minor
    ["F#4", "G#4", "A#4", "B4",  "C#5", "D#5", "E#5", "F#5"],
    ["D#4", "E#4", "F#4", "G#4", "A#4", "B4",  "C#5", "D#5"],
    # Db major / Bb minor
    ["C#4", "D#4", "F4",  "F#4", "G#4", "A#4", "C5",  "C#5"],
    ["A#3", "C4",  "C#4", "D#4", "F4",  "F#4", "G#4", "A#4"],
    # Ab major / F minor
    ["G#4", "A#4", "C5",  "C#5", "D#5", "F5",  "G5",  "G#5"],
    ["F4",  "G4",  "G#4", "A#4", "C5",  "C#5", "D#5", "F5"],
    # Eb major / C minor
    ["D#4", "F4",  "G4",  "G#4", "A#4", "C5",  "D5",  "D#5"],
    ["C4",  "D4",  "D#4", "F4",  "G4",  "G#4", "A#4", "C5"],
    # Bb major / G minor
    ["A#3", "C4",  "D4",  "D#4", "F4",  "G4",  "A4",  "A#4"],
    ["G4",  "A4",  "A#4", "C5",  "D5",  "D#5", "F5",  "G5"],
    # F major / D minor
    ["F4",  "G4",  "A4",  "A#4", "C5",  "D5",  "E5",  "F5"],
    ["D4",  "E4",  "F4",  "G4",  "A4",  "A#4", "C5",  "D5"],
]


def generate_wav(ascending_notes: list) -> bool:
    """Generate the ascending-then-descending WAV for *ascending_notes*."""
    # Replicate the same note list the endpoint builds:
    #   [...notes, ...[...notes].reverse().slice(1)]   (JS)
    notes_with_return = ascending_notes + list(reversed(ascending_notes))[1:]
    notes_str  = ",".join(notes_with_return)
    notes_hash = hashlib.md5(notes_str.encode("utf-8")).hexdigest()
    output_wav = SCALES_DIR / f"{notes_hash}.wav"

    if output_wav.exists():
        print(f"  already cached — {notes_str[:45]}…")
        return True

    midi_path = SCALES_DIR / f"{notes_hash}.mid"
    try:
        # 1. Write MIDI
        s = stream.Stream()
        s.append(tempo.MetronomeMark(number=150))
        for n_name in notes_with_return:
            nt = note.Note(n_name)
            nt.quarterLength = 1.0
            s.append(nt)
        s.write("midi", fp=str(midi_path))

        # 2. Synthesise with FluidSynth
        result = subprocess.run(
            [FLUIDSYNTH, "-ni", "-F", str(output_wav), "-r", "44100",
             str(SOUNDFONT), str(midi_path)],
            capture_output=True, text=True,
        )
        if result.returncode != 0:
            print(f"  FluidSynth error: {result.stderr[:200]}", file=sys.stderr)
            return False

        print(f"  generated  — {notes_str[:45]}…")
        return True

    except Exception as exc:
        print(f"  error: {exc}", file=sys.stderr)
        return False
    finally:
        if midi_path.exists():
            try:
                midi_path.unlink()
            except Exception:
                pass


def main() -> None:
    if not SOUNDFONT.exists():
        print(f"ERROR: soundfont not found at {SOUNDFONT}", file=sys.stderr)
        sys.exit(1)

    SCALES_DIR.mkdir(parents=True, exist_ok=True)

    total = len(SCALE_NOTES)
    print(f"Pre-generating {total} scale WAV files into {SCALES_DIR}/")
    ok = sum(1 for notes in SCALE_NOTES if generate_wav(notes))
    print(f"\nDone: {ok}/{total} files ready.")

    if ok < total:
        print("WARNING: some scales could not be generated.", file=sys.stderr)
        # Don't fail the build — missing scales will be synthesised on first request.


if __name__ == "__main__":
    main()
