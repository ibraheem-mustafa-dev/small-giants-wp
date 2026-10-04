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
        show/hide toggles (SWITCH_ROLES) with no class rule, custom property or
        paint declaration of their own (unless a hover/state/motion effect or a
        visual-effect runtime), and
        everything with no paint signal (the reason is the role)

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
# Show/hide toggles. `enum-mode` is left out on measurement: a mode's gated declarations
# are what it selects (hero splitMediaMediaSizing, nav-bar-menu submenuAlign,
# responsive-logo colourTreatment paint that way), and Rater B's labels gain nothing from it.
SWITCH_ROLES = frozenset({"boolean-visibility"})
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
        if role in SWITCH_ROLES:
            # A show/hide toggle paints through a class with a rule (a modifier, a
            # state utility class such as `sgs-on-dark`, or one in a block the value
            # is forwarded to) or a custom property; through a paint declaration it
            # fixes itself, in the block it guards (`border-top:1px solid …`) or by
            # switching a variable a later paint declaration writes (a smart-contrast
            # colour). Any other declaration it gates (one that shows, hides, sizes or
            # places a box, or carries another setting's value), and a data attribute
            # it sets, are the content or behaviour it switches. A hover, state or
            # motion effect toggle (`shadowLiftOnHover`, `bgHoverZoom`) paints through
            # the declaration it gates, and a visual-effect runtime toggle
            # (`bgLottieLoop`, `itemMagnetEnabled`) through its data attribute.
            if signals.get("utility_class_rule"):
                return "css", "class-rule"
            if signals.get("toggle_paint"):
                return "css", "toggle-paint-decl"
            effect = is_state(attr, row.get("css_state")) or is_motion(attr, cssp)
            if effect and signals.get("decl_channel"):
                return "css", "effect-toggle-decl"
            if signals.get("fx_data_consumed"):
                return "js", "effect-toggle-runtime"
            return "not", "role:" + role
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
