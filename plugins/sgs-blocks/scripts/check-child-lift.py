#!/usr/bin/env python3
r"""check-child-lift — every child-lift rule in the tree stays at ZERO specificity.

WHY THIS EXISTS
---------------
A "child-lift" rule is any rule whose selector ends in `> *` and whose body sets
BOTH `position` and `z-index`. Its job is to lift a block's own children above a
decorative layer (a background, an overlay, a canvas) so the content paints on top.

The trap it creates is subtle and has now caught SEVEN features independently:

  Each `:not(.x)` added to such a rule ADDS a class's specificity. The base rule
  climbs to (0,2,0), (0,3,0)… while a decorative layer's own rule sits at (0,1,0).
  Every name added makes the NEXT unlisted layer MORE certain to lose. The rule
  then overrides that layer's own `position`, dropping it into normal flow — and
  the symptom never looks like a cascade problem. `fx-wave-gradient.css` recorded
  its own: the canvas rendered at x=24 y=466 instead of filling the block, and the
  section grew to 5266px, because an in-flow `height:100%` child feeds its height
  back into the parent that sizes it. One selector, three symptoms.

  Even with NO `:not()`, an un-wrapped selector at (0,1,0) ties with a decorative
  layer's own rule and wins on SOURCE ORDER — a fight decided by which stylesheet
  happens to load second. `fx-surface-treatment.css` spent months hand-scoping its
  own selector defensively to survive exactly that tie.

D784 fixed `container/style.css` by wrapping its six rules in `:where()` — zero
specificity — and deleting 47 exclusions. At (0,0,0) ANY element declaring its own
`position` out-ranks the lift automatically, with no registration anywhere. A new
decorative layer needs to do nothing except style itself.

This gate makes that property hold for the WHOLE TREE, not one file. It supersedes
`check-container-child-lift.py` (D784), which asserted the same property over
`container/style.css` alone — every guarantee that gate made is made here, over
136 files instead of one.

WHAT IT ASSERTS
---------------
For every child-lift rule found anywhere in the scanned corpus:
  R1  the selector is wrapped in `:where(...)`   → zero specificity
  R2  the selector carries NO `:not(` chain      → no exclusion list, ever

Plus an anti-vacuity floor: finding FEWER than `_FLOOR` child-lift rules means the
scan has gone blind (files moved, the shape changed, a glob broke) and the gate
FAILS CLOSED rather than reporting a cheerful zero. A gate that cannot see its
input has verified nothing — the doctrine is copied verbatim from
`check-fx-list-drift.py`, and this repo has shipped a guard with a stray backspace
in its regex that matched nothing and passed green for hours.

GATE SHAPE (matches check-container-child-lift.py)
--------------------------------------------------
- Default (no flag): GATING mode. Exit 1 on any violation or a vacuous scan.
- --self-test:       proves the gate can fail — plants each defect, asserts it is
                     caught, restores, and re-asserts clean. Pure over TEXT; it
                     never writes to disk.

Run: python plugins/sgs-blocks/scripts/check-child-lift.py

@package SGS\Blocks
"""
from __future__ import annotations

import glob
import os
import re
import sys
from pathlib import Path

_PLUGIN_ROOT = Path(__file__).resolve().parent.parent
_REPO_ROOT = _PLUGIN_ROOT.parent.parent

# Corpus. Every stylesheet that can carry a child-lift rule. Deliberately wider
# than the blocks plugin — the theme ships CSS too, and a census that stops at
# `src/blocks/*/style.css` sees a fifth of the surface.
_GLOBS = (
    _PLUGIN_ROOT / "assets" / "css" / "*.css",
    _PLUGIN_ROOT / "src" / "blocks" / "*" / "style.css",
    _PLUGIN_ROOT / "src" / "blocks" / "*" / "editor.css",
    _REPO_ROOT / "theme" / "sgs-theme" / "assets" / "css" / "*.css",
    _REPO_ROOT / "theme" / "sgs-theme" / "styles" / "*.css",
)

# Anti-vacuity floor. There are 8 child-lift rules as of 2026-08-25 (6 in
# container/style.css, wave-gradient, cursor-field, mega-panel). Floor sits below
# that so legitimate deletion does not red the build, but far enough above zero
# that a broken scan cannot pass.
_FLOOR = 5

_COMMENT = re.compile(r"/\*.*?\*/", re.S)
# A rule whose selector contains `> *` and whose body sets position AND z-index.
_RULE = re.compile(r"([^{}]*?>\s*\*[^{}]*?)\{([^{}]*)\}", re.S)


class VacuousScan(Exception):
    """The scan came back thin — it has verified nothing."""


def _files() -> list[Path]:
    out: list[Path] = []
    for g in _GLOBS:
        out.extend(Path(p) for p in glob.glob(str(g)))
    return sorted(out)


def find_child_lifts(text: str) -> list[tuple[str, bool, int]]:
    """Return (selector, is_where_wrapped, not_count) for each child-lift rule.

    Pure over TEXT so the self-test can plant defects in memory. Comments are
    stripped FIRST — a census that counts its own documentation is an estimate
    wearing a badge (this repo made that exact error on 2026-08-25: 65 vs 58).
    """
    stripped = _COMMENT.sub("", text)
    found: list[tuple[str, bool, int, bool]] = []
    for m in _RULE.finditer(stripped):
        selector, body = m.group(1).strip(), m.group(2)
        is_lift = "position" in body and "z-index" in body
        # ⛔ SCOPED TO REAL LIFTS ON PURPOSE — do NOT widen this to "any `> *`
        # rule carrying a `:not()`". That was tried on 2026-08-25 and produced
        # two immediate FALSE POSITIVES: `site-footer-row/editor.css` and
        # `site-header-row/editor.css` both use `:not( :has( > * ) )` — an
        # EMPTY-STATE selector meaning "a row with no children". The `> *` sits
        # inside `:has()` inside `:not()`; it is not an exclusion chain and the
        # rule is not a lift. Only a rule that sets BOTH `position` and
        # `z-index` can create the stacking context that traps a layer, so only
        # those are this gate's business.
        if not is_lift:
            continue
        flat = " ".join(selector.split())
        not_count = flat.count(":not(")
        found.append((flat, ":where(" in flat, not_count, is_lift))
    return found


def scan(sources: dict[str, str]) -> tuple[list[str], int]:
    """Return (violation messages, total child-lift rules seen)."""
    violations: list[str] = []
    total = 0
    for label, text in sorted(sources.items()):
        for selector, is_where, not_count, is_lift in find_child_lifts(text):
            total += 1
            short = selector if len(selector) <= 88 else selector[:85] + "..."
            # R2 first: an exclusion chain is the more dangerous fault.
            if not_count:
                violations.append(
                    f"{label}: child-lift carries {not_count} `:not()` exclusion(s) - {short}"
                )
            elif not is_where:
                violations.append(
                    f"{label}: child-lift is not `:where()`-wrapped - {short}"
                )
    return violations, total


def _load() -> dict[str, str]:
    sources: dict[str, str] = {}
    for p in _files():
        try:
            sources[os.path.relpath(p, _REPO_ROOT)] = p.read_text(
                encoding="utf-8", errors="replace"
            )
        except OSError as exc:  # pragma: no cover - unreadable file is a real failure
            raise VacuousScan(f"could not read {p}: {exc}") from exc
    if not sources:
        raise VacuousScan(
            "no stylesheets matched any glob - the corpus moved or a path is wrong"
        )
    return sources


def check(sources: dict[str, str]) -> int:
    violations, total = scan(sources)

    if total < _FLOOR:
        print(
            f"[child-lift] FAIL - found only {total} child-lift rule(s) across "
            f"{len(sources)} stylesheet(s); floor is {_FLOOR}."
        )
        print("    The scan has gone BLIND - the rule shape changed, or a glob broke.")
        print("    A gate that cannot see its input has verified nothing.")
        return 1

    if violations:
        print(f"[child-lift] FAIL - {len(violations)} violation(s):")
        for v in violations:
            print(f"    {v}")
        print("    FIX: wrap the selector in `:where(...)` and DELETE any `:not()`")
        print("         chain. A layer that must not be lifted needs its OWN")
        print("         `position` declaration - fix it at the layer, never by")
        print("         re-growing a list here. See D784 + container/style.css.")
        return 1

    print(
        f"[child-lift] PASS - {total} child-lift rule(s) across {len(sources)} "
        f"stylesheet(s), all at zero specificity, 0 exclusion chains."
    )
    return 0


def self_test() -> int:
    """Prove the gate can fail. Pure in-memory; the real tree is never written."""
    try:
        clean = _load()
    except VacuousScan as exc:
        print(f"[child-lift --self-test] FAIL - cannot load corpus: {exc}")
        return 1

    ok = True
    cases = 0

    # [0] NEGATIVE CONTROL — the real tree is clean AND the scan is not vacuous.
    violations, total = scan(clean)
    cases += 1
    good = not violations and total >= _FLOOR
    print(
        f"  [0] negative control: clean tree passes, scan non-vacuous "
        f"({total} rules) -> {'ok' if good else 'FAIL'}"
    )
    if violations:
        for v in violations:
            print(f"        unexpected: {v}")
    ok &= good

    # Pick a real `:where()`-wrapped child-lift to mutate. Asserting we FOUND one
    # is itself load-bearing: if the anchor is missing, the cases below would
    # silently no-op and "pass" while testing nothing.
    anchor_label = None
    for label, text in sorted(clean.items()):
        for selector, is_where, not_count, is_lift in find_child_lifts(text):
            if is_lift and is_where and not not_count:
                anchor_label = label
                break
        if anchor_label:
            break

    cases += 1
    print(
        f"  [1] a `:where()` child-lift anchor exists to mutate -> "
        f"{'ok (' + str(anchor_label) + ')' if anchor_label else 'FAIL - no anchor'}"
    )
    ok &= bool(anchor_label)

    if anchor_label:
        original = clean[anchor_label]

        # [2] R1 — strip `:where(` wrapping; the rule climbs off zero specificity.
        broken = original.replace(":where( ", "", 1).replace(":where(", "", 1)
        broken = broken.replace(" )", "", 1) if broken != original else broken
        mutated = broken != original
        v, _ = scan({**clean, anchor_label: broken})
        caught = any("not `:where()`-wrapped" in x for x in v)
        cases += 1
        print(
            f"  [2] R1: un-wrap a child-lift -> "
            f"{'caught' if caught else ('MISSED' if mutated else 'VACUOUS - mutation did not land')}"
        )
        ok &= caught and mutated

        # [3] R2 — plant an exclusion chain, the D784 shape.
        chained = re.sub(
            r"(>\s*\*)(\s*\{)",
            r"\1:not( .sgs-planted-defect )\2",
            original,
            count=1,
        )
        mutated = chained != original
        v, _ = scan({**clean, anchor_label: chained})
        caught = any(":not()` exclusion" in x for x in v)
        cases += 1
        print(
            f"  [3] R2: plant a `:not()` exclusion chain -> "
            f"{'caught' if caught else ('MISSED' if mutated else 'VACUOUS - mutation did not land')}"
        )
        ok &= caught and mutated

        # [4] R2 beats R1 — an un-wrapped rule that ALSO has a chain reports the
        # chain (the more specific, more dangerous fault), not just the wrapping.
        both = re.sub(
            r"(>\s*\*)(\s*\{)", r"\1:not( .x )\2", broken, count=1
        )
        mutated = both != broken
        v, _ = scan({**clean, anchor_label: both})
        caught = any(":not()` exclusion" in x for x in v)
        cases += 1
        print(
            f"  [4] R2 takes precedence over R1 on a doubly-broken rule -> "
            f"{'caught' if caught else ('MISSED' if mutated else 'VACUOUS')}"
        )
        ok &= caught and mutated

    # [5] BLINDNESS — the rule shape vanishes entirely; the floor must fail closed.
    blinded = {k: v.replace("> *", "> .sgs-nothing") for k, v in clean.items()}
    _, total_blind = scan(blinded)
    rc = check(blinded)
    cases += 1
    good = total_blind < _FLOOR and rc == 1
    print(f"  [5] blindness: child-lift shape removed -> {'caught' if good else 'MISSED'}")
    ok &= good

    # [6] COMMENT IMMUNITY — a `> *` rule quoted inside a comment must NOT count.
    # Without comment-stripping this file's own docblocks would produce phantom
    # findings; this is the guard against the 65-vs-58 miscount.
    decoy = (
        "/* [data-sgs-fake] > *:not( .x ) { position: relative; z-index: 1; } */\n"
        "body { color: red; }\n"
    )
    v, t = scan({"decoy.css": decoy})
    cases += 1
    good = not v and t == 0
    print(f"  [6] a child-lift quoted in a COMMENT is not counted -> {'ok' if good else 'FAIL'}")
    ok &= good

    # [7] POSITIVE CONTROL for [6] — the same rule OUTSIDE a comment IS caught.
    # Without this, [6] would pass even if the scanner were broken entirely.
    live = "[data-sgs-fake] > *:not( .x ) { position: relative; z-index: 1; }\n"
    v, t = scan({"live.css": live})
    cases += 1
    good = t == 1 and any(":not()` exclusion" in x for x in v)
    print(f"  [7] the same rule OUTSIDE a comment IS caught -> {'ok' if good else 'FAIL'}")
    ok &= good

    # [8] SHAPE GUARD — a `> *` rule with no position/z-index is NOT a child-lift
    # and must not be flagged (proves the gate does not overmatch).
    benign = ".sgs-thing > * + * { margin-top: 1rem; }\n"
    v, t = scan({"benign.css": benign})
    cases += 1
    good = not v and t == 0
    print(f"  [8] a `> *` rule that is NOT a child-lift is ignored -> {'ok' if good else 'FAIL'}")
    ok &= good

    # [8b] OVERMATCH CONTROL — the REAL shape that a widened R2 false-flagged on
    # 2026-08-25. `:not( :has( > * ) )` is an EMPTY-STATE selector; the `> *` is
    # nested inside `:has()` inside `:not()`. It is not an exclusion chain, the
    # rule is not a lift, and it must produce ZERO findings. Verbatim from
    # site-footer-row/editor.css, not a paraphrase.
    empty_state = (
        ".editor-styles-wrapper .sgs-site-footer-row:not(:has(> * )) {"
        " min-height: 40px; outline: 1px dashed #ccc; }"
    )
    v, t = scan({"empty-state.css": empty_state})
    cases += 1
    good = not v and t == 0
    print(
        f"  [8b] `:not( :has( > * ) )` empty-state selector is NOT flagged -> "
        f"{'ok' if good else 'FAIL - overmatch regression'}"
    )
    ok &= good

    # [9] SUPERSESSION PROOF — `container/style.css` (the sole corpus of the gate
    # this one replaces, check-container-child-lift.py / D784) is genuinely in
    # scope here, and its rules are among those verified. Without this, "strictly
    # wider" would be an assertion rather than a demonstrated fact.
    container_key = next(
        (k for k in clean if k.replace("\\", "/").endswith("blocks/container/style.css")),
        None,
    )
    container_rules = (
        len([r for r in find_child_lifts(clean[container_key]) if r[3]])
        if container_key
        else 0
    )
    cases += 1
    good = container_key is not None and container_rules >= 5
    print(
        f"  [9] supersedes check-container-child-lift: container/style.css in corpus "
        f"with {container_rules} lift rule(s) -> {'ok' if good else 'FAIL'}"
    )
    ok &= good

    # [10] restore-and-reassert — the real tree is still clean after all mutation.
    v, t = scan(clean)
    cases += 1
    good = not v and t >= _FLOOR
    print(f"  [10] clean tree still clean after mutation -> {'ok' if good else 'FAIL'}")
    ok &= good

    print(
        f"[child-lift --self-test] {'PASS' if ok else 'FAIL'} - {cases} case(s), "
        f"including 3 controls (negative, positive, overmatch)."
    )
    return 0 if ok else 1


def main() -> int:
    if "--self-test" in sys.argv:
        return self_test()
    try:
        return check(_load())
    except VacuousScan as exc:
        print(f"[child-lift] FAIL - {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
