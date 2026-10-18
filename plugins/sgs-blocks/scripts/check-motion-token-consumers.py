#!/usr/bin/env python3
"""check-motion-token-consumers.py — motion tokens and their readers agree (Spec 38A section 7, FR-38A-14, FR-38A-15).

THE TOKENS: the keys of `x-sgs-tokens` in `plugins/sgs-blocks/schemas/motion.schema.json` (key, cssVar, band), held as
`settings.custom.<family>.<key>` in the framework `theme/sgs-theme/theme.json`. Nothing here hard-codes a key or a band.

WHAT --check ASSERTS
  present     theme.json carries every schema token, and its cssVar is `--wp--custom--<family>--<key>`
  consumers   every `--wp--custom--<motion family>--<key>` read in plugins/sgs-blocks and theme/sgs-theme CSS, PHP and
              JS (and theme.json styles) names a token theme.json declares
  readers     every motion token in theme.json has at least one reader, or a live allow-list entry
              (`plugins/sgs-blocks/scripts/data/motion-gate-allowlist.json`, a JSON array of
              {gate:"motion-token-consumers", pattern:<key>, reason, delete_in_unit}); an entry whose token already
              has a reader is reported as stale (a note, not a failure). A reader is any of three sources:
                css     a stylesheet, PHP or JS source reads its `--wp--custom--` var() (the consumers scan above)
                preset  `plugins/sgs-blocks/scripts/data/motion-presets.json` stamps it as `token:<family>.<key>`
                offer   a schema field type offers it: `$defs.tokenReference` lists it and a field type that
                        references tokenReference accepts it (its `pattern`, or every listed token when it has none);
                        the renderer resolves each stored token reference to its var(), so its collected CSS reads it

WHAT --bands ASSERTS
  every token with a band holds a theme.json value inside it. Band kinds: time (ms or s), length (px),
  cubic-bezier (x1Max, y1Min, y2Equals), linear-overshoot (the highest linear() stop against peakMin and peakMax) and
  transition-pair (`<duration> <easing>` equal to the two tokens it names). Only theme.json is checked: a client
  snapshot carries its own draft's values and may sit outside a band (snapshot_motion_tokens.py).

--self-test copies the files these checks read into a temp folder and plants, one at a time, a consumer of
`--wp--custom--duration--nope` and an out-of-band theme value; it exits 0 only when the clean copy passes both checks
and each plant fails.

Run from the repo root:  python plugins/sgs-blocks/scripts/check-motion-token-consumers.py --check
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
import tempfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, str(Path(__file__).resolve().parent))
import motion_gate_allowlist as allowlist  # noqa: E402
import snapshot_motion_tokens as motion  # noqa: E402

REPO = motion.REPO_ROOT
SCHEMA_REL = Path("plugins/sgs-blocks/schemas/motion.schema.json")
THEME_REL = Path("theme/sgs-theme/theme.json")
ALLOW_REL = Path("plugins/sgs-blocks/scripts/data/motion-gate-allowlist.json")
PRESETS_REL = Path("plugins/sgs-blocks/scripts/data/motion-presets.json")
TOKEN_REF_DEF = "#/$defs/tokenReference"
TOKEN_REF = re.compile(r"-?token:([a-z0-9-]+\.[a-z0-9-]+)")
SCAN_ROOTS = (Path("plugins/sgs-blocks"), Path("theme/sgs-theme"))
SCAN_EXT = {".css", ".scss", ".php", ".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx"}
SKIP_DIRS = {"node_modules", "build", "vendor", ".phpunit.cache", "tests", "test", "__tests__", "schemas"}
GATE = "motion-token-consumers"
BLOCK_COMMENT = re.compile(r"/\*.*?\*/", re.S)
NUMBER = r"-?\d+(?:\.\d+)?"


def load_tokens(root: Path) -> dict[str, dict]:
    return motion.motion_token_table(root / SCHEMA_REL)


def theme_custom(root: Path) -> dict:
    data = json.loads((root / THEME_REL).read_text(encoding="utf-8"))
    return (data.get("settings") or {}).get("custom") or {}


def theme_value(custom: dict, key: str) -> str | None:
    node: object = custom
    for part in key.split("."):
        if not isinstance(node, dict) or part not in node:
            return None
        node = node[part]
    return node if isinstance(node, str) else None


def scan_files(root: Path) -> list[Path]:
    """Every CSS, PHP and JS source under the scan roots (relative paths), build output and vendored code excluded."""
    found: list[Path] = []
    for scan_root in SCAN_ROOTS:
        base = root / scan_root
        if not base.is_dir():
            continue
        for path in base.rglob("*"):
            rel = path.relative_to(root)
            if path.is_file() and path.suffix in SCAN_EXT and not (set(rel.parts) & SKIP_DIRS):
                found.append(rel)
    return found


def read_text(path: Path) -> str:
    return BLOCK_COMMENT.sub("", path.read_text(encoding="utf-8", errors="replace"))


def theme_styles_text(root: Path) -> str:
    """theme.json with settings.custom removed, so a token declaring itself is not counted as its own reader."""
    data = json.loads((root / THEME_REL).read_text(encoding="utf-8"))
    (data.get("settings") or {}).pop("custom", None)
    return json.dumps(data)


def consumer_pattern(families: set[str]) -> re.Pattern[str]:
    alternatives = "|".join(sorted(re.escape(f) for f in families))
    return re.compile(r"--wp--custom--(" + alternatives + r")--([a-z0-9]+(?:-[a-z0-9]+)*)")


def find_readers(root: Path, tokens: dict[str, dict]) -> dict[str, list[str]]:
    """Token key (dotted) -> the files reading it; a key that is not a token is keyed as found."""
    pattern = consumer_pattern({key.split(".")[0] for key in tokens})
    readers: dict[str, list[str]] = {}
    sources = [(str(rel), read_text(root / rel)) for rel in scan_files(root)]
    sources.append((str(THEME_REL) + " (styles)", theme_styles_text(root)))
    for name, text in sources:
        for family, key in set(pattern.findall(text)):
            readers.setdefault(f"{family}.{key}", []).append(name)
    return readers


def preset_readers(root: Path) -> set[str]:
    """Token keys the motion presets stamp as `token:<family>.<key>` (a leading minus negates, same token)."""
    path = root / PRESETS_REL
    if not path.is_file():
        return set()
    return set(TOKEN_REF.findall(path.read_text(encoding="utf-8")))


def _offers_token_reference(node: dict) -> bool:
    if node.get("$ref") == TOKEN_REF_DEF:
        return True
    return any(isinstance(part, dict) and part.get("$ref") == TOKEN_REF_DEF for part in node.get("allOf") or [])


def offered_tokens(root: Path) -> set[str]:
    """Token keys a schema field type offers: listed by $defs.tokenReference and accepted by a field type's pattern."""
    defs = json.loads((root / SCHEMA_REL).read_text(encoding="utf-8")).get("$defs") or {}
    listed = [ref for ref in (defs.get("tokenReference") or {}).get("enum") or [] if isinstance(ref, str)]
    offered: set[str] = set()

    def walk(node: object) -> None:
        if isinstance(node, list):
            for item in node:
                walk(item)
            return
        if not isinstance(node, dict):
            return
        if _offers_token_reference(node):
            pattern = node.get("pattern")
            for ref in listed:
                if pattern is None or re.search(pattern, ref):
                    offered.update(TOKEN_REF.findall(ref))
            return
        for value in node.values():
            walk(value)

    for name, node in defs.items():
        if name != "tokenReference":
            walk(node)
    return offered


def all_readers(root: Path, css_readers: dict[str, list[str]]) -> dict[str, list[str]]:
    """Token key -> every reader across the three sources (css files, the presets file, the schema's field offers)."""
    readers = {key: list(files) for key, files in css_readers.items()}
    for key in preset_readers(root):
        readers.setdefault(key, []).append(str(PRESETS_REL) + " (preset token reference)")
    for key in offered_tokens(root):
        readers.setdefault(key, []).append(str(SCHEMA_REL) + " (field type offers it)")
    return readers


def load_allowlist(root: Path) -> tuple[list[dict], list[str]]:
    return allowlist.load(root, GATE)


def check_present(tokens: dict[str, dict], custom: dict) -> list[str]:
    errors: list[str] = []
    for key, entry in tokens.items():
        if theme_value(custom, key) is None:
            errors.append(f"present: theme.json settings.custom.{key} is missing")
        expected = "--wp--custom--" + re.sub(r"(?<=[0-9])(?=[a-z])", "-", key).replace(".", "--")
        if entry.get("cssVar") != expected:
            errors.append(f"present: schema cssVar for {key} is {entry.get('cssVar')!r}, expected {expected!r}")
    return errors


def check_unknown_consumers(tokens: dict[str, dict], css_readers: dict[str, list[str]]) -> list[str]:
    errors: list[str] = []
    for key, files in sorted(css_readers.items()):
        if key not in tokens:
            more = f" and {len(files) - 1} more" if len(files) > 1 else ""
            errors.append(f"consumers: --wp--custom--{key.replace('.', '--')} is read in {files[0]}{more} "
                          "but is not a motion token")
    return errors


def check_reader_coverage(root: Path, tokens: dict[str, dict],
                          css_readers: dict[str, list[str]]) -> tuple[list[str], list[str]]:
    readers = all_readers(root, css_readers)
    allow, allow_errors = load_allowlist(root)
    errors = [f"allow-list: {e}" for e in allow_errors]
    notes: list[str] = []
    allowed = {e["pattern"] for e in allow}
    css_vars = {entry.get("cssVar") for entry in tokens.values()}
    for key, entry in tokens.items():
        listed = key in allowed or entry.get("cssVar") in allowed
        if key not in readers and not listed:
            errors.append(f"readers: {entry.get('cssVar')} has no reader (no stylesheet var(), no preset token "
                          "reference, no schema field offering it) and no allow-list entry")
        if key in readers and listed:
            notes.append(f"stale allow-list entry: {key} now has a reader ({readers[key][0]})")
    for pattern in sorted(allowed):
        if pattern not in tokens and pattern not in css_vars:
            errors.append(f"allow-list: pattern {pattern!r} names no motion token")
    return errors, notes


def check_consumers(root: Path) -> tuple[list[str], list[str]]:
    tokens = load_tokens(root)
    css_readers = find_readers(root, tokens)
    errors = check_present(tokens, theme_custom(root)) + check_unknown_consumers(tokens, css_readers)
    coverage_errors, notes = check_reader_coverage(root, tokens, css_readers)
    return errors + coverage_errors, notes


def parse_time_ms(value: str) -> float | None:
    match = re.fullmatch(r"\s*(" + NUMBER + r")(ms|s)\s*", value)
    if not match:
        return None
    return float(match.group(1)) * (1000 if match.group(2) == "s" else 1)


def parse_px(value: str) -> float | None:
    match = re.fullmatch(r"\s*(" + NUMBER + r")px\s*", value)
    return float(match.group(1)) if match else None


def parse_bezier(value: str) -> list[float] | None:
    number = r"\s*(" + NUMBER + r")\s*"
    match = re.fullmatch(r"\s*cubic-bezier\(" + ",".join([number] * 4) + r"\)\s*", value)
    return [float(g) for g in match.groups()] if match else None


def linear_peak(value: str) -> float | None:
    match = re.fullmatch(r"\s*linear\((.*)\)\s*", value, re.S)
    if not match:
        return None
    stops = [re.match(r"\s*(" + NUMBER + r")", part) for part in match.group(1).split(",")]
    if not stops or not all(stops):
        return None
    return max(float(s.group(1)) for s in stops if s)


def norm(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip())


def check_band(value: str, band: dict, custom: dict) -> str | None:
    """None when `value` sits inside `band`, otherwise the reason it does not."""
    kind = band.get("kind")
    if kind == "time":
        ms = parse_time_ms(value)
        if ms is None:
            return f"{value!r} is not a ms or s time"
        if not band["min"] <= ms <= band["max"]:
            return f"{ms:g}ms is outside {band['min']} to {band['max']}ms"
    elif kind == "length":
        px = parse_px(value)
        if px is None:
            return f"{value!r} is not a px length"
        if not band["min"] <= px <= band["max"]:
            return f"{px:g}px is outside {band['min']} to {band['max']}px"
    elif kind == "cubic-bezier":
        bez = parse_bezier(value)
        if bez is None:
            return f"{value!r} is not a cubic-bezier()"
        x1, y1, _x2, y2 = bez
        if x1 > band["x1Max"] or y1 < band["y1Min"] or y2 != band["y2Equals"]:
            return (f"{value} needs x1 <= {band['x1Max']}, y1 >= {band['y1Min']}, y2 = {band['y2Equals']}"
                    f" (has x1 {x1:g}, y1 {y1:g}, y2 {y2:g})")
    elif kind == "linear-overshoot":
        peak = linear_peak(value)
        if peak is None:
            return f"{value!r} is not a linear() easing"
        low, high = band.get("peakMin"), band.get("peakMax")
        if (low is not None and peak < low) or (high is not None and peak > high):
            return f"peak {peak:g} is outside {low if low is not None else 'any'} to {high if high is not None else 'any'}"
    elif kind == "transition-pair":
        duration, easing = theme_value(custom, band["duration"]), theme_value(custom, band["easing"])
        if duration is None or easing is None:
            return f"{band['duration']} or {band['easing']} is missing"
        if norm(value) != norm(f"{duration} {easing}"):
            return f"{value!r} is not '{duration} {easing}'"
    else:
        return f"unknown band kind {kind!r}"
    return None


def check_bands(root: Path) -> list[str]:
    custom = theme_custom(root)
    errors = []
    for key, entry in load_tokens(root).items():
        band = entry.get("band")
        if not band:
            continue
        value = theme_value(custom, key)
        if value is None:
            errors.append(f"bands: theme.json settings.custom.{key} is missing")
            continue
        problem = check_band(value, band, custom)
        if problem:
            errors.append(f"bands: {key}: {problem}")
    return errors


def report(label: str, errors: list[str], notes: list[str] | None = None) -> int:
    for note in notes or []:
        print(f"  note: {note}")
    for err in errors:
        print(f"  FAIL {err}")
    print(f"{label}: {'FAIL (' + str(len(errors)) + ')' if errors else 'OK'}")
    return 1 if errors else 0


def build_temp_root(tmp: Path) -> Path:
    """A copy of every file the checks read, at the same relative paths."""
    for rel in [SCHEMA_REL, THEME_REL, ALLOW_REL, PRESETS_REL, *scan_files(REPO)]:
        if (REPO / rel).is_file():
            (tmp / rel).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(REPO / rel, tmp / rel)
    return tmp


def _plant_token(tmp: Path, key: str, *, offer: bool = False, preset: bool = False) -> None:
    """Add a motion token to the temp schema and theme, read only by the sources asked for."""
    family, name = key.split(".")
    schema_path = tmp / SCHEMA_REL
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    schema["x-sgs-tokens"][key] = {"band": None, "usedBy": "self-test plant",
                                   "cssVar": f"--wp--custom--{family}--{name}"}
    if offer:
        schema["$defs"]["tokenReference"]["enum"].append(f"token:{key}")
    schema_path.write_text(json.dumps(schema), encoding="utf-8")
    theme_path = tmp / THEME_REL
    theme = json.loads(theme_path.read_text(encoding="utf-8"))
    theme["settings"]["custom"][family][name] = "8px" if family == "distance" else "100ms"
    theme_path.write_text(json.dumps(theme), encoding="utf-8")
    if preset:
        presets_path = tmp / PRESETS_REL
        presets = json.loads(presets_path.read_text(encoding="utf-8"))
        presets["presets"].append({"slug": "self-test-plant", "values": {"duration": f"token:{key}"}})
        presets_path.write_text(json.dumps(presets), encoding="utf-8")


def _reader_error_for(tmp: Path, key: str) -> bool:
    css_var = "--wp--custom--" + key.replace(".", "--")
    return any(e.startswith("readers: " + css_var + " ") for e in check_consumers(tmp)[0])


def self_test_reader_sources(tmp: Path) -> int:
    """A token read by none of the three sources fails; one read only by a preset or only by a field offer passes."""
    failures = 0
    _plant_token(tmp, "duration.zz-unread")
    if _reader_error_for(tmp, "duration.zz-unread"):
        print("self-test: planted token with no reader fails (expected)")
    else:
        print("self-test: a planted token with no reader was not caught")
        failures += 1
    _plant_token(tmp, "duration.zz-preset-only", preset=True)
    if _reader_error_for(tmp, "duration.zz-preset-only"):
        print("self-test: a token read only by a preset token reference was wrongly failed")
        failures += 1
    else:
        print("self-test: token read only by a preset passes (expected)")
    _plant_token(tmp, "distance.zz-offer-only", offer=True)
    if _reader_error_for(tmp, "distance.zz-offer-only"):
        print("self-test: a token offered only by a schema field type was wrongly failed")
        failures += 1
    else:
        print("self-test: token offered only by a schema field passes (expected)")
    return failures


def self_test() -> int:
    failures = 0
    with tempfile.TemporaryDirectory() as raw:
        tmp = build_temp_root(Path(raw))
        clean = check_consumers(tmp)[0] + check_bands(tmp)
        if clean:
            print("self-test: the clean copy fails:", *clean, sep="\n  ")
            failures += 1
        else:
            print("self-test: clean copy passes")
        plant = tmp / "plugins/sgs-blocks/assets/css/zz-planted.css"
        plant.parent.mkdir(parents=True, exist_ok=True)
        plant.write_text(".x{transition:opacity var(--wp--custom--duration--nope)}\n", encoding="utf-8")
        if not check_consumers(tmp)[0]:
            print("self-test: a planted --wp--custom--duration--nope consumer was not caught")
            failures += 1
        else:
            print("self-test: planted unknown consumer fails (expected)")
        plant.unlink()
        failures += self_test_reader_sources(tmp)
        theme = tmp / THEME_REL
        data = json.loads(theme.read_text(encoding="utf-8"))
        data["settings"]["custom"]["duration"]["fast"] = "900ms"
        theme.write_text(json.dumps(data), encoding="utf-8")
        if not check_bands(tmp):
            print("self-test: a planted out-of-band duration.fast was not caught")
            failures += 1
        else:
            print("self-test: planted out-of-band value fails (expected)")
    print(f"self-test: {'FAIL' if failures else 'OK'}")
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--check", action="store_true", help="consumers resolve and every token has a reader")
    group.add_argument("--bands", action="store_true", help="theme.json values sit inside the schema bands")
    group.add_argument("--self-test", action="store_true", help="plant faults in a temp copy and expect failures")
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    if args.bands:
        return report("bands", check_bands(REPO))
    errors, notes = check_consumers(REPO)
    return report("check", errors, notes)


if __name__ == "__main__":
    sys.exit(main())
