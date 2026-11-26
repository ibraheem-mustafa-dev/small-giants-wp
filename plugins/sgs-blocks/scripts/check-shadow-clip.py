#!/usr/bin/env python3
"""check-shadow-clip.py - a block container that can hold shadowed children never clips their shadows.

THE RULE (Bean, 2026-11-08): a box-shadow is never clipped by its own element; an ANCESTOR clips it. A container that holds
tiles, cards, items or panels and clips on both axes (`overflow` hidden / auto / scroll, `mask-image`, `clip-path`) cuts the
hover and resting shadows of what it holds. Two sanctioned shapes keep the clip and the shadow:

  (1) AXIS-ONLY CLIP: a container that only hides sideways overflow clips one axis with `overflow-x: clip` (or `overflow-y:
      clip`) and leaves the other `visible` (`clip`, unlike `hidden`, does not turn the other axis into `auto`).
  (2) RESERVED BLEED: a container that must scroll reserves the shared room inside its clip as padding and cancels it with a
      matching negative margin, both written with `var(--sgs-shadow-bleed, 80px)` (the token is defined once, in
      theme/sgs-theme/assets/css/utilities.css), so layout does not move but the shadows of its content have room.

A HIT is a style rule in `src/blocks/*/style.css` or `assets/css/*.css` that
  - clips on both axes (a one-axis `overflow-x: hidden|auto|scroll` counts: it forces the other axis to `auto`), or declares
    `mask-image` or `clip-path`, and
  - whose subject (the last compound of a selector) names a container that holds children (a block root, or an element named
    items, track, lane, list, grid, row, panel, wrap, viewport, slider, carousel, cards, tiles, scroller, inner, content, body),
    and
  - neither uses an axis-only clip nor mentions `--sgs-shadow-bleed` or `overflow-clip-margin` in the same rule, and
  - has no entry in ALLOW (file + selector pattern, each with its reason).

PHP-emitted CSS is covered for the one emitter that clips a scroll container (SCANNED_PHP): its `overflow-y:auto` rule must carry
the bleed.

THE TAP RULE (2026-11-26): the reserved bleed never takes a click meant for what it overlaps. Its padding is part of the
element's box, so a band of up to 80px beyond the visible row lies over the content above and below it (a button above a footer
gallery could not be tapped). The row keeps the pointer for its own work (its scrollbar drags; a wheel or a swipe from a gap
between tiles scrolls it), so the band is not made `pointer-events: none`; a click that lands on the band is handed to what lies
beneath by the always-on hand-off, assets/js/bleed-band-taps.js. Refused (clip `tap-band`):
  - the hand-off missing, or not enqueued on every page (includes/class-sgs-blocks.php::enqueue_frontend_assets): every bleed
    band in a stylesheet (every block stylesheet, assets/css and the theme's assets/css) or a PHP emitter (`includes/**/*.php`,
    `src/blocks/*/render.php`) is then a hit;
  - a band rule (stylesheet or PHP emitter) without `-webkit-tap-highlight-color: transparent` (the band carries a click
    listener for iOS), or a stylesheet with a band but no zero-specificity rule restoring `initial` on the links and
    controls inside it;
  - a band rule (stylesheet or PHP emitter) without the marker `--sgs-bleed-band: 1`, which the hand-off requires so that
    WordPress core's full-width sections (side padding cancelled by an equal negative margin) are not taken for bands;
  - a hand-off enqueue that is commented out, sits in a conditional other than `if ( file_exists( $var ) )`, or follows
    an unconditional return;
  - a stylesheet rule that reserves the bleed on a scroller (`overflow` auto or scroll on that selector) and gives it
    `pointer-events: none`: that takes the row's scrollbar and its gap swipe and wheel with it.

MODES
  --survey [--json]  every hit, every fixed rule and every allowed rule with its reason
  --check            exit 1 on any hit
  --self-test        a both-axis clipper (caught), an axis-only clip (passes), a bled scroller (passes), a mask (caught),
                     an allowed entry (passes), a leaf crop (excluded), a PHP emitter without the bleed (caught), a bleed band
                     with the hand-off wired (passes) and without it (caught), a scrolling band made pointer-events:none
                     (caught), a PHP bleed band without the hand-off (caught)

Run from the repo root:  python plugins/sgs-blocks/scripts/check-shadow-clip.py --survey|--check|--self-test
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent

# PHP files whose emitted CSS string holds a scroll container: file -> selector fragment that must carry the bleed.
SCANNED_PHP = {"includes/nav-menu-submenu-css.php": "__mega-panel-wrap{"}

CLIP_VALUES = {"hidden", "auto", "scroll"}
HOLDER_RE = re.compile(
    r"(?:^|[-_])(?:items?|track|lane|list|grid|row|panel|wrap|viewport|slider|carousel|cards?|tiles?|scroller|inner|content|body)$",
    re.I,
)
LEAF_RE = re.compile(r"(?:^|[\s>+~])(?:img|svg|picture|video|iframe|canvas|a|button|span|p|li)$|__(?:image|img|media|icon|logo|thumb\w*|avatar|label|text|title|caption)$", re.I)

# (file, selector regex) -> why the clip cannot hold a shadow that matters. A selector matches when the regex is found in it.
SR = "visually-hidden 1px box: it holds no visible content"
CROP = "crops its own media to the surface's rounded shape; the shadow it casts is its own and is not clipped by itself"
REVEAL = "height reveal animation: it holds text and must clip the hidden part"
MOTION = "motion mechanism (a reveal layer, a pinned scroll section or a collapse), not a tile or card holder"
ALLOW: dict[tuple[str, str], str] = {
    (r"src/blocks/.*", r"(?:sgs-sr-only|sgs-screen-reader-text)"): SR,
    (r"src/blocks/accordion/style\.css", r"."): REVEAL,
    (r"src/blocks/collapsible-text/style\.css", r"."): REVEAL,
    (r"src/blocks/before-after/style\.css", r"."): "comparison slider: the clip is the reveal itself",
    (r"src/blocks/google-reviews/style\.css", r"sgs-google-reviews--slider \.sgs-google-reviews__list"): "the slider row's block padding is the railPadding setting (supports.sgs.spacingDefaults); a bleed would overwrite it, so the setting is the room",
    (r"src/blocks/business-info/style\.css", r"sgs-business-map"): "map embed cropped to its rounded frame",
    (r"src/blocks/card-grid/style\.css", r"__(?:item|image-wrap)"): CROP,
    (r"src/blocks/gallery/style\.css", r"__(?:item|img-wrap)"): CROP,
    (r"src/blocks/post-grid/style\.css", r"__card"): CROP,
    (r"src/blocks/product-card/style\.css", r"product-card|media-wrap"): CROP,
    (r"src/blocks/media/style\.css", r"sgs-video"): CROP,
    (r"src/blocks/cart/style\.css", r"."): "cart drawer internals (a scrolling line list and a progress bar): they hold rows, not shadowed tiles",
    (r"src/blocks/free-delivery-bar/style\.css", r"__track"): "progress bar track cropped to its pill shape",
    (r"src/blocks/choice-flow/style\.css", r"layout-showcase"): "showcase layout body scrolls inside a fixed-height frame that owns the surface",
    (r"assets/css/media-bg\.css", r"sgs-bg-media"): "background layer: it holds only the photo, video or SVG that is the background, no shadowed child, and it must crop to the section's edge (Spec 49 section 7.8)",
    (r"src/blocks/nav-drawer/style\.css", r"."): "off-canvas drawer: the viewport edge is the frame",
    (r"src/blocks/modal/style\.css", r"scroll-locked"): "page scroll lock on the body",
    (r"src/blocks/mega-panel/style\.css", r"\.sgs-mega-group >"): "heading text truncation",
    (r"src/blocks/container/style\.css", r"has-(?:shape-divider|bg-image|bg-video|bg-svg)"): "crops the section's full-bleed background layer; the section padding is the room",
    (r"src/blocks/hero/style\.css", r"\.sgs-hero$"): "crops the hero's full-bleed background layer; the hero padding is the room",
    (r"assets/css/extensions\.css", r"sgs-(?:button-fill|cta-button)"): "button fill effect cropped to the button shape",
    (r"assets/css/(?:device-toggle|fx-curtain|fx-horizontal-panel|header-behaviours|media-element|motion|motion-thumbnails)\.css", r"."): MOTION,
}


def strip_comments(css: str) -> str:
    return re.sub(r"/\*.*?\*/", lambda m: re.sub(r"[^\n]", " ", m.group(0)), css, flags=re.S)


def rules(css: str):
    """Yield (selector, body) for every style rule, descending into at-rules."""
    css = strip_comments(css)
    i, n = 0, len(css)
    while i < n:
        j = css.find("{", i)
        if j < 0:
            return
        prelude = css[i:j].strip()
        depth, k = 1, j + 1
        while k < n and depth:
            depth += {"{": 1, "}": -1}.get(css[k], 0)
            k += 1
        body = css[j + 1 : k - 1]
        if prelude.startswith("@"):
            if re.match(r"@(?:media|supports|container|layer)", prelude):
                yield from rules(body)
        elif prelude:
            yield prelude, body
        i = k


def decls(body: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for part in re.split(r";(?![^(]*\))", body):
        if ":" in part:
            k, v = part.split(":", 1)
            out[k.strip().lower()] = re.sub(r"\s*!important", "", v.strip().lower())
    return out


def axes(d: dict[str, str]) -> tuple[str | None, str | None]:
    x = y = None
    if "overflow" in d:
        parts = d["overflow"].split()
        x, y = parts[0], parts[-1]
    x = d.get("overflow-x", x)
    y = d.get("overflow-y", y)
    return x, y


def is_clipping(d: dict[str, str]) -> str | None:
    x, y = axes(d)
    if x is not None or y is not None:
        ex = x or "visible"
        ey = y or "visible"
        if ex in CLIP_VALUES and ey == "visible" or ey in CLIP_VALUES and ex == "visible":
            # one scroll/hidden axis forces the other from visible to auto
            return "overflow:" + ex + " " + ey
        if ex in CLIP_VALUES and ey in CLIP_VALUES | {"clip"} or ey in CLIP_VALUES and ex == "clip":
            return "overflow:" + ex + " " + ey
        if ex == "clip" and ey == "clip" and "overflow-clip-margin" not in d:
            return "overflow:clip clip"
    for prop in ("mask-image", "clip-path"):
        if d.get(prop, "none") not in ("none", "initial"):
            return prop
    return None


def reserves(d: dict[str, str]) -> bool:
    return any("--sgs-shadow-bleed" in v for v in d.values()) or "overflow-clip-margin" in d


def subject(sel: str) -> str:
    s = re.sub(r"\([^)]*\)", "", sel)
    s = re.sub(r"::?[\w-]+", "", s)
    s = re.sub(r"\[[^\]]*\]", "", s)
    return re.split(r"[\s>+~]+", s.strip())[-1]


def holder(sel: str) -> bool:
    raw_last = re.split(r"[\s>+~]+", re.sub(r"\([^)]*\)", "", sel.strip()))[-1]
    if re.search(r"\[data-sgs-(?:marquee|fx)", raw_last) and not re.search(r"__", raw_last):
        return True
    last = subject(sel)
    if not last or LEAF_RE.search(sel.strip()) and not HOLDER_RE.search(last):
        return False
    classes = re.findall(r"\.([\w-]+)", last)
    if not classes:
        return False
    if any(HOLDER_RE.search(c) for c in classes):
        return True
    return any("__" not in c and c.startswith(("sgs-", "wp-block-sgs-")) for c in classes)


def allowed(rel: str, sel: str) -> str:
    for (file_re, sel_re), why in ALLOW.items():
        if re.fullmatch(file_re, rel) and re.search(sel_re, sel):
            return why
    return ""


def scan_css(rel: str, css: str) -> list[dict]:
    found: list[dict] = []
    axis_only: set[str] = set()
    for prelude, body in rules(css):
        x, y = axes(decls(body))
        if (x == "clip" and y in (None, "visible")) or (y == "clip" and x in (None, "visible")):
            axis_only.update(s.strip() for s in prelude.split(","))
    for prelude, body in rules(css):
        d = decls(body)
        why = is_clipping(d)
        if not why:
            continue
        for sel in (s.strip() for s in prelude.split(",")):
            if not holder(sel):
                continue
            status = "HIT"
            reason = ""
            if reserves(d) or sel in axis_only:
                status = "FIXED"
            elif (why_allowed := allowed(rel, sel)):
                status, reason = "ALLOWED", why_allowed
            found.append({"file": rel, "selector": sel, "clip": why, "status": status, "reason": reason})
    return found


def scan_php(rel: str, php: str, frag: str) -> list[dict]:
    found: list[dict] = []
    for m in re.finditer(re.escape(frag) + r"([^}]*)\}", php):
        d = decls(m.group(1).replace("'", "").replace(" . ", ""))
        why = is_clipping(d)
        if why:
            found.append({"file": rel, "selector": frag, "clip": why, "status": "FIXED" if reserves(d) or "--sgs-shadow-bleed" in m.group(1) else "HIT", "reason": ""})
    return found


BLEED_PAD_RE = re.compile(r"^padding(?:-(?:block|inline|top|bottom|left|right)(?:-(?:start|end))?)?$")
BLEED_MARGIN_RE = re.compile(r"^margin(?:-(?:block|inline|top|bottom|left|right)(?:-(?:start|end))?)?$")
PHP_BLEED_RE = re.compile(r"padding[\w-]*:[^;'\"}]*--sgs-shadow-bleed")


def reserves_band(d: dict[str, str]) -> bool:
    """True when the rule reserves the bleed as padding and cancels it with a negative margin (the paint band)."""
    pad = any(BLEED_PAD_RE.match(k) and "--sgs-shadow-bleed" in v for k, v in d.items())
    neg = any(BLEED_MARGIN_RE.match(k) and "--sgs-shadow-bleed" in v and re.search(r"-\s*1\b|-\s*var\(", v) for k, v in d.items())
    return pad and neg


def norm_sel(sel: str) -> str:
    return re.sub(r"\s*>\s*", " > ", re.sub(r"\s+", " ", sel.strip()))


HANDOFF_JS = "assets/js/bleed-band-taps.js"
HANDOFF_PHP = "includes/class-sgs-blocks.php"


def strip_php_comments(src: str) -> str:
    """PHP source with every comment (//, #, /* */) blanked; strings are kept whole, so a `//` inside a URL stays."""
    out, i, n, quote = [], 0, len(src), ""
    while i < n:
        c = src[i]
        if quote:
            out.append(c)
            if c == "\\" and i + 1 < n:
                out.append(src[i + 1])
                i += 2
                continue
            if c == quote:
                quote = ""
            i += 1
        elif c in "'\"":
            quote = c
            out.append(c)
            i += 1
        elif src.startswith("/*", i):
            j = src.find("*/", i + 2)
            j = n if j < 0 else j + 2
            out.append(re.sub(r"[^\n]", " ", src[i:j]))
            i = j
        elif src.startswith("//", i) or c == "#":
            j = src.find("\n", i)
            j = n if j < 0 else j
            out.append(" " * (j - i))
            i = j
        else:
            out.append(c)
            i += 1
    return "".join(out)


def handoff_enqueued(src: str) -> bool:
    """True when enqueue_frontend_assets calls wp_enqueue_script for the hand-off unconditionally: the call is not in a
    comment, every block around it inside the function is `if ( file_exists( $var ) )`, and no return comes first."""
    code = strip_php_comments(src)
    m = re.search(r"function\s+enqueue_frontend_assets\s*\([^)]*\)[^{]*\{", code)
    if not m:
        return False
    stack: list[int] = []
    i, depth0 = m.end(), 0
    while i < len(code):
        c = code[i]
        if c in "'\"":
            j = i + 1
            while j < len(code) and code[j] != c:
                j += 2 if code[j] == "\\" else 1
            i = j + 1
            continue
        if c == "{":
            stack.append(i)
        elif c == "}":
            if not stack:
                return False  # the function ended without the call
            stack.pop()
        elif not stack and re.match(r"return\b", code[i:i + 7]):
            return False  # an unconditional return before the call
        elif code.startswith("wp_enqueue_script", i):
            k, d = code.index("(", i), 0
            for end in range(k, len(code)):
                d += {"(": 1, ")": -1}.get(code[end], 0)
                if d == 0:
                    break
            if HANDOFF_JS in code[k:end]:
                for opener in stack:
                    head = code[:opener].rstrip()
                    start = max(head.rfind(";"), head.rfind("{"), head.rfind("}")) + 1
                    if not re.fullmatch(r"\s*if\s*\(\s*file_exists\s*\(\s*\$\w+\s*\)\s*\)\s*", head[start:]):
                        return False
                return True
            i = end
        i += 1
    return False


def handoff_wired(root: Path) -> bool:
    """True when the click hand-off exists and enqueue_frontend_assets (every front-end page) enqueues it."""
    js, php = root / HANDOFF_JS, root / HANDOFF_PHP
    if not js.is_file() or not php.is_file():
        return False
    return handoff_enqueued(php.read_text(encoding="utf-8"))


def band_status(handoff: bool) -> tuple[str, str]:
    if handoff:
        return "FIXED", "covered by the click hand-off (" + HANDOFF_JS + ")"
    return "HIT", "bleed band takes taps: the click hand-off " + HANDOFF_JS + " is missing or not enqueued on every page"


RESTORE_CONTROLS = {"a", "button", "[role=button]", "input", "select", "textarea", "label", "summary"}
MARKER_MISSING = "bleed band without `--sgs-bleed-band: 1`: the click hand-off only treats a marked band as one"
HIGHLIGHT_MISSING = "bleed band without `-webkit-tap-highlight-color: transparent`: the band carries a click listener for iOS, so it would flash the tap highlight"
RESTORE_MISSING = "no `:where(<this band>) :where(a, button, [role=button], input, select, textarea, label, summary) { -webkit-tap-highlight-color: initial }` rule for this band, so the links inside it lose their tap highlight"


def split_top(text: str) -> list[str]:
    """Split a selector list on its top-level commas (a comma inside parentheses or brackets stays)."""
    parts, depth, cur = [], 0, ""
    for ch in text:
        depth += {"(": 1, "[": 1, ")": -1, "]": -1}.get(ch, 0)
        if ch == "," and depth == 0:
            parts.append(cur)
            cur = ""
        else:
            cur += ch
    return [x.strip() for x in parts + [cur] if x.strip()]


def norm_control(sel: str) -> str:
    return re.sub(r"[\s\"'\\]", "", sel).lower()


def restore_scopes(selector: str) -> list[str]:
    """The band selectors a restore covers: `:where(<scopes>) :where(<controls>)` whose controls name every one of
    RESTORE_CONTROLS; [] for any other selector."""
    m = re.fullmatch(r":where\((.*)\)\s+:where\((.*)\)", selector.strip(), re.S)
    if not m or not RESTORE_CONTROLS <= {norm_control(c) for c in split_top(m.group(2))}:
        return []
    return [norm_sel(x) for x in split_top(m.group(1))]


def last_compound(sel: str) -> str:
    return re.split(r"\s+(?![^\[]*\])|\s*>\s*", norm_sel(sel))[-1]


def scan_bleed_css(rel: str, css: str, handoff: bool = True) -> list[dict]:
    """Every selector that reserves the bleed band, checked one by one: HIT when the hand-off is not wired, when the
    rule lacks the marker or the transparent tap highlight, when no restore rule names this band (its full selector or
    its last compound) with every control, or when the band scrolls and is made pointer-events:none (which takes the
    row's own scrollbar, wheel and gap swipe)."""
    if "--sgs-shadow-bleed" not in css:
        return []
    parsed = [([norm_sel(s) for s in split_top(prelude)], decls(body)) for prelude, body in rules(css)]
    none_on: set[str] = set()
    scrolls: set[str] = set()
    covered: set[str] = set()
    for sels, d in parsed:
        if d.get("pointer-events") == "none":
            none_on.update(sels)
        if any(v in CLIP_VALUES - {"hidden"} for v in axes(d) if v):
            scrolls.update(sels)
        if d.get("-webkit-tap-highlight-color") == "initial":
            for sel in sels:
                covered.update(restore_scopes(sel))
    found: list[dict] = []
    for sels, d in parsed:
        if not reserves_band(d):
            continue
        for sel in sels:
            status, reason = band_status(handoff)
            if d.get("--sgs-bleed-band") != "1":
                status, reason = "HIT", MARKER_MISSING
            elif d.get("-webkit-tap-highlight-color") != "transparent":
                status, reason = "HIT", HIGHLIGHT_MISSING
            elif sel not in covered and last_compound(sel) not in covered:
                status, reason = "HIT", RESTORE_MISSING
            if sel in none_on and sel in scrolls:
                status, reason = "HIT", "pointer-events:none on a scrolling bleed band takes its scrollbar, wheel and gap swipe: leave the pointer to the row (the hand-off clears the band)"
            found.append({"file": rel, "selector": sel, "clip": "tap-band", "status": status, "reason": reason})
    return found


def scan_bleed_php(rel: str, php: str, handoff: bool = True) -> list[dict]:
    """Every band a PHP file emits, checked one by one: its own declarations (from the string or rule the bleed padding
    sits in to the end of that string or rule) carry the marker and the transparent tap highlight, and a band emitted
    with its own selector (`<name>{...}`) has a restore rule in the same file naming that selector with every control.
    A band emitted as bare declarations takes its selector, and its restore, from the block's stylesheet."""
    if "--sgs-shadow-bleed" not in php:
        return []
    found: list[dict] = []
    seen: set[int] = set()
    for m in PHP_BLEED_RE.finditer(php):
        start = max(php.rfind("'", 0, m.start()), php.rfind("{", 0, m.start())) + 1
        if start in seen:
            continue  # a second bleed padding in the same declarations (padding-inline and padding-bottom)
        seen.add(start)
        ends = [i for i in (php.find("'", m.end()), php.find("}", m.end())) if i >= 0]
        seg = php[start:min(ends) if ends else len(php)]
        brace = php.rfind("{", 0, m.start())
        named = re.search(r"([\w-]+)$", php[:brace]) if brace >= 0 else None
        name = named.group(1) if named and not php[:brace].endswith(")") else ""
        status, reason = band_status(handoff)
        if not re.search(r"--sgs-bleed-band:\s*1\b", seg):
            status, reason = "HIT", MARKER_MISSING
        elif not re.search(r"-webkit-tap-highlight-color:\s*transparent", seg):
            status, reason = "HIT", HIGHLIGHT_MISSING
        elif name:
            ok = False
            for r in re.finditer(r":where\(([^{}]*?" + re.escape(name) + r")\)\s*:where\(([^{}]*)\)\s*\{\s*-webkit-tap-highlight-color:\s*initial", php):
                if RESTORE_CONTROLS <= {norm_control(c) for c in split_top(r.group(2))}:
                    ok = True
            if not ok:
                status, reason = "HIT", RESTORE_MISSING
        found.append({"file": rel, "selector": name or "(emitted bleed declarations)", "clip": "tap-band", "status": status, "reason": reason})
    return found


def css_files() -> list[Path]:
    return sorted((ROOT / "src" / "blocks").glob("*/style.css")) + sorted((ROOT / "assets" / "css").glob("*.css"))


def survey() -> list[dict]:
    out: list[dict] = []
    for f in css_files():
        rel = f.relative_to(ROOT).as_posix()
        out += scan_css(rel, f.read_text(encoding="utf-8"))
    for rel, frag in SCANNED_PHP.items():
        out += scan_php(rel, (ROOT / rel).read_text(encoding="utf-8"), frag)
    repo = ROOT.parents[1]
    theme_css = repo / "theme" / "sgs-theme" / "assets" / "css"
    bleed_css = sorted(set(css_files()) | set((ROOT / "src" / "blocks").glob("*/*.css"))) + sorted(theme_css.glob("*.css"))
    handoff = handoff_wired(ROOT)
    for f in bleed_css:
        out += scan_bleed_css(f.relative_to(repo).as_posix(), f.read_text(encoding="utf-8"), handoff)
    for f in sorted((ROOT / "includes").rglob("*.php")) + sorted((ROOT / "src" / "blocks").glob("*/render.php")):
        out += scan_bleed_php(f.relative_to(repo).as_posix(), f.read_text(encoding="utf-8"), handoff)
    return out


def self_test() -> int:
    ok = True

    def expect(name: str, got: list[dict], want: str | None) -> None:
        nonlocal ok
        status = got[0]["status"] if got else None
        good = status == want
        ok &= good
        print(("PASS " if good else "FAIL ") + name + " -> " + str(status))

    expect("both-axis clipper caught", scan_css("t.css", ".sgs-x__track{overflow:hidden}"), "HIT")
    expect("axis-only clip passes", scan_css("t.css", ".sgs-x__track{overflow-x:clip;overflow-y:visible}"), None)
    expect("hidden fallback with an axis-only twin passes", scan_css("t.css", ".sgs-x__lane{overflow:hidden}@supports (overflow: clip){.sgs-x__lane{overflow-x:clip;overflow-y:visible}}"), "FIXED")
    expect("attribute-named marquee root caught", scan_css("t.css", '[data-sgs-fx~="marquee"][data-sgs-marquee="on"]{overflow:hidden}'), "HIT")
    expect("one hidden axis caught", scan_css("t.css", ".sgs-x__wrap{overflow-x:hidden}"), "HIT")
    expect("bled scroller passes", scan_css("t.css", ".sgs-x__wrap{overflow-y:auto;padding-inline:var(--sgs-shadow-bleed,80px);margin-inline:calc(-1*var(--sgs-shadow-bleed,80px))}"), "FIXED")
    expect("mask caught", scan_css("t.css", ".sgs-x__lane{mask-image:linear-gradient(#000,transparent)}"), "HIT")
    expect("leaf crop excluded", scan_css("t.css", ".sgs-x__image{overflow:hidden}"), None)
    ALLOW[(r"t\.css", r"\.sgs-x__panel")] = "self-test"
    expect("allowed entry passes", scan_css("t.css", ".sgs-x__panel{overflow:hidden}"), "ALLOWED")
    del ALLOW[(r"t\.css", r"\.sgs-x__panel")]
    expect("php emitter without bleed caught", scan_php("t.php", "$css .= '.a __mega-panel-wrap{overflow-y:auto;}';", "__mega-panel-wrap{"), "HIT")
    expect("php emitter with bleed passes", scan_php("t.php", "$css .= '.a __mega-panel-wrap{overflow-y:auto;padding-inline:var(--sgs-shadow-bleed, 80px);}';", "__mega-panel-wrap{"), "FIXED")
    band = ".sgs-x__grid{overflow-x:auto;padding-block:var(--sgs-shadow-bleed,80px);margin-block:calc(-1 * var(--sgs-shadow-bleed,80px));--sgs-bleed-band:1;-webkit-tap-highlight-color:transparent"
    restore = ":where(.sgs-x__grid) :where(a,button,[role=button],input,select,textarea,label,summary){-webkit-tap-highlight-color:initial}"
    expect("bleed band without the marker caught", scan_bleed_css("t.css", band.replace(";--sgs-bleed-band:1", "") + "}" + restore, True), "HIT")
    expect("bleed band without the transparent tap highlight caught", scan_bleed_css("t.css", band.replace(";-webkit-tap-highlight-color:transparent", "") + "}" + restore, True), "HIT")
    expect("bleed band whose file has no highlight restore caught", scan_bleed_css("t.css", band + "}", True), "HIT")
    expect("bleed band with the hand-off wired passes", scan_bleed_css("t.css", band + "}" + restore, True), "FIXED")
    expect("bleed band without the hand-off caught", scan_bleed_css("t.css", band + "}" + restore, False), "HIT")
    expect("scrolling band made pointer-events:none caught", scan_bleed_css("t.css", band + ";pointer-events:none}" + restore, True), "HIT")
    expect("pointer-events:none on a band that does not scroll passes", scan_bleed_css("t.css", ".sgs-x__lane{padding-block:var(--sgs-shadow-bleed,80px);margin-block:calc(-1 * var(--sgs-shadow-bleed,80px));--sgs-bleed-band:1;-webkit-tap-highlight-color:transparent;pointer-events:none}" + restore.replace(".sgs-x__grid", ".sgs-x__lane"), True), "FIXED")
    expect("a bleed padding with no negative margin is not a band", scan_bleed_css("t.css", ".sgs-x__grid{padding-block:var(--sgs-shadow-bleed,80px)}"), None)
    full = ":where(.sgs-x__grid) :where(a, button, [role=\"button\"], input, select, textarea, label, summary){-webkit-tap-highlight-color:initial}"
    expect("a restore naming every control passes", scan_bleed_css("t.css", band + "}" + full, True), "FIXED")
    expect("a restore on an unrelated selector caught", scan_bleed_css("t.css", band + "}" + full.replace(".sgs-x__grid", ".sgs-y__grid"), True), "HIT")
    expect("a restore covering only summary caught", scan_bleed_css("t.css", band + "}:where(.sgs-x__grid) :where(summary){-webkit-tap-highlight-color:initial}", True), "HIT")
    nav = ("$css .= $u . ' .' . $b . '__panel-wrap{overflow-y:auto;' . 'padding-bottom:var(--sgs-shadow-bleed, 80px);margin-bottom:calc(-1 * var(--sgs-shadow-bleed, 80px));--sgs-bleed-band:1;-webkit-tap-highlight-color:transparent;}';\n"
           "$css .= ':where(' . $u . ' .' . $b . '__panel-wrap) :where(a,button,[role=\"button\"],input,select,textarea,label,summary){-webkit-tap-highlight-color:initial;}';")
    expect("a PHP band with its own restore passes", scan_bleed_php("t.php", nav, True), "FIXED")
    expect("a PHP band with its restore deleted caught", scan_bleed_php("t.php", nav.split("\n")[0], True), "HIT")
    two = nav + "\n$css .= $u . ' .x__other{padding-top:var(--sgs-shadow-bleed,80px);margin-top:calc(-1 * var(--sgs-shadow-bleed,80px));}';"
    got = [h["status"] for h in scan_bleed_php("t.php", two, True)]
    ok &= got == ["FIXED", "HIT"]
    print(("PASS " if got == ["FIXED", "HIT"] else "FAIL ") + "a second, unmarked PHP band in the same file caught -> " + str(got))
    php_band = "return 'padding-block:var(--sgs-shadow-bleed,80px);margin-block:calc(-1 * var(--sgs-shadow-bleed,80px));--sgs-bleed-band:1;-webkit-tap-highlight-color:transparent;';"
    expect("php bleed band without the marker caught", scan_bleed_php("t.php", php_band.replace("--sgs-bleed-band:1;", ""), True), "HIT")
    expect("php bleed band without the transparent tap highlight caught", scan_bleed_php("t.php", php_band.replace("-webkit-tap-highlight-color:transparent;", ""), True), "HIT")
    expect("php bleed band without the hand-off caught", scan_bleed_php("t.php", php_band, False), "HIT")
    expect("php bleed band with the hand-off passes", scan_bleed_php("t.php", php_band, True), "FIXED")
    fn = "class A { public function enqueue_frontend_assets(): void {\n%s\n\t}\n}"
    call = "wp_enqueue_script( 'h', SGS_BLOCKS_URL . '" + HANDOFF_JS + "', array(), '1' );"
    for name, body, want in (
        ("an enqueue in file_exists passes", "$f = 'x'; if ( file_exists( $f ) ) { " + call + " }", True),
        ("a //-commented enqueue caught", "// " + call, False),
        ("a /* */-commented enqueue caught", "/* " + call + " */", False),
        ("an enqueue in if ( false ) caught", "if ( false ) { " + call + " }", False),
        ("an enqueue after a return caught", "return; " + call, False),
        ("a URL with // in a string does not hide the call", "$u = 'https://example.org'; " + call, True),
    ):
        got = handoff_enqueued(fn % body)
        ok &= got == want
        print(("PASS " if got == want else "FAIL ") + name + " -> " + str(got))
    expect("the framework's hand-off is wired", [{"status": "FIXED"}] if handoff_wired(ROOT) else [{"status": "HIT"}], "FIXED")
    print("self-test " + ("OK" if ok else "FAILED"))
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--survey", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    found = survey()
    hits = [f for f in found if f["status"] == "HIT"]
    if a.survey:
        if a.json:
            print(json.dumps(found, indent=1))
        else:
            for f in found:
                print(f"{f['status']:8} {f['file']} :: {f['selector']}  [{f['clip']}] {f['reason']}")
        print(f"{len(hits)} hit(s), {len(found)} clipping rule(s) on holders")
        return 0
    if hits:
        for f in hits:
            if f["clip"] == "tap-band":
                print(f"HIT {f['file']} :: {f['selector']} [tap-band] {f['reason']}")
            else:
                print(f"HIT {f['file']} :: {f['selector']} [{f['clip']}] clips its children's shadows: use an axis-only clip or reserve var(--sgs-shadow-bleed)")
        return 1
    print("check-shadow-clip: 0 hits")
    return 0


if __name__ == "__main__":
    sys.exit(main())
