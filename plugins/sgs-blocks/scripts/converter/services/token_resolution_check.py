"""token_resolution_check.py — advisory detector for unresolvable name references
in emitted block-attribute values (Spec 20 / gap-class: "silent var() fallback").

THE DEFECT CLASS
-----------------
An emitted attribute value can be syntactically valid CSS while referencing a
NAME that does not exist in the target WordPress document — most commonly a
draft-local CSS custom property (``var(--primary)`` from the draft's own
``:root``) that survives un-rewritten into a block attribute. Nothing errors:
the browser silently falls back (to the ``var()`` fallback argument, or to the
property's initial value when there is none), so a border painted with
``border-color: var(--sgs-btn-border, transparent)`` renders **transparent**
and looks correct in source. Proven this session at the emit layer: with
``role=None`` (a resolver that never routes the value through colour
resolution) the raw ``var(--primary)`` reaches the attribute verbatim; with
``role='color'`` the same declaration resolves to the token slug ``primary``,
which the SGS ``sgs_colour_value`` render helper turns into
``var(--wp--preset--color--primary)`` — a name WordPress actually generates.

The class generalises beyond colour: ANY ``var(--x)`` reference in an emitted
value is only real on the rendered page if ``x`` is either (a) a WordPress
CORE-generated custom property — always prefixed ``--wp--`` (preset/custom/
elements — WordPress never emits an unprefixed custom property from
theme.json), or (b) a custom property some enqueued stylesheet genuinely
DEFINES verbatim (e.g. an SGS block's own component-scoped token such as
``--sgs-option-picker-active-bg``). Anything else — most commonly a bare
draft-authored name like ``--primary``/``--border``/``--card-bg`` that never
got rewritten — is unresolvable on the target document by construction.

DETECTION ONLY (Bean-directed, this session)
---------------------------------------------
This module NEVER mutates a value, drops an attribute, or fails a build. A
prior session proved that "fixing" a finding by deleting the offending
override only *looks* correct when two presets happen to share a colour (the
``var(--border)`` case: the outline preset's own default is ``border-subtle``,
so deleting the override silently substitutes a DIFFERENT, still-plausible
colour). The fix belongs to whichever resolver produced the value, decided
with the real draft + block context in hand — never to this module.

TWO CONSUMPTION MODES
----------------------
1. **Live wiring** (advisory, non-blocking): ``converter/services/assembly.py``
   calls ``check_attrs`` once per ``build_block_markup`` call, right before the
   final ``attrs`` dict is handed to ``emit_block_markup`` — the ONE chokepoint
   where every resolver's CSS ``Write``s and every content ``ScalarLift`` have
   already merged (see that module's own docstring). Findings are pushed into
   this module's collector (mirrors ``content_gap_collector.py``'s
   clear/record/flush lifecycle exactly) and ``converter/entry.py`` flushes
   them into ``convert_section``'s return dict under
   ``token_resolution_findings`` — additive, alongside ``content_gaps``.
2. **Standalone CLI** (``plugins/sgs-blocks/scripts/check-unresolvable-token-
   refs.py``): runs the same ``check_attrs`` logic directly against the
   ``block_markup`` JSON already captured in golden fixtures / clone
   artefacts, with no converter run required.

Known-token sources (R-31-1 — runtime DATA, never a hardcoded colour dict):
  - ``theme/sgs-theme/theme.json`` presets (colour palette, font sizes,
    spacing sizes, gradients, ``settings.custom``) — all flatten to
    ``--wp--preset--*``/``--wp--custom--*`` names by WordPress itself.
  - the per-client ``sites/<client>/theme-snapshot.json`` (Spec 33) — same
    flattening rule; verified live (2026-08-04) that every snapshot's
    ``settings.custom`` entry is wp--prefixed on render, never bare.
  - any ``var(--wp--*)`` — ALWAYS accepted unconditionally, per this task's
    brief. WordPress core generates the full ``--wp--preset--*``/
    ``--wp--custom--*``/``--wp--elements--*`` namespace at runtime from
    theme.json + style-variation merges; enumerating every name it could ever
    produce (nested custom paths, per-element overrides) is not this
    detector's job and a false NEGATIVE here (an invented wp--preset slug)
    is a materially smaller risk than the proven defect class (a bare
    draft-local name) — see the module docstring's "Advisory first" framing.
  - a **bare** (non ``wp--``) custom property is accepted ONLY when some real
    enqueued stylesheet under ``theme/sgs-theme/`` or ``plugins/sgs-blocks/``
    genuinely DEFINES it (``--name: ...`` anywhere, any selector) — the SGS
    blocks' own component-scoped design tokens (``--sgs-button-*``,
    ``--sgs-option-picker-*``, etc. — see MEMORY.md) are real and resolvable;
    a draft's own ``--primary``/``--border`` never is.

No block-slug literals. No import from a frozen tree (none exists — verified
2026-08-04, the only ``convert.py`` in the repo is the archived scratch copy
at ``.claude/scratch/converter-prototype/``, not on any import path).
"""
from __future__ import annotations

import json
import pathlib
import re
from typing import Any

# ---------------------------------------------------------------------------
# var(--name) reference extraction
# ---------------------------------------------------------------------------

_VAR_START_RE = re.compile(r"var\(\s*")
_NAME_CHARS = re.compile(r"[A-Za-z0-9_-]")


def find_var_references(value: str) -> list[str]:
    """Return every ``--name`` referenced by a ``var(...)`` call in ``value``.

    Scans EVERY ``var(`` occurrence (including nested fallback calls, e.g.
    ``var(--a, var(--wp--preset--color--primary))`` yields both ``a`` and
    ``wp--preset--color--primary``) — deliberately generous: a name inside a
    fallback is still a real reference that matters if the primary name is
    itself undefined. Not a full CSS-value parser; it only needs to find the
    ``--name`` token immediately following each ``var(``, which is all a
    ``var()`` call ever starts with.
    """
    if not isinstance(value, str) or "var(" not in value:
        return []
    names: list[str] = []
    for m in _VAR_START_RE.finditer(value):
        j = m.end()
        n = len(value)
        if value[j:j + 2] != "--":
            continue  # not a custom-property var() (shouldn't happen in valid CSS)
        k = j + 2
        while k < n and _NAME_CHARS.match(value[k]):
            k += 1
        name = value[j + 2:k]
        if name:
            names.append(name)
    return names


# ---------------------------------------------------------------------------
# Known-token loading (theme.json + theme-snapshot.json + bare-CSS-defined)
# ---------------------------------------------------------------------------

_CUSTOM_PROP_DEF_RE = re.compile(r"(?<![\w-])--([A-Za-z0-9_-]+)\s*:")

# Memoisation caches, keyed by repo_root — this data is stable for the life
# of a process (mirrors styling_helpers._RESOLUTION_CACHE_KEY's per-run
# memoisation shape, but keyed on filesystem inputs that don't change
# mid-run rather than per-section CSS text).
_BARE_CSS_CACHE: dict[str, frozenset[str]] = {}
_PRESET_SLUG_CACHE: dict[str, frozenset[str]] = {}


def _flatten_custom(obj: Any, prefix: str = "") -> list[str]:
    """Mirror WordPress's ``settings.custom`` → ``--wp--custom--{kebab-path}``
    flattening, camelCase-to-kebab per segment (WP's own ``_wp_array_to_
    css_var`` behaviour) — used only to build the informational preset-slug
    set (see module docstring: NOT used to gate ``wp--*`` refs, which are
    always accepted regardless of whether the specific slug is enumerated
    here)."""
    out: list[str] = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            kebab = re.sub(r"(?<!^)(?=[A-Z])", "-", str(k)).lower()
            seg = f"{prefix}--{kebab}" if prefix else kebab
            out.extend(_flatten_custom(v, seg))
    else:
        out.append(f"wp--custom--{prefix}")
    return out


def _theme_json_preset_slugs(theme_json_path: pathlib.Path) -> set[str]:
    try:
        data = json.loads(theme_json_path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return set()
    settings = data.get("settings") or {}
    out: set[str] = set()
    for entry in ((settings.get("color") or {}).get("palette") or []):
        if isinstance(entry, dict) and entry.get("slug"):
            out.add(f"wp--preset--color--{entry['slug']}")
    for entry in ((settings.get("color") or {}).get("gradients") or []):
        if isinstance(entry, dict) and entry.get("slug"):
            out.add(f"wp--preset--gradient--{entry['slug']}")
    for entry in ((settings.get("typography") or {}).get("fontSizes") or []):
        if isinstance(entry, dict) and entry.get("slug"):
            out.add(f"wp--preset--font-size--{entry['slug']}")
    for entry in ((settings.get("spacing") or {}).get("spacingSizes") or []):
        if isinstance(entry, dict) and entry.get("slug"):
            out.add(f"wp--preset--spacing--{entry['slug']}")
    out.update(_flatten_custom(settings.get("custom") or {}))
    return out


def _snapshot_preset_slugs(snapshot_path: pathlib.Path) -> set[str]:
    try:
        data = json.loads(snapshot_path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return set()
    settings = data.get("settings") or {}
    out: set[str] = set()
    for entry in ((settings.get("color") or {}).get("palette") or []):
        if isinstance(entry, dict) and entry.get("slug"):
            out.add(f"wp--preset--color--{entry['slug']}")
    out.update(_flatten_custom(settings.get("custom") or {}))
    return out


def known_preset_slugs(repo_root: pathlib.Path, client_slug: str = "") -> frozenset[str]:
    """Informational set of ``wp--*`` names theme.json/theme-snapshot.json
    actually declare (framework + the named client, when given). NOT used to
    gate a ``wp--*`` reference (those are always accepted — see module
    docstring); exposed so a finding/report can additionally note whether a
    ``wp--preset--*`` slug is a KNOWN one, for a human reviewing the advisory
    output, without that annotation ever becoming a fail condition.
    """
    key = f"{repo_root}::{client_slug}"
    cached = _PRESET_SLUG_CACHE.get(key)
    if cached is not None:
        return cached
    out: set[str] = set()
    theme_json = pathlib.Path(repo_root) / "theme" / "sgs-theme" / "theme.json"
    out |= _theme_json_preset_slugs(theme_json)
    if client_slug:
        snapshot = pathlib.Path(repo_root) / "sites" / client_slug / "theme-snapshot.json"
        out |= _snapshot_preset_slugs(snapshot)
    frozen = frozenset(out)
    _PRESET_SLUG_CACHE[key] = frozen
    return frozen


def _scan_bare_custom_properties(paths: list[pathlib.Path]) -> set[str]:
    out: set[str] = set()
    for p in paths:
        try:
            text = p.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for m in _CUSTOM_PROP_DEF_RE.finditer(text):
            name = m.group(1)
            if not name.startswith("wp--"):
                out.add(name)
    return out


def bare_defined_custom_properties(repo_root: pathlib.Path) -> frozenset[str]:
    """Every BARE (non ``wp--``) custom-property NAME some real ``.css`` file
    under ``theme/sgs-theme/`` or ``plugins/sgs-blocks/`` actually declares
    (``--name: ...``) — i.e. a genuinely resolvable component-scoped SGS
    design token (``--sgs-button-*`` etc.). Excludes ``node_modules`` /
    ``build`` cache noise is NOT applied — a compiled ``build/`` stylesheet is
    exactly as "real" a resolution source as ``src/``, since it is what
    actually ships. Memoised per ``repo_root`` (filesystem-stable for the
    life of a process).
    """
    key = str(repo_root)
    cached = _BARE_CSS_CACHE.get(key)
    if cached is not None:
        return cached
    root = pathlib.Path(repo_root)
    paths: list[pathlib.Path] = []
    for base in (root / "theme" / "sgs-theme", root / "plugins" / "sgs-blocks"):
        if not base.exists():
            continue
        for p in base.rglob("*.css"):
            if "node_modules" in p.parts:
                continue
            paths.append(p)
    frozen = frozenset(_scan_bare_custom_properties(paths))
    _BARE_CSS_CACHE[key] = frozen
    return frozen


def is_resolvable(name: str, bare_known: frozenset[str]) -> bool:
    """True if ``--{name}`` resolves against the target document.

    ``wp--*`` is ALWAYS accepted (see module docstring — the deliberate
    "advisory first" boundary: WordPress core generates that whole
    namespace and enumerating every possible generated name is out of
    scope). Any other name must be a genuinely-defined bare custom property
    (an SGS block's own component-scoped token) — never a draft-local name.
    """
    if name.startswith("wp--"):
        return True
    return name in bare_known


# ---------------------------------------------------------------------------
# Per-run configuration (mirrors styling_helpers.configure_colour_resolution_
# from_run's module-state pattern — same wiring precedent, entry.py calls
# both from the same call site).
# ---------------------------------------------------------------------------

_REPO_ROOT: pathlib.Path | None = None
_CLIENT_SLUG: str = ""
_BARE_KNOWN: frozenset[str] = frozenset()
_CONFIG_KEY: tuple | None = None


def configure_token_resolution_from_run(client_slug: str = "", repo_root: Any = None) -> None:
    """Install the per-run known-token state. Best-effort + memoised: a
    missing ``repo_root`` leaves the checker inert (``check_attrs`` returns
    no findings) rather than breaking conversion — mirrors every other
    optional-input service in this converter (colour resolution, button
    presets)."""
    global _REPO_ROOT, _CLIENT_SLUG, _BARE_KNOWN, _CONFIG_KEY
    key = (str(repo_root) if repo_root else "", client_slug or "")
    if key == _CONFIG_KEY:
        return
    _CONFIG_KEY = key
    _CLIENT_SLUG = client_slug or ""
    _REPO_ROOT = pathlib.Path(repo_root) if repo_root else None
    _BARE_KNOWN = bare_defined_custom_properties(_REPO_ROOT) if _REPO_ROOT else frozenset()


def reset_token_resolution() -> None:
    global _REPO_ROOT, _CLIENT_SLUG, _BARE_KNOWN, _CONFIG_KEY
    _REPO_ROOT = None
    _CLIENT_SLUG = ""
    _BARE_KNOWN = frozenset()
    _CONFIG_KEY = None


# ---------------------------------------------------------------------------
# css_rules "draft rule it came from" best-effort lookup
# ---------------------------------------------------------------------------

def _origin_selector(var_ref: str, css_rules: dict | None) -> str | None:
    """Best-effort: find a css_rules selector whose declarations literally
    contain ``var(--{var_ref}``. Advisory attribution only — a value can
    also originate from a state/hover pass, a client-snapshot button preset,
    or a DB-seeded default that never appears in ``css_rules`` verbatim, in
    which case this returns ``None`` and the caller reports "not traced to a
    single draft rule" rather than fabricating an origin.
    """
    if not css_rules:
        return None
    needle = f"var(--{var_ref}"
    for selector, decls in css_rules.items():
        if not isinstance(decls, dict):
            continue
        for prop, val in decls.items():
            if isinstance(val, str) and needle in val:
                return f"{selector} {{ {prop}: {val} }}"
    return None


# ---------------------------------------------------------------------------
# check_attrs — the actionable finding builder
# ---------------------------------------------------------------------------

def check_value(
    attr_name: str,
    value: Any,
    block_slug: str,
    css_rules: dict | None,
    bare_known: frozenset[str],
    _path: str = "",
) -> list[dict[str, Any]]:
    """Recurse into ``value`` (str / dict / list) and return one finding per
    unresolvable ``var(--name)`` reference. Each finding names the attribute
    (with a dotted path for a nested value, e.g. ``style.color.background``),
    the block, the offending reference, and — best-effort — the draft rule it
    came from.
    """
    findings: list[dict[str, Any]] = []
    path = f"{attr_name}.{_path}" if _path else attr_name
    if isinstance(value, str):
        for name in find_var_references(value):
            if is_resolvable(name, bare_known):
                continue
            findings.append({
                "block": block_slug,
                "attribute": path,
                "reference": f"var(--{name})",
                "value": value,
                "origin_rule": _origin_selector(name, css_rules),
            })
    elif isinstance(value, dict):
        for k, v in value.items():
            findings.extend(
                check_value(attr_name, v, block_slug, css_rules, bare_known, f"{_path}.{k}" if _path else k)
            )
    elif isinstance(value, list):
        for i, v in enumerate(value):
            findings.extend(
                check_value(attr_name, v, block_slug, css_rules, bare_known, f"{_path}[{i}]" if _path else f"[{i}]")
            )
    return findings


def check_attrs(attrs: dict, block_slug: str, css_rules: dict | None = None) -> list[dict[str, Any]]:
    """Check every value in an already-merged block ``attrs`` dict.

    Uses whatever known-token state ``configure_token_resolution_from_run``
    last installed; inert (returns ``[]``) when no repo_root has been
    configured (e.g. a test harness that never calls it) — this is
    deliberately fail-open (never blocks conversion, see module docstring).
    """
    if not attrs:
        return []
    findings: list[dict[str, Any]] = []
    for attr_name, value in attrs.items():
        findings.extend(check_value(attr_name, value, block_slug, css_rules, _BARE_KNOWN))
    return findings


# ---------------------------------------------------------------------------
# Collector — mirrors content_gap_collector.py's clear/record/flush lifecycle
# exactly, so entry.py wires both the same way.
# ---------------------------------------------------------------------------

_FINDINGS: list[dict[str, Any]] = []


def clear() -> None:
    """Reset the accumulator. Call once at the start of a convert_section() run."""
    _FINDINGS.clear()


def record_findings(findings: list[dict[str, Any]]) -> None:
    _FINDINGS.extend(findings)


def flush() -> list[dict[str, Any]]:
    """Return every finding recorded since the last ``clear()``, and clear."""
    out = list(_FINDINGS)
    _FINDINGS.clear()
    return out
