from .keys import SUPPORTED_KEYS
from .spellings import CHROMATIC_SPELLINGS
from .formulas import FORMULAS
from .fingerings import FINGERINGS
from .audio import AUDIO_MAP
from .descriptions import DESCRIPTIONS, KEY_DESCRIPTIONS
from .dynamic import DYNAMIC_CATEGORIES
from .static import STATIC_CATEGORIES

REFERENCE_REGISTRY = {
    "keys": SUPPORTED_KEYS,
    "spellings": CHROMATIC_SPELLINGS,
    "formulas": FORMULAS,
    "fingerings": FINGERINGS,
    "audio": AUDIO_MAP,
    "descriptions": DESCRIPTIONS,
    "key_descriptions": KEY_DESCRIPTIONS,
    "dynamic": DYNAMIC_CATEGORIES,
    "static": STATIC_CATEGORIES,
}
