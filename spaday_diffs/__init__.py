import json
from pathlib import Path

from spaday import ComponentPackage, Token

from .components import SpadayDiff

__version__ = "0.1.0"

_VERSIONS = Path(__file__).parent / "extension" / "versions.json"

package = ComponentPackage(
    name="diffs",
    assets_dir=Path(__file__).parent / "extension",
    assets=(("css", "css/index.css"), ("js", "cdn/index.js")),
    components=(SpadayDiff,),
    provides=json.loads(_VERSIONS.read_text(encoding="utf-8")) if _VERSIONS.exists() else {},
)

Diff = SpadayDiff

TOKENS = {
    "spa_diffs_surface": Token("--spa-diffs-surface", "viewer background", fallback="--spa-surface"),
    "spa_diffs_text": Token("--spa-diffs-text", "default text and filenames", fallback="--spa-text"),
    "spa_diffs_muted": Token("--spa-diffs-muted", "line numbers", fallback="--spa-muted"),
    "spa_diffs_added": Token("--spa-diffs-added", "added lines", fallback="--spa-success"),
    "spa_diffs_deleted": Token("--spa-diffs-deleted", "deleted lines", fallback="--spa-danger"),
    "spa_diffs_accent": Token("--spa-diffs-accent", "selection and modified files", fallback="--spa-accent"),
    "spa_diffs_font_size": Token("--spa-diffs-font-size", "code font size"),
    "spa_diffs_line_height": Token("--spa-diffs-line-height", "code line height"),
}

__all__ = ["TOKENS", "Diff", "SpadayDiff", "package"]
