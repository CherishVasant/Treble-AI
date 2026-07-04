# Reference Data Package

This package houses the static database seeding data for the Treble AI Reference Library. It separates the raw music glossary data from the active database connection/transaction code in `seed.py`.

## Directory Structure

```text
reference_data/
│
├── __init__.py      # Package registration
├── registry.py      # Combines all topic datasets into SEED_SECTIONS
│
├── scales.py        # Scales, keys, modes, and pentatonics data
├── chords.py        # Triads, seventh chords, extensions, and arpeggios data
├── intervals.py     # Diatonic interval distances (unison to octave) data
├── theory.py        # Theory structures (circle of fifths, scale degrees, progressions)
├── notation.py      # Notation markings (clefs, repeats, articulations, tuplets)
│
└── README.md        # This documentation
```

---

## How it Works

1. **Topic Files**: Each `.py` file exports a specific `list[dict]` containing structured sections (e.g. `SCALES_SECTIONS`, `INTERVALS_SECTIONS`).
2. **Registry Aggregation**: The `registry.py` imports these lists and concatenates them into a single, unified sequence called `SEED_SECTIONS`.
3. **Database Seeder**: During application boot, `backend/seed.py` imports `SEED_SECTIONS` from the registry and loops over the collection to perform database insertion if the database is empty.

---

## How to Add New Reference Data

### 1. Adding an Entry to an Existing Section
To add a new musical item to a category that already exists:
1. Locate the correct topic module (e.g., `scales.py` or `chords.py`).
2. Find the relevant section inside the file (e.g., `"slug": "major_chords"`).
3. Append a new dictionary to the `"entries"` list. For example:
   ```python
   {"title": "D Major Triad", "formula": "Root + M3 + P5", "notes": ["D", "F#", "A"]}
   ```

### 2. Adding a Completely New Section/Category
To add a new category (e.g., a "Dynamics" glossary or "Tuning systems"):
1. Locate the appropriate topic module, or create a new file (e.g., `tuning.py`) and export a list of sections:
   ```python
   TUNING_SECTIONS = [
       {
           "slug": "just_intonation",
           "title": "Just Intonation",
           "description": "Tuning based on whole-number frequency ratios.",
           "sort_order": 900,
           "entries": [...]
       }
   ]
   ```
2. If you created a new module, open [registry.py](file:///c:/Users/CHERISH/DEV/PersonalProjects/Treble-AI/backend/reference_data/registry.py) and:
   * Import your new variable: `from reference_data.tuning import TUNING_SECTIONS`
   * Add it to the list concatenation list in `SEED_SECTIONS`.

### 3. Loading the Changes into PostgreSQL
Because the database seeder is idempotent (it skips execution if any data is already loaded in `reference_sections`), your local database must be cleared to force a re-seed of the updated files:
1. Open your database client or SQLTools session, and run:
   ```sql
   TRUNCATE TABLE reference_entries, reference_sections RESTART IDENTITY CASCADE;
   ```
2. Restart the FastAPI backend server. It will detect the empty database and automatically load the new data.
