"""check-snapshot-inline-format-tokens.py: the gate for `settings.custom.highlight` and `settings.custom.inlinePhoto` (Spec 02 FR-2-4, FR-2-5).

  --survey            per snapshot: keys present and each value
  --fix [--apply]     the diff (or, with --apply, the write) that fills every missing key with the framework
                      theme.json's value; a file whose JSON layout would change is refused, never rewritten
  --check             exit 1 on a missing key, a colour that does not resolve, or a value that is not a length or angle
  --self-test         the rule against built-in cases (no repository file is read)

`--client <folder>` limits any mode to one snapshot (`framework` is theme/sgs-theme/theme.json).
Rules live in snapshot_inline_format_tokens.py. A client's own look (a bordered, tilted photo) is that client's
snapshot value; --fix only ever writes the framework default. UK English.
"""
from __future__ import annotations

import argparse
import difflib
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import snapshot_palette_roster as roster  # noqa: E402
import snapshot_inline_format_tokens as it  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
REPO = roster.REPO_ROOT
FRAMEWORK = "framework"


def targets(only: list[str] | None) -> list[tuple[str, Path]]:
    found = [(p.parent.name, p) for p in sorted((REPO / "sites").glob("*/theme-snapshot.json"))]
    found.append((FRAMEWORK, roster.FRAMEWORK_THEME_JSON))
    if only:
        found = [t for t in found if t[0] in only]
        unknown = set(only) - {t[0] for t in found}
        if unknown:
            sys.exit(f"[check-snapshot-inline-format-tokens] no such target: {', '.join(sorted(unknown))}")
    return found


def read_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def dump(data: dict) -> str:
    return json.dumps(data, indent=2, ensure_ascii=False) + "\n"


def filled(snapshot: dict, defaults: dict[str, dict[str, str]]) -> dict:
    """A copy of the snapshot with every missing key set to its framework default; new groups follow `scrollbar`,
    in GROUPS order."""
    data = json.loads(json.dumps(snapshot))
    settings = data.setdefault("settings", {})
    custom = settings.get("custom") if isinstance(settings.get("custom"), dict) else {}
    anchor = "scrollbar"
    for group, keys in it.GROUPS.items():
        current = custom.get(group) if isinstance(custom.get(group), dict) else {}
        merged = dict(current)
        for key in keys:
            if not (isinstance(merged.get(key), str) and merged[key].strip()) and key in defaults.get(group, {}):
                merged[key] = defaults[group][key]
        if group in custom:
            custom[group] = merged
        else:
            rebuilt: dict = {}
            placed = False
            for k, v in custom.items():
                rebuilt[k] = v
                if k == anchor:
                    rebuilt[group] = merged
                    placed = True
            if not placed:
                rebuilt[group] = merged
            custom = rebuilt
        anchor = group
    settings["custom"] = custom
    return data


def cmd_survey(only: list[str] | None) -> int:
    for name, path in targets(only):
        snap = read_json(path)
        missing = it.missing_inline_format_keys(snap)
        total = sum(len(k) for k in it.GROUPS.values())
        print(f"== {name} ({path.relative_to(REPO).as_posix()})")
        print(f"  keys present {total - len(missing)}/{total}" + (f"; missing: {', '.join(missing)}" if missing else ""))
        for group, keys in it.GROUPS.items():
            values = it.group_of(snap, group)
            shown = ", ".join(f"{k}={values[k]}" for k in keys if k in values)
            if shown:
                print(f"  {group}: {shown}")
    return 0


def cmd_fix(only: list[str] | None, apply: bool) -> int:
    defaults = it.framework_defaults(read_json(roster.FRAMEWORK_THEME_JSON))
    refused = 0
    for name, path in targets(only):
        raw = path.read_text(encoding="utf-8")
        snap = json.loads(raw)
        if not it.missing_inline_format_keys(snap):
            continue
        if dump(snap) != raw:
            refused += 1
            print(f"refused {name}: its JSON layout is not the two-space dump, so a rewrite would change unrelated lines; add the keys by hand")
            continue
        after = dump(filled(snap, defaults))
        rel = path.relative_to(REPO).as_posix()
        if apply:
            tmp = path.with_suffix(path.suffix + ".tmp")
            with tmp.open("w", encoding="utf-8", newline="\n") as fh:
                fh.write(after)
            os.replace(tmp, path)
            print(f"wrote {rel}")
        else:
            sys.stdout.writelines(difflib.unified_diff(raw.splitlines(True), after.splitlines(True), f"a/{rel}", f"b/{rel}", n=2))
    return 1 if refused else 0


def cmd_check(only: list[str] | None) -> int:
    failed = 0
    chosen = targets(only)
    for name, path in chosen:
        problems = it.check_snapshot(read_json(path))
        if problems:
            failed += 1
            print(f"FAIL {name}: " + "; ".join(problems))
        else:
            print(f"ok   {name}")
    print(f"{failed} of {len(chosen)} target(s) failing")
    return 1 if failed else 0


GOOD_HIGHLIGHT = {"colour": "var(--wp--preset--color--accent)", "thickness": "0.2em", "lift": "0.02em", "overhang": "4%", "tilt": "0deg"}
GOOD_PHOTO = {"width": "1.55em", "height": "0.78em", "borderWidth": "0", "borderColour": "currentColor", "radius": "999px", "tilt": "0deg"}


def make_snapshot(highlight: dict | None, photo: dict | None) -> dict:
    palette = [{"slug": s, "color": c} for s, c in (("surface", "#ffffff"), ("text", "#1a1a1a"), ("accent", "#d8ca50"))]
    custom: dict = {"scrollbar": {"thumb": "#000"}, "shadowColour": "#000"}
    if highlight is not None:
        custom["highlight"] = highlight
    if photo is not None:
        custom["inlinePhoto"] = photo
    return {"version": 3, "settings": {"color": {"palette": palette}, "custom": custom}}


def self_test() -> int:
    failures: list[str] = []

    def expect(ok: bool, label: str) -> None:
        print(("ok   " if ok else "FAIL ") + label)
        if not ok:
            failures.append(label)

    # 1. missing keys, by path
    everything = [f"highlight.{k}" for k in it.HIGHLIGHT_KEYS] + [f"inlinePhoto.{k}" for k in it.PHOTO_KEYS]
    expect(it.missing_inline_format_keys(make_snapshot(None, None)) == everything, "missing: a snapshot with neither group lacks every key")
    no_thickness = {k: v for k, v in GOOD_HIGHLIGHT.items() if k != "thickness"}
    expect(it.missing_inline_format_keys(make_snapshot(no_thickness, GOOD_PHOTO)) == ["highlight.thickness"], "missing: a snapshot without highlight.thickness names exactly that key")
    expect(any("missing key highlight.thickness" in p for p in it.check_snapshot(make_snapshot(no_thickness, GOOD_PHOTO))), "refuse: --check fails a snapshot missing highlight.thickness")
    expect(it.missing_inline_format_keys(make_snapshot({**GOOD_HIGHLIGHT, "lift": " "}, GOOD_PHOTO)) == ["highlight.lift"], "missing: a blank value counts as absent")

    # 2. a passing snapshot, the client look included
    expect(it.check_snapshot(make_snapshot(GOOD_HIGHLIGHT, GOOD_PHOTO)) == [], "pass: the framework defaults pass")
    client = {**GOOD_PHOTO, "borderWidth": "3px", "borderColour": "var(--wp--preset--color--text)", "tilt": "-4deg"}
    expect(it.check_snapshot(make_snapshot({**GOOD_HIGHLIGHT, "colour": "#F9CF6E", "tilt": "-1.5deg"}, client)) == [], "pass: a hex stripe, a 3px palette border and negative tilts pass")

    # 3. values that cannot paint are refused
    bad = it.check_snapshot(make_snapshot({**GOOD_HIGHLIGHT, "colour": "var(--wp--preset--color--nope)", "thickness": "thick"}, {**GOOD_PHOTO, "tilt": "4"}))
    expect(any("highlight.colour does not resolve" in p for p in bad), "refuse: a colour naming a missing slug")
    expect(any("highlight.thickness is not a CSS length" in p for p in bad), "refuse: a thickness that is not a length")
    expect(any("inlinePhoto.tilt is not an angle" in p for p in bad), "refuse: a unitless tilt")
    expect(any("is not a CSS length" in p for p in it.check_snapshot(make_snapshot(GOOD_HIGHLIGHT, {**GOOD_PHOTO, "width": "50%"}))), "refuse: a percentage is accepted only for the overhang")

    # 4. --fix fills from the defaults, after scrollbar, and leaves present values alone
    defaults = {"highlight": GOOD_HIGHLIGHT, "inlinePhoto": GOOD_PHOTO}
    both = filled(make_snapshot(None, None), defaults)["settings"]["custom"]
    expect(list(both.keys()) == ["scrollbar", "highlight", "inlinePhoto", "shadowColour"], f"fix: two new groups follow scrollbar in order; got {list(both.keys())}")
    fixed = filled(make_snapshot({"colour": "#F9CF6E"}, None), defaults)
    custom = fixed["settings"]["custom"]
    expect(custom["highlight"]["colour"] == "#F9CF6E" and custom["highlight"]["thickness"] == "0.2em", "fix: a present value stays, a missing one takes the default")
    expect(list(custom.keys()) == ["scrollbar", "shadowColour", "highlight", "inlinePhoto"], f"fix: a new group follows the group before it; got {list(custom.keys())}")
    expect(it.check_snapshot(fixed) == [], "fix: the filled snapshot passes --check")
    expect(filled(fixed, defaults) == fixed, "idempotence: filling a complete snapshot changes nothing")

    # 5. the framework defaults read from a theme
    theme = make_snapshot(GOOD_HIGHLIGHT, GOOD_PHOTO)
    expect(it.framework_defaults(theme) == defaults, "defaults: read from the theme's settings.custom")

    print(f"{'FAILED' if failures else 'PASSED'}: {len(failures)} failing")
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--survey", action="store_true")
    mode.add_argument("--fix", action="store_true")
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--self-test", action="store_true")
    parser.add_argument("--apply", action="store_true", help="with --fix, write the files")
    parser.add_argument("--client", action="append", help="limit to one target folder (or `framework`)")
    args = parser.parse_args()
    if args.survey:
        return cmd_survey(args.client)
    if args.fix:
        return cmd_fix(args.client, args.apply)
    if args.check:
        return cmd_check(args.client)
    return self_test()


if __name__ == "__main__":
    sys.exit(main())
