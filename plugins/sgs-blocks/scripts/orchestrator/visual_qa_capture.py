#!/usr/bin/env python3
"""visual_qa_capture.py -- Phase 6 Step 0 capture_callable factory.

Produces a callable matching the autonomy_gate.invoke_visual_qa() contract:

    capture(viewport_px: int) -> {
      "diff_ratio": float,        # fraction of pixels that differ (0.0-1.0)
      "screenshot_path": str,     # where the clone screenshot landed
      "regions": [{...}],         # optional list of localised diff regions
    }

The default factory uses Playwright (subprocess via `npx playwright`) to
capture the deployed clone URL + the mockup served over a local HTTP
server, then runs a pixel-diff via PIL.

Pure module -- no CLI surface. Imported by sgs-clone-orchestrator.py.

UK English in comments + output.
"""
from __future__ import annotations

import contextlib
import json
import socket
import subprocess
import sys
import tempfile
import threading
import time
from dataclasses import dataclass
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from typing import Callable

sys.stdout.reconfigure(encoding="utf-8")


@dataclass
class CaptureContext:
    clone_url: str
    mockup_dir: Path
    mockup_relative_path: str   # e.g. "index.html"
    out_dir: Path
    diff_tolerance: int = 30    # per-pixel R+G+B delta threshold
    selector: str | None = None  # CSS selector for per-section cropped capture
                                  # (e.g. ".sgs-hero"). When set, only the
                                  # matching DOM subtree is screenshotted on
                                  # both clone + mockup, eliminating WP-chrome
                                  # and full-page structural noise (blub.db row 256).


def _free_port() -> int:
    """Find a free localhost port for the mockup HTTP server."""
    with contextlib.closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class _SilentHandler(SimpleHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:  # noqa: A003
        # Silence stdout request logging during automated capture
        return


@contextlib.contextmanager
def _serve_mockup_dir(mockup_dir: Path, port: int):
    """Spin up a one-shot HTTP server on the mockup directory."""

    class _DirHandler(SimpleHTTPRequestHandler):
        def __init__(self, *a, **kw):
            super().__init__(*a, directory=str(mockup_dir), **kw)
        def log_message(self, fmt: str, *args) -> None:  # noqa: A003
            return

    server = HTTPServer(("127.0.0.1", port), _DirHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        # Give the socket a tick to accept connections
        time.sleep(0.3)
        yield f"http://127.0.0.1:{port}"
    finally:
        server.shutdown()
        server.server_close()


_PLAYWRIGHT_HOST_PKG = Path(__file__).resolve().parents[2]  # plugins/sgs-blocks
# That dir has node_modules/playwright; running node with cwd there lets
# `require('playwright')` resolve without a global install. Override via the
# SGS_PLAYWRIGHT_HOST env var if a different host package is preferred.


def _playwright_cwd() -> Path:
    """Return a directory where node can `require('playwright')`."""
    import os
    override = os.environ.get("SGS_PLAYWRIGHT_HOST")
    if override:
        return Path(override)
    return _PLAYWRIGHT_HOST_PKG


def _run_playwright_capture(
    url: str,
    viewport_px: int,
    out_png: Path,
    selector: str | None = None,
) -> bool:
    """Use a one-liner playwright script via node to take a screenshot.

    When ``selector`` is provided the screenshot is cropped to the matching
    DOM element via ``page.locator(selector).first.screenshot()``, which
    eliminates WP-chrome and full-page structural noise (blub.db row 256,
    per-section cropped pixel-diff rule). Falls back to full-page when the
    selector matches zero elements.

    When ``selector`` is None, full-page capture is used (backwards-compatible
    behaviour preserved for operator opt-in / no-section-metadata runs).
    """
    # Pass an absolute path to playwright - node runs in plugins/sgs-blocks
    # (so it can `require('playwright')`) and would otherwise resolve a
    # relative out_png against THAT cwd, not the orchestrator's cwd.
    out_png = out_png.resolve()
    out_png.parent.mkdir(parents=True, exist_ok=True)

    if selector:
        # Per-section selector path: screenshot only the matching subtree.
        # Falls back to full-page if the locator count is zero.
        selector_js = json.dumps(selector)
        screenshot_js = (
            f"  const _sel = {selector_js};"
            f"  const _locs = page.locator(_sel);"
            f"  const _cnt = await _locs.count();"
            f"  if (_cnt > 0) {{"
            f"    await _locs.first().scrollIntoViewIfNeeded();"
            f"    await page.waitForTimeout(400);"
            f"    await _locs.first().screenshot({{path: {json.dumps(str(out_png))}}});"
            f"  }} else {{"
            f"    await page.screenshot({{path: {json.dumps(str(out_png))}, fullPage: true}});"
            f"  }}"
        )
    else:
        # Full-page path: original behaviour, no selector.
        screenshot_js = (
            f"  await page.screenshot({{path: {json.dumps(str(out_png))}, fullPage: true}});"
        )

    js = (
        "const {chromium} = require('playwright');"
        "(async () => {"
        f"  const browser = await chromium.launch();"
        f"  const ctx = await browser.newContext({{viewport: {{width: {viewport_px}, height: 900}}}});"
        f"  const page = await ctx.newPage();"
        f"  await page.goto({json.dumps(url)}, {{waitUntil: 'networkidle', timeout: 30000}});"
        f"  await page.waitForTimeout(1500);"
        f"{screenshot_js}"
        f"  await browser.close();"
        "})().catch(e => {console.error(e); process.exit(1);});"
    )
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as tmp:
        tmp.write(js)
        js_path = tmp.name
    try:
        proc = subprocess.run(
            ["node", js_path],
            cwd=str(_playwright_cwd().resolve()),
            capture_output=True, text=True, encoding="utf-8", timeout=90,
        )
        if proc.returncode != 0:
            sys.stderr.write(
                f"[capture] node returncode={proc.returncode} url={url} vp={viewport_px}\n"
                f"  stderr: {(proc.stderr or '').strip()[:400]}\n"
            )
        return proc.returncode == 0 and out_png.exists()
    except (subprocess.TimeoutExpired, FileNotFoundError) as exc:
        sys.stderr.write(f"[capture] subprocess failed: {exc}\n")
        return False
    finally:
        Path(js_path).unlink(missing_ok=True)


def _pixel_diff(clone_png: Path, mockup_png: Path,
                tolerance: int = 30) -> tuple[float, dict]:
    """Compute fraction of pixels that differ between two PNGs.

    Returns (diff_ratio, debug_info). Crops both images to MIN(width, height)
    so a different page total height does not produce a 100% diff floor.
    """
    try:
        from PIL import Image
    except ImportError:
        return 1.0, {"error": "PIL not available; cannot diff"}

    a = Image.open(clone_png).convert("RGB")
    b = Image.open(mockup_png).convert("RGB")
    min_w = min(a.width, b.width)
    min_h = min(a.height, b.height)
    a2 = a.crop((0, 0, min_w, min_h))
    b2 = b.crop((0, 0, min_w, min_h))
    apx = a2.load(); bpx = b2.load()

    diff_count = 0
    total = min_w * min_h
    for y in range(min_h):
        for x in range(min_w):
            ra, ga, ba_ = apx[x, y]
            rb, gb, bb_ = bpx[x, y]
            if abs(ra - rb) + abs(ga - gb) + abs(ba_ - bb_) > tolerance:
                diff_count += 1

    ratio = diff_count / total if total else 1.0
    return ratio, {
        "clone_size": f"{a.width}x{a.height}",
        "mockup_size": f"{b.width}x{b.height}",
        "compared_size": f"{min_w}x{min_h}",
        "diff_pixels": diff_count,
        "total_pixels": total,
    }


def make_capture_callable(ctx: CaptureContext) -> Callable[[int], dict]:
    """Return a capture_callable(viewport_px) -> dict matching the visual-QA contract.

    Each invocation:
      1. Captures the deployed clone at the given viewport (selector-cropped
         when ctx.selector is set, full-page otherwise)
      2. Captures the mockup at the same viewport (served over local HTTP,
         same selector scope)
      3. Computes pixel diff between the two
      4. Returns {diff_ratio, screenshot_path, regions}

    The ``selector`` field on ``ctx`` drives per-section cropping (blub.db
    row 256). Pass ``selector=None`` (the default) to retain full-page
    behaviour for backwards compatibility.
    """
    # Capture file stems encode both viewport and selector so multiple per-section
    # callables writing into the same out_dir don't collide.
    _sel_slug = (
        ctx.selector.lstrip(".").replace(" ", "_").replace(">", "-")
        if ctx.selector else "fullpage"
    )

    def _capture(viewport_px: int) -> dict:
        clone_png = ctx.out_dir / f"clone-{viewport_px}-{_sel_slug}.png"
        mockup_png = ctx.out_dir / f"mockup-{viewport_px}-{_sel_slug}.png"

        clone_ok = _run_playwright_capture(
            ctx.clone_url, viewport_px, clone_png, selector=ctx.selector
        )
        if not clone_ok:
            return {
                "diff_ratio": 1.0,
                "screenshot_path": "",
                "regions": [],
                "error": "clone capture failed",
            }

        port = _free_port()
        with _serve_mockup_dir(ctx.mockup_dir, port) as base_url:
            mockup_url = f"{base_url}/{ctx.mockup_relative_path.lstrip('/')}"
            mockup_ok = _run_playwright_capture(
                mockup_url, viewport_px, mockup_png, selector=ctx.selector
            )

        if not mockup_ok:
            return {
                "diff_ratio": 1.0,
                "screenshot_path": str(clone_png),
                "regions": [],
                "error": "mockup capture failed",
            }

        ratio, debug = _pixel_diff(clone_png, mockup_png, tolerance=ctx.diff_tolerance)
        return {
            "diff_ratio": ratio,
            "screenshot_path": str(clone_png),
            "regions": [],
            "debug": debug,
        }

    return _capture


def stub_capture(_viewport_px: int) -> dict:
    """DEPRECATED -- do not use in production paths.

    Returns a ``stage_8_skipped`` sentinel that autonomy_gate.autonomy_decision()
    treats as ``surface-to-operator`` (never auto-pass).

    The name is preserved for backwards compatibility with callers that already
    import it by name (e.g. sgs-clone-orchestrator.py), but callers should
    treat the returned dict as a skip signal, not a clean pass.

    If you genuinely want a smoke-test that bypasses visual QA, pass
    ``--smoke-stage-8`` to the orchestrator (not yet implemented -- flag
    intentionally absent so operators cannot accidentally opt in to a silent
    pass).
    """
    return {
        "diff_ratio":       None,
        "screenshot_path":  "",
        "regions":          [],
        "stage_8_skipped":  True,
        "skip_reason":      (
            "Stage 8 visual QA was skipped because --clone-url was not supplied. "
            "Operator must run /visual-qa against the deployed URL manually, "
            "OR re-run with --clone-url=<staging-url> to enforce the 1% gate."
        ),
    }
