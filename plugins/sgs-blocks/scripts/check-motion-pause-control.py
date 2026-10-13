#!/usr/bin/env python3
"""check-motion-pause-control.py — content that moves on its own carries the shared pause control.

THE RULE (WCAG 2.2.2 Pause, Stop, Hide, Level A): content that starts moving automatically,
runs for more than five seconds and sits beside other content needs a mechanism to pause it.
Pausing only while hovered or focused is not that mechanism (W3C Understanding 2.2.2). In SGS
the mechanism is ONE shared implementation:

  render   includes/helpers-motion-pause.php::sgs_motion_pause_button()   (the button)
  runtime  src/shared/motion-pause/index.js::initMotionPause()             (button + hover,
                                                                             touch and focus pause)

A block that runs automatic motion must call both. A block that draws its own pause button
(a second design, a second set of semantics) is flagged even when it also calls the helper.

MOTION SIGNALS (comment-stripped source, per block folder under src/blocks/):
  js-timer        `setInterval(` in the block's view module (view_files: view.js and the
                  files it imports from its own folder): autoplay, rotation.
  css-loop        an `animation` whose iteration count is `infinite` in the block's style.css:
                  a marquee, an ambient loop, a loading shimmer.
  video-autoplay  a <video> with an `autoplay` attribute in the block's render source (in the tag
                  literal, or an ' autoplay' attribute fragment in a render that prints <video>).

FINDINGS:
  missing-render    a motion signal, and the render source never calls sgs_motion_pause_button()
  missing-runtime   a motion signal, and the view module never calls initMotionPause()
  half-wired        the helper is called by only one of render and view (no motion signal needed)
  hand-rolled       the block draws its own pause button (a `__pause` class literal in its render
                    source outside the helper, or a button created in its view module next to the
                    word "pause")
  stale-exemption   an EXEMPT entry whose signal is no longer in the block (the ratchet only tightens)

EXEMPT (each with its reason; a new entry needs a reason a reviewer can check):
  loading   a loading indicator (skeleton shimmer) that runs only while content loads: part of
            the loading activity, which 2.2.2 exempts.
  deferred  decorative ambient motion (Ken Burns zoom, background SVG loops, drift, background
            video). Whether it owes a visible pause control is Bean's ruling, tracked in
            Spec 38A FR-38A-37 ("a looping effect longer than five seconds gives a pause
            control"); each stops under prefers-reduced-motion today. Listed so a NEW one fails.

BLIND SPOTS: requestAnimationFrame loops are not a signal (every one under src/blocks is
scroll-, pointer- or one-shot-driven at the census); motion drawn by a shared wrapper or effect
outside src/blocks/ (the container wrapper's background video, the Spec 38 fx effects, which
carry their own pause controls) is outside this folder scan.

  --survey          every block with a signal or a helper call, and its verdict
  --survey --json   the same as JSON (census: reports/migrations/motion-pause-census.json)
  --check           exit 1 on any finding
  --self-test       positive, negative and exemption fixtures, proving it can still fail
  --fix             not offered: adopting the control is a per-block change by hand

Run from plugins/sgs-blocks:  python scripts/check-motion-pause-control.py --check
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
import tempfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

PLUGIN = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PLUGIN / "scripts" / "lib"))
from block_source_files import render_source, view_source  # noqa: E402

BLOCKS = PLUGIN / "src" / "blocks"

EXEMPT: dict[tuple[str, str], tuple[str, str]] = {
    ("post-grid", "css-loop"): ("loading", "the .sgs-post-grid skeleton shimmer runs only while posts load"),
    ("product-search", "css-loop"): ("loading", "the results skeleton shimmer runs only while results load"),
    ("container", "css-loop"): ("deferred", "Ken Burns background zoom and background SVG pulse/float/wave loops"),
    ("hero", "css-loop"): ("deferred", "Ken Burns background and split-media zoom"),
    ("hero", "video-autoplay"): ("deferred", "muted looping background video, aria-hidden"),
    ("media", "css-loop"): ("deferred", "SVG pulse/float/wave loops"),
    ("media", "video-autoplay"): ("deferred", "autoplaying video; native controls when the block shows them"),
    ("nav-drawer", "css-loop"): ("deferred", "decorative drift on .sgs-drift shapes in the drawer"),
}

SIGNALS = (
    ("js-timer", "view", re.compile(r"\bsetInterval\s*\(")),
    ("css-loop", "style", re.compile(r"\banimation(?:-iteration-count)?\s*:[^;{}]*\binfinite\b")),
    ("video-autoplay", "render", re.compile(r"<video\b[^>]*\bautoplay\b|<video\b[\s\S]*['\"] autoplay['\"]|['\"] autoplay['\"][\s\S]*<video\b")),
)
# Blocks that have not adopted the shared control yet. The list only shrinks: a block leaves it in
# the commit that adopts the control, and a listed block that no longer needs it fails --check.
PENDING: frozenset[str] = frozenset({
    "google-reviews",
    "notice-banner",
    "post-grid",
    "trustpilot-reviews",
})

RENDER_CALL = re.compile(r"\bsgs_motion_pause_button\s*\(")
VIEW_CALL = re.compile(r"\binitMotionPause\s*\(")
RENDER_HANDROLLED = re.compile(r"class=\\?[\"'][^\"']*__pause\b")
# A button the view module builds itself and names or classes as a pause control.
VIEW_BUTTON = re.compile(
    r"createElement\s*\(\s*['\"]button['\"]\s*\)[\s\S]{0,400}?"
    r"(?:className\s*=|setAttribute\(\s*['\"]aria-label['\"])[^;\n]*pause",
    re.I,
)


def _strip_comments(text: str) -> str:
    """Drop /* … */ blocks that open a line, and full-line // # * comments.

    A block comment is only recognised at the start of a line: a `/*` inside a string (a MIME
    type such as 'image/*', a glob) would otherwise swallow the code up to the next `*/`.
    """
    text = re.sub(r"(?m)^[ \t]*/\*.*?\*/", " ", text, flags=re.S)
    return "\n".join(l for l in text.splitlines() if not l.strip().startswith(("//", "#", "*")))


def scan_block(block_dir: Path) -> dict:
    """Signals and helper calls for one block folder."""
    render = _strip_comments(render_source(block_dir))
    view = _strip_comments(view_source(block_dir))
    style_path = block_dir / "style.css"
    style = _strip_comments(style_path.read_text(encoding="utf-8", errors="replace")) if style_path.is_file() else ""
    texts = {"render": render, "view": view, "style": style}
    signals = sorted({sid for sid, where, rx in SIGNALS if rx.search(texts[where])})
    return {
        "signals": signals,
        "render_call": bool(RENDER_CALL.search(render)),
        "view_call": bool(VIEW_CALL.search(view)),
        "handrolled_render": bool(RENDER_HANDROLLED.search(render)),
        "handrolled_view": bool(VIEW_BUTTON.search(view)),
    }


def classify(tail: str, scan: dict, exempt: dict) -> tuple[list[dict], list[dict]]:
    """(findings, exemptions applied) for one block."""
    findings: list[dict] = []
    applied: list[dict] = []
    owed = []
    for sid in scan["signals"]:
        if (tail, sid) in exempt:
            kind, reason = exempt[(tail, sid)]
            applied.append({"signal": sid, "kind": kind, "reason": reason})
        else:
            owed.append(sid)
    if owed and not scan["render_call"]:
        findings.append({"kind": "missing-render", "signals": owed})
    if owed and not scan["view_call"]:
        findings.append({"kind": "missing-runtime", "signals": owed})
    if not owed and scan["render_call"] != scan["view_call"]:
        findings.append({"kind": "half-wired", "signals": []})
    # A pause button is only a second motion-pause design on a block that runs automatic motion
    # or uses the shared one; an audio player's own play/pause is not one.
    wired = scan["render_call"] or scan["view_call"]
    if (owed or wired) and (scan["handrolled_render"] or scan["handrolled_view"]):
        where = [w for w, on in (("render", scan["handrolled_render"]), ("view", scan["handrolled_view"])) if on]
        findings.append({"kind": "hand-rolled", "signals": where})
    return findings, applied


def survey(blocks_dir: Path, exempt: dict, pending: frozenset = frozenset()) -> dict:
    rows = []
    seen_exempt = set()
    for block_dir in sorted(p for p in blocks_dir.iterdir() if p.is_dir()):
        scan = scan_block(block_dir)
        if not (scan["signals"] or scan["render_call"] or scan["view_call"]):
            continue
        findings, applied = classify(block_dir.name, scan, exempt)
        for a in applied:
            seen_exempt.add((block_dir.name, a["signal"]))
        owed = [s for s in scan["signals"] if (block_dir.name, s) not in exempt]
        if findings:
            verdict = "PENDING" if block_dir.name in pending else "FLAGGED"
        else:
            verdict = "COMPLIANT" if owed or scan["render_call"] else "EXEMPT"
        rows.append({"block": block_dir.name, "verdict": verdict, **scan, "findings": findings, "exempt": applied})
    stale = [
        {"block": b, "signal": s, "kind": exempt[(b, s)][0]}
        for (b, s) in sorted(exempt)
        if (b, s) not in seen_exempt
    ]
    still_pending = {r["block"] for r in rows if r["verdict"] == "PENDING"}
    stale_pending = sorted(pending - still_pending)
    counts = {"COMPLIANT": 0, "FLAGGED": 0, "PENDING": 0, "EXEMPT": 0}
    for r in rows:
        counts[r["verdict"]] += 1
    return {"blocks": rows, "stale_exemptions": stale, "stale_pending": stale_pending, "counts": counts}


def print_survey(result: dict) -> None:
    for r in result["blocks"]:
        sig = ",".join(r["signals"]) or "-"
        print(f"{r['verdict']:<9} sgs/{r['block']:<22} signals={sig}  render_call={r['render_call']}  view_call={r['view_call']}")
        for f in r["findings"]:
            print(f"          ! {f['kind']} {','.join(f['signals'])}")
        for e in r["exempt"]:
            print(f"          - exempt {e['signal']} ({e['kind']}): {e['reason']}")
    for s in result["stale_exemptions"]:
        print(f"STALE     sgs/{s['block']} {s['signal']} ({s['kind']}): signal gone, delete the EXEMPT entry")
    for b in result["stale_pending"]:
        print(f"STALE     sgs/{b}: no longer pending adoption, delete it from PENDING")
    c = result["counts"]
    print(
        f"\n{c['COMPLIANT']} compliant, {c['FLAGGED']} flagged, {c['PENDING']} pending adoption, "
        f"{c['EXEMPT']} exempt-only, {len(result['stale_exemptions']) + len(result['stale_pending'])} stale entr(ies)"
    )


def failures(result: dict) -> int:
    return result["counts"]["FLAGGED"] + len(result["stale_exemptions"]) + len(result["stale_pending"])


# ── self-test ────────────────────────────────────────────────────────────────

def _write(root: Path, rel: str, text: str) -> None:
    p = root / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")


def self_test() -> int:
    tmp = Path(tempfile.mkdtemp(prefix="sgs-motion-pause-"))
    try:
        blocks = tmp / "blocks"
        good_render = "<?php echo sgs_motion_pause_button( array( 'block' => 'sgs-x' ) );"
        good_view = "import { initMotionPause } from '../../shared/motion-pause';\ninitMotionPause( root, {} );\nsetInterval( tick, 5000 );"
        # Positive: autoplay timer with neither half.
        _write(blocks, "timer-bare/render.php", "<?php echo '<div></div>';")
        _write(blocks, "timer-bare/view.js", "setInterval( () => next(), 5000 );")
        # Positive: CSS marquee with the render half only.
        _write(blocks, "marquee-half/render.php", good_render)
        _write(blocks, "marquee-half/style.css", ".t { animation: scroll 20s linear infinite; }")
        # Positive: compliant calls but a hand-rolled button beside them.
        _write(blocks, "handrolled/render.php", good_render + "\necho '<button class=\"sgs-y__pause\"></button>';")
        _write(blocks, "handrolled/view.js", good_view)
        # Positive: helper called by view only, no motion.
        _write(blocks, "half/view.js", "initMotionPause( root, {} );")
        # Negative: compliant timer block.
        _write(blocks, "timer-good/render.php", good_render)
        _write(blocks, "timer-good/view.js", good_view)
        # Negative: a commented-out timer and a finite animation.
        _write(blocks, "quiet/view.js", "// setInterval( tick, 1000 );\n/* setInterval( x ) */")
        _write(blocks, "quiet/style.css", ".a { animation: fade 1s ease 2; }")
        # Positive: a view module that builds its own pause button.
        _write(blocks, "handrolled-view/render.php", good_render)
        _write(blocks, "handrolled-view/view.js", good_view + "\nconst b = document.createElement( 'button' );\nb.className = 'sgs-z__pause-btn';")
        # Negative: a view module that builds dot buttons and also uses the shared pause.
        _write(blocks, "dots/render.php", good_render)
        _write(blocks, "dots/view.js", good_view + "\nconst dot = document.createElement( 'button' );\ndot.className = 'sgs-z__dot';\nconst pauser = 1;")
        # Negative: a media player's own play/pause button, no automatic motion.
        _write(blocks, "player/view.js", "const b = document.createElement( 'button' ); b.ariaLabel = 'Pause track';")
        # Positive: a '/*' inside a string must not hide the timer after it.
        _write(blocks, "glob/view.js", "const accept = 'image/*';\nsetInterval( tick, 5000 );\n/* a comment */")
        # Exemption applied, plus one stale exemption.
        _write(blocks, "shimmer/style.css", ".s { animation: shimmer 1.5s infinite; }")
        exempt = {("shimmer", "css-loop"): ("loading", "fixture"), ("gone", "css-loop"): ("deferred", "fixture")}

        result = survey(blocks, exempt)
        by = {r["block"]: r for r in result["blocks"]}
        checks = [
            ("timer-bare flags both halves", {f["kind"] for f in by["timer-bare"]["findings"]} == {"missing-render", "missing-runtime"}),
            ("marquee-half flags the runtime only", [f["kind"] for f in by["marquee-half"]["findings"]] == ["missing-runtime"]),
            ("handrolled flags its own button", [f["kind"] for f in by["handrolled"]["findings"]] == ["hand-rolled"]),
            ("half flags half-wired", [f["kind"] for f in by["half"]["findings"]] == ["half-wired"]),
            ("a view-built pause button is hand-rolled", [f["kind"] for f in by["handrolled-view"]["findings"]] == ["hand-rolled"]),
            ("view-built dot buttons are not", by["dots"]["verdict"] == "COMPLIANT"),
            ("timer-good is compliant", by["timer-good"]["verdict"] == "COMPLIANT"),
            ("quiet has no signal (absent from survey)", "quiet" not in by),
            ("player is not flagged (absent from survey)", "player" not in by),
            ("a '/*' in a string does not hide a timer", by.get("glob", {}).get("signals") == ["js-timer"]),
            ("shimmer exemption applied", by["shimmer"]["verdict"] == "EXEMPT"),
            ("stale exemption reported", [s["block"] for s in result["stale_exemptions"]] == ["gone"]),
            ("failures counted", failures(result) == 7),
        ]
        # The adoption ratchet: a pending block does not fail; a pending block that is already
        # compliant (or gone) does.
        ratchet = survey(blocks, exempt, frozenset({"timer-bare", "timer-good"}))
        rby = {r["block"]: r for r in ratchet["blocks"]}
        checks += [
            ("a pending block is reported, not failed", rby["timer-bare"]["verdict"] == "PENDING"),
            ("a compliant block left in PENDING is stale", ratchet["stale_pending"] == ["timer-good"]),
            ("ratchet failures counted", failures(ratchet) == failures(result) - 1 + 1),
        ]
        bad = [name for name, ok in checks if not ok]
        for name, ok in checks:
            print(f"  {'ok ' if ok else 'FAIL'} {name}")
        if bad:
            print(f"self-test FAILED: {len(bad)} check(s)")
            return 1
        print("self-test passed")
        return 0
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--survey", action="store_true")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    ap.add_argument("--fix", action="store_true")
    args = ap.parse_args()

    if args.self_test:
        return self_test()
    if args.fix:
        print("--fix is not offered: adopt sgs_motion_pause_button() + initMotionPause() in the block by hand.")
        return 2
    result = survey(BLOCKS, EXEMPT, PENDING)
    if args.survey and args.json:
        print(json.dumps(result, indent=2))
        return 0
    if args.survey:
        print_survey(result)
        return 0
    if args.check:
        n = failures(result)
        if n:
            print_survey(result)
            print(f"\ncheck-motion-pause-control: {n} failure(s). Auto-moving content needs the shared pause control (WCAG 2.2.2).")
            return 1
        c = result["counts"]
        print(f"check-motion-pause-control: OK ({c['COMPLIANT']} compliant, {c['PENDING']} pending adoption, {c['EXEMPT']} exempt-only)")
        return 0
    ap.print_help()
    return 2


if __name__ == "__main__":
    sys.exit(main())
