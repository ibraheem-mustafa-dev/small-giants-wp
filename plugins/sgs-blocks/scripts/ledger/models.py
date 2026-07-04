"""
ledger.models — data model for F2 CSS Accounting Ledger (input half).

Spec ref: .claude/plans/2026-06-18-f2-css-accounting-ledger-design.md §3
"""
from __future__ import annotations

import enum
from dataclasses import dataclass, field


class LedgerParseError(Exception):
    """Raised (fail-closed) on any unrecoverable parse condition.

    Triggered by:
    - tinycss2 parse/tokenise error
    - non-font @import URL (offline parser cannot follow it)
    - any unclassifiable at-rule that is not @keyframes/@font-face/@layer
    """


class MediaKind(str, enum.Enum):
    """Classifies the enclosing at-rule type."""
    none = "none"
    media = "media"
    supports = "supports"


class DeclKind(str, enum.Enum):
    """Classifies the declaration's origin / structural role."""
    box_css = "box-css"
    custom_prop = "custom-prop"
    inline_style = "inline-style"
    at_keyframes = "at-keyframes"
    at_fontface = "at-fontface"
    at_import = "at-import"
    at_other = "at-other"
    content_text = "content-text"
    """A content routing unit: one HTML element's direct (non-descendant) text.
    Spec ref: Spec 31 §12.2.1 CONTENT-stream extension (Step 11/A2)."""
    content_media = "content-media"
    """A content routing unit: one <img>/<video>/<audio>/<iframe> element.
    Spec ref: Spec 31 §12.2.1 CONTENT-stream extension (Step 11/A2)."""


@dataclass(frozen=True)
class InputDecl:
    """One row in the F2 input ledger.

    Row identity (dedup/count key): (fixture, selector, property, value, media, source_index).
    source_index is monotonic so true per-rule duplicates collapse at parse time;
    cross-rule duplicates keep distinct rows (surjective guarantee).

    Field order matches the design doc table — preserved in JSON serialisation.
    """
    fixture: str
    """Source fixture stem (no extension)."""

    selector: str
    """Full selector verbatim, including pseudo-elements.
    For inline styles: '[inline:<element-path>]'."""

    property: str
    """Declaration property, lower-cased (includes custom props --x)."""

    value: str
    """Declaration value verbatim (URLs/functions/var()/tokens raw).
    !important extracted into the `important` field, not included here."""

    important: bool
    """True if the declaration carried !important."""

    media: str | None
    """Enclosing @media condition verbatim; None = base (no enclosing @media)."""

    media_kind: MediaKind
    """none | media | supports — so tier derivation reads only media conditions."""

    tier: str
    """Accounting-only device-tier label.
    Values: Base | Mobile | Tablet | Desktop | Other:<verbatim-condition>
    NOT the converter's routing tier."""

    source_index: int
    """Monotonic declaration counter (parse order). Cascade source-order."""

    shadowed: bool
    """True if a later source_index re-declares the same (selector, property, media)
    (this row is the cascade loser)."""

    kind: DeclKind
    """box-css | custom-prop | inline-style | at-keyframes | at-fontface | at-import | at-other"""

    excluded_candidate: bool
    """True ONLY for structural at-rules (at-keyframes/at-fontface/at-import/at-other).
    NEVER set for box-css/custom-prop — F4 owns property-level exclusion.
    Advisory hint only; F5 MUST join the F4 excluded_properties table, never this bool."""

    def as_dict(self) -> dict:
        """Serialise to a JSON-compatible dict preserving field order."""
        return {
            "fixture": self.fixture,
            "selector": self.selector,
            "property": self.property,
            "value": self.value,
            "important": self.important,
            "media": self.media,
            "media_kind": self.media_kind.value,
            "tier": self.tier,
            "source_index": self.source_index,
            "shadowed": self.shadowed,
            "kind": self.kind.value,
            "excluded_candidate": self.excluded_candidate,
        }
