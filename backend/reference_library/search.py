from reference_library import loader

def search_library(query: str) -> list[dict]:
    """
    Searches the cached reference library in-memory for entries matching the query.
    Matches against the entry title, description, or the parent section's title.
    Returns a list of matching entries with their parent section titles.
    """
    if loader._reference_library is None:
        return []
        
    query_lower = query.lower()
    results = []
    
    for sec in loader._reference_library:
        for ent in sec.entries:
            # Match query against title, description, or section title
            if (
                query_lower in ent.title.lower()
                or (ent.description and query_lower in ent.description.lower())
                or query_lower in sec.title.lower()
            ):
                results.append({
                    "section_title": sec.title,
                    "categorySlug": sec.slug,
                    "title": ent.title,
                    "description": ent.description,
                    "formula": ent.formula,
                    "notes": ent.notes,
                    "intervals": ent.intervals,
                    "rightHandFingering": ent.fingering.get("right") if ent.fingering else None,
                    "leftHandFingering": ent.fingering.get("left") if ent.fingering else None
                })
                
    return results
