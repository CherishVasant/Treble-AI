from .keys import SUPPORTED_KEYS

DYNAMIC_CATEGORIES: dict[str, dict] = {
    # Scale Categories
    "major_scales": {
        "formula": "major_scale",
        "generator": "scale",
        "keys": SUPPORTED_KEYS,
        "sort_order": 10
    },
    "natural_minor_scales": {
        "formula": "natural_minor_scale",
        "generator": "scale",
        "keys": SUPPORTED_KEYS,
        "sort_order": 20
    },
    "harmonic_minor_scales": {
        "formula": "harmonic_minor_scale",
        "generator": "scale",
        "keys": SUPPORTED_KEYS,
        "sort_order": 30
    },
    "melodic_minor_scales": {
        "formula": "melodic_minor_scale",
        "generator": "scale",
        "keys": SUPPORTED_KEYS,
        "sort_order": 40
    },
    "chromatic_scales": {
        "formula": "chromatic_scale",
        "generator": "scale",
        "keys": SUPPORTED_KEYS,
        "sort_order": 50
    },
    "major_pentatonic_scales": {
        "formula": "major_pentatonic_scale",
        "generator": "scale",
        "keys": SUPPORTED_KEYS,
        "sort_order": 60
    },
    "minor_pentatonic_scales": {
        "formula": "minor_pentatonic_scale",
        "generator": "scale",
        "keys": SUPPORTED_KEYS,
        "sort_order": 70
    },
    "blues_scales": {
        "formula": "blues_scale",
        "generator": "scale",
        "keys": SUPPORTED_KEYS,
        "sort_order": 80
    },
    "whole_tone_scales": {
        "formula": "whole_tone_scale",
        "generator": "scale",
        "keys": SUPPORTED_KEYS,
        "sort_order": 90
    },
    "diminished_scales": {
        "formula": "diminished_scale",
        "generator": "scale",
        "keys": SUPPORTED_KEYS,
        "sort_order": 100
    },
    "bebop_scales": {
        "formula": "bebop_scale",
        "generator": "scale",
        "keys": SUPPORTED_KEYS,
        "sort_order": 110
    },

    # Modes Categories
    "ionian_mode": {
        "formula": "ionian_mode",
        "generator": "mode",
        "keys": SUPPORTED_KEYS,
        "sort_order": 120
    },
    "dorian_mode": {
        "formula": "dorian_mode",
        "generator": "mode",
        "keys": SUPPORTED_KEYS,
        "sort_order": 130
    },
    "phrygian_mode": {
        "formula": "phrygian_mode",
        "generator": "mode",
        "keys": SUPPORTED_KEYS,
        "sort_order": 140
    },
    "lydian_mode": {
        "formula": "lydian_mode",
        "generator": "mode",
        "keys": SUPPORTED_KEYS,
        "sort_order": 150
    },
    "mixolydian_mode": {
        "formula": "mixolydian_mode",
        "generator": "mode",
        "keys": SUPPORTED_KEYS,
        "sort_order": 160
    },
    "aeolian_mode": {
        "formula": "aeolian_mode",
        "generator": "mode",
        "keys": SUPPORTED_KEYS,
        "sort_order": 170
    },
    "locrian_mode": {
        "formula": "locrian_mode",
        "generator": "mode",
        "keys": SUPPORTED_KEYS,
        "sort_order": 180
    },

    # Arpeggio Categories
    "major_arpeggios": {
        "formula": "major_triad",
        "generator": "arpeggio",
        "keys": SUPPORTED_KEYS,
        "sort_order": 190
    },
    "minor_arpeggios": {
        "formula": "minor_triad",
        "generator": "arpeggio",
        "keys": SUPPORTED_KEYS,
        "sort_order": 200
    },
    "diminished_arpeggios": {
        "formula": "diminished_triad",
        "generator": "arpeggio",
        "keys": SUPPORTED_KEYS,
        "sort_order": 210
    },
    "augmented_arpeggios": {
        "formula": "augmented_triad",
        "generator": "arpeggio",
        "keys": SUPPORTED_KEYS,
        "sort_order": 220
    },
    "dominant_seventh_arpeggios": {
        "formula": "dominant_seventh",
        "generator": "arpeggio",
        "keys": SUPPORTED_KEYS,
        "sort_order": 230
    },
    "major_seventh_arpeggios": {
        "formula": "major_seventh",
        "generator": "arpeggio",
        "keys": SUPPORTED_KEYS,
        "sort_order": 240
    },
    "minor_seventh_arpeggios": {
        "formula": "minor_seventh",
        "generator": "arpeggio",
        "keys": SUPPORTED_KEYS,
        "sort_order": 250
    },

    # Chord Categories
    "major_chords": {
        "formula": "major_triad",
        "generator": "chord",
        "keys": SUPPORTED_KEYS,
        "sort_order": 260
    },
    "minor_chords": {
        "formula": "minor_triad",
        "generator": "chord",
        "keys": SUPPORTED_KEYS,
        "sort_order": 270
    },
    "diminished_chords": {
        "formula": "diminished_triad",
        "generator": "chord",
        "keys": SUPPORTED_KEYS,
        "sort_order": 280
    },
    "augmented_chords": {
        "formula": "augmented_triad",
        "generator": "chord",
        "keys": SUPPORTED_KEYS,
        "sort_order": 290
    },
    "suspended_chords": {
        "formula": "suspended_fourth",
        "generator": "chord",
        "keys": SUPPORTED_KEYS,
        "sort_order": 300
    },
    "dominant_seventh_chords": {
        "formula": "dominant_seventh",
        "generator": "chord",
        "keys": SUPPORTED_KEYS,
        "sort_order": 310
    },
    "major_seventh_chords": {
        "formula": "major_seventh",
        "generator": "chord",
        "keys": SUPPORTED_KEYS,
        "sort_order": 320
    },
    "minor_seventh_chords": {
        "formula": "minor_seventh",
        "generator": "chord",
        "keys": SUPPORTED_KEYS,
        "sort_order": 330
    },
    "half_diminished_chords": {
        "formula": "half_diminished_seventh",
        "generator": "chord",
        "keys": SUPPORTED_KEYS,
        "sort_order": 340
    },
    "fully_diminished_chords": {
        "formula": "fully_diminished_seventh",
        "generator": "chord",
        "keys": SUPPORTED_KEYS,
        "sort_order": 350
    },
    "sixth_chords": {
        "formula": "sixth_chord",
        "generator": "chord",
        "keys": SUPPORTED_KEYS,
        "sort_order": 360
    },
    "ninth_chords": {
        "formula": "ninth_chord",
        "generator": "chord",
        "keys": SUPPORTED_KEYS,
        "sort_order": 370
    },
    "eleventh_chords": {
        "formula": "eleventh_chord",
        "generator": "chord",
        "keys": SUPPORTED_KEYS,
        "sort_order": 380
    },
    "thirteenth_chords": {
        "formula": "thirteenth_chord",
        "generator": "chord",
        "keys": SUPPORTED_KEYS,
        "sort_order": 390
    },
    "altered_chords": {
        "formula": "altered_chord",
        "generator": "chord",
        "keys": SUPPORTED_KEYS,
        "sort_order": 400
    },

    # Diatonic Interval Categories
    "interval_unison": {
        "formula": "interval_unison",
        "generator": "interval",
        "keys": SUPPORTED_KEYS,
        "sort_order": 410
    },
    "interval_minor_second": {
        "formula": "interval_minor_second",
        "generator": "interval",
        "keys": SUPPORTED_KEYS,
        "sort_order": 420
    },
    "interval_major_second": {
        "formula": "interval_major_second",
        "generator": "interval",
        "keys": SUPPORTED_KEYS,
        "sort_order": 430
    },
    "interval_minor_third": {
        "formula": "interval_minor_third",
        "generator": "interval",
        "keys": SUPPORTED_KEYS,
        "sort_order": 440
    },
    "interval_major_third": {
        "formula": "interval_major_third",
        "generator": "interval",
        "keys": SUPPORTED_KEYS,
        "sort_order": 450
    },
    "interval_perfect_fourth": {
        "formula": "interval_perfect_fourth",
        "generator": "interval",
        "keys": SUPPORTED_KEYS,
        "sort_order": 460
    },
    "interval_tritone": {
        "formula": "interval_tritone",
        "generator": "interval",
        "keys": SUPPORTED_KEYS,
        "sort_order": 470
    },
    "interval_perfect_fifth": {
        "formula": "interval_perfect_fifth",
        "generator": "interval",
        "keys": SUPPORTED_KEYS,
        "sort_order": 480
    },
    "interval_minor_sixth": {
        "formula": "interval_minor_sixth",
        "generator": "interval",
        "keys": SUPPORTED_KEYS,
        "sort_order": 490
    },
    "interval_major_sixth": {
        "formula": "interval_major_sixth",
        "generator": "interval",
        "keys": SUPPORTED_KEYS,
        "sort_order": 500
    },
    "interval_minor_seventh": {
        "formula": "interval_minor_seventh",
        "generator": "interval",
        "keys": SUPPORTED_KEYS,
        "sort_order": 510
    },
    "interval_major_seventh": {
        "formula": "interval_major_seventh",
        "generator": "interval",
        "keys": SUPPORTED_KEYS,
        "sort_order": 520
    },
    "interval_octave": {
        "formula": "interval_octave",
        "generator": "interval",
        "keys": SUPPORTED_KEYS,
        "sort_order": 530
    }
}
