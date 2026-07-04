from reference_data.spellings import CHROMATIC_SPELLINGS

def generate_notes_from_steps(root: str, steps: list[int]) -> list[str]:
    """
    Generates spelled note names for a given root note and semitone steps.
    Uses the chromatic spellings map to ensure correct spelling rules.
    """
    if root not in CHROMATIC_SPELLINGS:
        # Fallback to standard spelling if root key is somehow not listed
        chromatic = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    else:
        chromatic = CHROMATIC_SPELLINGS[root]
    
    notes = [chromatic[step % 12] for step in steps]
    
    # Custom spelling exception: Gb minor scales/modes should spell the 4th degree as 'B' instead of 'Cb'
    if root == "Gb" and "A" in notes:
        notes = ["B" if n == "Cb" else n for n in notes]
        
    return notes

def generate_intervals_from_steps(steps: list[int]) -> list[str]:
    """
    Maps list of semitone offset steps (0 to 11+) to standard interval abbreviations.
    """
    mapping = {
        0: "Tonic",
        1: "m2",
        2: "M2",
        3: "m3",
        4: "M3",
        5: "P4",
        6: "d5",
        7: "P5",
        8: "m6",
        9: "M6",
        10: "m7",
        11: "M7"
    }
    return [mapping.get(step % 12, "Unknown") for step in steps]
