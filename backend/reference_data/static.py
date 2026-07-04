STATIC_CATEGORIES: dict[str, dict] = {
    # Theory Categories
    "circle_of_fifths": {
        "title": "Circle of Fifths",
        "description": "Geometric display showing relationship between keys and their sharps/flats.",
        "sort_order": 540,
        "entries": [
            {
                "title": "Circle of Fifths",
                "description": "Steps of Perfect 5ths. Sharps clockwise: G (1#), D (2#), A (3#). Flats counter-clockwise: F (1b), Bb (2b), Eb (3b).",
            }
        ]
    },
    "key_signatures": {
        "title": "Key Signatures",
        "description": "The set of sharps/flats positioned on the staff designating the key.",
        "sort_order": 550,
        "entries": [
            {
                "title": "Sharps and Flats Order",
                "description": "Sharps: F-C-G-D-A-E-B. Flats: B-E-A-D-G-C-F.",
            }
        ]
    },
    "time_signatures": {
        "title": "Time Signatures",
        "description": "Numerator defines beats per bar; denominator defines note value of beat.",
        "sort_order": 560,
        "entries": [
            {
                "title": "Simple vs Compound Meters",
                "description": "Simple (4/4, 3/4) splits beats in two. Compound (6/8, 9/8) splits beats in three.",
            }
        ]
    },
    "scale_degrees": {
        "title": "Scale Degrees",
        "description": "Functional names assigned to notes relative to the tonic note.",
        "sort_order": 570,
        "entries": [
            {
                "title": "Scale Degree Roles",
                "description": "1: Tonic, 2: Supertonic, 3: Mediant, 4: Subdominant, 5: Dominant, 6: Submediant, 7: Leading Tone.",
            }
        ]
    },
    "chord_functions": {
        "title": "Chord Functions",
        "description": "Diatonic chord roles inside keys (Tonic, Subdominant, Dominant).",
        "sort_order": 580,
        "entries": [
            {
                "title": "Roman Numeral Analysis",
                "description": "Uppercase: Major (I, IV, V). Lowercase: Minor (ii, iii, vi). Degree circle: Diminished (vii°).",
            }
        ]
    },
    "harmonic_progressions": {
        "title": "Harmonic Progressions",
        "description": "Standard chord patterns in popular and classical songs.",
        "sort_order": 590,
        "entries": [
            {
                "title": "The I-V-vi-IV Progression",
                "description": "Extremely popular chord cycle (e.g. C - G - Am - F).",
            }
        ]
    },
    "cadences": {
        "title": "Cadences",
        "description": "Melodic or chord endings indicating rest or resolution.",
        "sort_order": 600,
        "entries": [
            {
                "title": "Authentic vs Plagal Cadences",
                "description": "Authentic: V to I (strong resolution). Plagal: IV to I (the 'Amen' ending).",
            }
        ]
    },
    "modes_theory": {
        "title": "Modes",
        "description": "Theoretical framework for modal rotations.",
        "sort_order": 610,
        "entries": [
            {
                "title": "Diatonic Modes",
                "description": "Rotations of major scale starting on degrees: Ionian(1), Dorian(2), Phrygian(3), Lydian(4), Mixolydian(5), Aeolian(6), Locrian(7).",
            }
        ]
    },
    "voice_leading": {
        "title": "Voice Leading",
        "description": "Guideline for smooth transitions of voice lines between chords.",
        "sort_order": 620,
        "entries": [
            {
                "title": "Smooth Voice Leading Guidelines",
                "description": "Keep notes in common, step move lines, avoid parallel fifths and octaves.",
            }
        ]
    },

    # Notation Categories
    "notation_clefs": {
        "title": "Clefs",
        "description": "Clef indicators at beginning of staffs setting baseline notes.",
        "sort_order": 630,
        "entries": [
            {
                "title": "Clefs (Treble & Bass)",
                "description": "Treble Clef: sets G4 line. Bass Clef: sets F3 line.",
            }
        ]
    },
    "notation_dynamics": {
        "title": "Dynamics",
        "description": "Symbols indicating playback volume.",
        "sort_order": 640,
        "entries": [
            {
                "title": "Dynamic Volume Markings",
                "description": "p: piano (soft), f: forte (loud), m: mezzo (medium), cresc: crescendo (growing louder).",
            }
        ]
    },
    "notation_articulations": {
        "title": "Articulations",
        "description": "Indication on note envelopes detailing performance styles.",
        "sort_order": 650,
        "entries": [
            {
                "title": "Articulations (Staccato & Legato)",
                "description": "Staccato: detached notes (dot symbol). Legato: connected notes (slur curve).",
            }
        ]
    },
    "notation_tempo_markings": {
        "title": "Tempo Markings",
        "description": "Speed indications.",
        "sort_order": 660,
        "entries": [
            {
                "title": "Tempo markings",
                "description": "Adagio (slow), Andante (walking tempo), Allegro (lively/fast), Presto (very fast).",
            }
        ]
    },
    "notation_repeats": {
        "title": "Repeats",
        "description": "Barline indicators representing repeats.",
        "sort_order": 670,
        "entries": [
            {
                "title": "Repeats and Signs",
                "description": "Repeat dots block, Segno sign, Coda sign, D.C. al Coda.",
            }
        ]
    },
    "notation_endings": {
        "title": "Endings",
        "description": "Alternate measure ends.",
        "sort_order": 680,
        "entries": [
            {
                "title": "First and Second Endings",
                "description": "Play first ending measures, repeat back, then skip first and play second ending measures.",
            }
        ]
    },
    "notation_pedal_markings": {
        "title": "Pedal Markings",
        "description": "Indicators for piano damper sustain pedals.",
        "sort_order": 690,
        "entries": [
            {
                "title": "Sustain Pedal Markings",
                "description": "Ped. indicating depress pedal, Asterisk * or bracket hook indicating release sustain.",
            }
        ]
    },
    "notation_ornaments": {
        "title": "Ornaments",
        "description": "Trills and ornaments embellishing notes.",
        "sort_order": 700,
        "entries": [
            {
                "title": "Trills and Mordents",
                "description": "Trill: quick alternation with note above. Mordent: quick single dip down or up.",
            }
        ]
    },
    "notation_slurs": {
        "title": "Slurs",
        "description": "Curves indicating phrasing groups.",
        "sort_order": 710,
        "entries": [
            {
                "title": "Slurs vs Ties",
                "description": "Slurs connect different notes. Ties connect identical notes to extend duration.",
            }
        ]
    },
    "notation_ties": {
        "title": "Ties",
        "description": "Curved lines linking note heads of same pitch.",
        "sort_order": 720,
        "entries": [
            {
                "title": "Ties",
                "description": "Combines note values; the second note is not re-struck.",
            }
        ]
    },
    "notation_tuplets": {
        "title": "Tuplets",
        "description": "Beat divisions into sub-intervals.",
        "sort_order": 730,
        "entries": [
            {
                "title": "Triplets and Tuplets",
                "description": "Triplet: plays 3 notes in space of 2. Duplet: plays 2 notes in space of 3.",
            }
        ]
    }
}
