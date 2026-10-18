#!/usr/bin/env python3
"""motion_param_reads.py: every effect parameter must be READ by that effect's runtime (FR-38A-48).

A parameter that is scoped, written by a preset or shown by the inspector but never read by the
effect's runtime file is a control that does nothing: the page looks configured and renders the
default. This module reports each such parameter as `<effect>: <param> not read by <file>`.

Parameter source:
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
It is the field's `dataAttr`; only a field that names neither a `dataAttr`
nor a `cssProperty` falls back to `<slug>-<param-kebab>`.

Run: python plugins/sgs-blocks/scripts/motion_param_reads.py --report | --self-test
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

_PLUGIN_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
import motion_gate_allowlist as allowlist  # noqa: E402  (scripts/motion_gate_allowlist.py)

GATE = "motion-param-reads"
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
    schema = parse_schema(root)
    findings: list[Finding] = []
    seen: set[tuple[str, str]] = set()
    shared_css = "\n".join(_read(p) for p in (root / "assets" / "css" / n for n in SHARED_CSS) if p.is_file())
    strip = {".js": _strip_js, ".php": _strip_php}
    for slug, params in schema.items():
        files = reader_files(root, slug)
        text = "\n".join(strip.get(p.suffix, str)(_read(p)) for p in files)
        label, with_css = _reader_label(root, slug, files), text + "\n" + shared_css
        for names in params.values():
            for param, suffix, css in names:
                if (slug, param) in seen:
                    continue
                suffix = suffix or ("" if css else f"{slug}-{_kebab(param)}")
                if not _is_read(text, suffix, None, slug) and not (css and (css in with_css or css in _helper_css_reads(text))):
                    seen.add((slug, param))
                    findings.append(Finding(slug, param, label, "schema"))
    return findings


def gate_findings(root: Path = _PLUGIN_ROOT, repo_root: Path | None = None) -> list[str]:
    entries, errors = allowlist.load(repo_root or _PLUGIN_ROOT.parent.parent, GATE)
    allowed = {entry["pattern"] for entry in entries}
    findings = find_unread(root)
    lines = [f"allow-list: {error}" for error in errors]
    lines += [f"{f.line()}" for f in findings if f.effect not in allowed]
    unread = {f.effect for f in findings}
    lines += [f"allow-list: the entry for {effect!r} is stale (nothing of it is unread now), so delete it"
              for effect in sorted(allowed - unread)]
    return lines


FIXTURE_SCHEMA = {
    "x-sgs-effects": {s: {"values": f"#/$defs/{s}V"} for s in ("demo", "e2", "e3")},
    "$defs": {s + "V": {"properties": {"gain": {"x-sgs-field": {"dataAttr": f"data-sgs-fx-{s}-gain"}}}} for s in ("demo", "e2", "e3")},
}


def _build_fixture(root: Path) -> None:
    effects = root / "src" / "shared" / "effects"
    effects.mkdir(parents=True)
    (root / "schemas").mkdir()
    (root / "assets" / "css").mkdir(parents=True)
    (root / "schemas" / "motion.schema.json").write_text(json.dumps(FIXTURE_SCHEMA), encoding="utf-8")
    for s in ("demo", "e2", "e3"):
        (effects / f"fx-{s}.js").write_text(f"el.getAttribute( 'data-sgs-fx-{s}-gain' );\n// data-sgs-fx-{s}-ghost only in a comment\n", encoding="utf-8")


def self_test() -> int:
    tag = "[motion-param-reads --self-test]"
    tmp = Path(tempfile.mkdtemp(prefix="motion-param-reads-"))
    try:
        _build_fixture(tmp)
        clean = find_unread(tmp)
        if clean:
            print(f"{tag} FAIL: the clean fixture reported {[f.line() for f in clean]}")
            return 1
        schema_path = tmp / "schemas" / "motion.schema.json"
        planted = json.loads(schema_path.read_text(encoding="utf-8"))
        planted["$defs"]["demoV"]["properties"]["ghost"] = {"x-sgs-field": {"dataAttr": "data-sgs-fx-demo-ghost"}}
        schema_path.write_text(json.dumps(planted), encoding="utf-8")
        got = [f.line() for f in find_unread(tmp)]
        want = "demo: ghost not read by src/shared/effects/fx-demo.js"
        if want not in got:
            print(f"{tag} FAIL: planted unread parameter NOT reported (got {got}); a comment mention must not count as a read")
            return 1
        print(f"{tag} planted unread parameter reported: {want}")
        js = tmp / "src" / "shared" / "effects" / "fx-demo.js"
        js.write_text(js.read_text(encoding="utf-8") + "el.getAttribute( 'data-sgs-fx-demo-ghost' );\n", encoding="utf-8")
        got = [f.line() for f in find_unread(tmp)]
        if got:
            print(f"{tag} FAIL: a planted read did not clear the finding (got {got})")
            return 1
        print(f"{tag} planted read clears it")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print(f"{tag} PASS")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Effect parameters must be read by their runtime (FR-38A-48).")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true", help="Exit 1 on any unread parameter.")
    mode.add_argument("--self-test", action="store_true", help="Planted unread parameter must go red, a planted read must clear it.")
    args = parser.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")
    if args.self_test:
        return self_test()
    lines = gate_findings()
    for line in lines:
        print(line)
    print(f"[motion-param-reads] {len(lines)} violation(s).")
    return 1 if lines else 0


if __name__ == "__main__":
    raise SystemExit(main())
