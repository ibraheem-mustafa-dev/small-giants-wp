#!/usr/bin/env python3
"""Container child-lift gate — the exclusion list must never grow back.

WHY THIS EXISTS (D784 + the 2026-08-25 design council).

`sgs/container`'s child-lift rules once carried hand-maintained `:not()` chains
naming every decorative layer that must NOT be lifted — 47 exclusions across six
rules, already drifted out of sync with each other. That list was SELF-DEFEATING:
each `:not(.x)` adds a class's specificity, so the base rule reached (0,10,0)
while a layer's own rule sits at (0,1,0). Every member added made the NEXT
unlisted layer more certain to lose, which is why SIX separate features hit it
independently and each was "fixed" by appending one more name.

The rules are now `:where(...)` at (0,0,0), so any element declaring its own
`position` wins automatically and no registration is needed anywhere.

This gate exists because the recorded failure mode is an agent meeting a lifted
layer and reaching for the nearest existing pattern — appending a `:not()` — which
would silently restore the whole trap. A comment asking nicely is not a gate.
"""
import re
import sys
from pathlib import Path

TARGET = Path(__file__).resolve().parent.parent / "src" / "blocks" / "container" / "style.css"
EXCLUSION = re.compile(r"\.sgs-container(?:--[a-z-]+)?\s*>\s*\*?(?::not\([^)]*\))+")
LIFT = re.compile(r":where\(\.sgs-container(?:--[a-z-]+)?\)\s*>\s*\*")


def scan(text):
    return EXCLUSION.findall(text), len(LIFT.findall(text))


def check(text, label):
    hits, lifts = scan(text)
    if hits:
        print(f"[container-child-lift] FAIL - {len(hits)} exclusion chain(s) in {label}:")
        for h in hits:
            print(f"    {h[:100]}")
        print("    FIX: a layer being wrongly lifted is missing its OWN `position`")
        print("         declaration. Fix it at the layer - never re-grow a list here.")
        return 1
    if lifts == 0:
        print(f"[container-child-lift] FAIL - no `:where(.sgs-container...) > *` rule in {label}.")
        print("    The child-lift rules were removed or renamed; this gate is now blind.")
        return 1
    print(f"[container-child-lift] PASS - 0 exclusion chains, {lifts} de-specified selector(s).")
    return 0


def self_test():
    clean = TARGET.read_text(encoding="utf-8")
    ok = True

    broken = clean.replace(":where(.sgs-container) > *",
                           ".sgs-container > *:not(.sgs-planted-defect)", 1)
    hits, _ = scan(broken)
    print(f"  [1] re-grown exclusion chain -> {'caught' if hits else 'MISSED'}")
    ok &= bool(hits)

    blinded = LIFT.sub(".sgs-nothing > *", clean)
    _, lifts = scan(blinded)
    print(f"  [2] child-lift rules removed -> {'caught' if lifts == 0 else 'MISSED'}")
    ok &= lifts == 0

    hits_clean, lifts_clean = scan(clean)
    print(f"  [3] clean tree stays clean   -> {'ok' if not hits_clean and lifts_clean else 'VACUOUS'}")
    ok &= (not hits_clean) and bool(lifts_clean)

    print(f"[container-child-lift --self-test] {'PASS' if ok else 'FAIL'} - 3 cases.")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(self_test() if "--self-test" in sys.argv else check(TARGET.read_text(encoding="utf-8"), TARGET.name))
