from dataclasses import dataclass, field

@dataclass
class LibraryEntry:
    slug: str
    title: str
    description: str | None = None
    formula: str | None = None
    notes: list[str] = field(default_factory=list)
    intervals: list[str] = field(default_factory=list)
    fingering: dict | None = None

@dataclass
class LibrarySection:
    slug: str
    title: str
    description: str | None = None
    entries: list[LibraryEntry] = field(default_factory=list)
