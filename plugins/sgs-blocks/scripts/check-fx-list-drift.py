#!/usr/bin/env python3
"""check-fx-list-drift.py — the three-list (plus field-type triad) fx drift gate.

Spec ref: .claude/specs/38-SGS-MOTION-SYSTEM.md §7 / §11.2 / §11.3, FR-38-25.

THE DEFECT CLASS THIS EXISTS TO KILL
----------------------------------------------------------------------------------------
To make one fx effect work, a developer must remember to add it to THREE separate
hand-maintained lists in two different files. Miss one and the build still passes green:

  1. `SHIPPED_EFFECTS`              src/blocks/extensions/fx.js
     The editor's on-switch. Miss it and the effect is invisible in the editor while
     every other layer is correctly wired — the feature is simply unreachable.
  2. `FX_ATTR_MAP`                  includes/fx-attributes.php
     Which stored attributes reach the rendered markup. Miss a row and the client's
     chosen value never leaves the database.
  3. `sgs_fx_effect_param_scope()`  includes/fx-attributes.php
     Which params each effect may carry. Miss a row and the page looks completely
     healthy while the client's chosen colour and size are silently thrown away.

On `cursor-field` (FR-38-25) TWO of the three were missed in a single session. Neither
failed a build. The third only surfaced by LIVE verification after the other fixes had
already shipped. A fourth, parallel triad exists for cursor-field TYPES (picker × render
allowlist × the CSS rule that paints it), and its own source comment concedes the
divergence "is not yet gated — it is recorded as a known residual". This gate closes all
of it.

IT READS NO DATABASE — DELIBERATELY
----------------------------------------------------------------------------------------
Every input is a committed file: source plus the already-generated artefacts. A clean
checkout must still be able to run `npm run build` (that property was closed this wave at
c674edea), and `scripts/db-consistency/run.py` requires the DB. So this gate stands ALONE
rather than joining that suite. The one DB-derived fact it needs — which effects belong
in the picker — arrives through the committed `generated-fx-effect-meta.json`, written by
generate-fx-effects-php.py from the `fx_effects.in_picker` column (DB-first per R-31-1;
no new hand-maintained list).

THE PARSER MUST NOT PASS VACUOUSLY
----------------------------------------------------------------------------------------
This pattern-matches PHP and JS, following the house scanning gates. That creates a
specific trap this project has hit before: if a file's shape changes and a parser matches
nothing, every set comparison becomes empty-vs-empty and the gate reads green forever.
So EVERY parse asserts a non-empty result AND a floor count, and hard-fails naming the
file and the construct when the parse comes back thin. A gate that cannot fail is worse
than no gate. `--self-test`'s vacuity case proves this arm fires.

GATE SHAPE (matches check-motion-bundle-budget.py / audit-feature-parity.py)
----------------------------------------------------------------------------------------
- Default (no flag): observational report, exit 0 regardless of findings.
- --check:     gating mode. Exit 1 on any invariant breach or any vacuous parse.
- --self-test: proves the gate can fail — ten cases against a temp copy of the sources.

Run: python plugins/sgs-blocks/scripts/check-fx-list-drift.py --check
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

_PLUGIN_ROOT = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------------------
# Exemptions — each one cites the source line that documents it, so a reader can
# check the claim rather than trust this file.
# ---------------------------------------------------------------------------

# I3 exemption: fx* block attributes that deliberately have NO `FX_ATTR_MAP` row.
#   · fxPreset            — fx-attributes.php:59-61: "a preset writes its values into
#                           the params above, so emitting the label too would ship a
#                           data attribute no runtime reads".
#   · fxDisableMobile/Tablet — booleans, special-cased OUTSIDE the generic
#                           value-or-absent FX_ATTR_MAP loop at fx-attributes.php:518-520
#                           (a `false` is not `''`, so the generic rule would leave an
#                           empty-but-present attribute rather than omitting it).
_I3_EXEMPT_ATTRS = frozenset({"fxPreset", "fxDisableMobile", "fxDisableTablet"})

# I4 exemption: FX_ATTR_MAP keys that are UNIVERSAL — carried by every effect, so no
# per-effect `sgs_fx_effect_param_scope()` row claims them. The first five are named
# verbatim at fx-attributes.php:332-333 ("A key not listed against any effect here is
# universal (`fx`, `fxPreset`, `fxTrigger`, `fxStart`, `fxEnd`)"); the per-breakpoint
# pair is handled separately at fx-attributes.php:518-520.
_I4_UNIVERSAL_ATTRS = frozenset(
    {"fx", "fxPreset", "fxTrigger", "fxStart", "fxEnd", "fxDisableMobile", "fxDisableTablet"}
)


@dataclass(frozen=True)
class Sources:
    """The nine committed files/directories this gate reads.

    Parameterised (rather than module constants) purely so `--self-test` can point the
    whole gate at a temp copy and perturb it without ever touching the real tree.
    """

    fx_js: Path
    fx_attributes_php: Path
    generated_attrs_php: Path
    effect_meta_json: Path
    cursor_field_php: Path
    cursor_field_css: Path
    # I7 — the Tier W shader-treatment triad (D479/D555 surface-treatment build).
    # Same "three lists, one truth" defect class as the header docstring names, one
    # level down: an id can be allowlisted server-side, listed as a client-facing
    # preset, and yet have no shader to run — or the reverse, a shader module that
    # nothing on the allowlist or the picker will ever select.
    surface_treatment_php: Path
    surface_treatment_presets_js: Path
    surface_treatment_frag_dir: Path

    @staticmethod
    def default(root: Path = _PLUGIN_ROOT) -> "Sources":
        return Sources(
            fx_js=root / "src" / "blocks" / "extensions" / "fx.js",
            fx_attributes_php=root / "includes" / "fx-attributes.php",
            generated_attrs_php=root / "includes" / "extension-attributes.generated.php",
            effect_meta_json=root / "src" / "blocks" / "extensions" / "generated-fx-effect-meta.json",
            cursor_field_php=root / "includes" / "fx-cursor-field.php",
            cursor_field_css=root / "assets" / "css" / "fx-cursor-field.css",
            surface_treatment_php=root / "includes" / "fx-surface-treatment.php",
            surface_treatment_presets_js=root / "src" / "shared" / "effects" / "surface-treatments" / "presets.js",
            surface_treatment_frag_dir=root / "src" / "shared" / "effects" / "surface-treatments",
        )

    def all_paths(self) -> list[Path]:
        return [
            self.fx_js,
            self.fx_attributes_php,
            self.generated_attrs_php,
            self.effect_meta_json,
            self.cursor_field_php,
            self.cursor_field_css,
            self.surface_treatment_php,
            self.surface_treatment_presets_js,
            self.surface_treatment_frag_dir,
        ]


class VacuousParse(Exception):
    """Raised when a parse returns nothing, or fewer items than its floor.

    This is NOT an invariant breach — it means the gate lost sight of its own input and
    can no longer make any claim at all. It fails the gate loudly and separately, so a
    reshaped source file can never be mistaken for "the lists agree".
    """


def _read(path: Path) -> str:
    if not path.exists():
        raise VacuousParse(
            f"{path} does not exist — this gate reads it as an input and cannot verify "
            "anything without it."
        )
    text = path.read_text(encoding="utf-8")
    if not text.strip():
        raise VacuousParse(f"{path} is empty — nothing to parse, so nothing can be verified.")
    return text


def _floor(items: list[str] | set[str], floor: int, path: Path, construct: str) -> None:
    """Assert a parse found at least `floor` entries, or hard-fail naming the file."""
    if len(items) < floor:
        raise VacuousParse(
            f"{path}: parsing `{construct}` found {len(items)} entr(y/ies), expected at "
            f"least {floor}. The construct has almost certainly been renamed or reshaped, "
            "which would silently turn every comparison it feeds into empty-vs-empty. "
            "Fix the parser in check-fx-list-drift.py (and re-run --self-test), or restore "
            "the construct — do NOT lower the floor to make this pass."
        )


def _block_after(text: str, header_re: str, open_ch: str, close_ch: str, path: Path,
                 construct: str) -> str:
    """Return the balanced `open_ch`…`close_ch` body that follows the first match of
    `header_re`. Balanced rather than a lazy regex so nested arrays inside a body (the
    param-scope table is a dict of arrays) cannot truncate the match early."""
    match = re.search(header_re, text)
    if match is None:
        raise VacuousParse(
            f"{path}: could not locate `{construct}` (pattern {header_re!r}). It has been "
            "renamed, moved or reshaped — every comparison fed by it would silently become "
            "empty-vs-empty. Fix the parser in check-fx-list-drift.py."
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


# ---------------------------------------------------------------------------
# Parsers — one per list. Each ends in a floor assertion.
# ---------------------------------------------------------------------------

def parse_shipped_effects(src: Sources) -> list[str]:
    """fx.js `SHIPPED_EFFECTS` — the editor's on-switch array."""
    path = src.fx_js
    body = _block_after(
        _read(path), r"const\s+SHIPPED_EFFECTS\s*=\s*\[", "[", "]", path, "SHIPPED_EFFECTS"
    )
    # Strip comments first: this array is heavily commented and several comments NAME
    # effect slugs in prose ("`draw` ADDED 2026-07-31"), which a naive quote-scan would
    # happily collect as members.
    body = _strip_js_comments(body)
    effects = re.findall(r"['\"]([a-z0-9-]+)['\"]", body)
    _floor(effects, 4, path, "SHIPPED_EFFECTS")
    return effects


def parse_option_labels(src: Sources) -> list[str]:
    """fx.js `FX_OPTION_LABELS` — the picker's label map, keyed by effect slug."""
    path = src.fx_js
    body = _block_after(
        _read(path), r"const\s+FX_OPTION_LABELS\s*=\s*\{", "{", "}", path, "FX_OPTION_LABELS"
    )
    body = _strip_js_comments(body)
    # Keys are bare (`scramble:`) when the slug is a valid identifier and quoted
    # (`'pin-scrub':`) when it is not — both shapes appear in the live file.
    keys = re.findall(r"(?:^|[{,])\s*(?:['\"]([a-z0-9-]+)['\"]|([a-zA-Z][a-zA-Z0-9]*))\s*:", body)
    labels = [quoted or bare for quoted, bare in keys]
    _floor(labels, 4, path, "FX_OPTION_LABELS")
    return labels


def parse_field_type_options(src: Sources) -> list[str]:
    """fx.js `FX_FIELD_TYPE_OPTIONS` — the client-facing cursor-field type picker.

    The empty value is not a type: fx.js:334-336 documents it as "whatever the
    stylesheet defaults to". It is normalised to the render layer's own declared default
    (`SGS_FX_CURSOR_FIELD_DEFAULT`) rather than to a literal typed here — hardcoding
    `'glow'` in this gate would create exactly the fourth uncrosschecked list it exists
    to prevent.
    """
    path = src.fx_js
    body = _block_after(
        _read(path),
        r"const\s+FX_FIELD_TYPE_OPTIONS\s*=\s*\[",
        "[", "]", path, "FX_FIELD_TYPE_OPTIONS",
    )
    body = _strip_js_comments(body)
    values = re.findall(r"value\s*:\s*['\"]([a-z0-9-]*)['\"]", body)
    _floor(values, 1, path, "FX_FIELD_TYPE_OPTIONS")
    default = parse_cursor_field_default(src)
    return [value or default for value in values]


def _strip_js_comments(text: str) -> str:
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
    return re.sub(r"//[^\n]*", "", text)


def _strip_php_comments(text: str) -> str:
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
    text = re.sub(r"//[^\n]*", "", text)
    return re.sub(r"(?m)^\s*#[^\n]*", "", text)


def parse_fx_attr_map(src: Sources) -> list[str]:
    """fx-attributes.php `FX_ATTR_MAP` — block attribute => rendered data-attribute."""
    path = src.fx_attributes_php
    body = _block_after(
        _read(path), r"const\s+FX_ATTR_MAP\s*=\s*array\s*\(", "(", ")", path, "FX_ATTR_MAP"
    )
    body = _strip_php_comments(body)
    keys = re.findall(r"'(fx[A-Za-z0-9]*)'\s*=>", body)
    _floor(keys, 10, path, "FX_ATTR_MAP")
    return keys


def parse_param_scope(src: Sources) -> dict[str, list[str]]:
    """fx-attributes.php `sgs_fx_effect_param_scope()` — effect => extra attr keys."""
    path = src.fx_attributes_php
    body = _block_after(
        _read(path),
        r"function\s+sgs_fx_effect_param_scope\s*\(\s*\)\s*:\s*array\s*\{",
        "{", "}", path, "sgs_fx_effect_param_scope()",
    )
    body = _strip_php_comments(body)
    scope: dict[str, list[str]] = {}
    for effect, keys_body in re.findall(r"'([a-z0-9-]+)'\s*=>\s*array\s*\(([^)]*)\)", body):
        scope[effect] = re.findall(r"'(fx[A-Za-z0-9]*)'", keys_body)
    _floor(list(scope), 3, path, "sgs_fx_effect_param_scope()")
    for effect, keys in scope.items():
        _floor(keys, 1, path, f"sgs_fx_effect_param_scope()['{effect}']")
    return scope


def parse_generated_fx_attrs(src: Sources) -> list[str]:
    """extension-attributes.generated.php — every registered `fx*` block attribute."""
    path = src.generated_attrs_php
    text = _strip_php_comments(_read(path))
    attrs = re.findall(r"'(fx[A-Za-z0-9]*)'\s*=>\s*array\s*\(", text)
    _floor(attrs, 10, path, "the fx* rows of the generated attribute registry")
    return attrs


def parse_picker_effects(src: Sources) -> list[str]:
    """generated-fx-effect-meta.json — effects the DB flags `in_picker`."""
    path = src.effect_meta_json
    try:
        meta = json.loads(_read(path))
    except json.JSONDecodeError as exc:
        raise VacuousParse(f"{path} is not valid JSON: {exc}") from exc
    if not isinstance(meta, dict):
        raise VacuousParse(f"{path} did not parse to an object of effects.")
    _floor(list(meta), 5, path, "the generated effect-meta map")
    missing = sorted(slug for slug, row in meta.items() if "in_picker" not in row)
    if missing:
        raise VacuousParse(
            f"{path}: {len(missing)} effect row(s) carry no `in_picker` key "
            f"({', '.join(missing)}). Re-run "
            "`python plugins/sgs-blocks/scripts/generate-fx-effects-php.py` after seeding "
            "`fx_effects.in_picker` (scripts/seed-motion-fx-registry.py). Without the key "
            "invariant I1 would compare against an empty set and read green forever."
        )
    picker = sorted(slug for slug, row in meta.items() if row["in_picker"])
    _floor(picker, 4, path, "the in_picker=true subset of the effect-meta map")
    return picker


def parse_cursor_field_types(src: Sources) -> list[str]:
    """fx-cursor-field.php `SGS_FX_CURSOR_FIELD_TYPES` — the render layer's allowlist."""
    path = src.cursor_field_php
    body = _block_after(
        _read(path),
        r"const\s+SGS_FX_CURSOR_FIELD_TYPES\s*=\s*array\s*\(",
        "(", ")", path, "SGS_FX_CURSOR_FIELD_TYPES",
    )
    types = re.findall(r"'([a-z0-9-]+)'", _strip_php_comments(body))
    # Floor 1, not 2. The vacuity risk here is the construct being renamed or reshaped so
    # NOTHING matches; a genuine one-type system is a legitimate state the gate must not
    # reject. (Found by --self-test: a floor of 2 turned the I6 break into a vacuity
    # error, so I6 itself was never actually proven.) Same reasoning on the other two
    # legs of the triad below.
    _floor(types, 1, path, "SGS_FX_CURSOR_FIELD_TYPES")
    return types


def parse_cursor_field_default(src: Sources) -> str:
    """fx-cursor-field.php `SGS_FX_CURSOR_FIELD_DEFAULT` — what an empty type means."""
    path = src.cursor_field_php
    match = re.search(
        r"const\s+SGS_FX_CURSOR_FIELD_DEFAULT\s*=\s*'([a-z0-9-]+)'", _read(path)
    )
    if match is None:
        raise VacuousParse(
            f"{path}: could not locate `SGS_FX_CURSOR_FIELD_DEFAULT`. The picker's empty "
            "option normalises to it, so without it I6 cannot be evaluated honestly."
        )
    return match.group(1)


def parse_css_field_types(src: Sources) -> list[str]:
    """fx-cursor-field.css — the `[data-sgs-cursor-field="X"]` rules that actually paint.

    Only VALUED selectors count. The bare `[data-sgs-cursor-field]` rules are the shared
    base layer (positioning, the ::before pseudo, the reduced-motion arm) and paint no
    specific type, so counting them would let a type with no paint rule pass.
    """
    path = src.cursor_field_css
    types = re.findall(r"\[data-sgs-cursor-field=[\"']([a-z0-9-]+)[\"']\]", _read(path))
    _floor(types, 1, path, 'the [data-sgs-cursor-field="…"] paint rules')
    return types


def parse_treatment_allowlist(src: Sources) -> list[str]:
    """fx-surface-treatment.php `SGS_FX_TREATMENTS` — the server-side allowlist a
    `fxTreatment` value must appear in before the render layer will emit it."""
    path = src.surface_treatment_php
    match = re.search(
        r"const\s+SGS_FX_TREATMENTS\s*=\s*array\s*\(([^)]*)\)", _read(path)
    )
    if match is None:
        raise VacuousParse(
            f"{path}: could not locate `SGS_FX_TREATMENTS`. It has been renamed, moved "
            "or reshaped — I7 would silently compare against an empty set."
        )
    ids = re.findall(r"'([a-z0-9-]+)'", match.group(1))
    _floor(ids, 1, path, "SGS_FX_TREATMENTS")
    return ids


def parse_treatment_presets(src: Sources) -> list[str]:
    """surface-treatments/presets.js `TREATMENT_PRESETS` — the client-facing preset
    map the picker + WebGL bootstrap both key off (`resolvePreset()`)."""
    path = src.surface_treatment_presets_js
    body = _block_after(
        _read(path), r"export\s+const\s+TREATMENT_PRESETS\s*=\s*\{", "{", "}", path,
        "TREATMENT_PRESETS",
    )
    body = _strip_js_comments(body)
    # Top-level keys only — `grain: {`, `halftone: {`, etc. A bare-identifier key
    # (valid here: every shipped id is a plain lowercase word) followed by `{` at the
    # object's own top level. Nested `uniforms: { ... }` bodies also match a bare
    # `key: {` shape, so this would over-collect if it recursed — it does not, because
    # `_block_after` already isolated ONLY the TREATMENT_PRESETS body and each preset's
    # own nested braces are skipped over by scanning for `{` immediately following an
    # identifier at start-of-line/after-comma, which nested uniform entries also satisfy
    # (`uIntensity: { type: 'float', ... }`) — so this parser deliberately reads the
    # `id:` field INSIDE each preset object instead of the outer key, which is immune to
    # nesting depth and matches the field every preset object declares for exactly this
    # kind of cross-check (`id: 'grain'`, verified against the live file before writing
    # this).
    ids = re.findall(r"\bid\s*:\s*'([a-z0-9-]+)'", body)
    _floor(ids, 1, path, "TREATMENT_PRESETS[*].id")
    return ids


def parse_treatment_frag_files(src: Sources) -> list[str]:
    """The `*.frag.js` modules actually present in the surface-treatments directory —
    the ground-truth "does a shader exist for this id" fact neither list above can
    lie about on its own."""
    directory = src.surface_treatment_frag_dir
    if not directory.exists() or not directory.is_dir():
        raise VacuousParse(
            f"{directory} does not exist as a directory — this gate reads it as an "
            "input and cannot verify anything without it."
        )
    ids = sorted(p.name[: -len(".frag.js")] for p in directory.glob("*.frag.js"))
    _floor(ids, 1, directory, "*.frag.js shader modules")
    return ids


# ---------------------------------------------------------------------------
# The seven invariants.
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Violation:
    invariant: str
    detail: str
    fix: str


def _dupes(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        if item in seen and item not in out:
            out.append(item)
        seen.add(item)
    return out


def evaluate(src: Sources) -> list[Violation]:
    """Run all seven invariants. Raises VacuousParse if any input cannot be read."""
    shipped = parse_shipped_effects(src)
    labels = parse_option_labels(src)
    picker = parse_picker_effects(src)
    attr_map = parse_fx_attr_map(src)
    param_scope = parse_param_scope(src)
    generated_attrs = parse_generated_fx_attrs(src)
    php_field_types = parse_cursor_field_types(src)
    css_field_types = parse_css_field_types(src)
    js_field_types = parse_field_type_options(src)
    treatment_allowlist = parse_treatment_allowlist(src)
    treatment_presets = parse_treatment_presets(src)
    treatment_frag_files = parse_treatment_frag_files(src)

    violations: list[Violation] = []

    # A duplicated entry in either hand-kept JS list is drift in its own right — it means
    # two edits added the same effect and one of them is stale.
    for name, items in (("SHIPPED_EFFECTS", shipped), ("FX_OPTION_LABELS", labels)):
        for dupe in _dupes(items):
            violations.append(Violation(
                "I0",
                f"`{name}` (fx.js) lists `{dupe}` more than once.",
                f"Delete the duplicate `{dupe}` entry from {name}.",
            ))

    # ---- I1: SHIPPED_EFFECTS == in_picker, BOTH directions -------------------
    # The `cursor-field` defect: built correctly in every other layer, omitted here, and
    # therefore completely unreachable from the editor with nothing to say so.
    for effect in sorted(set(picker) - set(shipped)):
        violations.append(Violation(
            "I1",
            f"`{effect}` is flagged `in_picker` in {src.effect_meta_json.name} but is "
            "ABSENT from `SHIPPED_EFFECTS` (fx.js). The effect is unreachable from the "
            "editor — a client can never select it, however complete the rest of it is.",
            f"Add '{effect}' to SHIPPED_EFFECTS in src/blocks/extensions/fx.js.",
        ))
    for effect in sorted(set(shipped) - set(picker)):
        violations.append(Violation(
            "I1",
            f"`{effect}` is in `SHIPPED_EFFECTS` (fx.js) but is NOT flagged `in_picker` "
            f"in {src.effect_meta_json.name}. The picker offers an effect the registry "
            "does not consider a picker entry.",
            f"Either set in_picker=1 on the `{effect}` row in "
            "scripts/seed-motion-fx-registry.py (re-seed + re-run "
            "generate-fx-effects-php.py), or remove it from SHIPPED_EFFECTS.",
        ))

    # ---- I2: FX_OPTION_LABELS keys == SHIPPED_EFFECTS ------------------------
    for effect in sorted(set(shipped) - set(labels)):
        violations.append(Violation(
            "I2",
            f"`{effect}` is in `SHIPPED_EFFECTS` but has no `FX_OPTION_LABELS` entry — "
            "the picker would render an option with an undefined label.",
            f"Add a `{effect}` label to FX_OPTION_LABELS in src/blocks/extensions/fx.js.",
        ))
    for effect in sorted(set(labels) - set(shipped)):
        violations.append(Violation(
            "I2",
            f"`{effect}` has an `FX_OPTION_LABELS` entry but is not in "
            "`SHIPPED_EFFECTS` — a label for an option that is never offered.",
            f"Remove the `{effect}` label, or add the effect to SHIPPED_EFFECTS.",
        ))

    # ---- I3: every registered fx* attr has an FX_ATTR_MAP row ----------------
    # The `fxFieldType`/`fxFieldColour`/`fxFieldRadius` half of the cursor-field defect:
    # registered attributes with no map row never reach a DYNAMIC block's markup at all.
    for attr in sorted(set(generated_attrs) - set(attr_map) - _I3_EXEMPT_ATTRS):
        violations.append(Violation(
            "I3",
            f"`{attr}` is a registered fx block attribute "
            f"({src.generated_attrs_php.name}) with NO `FX_ATTR_MAP` row. A client can "
            "set it, and its value never reaches the rendered markup of any dynamic "
            "block — the setting looks applied and does nothing.",
            f"Add a '{attr}' => 'data-sgs-fx-…' row to FX_ATTR_MAP in "
            "includes/fx-attributes.php (or, if it is deliberately non-emitting, add it "
            "to _I3_EXEMPT_ATTRS here WITH the source line that documents why).",
        ))

    # ---- I4: every non-universal FX_ATTR_MAP key is claimed by an effect -----
    # The third leg of the cursor-field defect: unclaimed keys are scoped OUT at render
    # time, so the value is stripped between the database and the page.
    claimed = {key for keys in param_scope.values() for key in keys}
    for attr in sorted(set(attr_map) - claimed - _I4_UNIVERSAL_ATTRS):
        violations.append(Violation(
            "I4",
            f"`{attr}` has an `FX_ATTR_MAP` row but is claimed by NO effect in "
            "`sgs_fx_effect_param_scope()`. Non-universal keys no effect claims are "
            "stripped as leftovers at render time — the value is silently dropped on "
            "the way to the page, which is precisely how cursor-field's colour and "
            "radius were lost.",
            f"Add '{attr}' to the owning effect's row in sgs_fx_effect_param_scope() "
            "(includes/fx-attributes.php), or — if it is genuinely universal — to "
            "_I4_UNIVERSAL_ATTRS here WITH the source line that documents it.",
        ))

    # ---- I5: param-scope rows reference only real keys and shipped effects ---
    for effect, keys in sorted(param_scope.items()):
        for key in sorted(set(keys) - set(attr_map)):
            violations.append(Violation(
                "I5",
                f"`sgs_fx_effect_param_scope()['{effect}']` allows `{key}`, which has no "
                "`FX_ATTR_MAP` row — an allowlist entry for an attribute that can never "
                "be emitted.",
                f"Add a '{key}' row to FX_ATTR_MAP, or remove it from the `{effect}` row.",
            ))
        if effect not in shipped:
            violations.append(Violation(
                "I5",
                f"`sgs_fx_effect_param_scope()` carries a row for `{effect}`, which is "
                "not in `SHIPPED_EFFECTS` — a param allowlist for an effect that no "
                "longer ships.",
                f"Remove the `{effect}` row from sgs_fx_effect_param_scope(), or add the "
                "effect back to SHIPPED_EFFECTS if it is meant to ship.",
            ))

    # ---- I6: the cursor-field TYPE triad agrees ------------------------------
    triad = (
        ("FX_FIELD_TYPE_OPTIONS (fx.js)", set(js_field_types)),
        ("SGS_FX_CURSOR_FIELD_TYPES (includes/fx-cursor-field.php)", set(php_field_types)),
        ('the [data-sgs-cursor-field="…"] rules (assets/css/fx-cursor-field.css)',
         set(css_field_types)),
    )
    every_type = set().union(*(members for _label, members in triad))
    for field_type in sorted(every_type):
        absent = [label for label, members in triad if field_type not in members]
        if absent:
            violations.append(Violation(
                "I6",
                f"cursor-field type `{field_type}` is missing from: {'; '.join(absent)}. "
                "A type in the picker but absent from the CSS paints nothing; absent "
                "from the PHP allowlist it is skipped at render; absent from the picker "
                "no client can choose it.",
                f"Add `{field_type}` to each list named above, or remove it from all "
                "three. All three must agree.",
            ))

    # ---- I7: the shader-treatment triad agrees -------------------------------
    # The surface-treatment analogue of I6: a treatment id can be allowlisted
    # server-side (SGS_FX_TREATMENTS), offered client-side (TREATMENT_PRESETS), and
    # actually shader-backed on disk (*.frag.js) — three independent facts, and any
    # one missing means a broken or invisible treatment that still looks configured.
    treatment_triad = (
        (f"SGS_FX_TREATMENTS ({src.surface_treatment_php.name})", set(treatment_allowlist)),
        (f"TREATMENT_PRESETS ({src.surface_treatment_presets_js.name})", set(treatment_presets)),
        (f"*.frag.js modules ({src.surface_treatment_frag_dir.name}/)", set(treatment_frag_files)),
    )
    every_treatment = set().union(*(members for _label, members in treatment_triad))
    for treatment_id in sorted(every_treatment):
        absent = [label for label, members in treatment_triad if treatment_id not in members]
        if absent:
            violations.append(Violation(
                "I7",
                f"shader treatment `{treatment_id}` is missing from: {'; '.join(absent)}. "
                "Allowlisted with no preset, the render layer accepts a value the client "
                "can never choose; presented with no allowlist entry, the render layer "
                "silently falls back to the default treatment; either with no `.frag.js` "
                "file, the WebGL bootstrap has nothing to compile and paints nothing.",
                f"Add `{treatment_id}` to each of the three (SGS_FX_TREATMENTS in "
                "includes/fx-surface-treatment.php, TREATMENT_PRESETS in "
                "src/shared/effects/surface-treatments/presets.js, and a matching "
                f"{treatment_id}.frag.js in the same directory), or remove it from all "
                "three consistently.",
            ))

    return violations


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

_INVARIANTS = {
    "I0": "no duplicate entries within either hand-kept fx.js list",
    "I1": "SHIPPED_EFFECTS (fx.js) == the in_picker effects (generated meta), both ways",
    "I2": "FX_OPTION_LABELS keys == SHIPPED_EFFECTS",
    "I3": "every registered fx* attribute has an FX_ATTR_MAP row (bar documented exemptions)",
    "I4": "every non-universal FX_ATTR_MAP key is claimed by >=1 effect's param scope",
    "I5": "param-scope rows name only real FX_ATTR_MAP keys and shipped effects",
    "I6": "the cursor-field type triad (picker / PHP allowlist / CSS paint rules) agrees",
    "I7": "the shader-treatment triad (PHP allowlist / JS presets / *.frag.js files) agrees",
}


def _print_report(src: Sources, violations: list[Violation]) -> None:
    print("[fx-list-drift] Cross-checking the fx lists that nothing else compares:")
    for path in src.all_paths():
        print(f"    · {path.relative_to(_PLUGIN_ROOT) if _PLUGIN_ROOT in path.parents or path.is_relative_to(_PLUGIN_ROOT) else path}")
    print()
    for key, description in _INVARIANTS.items():
        hits = [v for v in violations if v.invariant == key]
        status = "OK  " if not hits else f"FAIL({len(hits)})"
        print(f"    [{status}] {key} — {description}")
    if violations:
        print()
        for violation in violations:
            print(f"  {violation.invariant}: {violation.detail}")
            print(f"      FIX: {violation.fix}")


# ---------------------------------------------------------------------------
# --self-test
# ---------------------------------------------------------------------------
#
# Modelled on scripts/db-consistency/check_motion_fx_reseed.py's own self-test, whose
# docstring already explains why perturbing ONE thing is insufficient: "a guard is only
# proven for the fields its self-test actually perturbs, and 'I added the comparison' is
# not evidence the comparison runs."
#
# So: assert clean, then break EACH of the seven invariants in turn against a temp copy
# (I7's three independent legs each get their own break), assert each is caught by its
# OWN invariant id, restore, re-assert clean. Then a final case — blank a source file —
# proving the vacuity guard fires rather than reading green.
#
# Every break VERIFIES THE TEXT ACTUALLY CHANGED before trusting the result. A string
# replacement that matched nothing is silent, and would otherwise produce a false
# negative control: "no violation found" when nothing was ever broken.

@dataclass(frozen=True)
class _Case:
    """A single self-test break.

    Two anchoring modes, chosen per case:
      - LITERAL (`old`/`new` set, `pattern` left None) — an exact string search-and-
        replace. Simple, but brittle against whitespace/column-alignment drift in the
        source file (`=>` padding, PHP array alignment) — a re-alignment can silently
        stop the anchor matching, which is exactly what happened to the I4/I5 cases
        below before this dataclass grew a second mode.
      - REGEX (`pattern`/`replacement` set, `old`/`new` left "") — whitespace either
        side of `=>`/`,` is matched with `\\s*` instead of pinned to today's exact
        column count, so a future re-alignment of the source file cannot silently
        re-vacuum the case the way it did here. `replacement` is a `re.sub` template
        (may use `\\g<0>` etc.); the substitution is applied with `count=1` and the
        case is REJECTED (treated the same as a literal anchor miss) unless exactly
        one substitution lands — a pattern that matches zero OR more than once is
        exactly as untrustworthy as a stale literal anchor.
    """

    invariant: str
    label: str
    attr: str          # Sources field to perturb
    old: str = ""
    new: str = ""
    pattern: str | None = None
    replacement: str | None = None

    def apply(self, before: str) -> str | None:
        """Return the perturbed text, or None if the anchor did not land."""
        if self.pattern is not None:
            after, count = re.subn(self.pattern, self.replacement or "", before, count=1)
            return after if count == 1 else None
        after = before.replace(self.old, self.new, 1)
        return after if after != before else None


_CASES = (
    _Case(
        "I1", "delete 'cursor-field' from SHIPPED_EFFECTS",
        "fx_js", "\t'cursor-field',\n", "",
    ),
    _Case(
        "I2", "delete the 'morph' label from FX_OPTION_LABELS",
        "fx_js", "\tmorph: __( 'Morph between shapes', 'sgs-blocks' ),\n", "",
    ),
    _Case(
        "I3", "register an fx* attribute with no FX_ATTR_MAP row",
        "generated_attrs_php",
        "\t'fxEase' => array( 'type' => 'string' ),",
        "\t'fxEase' => array( 'type' => 'string' ),\n\t'fxSelfTestOrphan' => array( 'type' => 'string' ),",
    ),
    _Case(
        # REGEX-anchored (not literal): FX_ATTR_MAP's `=>` column alignment has drifted
        # before (this exact case's literal anchor went stale when the array was
        # re-padded) and will drift again on the next re-alignment. `\s*` either side of
        # `=>` tolerates any padding width instead of pinning to today's.
        "I4", "add an FX_ATTR_MAP row no effect claims",
        "fx_attributes_php",
        pattern=r"'fxMask'\s*=>\s*'data-sgs-fx-mask',",
        replacement=r"\g<0>\n\t'fxSelfTestUnclaimed' => 'data-sgs-fx-selftest-unclaimed',",
    ),
    _Case(
        # REGEX-anchored for the same reason as I4 above — the `'scrub'` row's `=>`
        # padding is independently hand-aligned and has already drifted once against a
        # literal anchor.
        "I5", "allow a param-scope key that has no FX_ATTR_MAP row",
        "fx_attributes_php",
        pattern=r"'scrub'\s*=>\s*array\(\s*'fxScrub',\s*'fxEase'\s*\),",
        replacement=r"'scrub'            => array( 'fxScrub', 'fxEase', 'fxSelfTestGhost' ),",
    ),
    _Case(
        # Breaks I6 by ADDING a type to the render allowlist that neither the picker nor
        # the CSS knows about — the "configured, enqueued and invisible" shape the
        # allowlist's own docblock names. Chosen over DELETING a type deliberately: a
        # deletion shrinks the list towards its vacuity floor, so the vacuity guard would
        # fire first and I6 itself would never be exercised (exactly what happened on the
        # first --self-test run of this gate).
        "I6", "add a field type the picker and the CSS have never heard of",
        "cursor_field_php",
        "const SGS_FX_CURSOR_FIELD_TYPES = array( 'glow', 'spotlight-mask' );",
        "const SGS_FX_CURSOR_FIELD_TYPES = array( 'glow', 'spotlight-mask', 'selftest-ghost' );",
    ),
    _Case(
        # I7 leg 1: delete 'halftone' from the PHP allowlist. TREATMENT_PRESETS and the
        # halftone.frag.js file both still name it — an id the picker still offers and a
        # shader still exists for, but the render layer will now reject.
        "I7", "delete 'halftone' from SGS_FX_TREATMENTS (PHP allowlist)",
        "surface_treatment_php",
        "array( 'grain', 'halftone', 'duotone' )",
        "array( 'grain', 'duotone' )",
    ),
    _Case(
        # I7 leg 2: delete the `id: 'duotone'` field from its TREATMENT_PRESETS entry.
        # The object itself stays syntactically valid (still allowlisted, still has a
        # frag file) — only the client-facing preset roster loses track of it, which is
        # exactly the "configured, enqueued and invisible" shape I6 already proves for
        # cursor-field types, one level down.
        "I7", "delete the id field from TREATMENT_PRESETS.duotone",
        "surface_treatment_presets_js",
        "\t\tid: 'duotone',\n",
        "",
    ),
)


def _self_test() -> int:
    real = Sources.default()
    failures: list[str] = []

    with tempfile.TemporaryDirectory(prefix="fx-list-drift-selftest-") as tmp:
        root = Path(tmp)
        temp = Sources(
            fx_js=root / "fx.js",
            fx_attributes_php=root / "fx-attributes.php",
            generated_attrs_php=root / "extension-attributes.generated.php",
            effect_meta_json=root / "generated-fx-effect-meta.json",
            cursor_field_php=root / "fx-cursor-field.php",
            cursor_field_css=root / "fx-cursor-field.css",
            surface_treatment_php=root / "fx-surface-treatment.php",
            surface_treatment_presets_js=root / "presets.js",
            # A directory, not a file — copied whole below via copytree, never
            # copyfile. Its own subdir name so copytree doesn't collide with the
            # other flat-copied files sharing `root`.
            surface_treatment_frag_dir=root / "surface-treatments",
        )
        pristine: dict[str, str] = {}
        for field in temp.__dataclass_fields__:
            source_path: Path = getattr(real, field)
            if not source_path.exists():
                print(f"[fx-list-drift --self-test] FAIL — missing source: {source_path}")
                return 1
            dest_path: Path = getattr(temp, field)
            if source_path.is_dir():
                shutil.copytree(source_path, dest_path)
                continue
            shutil.copyfile(source_path, dest_path)
            pristine[field] = dest_path.read_text(encoding="utf-8")

        # Case 0 — baseline.
        try:
            baseline = evaluate(temp)
        except VacuousParse as exc:
            print(f"[fx-list-drift --self-test] FAIL — baseline parse is vacuous: {exc}")
            return 1
        if baseline:
            print(f"[fx-list-drift --self-test] FAIL — expected a clean baseline, got "
                  f"{len(baseline)} violation(s):")
            for violation in baseline:
                print(f"    {violation.invariant}: {violation.detail}")
            return 1
        print("[fx-list-drift --self-test] baseline: 0 violations (clean) — OK")

        # Cases 1-6 — one invariant each.
        for case in _CASES:
            path: Path = getattr(temp, case.attr)
            before = pristine[case.attr]
            after = case.apply(before)
            if after is None:
                failures.append(case.invariant)
                anchor_desc = case.pattern if case.pattern is not None else case.old
                print(
                    f"[fx-list-drift --self-test] {case.invariant}: FAIL — the break did "
                    f"NOT land in {path.name} (anchor {anchor_desc!r} not found, or matched "
                    "more than once). This is a false negative control, not a passing gate: "
                    "nothing was broken, so 'no violation' proves nothing. Update the anchor "
                    "in _CASES."
                )
                continue
            path.write_text(after, encoding="utf-8")

            try:
                found = evaluate(temp)
                caught = [v for v in found if v.invariant == case.invariant]
            except VacuousParse as exc:
                found, caught = [], []
                print(f"[fx-list-drift --self-test] {case.invariant}: parse went vacuous: {exc}")

            path.write_text(before, encoding="utf-8")  # restore BEFORE asserting

            if caught:
                print(f"[fx-list-drift --self-test] {case.invariant}: {case.label} — caught "
                      f"({len(caught)} msg): {caught[0].detail[:96]}…; restored")
            else:
                failures.append(case.invariant)
                other = ", ".join(sorted({v.invariant for v in found})) or "none"
                print(f"[fx-list-drift --self-test] {case.invariant}: {case.label} — NOT "
                      f"CAUGHT by {case.invariant} (fired: {other}); restored")

        # I7 leg 3 — delete a *.frag.js file from disk. A text-replace _Case can't
        # express this (there is no anchor string inside the deleted file itself once
        # it's gone), so it's handled directly rather than through _CASES: the id stays
        # allowlisted AND stays a picker preset, but the shader that would actually run
        # it is missing — the third and final way the triad can drift.
        grain_frag = temp.surface_treatment_frag_dir / "grain.frag.js"
        grain_frag_bytes = grain_frag.read_bytes()
        grain_frag.unlink()
        try:
            found = evaluate(temp)
            caught = [v for v in found if v.invariant == "I7"]
        except VacuousParse as exc:
            found, caught = [], []
            print(f"[fx-list-drift --self-test] I7: parse went vacuous: {exc}")
        grain_frag.write_bytes(grain_frag_bytes)  # restore BEFORE asserting
        if caught:
            print(f"[fx-list-drift --self-test] I7: delete grain.frag.js from disk — "
                  f"caught ({len(caught)} msg): {caught[0].detail[:96]}…; restored")
        else:
            failures.append("I7")
            other = ", ".join(sorted({v.invariant for v in found})) or "none"
            print(f"[fx-list-drift --self-test] I7: delete grain.frag.js from disk — NOT "
                  f"CAUGHT by I7 (fired: {other}); restored")

        # Case 7 — vacuity guard.
        temp.fx_js.write_text("// deliberately blanked by --self-test\n", encoding="utf-8")
        try:
            evaluate(temp)
            failures.append("VACUITY")
            print("[fx-list-drift --self-test] VACUITY: blanked fx.js — NOT CAUGHT. Every "
                  "comparison it feeds is empty-vs-empty; this gate would read green "
                  "forever.")
        except VacuousParse as exc:
            print(f"[fx-list-drift --self-test] VACUITY: blanked fx.js — caught: "
                  f"{str(exc)[:120]}…")
        temp.fx_js.write_text(pristine["fx_js"], encoding="utf-8")

        # Final — confirm every restore landed.
        try:
            post = evaluate(temp)
        except VacuousParse as exc:
            print(f"[fx-list-drift --self-test] FAIL — post-restore parse is vacuous: {exc}")
            return 1
        if post:
            print(f"[fx-list-drift --self-test] FAIL — {len(post)} violation(s) remain "
                  "after restore; the temp copy was left perturbed.")
            return 1
        print("[fx-list-drift --self-test] post-restore: 0 violations (clean) — OK")

    if failures:
        print(f"[fx-list-drift --self-test] FAIL — unproven: {', '.join(failures)}. Those "
              "invariants read green forever. Fix the check.")
        return 1
    print("[fx-list-drift --self-test] PASS — all 10 cases: baseline clean, each of the seven "
          "invariants provably fails on its own break (I7 across all three of its legs), "
          "the vacuity guard fires, and the restore returns to clean.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Cross-check the three hand-maintained fx lists (SHIPPED_EFFECTS / "
            "FX_ATTR_MAP / sgs_fx_effect_param_scope) plus the cursor-field type triad. "
            "Reads committed source + generated artefacts only — never the database."
        )
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", default=False,
                      help="Gating mode: exit 1 on any invariant breach or vacuous parse.")
    mode.add_argument("--self-test", action="store_true", default=False,
                      help="Prove the gate can fail: ten cases against a temp copy.")
    args = parser.parse_args()

    if args.self_test:
        return _self_test()

    src = Sources.default()
    try:
        violations = evaluate(src)
    except VacuousParse as exc:
        print(f"\n[fx-list-drift] GATE FAILED — VACUOUS PARSE.\n  {exc}", file=sys.stderr)
        # Fail even in report mode: a gate that cannot see its input has verified nothing,
        # and reporting "0 violations" here would be a lie rather than an observation.
        return 1

    _print_report(src, violations)

    if not args.check:
        if violations:
            print(f"\n[fx-list-drift] {len(violations)} finding(s) — report mode, exit 0. "
                  "Run with --check to gate.")
        else:
            print("\n[fx-list-drift] All seven invariants hold.")
        return 0

    if violations:
        print(f"\n[fx-list-drift] GATE FAILED — {len(violations)} fx-list drift "
              "violation(s) above. Each one is an effect or attribute that would ship "
              "looking healthy while doing nothing.")
        return 1
    print("\n[fx-list-drift] GATE PASSED — all seven invariants hold.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
