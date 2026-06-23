"""Create tables and seed reference library if empty."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from database import Base, engine, SessionLocal
from models import ReferenceEntry, ReferenceSection


SEED_SECTIONS: list[dict] = [
    {
        "slug": "major_scales",
        "title": "Major Scales",
        "description": "The foundation of Western music harmony, following the W-W-H-W-W-W-H pattern.",
        "sort_order": 10,
        "entries": [
            {"title": "C Major", "description": "No sharps or flats; reference key for Western theory.", "formula": "W-W-H-W-W-W-H", "notes": ["C", "D", "E", "F", "G", "A", "B"], "intervals": ["Tonic", "M2", "M3", "P4", "P5", "M6", "M7"]},
            {"title": "C# Major", "description": "Seven sharps; spelling includes E♯ and B♯.", "formula": "W-W-H-W-W-W-H", "notes": ["C#", "D#", "F", "F#", "G#", "A#", "C"], "intervals": ["Tonic", "M2", "M3", "P4", "P5", "M6", "M7"]},
            {"title": "Db Major", "description": "Enharmonic equivalent to C# Major. Spelled with five flats.", "formula": "W-W-H-W-W-W-H", "notes": ["Db", "Eb", "F", "Gb", "Ab", "Bb", "C"], "intervals": ["Tonic", "M2", "M3", "P4", "P5", "M6", "M7"]},
            {"title": "D Major", "description": "Two sharps (F♯, C♯); bright and resonant scale.", "formula": "W-W-H-W-W-W-H", "notes": ["D", "E", "F#", "G", "A", "B", "C#"], "intervals": ["Tonic", "M2", "M3", "P4", "P5", "M6", "M7"]},
            {"title": "D# Major", "description": "Nine sharps; often represented as E♭ major.", "formula": "W-W-H-W-W-W-H", "notes": ["D#", "F", "G", "G#", "A#", "C", "D"], "intervals": ["Tonic", "M2", "M3", "P4", "P5", "M6", "M7"]},
            {"title": "Eb Major", "description": "Enharmonic equivalent to D# Major. Spelled with three flats.", "formula": "W-W-H-W-W-W-H", "notes": ["Eb", "F", "G", "Ab", "Bb", "C", "D"], "intervals": ["Tonic", "M2", "M3", "P4", "P5", "M6", "M7"]},
            {"title": "E Major", "description": "Four sharps (F♯, C♯, G♯, D♯); bright, resonant key.", "formula": "W-W-H-W-W-W-H", "notes": ["E", "F#", "G#", "A", "B", "C#", "D#"], "intervals": ["Tonic", "M2", "M3", "P4", "P5", "M6", "M7"]},
            {"title": "F Major", "description": "One flat (B♭); warm, rich tone.", "formula": "W-W-H-W-W-W-H", "notes": ["F", "G", "A", "A#", "C", "D", "E"], "intervals": ["Tonic", "M2", "M3", "P4", "P5", "M6", "M7"]},
            {"title": "F# Major", "description": "Six sharps (F♯, C♯, G♯, D♯, A♯, E♯); popular keyboard key.", "formula": "W-W-H-W-W-W-H", "notes": ["F#", "G#", "A#", "B", "C#", "D#", "F"], "intervals": ["Tonic", "M2", "M3", "P4", "P5", "M6", "M7"]},
            {"title": "Gb Major", "description": "Enharmonic equivalent to F# Major. Spelled with six flats.", "formula": "W-W-H-W-W-W-H", "notes": ["Gb", "Ab", "Bb", "Cb", "Db", "Eb", "F"], "intervals": ["Tonic", "M2", "M3", "P4", "P5", "M6", "M7"]},
            {"title": "G Major", "description": "One sharp (F♯); common for guitar and violin.", "formula": "W-W-H-W-W-W-H", "notes": ["G", "A", "B", "C", "D", "E", "F#"], "intervals": ["Tonic", "M2", "M3", "P4", "P5", "M6", "M7"]},
            {"title": "G# Major", "description": "Eight sharps; often represented as A♭ major.", "formula": "W-W-H-W-W-W-H", "notes": ["G#", "A#", "C", "C#", "D#", "F", "G"], "intervals": ["Tonic", "M2", "M3", "P4", "P5", "M6", "M7"]},
            {"title": "Ab Major", "description": "Enharmonic equivalent to G# Major. Spelled with four flats.", "formula": "W-W-H-W-W-W-H", "notes": ["Ab", "Bb", "C", "Db", "Eb", "F", "G"], "intervals": ["Tonic", "M2", "M3", "P4", "P5", "M6", "M7"]},
            {"title": "A Major", "description": "Three sharps (F♯, C♯, G♯); cheerful and warm key.", "formula": "W-W-H-W-W-W-H", "notes": ["A", "B", "C#", "D", "E", "F#", "G#"], "intervals": ["Tonic", "M2", "M3", "P4", "P5", "M6", "M7"]},
            {"title": "A# Major", "description": "Ten sharps; often represented as B♭ major.", "formula": "W-W-H-W-W-W-H", "notes": ["A#", "C", "D", "D#", "F", "G", "A"], "intervals": ["Tonic", "M2", "M3", "P4", "P5", "M6", "M7"]},
            {"title": "Bb Major", "description": "Enharmonic equivalent to A# Major. Spelled with two flats.", "formula": "W-W-H-W-W-W-H", "notes": ["Bb", "C", "D", "Eb", "F", "G", "A"], "intervals": ["Tonic", "M2", "M3", "P4", "P5", "M6", "M7"]},
            {"title": "B Major", "description": "Five sharps (F♯, C♯, G♯, D♯, A♯); resonant key for strings and piano.", "formula": "W-W-H-W-W-W-H", "notes": ["B", "C#", "D#", "E", "F#", "G#", "A#"], "intervals": ["Tonic", "M2", "M3", "P4", "P5", "M6", "M7"]}
        ]
    },
    {
        "slug": "natural_minor_scales",
        "title": "Natural Minor Scales",
        "description": "Also known as the Aeolian mode, constructed using the W-H-W-W-H-W-W pattern.",
        "sort_order": 20,
        "entries": [
            {"title": "C Natural Minor", "description": "Relative minor of Eb major; contains three flats (B♭, E♭, A♭).", "formula": "W-H-W-W-H-W-W", "notes": ["C", "D", "D#", "F", "G", "G#", "A#"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "m6", "m7"]},
            {"title": "C# Natural Minor", "description": "Relative minor of E major; contains four sharps (F♯, C♯, G♯, D♯).", "formula": "W-H-W-W-H-W-W", "notes": ["C#", "D#", "E", "F#", "G#", "A", "B"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "m6", "m7"]},
            {"title": "Db Natural Minor", "description": "Enharmonic equivalent to C# Natural Minor. Spelled with flats.", "formula": "W-H-W-W-H-W-W", "notes": ["Db", "Eb", "E", "Gb", "Ab", "A", "B"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "m6", "m7"]},
            {"title": "D Natural Minor", "description": "Relative minor of F major; contains one flat (B♭).", "formula": "W-H-W-W-H-W-W", "notes": ["D", "E", "F", "G", "A", "A#", "C"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "m6", "m7"]},
            {"title": "D# Natural Minor", "description": "Relative minor of F# major; contains six sharps (F♯, C♯, G♯, D♯, A♯, E♯).", "formula": "W-H-W-W-H-W-W", "notes": ["D#", "F", "F#", "G#", "A#", "B", "C#"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "m6", "m7"]},
            {"title": "Eb Natural Minor", "description": "Enharmonic equivalent to D# Natural Minor. Spelled with flats.", "formula": "W-H-W-W-H-W-W", "notes": ["Eb", "F", "Gb", "Ab", "Bb", "B", "Db"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "m6", "m7"]},
            {"title": "E Natural Minor", "description": "Relative minor of G major; contains one sharp (F♯).", "formula": "W-H-W-W-H-W-W", "notes": ["E", "F#", "G", "A", "B", "C", "D"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "m6", "m7"]},
            {"title": "F Natural Minor", "description": "Relative minor of Ab major; contains four flats (B♭, E♭, A♭, D♭).", "formula": "W-H-W-W-H-W-W", "notes": ["F", "G", "G#", "A#", "C", "C#", "D#"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "m6", "m7"]},
            {"title": "F# Natural Minor", "description": "Relative minor of A major; contains three sharps (F♯, C♯, G♯).", "formula": "W-H-W-W-H-W-W", "notes": ["F#", "G#", "A", "B", "C#", "D", "E"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "m6", "m7"]},
            {"title": "Gb Natural Minor", "description": "Enharmonic equivalent to F# Natural Minor. Spelled with flats.", "formula": "W-H-W-W-H-W-W", "notes": ["Gb", "Ab", "A", "B", "Db", "D", "E"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "m6", "m7"]},
            {"title": "G Natural Minor", "description": "Relative minor of Bb major; contains two flats (B♭, E♭).", "formula": "W-H-W-W-H-W-W", "notes": ["G", "A", "A#", "C", "D", "D#", "F"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "m6", "m7"]},
            {"title": "G# Natural Minor", "description": "Relative minor of B major; contains five sharps (F♯, C♯, G♯, D♯, A♯).", "formula": "W-H-W-W-H-W-W", "notes": ["G#", "A#", "B", "C#", "D#", "E", "F#"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "m6", "m7"]},
            {"title": "Ab Natural Minor", "description": "Enharmonic equivalent to G# Natural Minor. Spelled with flats.", "formula": "W-H-W-W-H-W-W", "notes": ["Ab", "Bb", "B", "Db", "Eb", "E", "Gb"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "m6", "m7"]},
            {"title": "A Natural Minor", "description": "Relative minor of C major; contains no sharps or flats.", "formula": "W-H-W-W-H-W-W", "notes": ["A", "B", "C", "D", "E", "F", "G"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "m6", "m7"]},
            {"title": "A# Natural Minor", "description": "Relative minor of C# major; contains seven sharps.", "formula": "W-H-W-W-H-W-W", "notes": ["A#", "C", "C#", "D#", "F", "F#", "G#"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "m6", "m7"]},
            {"title": "Bb Natural Minor", "description": "Enharmonic equivalent to A# Natural Minor. Spelled with flats.", "formula": "W-H-W-W-H-W-W", "notes": ["Bb", "C", "Db", "Eb", "F", "Gb", "Ab"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "m6", "m7"]},
            {"title": "B Natural Minor", "description": "Relative minor of D major; contains two sharps (F♯, C♯).", "formula": "W-H-W-W-H-W-W", "notes": ["B", "C#", "D", "E", "F#", "G", "A"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "m6", "m7"]}
        ]
    },
    {
        "slug": "harmonic_minor_scales",
        "title": "Harmonic Minor Scales",
        "description": "A natural minor scale with a raised 7th degree, creating a leading tone and an exotic augmented second interval.",
        "sort_order": 30,
        "entries": [
            {"title": "C Harmonic Minor", "description": "Raised 7th degree (B) pulls back to C.", "formula": "W-H-W-W-H-A2-H", "notes": ["C", "D", "D#", "F", "G", "G#", "B"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "m6", "M7"]},
            {"title": "C# Harmonic Minor", "description": "Raised 7th degree (B♯) pulls back to C♯.", "formula": "W-H-W-W-H-A2-H", "notes": ["C#", "D#", "E", "F#", "G#", "A", "C"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "m6", "M7"]},
            {"title": "Db Harmonic Minor", "description": "Enharmonic equivalent to C# Harmonic Minor. Spelled with flats.", "formula": "W-H-W-W-H-A2-H", "notes": ["Db", "Eb", "E", "Gb", "Ab", "A", "C"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "m6", "M7"]},
            {"title": "D Harmonic Minor", "description": "Raised 7th degree (C♯) creates a strong pull back to D.", "formula": "W-H-W-W-H-A2-H", "notes": ["D", "E", "F", "G", "A", "A#", "C#"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "m6", "M7"]},
            {"title": "D# Harmonic Minor", "description": "Raised 7th degree (C𝄪) creates a strong pull back to D♯.", "formula": "W-H-W-W-H-A2-H", "notes": ["D#", "F", "F#", "G#", "A#", "B", "D"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "m6", "M7"]},
            {"title": "Eb Harmonic Minor", "description": "Enharmonic equivalent to D# Harmonic Minor. Spelled with flats.", "formula": "W-H-W-W-H-A2-H", "notes": ["Eb", "F", "Gb", "Ab", "Bb", "B", "D"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "m6", "M7"]},
            {"title": "E Harmonic Minor", "description": "Raised 7th degree (D♯) creates a strong pull back to E.", "formula": "W-H-W-W-H-A2-H", "notes": ["E", "F#", "G", "A", "B", "C", "D#"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "m6", "M7"]},
            {"title": "F Harmonic Minor", "description": "Raised 7th degree (E) creates a strong pull back to F.", "formula": "W-H-W-W-H-A2-H", "notes": ["F", "G", "G#", "A#", "C", "C#", "E"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "m6", "M7"]},
            {"title": "F# Harmonic Minor", "description": "Raised 7th degree (E♯) creates a strong pull back to F♯.", "formula": "W-H-W-W-H-A2-H", "notes": ["F#", "G#", "A", "B", "C#", "D", "F"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "m6", "M7"]},
            {"title": "Gb Harmonic Minor", "description": "Enharmonic equivalent to F# Harmonic Minor. Spelled with flats.", "formula": "W-H-W-W-H-A2-H", "notes": ["Gb", "Ab", "A", "B", "Db", "D", "F"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "m6", "M7"]},
            {"title": "G Harmonic Minor", "description": "Raised 7th degree (F♯) creates a strong pull back to G.", "formula": "W-H-W-W-H-A2-H", "notes": ["G", "A", "A#", "C", "D", "D#", "F#"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "m6", "M7"]},
            {"title": "G# Harmonic Minor", "description": "Raised 7th degree (F𝄪) creates a strong pull back to G♯.", "formula": "W-H-W-W-H-A2-H", "notes": ["G#", "A#", "B", "C#", "D#", "E", "G"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "m6", "M7"]},
            {"title": "Ab Harmonic Minor", "description": "Enharmonic equivalent to G# Harmonic Minor. Spelled with flats.", "formula": "W-H-W-W-H-A2-H", "notes": ["Ab", "Bb", "B", "Db", "Eb", "E", "G"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "m6", "M7"]},
            {"title": "A Harmonic Minor", "description": "G♯ leads strongly back to the tonic A; distinctive minor key sound.", "formula": "W-H-W-W-H-A2-H", "notes": ["A", "B", "C", "D", "E", "F", "G#"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "m6", "M7"]},
            {"title": "A# Harmonic Minor", "description": "Raised 7th degree (G𝄪) pulls back to A♯.", "formula": "W-H-W-W-H-A2-H", "notes": ["A#", "C", "C#", "D#", "F", "F#", "A"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "m6", "M7"]},
            {"title": "Bb Harmonic Minor", "description": "Enharmonic equivalent to A# Harmonic Minor. Spelled with flats.", "formula": "W-H-W-W-H-A2-H", "notes": ["Bb", "C", "Db", "Eb", "F", "Gb", "A"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "m6", "M7"]},
            {"title": "B Harmonic Minor", "description": "Raised 7th degree (A♯) pulls back to B.", "formula": "W-H-W-W-H-A2-H", "notes": ["B", "C#", "D", "E", "F#", "G", "A#"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "m6", "M7"]}
        ]
    },
    {
        "slug": "melodic_minor_scales",
        "title": "Melodic Minor Scales",
        "description": "Raises both the 6th and 7th degrees ascending, and reverts to natural minor descending to optimize smooth voice leading.",
        "sort_order": 40,
        "entries": [
            {"title": "C Melodic Minor", "description": "Raised 6th (A) and raised 7th (B) ascending, natural minor descending.", "formula": "W-H-W-W-W-W-H / W-H-W-W-H-W-W", "notes": ["C", "D", "D#", "F", "G", "A", "B", "C", "A#", "G#", "G", "F", "D#", "D", "C"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "M6", "M7"]},
            {"title": "C# Melodic Minor", "description": "Raised 6th (A♯) and raised 7th (B♯) ascending, natural minor descending.", "formula": "W-H-W-W-W-W-H / W-H-W-W-H-W-W", "notes": ["C#", "D#", "E", "F#", "G#", "A#", "C", "C#", "B", "A", "G#", "F#", "E", "D#", "C#"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "M6", "M7"]},
            {"title": "Db Melodic Minor", "description": "Enharmonic equivalent to C# Melodic Minor. Spelled with flats.", "formula": "W-H-W-W-W-W-H / W-H-W-W-H-W-W", "notes": ["Db", "Eb", "E", "Gb", "Ab", "Bb", "C", "Db", "B", "A", "Ab", "Gb", "E", "Eb", "Db"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "M6", "M7"]},
            {"title": "D Melodic Minor", "description": "Raised 6th (B) and raised 7th (C♯) ascending, natural minor descending.", "formula": "W-H-W-W-W-W-H / W-H-W-W-H-W-W", "notes": ["D", "E", "F", "G", "A", "B", "C#", "D", "C", "A#", "A", "G", "F", "E", "D"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "M6", "M7"]},
            {"title": "D# Melodic Minor", "description": "Raised 6th (B♯) and raised 7th (C𝄪) ascending, natural minor descending.", "formula": "W-H-W-W-W-W-H / W-H-W-W-H-W-W", "notes": ["D#", "F", "F#", "G#", "A#", "C", "D", "D#", "C#", "B", "A#", "G#", "F#", "F", "D#"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "M6", "M7"]},
            {"title": "Eb Melodic Minor", "description": "Enharmonic equivalent to D# Melodic Minor. Spelled with flats.", "formula": "W-H-W-W-W-W-H / W-H-W-W-H-W-W", "notes": ["Eb", "F", "Gb", "Ab", "Bb", "C", "D", "Eb", "Db", "B", "Bb", "Ab", "Gb", "F", "Eb"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "M6", "M7"]},
            {"title": "E Melodic Minor", "description": "Raised 6th (C♯) and raised 7th (D♯) ascending, natural minor descending.", "formula": "W-H-W-W-W-W-H / W-H-W-W-H-W-W", "notes": ["E", "F#", "G", "A", "B", "C#", "D#", "E", "D", "C", "B", "A", "G", "F#", "E"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "M6", "M7"]},
            {"title": "F Melodic Minor", "description": "Raised 6th (D) and raised 7th (E) ascending, natural minor descending.", "formula": "W-H-W-W-W-W-H / W-H-W-W-H-W-W", "notes": ["F", "G", "G#", "A#", "C", "D", "E", "F", "D#", "C#", "C", "A#", "G#", "G", "F"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "M6", "M7"]},
            {"title": "F# Melodic Minor", "description": "Raised 6th (D♯) and raised 7th (E♯) ascending, natural minor descending.", "formula": "W-H-W-W-W-W-H / W-H-W-W-H-W-W", "notes": ["F#", "G#", "A", "B", "C#", "D#", "F", "F#", "E", "D", "C#", "B", "A", "G#", "F#"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "M6", "M7"]},
            {"title": "Gb Melodic Minor", "description": "Enharmonic equivalent to F# Melodic Minor. Spelled with flats.", "formula": "W-H-W-W-W-W-H / W-H-W-W-H-W-W", "notes": ["Gb", "Ab", "A", "B", "Db", "Eb", "F", "Gb", "E", "D", "Db", "B", "A", "Ab", "Gb"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "M6", "M7"]},
            {"title": "G Melodic Minor", "description": "Raised 6th (E) and raised 7th (F♯) ascending, natural minor descending.", "formula": "W-H-W-W-W-W-H / W-H-W-W-H-W-W", "notes": ["G", "A", "A#", "C", "D", "E", "F#", "G", "F", "D#", "D", "C", "A#", "A", "G"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "M6", "M7"]},
            {"title": "G# Melodic Minor", "description": "Raised 6th (E♯) and raised 7th (F𝄪) ascending, natural minor descending.", "formula": "W-H-W-W-W-W-H / W-H-W-W-H-W-W", "notes": ["G#", "A#", "B", "C#", "D#", "F", "G", "G#", "F#", "E", "D#", "C#", "B", "A#", "G#"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "M6", "M7"]},
            {"title": "Ab Melodic Minor", "description": "Enharmonic equivalent to G# Melodic Minor. Spelled with flats.", "formula": "W-H-W-W-W-W-H / W-H-W-W-H-W-W", "notes": ["Ab", "Bb", "B", "Db", "Eb", "F", "G", "Ab", "Gb", "E", "Eb", "Db", "B", "Bb", "Ab"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "M6", "M7"]},
            {"title": "A Melodic Minor", "description": "F♯ and G♯ are raised when ascending for smooth melodic flow, natural minor descending.", "formula": "W-H-W-W-W-W-H / W-H-W-W-H-W-W", "notes": ["A", "B", "C", "D", "E", "F#", "G#", "A", "G", "F", "E", "D", "C", "B", "A"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "M6", "M7"]},
            {"title": "A# Melodic Minor", "description": "F𝄪 and G𝄪 are raised when ascending, natural minor descending.", "formula": "W-H-W-W-W-W-H / W-H-W-W-H-W-W", "notes": ["A#", "C", "C#", "D#", "F", "G", "A", "A#", "G#", "F#", "F", "D#", "C#", "C", "A#"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "M6", "M7"]},
            {"title": "Bb Melodic Minor", "description": "Enharmonic equivalent to A# Melodic Minor. Spelled with flats.", "formula": "W-H-W-W-W-W-H / W-H-W-W-H-W-W", "notes": ["Bb", "C", "Db", "Eb", "F", "G", "A", "Bb", "Ab", "Gb", "F", "Eb", "Db", "C", "Bb"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "M6", "M7"]},
            {"title": "B Melodic Minor", "description": "G♯ and A♯ are raised when ascending, natural minor descending.", "formula": "W-H-W-W-W-W-H / W-H-W-W-H-W-W", "notes": ["B", "C#", "D", "E", "F#", "G#", "A#", "B", "A", "G", "F#", "E", "D", "C#", "B"], "intervals": ["Tonic", "M2", "m3", "P4", "P5", "M6", "M7"]}
        ]
    },
    {
        "slug": "chromatic_scales",
        "title": "Chromatic Scales",
        "description": "A scale consisting of all twelve semitones within an octave.",
        "sort_order": 50,
        "entries": [
            {
                "title": "Chromatic from C (Sharps)",
                "description": "Conventional ascending layout using sharps.",
                "formula": "12 Half Steps",
                "notes": ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B", "C"],
                "intervals": ["12 x m2"],
            }
        ]
    },
    {
        "slug": "major_pentatonic_scales",
        "title": "Major Pentatonic Scales",
        "description": "Five-note major scales that omit the 4th and 7th degrees.",
        "sort_order": 60,
        "entries": [
            {
                "title": "C Major Pentatonic",
                "description": "Omits the 4th and 7th scale degrees of C major (no F or B).",
                "formula": "1-2-3-5-6",
                "notes": ["C", "D", "E", "G", "A"],
                "intervals": ["Tonic", "M2", "M3", "P5", "M6"],
            }
        ]
    },
    {
        "slug": "minor_pentatonic_scales",
        "title": "Minor Pentatonic Scales",
        "description": "Five-note minor scales that omit the 2nd and 6th degrees.",
        "sort_order": 70,
        "entries": [
            {
                "title": "A Minor Pentatonic",
                "description": "Omits the 2nd and 6th scale degrees of A minor (no B or F).",
                "formula": "1-b3-4-5-b7",
                "notes": ["A", "C", "D", "E", "G"],
                "intervals": ["Tonic", "m3", "P4", "P5", "m7"],
            }
        ]
    },
    {
        "slug": "blues_scales",
        "title": "Blues Scales",
        "description": "A six-note scale containing the minor pentatonic notes plus a flat-fifth 'blue note'.",
        "sort_order": 80,
        "entries": [
            {
                "title": "C Blues Scale",
                "description": "Adds the blue note F♯/G♭ to the C minor pentatonic scale.",
                "formula": "1-b3-4-b5-5-b7",
                "notes": ["C", "Eb", "F", "Gb", "G", "Bb"],
                "intervals": ["Tonic", "m3", "P4", "d5", "P5", "m7"],
            }
        ]
    },
    {
        "slug": "whole_tone_scales",
        "title": "Whole Tone Scales",
        "description": "A scale built entirely of whole steps (two semitones), creating a dreamlike, suspended mood.",
        "sort_order": 90,
        "entries": [
            {
                "title": "C Whole Tone Scale",
                "description": "Features a distinct dreamlike floating quality.",
                "formula": "W-W-W-W-W-W",
                "notes": ["C", "D", "E", "F#", "G#", "A#"],
                "intervals": ["Tonic", "M2", "M3", "A4", "A5", "A6"],
            }
        ]
    },
    {
        "slug": "diminished_scales",
        "title": "Diminished Scales",
        "description": "An eight-note octatonic scale alternating whole and half steps.",
        "sort_order": 100,
        "entries": [
            {
                "title": "C Diminished Scale (Half-Whole)",
                "description": "Popular in jazz for playing over dominant chords.",
                "formula": "H-W-H-W-H-W-H-W",
                "notes": ["C", "Db", "Eb", "E", "F#", "G", "A", "Bb"],
                "intervals": ["Tonic", "m2", "m3", "M3", "A4", "P5", "M6", "m7"],
            }
        ]
    },
    {
        "slug": "bebop_scales",
        "title": "Bebop Scales",
        "description": "An eight-note scale derived from traditional modes with an added chromatic passing note.",
        "sort_order": 110,
        "entries": [
            {
                "title": "C Bebop Dominant Scale",
                "description": "Mixolydian scale with a major seventh added as a passing note.",
                "notes": ["C", "D", "E", "F", "G", "A", "Bb", "B"],
                "formula": "1-2-3-4-5-6-b7-7",
            }
        ]
    },
    # --- MODES GROUP ---
    {
        "slug": "ionian_mode",
        "title": "Ionian Mode",
        "description": "The first mode of the major scale, identical to the standard major scale.",
        "sort_order": 120,
        "entries": [
            {
                "title": "C Ionian",
                "notes": ["C", "D", "E", "F", "G", "A", "B"],
                "formula": "W-W-H-W-W-W-H",
            }
        ]
    },
    {
        "slug": "dorian_mode",
        "title": "Dorian Mode",
        "description": "The second mode of the major scale. A natural minor scale with a raised 6th degree.",
        "sort_order": 130,
        "entries": [
            {
                "title": "D Dorian",
                "description": "Warm, jazzy minor sound.",
                "notes": ["D", "E", "F", "G", "A", "B", "C"],
                "formula": "W-H-W-W-W-H-W",
            }
        ]
    },
    {
        "slug": "phrygian_mode",
        "title": "Phrygian Mode",
        "description": "The third mode. A natural minor scale with a lowered 2nd degree, carrying a dark, Spanish quality.",
        "sort_order": 140,
        "entries": [
            {
                "title": "E Phrygian",
                "notes": ["E", "F", "G", "A", "B", "C", "D"],
                "formula": "H-W-W-W-H-W-W",
            }
        ]
    },
    {
        "slug": "lydian_mode",
        "title": "Lydian Mode",
        "description": "The fourth mode. A major scale with a raised 4th degree, creating an ethereal, cinematic sound.",
        "sort_order": 150,
        "entries": [
            {
                "title": "F Lydian",
                "notes": ["F", "G", "A", "B", "C", "D", "E"],
                "formula": "W-W-W-H-W-W-H",
            }
        ]
    },
    {
        "slug": "mixolydian_mode",
        "title": "Mixolydian Mode",
        "description": "The fifth mode. A major scale with a lowered 7th degree, popular in blues, rock, and jazz.",
        "sort_order": 160,
        "entries": [
            {
                "title": "G Mixolydian",
                "notes": ["G", "A", "B", "C", "D", "E", "F"],
                "formula": "W-W-H-W-W-H-W",
            }
        ]
    },
    {
        "slug": "aeolian_mode",
        "title": "Aeolian Mode",
        "description": "The sixth mode, identical to the natural minor scale.",
        "sort_order": 170,
        "entries": [
            {
                "title": "A Aeolian",
                "notes": ["A", "B", "C", "D", "E", "F", "G"],
                "formula": "W-H-W-W-H-W-W",
            }
        ]
    },
    {
        "slug": "locrian_mode",
        "title": "Locrian Mode",
        "description": "The seventh mode. A minor scale with a lowered 2nd and 5th degree. Highly unstable, built on a diminished triad.",
        "sort_order": 180,
        "entries": [
            {
                "title": "B Locrian",
                "notes": ["B", "C", "D", "E", "F", "G", "A"],
                "formula": "H-W-W-H-W-W-W",
            }
        ]
    },
    # --- ARPEGGIOS GROUP ---
    {
        "slug": "major_arpeggios",
        "title": "Major Arpeggios",
        "description": "Notes of a major triad played sequentially rather than simultaneously.",
        "sort_order": 190,
        "entries": [
            {
                "title": "C Major Arpeggio",
                "formula": "1 - 3 - 5",
                "notes": ["C", "E", "G"],
                "intervals": ["Root", "M3", "P5"],
            }
        ]
    },
    {
        "slug": "minor_arpeggios",
        "title": "Minor Arpeggios",
        "description": "Notes of a minor triad played sequentially.",
        "sort_order": 200,
        "entries": [
            {
                "title": "A Minor Arpeggio",
                "formula": "1 - b3 - 5",
                "notes": ["A", "C", "E"],
                "intervals": ["Root", "m3", "P5"],
            }
        ]
    },
    {
        "slug": "diminished_arpeggios",
        "title": "Diminished Arpeggios",
        "description": "Sequential notes of a diminished triad (Root, minor third, diminished fifth).",
        "sort_order": 210,
        "entries": [
            {
                "title": "B Diminished Arpeggio",
                "formula": "1 - b3 - b5",
                "notes": ["B", "D", "F"],
                "intervals": ["Root", "m3", "d5"],
            }
        ]
    },
    {
        "slug": "augmented_arpeggios",
        "title": "Augmented Arpeggios",
        "description": "Sequential notes of an augmented triad.",
        "sort_order": 220,
        "entries": [
            {
                "title": "C Augmented Arpeggio",
                "formula": "1 - 3 - #5",
                "notes": ["C", "E", "G#"],
                "intervals": ["Root", "M3", "A5"],
            }
        ]
    },
    {
        "slug": "dominant_seventh_arpeggios",
        "title": "Dominant Seventh Arpeggios",
        "description": "Four-note arpeggio built of a major triad with a minor seventh.",
        "sort_order": 230,
        "entries": [
            {
                "title": "G Dominant 7th Arpeggio",
                "notes": ["G", "B", "D", "F"],
                "formula": "1 - 3 - 5 - b7",
            }
        ]
    },
    {
        "slug": "major_seventh_arpeggios",
        "title": "Major Seventh Arpeggios",
        "description": "Four-note arpeggio: major triad plus a major seventh.",
        "sort_order": 240,
        "entries": [
            {
                "title": "C Major 7th Arpeggio",
                "notes": ["C", "E", "G", "B"],
                "formula": "1 - 3 - 5 - 7",
            }
        ]
    },
    {
        "slug": "minor_seventh_arpeggios",
        "title": "Minor Seventh Arpeggios",
        "description": "Four-note arpeggio: minor triad plus a minor seventh.",
        "sort_order": 250,
        "entries": [
            {
                "title": "A Minor 7th Arpeggio",
                "notes": ["A", "C", "E", "G"],
                "formula": "1 - b3 - 5 - b7",
            }
        ]
    },
    # --- CHORDS GROUP ---
    {
        "slug": "major_chords",
        "title": "Major Chords",
        "description": "Bright, happy sounding triads containing a major third and a perfect fifth.",
        "sort_order": 260,
        "entries": [
            {
                "title": "C Major Triad",
                "formula": "Root + M3 + P5",
                "notes": ["C", "E", "G"],
            }
        ]
    },
    {
        "slug": "minor_chords",
        "title": "Minor Chords",
        "description": "Melancholic sounding triads containing a minor third and perfect fifth.",
        "sort_order": 270,
        "entries": [
            {
                "title": "A Minor Triad",
                "formula": "Root + m3 + P5",
                "notes": ["A", "C", "E"],
            }
        ]
    },
    {
        "slug": "diminished_chords",
        "title": "Diminished Chords",
        "description": "Tense triads containing a minor third and diminished fifth.",
        "sort_order": 280,
        "entries": [
            {
                "title": "B Diminished Triad",
                "formula": "Root + m3 + d5",
                "notes": ["B", "D", "F"],
            }
        ]
    },
    {
        "slug": "augmented_chords",
        "title": "Augmented Chords",
        "description": "Triads containing a major third and an augmented fifth.",
        "sort_order": 290,
        "entries": [
            {
                "title": "C Augmented Triad",
                "formula": "Root + M3 + A5",
                "notes": ["C", "E", "G#"],
            }
        ]
    },
    {
        "slug": "suspended_chords",
        "title": "Suspended Chords",
        "description": "Triads where the third is replaced by a second (sus2) or fourth (sus4), creating a unresolved tension.",
        "sort_order": 300,
        "entries": [
            {
                "title": "C Suspended 4th (Csus4)",
                "notes": ["C", "F", "G"],
                "formula": "1 + 4 + 5",
            }
        ]
    },
    {
        "slug": "dominant_seventh_chords",
        "title": "Dominant Seventh Chords",
        "description": "A major triad with a minor seventh added.",
        "sort_order": 310,
        "entries": [
            {
                "title": "G Dominant 7th",
                "formula": "Root + M3 + P5 + m7",
                "notes": ["G", "B", "D", "F"],
            }
        ]
    },
    {
        "slug": "major_seventh_chords",
        "title": "Major Seventh Chords",
        "description": "A major triad with a major seventh added, producing a lush jazz color.",
        "sort_order": 320,
        "entries": [
            {
                "title": "C Major 7th",
                "formula": "Root + M3 + P5 + M7",
                "notes": ["C", "E", "G", "B"],
            }
        ]
    },
    {
        "slug": "minor_seventh_chords",
        "title": "Minor Seventh Chords",
        "description": "A minor triad with a minor seventh added.",
        "sort_order": 330,
        "entries": [
            {
                "title": "A Minor 7th",
                "formula": "Root + m3 + P5 + m7",
                "notes": ["A", "C", "E", "G"],
            }
        ]
    },
    {
        "slug": "half_diminished_chords",
        "title": "Half-Diminished Chords",
        "description": "A diminished triad with a minor seventh added, also known as minor 7 flat 5.",
        "sort_order": 340,
        "entries": [
            {
                "title": "B Half-Diminished 7th (Bø7)",
                "notes": ["B", "D", "F", "A"],
                "formula": "1 + b3 + b5 + b7",
            }
        ]
    },
    {
        "slug": "fully_diminished_chords",
        "title": "Fully Diminished Chords",
        "description": "A diminished triad with a diminished seventh (six semitones) added.",
        "sort_order": 350,
        "entries": [
            {
                "title": "B Fully Diminished 7th (B°7)",
                "notes": ["B", "D", "F", "Ab"],
                "formula": "1 + b3 + b5 + bb7",
            }
        ]
    },
    {
        "slug": "sixth_chords",
        "title": "Sixth Chords",
        "description": "A triad with an added major sixth (6) scale degree.",
        "sort_order": 360,
        "entries": [
            {
                "title": "C Major 6th (C6)",
                "notes": ["C", "E", "G", "A"],
                "formula": "1 + 3 + 5 + 6",
            }
        ]
    },
    {
        "slug": "ninth_chords",
        "title": "Ninth Chords",
        "description": "A dominant 7th chord with an added major ninth (9).",
        "sort_order": 370,
        "entries": [
            {
                "title": "C Dominant 9th (C9)",
                "notes": ["C", "E", "G", "Bb", "D"],
                "formula": "1 + 3 + 5 + b7 + 9",
            }
        ]
    },
    {
        "slug": "eleventh_chords",
        "title": "Eleventh Chords",
        "description": "A chord incorporating the root, 3rd, 5th, 7th, 9th, and 11th scale degrees.",
        "sort_order": 380,
        "entries": [
            {
                "title": "C Dominant 11th (C11)",
                "notes": ["C", "G", "Bb", "D", "F"],
                "formula": "1 + (3) + 5 + b7 + 9 + 11",
            }
        ]
    },
    {
        "slug": "thirteenth_chords",
        "title": "Thirteenth Chords",
        "description": "Lush extension containing all scale degrees, typically played with omitted intervals (like 5th, 11th).",
        "sort_order": 390,
        "entries": [
            {
                "title": "C Dominant 13th (C13)",
                "notes": ["C", "E", "Bb", "D", "A"],
                "formula": "1 + 3 + b7 + 9 + 13",
            }
        ]
    },
    {
        "slug": "altered_chords",
        "title": "Altered Chords",
        "description": "A dominant chord where the 5th and/or 9th degrees are chromatically raised or lowered.",
        "sort_order": 400,
        "entries": [
            {
                "title": "C Altered Dominant (C7alt)",
                "notes": ["C", "E", "Gb", "Ab", "Bb"],
                "formula": "1 + 3 + b5 + #5 + b7",
            }
        ]
    },
    # --- INTERVALS GROUP ---
    {
        "slug": "interval_unison",
        "title": "Unison",
        "description": "Two notes of the exact same pitch played together.",
        "sort_order": 410,
        "entries": [
            {
                "title": "Perfect Unison (P1)",
                "description": "Zero semitones.",
                "formula": "0 Semitones",
                "notes": ["C to C"],
            }
        ]
    },
    {
        "slug": "interval_minor_second",
        "title": "Minor Second",
        "description": "The smallest interval in Western music; highly dissonant.",
        "sort_order": 420,
        "entries": [
            {
                "title": "Minor Second (m2)",
                "description": "One semitone.",
                "formula": "1 Semitone",
                "notes": ["C to Db"],
            }
        ]
    },
    {
        "slug": "interval_major_second",
        "title": "Major Second",
        "description": "Two semitones (a whole step).",
        "sort_order": 430,
        "entries": [
            {
                "title": "Major Second (M2)",
                "formula": "2 Semitones",
                "notes": ["C to D"],
            }
        ]
    },
    {
        "slug": "interval_minor_third",
        "title": "Minor Third",
        "description": "Distance of 3 semitones. Defines minor chords; sad sounding.",
        "sort_order": 440,
        "entries": [
            {
                "title": "Minor Third (m3)",
                "formula": "3 Semitones",
                "notes": ["C to Eb"],
            }
        ]
    },
    {
        "slug": "interval_major_third",
        "title": "Major Third",
        "description": "Distance of 4 semitones. Defines major chords; warm sounding.",
        "sort_order": 450,
        "entries": [
            {
                "title": "Major Third (M3)",
                "formula": "4 Semitones",
                "notes": ["C to E"],
            }
        ]
    },
    {
        "slug": "interval_perfect_fourth",
        "title": "Perfect Fourth",
        "description": "Distance of 5 semitones.",
        "sort_order": 460,
        "entries": [
            {
                "title": "Perfect Fourth (P4)",
                "formula": "5 Semitones",
                "notes": ["C to F"],
            }
        ]
    },
    {
        "slug": "interval_tritone",
        "title": "Tritone",
        "description": "Distance of 6 semitones, highly tense and dissonant.",
        "sort_order": 470,
        "entries": [
            {
                "title": "Tritone (d5/A4)",
                "formula": "6 Semitones",
                "notes": ["C to F#"],
            }
        ]
    },
    {
        "slug": "interval_perfect_fifth",
        "title": "Perfect Fifth",
        "description": "Distance of 7 semitones; very stable consonant hollow sound.",
        "sort_order": 480,
        "entries": [
            {
                "title": "Perfect Fifth (P5)",
                "formula": "7 Semitones",
                "notes": ["C to G"],
            }
        ]
    },
    {
        "slug": "interval_minor_sixth",
        "title": "Minor Sixth",
        "description": "Distance of 8 semitones.",
        "sort_order": 490,
        "entries": [
            {
                "title": "Minor Sixth (m6)",
                "formula": "8 Semitones",
                "notes": ["C to Ab"],
            }
        ]
    },
    {
        "slug": "interval_major_sixth",
        "title": "Major Sixth",
        "description": "Distance of 9 semitones.",
        "sort_order": 500,
        "entries": [
            {
                "title": "Major Sixth (M6)",
                "formula": "9 Semitones",
                "notes": ["C to A"],
            }
        ]
    },
    {
        "slug": "interval_minor_seventh",
        "title": "Minor Seventh",
        "description": "Distance of 10 semitones.",
        "sort_order": 510,
        "entries": [
            {
                "title": "Minor Seventh (m7)",
                "formula": "10 Semitones",
                "notes": ["C to Bb"],
            }
        ]
    },
    {
        "slug": "interval_major_seventh",
        "title": "Major Seventh",
        "description": "Distance of 11 semitones; tense pulling to octave.",
        "sort_order": 520,
        "entries": [
            {
                "title": "Major Seventh (M7)",
                "formula": "11 Semitones",
                "notes": ["C to B"],
            }
        ]
    },
    {
        "slug": "interval_octave",
        "title": "Octave",
        "description": "Distance of 12 semitones, where note frequency doubles.",
        "sort_order": 530,
        "entries": [
            {
                "title": "Perfect Octave (P8)",
                "formula": "12 Semitones",
                "notes": ["C to C (next octave)"],
            }
        ]
    },
    # --- MUSIC THEORY GROUP ---
    {
        "slug": "circle_of_fifths",
        "title": "Circle of Fifths",
        "description": "Geometric display showing relationship between keys and their sharps/flats.",
        "sort_order": 540,
        "entries": [
            {
                "title": "Circle of Fifths",
                "description": "Sharps clockwise: G (1#), D (2#), A (3#). Flats counter-clockwise: F (1b), Bb (2b), Eb (3b).",
                "formula": "Steps of Perfect 5ths",
            }
        ]
    },
    {
        "slug": "key_signatures",
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
    {
        "slug": "time_signatures",
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
    {
        "slug": "scale_degrees",
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
    {
        "slug": "chord_functions",
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
    {
        "slug": "harmonic_progressions",
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
    {
        "slug": "cadences",
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
    {
        "slug": "modes_theory",
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
    {
        "slug": "voice_leading",
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
    # --- NOTATION GROUP ---
    {
        "slug": "notation_clefs",
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
    {
        "slug": "notation_dynamics",
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
    {
        "slug": "notation_articulations",
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
    {
        "slug": "notation_tempo_markings",
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
    {
        "slug": "notation_repeats",
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
    {
        "slug": "notation_endings",
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
    {
        "slug": "notation_pedal_markings",
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
    {
        "slug": "notation_ornaments",
        "title": "Ornaments",
        "description": "Trills and mordents embellishing notes.",
        "sort_order": 700,
        "entries": [
            {
                "title": "Trills and Mordents",
                "description": "Trill: quick alternation with note above. Mordent: quick single dip down or up.",
            }
        ]
    },
    {
        "slug": "notation_slurs",
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
    {
        "slug": "notation_ties",
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
    {
        "slug": "notation_tuplets",
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
]


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


def seed_reference_data(db: Session) -> None:
    # Always delete existing data to start fresh and ensure consistent data schema
    db.query(ReferenceEntry).delete()
    db.query(ReferenceSection).delete()
    db.commit()

    for s in SEED_SECTIONS:
        entries_data = s["entries"]
        section = ReferenceSection(
            slug=s["slug"],
            title=s["title"],
            description=s.get("description"),
            sort_order=s["sort_order"],
        )
        db.add(section)
        db.flush()

        for i, ent in enumerate(entries_data):
            db.add(
                ReferenceEntry(
                    section_id=section.id,
                    title=ent["title"],
                    description=ent.get("description"),
                    formula=ent.get("formula"),
                    notes_json=ent.get("notes"),
                    intervals_json=ent.get("intervals"),
                    sort_order=i * 10,
                )
            )
    db.commit()


def run_startup_seed() -> None:
    init_db()
    db = SessionLocal()
    try:
        seed_reference_data(db)
    finally:
        db.close()

if __name__ == "__main__":
    run_startup_seed()
