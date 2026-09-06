#!/usr/bin/env python3
"""Every declared block.json enum, its option count, and the control shape rendering it.

WHY THIS EXISTS
---------------
Spec 35 §3.1 states the problem against itself:

    `ToggleGroupControl` for short option sets (14 files) — **the threshold is
    nowhere written down, so it cannot yet be gated.**

Spec 35's own guidance row (§125) gives `ToggleGroupControl` (2-5 short) /
`ComboboxControl` (>~10, searchable) / `FormTokenField` (multi-value), with
"giant Select" named as the anti-pattern. A separate ruling establishes the
hard ceiling: **`ToggleGroupControl` does not wrap — which is precisely why core
falls back to `Button isPressed` past 6 options.** So the 2-5 floor and the ~10
ceiling both exist; the 6-10 band is what nobody wrote down.

⛔ THIS SCRIPT DECIDES NOTHING. It is the census that has to exist BEFORE a
threshold is written, because a threshold argued from memory is how this repo
has repeatedly shipped a rule that the corpus disagrees with. Measured on the
first run: 282 declared enum attributes across 55 blocks, of which 216 (77%)
carry 2-5 options. Spec 35's cached "272" had already drifted.

TWO DIMENSIONS, because option COUNT alone cannot decide the shape
-----------------------------------------------------------------
`ToggleGroupControl` lays its options out in ONE non-wrapping row, so the
constraint is the total rendered WIDTH, not the count. Five options labelled
"Left"/"Right" fit; five labelled "Aligned to the content column" do not. This
survey therefore reports the option count AND the longest option label, so a
threshold can be written against both instead of against a guess about one.

DETECTION AND ITS LIMITS — stated, not hidden
---------------------------------------------
Binding an attribute to the control that renders it is a STATIC heuristic: the
control element and a `setAttributes` write naming the attr, or a `value=`
binding, within one proximity window of each other. It is the same shape
`check-control-ux.py` already uses for its Unit-via-SelectControl check.
  * A dynamically-keyed control (`attributes[base + 'Align']`) is invisible to
    it and is reported as `unresolved`, never guessed at.
  * A control mounted through a shared component is reported as `shared`, since
    the block's own file does not name the primitive.
`unresolved` and `shared` are NOT findings. They are the part of the corpus this
instrument cannot see, and they are printed so the coverage is legible rather
than implied.

USAGE
-----
  python scripts/surveys/survey-enum-control-shape.py          # the census
  python scripts/surveys/survey-enum-control-shape.py --json
  python scripts/surveys/survey-enum-control-shape.py --self-test

⛔ NOT in `prebuild`, and must not be added: this is a census with no `--check`
mode, and a non-gating script inside a gate chain is enforcement theatre. The
gate comes after the threshold is written, not before.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

PLUGIN = Path(__file__).resolve().parent.parent.parent
BLOCKS = PLUGIN / "src" / "blocks"

# A scan that finds nothing must FAIL, never pass.
MIN_BLOCKS = 20
MIN_ENUMS = 100

PRIMITIVES = (
    "ToggleGroupControl",
    "ComboboxControl",
    "RadioControl",
    "FormTokenField",
    "SelectControl",  # last: it is a substring of nothing, but keep the order stable
)

BLOCK_COMMENT = re.compile(r"/\*.*?\*/", re.S)
LINE_COMMENT = re.compile(r"(?<![:'\"])//[^\n]*")

# The window in which a primitive's opening tag and a mention of the attribute
# must both appear for the two to be considered bound. 900 chars comfortably
# spans a multi-line JSX element with an options array; a smaller window missed
# real bindings when this was calibrated against known-good mounts.
WINDOW = 900


def strip_comments(text: str) -> str:
    """A docblock naming a component is not a mount."""
    return LINE_COMMENT.sub("", BLOCK_COMMENT.sub("", text))


def declared_enums() -> list[dict]:
    files = sorted(BLOCKS.glob("*/block.json"))
    if len(files) < MIN_BLOCKS:
        raise SystemExit(
            f"[enum-control-shape] VACUOUS SCAN: {len(files)} block.json files, expected >= {MIN_BLOCKS}."
        )
    out = []
    for f in files:
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        for name, spec in (data.get("attributes") or {}).items():
            if isinstance(spec, dict) and isinstance(spec.get("enum"), list):
                opts = [str(o) for o in spec["enum"]]
                out.append(
                    {
                        "block": f.parent.name,
                        "attr": name,
                        "count": len(opts),
                        "longestOption": max((len(o) for o in opts), default=0),
                        "options": opts,
                    }
                )
    if len(out) < MIN_ENUMS:
        raise SystemExit(
            f"[enum-control-shape] VACUOUS SCAN: {len(out)} declared enums, expected >= {MIN_ENUMS}."
        )
    return out


def bind_controls(rows: list[dict]) -> None:
    """Attach the primitive rendering each enum attr, where it can be resolved."""
    cache: dict[str, str] = {}
    for row in rows:
        block = row["block"]
        if block not in cache:
            edit = BLOCKS / block / "edit.js"
            cache[block] = strip_comments(edit.read_text(encoding="utf-8", errors="replace")) if edit.exists() else ""
        src = cache[block]
        row["control"] = resolve_control(src, row["attr"])


def resolve_control(src: str, attr: str) -> str:
    if not src:
        return "unresolved"
    # Every position the attribute is named at all.
    marks = [m.start() for m in re.finditer(rf"\b{re.escape(attr)}\b", src)]
    if not marks:
        return "unresolved"
    found = set()
    for prim in PRIMITIVES:
        for m in re.finditer(rf"<{prim}\b", src):
            start = m.start()
            if any(start - WINDOW < mk < start + WINDOW for mk in marks):
                found.add(prim)
    if len(found) == 1:
        return found.pop()
    if len(found) > 1:
        # Two primitives inside one window - the heuristic cannot separate them.
        return "ambiguous"
    return "shared"


def recommend(count: int, longest: int) -> str:
    """The SHAPE the corpus supports, NOT a ruling. See the module docblock.

    Bands come from two established facts, not from taste: ToggleGroupControl
    does not wrap (core falls back past 6 options), and Spec 35 §125 puts the
    searchable Combobox above ~10.
    """
    if count > 10:
        return "ComboboxControl"
    if count <= 5 and longest <= 12:
        return "ToggleGroupControl"
    if count <= 5:
        return "ToggleGroupControl?"  # short enough by count, long labels
    return "SelectControl"


def main() -> int:
    if "--self-test" in sys.argv:
        return self_test()

    rows = declared_enums()
    bind_controls(rows)
    for r in rows:
        r["recommended"] = recommend(r["count"], r["longestOption"])

    if "--json" in sys.argv:
        print(json.dumps(rows, indent=2))
        return 0

    import collections

    print(f"\n  DECLARED ENUMS: {len(rows)} attributes across "
          f"{len({r['block'] for r in rows})} blocks\n")

    by_control = collections.Counter(r["control"] for r in rows)
    print("  Control shape actually rendering them (static heuristic):")
    for k, v in by_control.most_common():
        note = "  <- instrument blind spot, not a finding" if k in ("unresolved", "shared", "ambiguous") else ""
        print(f"    {k:<22}{v:>5}{note}")

    resolved = [r for r in rows if r["control"] in PRIMITIVES]
    print(f"\n  RESOLVED: {len(resolved)} of {len(rows)} "
          f"({100 * len(resolved) // max(1, len(rows))}%) - the rest this instrument cannot see.\n")

    print("  Of the resolved, where shape and option-count disagree:")
    mism = [r for r in resolved if r["recommended"].rstrip("?") != r["control"]]
    band = collections.Counter((r["control"], r["recommended"]) for r in mism)
    for (cur, rec), n in band.most_common():
        print(f"    {cur:<22} -> {rec:<22}{n:>5}")
    print(f"\n  {len(mism)} of {len(resolved)} resolved enums disagree with the count-derived shape.")

    print("\n  Longest option label, by band (the SECOND dimension - "
          "ToggleGroupControl does not wrap):")
    for lo, hi, label in ((2, 5, "2-5 options"), (6, 10, "6-10 options"), (11, 99, ">10 options")):
        grp = [r for r in rows if lo <= r["count"] <= hi]
        if grp:
            longest = max(r["longestOption"] for r in grp)
            median = sorted(r["longestOption"] for r in grp)[len(grp) // 2]
            print(f"    {label:<14}{len(grp):>5} attrs   median {median:>3} chars   longest {longest:>3}")
    print()
    return 0


def self_test() -> int:
    """Pure over text. Each case was watched failing before it passed."""
    failures = []

    # [1] comment stripping - a docblock naming a component is not a mount.
    if "SelectControl" in strip_comments("/** uses SelectControl */ const x = 1;"):
        failures.append("[1] block comment not stripped")
    if "SelectControl" in strip_comments("// SelectControl here\nconst x = 1;"):
        failures.append("[2] line comment not stripped")

    # [3] a real binding resolves.
    src = "<ToggleGroupControl value={ textAlign } onChange={ v => setAttributes({ textAlign: v }) } />"
    if resolve_control(src, "textAlign") != "ToggleGroupControl":
        failures.append("[3] failed to resolve a real ToggleGroupControl binding")

    # [4] NEGATIVE CONTROL: an attr named nowhere must NOT bind to a nearby control.
    if resolve_control(src, "somethingElse") != "unresolved":
        failures.append("[4] NEGATIVE CONTROL failed: bound an attribute the source never names")

    # [5] a block with no primitive at all reports `shared`, not a guess.
    if resolve_control("const x = textAlign;", "textAlign") != "shared":
        failures.append("[5] expected 'shared' where no primitive is present")

    # [6] the band rule honours the two established facts.
    for count, longest, want in ((3, 6, "ToggleGroupControl"), (12, 6, "ComboboxControl"),
                                 (7, 6, "SelectControl"), (4, 40, "ToggleGroupControl?")):
        got = recommend(count, longest)
        if got != want:
            failures.append(f"[6] recommend({count},{longest}) = {got!r}, expected {want!r}")

    # [7] the live scan must actually see the corpus.
    rows = declared_enums()
    if len(rows) < MIN_ENUMS:
        failures.append("[7] live scan below the anti-vacuity floor")

    for f in failures:
        print("  FAIL " + f)
    if failures:
        print(f"\n  self-test: {len(failures)} failure(s).")
        return 1
    print(f"  self-test: 7 case(s) passed, including a negative control. "
          f"Corpus: {len(rows)} declared enums.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
