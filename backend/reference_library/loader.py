from sqlalchemy.orm import Session
from models import ReferenceSection
from reference_data.registry import REFERENCE_REGISTRY
from .builder import build_dynamic_section
from .models import LibraryEntry, LibrarySection

_reference_library: list[LibrarySection] | None = None

def initialize_cache(db: Session) -> None:
    """
    Builds the complete reference library once during application startup.
    Loads category headers (ReferenceSection) and static reference entries (ReferenceEntry)
    from the database, and combines them with dynamically generated entries from the builder.
    """
    global _reference_library
    
    print("Initializing in-memory reference library cache...")
    
    # Load all category sections from the database ordered by sort_order
    db_sections = db.query(ReferenceSection).order_by(ReferenceSection.sort_order).all()
    
    library_sections = []
    
    for db_sec in db_sections:
        slug = db_sec.slug
        
        # Check if this category is dynamic
        if slug in REFERENCE_REGISTRY["dynamic"]:
            config = REFERENCE_REGISTRY["dynamic"][slug]
            # Use builder to expand category to all root keys
            section = build_dynamic_section(slug, config)
            # Update title and description from the database if present
            if db_sec.title:
                section.title = db_sec.title
            if db_sec.description:
                section.description = db_sec.description
        else:
            # Static category: load entries from the database
            section = LibrarySection(
                slug=slug,
                title=db_sec.title,
                description=db_sec.description
            )
            for db_ent in db_sec.entries:
                entry = LibraryEntry(
                    slug=f"static_{db_ent.id}",
                    title=db_ent.title,
                    description=db_ent.description,
                    formula=None,
                    notes=[],
                    intervals=[]
                )
                section.entries.append(entry)
                
        library_sections.append(section)
        
    _reference_library = library_sections
    print(f"Reference library cache initialized successfully with {len(_reference_library)} sections.")

def get_reference_library() -> dict:
    """
    Returns the cached reference library JSON.
    Converts internal LibrarySection/LibraryEntry models to the exact JSON schema
    expected by the frontend, assigning sequential integer IDs.
    """
    global _reference_library
    if _reference_library is None:
        raise RuntimeError("Reference library cache is not initialized yet.")
        
    sections_json = []
    entry_id = 1
    
    for sec in _reference_library:
        entries_json = []
        for ent in sec.entries:
            entries_json.append({
                "id": entry_id,
                "title": ent.title,
                "description": ent.description,
                "formula": ent.formula,
                "notes": ent.notes,
                "intervals": ent.intervals,
                "rightHandFingering": ent.fingering.get("right") if ent.fingering else None,
                "leftHandFingering": ent.fingering.get("left") if ent.fingering else None
            })
            entry_id += 1
            
        sections_json.append({
            "slug": sec.slug,
            "title": sec.title,
            "description": sec.description,
            "entries": entries_json
        })
        
    return {"sections": sections_json}
