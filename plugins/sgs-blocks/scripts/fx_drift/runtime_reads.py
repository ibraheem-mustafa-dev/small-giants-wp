#!/usr/bin/env python3
"""runtime_reads.py: every effect parameter must be READ by that effect's runtime (FR-38A-48).

A parameter that is scoped, written by a preset or shown by the inspector but never read by the
effect's runtime file is a control that does nothing: the page looks configured and renders the
default. This module reports each such parameter as `<effect>: <param> not read by <file>`.

Parameter sources (each finding carries its source):
  scope    `includes/fx-attributes.php::sgs_fx_effect_param_scope`, mapped to the data attribute
           by `FX_ATTR_MAP`.
  preset   `includes/fx-attributes.php::sgs_fx_presets` (attribute keys) and the `values` keys of
           the effect rows in `scripts/data/motion-presets.json`.
  schema   every property of the effect's `values` def in `schemas/motion.schema.json`
           (`x-sgs-effects`), which is what the inspector renders.

Reader files for an effect `<slug>`: `src/shared/effects/fx-<slug>.js`, `<slug>.js`,
`src/shared/effects/gsap/fx-<slug>.js` and the stylesheet `assets/css/fx-<slug>.css`.

Reader tokens (after comments are stripped):
  * the full data attribute `data-sgs-fx-<suffix>`, where for a schema parameter `<suffix>` is the field's
    `x-sgs-field.dataAttr` exactly as stored (the shared Tier G names such as `data-sgs-fx-scrub` carry no
    effect prefix);
  * the bare suffix as a quoted string (`stringParam( el, 'hold', ... )`);
  * the dataset key `sgsFx<Suffix>`;
  * the custom property the field's `x-sgs-field.cssProperty` names, in the effect's files or in the shared
    channel stylesheets (`SHARED_CSS`).
For scope and preset attributes the suffix is the `FX_ATTR_MAP` data attribute minus `data-sgs-fx-`.
For schema and preset-JSON parameters it is the field's `dataAttr`; only a field that names neither a `dataAttr`
nor a `cssProperty` falls back to `<slug>-<param-kebab>`.

Run: python plugins/sgs-blocks/scripts/fx_drift/runtime_reads.py --report | --self-test
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

_PLUGIN_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import motion_gate_allowlist as allowlist  # noqa: E402  (scripts/motion_gate_allowlist.py)

GATE = "fx-list-drift"
_ATTR_PREFIX = "data-sgs-fx-"
# Stylesheets shared by every effect: a custom property an effect's field names may be consumed here (the section 10 channels).
SHARED_CSS = ("motion.css", "motion-triggers.css")


class VacuousParse(Exception):
    """A source parsed to nothing: every comparison would be empty-vs-empty."""


@dataclass(frozen=True)
class Finding:
    effect: str
    param: str
    reader: str
    source: str

    def line(self) -> str:
        return f"{self.effect}: {self.param} not read by {self.reader}"


def _read(path: Path) -> str:
    if not path.is_file():
        raise VacuousParse(f"missing source: {path}")
    return path.read_text(encoding="utf-8")


def _strip_js(text: str) -> str:
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    return re.sub(r"(?<![:\w'\"`])//.*$", "", text, flags=re.M)


def _strip_php(text: str) -> str:
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    return re.sub(r"^\s*(//|#).*$", "", text, flags=re.M)


def _kebab(name: str) -> str:
    return re.sub(r"(?<=[a-z0-9])([A-Z])", r"-\1", name).lower()


def _camel_suffix(suffix: str) -> str:
    return "".join(part[:1].upper() + part[1:] for part in suffix.split("-"))


def _php_function_body(text: str, name: str, path: Path) -> str:
    match = re.search(r"function\s+" + re.escape(name) + r"\s*\([^)]*\)\s*:\s*array\s*\{", text)
    if not match:
        raise VacuousParse(f"{path}: function {name}() not found")
    depth, i = 1, match.end()
    while i < len(text) and depth:
        depth += {"{": 1, "}": -1}.get(text[i], 0)
        i += 1
    return text[match.end():i - 1]


def _nested_arrays(body: str) -> dict[str, str]:
    """`'key' => array( ... )` blocks at the top level of an array body, balanced."""
    out: dict[str, str] = {}
    for match in re.finditer(r"'([a-z0-9-]+)'\s*=>\s*array\s*\(", body):
        depth, i = 1, match.end()
        while i < len(body) and depth:
            depth += {"(": 1, ")": -1}.get(body[i], 0)
            i += 1
        out[match.group(1)] = body[match.end():i - 1]
    return out


def parse_attr_map(root: Path) -> dict[str, str]:
    path = root / "includes" / "fx-attributes.php"
    text = _strip_php(_read(path))
    head = text.split("function sgs_fx_presets", 1)[0]
    pairs = dict(re.findall(r"'(fx[A-Za-z0-9]*)'\s*=>\s*'(data-[a-z0-9-]+)'", head))
    if len(pairs) < 10:
        raise VacuousParse(f"{path}: FX_ATTR_MAP parsed {len(pairs)} rows (floor 10)")
    return pairs


def parse_scope(root: Path) -> dict[str, list[str]]:
    path = root / "includes" / "fx-attributes.php"
    body = _php_function_body(_strip_php(_read(path)), "sgs_fx_effect_param_scope", path)
    scope = {e: re.findall(r"'(fx[A-Za-z0-9]*)'", b) for e, b in _nested_arrays(body).items()}
    if len(scope) < 3:
        raise VacuousParse(f"{path}: sgs_fx_effect_param_scope() parsed {len(scope)} rows (floor 3)")
    return scope


def parse_php_presets(root: Path) -> dict[str, list[str]]:
    path = root / "includes" / "fx-attributes.php"
    body = _php_function_body(_strip_php(_read(path)), "sgs_fx_presets", path)
    out: dict[str, list[str]] = {}
    for effect, levels in _nested_arrays(body).items():
        keys: list[str] = []
        for level_body in _nested_arrays(levels).values():
            keys += [k for k in re.findall(r"'(fx[A-Za-z0-9]*)'\s*=>", level_body) if k not in keys]
        out[effect] = keys
    if len(out) < 3:
        raise VacuousParse(f"{path}: sgs_fx_presets() parsed {len(out)} effects (floor 3)")
    return out


def parse_json_presets(root: Path) -> dict[str, list[str]]:
    path = root / "scripts" / "data" / "motion-presets.json"
    rows = json.loads(_read(path)).get("presets", [])
    out: dict[str, list[str]] = {}
    for row in rows:
        if row.get("effect"):
            keys = out.setdefault(row["effect"], [])
            keys += [k for k in row.get("values", {}) if k not in keys]
    if len(out) < 3:
        raise VacuousParse(f"{path}: effect preset rows parsed {len(out)} effects (floor 3)")
    return out


def _field_names(field: dict) -> tuple[str | None, str | None]:
    """The exact data attribute (minus `data-sgs-fx-`) and custom property a field names."""
    attr = field.get("dataAttr")
    suffix = attr.removeprefix(_ATTR_PREFIX) if isinstance(attr, str) and attr.startswith(_ATTR_PREFIX) else None
    return suffix, field.get("cssProperty") or None


Names = list[tuple[str, str | None, str | None]]


def _param_names(param: str, node: dict, defs: dict) -> Names:
    """`[(label, dataAttr suffix, cssProperty)]` of one property; a composite (a `$ref` to an object def whose own
    properties carry the fields, such as split-reveal's `from`) yields one row per child, labelled `param.child`."""
    if node.get("x-sgs-field"):
        return [(param, *_field_names(node["x-sgs-field"]))]
    child = defs.get(str(node.get("$ref", "")).rsplit("/", 1)[-1], {}).get("properties")
    if child:
        return [row for key, sub in child.items() for row in _param_names(f"{param}.{key}", sub, defs)]
    return [(param, None, None)]


def parse_schema(root: Path) -> dict[str, dict[str, Names]]:
    """effect slug -> {param: [(label, dataAttr suffix or None, cssProperty or None)]}, from the effect's values def."""
    path = root / "schemas" / "motion.schema.json"
    schema = json.loads(_read(path))
    effects, defs = schema.get("x-sgs-effects", {}), schema.get("$defs", {})
    out: dict[str, dict[str, Names]] = {}
    for slug, entry in effects.items():
        values = defs.get(str(entry.get("values", "")).rsplit("/", 1)[-1], {})
        props = values.get("properties", {})
        out[slug] = {p: _param_names(p, d, defs) for p, d in props.items()}
    if len(out) < 3 or not any(out.values()):
        raise VacuousParse(f"{path}: x-sgs-effects parsed {len(out)} effects with no properties")
    return out


def reader_files(root: Path, slug: str) -> list[Path]:
    effects = root / "src" / "shared" / "effects"
    candidates = [effects / f"fx-{slug}.js", effects / f"{slug}.js",
                  effects / "gsap" / f"fx-{slug}.js", root / "assets" / "css" / f"fx-{slug}.css",
                  root / "includes" / f"fx-{slug}.php"]
    # Helper modules split from the runtime (`fx-<slug>-*.js`, `<slug>-*.js`) are part of it.
    for folder in (effects, effects / "gsap"):
        for pattern in (f"fx-{slug}-*.js", f"{slug}-*.js"):
            candidates += sorted(folder.glob(pattern))
    return [p for p in candidates if p.is_file()]


def _reader_label(root: Path, slug: str, files: list[Path]) -> str:
    if files:
        return ", ".join(p.relative_to(root).as_posix() for p in files)
    return f"no runtime file (src/shared/effects/**/fx-{slug}.js or assets/css/fx-{slug}.css)"


# `src/shared/effects/loop-timing.js::readLoopTiming( el, name )` reads these four custom properties for a loop.
LOOP_TIMING_KEYS = ("period", "phase", "easing", "direction")


# Shared `provider.js` helpers read the Tier G attributes themselves: `resolveStart( el, ... )` reads
# `data-sgs-fx-start`, `resolveScrub( el )` reads `data-sgs-fx-scrub`.
HELPER_ATTRS = {"resolveStart": "start", "resolveScrub": "scrub"}


def _helper_css_reads(text: str) -> set[str]:
    """Custom properties a runtime reads through a shared helper rather than by name."""
    names = re.findall(r"readLoopTiming\(\s*\w+\s*,\s*['\"]([a-z0-9-]+)['\"]", text)
    return {f"--sgs-{name}-{key}" for name in names for key in LOOP_TIMING_KEYS}


def _prefix_tail_read(text: str, suffix: str) -> bool:
    """A runtime that holds an attribute prefix once (`'data-sgs-fx-ken-burns-'`, `'data-sgs-fx-wave-' . $slot`) and
    appends each parameter's tail from a list (`PREFIX + 'mode'`, `array( 'base', '1' )`)."""
    for cut in (m.end() for m in re.finditer("-", suffix)):
        prefix, tail = _ATTR_PREFIX + suffix[:cut], suffix[cut:]
        if re.search(r"['\"`]" + re.escape(prefix) + r"['\"`]", text)                 and re.search(r"['\"`]" + re.escape(tail) + r"['\"`]", text):
            return True
    return False


def _is_read(text: str, suffix: str, css_property: str | None, slug: str = "") -> bool:
    if suffix:
        if any(name + "(" in text and suffix == attr for name, attr in HELPER_ATTRS.items()):
            return True
        # The whole attribute name: `data-sgs-fx-end` is not a read of `data-sgs-fx-end-offset`.
        if re.search(re.escape(_ATTR_PREFIX + suffix) + r"(?![A-Za-z0-9-])", text) or f"sgsFx{_camel_suffix(suffix)}" in text:
            return True
        if re.search(r"['\"`]" + re.escape(suffix) + r"['\"`]", text):
            return True
        if _prefix_tail_read(text, suffix):
            return True
    return bool(css_property) and css_property in text


def find_unread(root: Path = _PLUGIN_ROOT) -> list[Finding]:
    attr_map = parse_attr_map(root)
    scope, php_presets = parse_scope(root), parse_php_presets(root)
    json_presets, schema = parse_json_presets(root), parse_schema(root)
    findings: list[Finding] = []
    seen: set[tuple[str, str]] = set()
    cache: dict[str, tuple[str, str, str]] = {}
    shared_css = "\n".join(_read(p) for p in (root / "assets" / "css" / n for n in SHARED_CSS) if p.is_file())

    def reader(slug: str) -> tuple[str, str, str]:
        if slug not in cache:
            files = reader_files(root, slug)
            strip = {".js": _strip_js, ".php": _strip_php}
            text = "\n".join(strip.get(p.suffix, str)(_read(p)) for p in files)
            cache[slug] = (_reader_label(root, slug, files), text, text + "\n" + shared_css)
        return cache[slug]

    def check(slug: str, param: str, suffix: str, css: str | None, source: str) -> None:
        if (slug, param) in seen:
            return
        label, text, with_css = reader(slug)
        if not _is_read(text, suffix, None, slug) and not (css and (css in with_css or css in _helper_css_reads(text))):
            seen.add((slug, param))
            findings.append(Finding(slug, param, label, source))

    for slug, keys in scope.items():
        for key in keys:
            check(slug, key, attr_map.get(key, _ATTR_PREFIX + _kebab(key[2:])).removeprefix(_ATTR_PREFIX), None, "scope")
    for slug, keys in php_presets.items():
        for key in keys:
            check(slug, key, attr_map.get(key, _ATTR_PREFIX + _kebab(key[2:])).removeprefix(_ATTR_PREFIX), None, "preset")
    for slug, keys in json_presets.items():
        for key in keys:
            for label, suffix, css in (schema.get(slug) or {}).get(key) or [(key, None, None)]:
                check(slug, label, suffix or ("" if css else f"{slug}-{_kebab(key)}"), css, "preset")
    for slug, params in schema.items():
        for names in params.values():
            for label, suffix, css in names:
                check(slug, label, suffix or ("" if css else f"{slug}-{_kebab(label)}"), css, "schema")
    return findings


def gate_findings(root: Path = _PLUGIN_ROOT, repo_root: Path | None = None) -> list[str]:
    """What `check-fx-list-drift.py --check` reports (invariant I10): every unread parameter of an effect that has no
    allow-list entry, every malformed or landed-unit entry, and every entry whose effect now has nothing unread. An
    entry (`gate` "fx-list-drift", `pattern` the effect slug, `delete_in_unit` the unit that builds its runtime)
    exempts that effect only until its unit lands (`motion_gate_allowlist.load`)."""
    entries, errors = allowlist.load(repo_root or _PLUGIN_ROOT.parent.parent, GATE)
    allowed = {entry["pattern"] for entry in entries}
    findings = find_unread(root)
    lines = [f"allow-list: {error}" for error in errors]
    lines += [f"{f.line()}   [{f.source}]" for f in findings if f.effect not in allowed]
    unread = {f.effect for f in findings}
    lines += [f"allow-list: the entry for {effect!r} is stale (nothing of it is unread now), so delete it"
              for effect in sorted(allowed - unread)]
    return lines


def report(root: Path = _PLUGIN_ROOT) -> int:
    findings = find_unread(root)
    for f in findings:
        print(f"{f.line()}   [{f.source}]")
    print(f"[runtime-reads] {len(findings)} unread parameter(s) across "
          f"{len({f.effect for f in findings})} effect(s).")
    return 0


# ---------------------------------------------------------------------------
# --self-test: a clean fixture reports nothing; a planted unread parameter is reported.
# ---------------------------------------------------------------------------

_FIXTURE_PHP = """<?php
const FX_ATTR_MAP = array(
	'fxDemoAlpha' => 'data-sgs-fx-demo-alpha',
	'fxDemoBeta'  => 'data-sgs-fx-demo-beta',
	'fxA' => 'data-sgs-fx-a', 'fxB' => 'data-sgs-fx-b', 'fxC' => 'data-sgs-fx-c',
	'fxD' => 'data-sgs-fx-d', 'fxE' => 'data-sgs-fx-e', 'fxF' => 'data-sgs-fx-f',
	'fxG' => 'data-sgs-fx-g', 'fxH' => 'data-sgs-fx-h',
);
function sgs_fx_presets(): array {
	return array(
		'demo' => array( 'subtle' => array( 'fxDemoAlpha' => 1 ) ),
		'e2'   => array( 'subtle' => array( 'fxA' => 1 ) ),
		'e3'   => array( 'subtle' => array( 'fxB' => 1 ) ),
	);
}
function sgs_fx_effect_param_scope(): array {
	return array(
		'demo' => array( 'fxDemoAlpha', 'fxDemoBeta' ),
		'e2'   => array( 'fxA' ),
		'e3'   => array( 'fxB' ),
	);
}
"""

_FIXTURE_PRESETS = {"presets": [{"effect": e, "values": {"gain": 1}} for e in ("demo", "e2", "e3")]}


def _fixture_schema() -> dict:
    def values(extra: dict) -> dict:
        return {"properties": {"gain": {"x-sgs-field": {"cssProperty": None}}, **extra}}
    return {
        "x-sgs-effects": {s: {"values": f"#/$defs/{s}V"} for s in ("demo", "e2", "e3")},
        "$defs": {"demoV": values({"tint": {"x-sgs-field": {"cssProperty": "--demo-tint"}}}),
                  "e2V": values({}), "e3V": values({})},
    }


def _build_fixture(root: Path) -> None:
    (root / "includes").mkdir(parents=True)
    (root / "schemas").mkdir()
    (root / "scripts" / "data").mkdir(parents=True)
    (root / "src" / "shared" / "effects").mkdir(parents=True)
    (root / "assets" / "css").mkdir(parents=True)
    (root / "includes" / "fx-attributes.php").write_text(_FIXTURE_PHP, encoding="utf-8")
    (root / "schemas" / "motion.schema.json").write_text(json.dumps(_fixture_schema()), encoding="utf-8")
    (root / "scripts" / "data" / "motion-presets.json").write_text(json.dumps(_FIXTURE_PRESETS), encoding="utf-8")
    effects = root / "src" / "shared" / "effects"
    (effects / "fx-demo.js").write_text(
        "const a = el.getAttribute( 'data-sgs-fx-demo-alpha' );\n"
        "const b = param( el, 'demo-beta' );\n"
        "const g = el.dataset.sgsFxDemoGain;\n"
        "// data-sgs-fx-demo-ghost is only in a comment\n", encoding="utf-8")
    (root / "assets" / "css" / "fx-demo.css").write_text(".x { color: var(--demo-tint); }\n", encoding="utf-8")
    (effects / "fx-e2.js").write_text("el.getAttribute('data-sgs-fx-a'); el.dataset.sgsFxE2Gain;\n", encoding="utf-8")
    (effects / "fx-e3.js").write_text("el.getAttribute('data-sgs-fx-b'); el.dataset.sgsFxE3Gain;\n", encoding="utf-8")


def self_test(detector=find_unread) -> int:
    tag = "[runtime-reads --self-test]"
    tmp = Path(tempfile.mkdtemp(prefix="runtime-reads-"))
    try:
        _build_fixture(tmp)
        clean = detector(tmp)
        if clean:
            print(f"{tag} FAIL: the clean fixture reported {[f.line() for f in clean]}")
            return 1
        print(f"{tag} clean fixture: 0 findings, OK")

        schema_path = tmp / "schemas" / "motion.schema.json"
        planted = json.loads(schema_path.read_text(encoding="utf-8"))
        planted["$defs"]["demoV"]["properties"]["unreadPlant"] = {"x-sgs-field": {"cssProperty": None}}
        schema_path.write_text(json.dumps(planted), encoding="utf-8")
        got = [f.line() for f in detector(tmp)]
        want = "demo: unreadPlant not read by src/shared/effects/fx-demo.js, assets/css/fx-demo.css"
        if want not in got:
            print(f"{tag} FAIL: planted schema parameter NOT reported (got {got})")
            return 1
        print(f"{tag} planted schema parameter: reported as '{want}', OK")

        _build_fixture_restore(tmp)
        php = tmp / "includes" / "fx-attributes.php"
        php.write_text(php.read_text(encoding="utf-8").replace(
            "'e2'   => array( 'fxA' ),\n\t\t'e3'", "'e2'   => array( 'fxA', 'fxC' ),\n\t\t'e3'"), encoding="utf-8")
        got = [f.line() for f in detector(tmp)]
        if not any(line.startswith("e2: fxC not read by") for line in got):
            print(f"{tag} FAIL: planted scoped parameter NOT reported (got {got})")
            return 1
        print(f"{tag} planted scoped parameter: reported, OK")
        _build_fixture_restore(tmp)
        if _gate_case(tmp, tag):
            return 1
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print(f"{tag} PASS: clean fixture silent, planted schema and scoped parameters reported.")
    return 0


def _gate_case(tmp: Path, tag: str) -> int:
    """The allow-list scoping: an unlisted unread effect is reported, a listed one is exempt, a stale entry fails."""
    repo = tmp / "repo"
    data = repo / allowlist.ALLOW_REL.parent
    data.mkdir(parents=True)
    plant = json.loads((tmp / "schemas" / "motion.schema.json").read_text(encoding="utf-8"))
    plant["$defs"]["demoV"]["properties"]["unreadPlant"] = {"x-sgs-field": {"cssProperty": None}}
    (tmp / "schemas" / "motion.schema.json").write_text(json.dumps(plant), encoding="utf-8")
    entry = {"gate": GATE, "pattern": "demo", "reason": "self-test", "delete_in_unit": "M9.9"}
    (repo / allowlist.ALLOW_REL).write_text("[]", encoding="utf-8")
    if not any(line.startswith("demo: unreadPlant") for line in gate_findings(tmp, repo)):
        print(f"{tag} FAIL: an unread parameter with no allow-list entry was NOT reported")
        return 1
    (repo / allowlist.ALLOW_REL).write_text(json.dumps([entry]), encoding="utf-8")
    if gate_findings(tmp, repo):
        print(f"{tag} FAIL: an allow-listed effect was still reported: {gate_findings(tmp, repo)}")
        return 1
    _build_fixture_restore(tmp)
    if not any("stale" in line for line in gate_findings(tmp, repo)):
        print(f"{tag} FAIL: an allow-list entry for a fully read effect was NOT reported as stale")
        return 1
    print(f"{tag} allow-list: unlisted reported, listed exempt, stale entry reported, OK")
    return 0


def _build_fixture_restore(root: Path) -> None:
    """Reset the schema and PHP to the clean fixture before the scope plant."""
    (root / "schemas" / "motion.schema.json").write_text(json.dumps(_fixture_schema()), encoding="utf-8")
    (root / "includes" / "fx-attributes.php").write_text(_FIXTURE_PHP, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Effect parameters must be read by their runtime (FR-38A-48).")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--report", action="store_true", help="List every unread parameter; exit 0.")
    mode.add_argument("--self-test", action="store_true", help="Clean fixture silent, planted parameter reported.")
    args = parser.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")
    return self_test() if args.self_test else report()


if __name__ == "__main__":
    raise SystemExit(main())
