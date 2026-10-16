#!/usr/bin/env python3
"""check-motion-entrance-cascade.py - a Spec 38A entrance owns its animation longhands in a real browser cascade.

Runs tests/playwright/motion-entrance-cascade.check.mjs (Playwright Chromium, static pages that load the real motion,
trigger, media-element, wave-gradient, container and nav-drawer-menu stylesheets in both orders). It proves an entrance
on an element that also carries a looping animation (the media atom, the wave-gradient drift, the container ken burns)
plays once at its own duration and direction, and that the loop keeps running underneath and after it.

  --check      run the browser check; exit 0 only when every assertion passes
  --self-test  run it once per mutation (each deletes one load-bearing declaration in memory); every mutated run must
               fail, so a green --check is never vacuous
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
PLUGIN = Path(__file__).resolve().parents[1]
CHECK = PLUGIN / "tests" / "playwright" / "motion-entrance-cascade.check.mjs"
MUTATIONS = ("entrance-iteration", "entrance-duration", "base-name", "open-longhands")


def run(mutation: str = "") -> tuple[int, str]:
    node = shutil.which("node")
    if not node:
        return 2, "node not found on PATH"
    env = dict(os.environ)
    env.pop("SGS_ENTRANCE_CASCADE_MUTATE", None)
    if mutation:
        env["SGS_ENTRANCE_CASCADE_MUTATE"] = mutation
    done = subprocess.run([node, str(CHECK)], cwd=PLUGIN, env=env, capture_output=True, text=True, encoding="utf-8",
                          errors="replace", timeout=600)
    lines = (done.stdout.strip().splitlines() or done.stderr.strip().splitlines() or [""])
    if done.returncode != 0 and not mutation:
        print("\n".join(line for line in lines if line.startswith("FAIL")))
    return done.returncode, lines[-1]


def main() -> int:
    if "--self-test" in sys.argv:
        bad = []
        for mutation in MUTATIONS:
            code, tail = run(mutation)
            # 1 is a red run; 2 means the mutation needle no longer matches the stylesheet, which is also a failure.
            if 1 != code:
                bad.append(f"{mutation} (exit {code}: {tail})")
        if bad:
            print("check-motion-entrance-cascade self-test FAILED, mutations not caught: " + "; ".join(bad))
            return 1
        print(f"check-motion-entrance-cascade self-test: {len(MUTATIONS)}/{len(MUTATIONS)} mutations go red")
        return 0
    code, tail = run()
    print(f"check-motion-entrance-cascade: {tail}")
    return 0 if 0 == code else 1


if __name__ == "__main__":
    sys.exit(main())
