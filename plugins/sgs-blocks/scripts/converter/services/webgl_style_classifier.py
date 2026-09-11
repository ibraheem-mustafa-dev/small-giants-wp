"""Tier 4c -- WebGL visual-style approximation via screenshot classification.

`.claude/plans/phase-r8-motion-recognition.md` Step 11 +
`.claude/plans/2026-09-10-r8-motion-recognition-brainstorm.md` Tier 4c
section (mechanism steps 1-5).

WHAT THIS DOES
----------------
Given a source page Tier 4a has ALREADY confirmed is genuinely rendering
WebGL (never on a guess -- see "THE HARD GATE" below), this module:

1. Screenshots the canvas region (reusing the same Playwright
   navigate/dwell shape `converter/webgl_draw_call_probe.py` already uses --
   no second scrape mechanism invented).
2. Classifies the screenshot's visual CHARACTER from PIXELS ONLY -- never
   the shader/GPU code -- into one of three buckets: a grain/halftone/
   duotone TREATMENT, a flowing organic GRADIENT, or NEITHER. This is the
   exact line Spec 38 SS1.2b draws: "the pipeline reads computed CSS; a
   shader has none" -- a shader has no computed style, but a rendered
   screenshot is exactly as inspectable as any other rendered pixel output
   this pipeline already reads (R-31-11).
3. Samples dominant colours from the same screenshot.
4. Matches the classified character to one of SGS's two shipped Tier W
   effects (`surface-treatment`, `flowing-gradient`/`wave-gradient`) --
   or reports NO MATCH plainly when neither fits.
5. Returns a plain SUGGESTION dict. Nothing in this module writes a block
   attribute. See "THE HARD GATE" + "NEVER AUTO-APPLIES" below.

THE HARD GATE (mandatory pre-flight on every entry point below)
----------------------------------------------------
`check_tier4a_confirmed_webgl()` inspects the REAL return shapes of
`converter/resolvers/motion_library_signals.py::detect_from_soup()` (a list
of found-signal dicts, each carrying `library_name`) and
`converter/webgl_draw_call_probe.py::probe()` (a dict carrying
`webgl_draw_call_seen`). Confirmed WebGL presence means EITHER a genuine
`three-js` DOM signal was found (the `library_name` Tier 4a's own seed data
uses -- confirmed live via
`grep -n "library_name" plugins/sgs-blocks/scripts/dbschema/seed-library-signatures.py`)
OR the draw-call probe actually saw `drawArrays` fire with no probe error.
Every public function below that does real classification work calls this
gate FIRST and refuses (`ClassifierNotGatedError`) rather than proceeding
on an unconfirmed page. This module is never fired standalone -- it is
always the second half of a Tier-4a-then-Tier-4c pipeline step.

NEVER AUTO-APPLIES (verify by grep before calling this module "done")
----------------------------------------------------
Every function here returns DATA ONLY. Confirmed by direct grep of this
file for the block-attribute-writing surfaces (`converter/services/
assembly.py`, `fx_attr_roster`, `lift_behavioural_attrs`) -- zero imports
of any of them. The suggestion this module produces is presented to the
operator via the SAME BEM-signal declaration mechanism every other Tier W
control already requires (`SurfaceTreatmentPanel.js` / `fx.js`'s
`FlowingGradientRowControls`-style panel) -- a human clicks "use this
suggestion" in the block editor, which is what actually writes `fx`/
`fxTreatment*`/`fxWave*` onto the block. This module cannot reach a block's
saved attributes by any code path.

WHY DOMINANT COLOURS ARE RETURNED AS HEX, NOT PALETTE SLUGS
----------------------------------------------------
`fx.js`'s own docblock (SS "Surface treatment" attributes) states
`fxTreatmentShadow`/`fxTreatmentHighlight`/`fxTreatmentTint`/
`fxTreatmentInk` store palette SLUGS (`DesignTokenPicker` values), resolved
render-side via `sgs_fx_cursor_field_colour()`. Snapping an arbitrary
sampled RGB to the nearest live theme palette slug is a real, NOT-YET-BUILT
capability -- `converter/services/token_snap.py::token_snap()` is
confirmed (by direct read, 2026-09-11) to be an identity passthrough for
colour today ("Step-3: colour/spacing token snapping. Identity until those
resolvers land."). Inventing a fake snap here would silently misrepresent
an unbuilt capability as working. This module returns sampled colours as
plain hex + pixel-weight, honestly labelled `sampled_colours_hex`, for the
operator to eyeball against their own palette swatches in the confirmation
UI -- a real, if smaller, time-saving over sampling from scratch. Flagged
here as a documented gap, not silently worked around (R-31-8 discipline).

VISION-CAPABLE READ, MADE CONCRETE
----------------------------------------------------
`classify_visual_character()` takes an optional `classify_fn` callback --
the real integration point for a genuine vision-model read (e.g. an agent
dispatched with the Read tool viewing the screenshot directly, or a future
wired-up vision API call; no such wiring exists anywhere else in this
codebase today -- confirmed by grep, see the module test file for the
citation). When `classify_fn` is omitted, this module falls back to a
coarse PIXEL-STATISTICS heuristic (`_heuristic_classify()`) so the module
is still runnable standalone in CI/dev -- but that fallback's output is
ALWAYS labelled `"method": "heuristic-fallback"`, never presented with the
same confidence framing a real vision read would carry. Never conflate the
two in a confirmation UI string.

UK English in comments + output.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import sys
from pathlib import Path
from typing import Any, Callable, Optional

# Windows consoles default to cp1252; force UTF-8 so a cosmetic encoding
# fault can never masquerade as a failed classification (same fix as
# capture-tier-fixture.py / webgl_draw_call_probe.py).
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

# The one Tier-4a DOM signal that, on its own, confirms genuine WebGL
# rendering (Three.js self-tags its canvas -- presence IS the confirmation,
# unlike the other two signals which confirm *smooth-scroll*/*pinning*, not
# WebGL). Matches the real seeded row -- see this module's docblock.
_THREEJS_LIBRARY_NAME = "three-js"

# Below this confidence, a classification is reported as "uncertain" rather
# than forced to whichever bucket scored (marginally) highest. Mirrors
# Step 3's binary-match discipline ("zero or 2+ equally-good matches -> no
# match, fall through cleanly") applied to a continuous score instead of an
# exact-match rule, because pixel classification is inherently fuzzy in a
# way a CSS-declaration read is not.
CONFIDENCE_THRESHOLD = 0.55

CHARACTER_TREATMENT = "grain_halftone_duotone"
CHARACTER_GRADIENT = "flowing_gradient"
CHARACTER_NEITHER = "neither"
CHARACTER_UNCERTAIN = "uncertain"

_VALID_CHARACTERS = frozenset(
    {CHARACTER_TREATMENT, CHARACTER_GRADIENT, CHARACTER_NEITHER, CHARACTER_UNCERTAIN}
)


class ClassifierNotGatedError(RuntimeError):
    """Raised when any real classification work is attempted without a
    confirmed Tier 4a WebGL-presence signal. This is the phase's core
    safety property (QA Gate, Step 12) -- it must be impossible to bypass
    by construction, not just by convention."""


# ---------------------------------------------------------------------------
# THE HARD GATE
# ---------------------------------------------------------------------------

def check_tier4a_confirmed_webgl(
    found_signals: Optional[list[dict]] = None,
    draw_call_result: Optional[dict] = None,
) -> dict:
    """Inspect Tier 4a's REAL output shapes and decide whether genuine WebGL
    rendering is confirmed for this source. Never a guess -- only these two
    concrete evidence sources count.

    `found_signals` -- the list `motion_library_signals.py::detect_from_soup()`
        (or `detect_from_html_file()`) returns. A `three-js` entry in here
        means Three.js self-tagged its own canvas -- confirmed rendering,
        not merely a script reference.
    `draw_call_result` -- the dict `webgl_draw_call_probe.py::probe()`
        returns. `webgl_draw_call_seen=True` with no `error` means a real
        `drawArrays` call fired during the probe's dwell window.

    Returns `{"confirmed": bool, "source": str|None, "reason": str}`.
    """
    for sig in found_signals or []:
        if sig.get("library_name") == _THREEJS_LIBRARY_NAME:
            return {
                "confirmed": True,
                "source": "three-js-dom-signal",
                "reason": (
                    "Three.js self-tagged its own <canvas data-engine> "
                    "attribute -- genuine rendering confirmed by the "
                    "library's own runtime marker."
                ),
            }

    if draw_call_result and not draw_call_result.get("error"):
        if draw_call_result.get("webgl_draw_call_seen") is True:
            return {
                "confirmed": True,
                "source": "draw-call-probe",
                "reason": (
                    "WebGLRenderingContext.drawArrays fired at least once "
                    "during the probe's live browser dwell window."
                ),
            }

    return {
        "confirmed": False,
        "source": None,
        "reason": (
            "Neither a Three.js DOM signal nor a confirmed draw-call was "
            "supplied. Tier 4c must never fire on a guess -- see this "
            "module's docblock, 'THE HARD GATE'."
        ),
    }


def _require_gate(gate: dict) -> None:
    if not gate.get("confirmed"):
        raise ClassifierNotGatedError(
            "Tier 4c refused to run: " + gate.get("reason", "no Tier 4a confirmation supplied")
        )


# ---------------------------------------------------------------------------
# Screenshot capture (reuses webgl_draw_call_probe.py's navigate/dwell shape)
# ---------------------------------------------------------------------------

def capture_canvas_screenshot(
    page: Any,
    out_path: "Path | str",
    canvas_selector: str = "canvas",
) -> Optional[str]:
    """Screenshot just the canvas element off an ALREADY-OPEN Playwright
    `page` (e.g. the same page object `webgl_draw_call_probe.probe()` drove,
    so a caller can gate-check and screenshot in one browser session rather
    than opening two). Returns the path written, or None if no matching
    canvas was found.
    """
    locator = page.locator(canvas_selector).first
    if locator.count() == 0:
        return None
    out_path = str(out_path)
    locator.screenshot(path=out_path)
    return out_path


def capture_canvas_screenshot_standalone(
    url: str,
    out_path: "Path | str",
    canvas_selector: str = "canvas",
    dwell_ms: int = 2500,
) -> dict:
    """Standalone capture for when the caller has no already-open page
    (e.g. running Tier 4c after Tier 4a's evidence was supplied out of
    band, such as from a stored `leftover-buckets.json` entry). Mirrors
    `webgl_draw_call_probe.py::probe()`'s own navigate + settle + one
    scroll-pass dwell exactly, so WebGL scenes that only start drawing once
    scrolled into view get the same fair chance here as they did during
    the Tier 4a probe. Not a second scrape mechanism -- a screenshot
    capture, which the probe itself does not do.
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return {"path": None, "error": "playwright is not installed"}

    result: dict = {"path": None, "error": None}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            page = browser.new_page()
            page.goto(url, wait_until="load", timeout=30000)
            page.wait_for_timeout(min(dwell_ms, 500))
            try:
                page.mouse.wheel(0, 800)
            except Exception:  # noqa: BLE001 - best-effort dwell nudge only
                pass
            page.wait_for_timeout(max(dwell_ms - 500, 0))
            path = capture_canvas_screenshot(page, out_path, canvas_selector)
            if path is None:
                result["error"] = f"no element matched selector {canvas_selector!r}"
            result["path"] = path
        except Exception as exc:  # noqa: BLE001 - report, never crash the caller
            result["error"] = str(exc)
        finally:
            browser.close()
    return result


# ---------------------------------------------------------------------------
# Dominant-colour sampling
# ---------------------------------------------------------------------------

def sample_dominant_colours(image_path: "Path | str", n: int = 3) -> list[dict]:
    """Sample the `n` most common colours in the screenshot, downsampled
    first for speed. Returns `[{"hex": "#rrggbb", "weight": 0.0-1.0}, ...]`
    sorted by weight descending. Plain hex -- see this module's docblock,
    'WHY DOMINANT COLOURS ARE RETURNED AS HEX, NOT PALETTE SLUGS'.
    """
    from PIL import Image

    img = Image.open(image_path).convert("RGB")
    img.thumbnail((160, 160))
    quantised = img.quantize(colors=max(n, 2), method=Image.Quantize.MEDIANCUT)
    palette = quantised.getpalette()
    colour_counts = sorted(quantised.getcolors(), key=lambda t: t[0], reverse=True)
    total_px = sum(c for c, _ in colour_counts)

    out: list[dict] = []
    for count, idx in colour_counts[:n]:
        r, g, b = palette[idx * 3 : idx * 3 + 3]
        out.append(
            {
                "hex": f"#{r:02x}{g:02x}{b:02x}",
                "weight": round(count / total_px, 4) if total_px else 0.0,
            }
        )
    return out


# ---------------------------------------------------------------------------
# Visual-character classification (pixels only -- never shader/GPU code)
# ---------------------------------------------------------------------------

def _to_grayscale_matrix(image_path: "Path | str", size: int = 128) -> list[list[float]]:
    from PIL import Image

    img = Image.open(image_path).convert("L")
    img = img.resize((size, size))
    px = img.load()
    return [[px[x, y] for x in range(size)] for y in range(size)]


def _local_noise_score(grid: list[list[float]]) -> float:
    """WIDESPREAD moderate pixel-to-pixel variance -- proxy for GRAIN.

    Deliberately a DENSITY (what fraction of adjacent-pixel pairs show a
    moderate delta), not a mean -- a mean is dominated by a handful of
    large jumps (e.g. a faceted 3D object's sparse hard edges, verified
    2026-09-11 by direct measurement against the fixture-3 test image:
    mean delta 3.48 looked grain-like, but only 8.1% of pixel-pairs
    actually carried a moderate delta, vs 61.6% for genuine grain in
    fixture 1 and 0% for a genuinely smooth gradient in fixture 2 --
    density cleanly separates the three where mean does not).
    Real film-grain-style noise touches MOST of the image at a small-to-
    moderate magnitude; a few sharp edges on an otherwise flat surface do
    not.
    """
    h = len(grid)
    w = len(grid[0])
    diffs = []
    for y in range(h - 1):
        for x in range(w - 1):
            diffs.append(abs(grid[y][x] - grid[y][x + 1]))
            diffs.append(abs(grid[y][x] - grid[y + 1][x]))
    if not diffs:
        return 0.0
    moderate = sum(1 for d in diffs if 3 <= d <= 45)
    return moderate / len(diffs)


def _bimodality_score(grid: list[list[float]]) -> float:
    """How strongly the luminance histogram clusters at BOTH extremes --
    proxy for DUOTONE (a genuine shadow tone AND a genuine highlight tone,
    little in between).

    Requires mass at BOTH ends, not just one -- verified 2026-09-11 the
    naive "sum of both edge bins" version false-positived on fixture 3 (a
    faceted object over a near-black backdrop): the backdrop alone piled
    ~74% of pixels into the dark bin with almost nothing at the light end,
    which is a DARK IMAGE, not a duotone. `min(low, high)` requires real
    presence at both ends before it can score high.
    """
    h = len(grid)
    w = len(grid[0])
    total = h * w
    if not total:
        return 0.0
    low = sum(1 for row in grid for v in row if v < 40)
    high = sum(1 for row in grid for v in row if v > 215)
    low_frac = low / total
    high_frac = high / total
    return min(2 * min(low_frac, high_frac), 1.0)


def _low_freq_hue_diversity(image_path: "Path | str", size: int = 24) -> float:
    """Downsample hard (so fine texture/noise washes out) then measure how
    many DISTINCT hue buckets the smoothed image still covers -- proxy for
    a FLOWING GRADIENT (many hues, smoothly blended, no fine texture)."""
    from PIL import Image
    import colorsys

    img = Image.open(image_path).convert("RGB")
    img = img.resize((size, size))
    px = img.load()
    hue_buckets = set()
    for y in range(size):
        for x in range(size):
            r, g, b = px[x, y]
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if s < 0.12:  # near-greyscale pixels carry no useful hue signal
                continue
            hue_buckets.add(int(h * 24))
    return min(len(hue_buckets) / 12.0, 1.0)


def _heuristic_classify(image_path: "Path | str") -> dict:
    """Coarse pixel-statistics fallback -- NOT a real vision-model read.
    See this module's docblock, 'VISION-CAPABLE READ, MADE CONCRETE'.
    """
    grid = _to_grayscale_matrix(image_path)
    noise = _local_noise_score(grid)
    bimodal = _bimodality_score(grid)
    hue_diversity = _low_freq_hue_diversity(image_path)
    smoothness = 1.0 - noise

    treatment_score = max(noise, bimodal)
    gradient_score = hue_diversity * smoothness

    scores = {
        CHARACTER_TREATMENT: treatment_score,
        CHARACTER_GRADIENT: gradient_score,
    }
    best_character = max(scores, key=scores.get)
    best_score = scores[best_character]
    runner_up = min(scores.values()) if len(scores) > 1 else 0.0
    # A genuine win needs BOTH a real absolute score AND real separation
    # from the other bucket -- otherwise this is an ambiguous image and
    # must be reported honestly as uncertain (never a forced guess).
    separation = best_score - runner_up

    if best_score < CONFIDENCE_THRESHOLD or separation < 0.12:
        character = CHARACTER_UNCERTAIN
        confidence = round(best_score, 3)
    else:
        character = best_character
        confidence = round(best_score, 3)

    return {
        "character": character,
        "confidence": confidence,
        "method": "heuristic-fallback",
        "raw_scores": {k: round(v, 3) for k, v in scores.items()},
        "notes": (
            "Coarse pixel-statistics heuristic (local noise + luminance "
            "bimodality + low-frequency hue diversity) -- not a real "
            "vision-model read. Supply classify_fn for a genuine read."
        ),
    }


def classify_visual_character(
    image_path: "Path | str",
    classify_fn: Optional[Callable[[str], dict]] = None,
) -> dict:
    """Classify the screenshot's visual character from PIXELS ONLY.

    `classify_fn`, when supplied, is the real vision-model integration
    point: a callable taking the image path and returning
    `{"character": ..., "confidence": 0.0-1.0, "notes": str}`. When
    omitted, falls back to `_heuristic_classify()` (labelled as such,
    never presented with vision-model-grade confidence).
    """
    if classify_fn is not None:
        result = dict(classify_fn(str(image_path)))
        result.setdefault("method", "vision-model")
        if result.get("character") not in _VALID_CHARACTERS:
            raise ValueError(
                f"classify_fn returned an unrecognised character: {result.get('character')!r}"
            )
        if result.get("confidence", 0) < CONFIDENCE_THRESHOLD and result["character"] != CHARACTER_UNCERTAIN:
            # Even a real vision read must not be force-reported as a
            # confident bucket below the same honesty threshold the
            # heuristic path uses -- never a forced low-confidence guess
            # presented as certain (Step 11's Edge test).
            result["character"] = CHARACTER_UNCERTAIN
        return result

    return _heuristic_classify(image_path)


# ---------------------------------------------------------------------------
# Matching to SGS's two shipped Tier W effects
# ---------------------------------------------------------------------------

def _sub_classify_treatment(image_path: "Path | str") -> str:
    """Given the TREATMENT bucket already won, pick which of the three
    curated `surface-treatment` presets (grain|halftone|duotone) it most
    resembles. A secondary, coarser heuristic -- genuinely ambiguous cases
    default to 'grain' (the least visually specific of the three, so a
    wrong sub-guess costs the operator the smallest correction)."""
    grid = _to_grayscale_matrix(image_path)
    bimodal = _bimodality_score(grid)
    noise = _local_noise_score(grid)
    if bimodal > 0.55:
        return "duotone"
    if noise > 0.45:
        return "grain"
    return "halftone" if bimodal > 0.3 else "grain"


def match_to_shipped_effect(character_result: dict, dominant_colours: list[dict]) -> dict:
    """Map a classified character + sampled colours onto a concrete,
    OPERATOR-CONFIRMABLE suggestion. Never writes anything -- see this
    module's docblock, 'NEVER AUTO-APPLIES'.
    """
    character = character_result.get("character")

    if character == CHARACTER_TREATMENT:
        return {
            "matched_effect": "surface-treatment",
            "confidence": character_result.get("confidence"),
            "method": character_result.get("method"),
            "suggested_attributes": {
                "fx": "surface-treatment",
                # `fxTreatment` is the one curated-preset string this
                # module CAN suggest outright (grain|halftone|duotone).
                "fxTreatment": None,  # filled in below once sub-classified
            },
            "sampled_colours_hex": dominant_colours,
            "operator_note": (
                "Palette slugs (fxTreatmentShadow/Highlight/Tint/Ink) are "
                "NOT auto-filled -- token_snap.py has no live colour-snap "
                "yet (confirmed by direct read, 2026-09-11). Pick the "
                "closest theme swatch to the sampled hex values above in "
                "the SurfaceTreatmentPanel."
            ),
            "requires_operator_confirmation": True,
        }

    if character == CHARACTER_GRADIENT:
        wave_slots = ["fxWaveBase", "fxWave1", "fxWave2", "fxWave3"]
        return {
            "matched_effect": "wave-gradient",
            "confidence": character_result.get("confidence"),
            "method": character_result.get("method"),
            "suggested_attributes": {
                "fx": "wave-gradient",
                # aurora/ink are WebGL-only variants Bean rejected outright
                # ("B-movie 3D VFX" -- FlowingGradientRowControls.js) --
                # this module must NEVER suggest them. 'pastel' is the
                # safe, CSS-painted default variant.
                "fxWaveVariant": "pastel",
            },
            "sampled_colours_hex": dominant_colours,
            "wave_colour_slot_hint": dict(
                zip(wave_slots, [c["hex"] for c in dominant_colours[: len(wave_slots)]])
            ),
            "operator_note": (
                "Wave colour slots above are HEX HINTS, not slugs -- same "
                "token-snap gap as surface-treatment. Pick the closest "
                "theme swatch in the flowing-gradient panel."
            ),
            "requires_operator_confirmation": True,
        }

    # CHARACTER_NEITHER or CHARACTER_UNCERTAIN -- honest no-match.
    return {
        "matched_effect": None,
        "confidence": character_result.get("confidence"),
        "method": character_result.get("method"),
        "message": (
            "No confident match to either shipped Tier W effect "
            "(surface-treatment, wave-gradient). This WebGL source's "
            "visual style is out of Tier 4c's current scope."
        ),
        "next_step": "tier_4d",
        "requires_operator_confirmation": True,
    }


def build_operator_suggestion(
    image_path: "Path | str",
    gate: dict,
    classify_fn: Optional[Callable[[str], dict]] = None,
    n_colours: int = 3,
) -> dict:
    """Top-level orchestrator: gate -> classify -> sample colours -> match.
    Raises `ClassifierNotGatedError` if `gate["confirmed"]` is falsy --
    this is the ONE call site every caller should use rather than the
    individual functions above, so the gate can never be skipped by a
    caller forgetting to check it themselves.
    """
    _require_gate(gate)

    character_result = classify_visual_character(image_path, classify_fn=classify_fn)
    dominant_colours = sample_dominant_colours(image_path, n=n_colours)
    suggestion = match_to_shipped_effect(character_result, dominant_colours)

    if suggestion.get("matched_effect") == "surface-treatment":
        suggestion["suggested_attributes"]["fxTreatment"] = _sub_classify_treatment(image_path)

    suggestion["tier4a_gate"] = gate
    return suggestion


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--screenshot", required=True, help="Path to a canvas screenshot PNG/JPG")
    parser.add_argument(
        "--tier4a-confirmed",
        action="store_true",
        help="Simulate a Tier 4a confirmation for standalone testing (bypasses live signal files)",
    )
    parser.add_argument("--signals-json", help="Path to a JSON file matching motion_library_signals' found_signals shape")
    parser.add_argument("--draw-call-json", help="Path to a JSON file matching webgl_draw_call_probe's probe() output")
    parser.add_argument("--colours", type=int, default=3)
    args = parser.parse_args()

    found_signals = None
    draw_call_result = None
    if args.signals_json:
        found_signals = json.loads(Path(args.signals_json).read_text(encoding="utf-8"))
    if args.draw_call_json:
        draw_call_result = json.loads(Path(args.draw_call_json).read_text(encoding="utf-8"))

    if args.tier4a_confirmed:
        gate = {"confirmed": True, "source": "cli-simulated", "reason": "--tier4a-confirmed passed"}
    else:
        gate = check_tier4a_confirmed_webgl(found_signals, draw_call_result)

    try:
        suggestion = build_operator_suggestion(args.screenshot, gate, n_colours=args.colours)
    except ClassifierNotGatedError as exc:
        print(json.dumps({"error": str(exc)}, indent=2))
        return 1

    print(json.dumps(suggestion, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
