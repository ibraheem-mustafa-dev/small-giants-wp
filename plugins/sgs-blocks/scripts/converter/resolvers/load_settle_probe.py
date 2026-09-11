#!/usr/bin/env python
"""load_settle_probe.py -- Tier 4b "page-load-settle" motion probe (D1032).

WHY THIS EXISTS
----------------
R8's Tier 1/2 static CSS classifiers (`motion_shape.py`/`motion_trigger.py`)
read a draft element's `@keyframes`/`animation`/`transition` declarations
and match them against the seeded `motion_shape_signatures` catalogue. They
are provably bounded to STATIC CSS text -- they never touch a live page.
D1026's honest ceiling check (`.claude/decisions.md`) found 3 real-world
sampled effects that Tier 1/2 structurally cannot resolve because the shape
is only ever observable by watching the REAL rendered page: a Framer
tooltip (`:hover`-triggered, already reachable via the D1024/D1026 hover
wiring -- not this probe's target), Locomotive's `.c-scrollbar` (a
scroll-state toggle -- not this probe's target either), and Locomotive's
`.c-preloader` -- a "fade to black on page load complete" effect toggled by
JS adding/removing a class once the page has finished loading, NOT by
`:hover`/`:focus`. That third case is this module's exact target: it is
the ONE remaining real-world gap that fires on a TIMING event (page load)
rather than a user interaction (hover/scroll) -- so, unlike the other two,
it needs no guess about WHICH interaction to simulate. This project's
"never guess between ties, decline rather than guess" discipline
(`motion_shape.py`'s own module docstring) is exactly why the other two
gaps are correctly left alone here rather than bolted on speculatively.

MECHANISM
----------------
This module is a PURE SAMPLING function. It does NOT do shape-matching and
does NOT touch the database -- it navigates to a real URL, reads
`getComputedStyle()` for each candidate selector as early as reasonably
possible after navigation, waits `dwell_ms`, reads again, and returns the
raw before/after pair plus which of the three watched properties changed.
Shape-matching is a SEPARATE step (`classify_load_settle_candidate()`
below), which hands the sampled values to the EXISTING
`motion_shape.extract_shape_from_transition()` + `match_motion_shape()` --
no new shape-matching logic is added by this module; it only supplies a
different SOURCE of `from_declarations` (a live computed-style sample
instead of values parsed from static CSS text).

"As early as reasonably possible" = `page.goto(url, wait_until=
"domcontentloaded")`. `wait_until="commit"` fires before the DOM exists at
all (computed style would be unreadable); `"load"`/`"networkidle"` wait for
every subresource, which is exactly the settle window this probe is trying
to sample BEFORE -- `"domcontentloaded"` is the earliest point a real
`document.querySelector()` + `getComputedStyle()` call can reliably resolve
a real value, and is the same tradeoff Playwright's own docs recommend for
"read the DOM as soon as it's parseable" use cases.

WHY `transform` IS SAMPLED BUT RARELY MATCHES A SHAPE: `getComputedStyle()`
resolves `transform` to a `matrix(...)`/`matrix3d(...)`/`none` string, never
the AUTHORED function notation (`translateY(30px)`, `scaleX(0)`, ...) that
`motion_shape.parse_transform_declaration()` parses. Decomposing a general
matrix back into a signed single-axis translate/scale is a real, separate
design question this probe does not attempt (no invented matrix-decompose
logic). The sampled `transform` value is still captured, diffed, and
returned in `probe()`'s own output -- useful evidence for a human reviewing
`tier4b-load-settle-*` findings -- and `build_transition_shape_from_probe_
result()` only ever hands it to the shape extractor when `transform` is
itself the property that changed (never merely present), so an unparseable
matrix diff reaches `extract_shape_from_transition()`'s own parse-or-decline
chain and cleanly falls through to a `None` shape, exactly like it does for
any other unparseable static-CSS value -- never a false zero-magnitude
match on a DIFFERENT, unchanged axis. `filter` is the opposite case: CSS
Filter Effects computed values ARE serialised in function notation
(`blur(8px)`, not a matrix), so a sampled, CHANGED `filter` value round-
trips through `parse_filter_declaration()` correctly.

FAIL-CLOSED: a candidate whose before/after computed values are IDENTICAL
on all three watched properties is never handed to the shape extractor at
all (`classify_load_settle_candidate()` returns `({}, [])` immediately) --
this mirrors `match_motion_shape()`'s own `len(matches) != 1` "decline
rather than guess" gate. This module invents no fallback shape and never
manufactures a match from an absent diff.

Usage:
    python load_settle_probe.py --url <source-page-url> --selector ".c-preloader" [--dwell-ms 1500]
"""
from __future__ import annotations

import argparse
import json
import sys

# Windows consoles default to cp1252; force UTF-8 so a cosmetic encoding
# fault can never masquerade as a failed probe run (same fix as
# capture-tier-fixture.py / webgl_draw_call_probe.py).
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

try:  # pragma: no cover - import shape depends on caller's sys.path setup
    from converter.resolvers.motion_shape import (
        extract_shape_from_transition,
        match_motion_shape,
    )
except ImportError:  # pragma: no cover - fallback when run as a loose script
    from motion_shape import (  # type: ignore
        extract_shape_from_transition,
        match_motion_shape,
    )

# The 3 properties this probe watches -- matches the design brief's own
# list and `motion_shape.py`'s own recognised shape vocabulary (transform /
# filter / opacity -- clip-path is a 4th recognised shape there, but is not
# reliably observable via getComputedStyle() the way the other three are,
# so it is intentionally not sampled here).
_PROBED_PROPERTIES = ("opacity", "transform", "filter")

# Evaluated in-page per candidate. Returns None when the selector matches
# nothing (an honest "not found" rather than a JS exception that would
# otherwise look like a probe failure).
_SNAPSHOT_SCRIPT = """
(selector) => {
  const el = document.querySelector(selector);
  if (!el) return null;
  const cs = getComputedStyle(el);
  return { opacity: cs.opacity, transform: cs.transform, filter: cs.filter };
}
"""


def _diff_snapshots(before: "dict | None", after: "dict | None") -> "list[str]":
    """Which of the 3 watched properties genuinely changed between two
    snapshots. Returns [] (not a guess, not a partial list) when either
    snapshot is absent -- an undeterminable diff is not a zero diff."""
    if before is None or after is None:
        return []
    return [prop for prop in _PROBED_PROPERTIES if before.get(prop) != after.get(prop)]


def probe(url: str, candidate_elements: "list[dict]", dwell_ms: int = 1500) -> dict:
    """Navigate to `url`, sample each candidate's computed style as early as
    reasonably possible after navigation, wait `dwell_ms`, sample again, and
    return the raw before/after pair per candidate. Never does shape-
    matching and never touches the database -- see module docstring.

    `candidate_elements` -- a list of `{"selector": <css-selector-string>}`
    dicts (any other keys are ignored, so a caller may pass its own richer
    candidate dicts straight through without pre-stripping them).

    Returns:
        {
          "url": str,
          "dwell_ms": int,
          "candidates": [
            {
              "selector": str,
              "before": {"opacity": str, "transform": str, "filter": str} | None,
              "after":  {"opacity": str, "transform": str, "filter": str} | None,
              "changed_properties": [str, ...],   # subset of _PROBED_PROPERTIES
              "error": str | None,                # per-candidate sampling error
            },
            ...
          ],
          "error": str | None,   # top-level navigation/browser error
        }

    `before`/`after` is None (never a fabricated empty dict) when the
    selector matched nothing in the DOM at that sample point -- e.g. a
    preloader element some drafts remove entirely from the DOM once its
    fade-out transition ends, rather than merely restyling it. A
    per-candidate sampling error never aborts the other candidates in the
    same probe run.
    """
    result: dict = {"url": url, "dwell_ms": dwell_ms, "candidates": [], "error": None}
    if not candidate_elements:
        return result

    selectors: "list[str]" = []
    for candidate in candidate_elements:
        selector = candidate.get("selector") if isinstance(candidate, dict) else None
        if selector:
            selectors.append(selector)
    if not selectors:
        return result

    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            page = browser.new_page()
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=30000)
            except Exception as exc:  # noqa: BLE001 - report, never crash the caller
                result["error"] = f"navigation failed: {exc}"
                return result

            before_snapshots: "dict[str, dict | None]" = {}
            for selector in selectors:
                try:
                    before_snapshots[selector] = page.evaluate(_SNAPSHOT_SCRIPT, selector)
                except Exception:  # noqa: BLE001 - per-selector sampling only
                    before_snapshots[selector] = None

            page.wait_for_timeout(dwell_ms)

            for selector in selectors:
                entry: dict = {
                    "selector": selector,
                    "before": before_snapshots.get(selector),
                    "after": None,
                    "changed_properties": [],
                    "error": None,
                }
                try:
                    after = page.evaluate(_SNAPSHOT_SCRIPT, selector)
                except Exception as exc:  # noqa: BLE001 - per-selector sampling only
                    entry["error"] = str(exc)
                    result["candidates"].append(entry)
                    continue

                entry["after"] = after
                if before_snapshots.get(selector) is None and after is None:
                    entry["error"] = "selector matched no element at either sample point"
                elif before_snapshots.get(selector) is None or after is None:
                    entry["error"] = "selector matched an element at only one sample point"
                else:
                    entry["changed_properties"] = _diff_snapshots(before_snapshots[selector], after)
                result["candidates"].append(entry)
        finally:
            browser.close()

    return result


def build_transition_shape_from_probe_result(candidate_result: dict) -> "dict | None":
    """The adapter: maps ONE candidate's sampled before/after pair (a
    `probe()` result entry) into `motion_shape.extract_shape_from_
    transition()`'s `from_declarations` input shape -- supplying live
    computed-style values INSTEAD OF values parsed from static CSS text,
    with no new shape-matching logic of its own.

    Fail-closed (step 4 of the design): returns None -- never a guessed or
    partial shape -- when either snapshot is missing, or when the caller's
    own `changed_properties` diff (built by `probe()`, not re-derived here)
    is empty. A genuinely unchanged before/after pair is not evidence of a
    load-settle effect; per-property sampling errors already surfaced via
    `probe()`'s own `error` field are treated the same as "nothing to see".
    """
    if candidate_result.get("error"):
        return None
    before = candidate_result.get("before")
    after = candidate_result.get("after")
    if not before or not after:
        return None
    changed = candidate_result.get("changed_properties")
    if not changed:
        return None
    changed_set = set(changed)

    # Gated PER PROPERTY on that property actually being the one that
    # changed -- not just being present in `before` at all. Without this
    # gate, an unchanged `opacity` sampled alongside a genuinely-changed
    # (but unparseable, e.g. computed-matrix) `transform` would still hand
    # `extract_shape_from_transition()` a real opacity/opacity_to pair,
    # which -- for an UNCHANGED value -- resolves to a valid but
    # ZERO-magnitude opacity shape and can false-match a real preset (e.g.
    # `fade-in`'s own magnitude band including 0). Only the axis with
    # genuine evidence of motion is ever handed to the shape extractor.
    from_declarations: "dict[str, str]" = {}
    if "transform" in changed_set and before.get("transform") is not None:
        from_declarations["transform"] = before["transform"]
    if "filter" in changed_set and before.get("filter") is not None:
        from_declarations["filter"] = before["filter"]
    if "opacity" in changed_set and before.get("opacity") is not None and after.get("opacity") is not None:
        from_declarations["opacity"] = before["opacity"]
        from_declarations["opacity_to"] = after["opacity"]

    if not from_declarations:
        return None
    return from_declarations


def classify_load_settle_candidate(
    candidate_result: dict, transition_declaration: str, db_path: "str | None" = None
) -> "tuple[dict, list]":
    """Full Tier 4b classification for ONE probed candidate: adapt the
    sampled diff -> `extract_shape_from_transition()` -> `match_motion_
    shape()`, tagging a real match `fxTrigger='load'` (this probe's whole
    reason for existing is elements whose motion fires on a TIMING event,
    not `:hover`/`:focus` -- see module docstring).

    `transition_declaration` is the element's own static `transition:`
    shorthand value (e.g. `"opacity 900ms ease"`) -- this probe samples
    computed STYLE VALUES, not timing/easing, so the shorthand itself still
    comes from the caller's own static-CSS candidate discovery, exactly as
    `extract_shape_from_transition()` already expects for its second
    argument.

    Returns the SAME `(attrs, skipped)` shape every other Tier in this
    codebase returns (`motion_shape.match_motion_shape()`'s own contract),
    so a caller can fold a Tier 4b result through the same merge/report
    path as Tier 1/2's output. `attrs` is `{}` on any decline -- fail-closed
    per the module docstring, never a guessed shape.
    """
    from_declarations = build_transition_shape_from_probe_result(candidate_result)
    if from_declarations is None:
        return {}, []

    shape = extract_shape_from_transition(from_declarations, transition_declaration)
    if shape is None:
        return {}, []

    attrs, skipped = match_motion_shape(shape, db_path)
    if attrs:
        attrs = {**attrs, "fxTrigger": "load"}
    return attrs, skipped


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", required=True, help="Live URL to probe")
    parser.add_argument(
        "--selector", action="append", required=True,
        help="CSS selector of a candidate element (repeatable)",
    )
    parser.add_argument("--dwell-ms", type=int, default=1500)
    args = parser.parse_args()

    candidates = [{"selector": s} for s in args.selector]
    result = probe(url=args.url, candidate_elements=candidates, dwell_ms=args.dwell_ms)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0 if not result.get("error") else 1


if __name__ == "__main__":
    raise SystemExit(main())
