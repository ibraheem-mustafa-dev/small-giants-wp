#!/usr/bin/env python3
"""build-poc-fixtures.py — create the nav-drawer variant POC fixtures on the canary.

WHY THIS EXISTS
---------------
Spec 36 FR-36-6's exit gate (Task 5) verifies each `sgs/nav-drawer` variant as an
EXACT clone of the reference design it was modelled on — INCLUDING CONTENT (design
gate `2026-07-28-nav-drawer-variants-design-gate.md` §6, Bean-binding). Holding the
content constant is the whole point: any visual difference between our variant and
the reference is then attributable to the BLOCK's capabilities, never to content
drift. So each fixture needs its OWN classic menu carrying the reference's real link
labels, and its seeded child blocks carrying the reference's real copy.

Doing that by hand across 7 variants is error-prone and unrepeatable, and the
follow-on `P-DRAWER-VARIANT-CONTENT-GENERICISE` pre-production step has to rewrite
the same fixtures again. Hence a script.

WHAT IT DOES
------------
For each variant in the content plan:
  1. Creates (or reuses) a classic nav menu named `poc-<variant>` via the REST
     `/wp/v2/menus` endpoint, with one custom-link item per reference link label.
  2. Creates (or updates) a page `poc-drawer-<variant>` whose block content is
     a header `sgs/nav-menu` (burger forced ALWAYS visible so desktop anchors are
     reachable) plus the variant's `sgs/nav-drawer` with its seeded child roster,
     text filled from the reference's real copy.
Plus one extra page holding TWO drawer instances (D374 multi-instance check).

Content is NEVER invented here: it comes from the plan file, which is authored from
the live harvest at `.claude/reports/2026-07-28-drawer-code-extraction/labels-*.json`.
A variant whose harvest is UNCONFIRMED is skipped loudly, not filled with a guess.

WHY REST AND NOT WP-CLI
-----------------------
`post_content` must never be written via WP-CLI/PHP on this project (a PreToolUse
hook enforces it; WP-CLI writes bypass block validation). REST with an application
password is the sanctioned path — same route the editor uses.

USAGE
-----
    python build-poc-fixtures.py --plan <path-to-plan.json> [--dry-run] [--only <variant>]
    python build-poc-fixtures.py --list          # show what exists on the canary now
    python build-poc-fixtures.py --delete-all    # remove every fixture this script made

Credentials come from `.claude/secrets/sandybrown.env` (gitignored).

EXIT CODES
----------
    0 — all requested fixtures created/updated
    1 — one or more fixtures failed (details on stderr); nothing is silently skipped
    2 — bad arguments, missing plan, or missing/unusable credentials
"""

from __future__ import annotations

import argparse
import base64
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

# .../plugins/sgs-blocks/scripts/nav-qa/this-file → up 4 to the repo root.
REPO_ROOT = Path(__file__).resolve().parents[4]
ENV_PATH = REPO_ROOT / ".claude" / "secrets" / "sandybrown.env"

# Burger 'Always' — nav-menu/edit.js BURGER_SCOPE_PX.always. Forces the burger to
# show at every width so the DESKTOP anchors (trigger/centred/header) are reachable
# on a 1440 viewport, which is the whole point of these fixtures.
BURGER_ALWAYS_PX = 99999

PAGE_SLUG_PREFIX = "poc-drawer-"
MENU_NAME_PREFIX = "poc-"


def load_env(path: Path) -> dict:
    """Parse a KEY=VALUE env file WITHOUT shell evaluation.

    The canary password contains `)` and `$`, which makes `source`-ing the file a
    shell syntax error — hence a plain parser rather than any shell involvement.
    """
    if not path.exists():
        sys.stderr.write(f"build-poc-fixtures: credentials not found at {path}\n")
        sys.exit(2)
    env = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip().strip('"').strip("'")
    missing = [
        k
        for k in ("WP_URL_SANDYBROWN", "WP_USER_SANDYBROWN", "WP_APP_PWD_SANDYBROWN")
        if not env.get(k)
    ]
    if missing:
        sys.stderr.write(
            f"build-poc-fixtures: {path} is missing {', '.join(missing)}\n"
        )
        sys.exit(2)
    return env


class WP:
    """Minimal authenticated WordPress REST client."""

    def __init__(self, base_url: str, user: str, app_password: str):
        self.base = base_url.rstrip("/") + "/wp-json/wp/v2"
        token = base64.b64encode(f"{user}:{app_password}".encode()).decode()
        self.headers = {
            "Authorization": "Basic " + token,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def _request(self, method: str, path: str, payload=None, params=None):
        url = self.base + path
        if params:
            url += "?" + urllib.parse.urlencode(params)
        data = json.dumps(payload).encode("utf-8") if payload is not None else None
        req = urllib.request.Request(url, data=data, headers=self.headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                body = response.read().decode("utf-8")
                return json.loads(body) if body else None
        except urllib.error.HTTPError as err:
            detail = err.read().decode("utf-8", "replace")[:400]
            raise RuntimeError(f"{method} {path} -> HTTP {err.code}: {detail}") from err

    def get(self, path, params=None):
        return self._request("GET", path, params=params)

    def post(self, path, payload):
        return self._request("POST", path, payload=payload)

    def delete(self, path, params=None):
        return self._request("DELETE", path, params=params)


def esc_attr_json(attrs: dict) -> str:
    """Serialise block attributes the way the block editor does.

    Compact separators + no ASCII escaping, so the stored markup matches what the
    editor itself would write (a mismatch here shows up as block validation noise).
    """
    return json.dumps(attrs, separators=(",", ":"), ensure_ascii=False)


def block(name: str, attrs: dict | None = None, inner: str | None = None) -> str:
    """Serialise one block comment. Self-closing when it has no inner content."""
    attr_str = f" {esc_attr_json(attrs)}" if attrs else ""
    if inner is None:
        return f"<!-- wp:{name}{attr_str} /-->"
    return f"<!-- wp:{name}{attr_str} -->\n{inner}\n<!-- /wp:{name} -->"


def build_children(children: list[dict]) -> str:
    """Serialise a variant's seeded child roster from the plan.

    Each entry is `{"block": "sgs/text", "attrs": {...}}` — the plan owns the real
    reference copy, so no text is generated here.
    """
    return "\n".join(block(c["block"], c.get("attrs") or None) for c in children)


def build_page_content(menu_id: int, variant: dict, drawer_ref: str | None = None) -> str:
    """Header bar + the variant's drawer, both bound to this fixture's own menu.

    `drawer_ref` overrides the drawer's DOM id and the burger's `aria-controls`.
    It must be unique per drawer on a page: both blocks default to
    `sgs-nav-drawer`, so two default drawers on one page would produce duplicate
    element ids and an ambiguous burger→panel binding (verified live 2026-07-29 —
    every burger on the probe page carried `aria-controls="sgs-nav-drawer"`).
    """
    bar_attrs = {
        "ref": menu_id,
        "navLabel": "Primary",
        # Burger ALWAYS, or the desktop anchors can never be opened at 1440.
        "collapsePoint": BURGER_ALWAYS_PX,
    }
    drawer_attrs = dict(variant["drawerAttrs"])
    if drawer_ref:
        bar_attrs["drawerRef"] = drawer_ref
        drawer_attrs["drawerRef"] = drawer_ref

    drawer_menu_attrs = {"ref": menu_id}
    drawer_menu_attrs.update(variant.get("navMenuAttrs") or {})
    inner = "\n".join(
        [block("sgs/nav-menu", drawer_menu_attrs), build_children(variant.get("children") or [])]
    ).strip()
    return (
        f"{filler('Header clearance', HEADER_CLEARANCE_PARAS)}\n\n"
        f"{block('sgs/nav-menu', bar_attrs)}\n\n"
        f"{block('sgs/nav-drawer', drawer_attrs, inner)}\n\n"
        f"{filler('Scroll filler', SCROLL_FILLER_PARAS)}"
    )


# Paragraphs placed ABOVE the fixture's nav bar so its burger clears the theme
# header's footprint. Measured 2026-07-29 at 375px: the site header is
# `position:absolute`, 251px tall (it renders the 305x102 DESKTOP logo at mobile
# width), and it overlaid the in-content burger at (24,101) — every click was
# intercepted by that logo image, which reads as a broken drawer but is the
# fixture's stacking arrangement, not the block.
#
# Scrolling CANNOT fix this: an absolutely-positioned header scrolls WITH the
# document, so its overlap with in-content elements is fixed in document space.
# The bar has to start below the header's box instead.
HEADER_CLEARANCE_PARAS = 6
# Trailing paragraphs so the page can scroll at all — needed by the pinned-header
# and scroll-restoration probes.
SCROLL_FILLER_PARAS = 24


def filler(label: str, paragraphs: int) -> str:
    """Neutral paragraphs. Not part of the clone; never compared against a reference."""
    return "\n".join(
        block("sgs/text", {"text": f"{label} paragraph {i + 1}. "
                                   "Fixture scaffolding, not part of the cloned design."})
        for i in range(paragraphs)
    )


def find_menu(wp: WP, name: str):
    for menu in wp.get("/menus", {"per_page": 100, "search": name}) or []:
        if menu.get("name") == name:
            return menu
    return None


def find_page(wp: WP, slug: str):
    found = wp.get("/pages", {"slug": slug, "status": "publish,draft", "per_page": 5})
    return found[0] if found else None


def ensure_menu(wp: WP, name: str, labels: list[dict], dry_run: bool) -> int:
    """Create the classic menu + its items. Reuses an existing menu by rebuilding it."""
    existing = find_menu(wp, name)
    if dry_run:
        print(f"    [dry-run] menu '{name}' ({len(labels)} items)"
              f"{' — exists, would rebuild' if existing else ' — would create'}")
        return existing["id"] if existing else 0

    if existing:
        menu_id = existing["id"]
        # Rebuild items so a re-run reflects a corrected harvest rather than
        # appending duplicates.
        for item in wp.get("/menu-items", {"menus": menu_id, "per_page": 100}) or []:
            wp.delete(f"/menu-items/{item['id']}", {"force": True})
    else:
        menu_id = wp.post("/menus", {"name": name, "description":
                                     "nav-drawer variant POC fixture (Spec 36 FR-36-6 Task 5)"})["id"]

    for position, label in enumerate(labels, start=1):
        wp.post(
            "/menu-items",
            {
                "title": label["text"],
                "url": label.get("url") or "#",
                "menus": menu_id,
                "menu_order": position,
                "status": "publish",
                "type": "custom",
            },
        )
    print(f"    menu '{name}' -> id {menu_id} ({len(labels)} items)")
    return menu_id


def ensure_page(wp: WP, slug: str, title: str, content: str, dry_run: bool) -> int:
    existing = find_page(wp, slug)
    if dry_run:
        print(f"    [dry-run] page '{slug}'"
              f"{' — exists, would update' if existing else ' — would create'}"
              f" ({len(content)} bytes of block markup)")
        return existing["id"] if existing else 0

    payload = {"title": title, "slug": slug, "content": content, "status": "publish"}
    if existing:
        page = wp.post(f"/pages/{existing['id']}", payload)
    else:
        page = wp.post("/pages", payload)
    print(f"    page '{slug}' -> id {page['id']}  {page['link']}")
    return page["id"]


def cmd_list(wp: WP) -> int:
    print("Menus:")
    for menu in wp.get("/menus", {"per_page": 100}) or []:
        if menu["name"].startswith(MENU_NAME_PREFIX):
            print(f"  {menu['id']:>6}  {menu['name']}")
    print("Pages:")
    for page in wp.get("/pages", {"per_page": 100, "search": PAGE_SLUG_PREFIX,
                                  "status": "publish,draft"}) or []:
        if page["slug"].startswith(PAGE_SLUG_PREFIX):
            print(f"  {page['id']:>6}  {page['slug']:<40} {page['link']}")
    return 0


def cmd_delete_all(wp: WP) -> int:
    removed = 0
    for page in wp.get("/pages", {"per_page": 100, "search": PAGE_SLUG_PREFIX,
                                  "status": "publish,draft"}) or []:
        if page["slug"].startswith(PAGE_SLUG_PREFIX):
            wp.delete(f"/pages/{page['id']}", {"force": True})
            print(f"  deleted page {page['id']} {page['slug']}")
            removed += 1
    for menu in wp.get("/menus", {"per_page": 100}) or []:
        if menu["name"].startswith(MENU_NAME_PREFIX):
            wp.delete(f"/menus/{menu['id']}", {"force": True})
            print(f"  deleted menu {menu['id']} {menu['name']}")
            removed += 1
    print(f"removed {removed} fixture object(s)")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--plan", help="path to the POC content plan JSON")
    parser.add_argument("--only", help="build a single variant by name")
    parser.add_argument("--dry-run", action="store_true",
                        help="print what would be created; touch nothing")
    parser.add_argument("--list", action="store_true", help="list existing fixtures")
    parser.add_argument("--delete-all", action="store_true",
                        help="delete every fixture page + menu this script creates")
    args = parser.parse_args()

    env = load_env(ENV_PATH)
    wp = WP(env["WP_URL_SANDYBROWN"], env["WP_USER_SANDYBROWN"], env["WP_APP_PWD_SANDYBROWN"])

    if args.list:
        return cmd_list(wp)
    if args.delete_all:
        return cmd_delete_all(wp)
    if not args.plan:
        parser.error("--plan is required (or use --list / --delete-all)")

    plan_path = Path(args.plan)
    if not plan_path.exists():
        sys.stderr.write(f"build-poc-fixtures: plan not found at {plan_path}\n")
        return 2
    plan = json.loads(plan_path.read_text(encoding="utf-8"))

    failures = []
    built = []

    for variant in plan["variants"]:
        name = variant["name"]
        if args.only and args.only != name:
            continue
        if variant.get("skip"):
            # An UNCONFIRMED harvest must be visible, never quietly absent.
            print(f"  SKIPPED {name}: {variant.get('skip')}")
            failures.append((name, f"skipped — {variant.get('skip')}"))
            continue

        print(f"  {name} (reference: {variant.get('reference', 'unknown')})")
        try:
            menu_id = ensure_menu(wp, MENU_NAME_PREFIX + name, variant["menuLabels"], args.dry_run)
            content = build_page_content(menu_id, variant)
            page_id = ensure_page(
                wp,
                PAGE_SLUG_PREFIX + name,
                f"POC drawer — {variant.get('title', name)}",
                content,
                args.dry_run,
            )
            built.append({"variant": name, "menu_id": menu_id, "page_id": page_id})
        except Exception as err:  # noqa: BLE001 — report every failure, never abort the batch
            sys.stderr.write(f"  FAILED {name}: {err}\n")
            failures.append((name, str(err)))

    # D374: a page carrying two instances of the same block, to catch per-render
    # collisions (shared IDs, top-level function redeclaration) that a single
    # instance can never surface.
    multi = plan.get("multiInstance")
    if multi and not args.only:
        print("  multi-instance page (D374)")
        try:
            menu_id = ensure_menu(wp, MENU_NAME_PREFIX + "multi", multi["menuLabels"], args.dry_run)
            parts = []
            for index, variant_name in enumerate(multi["variants"], start=1):
                source = next(v for v in plan["variants"] if v["name"] == variant_name)
                # Distinct refs — the correct operator configuration for 2 drawers
                # on one page. (The default-collision case is probed separately.)
                parts.append(build_page_content(menu_id, source, f"sgs-nav-drawer-{index}"))
            page_id = ensure_page(
                wp,
                PAGE_SLUG_PREFIX + "multi-instance",
                "POC drawer — two instances (D374)",
                "\n\n".join(parts),
                args.dry_run,
            )
            built.append({"variant": "multi-instance", "menu_id": menu_id, "page_id": page_id})
        except Exception as err:  # noqa: BLE001
            sys.stderr.write(f"  FAILED multi-instance: {err}\n")
            failures.append(("multi-instance", str(err)))

    print(f"\nbuilt {len(built)} fixture(s); {len(failures)} failure(s)")
    if built and not args.dry_run:
        print(json.dumps(built, indent=2))
    if failures:
        for name, reason in failures:
            sys.stderr.write(f"  UNBUILT {name}: {reason}\n")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
