#!/usr/bin/env node
/**
 * Screenshot diff helper — pixel-level QC gate for the SGS pipeline.
 *
 * Closes Gap H-5 (classifier human-eye gate). Captures a mockup and an SGS
 * render, aligns dimensions, runs pixelmatch, and emits three artefacts:
 *
 *   reports/screenshot-diffs/<run-id>/composite.png  — side-by-side image
 *   reports/screenshot-diffs/<run-id>/heatmap.png    — pixel-diff heatmap
 *   reports/screenshot-diffs/<run-id>/diff.json      — quantitative summary
 *
 * Usage:
 *   node scripts/screenshot-diff-helper.js \
 *     --mockup http://localhost:8765/index.html \
 *     --sgs https://example.com/?page_id=29 \
 *     --viewport 1440x900 \
 *     --selector ".sgs-hero" \
 *     --threshold 1
 *
 * Exit codes:
 *   0 = PASS (pixel mismatch under threshold)
 *   1 = FAIL (mismatch above warn band)
 *   2 = WARN (mismatch in warn band: threshold .. 5 * threshold)
 *   3 = ERROR — page failed to load
 *   4 = ERROR — pixelmatch crashed despite resize logic
 *   5 = ERROR — could not create output directory
 *
 * Why this exists:
 *   The parity-validator catches computed-style deltas, but a class of
 *   defects only shows up at the pixel level — gradient overlays masking
 *   `backgroundColor`, parent filters, pseudo-element backgrounds, blend
 *   modes (see common-wp-styling-errors Section R, captured 2026-05-05
 *   after the hero gradient incident). This helper is the human-eye gate.
 */

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const pixelmatch = require('pixelmatch');
const { PNG } = require('pngjs');

const DEFAULT_VIEWPORT = { width: 1440, height: 900 };
const DEFAULT_THRESHOLD = 1; // percent
const COMPOSITE_GAP_PX = 10;
const LABEL_HEIGHT_PX = 24;

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

function printHelp() {
    const help = [
        'screenshot-diff-helper — pixel diff between a mockup and an SGS render',
        '',
        'Usage:',
        '  node scripts/screenshot-diff-helper.js [options]',
        '',
        'Required:',
        '  --mockup <url>        URL of the mockup (left side)',
        '  --sgs <url>           URL of the SGS render (right side)',
        '',
        'Optional:',
        '  --viewport <WxH>      Viewport size, default 1440x900',
        '  --selector <css>      Element to crop to (defaults to full page)',
        '  --threshold <pct>     PASS ceiling, default 1 (percent mismatch)',
        '  --out <dir>           Output directory (default: reports/screenshot-diffs/<run-id>)',
        '  --help                Show this message',
        '',
        'Outputs:',
        '  composite.png   side-by-side mockup vs SGS',
        '  heatmap.png     pixelmatch diff (red = mismatch)',
        '  diff.json       quantitative summary',
        '',
        'Exit codes: 0 PASS, 1 FAIL, 2 WARN, 3 load-error, 4 pixelmatch-error, 5 fs-error',
    ].join('\n');
    process.stdout.write(help + '\n');
}

function parseViewport(spec) {
    const m = String(spec || '').match(/^(\d+)x(\d+)$/);
    if (!m) return null;
    return { width: parseInt(m[1], 10), height: parseInt(m[2], 10) };
}

function parseArgs(argv) {
    const args = {
        viewport: DEFAULT_VIEWPORT,
        threshold: DEFAULT_THRESHOLD,
        selector: null,
        out: null,
        help: false,
    };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--help' || a === '-h') args.help = true;
        else if (a === '--mockup') args.mockup = argv[++i];
        else if (a === '--sgs') args.sgs = argv[++i];
        else if (a === '--selector') args.selector = argv[++i];
        else if (a === '--threshold') args.threshold = parseFloat(argv[++i]);
        else if (a === '--out') args.out = argv[++i];
        else if (a === '--viewport') {
            const v = parseViewport(argv[++i]);
            if (v) args.viewport = v;
        }
    }
    return args;
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function log(stage, message) {
    const ts = new Date().toISOString().replace('T', ' ').replace(/\..+/, '');
    process.stdout.write(`[${ts}] [${stage}] ${message}\n`);
}

function warn(stage, message) {
    const ts = new Date().toISOString().replace('T', ' ').replace(/\..+/, '');
    process.stderr.write(`[${ts}] [${stage}] WARN: ${message}\n`);
}

// ---------------------------------------------------------------------------
// Capture
// ---------------------------------------------------------------------------

async function captureScreenshot(browser, url, viewport, selector, label) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    try {
        log('CAPTURE', `${label}: navigating to ${url}`);
        await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(async () => {
            // Long-poll connections can prevent networkidle. Fall back to load.
            await page.waitForLoadState('load').catch(() => {});
        });
        // Allow webfonts and post-load layout shifts to settle.
        await page.evaluate(() => (document.fonts && document.fonts.ready)
            ? document.fonts.ready
            : Promise.resolve()).catch(() => {});
        await page.waitForTimeout(500);

        let buffer;
        let usedSelector = false;
        if (selector) {
            const el = await page.$(selector);
            if (el) {
                const box = await el.boundingBox();
                if (box && box.width > 0 && box.height > 0) {
                    buffer = await el.screenshot({ type: 'png' });
                    usedSelector = true;
                    log('CAPTURE', `${label}: cropped to selector ${selector} (${Math.round(box.width)}x${Math.round(box.height)})`);
                } else {
                    warn('CAPTURE', `${label}: selector ${selector} matched but had zero size; falling back to full page`);
                }
            } else {
                warn('CAPTURE', `${label}: selector ${selector} matched zero elements; falling back to full page`);
            }
        }
        if (!buffer) {
            buffer = await page.screenshot({ type: 'png', fullPage: true });
            log('CAPTURE', `${label}: full-page screenshot taken`);
        }
        return { buffer, usedSelector };
    } finally {
        await context.close();
    }
}

// ---------------------------------------------------------------------------
// PNG helpers
// ---------------------------------------------------------------------------

function decodePng(buffer) {
    return PNG.sync.read(buffer);
}

function encodePng(png) {
    return PNG.sync.write(png);
}

// Resize one PNG to a target width/height by cropping or padding (white).
// We never up-scale — if the source is smaller, we pad to keep pixel
// fidelity. This preserves the painted appearance rather than smearing it
// through bilinear filtering.
function fitToSize(src, targetWidth, targetHeight) {
    if (src.width === targetWidth && src.height === targetHeight) return src;
    const out = new PNG({ width: targetWidth, height: targetHeight });
    // Fill with white.
    for (let i = 0; i < out.data.length; i += 4) {
        out.data[i] = 255;
        out.data[i + 1] = 255;
        out.data[i + 2] = 255;
        out.data[i + 3] = 255;
    }
    const copyW = Math.min(src.width, targetWidth);
    const copyH = Math.min(src.height, targetHeight);
    for (let y = 0; y < copyH; y++) {
        for (let x = 0; x < copyW; x++) {
            const sIdx = (src.width * y + x) << 2;
            const dIdx = (targetWidth * y + x) << 2;
            out.data[dIdx] = src.data[sIdx];
            out.data[dIdx + 1] = src.data[sIdx + 1];
            out.data[dIdx + 2] = src.data[sIdx + 2];
            out.data[dIdx + 3] = src.data[sIdx + 3];
        }
    }
    return out;
}

// Normalise mockup + SGS to identical dimensions (the smaller of the two
// in each axis). Documented behaviour: if SGS adds a scrollbar (~17px
// narrower content), we crop both sides to that width before diffing —
// this avoids a diagonal scrollbar mismatch dominating the heatmap.
function alignDimensions(a, b) {
    const w = Math.min(a.width, b.width);
    const h = Math.min(a.height, b.height);
    return { aligned: [fitToSize(a, w, h), fitToSize(b, w, h)], width: w, height: h };
}

// Build the side-by-side composite image with a white gap and label band.
function buildComposite(mockup, sgs) {
    const w = mockup.width + COMPOSITE_GAP_PX + sgs.width;
    const h = LABEL_HEIGHT_PX + Math.max(mockup.height, sgs.height);
    const out = new PNG({ width: w, height: h });
    // Fill white.
    for (let i = 0; i < out.data.length; i += 4) {
        out.data[i] = 255;
        out.data[i + 1] = 255;
        out.data[i + 2] = 255;
        out.data[i + 3] = 255;
    }
    // Draw a thin grey divider in the label band so the two halves are
    // visually distinct without needing fancy text rendering.
    drawLabelBand(out, 0, mockup.width, [220, 220, 220]);
    drawLabelBand(out, mockup.width + COMPOSITE_GAP_PX, sgs.width, [220, 220, 220]);
    blit(out, mockup, 0, LABEL_HEIGHT_PX);
    blit(out, sgs, mockup.width + COMPOSITE_GAP_PX, LABEL_HEIGHT_PX);
    // Sentinel pixels so the consumer can tell the halves apart even
    // without a renderer for the labels:
    //   left side  -> single dark pixel at (4, 4) labelled "M"
    //   right side -> single dark pixel at (mockup.width + GAP + 4, 4) labelled "S"
    setPixel(out, 4, 4, [40, 40, 40]);
    setPixel(out, mockup.width + COMPOSITE_GAP_PX + 4, 4, [40, 40, 40]);
    return out;
}

function drawLabelBand(out, x, width, rgb) {
    for (let y = 0; y < LABEL_HEIGHT_PX; y++) {
        for (let dx = 0; dx < width; dx++) {
            const idx = (out.width * y + (x + dx)) << 2;
            out.data[idx] = rgb[0];
            out.data[idx + 1] = rgb[1];
            out.data[idx + 2] = rgb[2];
            out.data[idx + 3] = 255;
        }
    }
}

function setPixel(out, x, y, rgb) {
    const idx = (out.width * y + x) << 2;
    out.data[idx] = rgb[0];
    out.data[idx + 1] = rgb[1];
    out.data[idx + 2] = rgb[2];
    out.data[idx + 3] = 255;
}

function blit(dst, src, ox, oy) {
    for (let y = 0; y < src.height; y++) {
        for (let x = 0; x < src.width; x++) {
            const sIdx = (src.width * y + x) << 2;
            const dIdx = (dst.width * (y + oy) + (x + ox)) << 2;
            dst.data[dIdx] = src.data[sIdx];
            dst.data[dIdx + 1] = src.data[sIdx + 1];
            dst.data[dIdx + 2] = src.data[sIdx + 2];
            dst.data[dIdx + 3] = src.data[sIdx + 3];
        }
    }
}

// ---------------------------------------------------------------------------
// Dominant colour histogram — coarse 5-bit per channel (32^3 buckets).
// Catches the hero pink incident: a colour that's >5% of pixels on one
// side and <1% on the other.
// ---------------------------------------------------------------------------

function buildHistogram(png) {
    const buckets = new Map();
    const total = png.width * png.height;
    for (let i = 0; i < png.data.length; i += 4) {
        const r = png.data[i] >> 3;
        const g = png.data[i + 1] >> 3;
        const b = png.data[i + 2] >> 3;
        const key = (r << 10) | (g << 5) | b;
        buckets.set(key, (buckets.get(key) || 0) + 1);
    }
    return { buckets, total };
}

function bucketToRgbHex(key) {
    const r = ((key >> 10) & 0x1f) << 3;
    const g = ((key >> 5) & 0x1f) << 3;
    const b = (key & 0x1f) << 3;
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function compareDominantColours(a, b) {
    const deltas = [];
    const seen = new Set();
    const considerSide = (sideHist, otherHist, label) => {
        // Top 12 buckets per side, only those above 1% of pixels.
        const ranked = [...sideHist.buckets.entries()]
            .map(([k, c]) => [k, c / sideHist.total])
            .filter(([, pct]) => pct >= 0.01)
            .sort((x, y) => y[1] - x[1])
            .slice(0, 12);
        for (const [key, pct] of ranked) {
            if (seen.has(key)) continue;
            seen.add(key);
            const otherCount = otherHist.buckets.get(key) || 0;
            const otherPct = otherCount / otherHist.total;
            // Trigger when one side is >5% and the other is <1%.
            if (pct >= 0.05 && otherPct < 0.01) {
                deltas.push({
                    colour: bucketToRgbHex(key),
                    dominant_on: label,
                    pct_on_dominant: Number((pct * 100).toFixed(2)),
                    pct_on_other: Number((otherPct * 100).toFixed(2)),
                });
            }
        }
    };
    considerSide(a, b, 'mockup');
    considerSide(b, a, 'sgs');
    return deltas;
}

// ---------------------------------------------------------------------------
// Diff
// ---------------------------------------------------------------------------

function runPixelmatch(mockup, sgs) {
    const { width, height } = mockup;
    const heatmap = new PNG({ width, height });
    const mismatched = pixelmatch(
        mockup.data,
        sgs.data,
        heatmap.data,
        width,
        height,
        {
            threshold: 0.1,
            includeAA: false,
            alpha: 0.4,
            diffColor: [255, 0, 0],
        },
    );
    return { heatmap, mismatched, width, height };
}

function maxRegionSize(heatmap) {
    // Connected-component scan over red pixels — bounded flood-fill with
    // a stack to avoid recursion blow-up. Returns the largest mismatch
    // region in pixels (gives a sense of whether deltas are scattered
    // noise or one big gradient/colour block).
    const { width, height, data } = heatmap;
    const visited = new Uint8Array(width * height);
    let maxSize = 0;
    const isMismatch = (idx) => data[idx * 4] > 200 && data[idx * 4 + 1] < 80 && data[idx * 4 + 2] < 80;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (visited[idx] || !isMismatch(idx)) continue;
            // Iterative flood fill.
            const stack = [idx];
            let size = 0;
            while (stack.length) {
                const i = stack.pop();
                if (visited[i]) continue;
                visited[i] = 1;
                if (!isMismatch(i)) continue;
                size++;
                const cx = i % width;
                const cy = (i - cx) / width;
                if (cx > 0) stack.push(i - 1);
                if (cx < width - 1) stack.push(i + 1);
                if (cy > 0) stack.push(i - width);
                if (cy < height - 1) stack.push(i + width);
            }
            if (size > maxSize) maxSize = size;
        }
    }
    return maxSize;
}

// ---------------------------------------------------------------------------
// Severity + verdict
// ---------------------------------------------------------------------------

function classify(pct, threshold) {
    if (pct < threshold) return { severity: 'pass', exit: 0 };
    if (pct < threshold * 5) return { severity: 'warn', exit: 2 };
    return { severity: 'fail', exit: 1 };
}

// ---------------------------------------------------------------------------
// Output dir
// ---------------------------------------------------------------------------

function makeRunId() {
    const d = new Date();
    const stamp = d.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    const rand = Math.random().toString(36).slice(2, 8);
    return `${stamp}-${rand}`;
}

function ensureOutDir(custom) {
    const runId = makeRunId();
    const dir = custom || path.join('reports', 'screenshot-diffs', runId);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    const args = parseArgs(process.argv);
    if (args.help) { printHelp(); process.exit(0); }
    if (!args.mockup || !args.sgs) {
        process.stderr.write('Error: --mockup and --sgs are required. Use --help for usage.\n');
        process.exit(1);
    }

    let outDir;
    try {
        outDir = ensureOutDir(args.out);
    } catch (e) {
        process.stderr.write(`Error: could not create output directory: ${e.message}\n`);
        process.exit(5);
    }
    log('INIT', `output directory: ${outDir}`);

    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    let mockupShot, sgsShot;
    try {
        try {
            mockupShot = await captureScreenshot(browser, args.mockup, args.viewport, args.selector, 'mockup');
        } catch (e) {
            await browser.close();
            process.stderr.write(`Error: failed to load mockup ${args.mockup}: ${e.message}\n`);
            writeErrorReport(outDir, args, 'mockup-load-failed', e.message);
            process.exit(3);
        }
        try {
            sgsShot = await captureScreenshot(browser, args.sgs, args.viewport, args.selector, 'sgs');
        } catch (e) {
            await browser.close();
            process.stderr.write(`Error: failed to load SGS ${args.sgs}: ${e.message}\n`);
            writeErrorReport(outDir, args, 'sgs-load-failed', e.message);
            process.exit(3);
        }
    } finally {
        await browser.close();
    }

    log('DECODE', 'parsing PNG buffers');
    const mockupPng = decodePng(mockupShot.buffer);
    const sgsPng = decodePng(sgsShot.buffer);
    log('DECODE', `mockup ${mockupPng.width}x${mockupPng.height}, sgs ${sgsPng.width}x${sgsPng.height}`);

    const { aligned, width, height } = alignDimensions(mockupPng, sgsPng);
    const [mockupAligned, sgsAligned] = aligned;
    if (mockupAligned.width !== sgsAligned.width || mockupAligned.height !== sgsAligned.height) {
        process.stderr.write(`Error: dimension alignment failed — mockup ${mockupAligned.width}x${mockupAligned.height} vs sgs ${sgsAligned.width}x${sgsAligned.height}\n`);
        process.exit(4);
    }
    log('ALIGN', `aligned to ${width}x${height}`);

    let diff;
    try {
        diff = runPixelmatch(mockupAligned, sgsAligned);
    } catch (e) {
        process.stderr.write(`Error: pixelmatch crashed: ${e.message}\n`);
        process.exit(4);
    }
    const totalPixels = width * height;
    const pct = (diff.mismatched / totalPixels) * 100;
    log('DIFF', `${diff.mismatched}/${totalPixels} pixels mismatched (${pct.toFixed(3)}%)`);

    log('HISTOGRAM', 'computing dominant colour deltas');
    const histM = buildHistogram(mockupAligned);
    const histS = buildHistogram(sgsAligned);
    const colourDeltas = compareDominantColours(histM, histS);
    if (colourDeltas.length) {
        log('HISTOGRAM', `${colourDeltas.length} dominant-colour delta(s) flagged`);
    }

    log('REGIONS', 'scanning for largest mismatched region');
    const maxRegion = maxRegionSize(diff.heatmap);
    log('REGIONS', `largest mismatch region: ${maxRegion}px`);

    log('COMPOSITE', 'building side-by-side composite');
    const composite = buildComposite(mockupAligned, sgsAligned);

    const compositePath = path.join(outDir, 'composite.png');
    const heatmapPath = path.join(outDir, 'heatmap.png');
    const jsonPath = path.join(outDir, 'diff.json');

    fs.writeFileSync(compositePath, encodePng(composite));
    fs.writeFileSync(heatmapPath, encodePng(diff.heatmap));

    const verdict = classify(pct, args.threshold);
    const report = {
        mockup_url: args.mockup,
        sgs_url: args.sgs,
        viewport: args.viewport,
        selector: args.selector,
        threshold_pct: args.threshold,
        pixel_mismatch_pct: Number(pct.toFixed(4)),
        dominant_colour_deltas: colourDeltas,
        max_region_size_px: maxRegion,
        total_pixels: totalPixels,
        mismatched_pixels: diff.mismatched,
        severity: verdict.severity,
        artefacts: {
            composite: compositePath,
            heatmap: heatmapPath,
        },
        captured_at: new Date().toISOString(),
    };
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    const verdictUpper = verdict.severity.toUpperCase();
    process.stdout.write(`\n${verdictUpper}: ${pct.toFixed(3)}% pixel mismatch (threshold ${args.threshold}%) — artefacts at ${outDir}\n`);
    process.exit(verdict.exit);
}

function writeErrorReport(outDir, args, code, message) {
    try {
        const jsonPath = path.join(outDir, 'diff.json');
        fs.writeFileSync(jsonPath, JSON.stringify({
            mockup_url: args.mockup,
            sgs_url: args.sgs,
            viewport: args.viewport,
            selector: args.selector,
            threshold_pct: args.threshold,
            severity: 'error',
            error_code: code,
            error_message: message,
            captured_at: new Date().toISOString(),
        }, null, 2));
    } catch (_) { /* best-effort */ }
}

main().catch(err => {
    process.stderr.write(`Unhandled error: ${err.stack || err.message || err}\n`);
    process.exit(1);
});
