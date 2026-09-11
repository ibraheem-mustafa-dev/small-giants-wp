#!/usr/bin/env python
"""webgl_draw_call_probe.py -- Tier 4a's ONE new execution probe (Step 10).

WHY THIS EXISTS
----------------
`motion_library_signals.py::find_non_threejs_canvases()` finds every
`<canvas>` on a source page that does NOT carry a Three.js `data-engine`
tag. A canvas element's mere PRESENCE proves nothing about whether it is
genuinely drawing WebGL frames -- it may request a `webgl`/`webgl2` context
and never actually draw (dead code), or it may be a plain 2D-context canvas
(a chart, a signature pad) that never touches WebGL at all. Confirming
GENUINE WebGL draw activity needs real browser execution -- this is the one
piece of Tier 4a research flagged as needing new capability
(`C:/Users/Bean/.claude/memory/research/2026-09-10-detecting-motion-libraries-in-bundled-js.md`,
finding 6): monkey-patch `WebGLRenderingContext.prototype.drawArrays` via a
pre-navigation `addInitScript` hook, then check a flag after the page has
had a chance to render/scroll.

MECHANISM
----------------
1. `page.add_init_script()` runs BEFORE any page script, so the patch is in
   place before the source page's own JS ever calls `getContext('webgl')`.
2. The patch wraps `drawArrays` (present on both `WebGLRenderingContext` and
   `WebGL2RenderingContext`, since WebGL2 inherits WebGL1's prototype chain)
   to set `window.__sgsWebglDrawCallSeen = true` on first real call, then
   delegates to the original implementation so the page's own rendering is
   never altered.
3. After navigation + a short settle/scroll dwell (WebGL scenes are often
   scroll- or interaction-triggered), read the flag back.

THIS PROBE DOES NOT CLASSIFY CONTENT. It answers exactly one yes/no
question -- "did drawArrays fire at least once" -- and returns that as
DATA. It never writes a block attribute and never calls a heavier tier
(Tier 4b/4c/4d); the CRITICAL CONSTRAINT documented in
`motion_library_signals.py` applies equally here.

Usage:
    python webgl_draw_call_probe.py --url <source-page-url> [--dwell-ms 2500]
    python webgl_draw_call_probe.py --html-file <local.html> [--dwell-ms 2500]
"""
from __future__ import annotations

import argparse
import json
import sys

# Windows consoles default to cp1252; force UTF-8 so a cosmetic encoding
# fault can never masquerade as a failed probe run (same fix as
# capture-tier-fixture.py).
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sys.exit(
        "FAIL: playwright is not installed -- `pip install playwright` "
        "and `playwright install chromium`."
    )

# Injected before any page script runs. Patches BOTH WebGL1 and WebGL2
# prototypes (WebGL2RenderingContext.prototype.drawArrays is its own
# distinct function object, not inherited from WebGL1 in most engines --
# patch both explicitly rather than assuming prototype-chain inheritance).
_INIT_SCRIPT = """
(() => {
  window.__sgsWebglDrawCallSeen = false;
  const patch = (proto) => {
    if (!proto || !proto.drawArrays || proto.__sgsPatched) return;
    const original = proto.drawArrays;
    proto.drawArrays = function (...args) {
      window.__sgsWebglDrawCallSeen = true;
      return original.apply(this, args);
    };
    proto.__sgsPatched = true;
  };
  if (window.WebGLRenderingContext) patch(window.WebGLRenderingContext.prototype);
  if (window.WebGL2RenderingContext) patch(window.WebGL2RenderingContext.prototype);
})();
"""


def probe(url: str | None = None, html_file: str | None = None, dwell_ms: int = 2500) -> dict:
    """Navigate to `url` (or load `html_file`), settle, and report whether
    any WebGL `drawArrays` call fired. Returns a plain data dict -- never
    raises on a genuinely inactive canvas, only on a hard navigation/browser
    failure (surfaced via the `error` key).
    """
    if not url and not html_file:
        raise ValueError("probe() needs either url= or html_file=")

    result: dict = {
        "url": url,
        "html_file": html_file,
        "webgl_draw_call_seen": False,
        "canvas_count": 0,
        "error": None,
    }

    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            page = browser.new_page()
            page.add_init_script(_INIT_SCRIPT)
            if url:
                page.goto(url, wait_until="load", timeout=30000)
            else:
                page.goto(f"file://{html_file}", wait_until="load", timeout=30000)

            # WebGL scenes are frequently scroll- or interaction-triggered
            # (e.g. a hero canvas that only starts drawing once in view) --
            # a short settle dwell plus one scroll pass gives genuinely
            # scroll-gated content a fair chance to fire before we read the
            # flag, without inflating the probe into a full page-behaviour
            # simulation.
            page.wait_for_timeout(min(dwell_ms, 500))
            try:
                page.mouse.wheel(0, 800)
            except Exception:  # noqa: BLE001 - best-effort dwell nudge only
                pass
            page.wait_for_timeout(max(dwell_ms - 500, 0))

            result["canvas_count"] = page.evaluate("document.querySelectorAll('canvas').length")
            result["webgl_draw_call_seen"] = bool(
                page.evaluate("window.__sgsWebglDrawCallSeen === true")
            )
        except Exception as exc:  # noqa: BLE001 - report, never crash the caller
            result["error"] = str(exc)
        finally:
            browser.close()

    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", help="Live URL to probe")
    parser.add_argument("--html-file", help="Local HTML fixture path to probe")
    parser.add_argument("--dwell-ms", type=int, default=2500)
    args = parser.parse_args()

    if not args.url and not args.html_file:
        parser.error("one of --url or --html-file is required")

    result = probe(url=args.url, html_file=args.html_file, dwell_ms=args.dwell_ms)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0 if not result.get("error") else 1


if __name__ == "__main__":
    raise SystemExit(main())
