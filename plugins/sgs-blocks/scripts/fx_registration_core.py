"""fx_registration_core.py - the parsing core of check-fx-registration.py: the tree under test (`Tree`), the
floor-count guard every parse uses (`VacuousParse`, `_floor`), the bracket-block finder and the comment strippers.

check-fx-registration.py imports these names; the rules, the evaluation and the --self-test stay there.
"""

from __future__ import annotations

import re
import sys
from dataclasses import dataclass
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "lib"))
from block_source_files import view_files  # noqa: E402

_PLUGIN_ROOT = Path(__file__).resolve().parent.parent


class VacuousParse(Exception):
    """Raised when a parse returns fewer items than its floor.

    NOT an invariant breach - it means the gate lost sight of its own input and can no
    longer make any claim at all. It fails the gate loudly and separately, so a reshaped
    source file can never be mistaken for "everything is registered".
    """


def _floor(items, floor: int, path: Path, construct: str) -> None:
    """Assert a parse found at least `floor` entries, or hard-fail naming the file."""
    if len(items) < floor:
        raise VacuousParse(
            f"{path}: parsing `{construct}` found {len(items)} entr(y/ies), expected at "
            f"least {floor}. The construct has almost certainly been renamed or "
            "reshaped, which would silently turn every comparison it feeds into "
            "empty-vs-empty. Fix the parser in check-fx-registration.py (and re-run "
            "--self-test), or restore the construct - do NOT lower the floor to make "
            "this pass."
        )


def _block_after(text: str, header_re: str, open_ch: str, close_ch: str, path: Path,
                 construct: str) -> str:
    """Return the balanced `open_ch`...`close_ch` body following the first match of
    `header_re`. Balanced rather than a lazy regex so nested arrays inside a body (every
    MODULES row contains its own `array( ... )` of deps) cannot truncate the match."""
    match = re.search(header_re, text)
    if match is None:
        raise VacuousParse(
            f"{path}: could not locate `{construct}` (pattern {header_re!r}). It has "
            "been renamed, moved or reshaped - every comparison fed by it would "
            "silently become empty-vs-empty. Fix the parser in check-fx-registration.py."
        )
    start = text.find(open_ch, match.end() - 1)
    if start == -1:
        raise VacuousParse(f"{path}: found `{construct}` but no opening {open_ch!r} after it.")
    depth = 0
    for index in range(start, len(text)):
        if text[index] == open_ch:
            depth += 1
        elif text[index] == close_ch:
            depth -= 1
            if depth == 0:
                return text[start + 1:index]
    raise VacuousParse(f"{path}: `{construct}` opening {open_ch!r} is never closed.")


def _strip_php_comments(text: str) -> str:
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
    text = re.sub(r"//[^\n]*", "", text)
    return re.sub(r"(?m)^\s*#[^\n]*", "", text)


def _strip_js_comments(text: str) -> str:
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
    return re.sub(r"//[^\n]*", "", text)


# ---------------------------------------------------------------------------
# The tree under test.
#
# The three TEXTS are carried as strings, not read on demand, so --self-test can perturb
# in-memory copies without ever writing to the real tree. The DISK facts (which modules
# exist, which stylesheets exist) stay real in every mode - a self-test that faked those
# too would be testing its own fixtures rather than the gate.
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Tree:
    root: Path
    registry_php: str
    webpack_js: str
    # R5's self-test override: {view.js Path -> perturbed text}, read INSTEAD of disk
    # when a path is a key here. None everywhere else, so real runs never consult it.
    view_js_overrides: "dict[Path, str] | None" = None
    # R3's self-test override: extra `assets/css/<name>` files treated as present on
    # disk, so a planted orphan stylesheet can be proven red without writing to the tree.
    css_planted: "tuple[str, ...]" = ()

    @property
    def registry_path(self) -> Path:
        return self.root / "includes" / "class-sgs-motion-registry.php"

    @property
    def webpack_path(self) -> Path:
        return self.root / "webpack.config.js"

    @property
    def view_js_paths(self) -> list[Path]:
        """Every block `view.js` on disk plus the own-block files it imports
        (view_files) - R5/R6's corpus. Not cached as text like the
        other two files because R5 needs to name the OFFENDING FILE per violation, not
        just fail one shared blob; a self-test perturbing "the" view.js text would have
        no single file to perturb."""
        blocks_dir = self.root / "src" / "blocks"
        if not blocks_dir.is_dir():
            return []
        found: list[Path] = []
        for block_dir in sorted(p for p in blocks_dir.iterdir() if p.is_dir()):
            found.extend(view_files(block_dir))
        return found

    def read_view_js(self, path: Path) -> str:
        if self.view_js_overrides and path in self.view_js_overrides:
            return self.view_js_overrides[path]
        return path.read_text(encoding="utf-8")

    @staticmethod
    def load(root: Path = _PLUGIN_ROOT) -> "Tree":
        blank = Tree(root=root, registry_php="", webpack_js="")
        for path in (blank.registry_path, blank.webpack_path):
            if not path.exists():
                raise VacuousParse(
                    f"{path} does not exist - this gate reads it as an input and cannot "
                    "verify anything without it."
                )
        return Tree(
            root=root,
            registry_php=blank.registry_path.read_text(encoding="utf-8"),
            webpack_js=blank.webpack_path.read_text(encoding="utf-8"),
        )
