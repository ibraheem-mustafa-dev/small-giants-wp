"""Population: does an attribute paint, and through which category?

Decided from the source and the DB, never from the calibration cache:

  css   `css_property` set in the DB; a role in PAINT_ROLES; a CSS-bearing name
        suffix (the DB `property_suffixes` rows with a property, plus EXTRA_SUFFIXES)
        after stripping state/device modifiers; or a front-end channel the CSS
        actually consumes (a modifier class with a matching rule, a custom property
        with a reader, a declaration from an `includes/` hook emitter)
  js    an `anim:`/`fx:` pseudo-property, or a data attribute a front-end script or
        attribute selector reads
  not   unit companions (checked through their base attribute), content roles,
        and everything with no paint signal (the reason is the role)

`classification` on the DB `roles` table cannot make this call (it files colour
and layout roles beside behaviour ones), so PAINT_ROLES and CONTENT_ROLES are
explicit.
"""
from __future__ import annotations

import re

PAINT_ROLES = frozenset({
    "typography", "color", "colour-gradient", "layout", "styling", "visual", "number-css-px", "position",
})
CONTENT_ROLES = frozenset({
    "text-content", "content", "image-object", "svg", "link-href", "identity", "image-alt", "a11y-text",
    "rating", "numeric-content", "link-content", "icon", "icon-wp-icon", "icon-emoji", "icon-lucide",
    "icon-dashicon", "icon-slug", "url-href", "presence-boolean", "tag-identity", "scalar-media",
    "technical", "enum-class-probe",
})
EXTRA_SUFFIXES = (
    ("TextIndent", "text-indent"), ("Saturate", "filter"), ("Blur", "filter"),
    ("WritingMode", "writing-mode"), ("TextWrap", "text-wrap"),
)
MODIFIERS = ("Mobile", "Tablet", "Desktop", "Hover", "Unit", "Custom")
STATE_RE = re.compile(r"(Hover|Focus|Active|Scrolled|Open|Pressed|Visited)(Gradient|Colour|Color)?$|Hover[A-Z]|Focus[A-Z]|Scrolled[A-Z]")
MOTION_RE = re.compile(r"(Duration|Easing|EasingCustom|Delay|Stagger|Speed|Animation|Parallax|KenBurns|Reveal\w*)$|^sgsAnimation|^anim|^fx[A-Z]")


def strip_modifiers(name: str) -> str:
    changed = True
    while changed:
        changed = False
        for m in MODIFIERS:
            if name.endswith(m) and len(name) > len(m):
                name = name[: -len(m)]
                changed = True
    return name


class PaintClassifier:
    def __init__(self, suffixes: list[tuple[str, str]]) -> None:
        table = list(suffixes) + list(EXTRA_SUFFIXES)
        self.suffixes = sorted(table, key=lambda x: -len(x[0]))

    def suffix_hit(self, attr: str) -> str | None:
        base = strip_modifiers(attr)
        cap = base[:1].upper() + base[1:]
        for s, _css in self.suffixes:
            if cap.endswith(s):
                return s
        return None

    def classify(self, row: dict, signals: dict) -> tuple[str, str]:
        """(category, basis): category is 'css', 'js' or 'not'."""
        attr = row["attr_name"]
        role = row.get("role") or ""
        cssp = row.get("css_property") or ""
        if attr.endswith("Unit") and len(attr) > 4:
            return "not", "unit-companion"
        if cssp:
            if cssp.startswith(("anim:", "fx:")):
                return "js", "db-pseudo-property"
            return "css", "db-css-property"
        if role in PAINT_ROLES:
            return "css", "role:" + role
        hit = self.suffix_hit(attr)
        if hit:
            return "css", "suffix:" + hit
        if role in CONTENT_ROLES:
            return "not", "content-role:" + role
        if signals.get("class_rule"):
            return "css", "class-modifier-rule"
        if signals.get("cp_reader"):
            return "css", "cp-with-reader"
        if signals.get("decl_channel"):
            return "css", "decl-channel"
        if signals.get("data_consumed"):
            return "js", "data-attribute"
        return "not", "role:" + (role or "none")


def is_state(attr: str, css_state: str | None) -> bool:
    return bool(css_state) or bool(STATE_RE.search(attr))


def is_motion(attr: str, css_property: str | None) -> bool:
    cssp = css_property or ""
    return cssp.startswith(("anim:", "transition", "animation")) or bool(MOTION_RE.search(attr))
