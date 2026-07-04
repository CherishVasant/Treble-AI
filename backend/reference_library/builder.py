from reference_data.registry import REFERENCE_REGISTRY
from music.generator import generate_notes_from_steps
from .models import LibraryEntry, LibrarySection

INTERVAL_LABELS = {
    "major_scale": ["Tonic", "M2", "M3", "P4", "P5", "M6", "M7"],
    "natural_minor_scale": ["Tonic", "M2", "m3", "P4", "P5", "m6", "m7"],
    "harmonic_minor_scale": ["Tonic", "M2", "m3", "P4", "P5", "m6", "M7"],
    "melodic_minor_scale": ["Tonic", "M2", "m3", "P4", "P5", "M6", "M7"],
    "chromatic_scale": ["Tonic", "m2", "M2", "m3", "M3", "P4", "d5", "P5", "m6", "M6", "m7", "M7", "Octave"],
    "major_pentatonic_scale": ["Tonic", "M2", "M3", "P5", "M6", "Octave"],
    "minor_pentatonic_scale": ["Tonic", "m3", "P4", "P5", "m7", "Octave"],
    "blues_scale": ["Tonic", "m3", "P4", "d5", "P5", "m7", "Octave"],
    "whole_tone_scale": ["Tonic", "M2", "M3", "d5", "m6", "m7", "Octave"],
    "diminished_scale": ["Tonic", "m2", "m3", "M3", "d5", "P5", "M6", "m7", "Octave"],
    "bebop_scale": ["Tonic", "M2", "M3", "P4", "P5", "M6", "m7", "M7", "Octave"],
    "ionian_mode": ["Tonic", "M2", "M3", "P4", "P5", "M6", "M7"],
    "dorian_mode": ["Tonic", "M2", "m3", "P4", "P5", "M6", "m7"],
    "phrygian_mode": ["Tonic", "m2", "m3", "P4", "P5", "m6", "m7"],
    "lydian_mode": ["Tonic", "M2", "M3", "d5", "P5", "M6", "M7"],
    "mixolydian_mode": ["Tonic", "M2", "M3", "P4", "P5", "M6", "m7"],
    "aeolian_mode": ["Tonic", "M2", "m3", "P4", "P5", "m6", "m7"],
    "locrian_mode": ["Tonic", "m2", "m3", "P4", "d5", "m6", "m7"],
    "major_triad": ["Root", "M3", "P5"],
    "minor_triad": ["Root", "m3", "P5"],
    "diminished_triad": ["Root", "m3", "d5"],
    "augmented_triad": ["Root", "M3", "A5"],
    "suspended_fourth": ["Root", "P4", "P5"],
    "dominant_seventh": ["Root", "M3", "P5", "m7"],
    "major_seventh": ["Root", "M3", "P5", "M7"],
    "minor_seventh": ["Root", "m3", "P5", "m7"],
    "half_diminished_seventh": ["Root", "m3", "d5", "m7"],
    "fully_diminished_seventh": ["Root", "m3", "d5", "d7"],
    "sixth_chord": ["Root", "M3", "P5", "M6"],
    "ninth_chord": ["Root", "M3", "P5", "m7", "M9"],
    "eleventh_chord": ["Root", "P5", "m7", "M9", "P11"],
    "thirteenth_chord": ["Root", "M3", "m7", "M9", "M13"],
    "altered_chord": ["Root", "M3", "d5", "A5", "m7"],
}

def get_entry_title(category_slug: str, formula_id: str, key: str) -> str:
    if category_slug == "major_scales":
        return f"{key} Major"
    elif category_slug == "natural_minor_scales":
        return f"{key} Natural Minor"
    elif category_slug == "harmonic_minor_scales":
        return f"{key} Harmonic Minor"
    elif category_slug == "melodic_minor_scales":
        return f"{key} Melodic Minor"
    elif category_slug == "chromatic_scales":
        return f"{key} Chromatic (Sharps)"
    elif category_slug == "major_pentatonic_scales":
        return f"{key} Major Pentatonic"
    elif category_slug == "minor_pentatonic_scales":
        return f"{key} Minor Pentatonic"
    elif category_slug == "blues_scales":
        return f"{key} Blues Scale"
    elif category_slug == "whole_tone_scales":
        return f"{key} Whole Tone Scale"
    elif category_slug == "diminished_scales":
        return f"{key} Diminished Scale (Half-Whole)"
    elif category_slug == "bebop_scales":
        return f"{key} Bebop Dominant"
    elif category_slug.endswith("_mode"):
        mode_name = category_slug.split("_")[0].capitalize()
        return f"{key} {mode_name}"
    elif category_slug.endswith("_arpeggios"):
        if formula_id == "dominant_seventh":
            return f"{key} Dominant 7th Arpeggio"
        elif formula_id == "major_seventh":
            return f"{key} Major 7th Arpeggio"
        elif formula_id == "minor_seventh":
            return f"{key} Minor 7th Arpeggio"
        else:
            triad_type = formula_id.split("_")[0].capitalize()
            return f"{key} {triad_type} Arpeggio"
    elif category_slug.endswith("_chords"):
        if formula_id == "major_triad":
            return f"{key} Major Triad"
        elif formula_id == "minor_triad":
            return f"{key} Minor Triad"
        elif formula_id == "diminished_triad":
            return f"{key} Diminished Triad"
        elif formula_id == "augmented_triad":
            return f"{key} Augmented Triad"
        elif formula_id == "suspended_fourth":
            return f"{key}sus4"
        elif formula_id == "dominant_seventh":
            return f"{key} Dominant 7th"
        elif formula_id == "major_seventh":
            return f"{key} Major 7th"
        elif formula_id == "minor_seventh":
            return f"{key} Minor 7th"
        elif formula_id == "half_diminished_seventh":
            return f"{key}ø7"
        elif formula_id == "fully_diminished_seventh":
            return f"{key}°7"
        elif formula_id == "sixth_chord":
            return f"{key}6"
        elif formula_id == "ninth_chord":
            return f"{key}9"
        elif formula_id == "eleventh_chord":
            return f"{key}11"
        elif formula_id == "thirteenth_chord":
            return f"{key}13"
        elif formula_id == "altered_chord":
            return f"{key}7alt"
    elif category_slug.startswith("interval_"):
        mapping = {
            "interval_unison": "Perfect Unison (P1)",
            "interval_minor_second": "Minor Second (m2)",
            "interval_major_second": "Major Second (M2)",
            "interval_minor_third": "Minor Third (m3)",
            "interval_major_third": "Major Third (M3)",
            "interval_perfect_fourth": "Perfect Fourth (P4)",
            "interval_tritone": "Tritone (d5/A4)",
            "interval_perfect_fifth": "Perfect Fifth (P5)",
            "interval_minor_sixth": "Minor Sixth (m6)",
            "interval_major_sixth": "Major Sixth (M6)",
            "interval_minor_seventh": "Minor Seventh (m7)",
            "interval_major_seventh": "Major Seventh (M7)",
            "interval_octave": "Perfect Octave (P8)"
        }
        return mapping.get(category_slug, f"Interval {key}")
    return f"{key} Entry"

def get_formula_text(category_slug: str, formula_id: str) -> str:
    mapping = {
        "major_scale": "W-W-H-W-W-W-H",
        "natural_minor_scale": "W-H-W-W-H-W-W",
        "harmonic_minor_scale": "W-H-W-W-H-A2-H",
        "melodic_minor_scale": "W-H-W-W-W-W-H / W-H-W-W-H-W-W",
        "chromatic_scale": "Half Steps",
        "major_pentatonic_scale": "W - W - 1.5W - W - 1.5W",
        "minor_pentatonic_scale": "1.5W - W - W - 1.5W - W",
        "blues_scale": "1.5W - W - H - H - 1.5W - W",
        "whole_tone_scale": "W-W-W-W-W-W",
        "diminished_scale": "H-W-H-W-H-W-H-W",
        "bebop_scale": "W-W-H-W-W-H-H-H",
        "ionian_mode": "W-W-H-W-W-W-H",
        "dorian_mode": "W-H-W-W-W-H-W",
        "phrygian_mode": "H-W-W-W-H-W-W",
        "lydian_mode": "W-W-W-H-W-W-H",
        "mixolydian_mode": "W-W-H-W-W-H-W",
        "aeolian_mode": "W-H-W-W-H-W-W",
        "locrian_mode": "H-W-W-H-W-W-W",
        "major_triad": "1 - 3 - 5" if "arpeggio" in category_slug else "Root + M3 + P5",
        "minor_triad": "1 - b3 - 5" if "arpeggio" in category_slug else "Root + m3 + P5",
        "diminished_triad": "1 - b3 - b5" if "arpeggio" in category_slug else "Root + m3 + d5",
        "augmented_triad": "1 - 3 - #5" if "arpeggio" in category_slug else "Root + M3 + A5",
        "suspended_fourth": "Root + P4 + P5",
        "dominant_seventh": "1 - 3 - 5 - b7" if "arpeggio" in category_slug else "Root + M3 + P5 + m7",
        "major_seventh": "1 - 3 - 5 - 7" if "arpeggio" in category_slug else "Root + M3 + P5 + M7",
        "minor_seventh": "1 - b3 - 5 - b7" if "arpeggio" in category_slug else "Root + m3 + P5 + m7",
        "half_diminished_seventh": "Root + m3 + d5 + m7",
        "fully_diminished_seventh": "Root + m3 + d5 + d7",
        "sixth_chord": "Root + M3 + P5 + M6",
        "ninth_chord": "Root + M3 + P5 + m7 + M9",
        "eleventh_chord": "Root + P5 + m7 + M9 + P11",
        "thirteenth_chord": "Root + M3 + m7 + M9 + M13",
        "altered_chord": "Root + M3 + d5 + A5 + m7"
    }
    if category_slug.startswith("interval_"):
        num_map = {
            "interval_unison": "0 Semitones",
            "interval_minor_second": "1 Semitone",
            "interval_major_second": "2 Semitones",
            "interval_minor_third": "3 Semitones",
            "interval_major_third": "4 Semitones",
            "interval_perfect_fourth": "5 Semitones",
            "interval_tritone": "6 Semitones",
            "interval_perfect_fifth": "7 Semitones",
            "interval_minor_sixth": "8 Semitones",
            "interval_major_sixth": "9 Semitones",
            "interval_minor_seventh": "10 Semitones",
            "interval_major_seventh": "11 Semitones",
            "interval_octave": "12 Semitones"
        }
        return num_map.get(category_slug, "")
    return mapping.get(formula_id, "")

def build_dynamic_section(slug: str, config: dict) -> LibrarySection:
    formula_id = config["formula"]
    generator_type = config["generator"]
    supported_keys = config["keys"]
    
    section = LibrarySection(
        slug=slug,
        title=REFERENCE_REGISTRY["descriptions"].get(slug, slug.replace("_", " ").capitalize()),
        description=REFERENCE_REGISTRY["descriptions"].get(slug)
    )
    
    steps = REFERENCE_REGISTRY["formulas"].get(formula_id, [])
    
    for key in supported_keys:
        # Generate Notes
        raw_notes = generate_notes_from_steps(key, steps)
        
        # Build entries based on generator type
        if generator_type == "interval":
            if len(raw_notes) == 1:
                notes = [f"{raw_notes[0]} to {raw_notes[0]}"]
            else:
                notes = [f"{raw_notes[0]} to {raw_notes[1]}"]
        else:
            notes = raw_notes
            
        # Get Interval Labels
        intervals = []
        if generator_type in ["scale", "mode", "arpeggio", "interval", "chord"]:
            raw_intervals = INTERVAL_LABELS.get(formula_id, [])
            if raw_intervals:
                # Rename Tonic to Root for arpeggios/chords
                if generator_type in ["arpeggio", "chord"]:
                    intervals = [lbl.replace("Tonic", "Root") for lbl in raw_intervals]
                else:
                    intervals = list(raw_intervals)
        
        # Resolve Description
        desc = None
        key_desc_dict = REFERENCE_REGISTRY["key_descriptions"].get(formula_id)
        if key_desc_dict:
            desc = key_desc_dict.get(key)
        if not desc:
            desc = REFERENCE_REGISTRY["descriptions"].get(slug)
            
        # Resolve Fingering
        fingering_data = None
        fingering_formula_dict = REFERENCE_REGISTRY["fingerings"].get(formula_id)
        if fingering_formula_dict:
            fingering_data = fingering_formula_dict.get(key)
            if not fingering_data:
                fingering_data = fingering_formula_dict.get("default")
        
        # Build stable entry slug
        # e.g., major_scale_c, mixolydian_mode_g, major_triad_chord_c, major_triad_arpeggio_c
        sanitized_key = key.lower().replace("#", "s")
        entry_slug = f"{formula_id}_{sanitized_key}"
        if generator_type == "chord":
            entry_slug = f"{formula_id}_chord_{sanitized_key}"
        elif generator_type == "arpeggio":
            entry_slug = f"{formula_id}_arpeggio_{sanitized_key}"
            
        entry = LibraryEntry(
            slug=entry_slug,
            title=get_entry_title(slug, formula_id, key),
            description=desc,
            formula=get_formula_text(slug, formula_id),
            notes=notes,
            intervals=intervals
        )
        
        # Optionally attach fingering/audio metadata as custom properties on the entry
        # to ensure the builder attaches it
        entry.fingering = fingering_data
        
        folder = REFERENCE_REGISTRY["audio"].get(slug) or REFERENCE_REGISTRY["audio"].get(formula_id, "scale")
        entry.audio_path = f"audio/{folder}/{sanitized_key}.mp3"
        
        section.entries.append(entry)
        
    return section
