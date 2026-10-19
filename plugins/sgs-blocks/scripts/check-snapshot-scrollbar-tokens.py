"""check-snapshot-scrollbar-tokens.py: the gate for `settings.custom.scrollbar` (Spec 32 FR-32-26).

  --survey            per snapshot: keys present and each thumb's lowest contrast against the grounds of its tone
  --check             exit 1 on a missing key, or a thumb under 2:1 against a ground of its tone
  --self-test         the rule against built-in cases, including a 1.5:1 negative control (no repository file is read)

`--client <folder>` limits --survey and --check to one snapshot (`framework` is theme/sgs-theme/theme.json).
Rules and maths live in snapshot_scrollbar_tokens.py. The 2:1 floor is Bean's ruling (2026-10-19): the leading
browsers' own default bars sit below WCAG 1.4.11's 3:1, so their level is the benchmark. UK English.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import snapshot_focus_tokens as ft  # noqa: E402
import snapshot_palette_roster as roster  # noqa: E402
import snapshot_scrollbar_tokens as st  # noqa: E402

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
            sys.exit(f"[check-snapshot-scrollbar-tokens] no such target: {', '.join(sorted(unknown))}")
    return found


def read_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def fmt(r: float | None) -> str:
    return "n/a" if r is None else f"{r:.2f}"


def cmd_survey(only: list[str] | None) -> int:
    for name, path in targets(only):
        snap = read_json(path)
        palette = roster.palette_map(snap)
        missing = st.missing_scrollbar_keys(snap)
        print(f"== {name} ({path.relative_to(REPO).as_posix()})")
        print(f"  keys present {len(st.SCROLLBAR_KEYS) - len(missing)}/{len(st.SCROLLBAR_KEYS)}"
              + (f"; missing: {', '.join(missing)}" if missing else ""))
        scrollbar = st.scrollbar_of(snap)
        for key, tone in st.THUMB_TONES.items():
            if key in missing:
                continue
            value = ft.resolve(scrollbar[key], palette)
            grounds = [(s, h) for s, h, t in ft.grounds(snap) if t == tone]
            low, slug = ft.min_ratio(value, grounds) if value else (None, None)
            print(f"  {key} {scrollbar[key]} -> {value}: min {fmt(low)} on {slug} ({tone} grounds)")
    return 0


def cmd_check(only: list[str] | None) -> int:
    failed = 0
    chosen = targets(only)
    for name, path in chosen:
        problems = st.check_snapshot(read_json(path))
        if problems:
            failed += 1
            print(f"FAIL {name}: " + "; ".join(problems))
        else:
            print(f"ok   {name}")
    print(f"{failed} of {len(chosen)} target(s) failing")
    return 1 if failed else 0


def make_snapshot(scrollbar: dict | None, surface: str = "#ffffff", footer: str = "#0f172a") -> dict:
    palette = [{"slug": s, "color": c} for s, c in (
        ("surface", surface), ("footer-bg", footer), ("text", "#1a1a1a"), ("primary", "#0a7ea8"), ("accent", "#d8ca50"))]
    custom: dict = {"gutter": {"mobile": "1rem"}}
    if scrollbar is not None:
        custom["scrollbar"] = scrollbar
    return {"version": 3, "settings": {"color": {"palette": palette}, "custom": custom}}


def self_test() -> int:
    failures: list[str] = []

    def expect(ok: bool, label: str) -> None:
        print(("ok   " if ok else "FAIL ") + label)
        if not ok:
            failures.append(label)

    good = {"thumb": "var(--wp--preset--color--primary)", "thumbOnDark": "var(--wp--preset--color--accent)", "track": "transparent"}

    # 1. keys
    expect(st.missing_scrollbar_keys(make_snapshot(None)) == list(st.SCROLLBAR_KEYS), "missing: a snapshot with no scrollbar lacks all three keys")
    expect(any("missing key thumb" in p for p in st.check_snapshot(make_snapshot(None))), "missing: --check names the absent key")
    expect(st.missing_scrollbar_keys(make_snapshot({"thumb": "#0a7ea8", "track": " "})) == ["thumbOnDark", "track"],
           "missing: a blank value counts as absent")

    # 2. a passing snapshot, references resolved through the palette
    expect(st.check_snapshot(make_snapshot(good)) == [], "pass: primary on a white surface and accent on a dark footer reach 2:1")

    # 3. negative control: a 1.5:1 thumb is refused
    pale = "#cfcfcf"
    expect(1.4 <= ft.ratio(pale, "#ffffff") <= 1.6, f"control: {pale} against white is {fmt(ft.ratio(pale, '#ffffff'))}:1, the planted 1.5:1")
    problems = st.check_snapshot(make_snapshot({**good, "thumb": pale}))
    expect(any("thumb" in p and "under 2.0:1" in p for p in problems), "refuse: a 1.5:1 thumb on a light ground fails --check")
    dim = "#1c2740"
    expect(ft.ratio(dim, "#0f172a") < 2.0, f"control: {dim} against the dark footer is {fmt(ft.ratio(dim, '#0f172a'))}:1")
    problems = st.check_snapshot(make_snapshot({**good, "thumbOnDark": dim}))
    expect(any("thumbOnDark" in p and "under 2.0:1" in p for p in problems), "refuse: a dim thumbOnDark on a dark ground fails --check")

    # 4. the boundary: exactly the floor passes, just under fails
    expect(st.MIN_THUMB == 2.0, "floor: the thumb minimum is 2:1, never 3:1")
    grey_ok = "#8a8a8a"
    snap = make_snapshot({**good, "thumb": grey_ok})
    low, _slug = ft.min_ratio(grey_ok, [(s, h) for s, h, t in ft.grounds(snap) if t == "light"])
    expect(2.0 <= low < 3.0, f"floor: {grey_ok} is {fmt(low)}:1 on its lowest light ground, between 2 and 3")
    expect(st.check_snapshot(snap) == [], "floor: a 2.x:1 thumb passes (the browser-default level)")

    # 5. an unresolvable value is reported, a thumb with no grounds of its tone is not
    expect(any("does not resolve" in p for p in st.check_snapshot(make_snapshot({**good, "thumb": "var(--wp--preset--color--nope)"}))),
           "resolve: a reference to a missing slug is reported")
    all_light = make_snapshot(good, footer="#ffffff")
    expect(st.check_snapshot(all_light) == [], "grounds: no dark ground means thumbOnDark has nothing to fail against")

    print(f"{'FAILED' if failures else 'PASSED'}: {len(failures)} failing")
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--survey", action="store_true")
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--self-test", action="store_true")
    parser.add_argument("--client", action="append", help="limit to one target folder (or `framework`)")
    args = parser.parse_args()
    if args.survey:
        return cmd_survey(args.client)
    if args.check:
        return cmd_check(args.client)
    return self_test()


if __name__ == "__main__":
    sys.exit(main())
