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

MODES
  --survey [--json]  every hit, every fixed rule and every allowed rule with its reason
  --check            exit 1 on any hit
  --self-test        a both-axis clipper (caught), an axis-only clip (passes), a bled scroller (passes), a mask (caught),
                     an allowed entry (passes), a leaf crop (excluded), a PHP emitter without the bleed (caught)

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


def survey() -> list[dict]:
    out: list[dict] = []
    files = sorted((ROOT / "src" / "blocks").glob("*/style.css")) + sorted((ROOT / "assets" / "css").glob("*.css"))
    for f in files:
        rel = f.relative_to(ROOT).as_posix()
        out += scan_css(rel, f.read_text(encoding="utf-8"))
    for rel, frag in SCANNED_PHP.items():
        out += scan_php(rel, (ROOT / rel).read_text(encoding="utf-8"), frag)
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
            print(f"HIT {f['file']} :: {f['selector']} [{f['clip']}] clips its children's shadows: use an axis-only clip or reserve var(--sgs-shadow-bleed)")
        return 1
    print("check-shadow-clip: 0 hits")
    return 0


if __name__ == "__main__":
    sys.exit(main())
