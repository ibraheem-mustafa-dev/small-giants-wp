"""The render check's self-test, on scratch copies of the shop mirror named by MIRROR. Proves five things:

1. The same build twice passes (exit 0).
2. The report of that run names every signed-in account view, the filled basket, the checkout and an order
   confirmation as reached on both sides.
3. The wishlist panel's `cards` layout drawn as commit 9219e649c drew it (the site's product card in place of the
   frame-card row; reverted by 0f80558bd) fails the signed-in saved-items view (exit 1, that state differs).
4. A failed sign-in exits 2.
5. A picture file changed under the same name (the product photo's colours inverted in place) fails the product page on
   its screenshot pixels, though its HTML, styles and boxes are unchanged.

Both copies are seeded with the account block's saved-items layout set to `cards` (selftest/account-wishlist-cards.php),
the setting another client's site uses, so the saved-items view draws that layout.

Builds (checkouts with a built plugin): --main-build is a checkout of main with its build; --cards-build is the same
checkout and build with plugins/sgs-blocks/includes/wishlist/class-wishlist-cards-rest.php and
src/blocks/wishlist-panel as at 9219e649c (WishlistLayoutPanel.js as at ba8d5d0ec, whose label fix lets the editor file
parse) and build/blocks/wishlist-panel built from them. Making them: README.md, "Self-test builds".
"""
from __future__ import annotations

import json
import subprocess
import sys
import time
from pathlib import Path

from rc_site import to_wsl

HERE = Path(__file__).resolve().parent
MIRROR = "local-mamas"
SEED_STEP = ('wsl -d Ubuntu -u root -- bash -c "cd /var/www/{site} && sudo -u www-data wp --path=/var/www/{site} eval-file '
             + to_wsl(HERE / "selftest/account-wishlist-cards.php") + '"')
REACHED_NEEDED = ("cart-filled", "checkout", "order-received")


def _run(out: Path, jobs: int, *extra: str) -> tuple[int, dict]:
    cmd = [sys.executable, str(HERE / "render-check.py"), "--from", MIRROR, "--accepted", "none", "--seed-step", SEED_STEP, "--jobs", str(jobs), "--out", str(out), *extra]
    print("self-test: " + " ".join(cmd[1:]), flush=True)
    code = subprocess.run(cmd).returncode
    rep = out / "report.json"
    return code, json.loads(rep.read_text(encoding="utf-8")) if rep.exists() else {}


def self_test(a) -> int:
    for b in (a.main_build, a.cards_build):
        if not (Path(b) / "plugins/sgs-blocks/build/blocks/wishlist-panel/render.php").exists():
            print(f"self-test: {b} holds no built plugin; make the builds first (README.md, 'Self-test builds')", file=sys.stderr)
            return 3
    base = Path("E:/sgs-tmp/render-check/selftest") / time.strftime("%Y%m%d-%H%M%S")
    results = []

    code, rep = _run(base / "same-build", a.jobs, "--before", a.main_build, "--after", a.main_build)
    results.append(("the same build twice passes", code == 0, f"exit {code}: {rep.get('meta', {}).get('verdict')}"))
    states = rep.get("states", {})
    signed_in = sorted(n for n, r in states.items() if r["signedInView"])
    need = signed_in + list(REACHED_NEEDED)
    missing = [n for n in need if n not in states or not all(states[n]["reached"].values())]
    results.append(("the report names every signed-in view, the filled basket, the checkout and an order confirmation as reached",
                    bool(signed_in) and "account-saved-items" in signed_in and not missing,
                    f"signed-in views {signed_in}; not reached or absent: {missing or 'none'}"))

    code, rep = _run(base / "cards-9219", a.jobs, "--before", a.main_build, "--after", a.cards_build)
    states = rep.get("states", {})
    differ = sorted(n for n, r in states.items() if r["verdict"] == "differs")
    results.append(("the cards layout as 9219e649c drew it fails the signed-in saved-items view",
                    code == 1 and "account-saved-items" in differ, f"exit {code}; states that differ: {differ}"))

    code, rep = _run(base / "bad-sign-in", a.jobs, "--before", a.main_build, "--after", a.main_build, "--break-sign-in",
                     "--only", "account-dashboard,account-orders,cart-filled")
    states = rep.get("states", {})
    results.append(("a failed sign-in exits 2", code == 2 and states.get("account-dashboard", {}).get("verdict") == "unreached"
                    and states.get("cart-filled", {}).get("verdict") != "unreached",
                    f"exit {code}; {rep.get('meta', {}).get('verdict')}"))

    negate = ('wsl -d Ubuntu -u root -- bash -c "cd /var/www/{site} && sudo -u www-data wp --path=/var/www/{site} eval-file '
              + to_wsl(HERE / "selftest/negate-product-image.php") + '"')
    code, rep = _run(base / "picture-pixels", a.jobs, "--before", a.main_build, "--after", a.main_build, "--step", negate, "--only", "product")
    widths = rep.get("states", {}).get("product", {}).get("widths", {})
    px = [w for w, wr in widths.items() if any("pixels" in d for d in wr["confirmed"])]
    results.append(("a picture file changed under the same name fails on its pixels", code == 1 and bool(px),
                    f"exit {code}; widths with a screenshot difference: {px}"))

    print("\nself-test results (reports under " + str(base) + "):")
    for name, ok, detail in results:
        print(f"  {'PASS' if ok else 'FAIL'}  {name}: {detail}")
    return 0 if all(ok for _, ok, _ in results) else 1
