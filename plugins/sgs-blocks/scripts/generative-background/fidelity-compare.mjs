/**
 * fidelity-compare.mjs — Task 2 of the fidelity-comparator plan.
 *
 * The driver. Captures BOTH sides (the shipping generative-background engine,
 * via poc-replica.html, and the reference rig, .claude/scratch/stripe-hero-poc/
 * index.html), asserts they are actually comparable, runs the canonical
 * comparator (compare.py) and writes a tracked baseline.
 *
 * ── WHY THE RUNGS EXIST, IN ORDER (fail-closed at each) ─────────────────────
 *   crop — derive the rung-1 crop FIRST, from a matched-settings ours+rig
 *        capture pair, and run the C1 symmetry check on it. Every later rung
 *        (0a/0b/0c/1) uses this SAME box — a box derived once and only used
 *        by the headline rung would let the noise-floor/positive-control
 *        rungs pass over one region while the real number is measured over
 *        another (review finding I8).
 *   0a — determinism floor: rig vs rig, same u_time, SAME settings rung 1
 *        actually measures with (?nopost&blend=off — review finding I7:
 *        determinism of the post-processed/blended path does not establish
 *        determinism of the path under test).
 *   0b — POSITIVE CONTROL: inject a KNOWN +3/255 perturbation on the green
 *        channel of a rig capture and compare against the un-perturbed
 *        original. If compare.py does not report the injected answer, the
 *        comparator is broken and NOTHING after this rung is reported.
 *   0c — discrimination: rig at two different u_time values must differ
 *        materially. Proves ?t= actually reaches the uniform and this driver
 *        is not silently comparing the same cached frame to itself.
 *   1  — geometry + shading: OURS vs the rig, same palette, same u_time,
 *        rig driven at ?nopost&blend=off, both pinned to DPR 1, the SAME
 *        edge-inclusive crop derived above. This is the only rung that can
 *        produce a genuine FIDELITY FAILURE — 0a/0b/0c failing means the
 *        MEASUREMENT APPARATUS is broken, which is a HARNESS ERROR.
 *   2  — the side-by-side for Bean, at full page, BOTH under rung 1's exact
 *        settings AND under the rig's own defaults (clearly labelled —
 *        review finding I6: showing Bean a post-processed/blended rig next
 *        to our no-post engine, when that is not the pair that produced the
 *        headline numbers, makes eye and number disagree for no visible
 *        reason).
 *
 * ── C1 — THE RIG'S HERO COPY IS NOT PART OF THE EFFECT UNDER TEST ───────────
 * The rig renders real hero copy (`.hero__copy` — h1/p/CTA) and a static
 * `<picture>` fallback (`.hero-wave-animation__static`) that poc-replica.html
 * deliberately omits. Both sit inside the rung-1 crop's x-range. This driver
 * hides them AT CAPTURE TIME via page.addStyleTag() (never by editing
 * index.html — that file is ground truth) and blocks the fallback's
 * `images.stripeassets.com` network requests outright, then asserts SYMMETRY:
 * outside the shared canvas box, painted coverage on both sides must be
 * near-zero AND must match — fail-closed if either side has leftover content.
 *
 * ── THE RIG DOES NOT IMPLEMENT THE DEBUG CONTRACT ───────────────────────────
 * It exposes __ready, __diag, __drawAt, __matrices, __tier, __capability and
 * __stop — no __utime, __glstate or __frustum. This driver injects those
 * readbacks at capture time via an addInitScript that wraps
 * HTMLCanvasElement.prototype.getContext BEFORE navigation (injecting after
 * load is too late — the context already exists by then) and stashes the
 * live gl handle on window.__stashedGl. .claude/scratch/stripe-hero-poc/
 * index.html itself is NEVER edited — it is ground truth, and mutating it
 * would make every previously-recorded figure incomparable.
 *
 * The rig's __drawAt(x) IGNORES its argument whenever ?t= is present
 * (index.html:471 sets u_time from the URL, not from drawAt's parameter) —
 * so this driver RELOADS the rig once per sampled u_time rather than calling
 * through repeatedly, which would silently compare the same frame N times.
 *
 * ── preserveDrawingBuffer IS FALSE ON BOTH SIDES ────────────────────────────
 * A gl.readPixels() after the browser has composited the frame reads back
 * all zeros — indistinguishable from a genuinely blank canvas. Every capture
 * in this file uses page.screenshot() (which reads the actual composited
 * pixels, the same technique capture-render.mjs already uses), never a
 * post-hoc gl.readPixels().
 *
 * Usage:
 *   node scripts/generative-background/fidelity-compare.mjs
 *   node scripts/generative-background/fidelity-compare.mjs --self-test
 *
 * Exit codes:
 *   0 — everything passed.
 *   1 — FIDELITY FAILURE: rung 1 measured over threshold. The apparatus
 *       worked; the engines diverge more than the ceiling allows.
 *   2 — HARNESS ERROR: a precondition failed, the comparator itself is
 *       broken (0a/0b/0c), compare.py exited non-zero, or ANY unhandled
 *       rejection anywhere in this file (a top-level main().catch() maps
 *       every uncaught path to this code — never Node's bare default exit 1
 *       for an unhandled rejection, which would misreport a broken harness
 *       as a fidelity result).
 *
 * @package
 */

import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
	serve as serveRoot,
	launchGpuBrowser,
	PAINTED_MIN_COVERAGE,
	PAINTED_MIN_UNIQUE_HUES,
	VIEWPORT,
} from './harness-lib.mjs';

const HERE = fileURLToPath( new URL( '.', import.meta.url ) );
const REPO_ROOT = resolve( HERE, '..', '..', '..', '..' );
const COMPARE_PY = resolve( REPO_ROOT, '.claude/scratch/stripe-hero-poc/perf/compare.py' );
const PYTHON = process.env.SGS_PYTHON || 'python';

const RIG_PATH = '/.claude/scratch/stripe-hero-poc/index.html';
const REPLICA_PATH = '/plugins/sgs-blocks/scripts/generative-background/poc-replica.html';
const PALETTE = 'palette-a';

// ⛔ GROUND COLOUR FIX (this session). poc-replica.html calls
// createGenerativeBackground() with no `groundColour` unless told, which falls
// to generative-background.js's hardcoded DEFAULT_GROUND = [0.98,0.98,0.97].
// Production never actually renders against that constant — a block's own
// fold/disp/glow attributes DO fall through to the same shipping defaults (no
// block.json `default` is declared for any of them, confirmed), but ground
// colour is resolved differently: includes/fx-generative-background.php reads
// the client's theme token (SGS_FX_GENBG_GROUND_TOKENS['light'] = 'surface')
// and writes it as the live `--sgs-genbg-ground` custom property, which
// poc-replica.html never sets because it bypasses fx-generative-background.js
// entirely. theme.json's `surface` token is `#FAF9F6` — resolve it here so
// "ours" renders against what production actually ships, not a coincidental
// near-match. (#FAF9F6 -> 250/255, 249/255, 246/255 — close to, but not
// exactly, the hardcoded default, which is itself worth having proven rather
// than assumed.)
const GROUND_COLOUR = Object.freeze( [ 250 / 255, 249 / 255, 246 / 255 ] );

// ⛔ C1 FIX (2026-08-29) + TIME_SCALE FIX (2026-09-03, D930). The rig SCALES
// u_time INSIDE its shader — shaders/68467.glsl:230,
// `displace(..., u_time * u_speed, ...)` — with u_speed = 4e-5
// (index.html:222, the live light-theme preset `P`). Ours originally used
// u_time RAW with no internal multiplier at all (the C1-era comment here
// said so) — that was ALSO a live production bug (Bean, 2026-09-03: "ours
// is super fast"), not just a measurement-tooling gap. Fixed at the source
// now: `generative-background.js`'s `draw(seconds)` applies its own
// `TIME_SCALE = 0.04` (= 1000 * 4e-5, the reference's ms-to-real-second
// conversion folded in) before upload, so `draw()`'s `seconds` argument now
// means real elapsed seconds, matching its production tick-loop caller.
//
// This driver must therefore convert the OPPOSITE way it used to:
// previously it had to pre-apply RIG_SPEED itself (the engine did no
// scaling); now the engine does the reference-matched scaling internally,
// so this driver only needs a plain ms->seconds unit conversion — the rig's
// raw ?t= values ARE milliseconds (`u_time = timeOffset + seconds*1000`).
// `oursTimeFor(t) = t / 1000` reaches the exact same final u_time as the
// old `t * RIG_SPEED` did, now that the 4e-5-equivalent factor lives inside
// draw() itself instead of being duplicated here.
//
// Values chosen to sit inside the rig's REAL operating range, not an
// arbitrary small number: its runtime (non-?t=) path computes
// `u_time = ACTIVE.timeOffset(17500) + seconds*1000` (index.html P preset +
// the `drawAt()` closure), i.e. effective phase `0.7 + 0.04*seconds` — a
// moment this animation actually occupies. 17500/27500/47500 correspond to
// seconds = 0/10/30 into the loop, giving effective phases 0.70/1.10/1.90 —
// a low-to-high spread of 1.2 units between the first and last sample,
// safely past simplex noise's ~1-unit decorrelation length (deliberate: 0c
// below needs a REAL, unambiguous discrimination signal, not a hair's-
// breadth one).
const RIG_SPEED = 4e-5; // shaders/68467.glsl:230 * index.html:222 (P preset) — kept for precondition-3's effective-phase check below, not for oursTimeFor() any more.
const SAMPLE_TIMES = Object.freeze( [ 17500, 27500, 47500 ] ); // Rig's raw ?t= values.

/**
 * The value to drive the REPLICA with (poc-replica.html's `?t=`, forwarded
 * straight to `draw()`) for a given RIG raw ?t= value, so both sides land
 * on the SAME effective shader phase. See the TIME_SCALE FIX comment above
 * SAMPLE_TIMES for the full derivation — this is now a plain unit
 * conversion (the rig's raw value is milliseconds; `draw()` expects real
 * seconds), not a manual reference-speed multiply.
 *
 * @param {number} rigRawTime The rig's raw ?t= value (milliseconds).
 * @return {number} The value to pass to poc-replica.html's ?t= (seconds).
 */
function oursTimeFor( rigRawTime ) {
	return rigRawTime / 1000;
}

// 0b's positive-control perturbation: +3/255 on the green channel.
const PERTURB_CHANNEL = 1; // R=0, G=1, B=2 in a decoded RGB array.
const PERTURB_DELTA = 3;

// Both pages position the canvas identically (poc-replica.html / index.html
// CSS): .hero__canvas { left:330px; top:0; width:1393px; height:761px; }
// inside a .hero that is itself overflow:hidden and 1440px wide. The canvas
// therefore overflows the hero's right edge (330 + 1393 = 1723 > 1440) and
// is CLIPPED by overflow:hidden — a viewport-sized screenshot only ever
// shows the box from x=330 to the viewport's own right edge, width
// 1440-330=1110, not the canvas element's own 1393. Confirmed live: an
// unclipped box made compare.py exit non-zero with "crop exceeds image".
const CANVAS_BOX = { x: 330, y: 0, width: VIEWPORT.width - 330, height: 761 };
const DPR = 1; // Pinned both sides — a known state divergence otherwise (rig default 2, ours 1.5).

// Painted-geometry thresholds — the SAME numbers capture-render.mjs gates on
// (2% coverage floor, 8 distinct 5-bit-quantised hues floor), now the single
// shared harness-lib.mjs constants (imported above) rather than two
// independently-typed copies. Re-derived here against a saved PNG via
// Python/PIL rather than the live gl buffer, because
// preserveDrawingBuffer:false makes a post-composite gl.readPixels() lie.

// C1 symmetry check: outside the shared canvas box, painted coverage on
// EITHER side must stay under this floor. Anything above it is either the
// rig's hero copy/static-fallback bleeding into the comparison (the exact
// review finding this check exists to catch) or something equally
// unaccounted for on our side.
const NONCANVAS_MAX_COVERAGE = 0.005;

// 0a's noise floor: two rig captures at the same u_time must be visually
// indistinguishable. This is deliberately far tighter than compare.py's own
// 5% convention — it exists to prove "the same frame reads as the same
// frame", not to approve a real divergence.
const DETERMINISM_CEILING_255 = 0.5;

// 0c's discrimination floor — ⛔ C2 FIX (2026-08-29, whole-branch review).
// The PREVIOUS floor (0.01) was derived FROM the value it then approved —
// the review's own words: "a floor derived FROM the observed value" — which
// proves nothing; it was fitted post-hoc to a run that (per C1 above) was
// comparing two frames barely 0.06 phase-units apart, near-static by
// construction. A floor that only has to clear whatever the apparatus
// happens to already produce is not a test.
//
// This floor is PRE-REGISTERED instead — decided from a general, citable
// property of simplex/Perlin-family noise (that it decorrelates over an
// input delta of roughly one grid unit), NOT from anything this specific
// run measures. Unlike 0b (a scalar pixel edit — exactly predictable in
// closed form), an exact point-prediction of the mean_abs two decorrelated
// noise frames produce is NOT tractable without literally re-implementing
// the shader, which would be simulating the system under test rather than
// testing it — stated plainly rather than faked. What IS principled and
// fixed in advance is a floor built from TWO independent, non-fitted
// components, both of which must hold:
//   (a) RELATIVE — at least this many times 0a's OWN measured determinism
//       floor from the SAME run (the ratio is fixed here, before either
//       number exists for a given run);
//   (b) ABSOLUTE — a backstop floor, chosen for being far above PNG's 8-bit
//       encoding granularity and far below any plausible "these still look
//       the same" reading.
// See its use in rung 0c below: `dynamicFloor = max(ABSOLUTE, 0a.mean_abs *
// RATIO)`, computed from 0a's already-measured value, then compared against
// 0c's — never the reverse.
const DISCRIMINATION_FLOOR_RATIO_OVER_0A = 20;
const DISCRIMINATION_FLOOR_ABSOLUTE_255 = 1.0;
const DISCRIMINATION_MIN_WORST_CHANNEL = 8;

// Rung 1's fidelity ceiling. compare.py's own docstring is explicit that its
// printed 5% is "a local convention adopted for this study… not a project
// standard" — there is no other named ceiling anywhere in this project, so
// this driver inherits the SAME number rather than inventing a new one, and
// repeats the same caveat rather than presenting it as authoritative.
const FIDELITY_CEILING_PCT = 5.0;

// A systematic (directional) colour cast is flagged, not silently folded
// into the headline mean — compare.py's own docstring: "1.0 = pure
// systematic error, 0.0 = pure noise". Review finding I4.
const BIAS_OVER_ABS_SYSTEMATIC_FLAG = 0.5;

const RUN_ID = new Date().toISOString().replace( /[:.]/g, '-' ) + '-' + process.pid;
const RUN_DIR = join( HERE, 'runs', RUN_ID );
const BASELINE_PATH = join( HERE, 'fidelity-baseline.json' );

/**
 * Path relative to the repo root, forward-slashed. The tracked baseline must
 * not carry absolute Windows paths (leaks the username, churns the diff on
 * every machine/run — review finding M11).
 *
 * @param {string} p Absolute path.
 * @return {string} Repo-relative, forward-slash path.
 */
function rel( p ) {
	return relative( REPO_ROOT, p ).split( sep ).join( '/' );
}

/**
 * A structural/apparatus failure — a precondition, an environment check, or
 * the comparator itself is broken. Distinct from a FIDELITY FAILURE (a
 * parsed, over-threshold rung-1 number), which is never thrown — it is
 * carried through to the end of the run and reported. See the exit-code
 * table in the header comment.
 */
class HarnessError extends Error {}

/**
 * Serve BOTH trees this comparison needs — plugins/sgs-blocks (the shipping
 * engine + poc-replica.html) and .claude/scratch (the reference rig + its
 * palette PNGs) — from ONE root, because capture-render.mjs's own server
 * roots at plugins/sgs-blocks and 403s anything outside it, which is too
 * narrow for poc-replica.html's palette fetch. This driver OWNS widening
 * that root to REPO_ROOT — the traversal guard against escaping REPO_ROOT is
 * kept, not deleted, per the brief.
 *
 * @return {Promise<{origin: string, close: Function}>} Server handle.
 */
/**
 * Serve BOTH trees this comparison needs — plugins/sgs-blocks (the shipping
 * engine + poc-replica.html) and .claude/scratch (the reference rig + its
 * palette PNGs) — from ONE root, because capture-render.mjs's own server
 * roots at plugins/sgs-blocks and 403s anything outside it, which is too
 * narrow for poc-replica.html's palette fetch. Delegates to harness-lib.mjs's
 * shared `serve()` (extensionless-`.js` resolution ON, matching this file's
 * pre-extraction behaviour exactly) — see that module's header for why this
 * used to be a hand-rolled copy and no longer is (D888).
 *
 * @return {Promise<{origin: string, close: Function}>} Server handle.
 */
function serve() {
	return serveRoot( { root: REPO_ROOT, resolveExtensionless: true } );
}

/*
 * ── Python image-maths helper ────────────────────────────────────────────
 * Kept as ONE inline string, dispatched by subcommand, so this task adds
 * exactly one new file (per the brief) instead of a family of tiny .py
 * scripts. Pillow + numpy are already a hard dependency of compare.py, so
 * this adds no new dependency.
 */
const PY_HELPER = `
import sys, json
from PIL import Image
import numpy as np

cmd = sys.argv[1]

def quantised_keys(arr):
    # arr: HxWx3 uint8-ish array. 5-bit/channel quantisation, same scheme
    # capture-render.mjs's own painted-geometry check uses.
    quant = (arr >> 3).astype(np.int32)
    return (quant[..., 0] << 10) | (quant[..., 1] << 5) | quant[..., 2]

if cmd == 'perturb':
    # perturb <src> <dst> <channel> <delta> <cx> <cy> <cw> <ch>
    # The prediction crop MUST match whatever box compare.py will actually
    # measure -- predicting over the whole image while compare.py measures
    # a crop counts a different pixel population (caught live: predicting
    # over the full 1440x900 frame gave abs~0.30 against a measured ~0.42
    # once compare.py's crop excluded a chunk of near-white background
    # where +3 clips to +0, understating the crop's own clip rate).
    src, dst, ch, delta = sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5])
    cx, cy, cw, ch_h = (int(v) for v in sys.argv[6:10])
    im = Image.open(src).convert('RGB')
    a = np.asarray(im, dtype=np.int16)
    before_full = a[:, :, ch].astype(np.int32)
    after_full = np.clip(before_full + delta, 0, 255)
    a[:, :, ch] = after_full
    Image.fromarray(a.astype('uint8'), 'RGB').save(dst)
    # Predicted analytically from the SAME buffer that produced the write,
    # restricted to the crop compare.py will use, so the comparison below is
    # a genuine prediction-before-run, not a restatement of compare.py's own
    # output over a different pixel population.
    before_crop = before_full[cy:cy + ch_h, cx:cx + cw]
    after_crop = after_full[cy:cy + ch_h, cx:cx + cw]
    diff = after_crop - before_crop
    print(json.dumps({
        'predicted_signed_mean_channel': float(diff.mean()),
        'predicted_abs_mean_over_all_channels': float(np.abs(diff).mean()) / 3.0,
    }))

elif cmd == 'painted':
    # painted <path> <x> <y> <w> <h>
    path = sys.argv[2]
    x, y, w, h = (int(v) for v in sys.argv[3:7])
    region = Image.open(path).convert('RGB').crop((x, y, x + w, y + h))
    arr = np.asarray(region)
    keys = quantised_keys(arr)
    flat = keys.flatten()
    vals, counts = np.unique(flat, return_counts=True)
    dominant = int(counts.max()) if counts.size else 0
    total = int(flat.size)
    print(json.dumps({
        'width': int(region.width), 'height': int(region.height), 'total': total,
        'opaque': total - dominant,
        'coverage': (total - dominant) / total if total else 0.0,
        'unique': int(vals.size),
    }))

elif cmd == 'noncanvas':
    # noncanvas <path> <cx> <cy> <cw> <ch>  -- painted coverage OUTSIDE the
    # given canvas box, across the whole image. C1's symmetry check: after
    # hiding the rig's hero copy/static fallback, nothing should paint
    # outside the shared canvas box on EITHER side.
    path = sys.argv[2]
    cx, cy, cw, ch = (int(v) for v in sys.argv[3:7])
    im = Image.open(path).convert('RGB')
    arr = np.asarray(im)
    mask = np.ones(arr.shape[:2], dtype=bool)
    mask[cy:cy + ch, cx:cx + cw] = False
    region = arr[mask]
    keys = quantised_keys(region)
    vals, counts = np.unique(keys, return_counts=True)
    dominant = int(counts.max()) if counts.size else 0
    total = int(keys.size)
    print(json.dumps({
        'total': total, 'painted': total - dominant,
        'coverage': (total - dominant) / total if total else 0.0,
    }))

elif cmd == 'crop':
    # crop <path1> <path2> <x> <y> <w> <h> <pad>
    p1, p2 = sys.argv[2], sys.argv[3]
    x, y, w, h, pad = (int(v) for v in sys.argv[4:9])

    def bbox(path):
        region = np.asarray(Image.open(path).convert('RGB').crop((x, y, x + w, y + h)), dtype=np.int16)
        keys = quantised_keys(region)
        vals, counts = np.unique(keys, return_counts=True)
        bg_key = vals[np.argmax(counts)]
        ys, xs = np.nonzero(keys != bg_key)
        if xs.size == 0:
            return None
        return (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)

    boxes = [b for b in (bbox(p1), bbox(p2)) if b is not None]
    if not boxes:
        print(json.dumps({'error': 'no painted pixels in either image within the canvas box'}))
        sys.exit(1)
    x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes)
    x1 = max(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
    # Pad OUTWARD (edge-inclusive — DEFAULT_CROP's own documented flaw is
    # that it avoids silhouette edges; this crop deliberately does not),
    # then clip back to the shared canvas box so it never wanders outside it.
    x0f = max(x, x + x0 - pad); y0f = max(y, y + y0 - pad)
    x1f = min(x + w, x + x1 + pad); y1f = min(y + h, y + y1 + pad)
    print(json.dumps({'crop': [x0f, y0f, x1f, y1f]}))

elif cmd == 'maskedmean':
    # maskedmean <ref> <cand> <x> <y> <w> <h>  -- I1 review finding: the
    # crop-wide mean can be diluted by a large chunk of near-saturated
    # background that both sides trivially agree on. This computes a SECOND
    # mean restricted to the UNION of "painted" pixels (pixels that differ
    # from THEIR OWN image's background on either side), plus the background
    # (clip) fraction that gets excluded -- so a diluted headline number is
    # visible instead of silently averaged away.
    ref_path, cand_path = sys.argv[2], sys.argv[3]
    x, y, w, h = (int(v) for v in sys.argv[4:8])

    def painted_mask(path):
        region = np.asarray(Image.open(path).convert('RGB').crop((x, y, x + w, y + h)), dtype=np.int16)
        keys = quantised_keys(region)
        vals, counts = np.unique(keys, return_counts=True)
        bg_key = vals[np.argmax(counts)]
        return keys != bg_key

    ref_im = np.asarray(Image.open(ref_path).convert('RGB').crop((x, y, x + w, y + h)), dtype=np.int16)
    cand_im = np.asarray(Image.open(cand_path).convert('RGB').crop((x, y, x + w, y + h)), dtype=np.int16)
    mask = painted_mask(ref_path) | painted_mask(cand_path)

    total_px = int(mask.size)
    painted_px = int(mask.sum())
    diff = cand_im - ref_im
    if painted_px:
        masked_abs_mean = float(np.abs(diff[mask]).mean())
    else:
        masked_abs_mean = 0.0
    print(json.dumps({
        'total_pixels': total_px,
        'painted_pixels': painted_px,
        'background_fraction': 1.0 - (painted_px / total_px if total_px else 0.0),
        'masked_mean_abs_255': masked_abs_mean,
        'masked_mean_abs_pct': 100.0 * masked_abs_mean / 255.0,
    }))

elif cmd == 'silhouette_iou':
    # silhouette_iou <ref> <cand> <x> <y> <w> <h>  -- SHAPE-ONLY comparison,
    # isolating geometry/twist from colour/shading (D886/D888's leading
    # UNTESTED hypothesis). Each side's PAINTED mask (pixels differing from
    # THAT side's own background, exactly painted_mask()'s logic in
    # 'maskedmean' above) is a pure silhouette -- it says nothing about HUE,
    # only "does the folded ribbon cover this pixel". Intersection-over-union
    # of the two masks is 1.0 for identical silhouettes and falls toward 0.0
    # as they diverge in shape or position, regardless of any colour
    # difference within the overlap. This is deliberately a SEPARATE
    # computation from 'maskedmean' (which unions the two masks and measures
    # colour distance inside the union) -- IoU measures whether the masks
    # occupy the SAME pixels at all, which a colour metric cannot answer:
    # two silhouettes offset by several pixels but identically coloured
    # where they happen to overlap would score near-0% on 'maskedmean' and
    # still fail this check, and that distinction is the whole point of
    # building it.
    ref_path, cand_path = sys.argv[2], sys.argv[3]
    x, y, w, h = (int(v) for v in sys.argv[4:8])

    def painted_mask(path):
        region = np.asarray(Image.open(path).convert('RGB').crop((x, y, x + w, y + h)), dtype=np.int16)
        keys = quantised_keys(region)
        vals, counts = np.unique(keys, return_counts=True)
        bg_key = vals[np.argmax(counts)]
        return keys != bg_key

    ref_mask = painted_mask(ref_path)
    cand_mask = painted_mask(cand_path)
    intersection = int(np.logical_and(ref_mask, cand_mask).sum())
    union = int(np.logical_or(ref_mask, cand_mask).sum())
    print(json.dumps({
        'ref_coverage': float(ref_mask.sum()) / ref_mask.size,
        'cand_coverage': float(cand_mask.sum()) / cand_mask.size,
        'intersection_px': intersection,
        'union_px': union,
        'iou': (intersection / union) if union else 0.0,
    }))

elif cmd == 'gen_solid':
    # gen_solid <path> <w> <h> <r> <g> <b>
    path, w, h = sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
    r, g, b = int(sys.argv[5]), int(sys.argv[6]), int(sys.argv[7])
    Image.new('RGB', (w, h), (r, g, b)).save(path)
    print(json.dumps({'ok': True}))

else:
    print(json.dumps({'error': 'unknown subcommand ' + cmd}))
    sys.exit(1)
`;

/**
 * Run the Python image-maths helper and parse its stdout as JSON.
 *
 * @param {string[]} args Subcommand + positional arguments.
 * @return {Object} Parsed JSON result.
 */
function py( args ) {
	let stdout;
	try {
		stdout = execFileSync( PYTHON, [ '-c', PY_HELPER, ...args ], { encoding: 'utf8' } );
	} catch ( err ) {
		throw new HarnessError(
			`Python image helper failed (${ args[ 0 ] }): ${ err.stderr || err.message }`
		);
	}
	return JSON.parse( stdout.trim().split( '\n' ).pop() );
}

/**
 * SHA-256 of a file's exact bytes.
 *
 * @param {string} path Absolute path.
 * @return {Promise<string>} Hex digest.
 */
async function sha256( path ) {
	return createHash( 'sha256' ).update( await readFile( path ) ).digest( 'hex' );
}

/**
 * Painted-geometry assertion (capture-render.mjs's own check, re-derived
 * against a saved PNG rather than a live gl.readPixels(), which lies under
 * preserveDrawingBuffer:false). Applies to BOTH sides, per precondition 5.
 *
 * @param {string} pngPath Screenshot path.
 * @param {string} side Label for diagnostics ('OURS' or 'RIG').
 * @return {Object} The painted-stats block.
 */
function assertPainted( pngPath, side ) {
	const stats = py( [
		'painted', pngPath,
		String( CANVAS_BOX.x ), String( CANVAS_BOX.y ),
		String( CANVAS_BOX.width ), String( CANVAS_BOX.height ),
	] );
	if ( ! stats.width || ! stats.height ) {
		throw new HarnessError( `${ side }: canvas box has zero area in ${ pngPath }` );
	}
	if ( stats.coverage < PAINTED_MIN_COVERAGE ) {
		throw new HarnessError(
			`${ side }: only ${ ( stats.coverage * 100 ).toFixed( 2 ) }% of the canvas box painted ` +
				`(floor ${ PAINTED_MIN_COVERAGE * 100 }%) in ${ pngPath } — nothing drew.`
		);
	}
	if ( stats.unique < PAINTED_MIN_UNIQUE_HUES ) {
		throw new HarnessError(
			`${ side }: only ${ stats.unique } distinct hues (floor ${ PAINTED_MIN_UNIQUE_HUES }) ` +
				`in ${ pngPath } — this is what a cleared buffer looks like.`
		);
	}
	return stats;
}

/**
 * C1's symmetry check: painted coverage OUTSIDE the shared canvas box must
 * be near-zero on BOTH sides. Catches the rig's hero copy / static-fallback
 * bleeding into the comparison (the review's C1 finding) as well as any
 * equally unaccounted-for content on our own side.
 *
 * @param {string} oursPng
 * @param {string} rigPng
 * @return {Object} { ours, rig, maxCoverage }
 */
function assertNonCanvasSymmetry( oursPng, rigPng ) {
	const args = [ String( CANVAS_BOX.x ), String( CANVAS_BOX.y ), String( CANVAS_BOX.width ), String( CANVAS_BOX.height ) ];
	const ours = py( [ 'noncanvas', oursPng, ...args ] );
	const rig = py( [ 'noncanvas', rigPng, ...args ] );
	console.log(
		`  non-canvas coverage: ours=${ ( ours.coverage * 100 ).toFixed( 3 ) }%, ` +
			`rig=${ ( rig.coverage * 100 ).toFixed( 3 ) }% (floor ${ NONCANVAS_MAX_COVERAGE * 100 }%)`
	);
	if ( ours.coverage > NONCANVAS_MAX_COVERAGE || rig.coverage > NONCANVAS_MAX_COVERAGE ) {
		throw new HarnessError(
			'C1 symmetry check FAILED: painted content exists outside the shared canvas box on ' +
				`${ ours.coverage > NONCANVAS_MAX_COVERAGE ? 'OURS ' : '' }` +
				`${ rig.coverage > NONCANVAS_MAX_COVERAGE ? 'RIG ' : '' }` +
				`(ours=${ ( ours.coverage * 100 ).toFixed( 3 ) }%, rig=${ ( rig.coverage * 100 ).toFixed( 3 ) }%, ` +
				`floor ${ NONCANVAS_MAX_COVERAGE * 100 }%). The rig's hero copy / static-fallback picture ` +
				'may not be hidden — every rung-1 crop containing x<canvas-left would be measuring an ' +
				'unequal DOM, not the effect.'
		);
	}
	return { ours, rig, maxCoverage: NONCANVAS_MAX_COVERAGE };
}

/**
 * Run compare.py and parse its --json output. Never trusts its exit code as
 * a verdict (global constraint 3) — a non-zero exit here means compare.py's
 * OWN sys.exit() paths fired (bad crop, size mismatch, missing deps), which
 * is a HARNESS ERROR, never a fidelity result.
 *
 * @param {Object} opts { ref, cand, crop:[x0,y0,x1,y1], label, jsonOut }
 * @return {Object} Parsed stat block.
 */
function runComparePy( { ref, cand, crop, label, jsonOut } ) {
	try {
		execFileSync(
			PYTHON,
			[ COMPARE_PY, ref, cand, '--crop', crop.join( ',' ), '--label', label, '--json', jsonOut ],
			{ encoding: 'utf8' }
		);
	} catch ( err ) {
		throw new HarnessError(
			`compare.py exited non-zero for "${ label }" — this is a HARNESS ERROR, not a fidelity ` +
				`verdict (compare.py never exits non-zero on a bad COMPARISON, only on a bad INPUT): ` +
				`${ err.stderr || err.message }`
		);
	}
	return JSON.parse( readFileSync( jsonOut, 'utf8' ) );
}

/**
 * Print the full statistical picture compare.py exposes, not just the
 * headline mean — review finding I4. `bias_over_abs` near 1.0 means a
 * directional colour cast (compare.py's own docstring), which the plain
 * mean can hide entirely.
 *
 * @param {Object} stats A parsed compare.py stat block.
 * @param {string} indent Console indent prefix.
 * @return {boolean} True if this result reads as a systematic (not noise) divergence.
 */
function printStatBlock( stats, indent = '    ' ) {
	const s = stats.signed_mean;
	console.log(
		`${ indent }signed_mean: R ${ s.R.toFixed( 2 ) }  G ${ s.G.toFixed( 2 ) }  B ${ s.B.toFixed( 2 ) }` +
			` | bias/abs ${ stats.bias_over_abs.toFixed( 3 ) } | worst channel ${ stats.worst_single_channel_255 }/255`
	);
	console.log(
		`${ indent }within 4/8/16/32: ${ stats.within_pct[ '4' ].toFixed( 1 ) }% / ` +
			`${ stats.within_pct[ '8' ].toFixed( 1 ) }% / ${ stats.within_pct[ '16' ].toFixed( 1 ) }% / ` +
			`${ stats.within_pct[ '32' ].toFixed( 1 ) }%`
	);
	const systematic = stats.bias_over_abs > BIAS_OVER_ABS_SYSTEMATIC_FLAG;
	if ( systematic ) {
		console.log(
			`${ indent }⚠ SYSTEMATIC (bias/abs ${ stats.bias_over_abs.toFixed( 3 ) } > ${ BIAS_OVER_ABS_SYSTEMATIC_FLAG }` +
				`) — a directional colour cast, not noise.`
		);
	}
	return systematic;
}

/**
 * Read the unmasked GPU renderer/vendor + Chromium version — the same
 * provenance shape flip-probe.mjs already establishes.
 *
 * @param {import('playwright').Browser} browser
 * @param {string} origin Server origin (any reachable page will do).
 * @return {Promise<Object>} { gpuRenderer, gpuVendor, chromiumVersion }
 */
async function readEnvironment( browser, origin ) {
	const page = await browser.newPage();
	await page.goto( origin + '/', { waitUntil: 'load' } ).catch( () => {} );
	const gpu = await page.evaluate( () => {
		const c = document.createElement( 'canvas' );
		const gl = c.getContext( 'webgl2' );
		if ( ! gl ) {
			return { renderer: null, vendor: null };
		}
		const ext = gl.getExtension( 'WEBGL_debug_renderer_info' );
		return {
			renderer: ext ? gl.getParameter( ext.UNMASKED_RENDERER_WEBGL ) : gl.getParameter( gl.RENDERER ),
			vendor: ext ? gl.getParameter( ext.UNMASKED_VENDOR_WEBGL ) : gl.getParameter( gl.VENDOR ),
		};
	} );
	await page.close();
	return {
		gpuRenderer: gpu.renderer,
		gpuVendor: gpu.vendor,
		chromiumVersion: browser.version(),
		viewport: VIEWPORT,
		// M9 fix: this used to read window.devicePixelRatio off a page opened
		// with Playwright's DEFAULT device scale factor (1, correct only by
		// coincidence — this probe page never set deviceScaleFactor at all).
		// Every real capture pins DPR via `deviceScaleFactor: DPR` on
		// newPage(); record that pinned constant directly rather than a
		// value that happened to agree with it.
		dpr: DPR,
	};
}

/**
 * Capture OUR side (the shipping engine via poc-replica.html) at one
 * absolute u_time. Asserts __err is unset and applies preconditions 1-5 that
 * apply to this side.
 *
 * @param {import('playwright').Browser} browser
 * @param {string} origin
 * @param {number} t Absolute u_time.
 * @param {string} outPng Where to save the screenshot.
 * @return {Promise<Object>} { glstate, utime, frustum, painted }
 */
async function captureReplica( browser, origin, t, outPng ) {
	const page = await browser.newPage( { viewport: VIEWPORT, deviceScaleFactor: DPR } );
	const problems = [];
	page.on( 'console', ( m ) => {
		if ( m.type() === 'error' ) problems.push( m.text() );
	} );
	page.on( 'pageerror', ( e ) => problems.push( String( e ) ) );

	try {
		await page.goto(
			`${ origin }${ REPLICA_PATH }?t=${ t }&pal=${ PALETTE }&ground=${ GROUND_COLOUR.join( ',' ) }`,
			{ waitUntil: 'load' }
		);
		await page.waitForFunction( () => window.__ready === true, { timeout: 30000 } );

		const err = await page.evaluate( () => window.__err || null );
		if ( err ) {
			throw new HarnessError( `OURS: poc-replica.html reported __err: ${ err }` );
		}

		// Two extra rAF ticks so the deterministic single draw has certainly
		// landed before the screenshot (capture-render.mjs's own settle step).
		await page.evaluate(
			() => new Promise( ( r ) => requestAnimationFrame( () => requestAnimationFrame( r ) ) )
		);

		const glstate = await page.evaluate( () => window.__glstate() );
		const utime = await page.evaluate( () => window.__utime() );
		const frustum = await page.evaluate( () => window.__frustum() );
		if ( glstate === null || utime === null || frustum === null ) {
			throw new HarnessError(
				`OURS: __glstate()/__utime()/__frustum() returned null after __ready — contract violated.`
			);
		}

		await page.screenshot( { path: outPng } );
		const painted = assertPainted( outPng, 'OURS' );

		if ( problems.length ) {
			throw new HarnessError( `OURS: console errors during render: ${ problems.slice( 0, 5 ).join( ' | ' ) }` );
		}

		return { glstate, utime, frustum, painted };
	} finally {
		await page.close();
	}
}

/**
 * Open a rig page with the debug-contract injection wired up BEFORE
 * navigation. Wrapping getContext() after load is too late — the context
 * already exists by then. Also (C1, M12) blocks the static fallback's
 * external image host — the hide-via-CSS below stops it PAINTING, this stops
 * it even being REQUESTED.
 *
 * @param {import('playwright').Browser} browser
 * @return {Promise<{page: import('playwright').Page, problems: string[]}>}
 */
async function newRigPage( browser ) {
	const page = await browser.newPage( { viewport: VIEWPORT, deviceScaleFactor: DPR } );
	await page.addInitScript( () => {
		const orig = HTMLCanvasElement.prototype.getContext;
		window.__stashedGl = null;
		HTMLCanvasElement.prototype.getContext = function ( type, attrs ) {
			const ctx = orig.call( this, type, attrs );
			if ( ( type === 'webgl2' || type === 'webgl' ) && ctx && ! window.__stashedGl ) {
				window.__stashedGl = ctx;
			}
			return ctx;
		};
	} );
	await page.route( '**://images.stripeassets.com/**', ( route ) => route.abort() );
	const problems = [];
	page.on( 'console', ( m ) => {
		// The deliberate abort() above makes Chromium log its own
		// "Failed to load resource: net::ERR_FAILED" browser-level console
		// error for the blocked image — an EXPECTED side effect of M12's own
		// fix, not a page-script problem. Excluding it by text is safe: a
		// real page-script error never produces this exact network-level
		// string, so this cannot mask a genuine failure.
		if ( m.type() === 'error' && ! m.text().includes( 'net::ERR_FAILED' ) ) {
			problems.push( m.text() );
		}
	} );
	page.on( 'pageerror', ( e ) => problems.push( String( e ) ) );
	return { page, problems };
}

/**
 * Capture the RIG at one absolute u_time, reloading fresh (the rig ignores
 * __drawAt's argument whenever ?t= is present, so a loop calling through
 * would silently compare the same frame N times — see the header comment).
 *
 * @param {import('playwright').Browser} browser
 * @param {string} origin
 * @param {number} t Absolute u_time.
 * @param {Object} opts { blendOff, nopost, requireUtime, outPng }
 * @return {Promise<Object>} { glstate, utime, frustum, capability, painted }
 */
async function captureRig( browser, origin, t, { blendOff = false, nopost = false, requireUtime = true, outPng } ) {
	const { page, problems } = await newRigPage( browser );
	try {
		let url = `${ origin }${ RIG_PATH }?static&t=${ t }&pal=${ PALETTE }`;
		if ( nopost ) url += '&nopost';
		if ( blendOff ) url += '&blend=off';

		await page.goto( url, { waitUntil: 'load' } );
		await page.waitForFunction( () => window.__ready === true, { timeout: 30000 } );

		// ⛔ Precondition 1: __ready is true on FOUR paths where the rig drew
		// nothing and REMOVED its canvas. __capability + #c presence are the
		// only reliable signal — a scratch-canvas WebGL probe would not catch
		// these.
		const capability = await page.evaluate( () => window.__capability || null );
		const canvasPresent = await page.evaluate( () => Boolean( document.getElementById( 'c' ) ) );
		if ( ! capability || capability.supported !== true ) {
			throw new HarnessError(
				`RIG: window.__capability reports unsupported/missing at t=${ t }: ${ JSON.stringify( capability ) }`
			);
		}
		if ( ! canvasPresent ) {
			throw new HarnessError(
				`RIG: __ready is true but #c was removed from the DOM at t=${ t } — nothing was drawn.`
			);
		}

		// C1: hide the hero copy + static-fallback picture AT CAPTURE TIME —
		// never by editing index.html, which is ground truth. Both sit
		// entirely outside the canvas element but well inside the rung-1
		// crop's x-range (measured live: line boxes to x=454), so an
		// uncropped or wide crop was comparing unequal DOM, not the effect.
		await page.addStyleTag( {
			content: '.hero__copy, .hero-wave-animation__static { display: none !important; }',
		} );

		// Let the .hero-wave-animation__static fallback's 0.25s opacity
		// transition finish (it starts fading the moment drawAt() lands,
		// which under ?static happens synchronously on load) — otherwise the
		// screenshot can catch it mid-fade, blended over/behind the canvas.
		// Harmless now it is hidden outright, kept as a settle margin for
		// the canvas draw itself.
		await page.waitForTimeout( 300 );

		const glstate = await page.evaluate( () => {
			const gl = window.__stashedGl;
			if ( ! gl ) return null;
			return {
				blend: gl.getParameter( gl.BLEND ),
				blendSrcRGB: gl.getParameter( gl.BLEND_SRC_RGB ),
				blendDstRGB: gl.getParameter( gl.BLEND_DST_RGB ),
				depthTest: gl.getParameter( gl.DEPTH_TEST ),
				cullFace: gl.getParameter( gl.CULL_FACE ),
				unpackFlipY: gl.getParameter( gl.UNPACK_FLIP_Y_WEBGL ),
				contextAttributes: gl.getContextAttributes(),
			};
		} );
		if ( ! glstate ) {
			throw new HarnessError(
				`RIG: could not stash the gl context via the wrapped getContext() at t=${ t }.`
			);
		}

		const utime = await page.evaluate( () => {
			const gl = window.__stashedGl;
			const program = gl.getParameter( gl.CURRENT_PROGRAM );
			if ( ! program ) return null;
			const loc = gl.getUniformLocation( program, 'u_time' );
			if ( ! loc ) return null;
			return gl.getUniform( program, loc );
		} );
		// M10 fix: a null readback (no program bound / no u_time uniform) used
		// to fall through and get compared with `Math.abs(ours.utime - null)`,
		// which coerces null to 0 — so a genuinely broken readback at t=0
		// would silently "match" ours=0 instead of failing closed. Fail here,
		// at the source, rather than downstream where a coercion can hide it.
		// `requireUtime:false` is the ONE deliberate exception: a rig capture
		// under its OWN default settings (post-process ON) leaves the POST
		// shader's program bound after the frame, which has no u_time uniform
		// at all — that capture is rung 2's reference-only "what the rig
		// normally looks like" screenshot, nothing is ever compared against
		// its utime, so failing closed here would block a legitimate capture
		// for no comparison this driver ever makes.
		if ( utime === null && requireUtime ) {
			throw new HarnessError(
				`RIG: could not read the live u_time uniform at t=${ t } — no program bound, or the ` +
					`uniform was optimised out. A null here must never silently coerce to 0 in a later ` +
					'comparison.'
			);
		}

		const frustum = await page.evaluate( () => {
			const c = document.getElementById( 'c' );
			const gl = window.__stashedGl;
			return {
				cssWidth: c.clientWidth,
				cssHeight: c.clientHeight,
				backingWidth: gl.drawingBufferWidth,
				backingHeight: gl.drawingBufferHeight,
			};
		} );

		await page.screenshot( { path: outPng } );
		const painted = assertPainted( outPng, 'RIG' );

		if ( problems.length ) {
			throw new HarnessError( `RIG: console errors during render: ${ problems.slice( 0, 5 ).join( ' | ' ) }` );
		}

		return { glstate, utime, frustum, capability, painted };
	} finally {
		await page.close();
	}
}

/**
 * Compare glstate between the two sides against the declared known-
 * divergence allowlist (precondition 2). STRICT fields must match exactly;
 * ALLOWLISTED fields may diverge but are printed with the result;
 * contextAttributes is informational only (context-creation plumbing, not
 * named in the known-divergence table, and not gated).
 *
 * @param {Object} ours
 * @param {Object} rig
 * @return {Object} { ok, strictMismatches, declaredDivergences }
 */
function compareGlstate( ours, rig ) {
	const STRICT = [ 'depthTest', 'unpackFlipY', 'cullFace' ];
	const ALLOWLISTED = [ 'blend', 'blendSrcRGB', 'blendDstRGB' ];
	const strictMismatches = [];
	for ( const field of STRICT ) {
		if ( ours[ field ] !== rig[ field ] ) {
			strictMismatches.push( { field, ours: ours[ field ], rig: rig[ field ] } );
		}
	}
	const declaredDivergences = [];
	for ( const field of ALLOWLISTED ) {
		if ( ours[ field ] !== rig[ field ] ) {
			declaredDivergences.push( {
				field,
				ours: ours[ field ],
				rig: rig[ field ],
				// PROVEN INERT, not merely accepted — verified against the actual
				// shader source (the live light-theme fragment, shaders/39798.glsl,
				// the module MANIFEST.md names as "THE live fragment shader"):
				// line 313 sets `vec4 color = vec4(surfaceColor(...), 1.0)` (alpha
				// literal 1.0); line 319 adds a SCALAR `(1.0 - pdy) * 0.25` to the
				// whole vec4 (pdy clamped to [0,1] beforehand, so this term is in
				// [0, 0.25]), which broadcasts onto alpha too — pushing pre-clamp
				// alpha into [1.0, 1.25]; line 320 `gl_FragColor = clamp(color, 0.0,
				// 1.0)` then saturates every component, including alpha, back to
				// EXACTLY 1.0 for every possible pdy. With SRC_ALPHA(770)/
				// ONE_MINUS_SRC_ALPHA(771) — THREE's default alpha blend, which is
				// what ?blend=off leaves standing once the CUSTOM squaring blend is
				// removed — and alpha identically 1.0, the blend equation reduces to
				// `result = src*1 + dst*(1-1) = src`: a mathematical no-op. Ours
				// never enabling gl.BLEND at all therefore produces the IDENTICAL
				// pixel result as the rig's still-enabled-but-inert blend state.
				// This is provably not a source of the rung-1 divergence, not merely
				// an accepted gap — see shaders/39798.glsl:313,319,320.
				reason:
					'PROVEN INERT, not merely accepted (shaders/39798.glsl, the live light-theme ' +
					'fragment shader, lines 313/319/320): color.a is clamped to exactly 1.0 for every ' +
					'possible pdy value, so SRC_ALPHA/ONE_MINUS_SRC_ALPHA reduces to result=src*1+dst*0=' +
					'src — a mathematical no-op. Ours never enabling gl.BLEND at all therefore produces ' +
					'the identical pixel result.',
			} );
		}
	}
	return { ok: strictMismatches.length === 0, strictMismatches, declaredDivergences };
}

/**
 * Compare frustum dimensions between the two sides (precondition 4).
 *
 * @param {Object} ours { cssWidth, cssHeight, backingWidth, backingHeight, ... }
 * @param {Object} rig { cssWidth, cssHeight, backingWidth, backingHeight }
 * @return {Object} { ok, mismatches }
 */
function compareFrustum( ours, rig ) {
	const FIELDS = [ 'cssWidth', 'cssHeight', 'backingWidth', 'backingHeight' ];
	const mismatches = [];
	for ( const field of FIELDS ) {
		if ( Math.abs( ours[ field ] - rig[ field ] ) > 0.5 ) {
			mismatches.push( { field, ours: ours[ field ], rig: rig[ field ] } );
		}
	}
	return { ok: mismatches.length === 0, mismatches };
}

/**
 * --self-test: feed the comparator two DELIBERATELY different PNGs (solid
 * red vs solid blue — as different as two same-sized images can be) and
 * assert compare.py reports a large number. Without this, the day the
 * comparator starts comparing a file against itself it returns 0.0% and
 * everyone celebrates.
 *
 * The self-test's own exit code mirrors what the REAL rung-1 threshold
 * check would produce for this measured result: a genuinely large
 * divergence classifies as a FIDELITY FAILURE (exit 1) under this driver's
 * own threshold logic, which is exactly what this self-test exists to
 * prove is still true. A broken comparator (or a broken self-test
 * assertion) exits 2, the same HARNESS ERROR code the rest of this file
 * uses for "the apparatus itself cannot be trusted" — including, per C2's
 * fix, any exception that propagates OUT of this function uncaught: there
 * is no local try/catch here on purpose, so a HarnessError from py() or
 * runComparePy() falls through to main()'s top-level `.catch()`, which maps
 * it to exit 2 rather than Node's bare default (an unhandled rejection
 * exits 1 on Node 24, which would have falsely read as "the comparator
 * detected a large difference" instead of "the comparator itself crashed").
 *
 * @return {Promise<void>}
 */
async function selfTest() {
	await mkdir( RUN_DIR, { recursive: true } );
	const redPng = join( RUN_DIR, 'self-test-red.png' );
	const bluePng = join( RUN_DIR, 'self-test-blue.png' );
	py( [ 'gen_solid', redPng, '64', '64', '255', '0', '0' ] );
	py( [ 'gen_solid', bluePng, '64', '64', '0', '0', '255' ] );

	const jsonOut = join( RUN_DIR, 'self-test-compare.json' );
	const result = runComparePy( {
		ref: redPng,
		cand: bluePng,
		crop: [ 0, 0, 64, 64 ],
		label: 'self-test (red vs blue — must read as a large difference)',
		jsonOut,
	} );

	console.log( 'SELF-TEST: red (255,0,0) vs blue (0,0,255), full 64x64, no crop offset.' );
	console.log( `  mean_abs_255 = ${ result.mean_abs_255.toFixed( 2 ) } (${ result.mean_abs_pct.toFixed( 1 ) }%)` );

	// Predicted analytically: every pixel diverges by |255-0| + |0-0| + |0-255|
	// = 510 across R+B, 0 on G → mean_abs (averaged over R,G,B) = 510/3 = 170.
	const PREDICTED_MEAN_ABS = 170.0;
	const withinTolerance = Math.abs( result.mean_abs_255 - PREDICTED_MEAN_ABS ) < 0.5;
	const isLarge = result.mean_abs_pct > 20; // Nowhere near a real 5% ceiling — deliberately unmissable.
	const wouldFailRung1 = result.mean_abs_pct >= FIDELITY_CEILING_PCT;

	if ( ! withinTolerance ) {
		console.error(
			`SELF-TEST FAILED: predicted mean_abs_255≈${ PREDICTED_MEAN_ABS }, measured ${ result.mean_abs_255 }.`
		);
		process.exit( 2 );
	}
	if ( ! isLarge || ! wouldFailRung1 ) {
		console.error(
			'SELF-TEST FAILED: the comparator did not report a large, over-ceiling difference for ' +
				'two maximally-different images. THE COMPARATOR IS BROKEN — do not trust any other rung.'
		);
		process.exit( 2 );
	}

	// I5 FIX (2026-08-29, whole-branch review): this used to exit 1 on
	// SUCCESS, on the theory that "1" mirrors what a real rung-1 FIDELITY
	// FAILURE would report. In practice that means no caller can assert
	// "the self-test passed" by checking the exit code — 1 is indistinguish-
	// able from a broken comparator by every normal convention (`echo $?`,
	// CI step success, `&&` chaining). The classification the self-test
	// exists to prove ("this WOULD read as a FIDELITY FAILURE under real
	// rung-1 logic") is still asserted above via `wouldFailRung1` — it is
	// now recorded in the assertion, not encoded in the process exit code.
	// Exit 0 = self-test passed. Exit 2 = the comparator itself is broken
	// (same HARNESS ERROR code used everywhere else in this file).
	console.log(
		'SELF-TEST PASSED: the comparator correctly reports a large, over-ceiling difference, and ' +
			'internally classifies it as a FIDELITY FAILURE under real rung-1 logic (wouldFailRung1=' +
			`${ wouldFailRung1 }). Exiting 0 — the self-test itself succeeded.`
	);
	process.exit( 0 );
}

async function main() {
	if ( process.argv.includes( '--self-test' ) ) {
		await selfTest();
		return;
	}

	// C2 fix: mkdir/serve/launch now sit INSIDE the try, and browser/site are
	// closed exactly once, in a `finally`, regardless of where a failure
	// happens — previously they sat outside the try, so a rejection from any
	// of them (or the two `browser.close()`/`site.close()` calls after the
	// try) became an UNHANDLED REJECTION with no local handling, which Node
	// 24 exits 1 for — indistinguishable from a genuine FIDELITY FAILURE.
	let site = null;
	let browser = null;
	let fidelityFailed = false;
	let harnessError = null;
	const baseline = {
		generatedAt: new Date().toISOString(),
		runDir: rel( RUN_DIR ),
		sampleTimes: SAMPLE_TIMES,
		perturbControl: { channel: 'G', delta: PERTURB_DELTA },
		canvasBox: CANVAS_BOX,
		fidelityCeilingPct: FIDELITY_CEILING_PCT,
		fidelityCeilingNote:
			'Inherited from compare.py\'s own printed convention. Its docstring states this is a ' +
				'local convention with no derivation and no precedent elsewhere in this project — ' +
				'repeated here rather than presented as an official standard.',
		environment: null,
		rungs: {},
		acceptedDeltas: [],
	};

	try {
		await mkdir( RUN_DIR, { recursive: true } );
		site = await serve();
		browser = await launchGpuBrowser( chromium );

		const webglOk = await ( async () => {
			const p = await browser.newPage();
			const ok = await p.evaluate( () => Boolean( document.createElement( 'canvas' ).getContext( 'webgl2' ) ) );
			await p.close();
			return ok;
		} )();
		if ( ! webglOk ) {
			throw new HarnessError(
				'headless Chromium has no WebGL2 — the GPU flags did not apply. Every downstream ' +
					'result from this run would be vacuous.'
			);
		}

		baseline.environment = await readEnvironment( browser, site.origin );

		// ── Environment-vs-baseline banner ──────────────────────────────────
		if ( existsSync( BASELINE_PATH ) ) {
			try {
				const prev = JSON.parse( readFileSync( BASELINE_PATH, 'utf8' ) );
				const prevEnv = prev.environment || {};
				const curEnv = baseline.environment;
				const diffFields = [ 'gpuRenderer', 'gpuVendor', 'chromiumVersion', 'dpr' ].filter(
					( f ) => prevEnv[ f ] !== curEnv[ f ]
				);
				if ( diffFields.length ) {
					console.log(
						'\n' + '!'.repeat( 78 ) + '\n' +
							'! ENVIRONMENT CHANGED SINCE THE LAST RECORDED BASELINE.\n' +
							diffFields
								.map( ( f ) => `!   ${ f }: was "${ prevEnv[ f ] }", now "${ curEnv[ f ] }"` )
								.join( '\n' ) +
							'\n! Figures below are NOT directly comparable to the previous baseline.\n' +
							'!'.repeat( 78 ) + '\n'
					);
				}
			} catch {
				console.log( 'NOTE: could not parse the existing baseline to compare environments.' );
			}
		}

		const t0 = SAMPLE_TIMES[ 0 ];
		const tHi = SAMPLE_TIMES[ SAMPLE_TIMES.length - 1 ];
		// I7: every rig capture from here on uses rung 1's REAL measured
		// settings — the post-processed/blended path's determinism does not
		// establish the nopost/blend-off path's determinism.
		const MATCHED = { blendOff: true, nopost: true };

		// ── Step 0 — derive the ONE crop every rung shares, + the C1 symmetry
		//    check (I8: a crop derived from rung 1 alone and never fed back to
		//    0a/0b/0c would let the noise-floor/positive-control rungs pass
		//    over one region while the headline measures another) ───────────
		console.log( '\n── Deriving the shared crop + running the C1 symmetry check ──' );
		const deriveOursPng = join( RUN_DIR, 'derive-ours.png' );
		const deriveRigPng = join( RUN_DIR, 'derive-rig.png' ); // Reused as 0a/0b/0c's t0 rig capture.
		// oursTimeFor(t0), not t0 — see the C1 fix comment above SAMPLE_TIMES.
		await captureReplica( browser, site.origin, oursTimeFor( t0 ), deriveOursPng );
		await captureRig( browser, site.origin, t0, { ...MATCHED, outPng: deriveRigPng } );

		const symmetry = assertNonCanvasSymmetry( deriveOursPng, deriveRigPng );
		baseline.nonCanvasSymmetry = symmetry;

		const derivedCrop = py( [
			'crop', deriveOursPng, deriveRigPng,
			String( CANVAS_BOX.x ), String( CANVAS_BOX.y ),
			String( CANVAS_BOX.width ), String( CANVAS_BOX.height ),
			'24', // 24px outward pad — edge-inclusive, not edge-tight.
		] );
		if ( derivedCrop.error ) {
			throw new HarnessError( `Could not derive the shared crop — ${ derivedCrop.error }` );
		}
		const cropBox = derivedCrop.crop;
		const cropDerivation =
			'Union of the painted-pixel bounding boxes (both sides, background = the modal ' +
				'5-bit-quantised colour within the shared canvas box) at the FIRST sampled u_time, both ' +
				'sides captured under rung 1\'s exact settings, padded 24px outward on every side and ' +
				'clipped back to the canvas box. Padding outward — rather than the tight bbox — is ' +
				'deliberate: our known defect class is edges, and DEFAULT_CROP\'s own documented flaw is ' +
				'that it avoids exactly those. This SAME box is reused for 0a/0b/0c and rung 1 — never a ' +
				'per-rung crop.';
		baseline.crop = cropBox;
		baseline.cropDerivation = cropDerivation;
		console.log( `  crop = [${ cropBox.join( ', ' ) }]` );

		// ── Rung 0a — determinism floor ─────────────────────────────────────
		console.log( '\n── Rung 0a: determinism floor (rig vs rig, matched settings, same u_time) ──' );
		const rigA1Png = deriveRigPng;
		const rigA1Sha = await sha256( rigA1Png );
		const rigA2Png = join( RUN_DIR, '0a-rig-2.png' );
		await captureRig( browser, site.origin, t0, { ...MATCHED, outPng: rigA2Png } );
		const rigA2Sha = await sha256( rigA2Png );

		const cmp0a = runComparePy( {
			ref: rigA1Png,
			cand: rigA2Png,
			crop: cropBox,
			label: '0a determinism floor',
			jsonOut: join( RUN_DIR, '0a-compare.json' ),
		} );
		console.log( `  mean_abs_255 = ${ cmp0a.mean_abs_255.toFixed( 3 ) } (ceiling ${ DETERMINISM_CEILING_255 })` );
		printStatBlock( cmp0a );
		if ( cmp0a.mean_abs_255 > DETERMINISM_CEILING_255 ) {
			throw new HarnessError(
				`Rung 0a FAILED: two rig captures at the identical u_time=${ t0 } differ by ` +
					`${ cmp0a.mean_abs_255.toFixed( 3 ) }/255, over the ${ DETERMINISM_CEILING_255 } noise-floor ` +
					`ceiling. The capture apparatus is not deterministic — no other rung can be trusted.`
			);
		}
		baseline.rungs[ '0a_determinism' ] = {
			uTime: t0,
			measuredWith: MATCHED,
			refSha256: rigA1Sha,
			candSha256: rigA2Sha,
			stats: cmp0a,
			ceiling255: DETERMINISM_CEILING_255,
			passed: true,
		};

		// ── Rung 0b — positive control ──────────────────────────────────────
		console.log( '\n── Rung 0b: POSITIVE CONTROL (+3/255 on G, injected into a rig capture) ──' );
		const perturbedPng = join( RUN_DIR, '0b-rig-perturbed.png' );
		const [ cx0, cy0, cx1, cy1 ] = cropBox;
		const predicted = py( [
			'perturb', rigA1Png, perturbedPng, String( PERTURB_CHANNEL ), String( PERTURB_DELTA ),
			String( cx0 ), String( cy0 ), String( cx1 - cx0 ), String( cy1 - cy0 ),
		] );
		console.log(
			`  PREDICTED (computed before compare.py runs): abs≈${ predicted.predicted_abs_mean_over_all_channels.toFixed( 3 ) }, ` +
				`signed G≈+${ predicted.predicted_signed_mean_channel.toFixed( 3 ) }`
		);

		const cmp0b = runComparePy( {
			ref: rigA1Png,
			cand: perturbedPng,
			crop: cropBox,
			label: '0b positive control (+3/255 on G)',
			jsonOut: join( RUN_DIR, '0b-compare.json' ),
		} );
		console.log(
			`  MEASURED: mean_abs_255=${ cmp0b.mean_abs_255.toFixed( 3 ) }, ` +
				`signed_mean.G=${ cmp0b.signed_mean.G.toFixed( 3 ) }, ` +
				`signed_mean.R=${ cmp0b.signed_mean.R.toFixed( 3 ) }, signed_mean.B=${ cmp0b.signed_mean.B.toFixed( 3 ) }`
		);

		const TOLERANCE = 0.05;
		const abs0bOk = Math.abs( cmp0b.mean_abs_255 - predicted.predicted_abs_mean_over_all_channels ) < TOLERANCE;
		const signedGOk =
			Math.abs( cmp0b.signed_mean.G - predicted.predicted_signed_mean_channel ) < TOLERANCE;
		const otherChannelsQuiet = Math.abs( cmp0b.signed_mean.R ) < 0.1 && Math.abs( cmp0b.signed_mean.B ) < 0.1;
		if ( ! abs0bOk || ! signedGOk || ! otherChannelsQuiet ) {
			throw new HarnessError(
				'Rung 0b FAILED: compare.py did not return the injected +3/255 green-channel answer ' +
					'(predicted vs measured diverge beyond tolerance, or R/B moved when only G was ' +
					'perturbed). THE COMPARATOR IS BROKEN — no other rung is reported.'
			);
		}
		baseline.rungs[ '0b_positive_control' ] = {
			uTime: t0,
			measuredWith: MATCHED,
			refSha256: rigA1Sha,
			candSha256: await sha256( perturbedPng ),
			predicted,
			measured: cmp0b,
			tolerance: TOLERANCE,
			passed: true,
		};

		// ── Rung 0c — discrimination ─────────────────────────────────────────
		console.log( '\n── Rung 0c: discrimination (rig, two different u_time values, matched settings) ──' );
		const rigC1Png = rigA1Png; // Reuse the crop-derivation step's t0 capture — same settings.
		const rigC1Sha = rigA1Sha;
		const rigC2Png = join( RUN_DIR, '0c-rig-hi.png' );
		await captureRig( browser, site.origin, tHi, { ...MATCHED, outPng: rigC2Png } );
		const rigC2Sha = await sha256( rigC2Png );

		const cmp0c = runComparePy( {
			ref: rigC1Png,
			cand: rigC2Png,
			crop: cropBox,
			label: `0c discrimination (u_time=${ t0 } vs u_time=${ tHi })`,
			jsonOut: join( RUN_DIR, '0c-compare.json' ),
		} );

		// Pre-registered floor, computed from 0a's ALREADY-MEASURED value
		// (never the reverse) — see the DISCRIMINATION_FLOOR_* comment above
		// for the full derivation. Printed BEFORE the measured comparison
		// below, in the same "predict, then compare" order 0b uses.
		const dynamicFloor255 = Math.max(
			DISCRIMINATION_FLOOR_ABSOLUTE_255,
			cmp0a.mean_abs_255 * DISCRIMINATION_FLOOR_RATIO_OVER_0A
		);
		console.log(
			`  PRE-REGISTERED FLOOR (from 0a=${ cmp0a.mean_abs_255.toFixed( 3 ) }, before this rung's own ` +
				`number is looked at): max(${ DISCRIMINATION_FLOOR_ABSOLUTE_255 }, 0a×${ DISCRIMINATION_FLOOR_RATIO_OVER_0A }) ` +
				`= ${ dynamicFloor255.toFixed( 3 ) }`
		);
		console.log( `  mean_abs_255 = ${ cmp0c.mean_abs_255.toFixed( 3 ) }` );
		printStatBlock( cmp0c );

		// I5: the two strongest signals 0c already had access to and ignored.
		if ( rigC1Sha === rigC2Sha ) {
			throw new HarnessError(
				`Rung 0c FAILED: the two captures (u_time=${ t0 } and u_time=${ tHi }) are BYTE-IDENTICAL ` +
					'(same SHA-256) — ?t= is not reaching the uniform, or the capture is cached.'
			);
		}
		if ( cmp0c.worst_single_channel_255 < DISCRIMINATION_MIN_WORST_CHANNEL ) {
			throw new HarnessError(
				`Rung 0c FAILED: worst_single_channel_255=${ cmp0c.worst_single_channel_255 }, under the ` +
					`${ DISCRIMINATION_MIN_WORST_CHANNEL } floor — the mean alone could be cleared by a ` +
					'single stray pixel; this checks a real per-pixel divergence exists.'
			);
		}
		if ( cmp0c.mean_abs_255 < dynamicFloor255 ) {
			throw new HarnessError(
				`Rung 0c FAILED: rig captures at u_time=${ t0 } and u_time=${ tHi } differ by only ` +
					`${ cmp0c.mean_abs_255.toFixed( 3 ) }/255, under the pre-registered floor ` +
					`${ dynamicFloor255.toFixed( 3 ) }. ?t= may not be reaching the uniform, the sampled ` +
					`effective phases may not be far enough apart to decorrelate, or captures are being ` +
					`cached/compared against the same frame.`
			);
		}
		baseline.rungs[ '0c_discrimination' ] = {
			uTimeLow: t0,
			uTimeHigh: tHi,
			measuredWith: MATCHED,
			refSha256: rigC1Sha,
			candSha256: rigC2Sha,
			stats: cmp0c,
			floorDerivation: {
				ratioOver0a: DISCRIMINATION_FLOOR_RATIO_OVER_0A,
				absolute255: DISCRIMINATION_FLOOR_ABSOLUTE_255,
				zeroADeterminism255: cmp0a.mean_abs_255,
				dynamicFloor255,
				note: 'Pre-registered from 0a\'s own measured value and simplex noise\'s known ' +
					'~1-unit decorrelation length — NOT fitted to this rung\'s own measured mean_abs_255.',
			},
			minWorstChannel255: DISCRIMINATION_MIN_WORST_CHANNEL,
			passed: true,
		};

		// ── Rung 1 — geometry + shading, per sampled u_time ──────────────────
		console.log( '\n── Rung 1: geometry + shading (ours vs rig, per sampled u_time) ──' );
		const rung1 = { perTime: {}, crop: cropBox, cropDerivation, measuredWith: { ...MATCHED, dpr: DPR } };

		for ( const t of SAMPLE_TIMES ) {
			console.log( `  u_time=${ t }` );
			const oursPng = join( RUN_DIR, `1-ours-t${ t }.png` );
			const rigPng = join( RUN_DIR, `1-rig-t${ t }.png` );

			const ours = await captureReplica( browser, site.origin, oursTimeFor( t ), oursPng );
			const rig = await captureRig( browser, site.origin, t, { ...MATCHED, outPng: rigPng } );

			// Precondition 2 — glstate, allowlisted divergences only.
			const glCmp = compareGlstate( ours.glstate, rig.glstate );
			if ( ! glCmp.ok ) {
				throw new HarnessError(
					`Rung 1 (t=${ t }) FAILED precondition 2: gl state diverges outside the declared ` +
						`allowlist: ${ JSON.stringify( glCmp.strictMismatches ) }`
				);
			}

			// ⛔ C1 FIX — precondition 3 used to compare the RAW uniforms
			// (`ours.utime === rig.utime`), which passed even when the two
			// engines were 25,000x apart in EFFECTIVE phase, because ours has
			// no internal speed multiplier and the rig's shader does
			// (u_time * u_speed, RIG_SPEED=4e-5 — see the SAMPLE_TIMES
			// comment). The comparison now converts both to the phase that
			// actually reaches the noise function: ours.utime is already the
			// effective phase (we drove it with oursTimeFor(t) = t*RIG_SPEED,
			// and our shader uses u_time raw); rig.utime is the RIG's raw
			// uniform, so it must be multiplied by RIG_SPEED here to reach
			// the same footing.
			const oursEffectivePhase = ours.utime;
			const rigEffectivePhase = rig.utime * RIG_SPEED;
			if ( Math.abs( oursEffectivePhase - rigEffectivePhase ) > 1e-6 ) {
				throw new HarnessError(
					`Rung 1 (t=${ t }) FAILED precondition 3 (EFFECTIVE PHASE, not raw uniform): ` +
						`ours=${ oursEffectivePhase }, rig=${ rig.utime }×${ RIG_SPEED }=${ rigEffectivePhase }.`
				);
			}

			// Precondition 4 — frustum.
			const frCmp = compareFrustum( ours.frustum, rig.frustum );
			if ( ! frCmp.ok ) {
				throw new HarnessError(
					`Rung 1 (t=${ t }) FAILED precondition 4: frustum mismatch: ${ JSON.stringify( frCmp.mismatches ) }`
				);
			}

			const cmp1 = runComparePy( {
				ref: rigPng,
				cand: oursPng,
				crop: cropBox,
				label: `rung 1 (t=${ t })`,
				jsonOut: join( RUN_DIR, `1-compare-t${ t }.json` ),
			} );
			console.log(
				`    mean_abs_pct=${ cmp1.mean_abs_pct.toFixed( 2 ) }% (ceiling ${ FIDELITY_CEILING_PCT }%)`
			);
			const systematic = printStatBlock( cmp1 );

			// I1: the crop-wide mean can be diluted by a large agreeing
			// (near-saturated) background block. Report a SECOND,
			// background-excluded mean alongside it.
			const masked = py( [
				'maskedmean', rigPng, oursPng,
				String( cropBox[ 0 ] ), String( cropBox[ 1 ] ),
				String( cropBox[ 2 ] - cropBox[ 0 ] ), String( cropBox[ 3 ] - cropBox[ 1 ] ),
			] );
			console.log(
				`    masked (painted-only) mean_abs_pct=${ masked.masked_mean_abs_pct.toFixed( 2 ) }% ` +
					`(background/clip fraction: ${ ( masked.background_fraction * 100 ).toFixed( 1 ) }%)`
			);

			// SILHOUETTE-ONLY (shape, not colour) — the D886/D888 leading
			// UNTESTED hypothesis, tested directly rather than inferred from
			// bias_over_abs. Reuses the two PNGs already captured for this
			// rung; no new render mode, no shader change (a shader edit is a
			// higher-blast-radius change than this diagnostic needs to earn
			// first — see the plan's Step 3).
			const silhouette = py( [
				'silhouette_iou', rigPng, oursPng,
				String( cropBox[ 0 ] ), String( cropBox[ 1 ] ),
				String( cropBox[ 2 ] - cropBox[ 0 ] ), String( cropBox[ 3 ] - cropBox[ 1 ] ),
			] );
			console.log(
				`    silhouette IoU=${ silhouette.iou.toFixed( 3 ) } ` +
					`(rig coverage ${ ( silhouette.ref_coverage * 100 ).toFixed( 1 ) }%, ` +
					`ours coverage ${ ( silhouette.cand_coverage * 100 ).toFixed( 1 ) }%)`
			);

			const underCeiling = cmp1.mean_abs_pct < FIDELITY_CEILING_PCT;
			if ( ! underCeiling ) {
				fidelityFailed = true;
			}

			rung1.perTime[ String( t ) ] = {
				oursSha256: await sha256( oursPng ),
				rigSha256: await sha256( rigPng ),
				glstate: { ours: ours.glstate, rig: rig.glstate, declaredDivergences: glCmp.declaredDivergences },
				utime: { ours: ours.utime, rig: rig.utime, oursEffectivePhase, rigEffectivePhase },
				frustum: { ours: ours.frustum, rig: rig.frustum },
				painted: { ours: ours.painted, rig: rig.painted },
				stats: cmp1,
				maskedStats: masked,
				silhouette,
				underCeiling,
				systematicBias: systematic,
			};
		}

		rung1.paletteSha256 = await sha256(
			resolve( REPO_ROOT, '.claude/scratch/stripe-hero-poc/assets', `${ PALETTE }.png` )
		);
		baseline.rungs[ '1_geometry_shading' ] = rung1;

		baseline.acceptedDeltas.push( {
			rung: '1_geometry_shading',
			field: 'gl BLEND / BLEND_SRC_RGB / BLEND_DST_RGB',
			threshold: 'not gated — printed alongside every rung-1 result',
			date: '2026-08-29',
			reason:
				'PROVEN INERT, not merely accepted (verified against shaders/39798.glsl, the light-theme ' +
					'fragment shader): color.a is clamped to exactly 1.0 for every possible input (see the ' +
					'full derivation in compareGlstate()\'s own comment). SRC_ALPHA/ONE_MINUS_SRC_ALPHA with ' +
					'alpha≡1 is a mathematical no-op, so the rig retaining standard alpha blending even at ' +
					'?blend=off cannot be a source of the rung-1 divergence.',
		} );
		baseline.acceptedDeltas.push( {
			rung: '0a_determinism / 0b_positive_control / 0c_discrimination / 1_geometry_shading',
			field: 'rig query flag: nopost',
			threshold: 'not gated — printed via measuredWith on every rung',
			date: '2026-08-29',
			reason:
				'The brief specified only ?blend=off for rung 1; this driver also drives ?nopost so the ' +
					'measured path skips the rig\'s angular-blur+grain post-process pass entirely (our engine ' +
					'has no equivalent pass). Declared here per review finding I6, applied consistently to ' +
					'every rung (I7) rather than only the headline.',
		} );

		// ── Rung 2 — the side-by-side, no number, BOTH settings clearly
		//    labelled (I6: showing Bean the rig's DEFAULT (post+blend) render
		//    next to our no-post engine would be a different pair from the
		//    one that produced the percentages above, with no way to tell) ──
		console.log( '\n── Rung 2: side-by-side (full page, for Bean) ──' );
		const sideOursPng = join( RUN_DIR, '2-side-by-side-ours.png' );
		const sideRigMatchedPng = join( RUN_DIR, '2-side-by-side-rig-matched.png' );
		const sideRigDefaultPng = join( RUN_DIR, '2-side-by-side-rig-default.png' );
		await captureReplica( browser, site.origin, oursTimeFor( t0 ), sideOursPng );
		await captureRig( browser, site.origin, t0, { ...MATCHED, outPng: sideRigMatchedPng } );
		// requireUtime:false — the post shader is bound last under default
		// settings, which has no u_time uniform; nothing compares against
		// this capture's utime, so failing closed on that readback would
		// block a legitimate reference-only screenshot for no reason.
		await captureRig( browser, site.origin, t0, { requireUtime: false, outPng: sideRigDefaultPng } );
		baseline.rungs[ '2_side_by_side' ] = {
			uTime: t0,
			ours: rel( sideOursPng ),
			rigMatched: {
				path: rel( sideRigMatchedPng ),
				settings: MATCHED,
				note: 'The exact settings that produced the rung-1 percentages — pair this with `ours`.',
			},
			rigDefault: {
				path: rel( sideRigDefaultPng ),
				settings: { blendOff: false, nopost: false },
				note: 'The rig\'s own default render (post-process + squaring blend on) — NOT the pair ' +
					'rung 1 measured. For reference only.',
			},
			note: 'No number by design — the blink comparator\'s two inputs, for Bean\'s own eye.',
		};

		// ⛔ C5 FIX (2026-08-29, whole-branch review): "the run FAILED and
		// nothing says so" — underCeiling being false per-time inside
		// rung1.perTime was true but easy to miss; there was no single,
		// top-level field a reader (or a future script) could check without
		// walking the whole tree. This is that field.
		const overCeilingTimes = SAMPLE_TIMES.filter(
			( t ) => rung1.perTime[ String( t ) ] && ! rung1.perTime[ String( t ) ].underCeiling
		);
		baseline.verdict = {
			fidelityFailed,
			overCeilingTimes,
			exitCode: fidelityFailed ? 1 : 0,
			summary: fidelityFailed
				? `FIDELITY FAILURE — ${ overCeilingTimes.length } of ${ SAMPLE_TIMES.length } sampled ` +
					`u_time values exceeded the ${ FIDELITY_CEILING_PCT }% ceiling: [${ overCeilingTimes.join( ', ' ) }].`
				: `All ${ SAMPLE_TIMES.length } sampled u_time values passed the ${ FIDELITY_CEILING_PCT }% ceiling.`,
		};
		console.log( `\n${ baseline.verdict.summary }` );

		await writeFile( BASELINE_PATH, JSON.stringify( baseline, null, 2 ) + '\n' );
		console.log( `\nWrote baseline: ${ BASELINE_PATH }` );
	} catch ( err ) {
		harnessError = err;
	} finally {
		if ( browser ) {
			await browser.close().catch( () => {} );
		}
		if ( site ) {
			await site.close().catch( () => {} );
		}
	}

	if ( harnessError ) {
		if ( harnessError instanceof HarnessError ) {
			console.error( '\n' + '='.repeat( 78 ) );
			console.error( 'HARNESS ERROR (exit 2) — no fidelity verdict can be trusted from this run.' );
			console.error( harnessError.message );
			console.error( '='.repeat( 78 ) );
		} else {
			console.error( '\nUNEXPECTED ERROR (exit 2):' );
			console.error( harnessError );
		}
		process.exit( 2 );
	}

	if ( fidelityFailed ) {
		console.error(
			`\nFIDELITY FAILURE (exit 1): at least one sampled u_time exceeded the ` +
				`${ FIDELITY_CEILING_PCT }% ceiling on rung 1. See fidelity-baseline.json for the ` +
				`per-time figures.`
		);
		process.exit( 1 );
	}

	console.log( '\nAll rungs passed.' );
	process.exit( 0 );
}

// C2 fix: main() previously had no top-level `.catch()`, so mkdir/serve/
// launch/close calls that lived OUTSIDE its internal try/catch (or any
// exception thrown while --self-test is running, which has no local
// try/catch of its own) became UNHANDLED REJECTIONS — Node 24's default for
// those is exit code 1, silently misreporting a broken harness as a
// FIDELITY FAILURE. This is the single backstop that makes exit 2 the only
// possible outcome for anything that isn't an explicit, parsed rung result.
main().catch( ( e ) => {
	console.error( '\nUNCAUGHT REJECTION (harness error, exit 2):' );
	console.error( e );
	process.exit( 2 );
} );
