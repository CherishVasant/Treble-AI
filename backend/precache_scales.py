import json
import re
import hashlib
import subprocess
from pathlib import Path
from music21 import stream, note, tempo

FLUIDSYNTH_PATH = r"C:\tools\fluidsynth\bin\fluidsynth.exe"
import os
SOUNDFONT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "soundfonts", "GeneralUser-GS.sf2")

def precache_scales():
    # Read scales-data.ts to extract scales and their playNotes
    scales_data_path = Path("frontend/lib/scales-data.ts")
    if not scales_data_path.exists():
        # Try relative to backend directory if running from within backend
        scales_data_path = Path("../frontend/lib/scales-data.ts")
        
    if not scales_data_path.exists():
        print("frontend/lib/scales-data.ts not found.")
        return

    with open(scales_data_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Parse all blocks like:
    # 'C Melodic Minor': {
    #   ...
    #   playNotes: ['C4', 'D4', ...]
    # }
    matches = re.finditer(r"'([^']+)':\s*\{[^}]+?playNotes:\s*\[([^\]]+)\]", content)
    
    scales = []
    for m in matches:
        name = m.group(1)
        notes_str = m.group(2)
        notes = [n.strip().strip("'").strip('"') for n in notes_str.split(",") if n.strip()]
        scales.append((name, notes))
        
    print(f"Parsed {len(scales)} scales from frontend registry.")
    
    # Path relative to workspace root
    scales_dir = Path("output") / "scales"
    if not Path("output").exists() and Path("../output").exists():
        scales_dir = Path("../output") / "scales"
        
    scales_dir.mkdir(parents=True, exist_ok=True)
    
    success_count = 0
    for name, play_notes in scales:
        if not play_notes:
            continue
            
        # Match ReferenceCard logic: Melodic Minor plays playNotes directly, others play ascending then descending
        if "Melodic Minor" in name:
            notes_to_play = play_notes
        else:
            notes_to_play = play_notes + list(reversed(play_notes))[1:]
            
        # Hash notes list for cache filename
        notes_str = ",".join(notes_to_play)
        notes_hash = hashlib.md5(notes_str.encode("utf-8")).hexdigest()
        output_wav = scales_dir / f"{notes_hash}.wav"
        
        if output_wav.exists():
            print(f"Scale '{name}' is already cached.")
            success_count += 1
            continue
            
        midi_path = scales_dir / f"{notes_hash}.mid"
        try:
            print(f"Synthesizing scale '{name}'...")
            s = stream.Stream()
            s.append(tempo.MetronomeMark(number=150))
            for n_name in notes_to_play:
                nt = note.Note(n_name)
                nt.quarterLength = 1.0
                s.append(nt)
                
            s.write("midi", fp=str(midi_path))
            
            fluidsynth_command = [
                FLUIDSYNTH_PATH,
                "-ni",
                "-F",
                str(output_wav),
                "-r",
                "44100",
                SOUNDFONT,
                str(midi_path),
            ]
            
            subprocess.run(fluidsynth_command, capture_output=True, check=True)
            success_count += 1
        except Exception as e:
            print(f"Failed to synthesize '{name}': {e}")
            if output_wav.exists():
                try:
                    output_wav.unlink()
                except Exception:
                    pass
        finally:
            if midi_path.exists():
                try:
                    midi_path.unlink()
                except Exception:
                    pass
                
    print(f"Pre-caching completed. {success_count}/{len(scales)} scales are cached.")

if __name__ == "__main__":
    precache_scales()
