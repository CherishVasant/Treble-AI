# Piano fingerings for scales, modes, chords, and arpeggios.
# Format: { formula_id: { key: { "right": "...", "left": "..." } } }

FINGERINGS: dict[str, dict[str, dict[str, str]]] = {
    "major_scale": {
        "C":  {"right": "1-2-3-1-2-3-4-5", "left": "5-4-3-2-1-3-2-1"},
        "G":  {"right": "1-2-3-1-2-3-4-5", "left": "5-4-3-2-1-3-2-1"},
        "D":  {"right": "1-2-3-1-2-3-4-5", "left": "5-4-3-2-1-3-2-1"},
        "A":  {"right": "1-2-3-1-2-3-4-5", "left": "5-4-3-2-1-3-2-1"},
        "E":  {"right": "1-2-3-1-2-3-4-5", "left": "5-4-3-2-1-3-2-1"},
        "B":  {"right": "1-2-3-1-2-3-4-5", "left": "5-4-3-2-1-3-2-1"},
        "F#": {"right": "2-3-4-1-2-3-1-2", "left": "4-3-2-1-3-2-1-4"},
        "C#": {"right": "2-3-4-1-2-3-1-2", "left": "4-3-2-1-3-2-1-4"},
        "F":  {"right": "1-2-3-4-1-2-3-5", "left": "5-4-3-2-1-3-2-1"},
        "Bb": {"right": "4-1-2-3-1-2-3-4", "left": "3-2-1-4-3-2-1-3"},
        "Eb": {"right": "3-1-2-3-4-1-2-3", "left": "3-2-1-4-3-2-1-3"},
        "Ab": {"right": "3-4-1-2-3-1-2-3", "left": "3-2-1-4-3-2-1-3"},
        "Db": {"right": "2-3-1-2-3-4-1-2", "left": "3-2-1-4-3-2-1-3"},
        "Gb": {"right": "2-3-4-1-2-3-1-2", "left": "4-3-2-1-3-2-1-4"},
        "D#": {"right": "3-1-2-3-4-1-2-3", "left": "3-2-1-4-3-2-1-3"},
        "G#": {"right": "3-4-1-2-3-1-2-3", "left": "3-2-1-4-3-2-1-3"},
        "A#": {"right": "4-1-2-3-1-2-3-4", "left": "3-2-1-4-3-2-1-3"},
        "default": {"right": "1-2-3-1-2-3-4-5", "left": "5-4-3-2-1-3-2-1"}
    },
    "natural_minor_scale": {
        "A":  {"right": "1-2-3-1-2-3-4-5", "left": "5-4-3-2-1-3-2-1"},
        "E":  {"right": "1-2-3-1-2-3-4-5", "left": "5-4-3-2-1-3-2-1"},
        "B":  {"right": "1-2-3-1-2-3-4-5", "left": "5-4-3-2-1-3-2-1"},
        "F#": {"right": "1-2-3-1-2-3-4-5", "left": "5-4-3-2-1-3-2-1"},
        "C#": {"right": "1-2-3-1-2-3-4-5", "left": "5-4-3-2-1-3-2-1"},
        "G#": {"right": "2-3-1-2-3-4-1-2", "left": "3-2-1-4-3-2-1-3"},
        "D#": {"right": "2-3-1-2-3-4-1-2", "left": "3-2-1-4-3-2-1-3"},
        "A#": {"right": "2-3-1-2-3-4-1-2", "left": "3-2-1-4-3-2-1-3"},
        "D":  {"right": "1-2-3-1-2-3-4-5", "left": "5-4-3-2-1-3-2-1"},
        "G":  {"right": "1-2-3-1-2-3-4-5", "left": "5-4-3-2-1-3-2-1"},
        "C":  {"right": "1-2-3-1-2-3-4-5", "left": "5-4-3-2-1-3-2-1"},
        "F":  {"right": "1-2-3-4-1-2-3-5", "left": "5-4-3-2-1-3-2-1"},
        "Bb": {"right": "2-3-1-2-3-4-1-2", "left": "3-2-1-4-3-2-1-3"},
        "Eb": {"right": "2-3-1-2-3-4-1-2", "left": "3-2-1-4-3-2-1-3"},
        "Ab": {"right": "2-3-1-2-3-4-1-2", "left": "3-2-1-4-3-2-1-3"},
        "Db": {"right": "2-3-1-2-3-4-1-2", "left": "3-2-1-4-3-2-1-3"},
        "Gb": {"right": "2-3-1-2-3-4-1-2", "left": "3-2-1-4-3-2-1-3"},
        "default": {"right": "1-2-3-1-2-3-4-5", "left": "5-4-3-2-1-3-2-1"}
    },
    "harmonic_minor_scale": {
        "default": {"right": "1-2-3-1-2-3-4-5", "left": "5-4-3-2-1-3-2-1"}
    },
    "melodic_minor_scale": {
        "default": {"right": "1-2-3-1-2-3-4-5", "left": "5-4-3-2-1-3-2-1"}
    },
    "chromatic_scale": {
        "default": {"right": "1-3-1-3-1-2-3-1-3-1-3-1-2", "left": "1-3-1-3-2-1-3-1-3-1-3-2-1"}
    },
    "major_pentatonic_scale": {
        "default": {"right": "1-2-3-1-2-3", "left": "3-2-1-3-2-1"}
    },
    "minor_pentatonic_scale": {
        "default": {"right": "1-2-3-1-2-3", "left": "3-2-1-3-2-1"}
    },
    "blues_scale": {
        "default": {"right": "1-2-3-4-1-2", "left": "4-3-2-1-3-2"}
    },
    "whole_tone_scale": {
        "default": {"right": "1-2-3-1-2-3", "left": "3-2-1-3-2-1"}
    },
    "diminished_scale": {
        "default": {"right": "1-2-3-4-1-2-3-4", "left": "4-3-2-1-4-3-2-1"}
    },
    "bebop_scale": {
        "default": {"right": "1-2-3-1-2-3-4-1-2", "left": "5-4-3-2-1-3-2-1-4"}
    },
    "ionian_mode": {
        "default": {"right": "1-2-3-1-2-3-4-5", "left": "5-4-3-2-1-3-2-1"}
    },
    "dorian_mode": {
        "default": {"right": "1-2-3-1-2-3-4-5", "left": "5-4-3-2-1-3-2-1"}
    },
    "phrygian_mode": {
        "default": {"right": "1-2-3-1-2-3-4-5", "left": "5-4-3-2-1-3-2-1"}
    },
    "lydian_mode": {
        "default": {"right": "1-2-3-1-2-3-4-5", "left": "5-4-3-2-1-3-2-1"}
    },
    "mixolydian_mode": {
        "default": {"right": "1-2-3-1-2-3-4-5", "left": "5-4-3-2-1-3-2-1"}
    },
    "aeolian_mode": {
        "default": {"right": "1-2-3-1-2-3-4-5", "left": "5-4-3-2-1-3-2-1"}
    },
    "locrian_mode": {
        "default": {"right": "1-2-3-1-2-3-4-5", "left": "5-4-3-2-1-3-2-1"}
    },
    "major_triad": {
        "default": {"right": "1-3-5", "left": "5-3-1"}
    },
    "minor_triad": {
        "default": {"right": "1-3-5", "left": "5-3-1"}
    },
    "diminished_triad": {
        "default": {"right": "1-3-5", "left": "5-3-1"}
    },
    "augmented_triad": {
        "default": {"right": "1-3-5", "left": "5-3-1"}
    },
    "suspended_fourth": {
        "default": {"right": "1-3-5", "left": "5-3-1"}
    },
    "dominant_seventh": {
        "default": {"right": "1-2-3-5", "left": "5-3-2-1"}
    },
    "major_seventh": {
        "default": {"right": "1-2-3-5", "left": "5-3-2-1"}
    },
    "minor_seventh": {
        "default": {"right": "1-2-3-5", "left": "5-3-2-1"}
    },
    "half_diminished_seventh": {
        "default": {"right": "1-2-3-5", "left": "5-3-2-1"}
    },
    "fully_diminished_seventh": {
        "default": {"right": "1-2-3-5", "left": "5-3-2-1"}
    },
    "sixth_chord": {
        "default": {"right": "1-2-3-5", "left": "5-3-2-1"}
    },
    "ninth_chord": {
        "default": {"right": "1-2-3-5-2", "left": "5-3-2-1-3"}
    },
    "eleventh_chord": {
        "default": {"right": "1-2-3-5", "left": "5-3-2-1"}
    },
    "thirteenth_chord": {
        "default": {"right": "1-2-3-5", "left": "5-3-2-1"}
    },
    "altered_chord": {
        "default": {"right": "1-2-3-5", "left": "5-3-2-1"}
    }
}
