#!/usr/bin/env python3
"""build-header-fixtures.py — nav QA fixtures whose nav blocks sit INSIDE a real site header.

WHY THIS EXISTS
---------------
The earlier nav QA pages (3692-3695, 3699) hold `sgs/nav-bar-menu` blocks LOOSE in
`post_content`: the block's parent is `entry-content`, there is no `sgs/site-header`
above it, and `--sgs-mm-panel-width` is never derived from a header. They prove that
a nav block renders; they prove nothing about how a nav behaves in a header (header
width, capped or floating-pill geometry, the mega panel's width bound, the burger
opening a drawer from inside a header row). `sgs/nav-bar-menu` also declares
`ancestor: ["sgs/site-header-row"]`, so a loose one is not even a valid editor state.

WHAT IT BUILDS
--------------
Each page carries a real `sgs/site-header` > `sgs/site-header-row` structure written
into the page's own post_content (the active header/drawer pointers are GLOBAL options,
so a per-fixture header can only live in the page itself):

  qa-hdr-mega-dropdown-drawer         logo + nav-bar-menu (plain item, dropdown with
                                      several children, mega item, plain item) + cart +
                                      account icon; the burger opens an in-content drawer
  qa-hdr-mega-dropdown-drawer-capped  same, header `maxWidth` capped (tier object)
  qa-hdr-mega-dropdown-drawer-pill    same, floating pill: `headerFloat` on every tier,
                                      `headerFloatInset`, `backdropBlur`, `maxWidth`
  qa-hdr-drawer-submenus              header with a burger that is ALWAYS visible; the
                                      drawer's nav-drawer-menu carries submenus + a mega
                                      item (which the drawer degrades to a plain link)

The theme template still renders the site's own active header above `<main>`, so every
fixture page has TWO `<header>` elements. Scope probes to `.entry-content header.sgs-site-header`.

Content is real site data: link labels and URLs are the canary's own nav labels/pages,
and the mega item points at the existing `sgs_mega_menu` post (SPIKE Brands Panel).

WHY REST AND NOT WP-CLI
-----------------------
`post_content` must never be written via WP-CLI/PHP on this project (a PreToolUse hook
enforces it). REST with an application password is the sanctioned path.

USAGE
-----
    python build-header-fixtures.py                 # create/update every fixture
    python build-header-fixtures.py --only qa-hdr-mega-dropdown-drawer-pill
    python build-header-fixtures.py --dry-run
    python build-header-fixtures.py --list
    python build-header-fixtures.py --delete-all    # only pages/menus this script created

Credentials come from `.claude/secrets/sandybrown.env` (gitignored).

EXIT CODES
----------
    0 — everything requested was created/updated
    1 — a fixture failed (details on stderr)
    2 — bad arguments or missing/unusable credentials
"""

from __future__ import annotations

import argparse
import base64
import json
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

# .../plugins/sgs-blocks/scripts/nav-qa/this-file -> up 4 to the repo root.
REPO_ROOT = Path(__file__).resolve().parents[4]
ENV_PATH = REPO_ROOT / ".claude" / "secrets" / "sandybrown.env"

PAGE_SLUG_PREFIX = "qa-hdr-"
MENU_NAME = "qa-hdr-nav"
TITLE_PREFIX = "[QA] HDR "

# The existing published `sgs_mega_menu` post ("SPIKE Brands Panel") — real mega content.
MEGA_POST_ID = 1745

# Real site pages (the canary's own nav labels and URLs — see menu "Mamas Munches Main").
MENU_ITEMS = [
    {"key": "home", "title": "Home", "url": "/"},
    {"key": "shop", "title": "Shop", "url": "/shop/"},
    {"key": "gift", "title": "Gift Ideas", "url": "/gift-ideas/", "parent": "shop"},
    {"key": "ward", "title": "Send to Ward", "url": "/send-to-ward/", "parent": "shop"},
    {"key": "faqs", "title": "FAQs", "url": "/faqs/", "parent": "shop"},
    {"key": "story", "title": "Our Story", "url": "/about/", "parent": "shop"},
    {"key": "brands", "title": "Brands", "mega": MEGA_POST_ID},
    {"key": "blog", "title": "Blog", "url": "/blog/"},
]

# Body paragraphs under the header so dropdowns / the mega panel open OVER content.
BODY_PARAS = 14


def load_env(path: Path) -> dict:
    """Parse KEY=VALUE WITHOUT shell evaluation (the password contains `)` and `$`)."""
    if not path.exists():
        sys.stderr.write(f"build-header-fixtures: credentials not found at {path}\n")
        sys.exit(2)
    env = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip().strip('"').strip("'")
    missing = [k for k in ("WP_URL_SANDYBROWN", "WP_USER_SANDYBROWN", "WP_APP_PWD_SANDYBROWN")
               if not env.get(k)]
    if missing:
        sys.stderr.write(f"build-header-fixtures: {path} is missing {', '.join(missing)}\n")
        sys.exit(2)
    return env


def ssl_context() -> ssl.SSLContext:
    """certifi's bundle when present. The Windows store can hold a stale root and reject a
    valid Hostinger chain ("certificate has expired") while curl and browsers accept it."""
    try:
        import certifi  # type: ignore

        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


class WP:
    """Minimal authenticated WordPress REST client."""

    def __init__(self, base_url: str, user: str, app_password: str):
        self.site = base_url.rstrip("/")
        self.base = self.site + "/wp-json/wp/v2"
        token = base64.b64encode(f"{user}:{app_password}".encode()).decode()
        self.headers = {
            "Authorization": "Basic " + token,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        self.ctx = ssl_context()

    def _request(self, method: str, path: str, payload=None, params=None):
        url = self.base + path
        if params:
            url += "?" + urllib.parse.urlencode(params)
        data = json.dumps(payload).encode("utf-8") if payload is not None else None
        req = urllib.request.Request(url, data=data, headers=self.headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=60, context=self.ctx) as response:
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


# --------------------------------------------------------------------- markup ---

def attrs_json(attrs: dict) -> str:
    """Serialise attributes the way the block editor does (compact, no ASCII escaping)."""
    return json.dumps(attrs, separators=(",", ":"), ensure_ascii=False)


def block(name: str, attrs: dict | None = None, inner: str | None = None) -> str:
    attr_str = f" {attrs_json(attrs)}" if attrs else ""
    if inner is None:
        return f"<!-- wp:{name}{attr_str} /-->"
    return f"<!-- wp:{name}{attr_str} -->\n{inner}\n<!-- /wp:{name} -->"


def body_filler() -> str:
    """Neutral scaffolding paragraphs. Not part of any design under test."""
    return "\n".join(
        block("sgs/text", {"text": f"Body paragraph {i + 1}. "
                                   "Fixture scaffolding, so menus open over real content."})
        for i in range(BODY_PARAS)
    )


def site_header(header_attrs: dict, rows: list[str]) -> str:
    attrs = {"align": "full", "backgroundColour": "surface"}
    attrs.update(header_attrs)
    return block("sgs/site-header", attrs, "\n".join(rows))


def middle_row(children: list[str]) -> str:
    return block(
        "sgs/site-header-row",
        {
            "rowSlot": "middle",
            "justifyContent": "space-between",
            "padding": {"desktop": {"top": "var(--wp--preset--spacing--30)",
                                    "bottom": "var(--wp--preset--spacing--30)"}},
        },
        "\n".join(children),
    )


def drawer(menu_id: int) -> str:
    """In-content drawer: the page's own drawer wins over the site's active CPT drawer
    (proven on the earlier Gate 2 re-run), so the burger opens THIS one."""
    inner = "\n".join([
        block("sgs/nav-drawer-menu", {"ref": menu_id, "navLabel": "QA drawer"}),
        block("sgs/responsive-logo", {"width": 140, "linkToHome": True}),
    ])
    return block("sgs/nav-drawer", {}, inner)


def page_full_nav(menu_id: int, header_attrs: dict) -> str:
    """Header: logo + nav bar (dropdown + mega + plain) + cart + account. Burger below 768."""
    row = middle_row([
        block("sgs/responsive-logo", {"width": 140, "linkToHome": True}),
        block("sgs/nav-bar-menu", {"ref": menu_id, "navLabel": "QA primary",
                                   "itemColour": "text", "gap": "28px"}),
        block("sgs/cart", {}),
        block("sgs/icon", {"iconName": "user", "iconSize": 20, "ariaLabel": "My Account",
                           "linkUrl": "/my-account/"}),
    ])
    return "\n\n".join([site_header(header_attrs, [row]), drawer(menu_id), body_filler()])


def page_drawer_submenus(menu_id: int, header_attrs: dict) -> str:
    """Header with an ALWAYS-visible burger (collapsePoint 99999), so the drawer opens at 1440."""
    row = middle_row([
        block("sgs/responsive-logo", {"width": 140, "linkToHome": True}),
        block("sgs/nav-bar-menu", {"ref": menu_id, "navLabel": "QA burger",
                                   "collapsePoint": 99999}),
    ])
    return "\n\n".join([site_header(header_attrs, [row]), drawer(menu_id), body_filler()])


def page_hover_parity(menu_id: int, header_attrs: dict) -> str:
    """W3A-3 hover-parity fixture: a header nav that sets an underline hover treatment
    (a 2px bottom item border that changes colour on hover, plus a hover text-decoration)
    on a menu holding plain items, an item with a dropdown and an item with a mega."""
    row = middle_row([
        block("sgs/responsive-logo", {"width": 140, "linkToHome": True}),
        block("sgs/nav-bar-menu", {"ref": menu_id, "navLabel": "QA hover parity",
                                   "itemColour": "text", "gap": "28px",
                                   "itemBorderWidth": {"bottom": "2px"},
                                   "itemBorderStyle": "solid",
                                   "itemBorderColour": "transparent",
                                   "itemBorderColourHover": "accent",
                                   "itemTextDecorationHover": "underline"}),
    ])
    return "\n\n".join([site_header(header_attrs, [row]), body_filler()])


# The three header variants. Attribute names are `sgs/site-header` block.json's own;
# `maxWidth` and `headerFloat` are TIER OBJECTS (a scalar silently emits nothing).
CAPPED = {"maxWidth": {"desktop": "1120px"}}
PILL = {
    "headerFloat": {"desktop": "on", "tablet": "on", "mobile": "on"},
    "headerFloatInset": {"desktop": {"top": "1rem", "right": "1rem", "left": "1rem"}},
    "backdropBlur": "8px",
    "maxWidth": {"desktop": "1120px"},
    "borderRadius": {"desktop": {"topLeft": "8px", "topRight": "8px",
                                 "bottomLeft": "8px", "bottomRight": "8px"}},
}

FIXTURES = [
    {"slug": "qa-hdr-mega-dropdown-drawer", "title": "mega + dropdown + drawer, full-width header",
     "build": page_full_nav, "header": {}},
    {"slug": "qa-hdr-mega-dropdown-drawer-capped", "title": "mega + dropdown + drawer, capped header",
     "build": page_full_nav, "header": CAPPED},
    {"slug": "qa-hdr-mega-dropdown-drawer-pill", "title": "mega + dropdown + drawer, floating pill header",
     "build": page_full_nav, "header": PILL},
    {"slug": "qa-hdr-drawer-submenus", "title": "drawer with submenus + mega item",
     "build": page_drawer_submenus, "header": {}},
    {"slug": "qa-hdr-hover-parity", "title": "underline hover parity: plain, dropdown and mega items",
     "build": page_hover_parity, "header": {}},
    # U-1: transparent on desktop, force-solid on mobile (the combination whose mobile
    # background the merge used to revert away). `contrastSafe` and `headerTransparent`
    # are tier objects.
    {"slug": "qa-hdr-force-solid", "title": "transparent on desktop, force-solid on mobile",
     "build": page_full_nav,
     "header": {"headerTransparent": {"desktop": "on"},
                "contrastSafe": {"mobile": "force-solid"}}},
    # U-1: per-tier stacking order. `zIndex` is a tier object of whole numbers; the drawer
    # scale derives from the published `--sgs-header-z`.
    {"slug": "qa-hdr-z-index", "title": "sticky header with z-index 10 on desktop, 999 on mobile",
     "build": page_full_nav,
     "header": {"zIndex": {"desktop": 10, "mobile": 999},
                "headerSticky": {"desktop": "on", "tablet": "on", "mobile": "on"}}},
]


# ----------------------------------------------------------------- WP objects ---

def find_menu(wp: WP):
    for menu in wp.get("/menus", {"per_page": 100, "search": MENU_NAME}) or []:
        if menu.get("name") == MENU_NAME:
            return menu
    return None


def ensure_menu(wp: WP, dry_run: bool) -> int:
    """Create the classic menu, rebuilding its items on every run so a re-run cannot append."""
    existing = find_menu(wp)
    if dry_run:
        print(f"    [dry-run] menu '{MENU_NAME}' ({len(MENU_ITEMS)} items)"
              f"{' - exists, would rebuild' if existing else ' - would create'}")
        return existing["id"] if existing else 0

    if existing:
        menu_id = existing["id"]
        for item in wp.get("/menu-items", {"menus": menu_id, "per_page": 100}) or []:
            wp.delete(f"/menu-items/{item['id']}", {"force": True})
    else:
        menu_id = wp.post("/menus", {"name": MENU_NAME,
                                     "description": "nav QA fixtures inside a real header"})["id"]

    ids: dict[str, int] = {}
    for position, item in enumerate(MENU_ITEMS, start=1):
        payload = {"title": item["title"], "menus": menu_id, "menu_order": position,
                   "status": "publish"}
        if item.get("mega"):
            payload.update({"type": "post_type", "object": "sgs_mega_menu",
                            "object_id": item["mega"]})
        else:
            payload.update({"type": "custom", "url": item["url"]})
        if item.get("parent"):
            payload["parent"] = ids[item["parent"]]
        ids[item["key"]] = wp.post("/menu-items", payload)["id"]
    print(f"    menu '{MENU_NAME}' -> id {menu_id} ({len(MENU_ITEMS)} items)")
    return menu_id


def find_page(wp: WP, slug: str):
    found = wp.get("/pages", {"slug": slug, "status": "publish,draft", "per_page": 5})
    return found[0] if found else None


def ensure_page(wp: WP, fixture: dict, content: str, dry_run: bool) -> dict:
    slug = fixture["slug"]
    existing = find_page(wp, slug)
    if dry_run:
        print(f"    [dry-run] page '{slug}'{' - exists, would update' if existing else ' - would create'}"
              f" ({len(content)} bytes of block markup)")
        return {"id": existing["id"] if existing else 0, "link": ""}
    payload = {"title": TITLE_PREFIX + fixture["title"], "slug": slug,
               "content": content, "status": "publish"}
    page = wp.post(f"/pages/{existing['id']}", payload) if existing else wp.post("/pages", payload)
    print(f"    page '{slug}' -> id {page['id']}  {page['link']}")
    return page


def our_pages(wp: WP) -> list[dict]:
    """Pages this script owns: exact known slugs, plus anything with the slug prefix that
    the title search turns up. Never matches a page without the prefix."""
    seen: dict[int, dict] = {}
    for fixture in FIXTURES:
        page = find_page(wp, fixture["slug"])
        if page:
            seen[page["id"]] = page
    for page in wp.get("/pages", {"per_page": 100, "search": TITLE_PREFIX.strip(),
                                  "status": "publish,draft"}) or []:
        if page["slug"].startswith(PAGE_SLUG_PREFIX):
            seen[page["id"]] = page
    return sorted(seen.values(), key=lambda p: p["id"])


def cmd_list(wp: WP) -> int:
    menu = find_menu(wp)
    print("Menu:")
    print(f"  {menu['id']:>6}  {menu['name']}" if menu else "  (none)")
    print("Pages:")
    for page in our_pages(wp):
        print(f"  {page['id']:>6}  {page['slug']:<40} {page['link']}")
    return 0


def cmd_delete_all(wp: WP) -> int:
    removed = 0
    for page in our_pages(wp):
        wp.delete(f"/pages/{page['id']}", {"force": True})
        print(f"  deleted page {page['id']} {page['slug']}")
        removed += 1
    menu = find_menu(wp)
    if menu:
        wp.delete(f"/menus/{menu['id']}", {"force": True})
        print(f"  deleted menu {menu['id']} {menu['name']}")
        removed += 1
    print(f"removed {removed} fixture object(s)")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--only", help="build a single fixture by slug")
    parser.add_argument("--dry-run", action="store_true", help="print what would happen; touch nothing")
    parser.add_argument("--list", action="store_true", help="list existing fixtures")
    parser.add_argument("--delete-all", action="store_true",
                        help="delete every page + the menu this script created")
    args = parser.parse_args()

    env = load_env(ENV_PATH)
    wp = WP(env["WP_URL_SANDYBROWN"], env["WP_USER_SANDYBROWN"], env["WP_APP_PWD_SANDYBROWN"])

    if args.list:
        return cmd_list(wp)
    if args.delete_all:
        return cmd_delete_all(wp)

    chosen = [f for f in FIXTURES if not args.only or f["slug"] == args.only]
    if not chosen:
        parser.error(f"--only {args.only!r} matches no fixture; known: "
                     + ", ".join(f["slug"] for f in FIXTURES))

    failures = []
    built = []
    try:
        menu_id = ensure_menu(wp, args.dry_run)
    except Exception as err:  # noqa: BLE001
        sys.stderr.write(f"  FAILED menu: {err}\n")
        return 1

    for fixture in chosen:
        print(f"  {fixture['slug']}")
        try:
            content = fixture["build"](menu_id, fixture["header"])
            page = ensure_page(wp, fixture, content, args.dry_run)
            built.append({"slug": fixture["slug"], "page_id": page["id"], "url": page["link"]})
        except Exception as err:  # noqa: BLE001 - report every failure, never abort the batch
            sys.stderr.write(f"  FAILED {fixture['slug']}: {err}\n")
            failures.append((fixture["slug"], str(err)))

    print(f"\nbuilt {len(built)} fixture(s); {len(failures)} failure(s)")
    if built and not args.dry_run:
        print(json.dumps(built, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
