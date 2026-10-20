"""check-snapshot-focus-tokens.py: the gate and fixer for `settings.custom.focus` (focus plan section 2.3, owner decision Q1-B).

  --survey            per snapshot: keys present, the ring verdict on light and on dark grounds, inner/ink ratio
  --fix               print the diff that writes the full settings.custom.focus object (nothing is written)
  --fix --apply       write it to sites/*/theme-snapshot.json and theme/sgs-theme/theme.json
  --recalibrate       with --fix / --survey: recompute `ring` and `ringOnDark` from the current grounds even when set
  --check             exit 1 on a missing key, a core ring under 3:1 on its grounds, or inner/ink under 9:1; a snapshot whose
                      focus object has `source: "draft"` (the client's own draft look) has its ring ratios recorded, not failed
  --self-test         the rule against built-in cases (no repository file is read)

`--client <folder>` limits any mode to one snapshot (`framework` is theme/sgs-theme/theme.json: the generic base, which
keeps the palette-reference defaults and skips the 3:1 ring test; only client snapshots get a darkened or lightened ring).
Rules and maths live in snapshot_focus_tokens.py. UK English.
"""
from __future__ import annotations

import argparse
import copy
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import snapshot_focus_tokens as ft  # noqa: E402
import snapshot_palette_roster as roster  # noqa: E402

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
            sys.exit(f"[check-snapshot-focus-tokens] no such target: {', '.join(sorted(unknown))}")
    return found


def read(path: Path) -> str:
    with path.open("r", encoding="utf-8", newline="") as fh:
        return fh.read()


def fmt(r: float | None) -> str:
    return "n/a" if r is None else f"{r:.2f}"


def verdict(colour: str | None, ground_hexes: list[tuple[str, str]]) -> str:
    if colour is None:
        return "unresolvable"
    if not ground_hexes:
        return "no grounds of this tone"
    low, slug = ft.min_ratio(colour, ground_hexes)
    return f"{colour} min {fmt(low)} on {slug} {'PASS' if low >= ft.MIN_CORE else 'FAIL'}"


def survey_one(name: str, path: Path, recalibrate: bool = False) -> None:
    snap = json.loads(read(path))
    palette = roster.palette_map(snap)
    gs = ft.grounds(snap)
    light = [(s, h) for s, h, t in gs if t == "light"]
    dark = [(s, h) for s, h, t in gs if t == "dark"]
    missing = ft.missing_focus_keys(snap)
    print(f"== {name} ({path.relative_to(REPO).as_posix()})")
    print(f"  keys present {len(ft.FOCUS_KEYS) - len(missing)}/{len(ft.FOCUS_KEYS)}"
          + (f"; missing: {', '.join(missing)}" if missing else ""))
    print("  grounds: " + ", ".join(f"{s} {h} {t}" for s, h, t in gs))
    accent = ft.resolve(ft.var("accent"), palette)
    if accent:
        print(f"  accent {accent} against grounds: " + ", ".join(f"{s} {fmt(ft.ratio(accent, h))}" for s, h, _ in gs))
        print(f"  accent as ring, light: {verdict(accent, light)}")
        print(f"  accent as ring, dark:  {verdict(accent, dark)}")
    focus, notes = ft.derive_focus(snap, framework=name == FRAMEWORK, recalibrate=recalibrate)
    for key, grounds_of in (("ring", light), ("ringOnDark", dark)):
        print(f"  {key} ({'recalibrated' if recalibrate else 'current' if key not in missing else 'fixer would write'}): "
              f"{focus[key]} -> {verdict(ft.resolve(focus[key], palette), grounds_of)}")
    a, b = ft.resolve(focus["inner"], palette), ft.resolve(focus["ink"], palette)
    if a and b:
        r = ft.ratio(a, b)
        print(f"  inner/ink {a}/{b} {fmt(r)}:1 {'PASS' if r >= ft.MIN_INK else 'FAIL'}")
    for note in notes:
        print(f"  note: {note}")


def cmd_survey(only: list[str] | None, recalibrate: bool = False) -> int:
    for name, path in targets(only):
        survey_one(name, path, recalibrate)
    return 0


def cmd_fix(only: list[str] | None, apply: bool, recalibrate: bool = False) -> int:
    changed = 0
    for name, path in targets(only):
        old = read(path)
        focus, notes = ft.derive_focus(json.loads(old), framework=name == FRAMEWORK, recalibrate=recalibrate)
        new = ft.write_focus(old, focus)
        label = path.relative_to(REPO).as_posix()
        if new == old:
            print(f"# {label}: already complete")
            continue
        changed += 1
        for note in notes:
            print(f"# {name}: {note}")
        if apply:
            tmp = path.with_name(path.name + ".focus-tmp")
            with tmp.open("w", encoding="utf-8", newline="") as fh:
                fh.write(new)
            os.replace(tmp, path)
            print(f"# {label}: written")
        else:
            print(ft.unified_diff(old, new, label).replace("\r\n", "\n"), end="")
    print(f"# {changed} file(s) {'written' if apply else 'would change'}")
    return 0


def cmd_check(only: list[str] | None) -> int:
    failed = 0
    for name, path in targets(only):
        snap = json.loads(read(path))
        problems = ft.check_snapshot(snap, framework=name == FRAMEWORK)
        if problems:
            failed += 1
            print(f"FAIL {name}: " + "; ".join(problems))
        else:
            print(f"ok   {name}")
        for note in ft.draft_ring_notes(snap):
            print(f"     {name}: {note}")
    print(f"{failed} of {len(targets(only))} target(s) failing")
    return 1 if failed else 0


# ---------------------------------------------------------------------------
# Self-test
# ---------------------------------------------------------------------------
def make_snapshot(accent: str, text: str = "#1a1a1a", surface: str = "#ffffff", section: str = "#f1f0ec",
                  footer: str = "#0f172a", focus: dict | None = None, extra: tuple = ()) -> dict:
    palette = [{"slug": s, "color": c} for s, c in (
        ("surface", surface), ("surface-alt", surface), ("section", section), ("footer-bg", footer), ("text", text),
        ("accent", accent), ("accent-light", "#fef3c7"), ("primary", "#1f7a7a"), *extra)]
    custom: dict = {"gutter": {"mobile": "1rem"}}
    if focus is not None:
        custom = {"focus": focus, **custom}
    return {"version": 3, "settings": {"color": {"palette": palette}, "custom": custom}}


def pretty(snap: dict, indent: str, nl: str) -> str:
    return json.dumps(snap, indent=indent, ensure_ascii=False).replace("\n", nl) + nl


def self_test() -> int:
    failures: list[str] = []

    def expect(ok: bool, label: str) -> None:
        print(("ok   " if ok else "FAIL ") + label)
        if not ok:
            failures.append(label)

    # 1. missing key
    snap = make_snapshot("#0a7ea8")
    expect(ft.missing_focus_keys(snap) == list(ft.FOCUS_KEYS), "missing key: a snapshot with no focus lacks all twelve keys")
    expect(any("missing key ring" in p for p in ft.check_snapshot(snap)), "missing key: --check names the absent key")
    partial = make_snapshot("#0a7ea8", focus={"width": "2px"})
    expect(ft.missing_focus_keys(partial)[0] == "inner", "missing key: only absent keys are reported")

    # 2. failing accent: the fixer darkens it to 3:1 and keeps the hue
    snap = make_snapshot("#f5d050", surface="#fbf3dc", section="#fff9f0")
    focus, _ = ft.derive_focus(snap)
    gs = [(s, h) for s, h, t in ft.grounds(snap) if t == "light"]
    low, _s = ft.min_ratio(ft.norm_hex(focus["ring"]), gs)
    expect(focus["ring"].startswith("#") and low >= 3.0, f"failing accent: ring {focus['ring']} reaches {fmt(low)}:1 on every light ground")
    expect(abs(ft.hue_of(focus["ring"]) - ft.hue_of("#f5d050")) < 8, "failing accent: the hue stays within 8 degrees")
    expect(focus["near"] == ft.var("accent") and focus["far"] == ft.var("accent"), "failing accent: the bloom stays the true accent")
    snap["settings"]["custom"]["focus"] = focus
    expect(ft.check_snapshot(snap) == [], "failing accent: --check passes once the fixer's object is written")
    bad = copy.deepcopy(snap)
    bad["settings"]["custom"]["focus"]["ring"] = ft.var("accent")
    expect(any("ring" in p and "under 3.0:1" in p for p in ft.check_snapshot(bad)), "failing accent: --check fails the undarkened accent")

    # 3. hand-set value left alone (even a failing one), and the rest still filled
    snap = make_snapshot("#f5d050", focus={"ring": "#123456"})
    focus, notes = ft.derive_focus(snap)
    expect(focus["ring"] == "#123456" and not missing_after(focus), "hand-set: the value is kept and the other keys are filled")
    expect(any("hand-set" in n for n in notes), "hand-set: the kept value is reported")
    snap = make_snapshot("#f5d050", focus={"ring": ft.var("accent")})
    expect(any("under 3.0:1" in p for p in ft.check_snapshot(snap)), "hand-set: a failing hand-set value is still checked")

    # 4. fully desaturated accent falls back to ink
    snap = make_snapshot("#cccccc")
    focus, notes = ft.derive_focus(snap)
    expect(focus["ring"] == ft.var("text"), "desaturated accent: ring falls back to the site's ink")
    expect(any("falls back" in n for n in notes), "desaturated accent: the fallback is reported")
    snap = make_snapshot("#6b3a58")
    focus, _ = ft.derive_focus(snap)
    expect(focus["ring"] == ft.var("accent"), "dark accent: it reaches 3:1 on every light ground, so the ring stays the accent")
    expect(focus["ringOnDark"].startswith("#") and ft.ratio(focus["ringOnDark"], "#6b3a58") >= 3.0,
           "dark accent: an accent-coloured band is itself a dark ground, so ringOnDark is lightened away from it")

    # 5. all grounds dark
    snap = make_snapshot("#1a1a60", text="#f5f5f5", surface="#0b1020", section="#101828", footer="#05070d")
    focus, _ = ft.derive_focus(snap)
    dark = [(s, h) for s, h, t in ft.grounds(snap) if t == "dark"]
    light_left = [s for s, _h, t in ft.grounds(snap) if t == "light"]
    expect(len(dark) >= 4 and focus["ring"] == ft.var("accent") and light_left == ["accent-light"],
           "all-dark grounds: only the pale accent tint is light, and the accent already reaches 3:1 on it, so the ring stays the accent")
    low, _s = ft.min_ratio(ft.norm_hex(focus["ringOnDark"]), dark)
    expect(focus["ringOnDark"].startswith("#") and low >= 3.0, f"all-dark grounds: ringOnDark {focus['ringOnDark']} lightened to {fmt(low)}:1")
    snap["settings"]["custom"]["focus"] = focus
    expect(ft.check_snapshot(snap) == [], "all-dark grounds: --check passes")

    # 5b. ground set: every opaque palette entry that is not a text or border colour
    snap = make_snapshot("#f5d050", extra=(("surface-pink", "#f5c2c8"), ("text-muted", "#6b5c50"), ("border", "#e8d5c0"),
                                           ("accent-text", "#7a6500"), ("overlay", "#ffffff80"), ("heading", "#111111")))
    slugs = [s for s, _h, _t in ft.grounds(snap)]
    expect("surface-pink" in slugs and "accent" in slugs and "primary" in slugs and "footer-bg" in slugs,
           "ground set: pale tints, brand colours and the footer are grounds")
    expect(not {"text", "text-muted", "border", "accent-text", "heading", "overlay"} & set(slugs),
           "ground set: text, heading, border and translucent entries are not grounds")

    # 5c. a pale tinted palette entry darkens the ring beyond the surface/white-only calibration
    plain = make_snapshot("#f5d050", surface="#fbf3dc", section="#fff9f0")
    tinted = make_snapshot("#f5d050", surface="#fbf3dc", section="#fff9f0", extra=(("surface-pink", "#f5c2c8"),))
    ring_plain, ring_tinted = ft.derive_focus(plain)[0]["ring"], ft.derive_focus(tinted)[0]["ring"]
    expect(ft.lightness_of(ring_tinted) < ft.lightness_of(ring_plain) and ft.ratio(ring_tinted, "#f5c2c8") >= 3.0
           and ft.ratio(ring_plain, "#f5c2c8") < 3.0 and ft.hue_of(ring_tinted) - ft.hue_of(ring_plain) < 8,
           f"tinted ground: ring {ring_plain} -> {ring_tinted} reaches {fmt(ft.ratio(ring_tinted, '#f5c2c8'))}:1 on the pink tint, hue kept")
    plain["settings"]["custom"]["focus"] = ft.derive_focus(plain)[0]
    expect(any("surface-pink" in p for p in ft.check_snapshot({**tinted, "settings": {**tinted["settings"], "custom": {"focus": plain["settings"]["custom"]["focus"]}}})),
           "tinted ground: --check names the pink tint when the ring was calibrated without it")

    # 5d. a mid-dark palette entry lightens ringOnDark beyond the footer-only calibration
    base = make_snapshot("#f0c848")
    deep = make_snapshot("#f0c848", extra=(("primary-dark", "#587a6a"),))
    on_base = ft.resolve(ft.derive_focus(base)[0]["ringOnDark"], roster.palette_map(base))
    on_deep = ft.resolve(ft.derive_focus(deep)[0]["ringOnDark"], roster.palette_map(deep))
    dgrounds = [(s, h) for s, h, t in ft.grounds(deep) if t == "dark"]
    expect(ft.lightness_of(on_deep) > ft.lightness_of(on_base) and ft.min_ratio(ft.norm_hex(on_deep), dgrounds)[0] >= 3.0
           and ft.min_ratio(ft.norm_hex(on_base), dgrounds)[0] < 3.0,
           f"dark ground: ringOnDark {on_base} -> {on_deep} reaches 3:1 on every dark entry")

    # 5e. a set ring is kept by default and recomputed by recalibrate; other keys stay; the framework is never shifted
    stale = make_snapshot("#f5d050", extra=(("surface-pink", "#f5c2c8"),), focus={"ring": "#a68a23", "near": "#123456"})
    kept, recal = ft.derive_focus(stale)[0], ft.derive_focus(stale, recalibrate=True)[0]
    expect(kept["ring"] == "#a68a23" and recal["ring"] != "#a68a23" and ft.ratio(recal["ring"], "#f5c2c8") >= 3.0
           and recal["near"] == "#123456", "recalibrate: ring is recomputed, a hand-set bloom key is kept")
    expect(ft.derive_focus(stale, framework=True, recalibrate=True)[0]["ring"] == "#a68a23",
           "recalibrate: the framework base is never shifted")

    # 6. inner/ink under 9:1 gets the fallback pair
    snap = make_snapshot("#0a7ea8", text="#777777", surface="#888888")
    focus, _ = ft.derive_focus(snap)
    expect((focus["inner"], focus["ink"]) == (ft.FALLBACK_INNER, ft.FALLBACK_INK), "inner/ink: the fallback pair is written")
    snap["settings"]["custom"]["focus"] = {**focus, "inner": ft.var("surface"), "ink": ft.var("text")}
    expect(any("inner/ink" in p for p in ft.check_snapshot(snap)), "inner/ink: --check fails a pair under 9:1")

    # 7. the rewrite keeps indentation, order and line endings, and replaces on a second run
    for indent, nl in (("  ", "\n"), ("    ", "\r\n"), ("\t", "\n")):
        snap = make_snapshot("#f5d050")
        text = pretty(snap, indent, nl)
        focus, _ = ft.derive_focus(snap)
        new = ft.write_focus(text, focus)
        again = ft.write_focus(new, focus)
        expect(new.count("\r\n") == new.count("\n") * (nl == "\r\n") and json.loads(new)["settings"]["custom"]["focus"] == focus
               and again == new and list(json.loads(new)["settings"]["custom"])[0] == "focus",
               f"rewrite: indent {indent!r} {'CRLF' if nl == chr(13) + chr(10) else 'LF'} kept, second run is a no-op")
    empty = make_snapshot("#f5d050")
    empty["settings"]["custom"] = {}
    try:
        ft.write_focus(pretty(empty, "  ", "\n"), ft.derive_focus(empty)[0])
        refused = False
    except ValueError:
        refused = True
    expect(refused, "rewrite: a shape it cannot edit line by line (inline empty custom) is refused, not mangled")

    # 8. the framework file is the generic base: palette references, never a darkened literal
    snap = make_snapshot("#f59e0b")
    fw, fw_notes = ft.derive_focus(snap, framework=True)
    expect(fw["ring"] == ft.var("accent") and fw["ringOnDark"] == ft.var("accent") and not fw_notes,
           "framework: ring and ringOnDark are the accent reference, nothing is shifted")
    expect(all(fw[k] == ft.var("accent") for k in ("near", "far", "nearOnDark", "farOnDark"))
           and (fw["inner"], fw["ink"]) == (ft.var("surface"), ft.var("text"))
           and (fw["signatureA"], fw["signatureB"], fw["signatureC"]) == (ft.var("primary"), ft.var("accent"), ft.var("accent-light")),
           "framework: bloom, inner, ink and signature keys follow plan 2.3")
    expect(ft.derive_focus(snap)[0]["ring"].startswith("#"), "framework: the same accent in a client snapshot still gets the darkened ring")
    snap["settings"]["custom"]["focus"] = fw
    expect(ft.check_snapshot(snap, framework=True) == [], "framework: --check is clean with the undarkened accent ring")
    expect(any("ring" in p and "under 3.0:1" in p for p in ft.check_snapshot(snap)), "framework: a client snapshot with that ring still fails --check")
    broken = copy.deepcopy(snap)
    broken["settings"]["custom"]["focus"]["ink"] = ft.var("surface")
    expect(any("inner/ink" in p for p in ft.check_snapshot(broken, framework=True)), "framework: --check still fails inner/ink under 9:1")
    del broken["settings"]["custom"]["focus"]["far"]
    expect(any("missing key far" in p for p in ft.check_snapshot(broken, framework=True)), "framework: --check still fails a missing key")

    print(f"{'FAILED' if failures else 'PASSED'}: {len(failures)} failing")
    return 1 if failures else 0


def missing_after(focus: dict) -> list[str]:
    return [k for k in ft.FOCUS_KEYS if not focus.get(k)]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--survey", action="store_true")
    mode.add_argument("--fix", action="store_true")
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--self-test", action="store_true")
    parser.add_argument("--apply", action="store_true", help="with --fix: write the files")
    parser.add_argument("--recalibrate", action="store_true", help="with --fix or --survey: recompute ring and ringOnDark")
    parser.add_argument("--client", action="append", help="limit to one target folder (or `framework`)")
    args = parser.parse_args()
    if args.apply and not args.fix:
        parser.error("--apply goes with --fix")
    if args.recalibrate and not (args.fix or args.survey):
        parser.error("--recalibrate goes with --fix or --survey")
    if args.survey:
        return cmd_survey(args.client, args.recalibrate)
    if args.fix:
        return cmd_fix(args.client, args.apply, args.recalibrate)
    if args.check:
        return cmd_check(args.client)
    return self_test()


if __name__ == "__main__":
    sys.exit(main())
