#!/usr/bin/env node
/**
 * Multi-frame visual QA capture.
 *
 * Captures hero element screenshots + DOM visibility snapshots at 5 timing
 * frames (0ms, 200ms, 500ms, 1000ms, 3000ms) after navigation start. Diffs
 * two runs (SGS vs mockup) to surface first-paint defects.
 *
 * Usage:
 *   node capture.js --url <url> --out <dir> [--viewports 375,1440] [--selector section.sgs-hero]
 *   node capture.js --diff <run-a-dir> <run-b-dir> --out <diff-dir>
 *
 * Why this exists (M1/M2/M3 from common-wp-styling-errors.md):
 *   Standard single-frame post-load screenshots miss time-bound defects.
 *   animation-fill-mode:both + animation-delay causes elements to be
 *   invisible during the delay window even though getComputedStyle() reports
 *   opacity:1 at the end-state. Multi-frame capture catches the disagreement.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const FRAME_DELAYS = [0, 200, 500, 1000, 3000];
const DEFAULT_VIEWPORTS = [375, 1440];
const DEFAULT_SELECTOR = 'section.sgs-hero, .wp-block-sgs-hero, body';

function parseArgs(argv) {
    const args = { viewports: DEFAULT_VIEWPORTS, selector: DEFAULT_SELECTOR, diff: false };
    for (let i = 2; i < argv.length; i++) {
        if (argv[i] === '--url') args.url = argv[++i];
        else if (argv[i] === '--out') args.out = argv[++i];
        else if (argv[i] === '--viewports') args.viewports = argv[++i].split(',').map(Number);
        else if (argv[i] === '--selector') args.selector = argv[++i];
        else if (argv[i] === '--diff') { args.diff = true; args.runA = argv[++i]; args.runB = argv[++i]; }
        else if (argv[i] === '--label') args.label = argv[++i];
    }
    return args;
}

async function measureVisibility(page, selector) {
    return page.evaluate((sel) => {
        const hero = document.querySelector(sel);
        if (!hero) return { error: `selector not found: ${sel}` };

        const results = {};

        const measureEl = (el, key) => {
            const cs = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            results[key] = {
                tagName: el.tagName.toLowerCase(),
                classes: Array.from(el.classList).join(' '),
                computedOpacity: cs.opacity,
                computedVisibility: cs.visibility,
                computedDisplay: cs.display,
                computedTransform: cs.transform,
                computedAnimation: cs.animationName !== 'none' ? cs.animation : null,
                computedAnimationName: cs.animationName,
                computedAnimationDelay: cs.animationDelay,
                computedAnimationFillMode: cs.animationFillMode,
                computedAnimationPlayState: cs.animationPlayState,
                inlineStyle: el.getAttribute('style') || null,
                rect: {
                    x: Math.round(rect.x),
                    y: Math.round(rect.y),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                    top: Math.round(rect.top),
                    left: Math.round(rect.left),
                },
                isVisible: (
                    cs.opacity !== '0' &&
                    cs.visibility !== 'hidden' &&
                    cs.display !== 'none' &&
                    rect.width > 0 &&
                    rect.height > 0
                ),
            };
        };

        // measure the hero itself
        measureEl(hero, '__hero');

        // measure ALL descendants (not just direct children) to catch deeply nested animated elements
        const allDescendants = Array.from(hero.querySelectorAll('*'));
        allDescendants.forEach((el) => {
            const cs = window.getComputedStyle(el);
            // Only record elements that have an animation, are images, or have significant visibility properties
            const hasAnimation = cs.animationName !== 'none';
            const isImage = el.tagName === 'IMG';
            const hasSgsClass = Array.from(el.classList).some(c => c.startsWith('sgs-'));
            if (hasAnimation || isImage || hasSgsClass) {
                // Build a unique key from classes
                const sgsClass = Array.from(el.classList).find(c => c.startsWith('sgs-'));
                const key = sgsClass || el.className.replace(/\s+/g, '-') || el.tagName.toLowerCase();
                measureEl(el, key);
            }
        });

        return results;
    }, selector);
}

async function captureRun(args) {
    const { url, out, viewports, selector } = args;
    if (!url || !out) {
        console.error('--url and --out are required for a capture run');
        process.exit(1);
    }

    fs.mkdirSync(out, { recursive: true });

    const browser = await chromium.launch({ headless: true });

    const runs = {};

    for (const width of viewports) {
        runs[width] = {};
        const context = await browser.newContext({
            viewport: { width, height: width < 768 ? 812 : 900 },
        });
        const page = await context.newPage();

        // Start navigation without waiting for load — capture the commit point only.
        // This gives frame-0 before any JS/CSS has executed.
        const navStart = Date.now();
        const gotoPromise = page.goto(url, { waitUntil: 'commit', timeout: 30000 });

        let currentFrameIndex = 0;
        const frameData = [];

        for (const delay of FRAME_DELAYS) {
            const elapsed = Date.now() - navStart;
            const remaining = delay - elapsed;
            if (remaining > 0) {
                await new Promise(r => setTimeout(r, remaining));
            }

            const actualMs = Date.now() - navStart;
            const frameLabel = `${delay}ms`;
            const screenshotPath = path.join(out, `${width}px-frame-${delay}ms.png`);

            let screenshot = null;
            let visibility = null;
            let screenshotError = null;
            let visibilityError = null;

            try {
                screenshot = await page.screenshot({
                    path: screenshotPath,
                    fullPage: false,
                    clip: { x: 0, y: 0, width, height: width < 768 ? 812 : 900 },
                });
            } catch (e) {
                screenshotError = e.message;
            }

            try {
                visibility = await measureVisibility(page, selector);
            } catch (e) {
                visibilityError = e.message;
            }

            frameData.push({
                targetDelay: delay,
                actualMs,
                screenshotPath: screenshotError ? null : screenshotPath,
                screenshotError,
                visibilityError,
                visibility,
            });

            console.log(`  [${width}px @${delay}ms] screenshot=${screenshotError ? 'ERROR: ' + screenshotError : 'ok'}`);
        }

        // Wait for full load to complete before moving to next viewport
        try { await gotoPromise; } catch (_) {}

        runs[width] = frameData;

        const snapshotPath = path.join(out, `${width}px-snapshots.json`);
        fs.writeFileSync(snapshotPath, JSON.stringify(frameData, null, 2));

        await context.close();
    }

    await browser.close();

    // Write summary
    const summaryPath = path.join(out, 'summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify({ url, capturedAt: new Date().toISOString(), viewports, selector, runs }, null, 2));
    console.log(`\nCapture complete → ${out}`);
    return runs;
}

function diffVisibility(aFrame, bFrame, viewportWidth, frameDelay) {
    const defects = [];
    if (!aFrame.visibility || !bFrame.visibility) return defects;

    const allKeys = new Set([...Object.keys(aFrame.visibility), ...Object.keys(bFrame.visibility)]);
    for (const key of allKeys) {
        const a = aFrame.visibility[key];
        const b = bFrame.visibility[key];
        if (!a || !b) continue;

        // First-paint defect: element visible on B (mockup) but invisible on A (SGS) at same frame
        if (b.isVisible && !a.isVisible) {
            defects.push({
                type: 'first-paint-defect',
                viewport: viewportWidth,
                frame: frameDelay,
                element: key,
                sgs: { opacity: a.computedOpacity, visibility: a.computedVisibility, display: a.computedDisplay, animation: a.computedAnimation, animationDelay: a.computedAnimationDelay, animationFillMode: a.computedAnimationFillMode },
                mockup: { opacity: b.computedOpacity, visibility: b.computedVisibility, display: b.computedDisplay },
                message: `Element '${key}' visible on mockup at ${frameDelay}ms but NOT on SGS`,
            });
        }

        // Opacity shift within SGS across frames (animation in progress)
        if (parseFloat(a.computedOpacity) < 1 && parseFloat(a.computedOpacity) > 0) {
            defects.push({
                type: 'partial-opacity',
                viewport: viewportWidth,
                frame: frameDelay,
                element: key,
                sgsOpacity: a.computedOpacity,
                animation: a.computedAnimation,
                message: `Element '${key}' has partial opacity ${a.computedOpacity} at ${frameDelay}ms on SGS`,
            });
        }

        // Position shift (CLS) — compare rect between consecutive frames
        if (a.rect && b.rect) {
            const xDelta = Math.abs(a.rect.x - b.rect.x);
            const yDelta = Math.abs(a.rect.y - b.rect.y);
            if (xDelta > 5 || yDelta > 5) {
                defects.push({
                    type: 'position-mismatch',
                    viewport: viewportWidth,
                    frame: frameDelay,
                    element: key,
                    sgsRect: a.rect,
                    mockupRect: b.rect,
                    message: `Element '${key}' position differs by (${xDelta}x, ${yDelta}y) at ${frameDelay}ms`,
                });
            }
        }
    }

    return defects;
}

async function runDiff(args) {
    const { runA, runB, out } = args;
    if (!runA || !runB || !out) {
        console.error('--diff requires <run-a-dir> <run-b-dir> --out <dir>');
        process.exit(1);
    }

    fs.mkdirSync(out, { recursive: true });

    const aData = {};
    const bData = {};

    // Load snapshots from both runs
    for (const runDir of [runA, runB]) {
        const isA = runDir === runA;
        const files = fs.readdirSync(runDir).filter(f => f.endsWith('-snapshots.json'));
        for (const file of files) {
            const width = parseInt(file);
            const data = JSON.parse(fs.readFileSync(path.join(runDir, file)));
            if (isA) aData[width] = data;
            else bData[width] = data;
        }
    }

    const allDefects = [];

    for (const width of Object.keys(aData)) {
        const aFrames = aData[width];
        const bFrames = bData[width];
        if (!bFrames) continue;

        for (let i = 0; i < aFrames.length; i++) {
            const delay = FRAME_DELAYS[i];
            const defects = diffVisibility(aFrames[i], bFrames[i], parseInt(width), delay);
            allDefects.push(...defects);
        }
    }

    // Also detect within-SGS opacity shifts across frames (animation mid-flight)
    for (const width of Object.keys(aData)) {
        const frames = aData[width];
        for (let i = 1; i < frames.length; i++) {
            const prev = frames[i - 1];
            const curr = frames[i];
            if (!prev.visibility || !curr.visibility) continue;

            for (const key of Object.keys(prev.visibility)) {
                const p = prev.visibility[key];
                const c = curr.visibility[key];
                if (!p || !c) continue;

                const prevOpacity = parseFloat(p.computedOpacity);
                const currOpacity = parseFloat(c.computedOpacity);
                if (Math.abs(prevOpacity - currOpacity) > 0.05) {
                    allDefects.push({
                        type: 'opacity-transition',
                        viewport: parseInt(width),
                        framePrev: FRAME_DELAYS[i - 1],
                        frameCurr: FRAME_DELAYS[i],
                        element: key,
                        prevOpacity,
                        currOpacity,
                        message: `Element '${key}' opacity changed from ${prevOpacity} to ${currOpacity} between ${FRAME_DELAYS[i-1]}ms and ${FRAME_DELAYS[i]}ms on SGS`,
                    });
                }
            }
        }
    }

    const report = {
        runA,
        runB,
        diffAt: new Date().toISOString(),
        totalDefects: allDefects.length,
        firstPaintDefects: allDefects.filter(d => d.type === 'first-paint-defect').length,
        opacityTransitions: allDefects.filter(d => d.type === 'opacity-transition').length,
        partialOpacity: allDefects.filter(d => d.type === 'partial-opacity').length,
        positionMismatch: allDefects.filter(d => d.type === 'position-mismatch').length,
        defects: allDefects,
    };

    const reportPath = path.join(out, 'diff-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Human-readable summary
    const lines = [
        '# Multi-frame diff report',
        `Run A (SGS): ${runA}`,
        `Run B (Mockup): ${runB}`,
        ``,
        `## Summary`,
        `Total defects: ${report.totalDefects}`,
        `First-paint defects: ${report.firstPaintDefects}`,
        `Opacity transitions (animation in-flight): ${report.opacityTransitions}`,
        `Position mismatches: ${report.positionMismatch}`,
        ``,
        `## Defects`,
    ];
    for (const d of allDefects) {
        lines.push(`- [${d.type}] ${d.viewport}px @${d.frame ?? d.frameCurr}ms — ${d.message}`);
    }

    const mdPath = path.join(out, 'diff-report.md');
    fs.writeFileSync(mdPath, lines.join('\n'));

    console.log(`\nDiff complete → ${mdPath}`);
    console.log(`First-paint defects: ${report.firstPaintDefects}`);
    console.log(`Opacity transitions: ${report.opacityTransitions}`);
    return report;
}

async function main() {
    const args = parseArgs(process.argv);

    if (args.diff) {
        await runDiff(args);
    } else {
        await captureRun(args);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
