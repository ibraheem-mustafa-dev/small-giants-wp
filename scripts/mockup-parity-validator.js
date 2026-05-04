#!/usr/bin/env node
/**
 * Mockup parity validator.
 *
 * Compares computed styles of a deployed SGS render against its source mockup,
 * keyed by a fingerprint map of {mockup-selector: sgs-selector} pairs.
 *
 * Usage:
 *   node scripts/mockup-parity-validator.js \
 *     --mockup http://localhost:8765/index.html \
 *     --sgs https://example.com/?page_id=29 \
 *     --viewports 375,1440 \
 *     --fingerprint sites/mamas-munches/research/hero-parity-fingerprint.json \
 *     --out reports/parity/example-2026-05-04.md
 *
 * Why this exists:
 *   The hero PoC QC report (reports/hero-poc-qc-2026-05-04.md) listed 13 deltas
 *   at 1440 + 6 at 375 that a human spotted by eye. This script catches every
 *   one of them computationally — typography, box, colour, animation — plus
 *   asserts every declared @font-face actually loaded (Section O2 in
 *   .claude/specs/common-wp-styling-errors.md: Fraunces silent-fail class).
 *
 * Exit codes:
 *   0 = PASS (all deltas under threshold + all fonts loaded on both sides)
 *   1 = FAIL (or runtime error)
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const DEFAULT_VIEWPORTS = [375, 1440];

const WATCHED = [
    // Typography
    'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign', 'textTransform',
    // Box
    'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    // Visual
    'color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderRightColor',
    'borderBottomColor', 'borderLeftColor', 'borderWidth', 'borderRadius', 'opacity',
    // Layout
    'display', 'flexDirection', 'gap', 'justifyContent', 'alignItems', 'gridTemplateColumns',
    // Animation (M1 class — common-wp-styling-errors Section M)
    'animationName', 'animationDelay', 'animationFillMode',
];

// Properties where pixel/numeric tolerance applies
const PIXEL_PROPS = new Set([
    'fontSize', 'lineHeight', 'letterSpacing',
    'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'borderWidth', 'borderRadius', 'gap',
]);

// Colour properties — exact match required (after normalisation)
const COLOUR_PROPS = new Set([
    'color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderRightColor',
    'borderBottomColor', 'borderLeftColor',
]);

// Severity classification
function classifySeverity(prop, mockup, sgs, deltaPx, deltaPct) {
    if (COLOUR_PROPS.has(prop)) return 'Major';
    if (prop === 'fontFamily' || prop === 'fontWeight') return 'Major';
    if (prop === 'fontSize' && Math.abs(deltaPx) >= 4) return 'Major';
    if (PIXEL_PROPS.has(prop) && Math.abs(deltaPx) >= 8) return 'Major';
    if (prop.startsWith('animation')) return 'Major';
    if (PIXEL_PROPS.has(prop) && Math.abs(deltaPx) >= 2) return 'Important';
    return 'Minor';
}

function parseArgs(argv) {
    const args = { viewports: DEFAULT_VIEWPORTS };
    for (let i = 2; i < argv.length; i++) {
        if (argv[i] === '--mockup') args.mockup = argv[++i];
        else if (argv[i] === '--sgs') args.sgs = argv[++i];
        else if (argv[i] === '--viewports') args.viewports = argv[++i].split(',').map(Number);
        else if (argv[i] === '--fingerprint') args.fingerprint = argv[++i];
        else if (argv[i] === '--out') args.out = argv[++i];
    }
    return args;
}

function ensureDir(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function hostnameOf(url) {
    try { return new URL(url).hostname; } catch (_) { return 'unknown'; }
}

// Normalise a CSS pixel-ish value to a Number, or null if not numeric.
// Handles "46px", "1.15", "normal", etc. Returns null if not a clean number.
function pxToNumber(val) {
    if (val == null) return null;
    if (typeof val === 'number') return val;
    const s = String(val).trim();
    if (s === '' || s === 'normal' || s === 'auto' || s === 'none') return null;
    const m = s.match(/^(-?\d+(?:\.\d+)?)px$/);
    if (m) return parseFloat(m[1]);
    const n = parseFloat(s);
    if (!Number.isNaN(n) && /^-?\d+(\.\d+)?$/.test(s)) return n;
    return null;
}

// Normalise colour values. Browsers always return rgb()/rgba() for computed
// styles, so we just standardise spacing + drop alpha=1.
function normaliseColour(val) {
    if (!val) return val;
    const s = String(val).trim().toLowerCase().replace(/\s+/g, '');
    // rgba(r,g,b,1) -> rgb(r,g,b)
    const m = s.match(/^rgba\((\d+),(\d+),(\d+),1\)$/);
    if (m) return `rgb(${m[1]},${m[2]},${m[3]})`;
    return s;
}

function normaliseValue(prop, val) {
    if (COLOUR_PROPS.has(prop)) return normaliseColour(val);
    return val == null ? '' : String(val).trim();
}

// Compare a single property. Returns null if equal-within-threshold, else a
// delta record.
function compareProperty(prop, mockupVal, sgsVal) {
    const m = normaliseValue(prop, mockupVal);
    const s = normaliseValue(prop, sgsVal);
    if (m === s) return null;

    // Pixel-tolerant compare
    if (PIXEL_PROPS.has(prop)) {
        const mn = pxToNumber(m);
        const sn = pxToNumber(s);
        if (mn != null && sn != null) {
            const deltaPx = sn - mn;
            const denom = Math.max(Math.abs(mn), 1);
            const deltaPct = Math.abs(deltaPx) / denom;
            if (Math.abs(deltaPx) <= 1 && deltaPct <= 0.01) return null;
            return {
                property: prop,
                mockup: m,
                sgs: s,
                deltaPx: Number(deltaPx.toFixed(2)),
                deltaPct: Number((deltaPct * 100).toFixed(2)),
                severity: classifySeverity(prop, m, s, deltaPx, deltaPct),
            };
        }
    }

    // line-height can also be a unitless multiplier; pxToNumber handles that.
    return {
        property: prop,
        mockup: m,
        sgs: s,
        deltaPx: null,
        deltaPct: null,
        severity: classifySeverity(prop, m, s, 0, 0),
    };
}

// Run inside the page: capture computed styles for one selector + font info.
async function captureForSelector(page, selector) {
    return page.evaluate(({ sel, watched }) => {
        const el = document.querySelector(sel);
        if (!el) return { found: false };
        const cs = window.getComputedStyle(el);
        const out = { found: true, classes: Array.from(el.classList).join(' '), tagName: el.tagName.toLowerCase() };
        for (const prop of watched) {
            out[prop] = cs[prop];
        }
        return out;
    }, { sel: selector, watched: WATCHED });
}

async function captureFonts(page) {
    return page.evaluate(() => {
        const fonts = [];
        if (!document.fonts) return { supported: false, fonts: [] };
        document.fonts.forEach(f => {
            fonts.push({
                family: f.family,
                weight: f.weight,
                style: f.style,
                status: f.status, // 'unloaded' | 'loading' | 'loaded' | 'error'
            });
        });
        return { supported: true, fonts };
    });
}

async function captureCookieCount(context) {
    const cookies = await context.cookies();
    return cookies.length;
}

async function captureSide(browser, url, viewport, fingerprint, label) {
    const context = await browser.newContext({
        viewport: { width: viewport, height: viewport < 768 ? 812 : 900 },
    });
    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(async () => {
        // If networkidle times out (long-poll connections), fall back to load.
        await page.waitForLoadState('load').catch(() => {});
    });

    // Settle: wait for fonts to attempt loading.
    await page.evaluate(() => (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve()).catch(() => {});
    // Small extra settle for any post-load layout shifts
    await page.waitForTimeout(500);

    const cookieCount = await captureCookieCount(context);
    const styles = {};
    for (const [mockupSel, sgsSel] of Object.entries(fingerprint)) {
        const sel = label === 'mockup' ? mockupSel : sgsSel;
        styles[mockupSel] = await captureForSelector(page, sel);
    }
    const fonts = await captureFonts(page);

    await context.close();
    return { url, viewport, label, cookieCount, styles, fonts };
}

function summariseFonts(fontInfo) {
    const loaded = fontInfo.fonts.filter(f => f.status === 'loaded');
    const failed = fontInfo.fonts.filter(f => f.status === 'error');
    const stuck = fontInfo.fonts.filter(f => f.status === 'loading' || f.status === 'unloaded');
    return {
        total: fontInfo.fonts.length,
        loaded: loaded.length,
        failed: failed.length,
        stuck: stuck.length,
        failedFamilies: failed.map(f => `${f.family} ${f.weight} ${f.style}`),
        stuckFamilies: stuck.map(f => `${f.family} ${f.weight} ${f.style}`),
    };
}

function buildJsonReport({ mockupUrl, sgsUrl, viewports, fingerprint, results }) {
    const allDeltas = [];
    const fontReport = { mockup: {}, sgs: {} };

    for (const v of viewports) {
        const { mockupSide, sgsSide } = results[v];
        fontReport.mockup[v] = summariseFonts(mockupSide.fonts);
        fontReport.sgs[v] = summariseFonts(sgsSide.fonts);

        for (const mockupSel of Object.keys(fingerprint)) {
            const sgsSel = fingerprint[mockupSel];
            const m = mockupSide.styles[mockupSel];
            const s = sgsSide.styles[mockupSel];

            if (!m || !m.found) {
                allDeltas.push({
                    viewport: v,
                    mockupSelector: mockupSel,
                    sgsSelector: sgsSel,
                    property: '__selector_missing__',
                    mockup: 'NOT FOUND',
                    sgs: s && s.found ? 'found' : 'NOT FOUND',
                    severity: 'Major',
                });
                continue;
            }
            if (!s || !s.found) {
                allDeltas.push({
                    viewport: v,
                    mockupSelector: mockupSel,
                    sgsSelector: sgsSel,
                    property: '__selector_missing__',
                    mockup: 'found',
                    sgs: 'NOT FOUND',
                    severity: 'Major',
                });
                continue;
            }

            for (const prop of WATCHED) {
                const delta = compareProperty(prop, m[prop], s[prop]);
                if (delta) {
                    allDeltas.push({
                        viewport: v,
                        mockupSelector: mockupSel,
                        sgsSelector: sgsSel,
                        ...delta,
                    });
                }
            }
        }
    }

    // Font failures count as deltas
    let fontsLoaded = true;
    for (const v of viewports) {
        if (fontReport.mockup[v].failed > 0 || fontReport.mockup[v].stuck > 0) fontsLoaded = false;
        if (fontReport.sgs[v].failed > 0 || fontReport.sgs[v].stuck > 0) fontsLoaded = false;
    }

    const verdict = (allDeltas.length === 0 && fontsLoaded) ? 'PASS' : 'FAIL';

    return {
        verdict,
        fonts_loaded: fontsLoaded,
        viewports_tested: viewports,
        date: new Date().toISOString(),
        mockup_url: mockupUrl,
        sgs_url: sgsUrl,
        total_fingerprints: Object.keys(fingerprint).length,
        total_properties_compared: Object.keys(fingerprint).length * WATCHED.length * viewports.length,
        total_deltas: allDeltas.length,
        deltas_by_severity: {
            Major: allDeltas.filter(d => d.severity === 'Major').length,
            Important: allDeltas.filter(d => d.severity === 'Important').length,
            Minor: allDeltas.filter(d => d.severity === 'Minor').length,
        },
        font_report: fontReport,
        deltas: allDeltas,
    };
}

function renderMarkdown(report) {
    const lines = [];
    lines.push('---');
    lines.push(`verdict: ${report.verdict}`);
    lines.push(`fonts_loaded: ${report.fonts_loaded}`);
    lines.push(`viewports_tested: [${report.viewports_tested.join(', ')}]`);
    lines.push(`date: ${report.date}`);
    lines.push(`mockup_url: ${report.mockup_url}`);
    lines.push(`sgs_url: ${report.sgs_url}`);
    lines.push('---');
    lines.push('');
    lines.push('# Parity validator report');
    lines.push('');
    lines.push('## Summary');
    lines.push(`- Total fingerprints checked: ${report.total_fingerprints}`);
    lines.push(`- Total properties compared: ${report.total_properties_compared}`);
    lines.push(`- Deltas exceeding threshold: ${report.total_deltas}`);
    lines.push(`  - Major: ${report.deltas_by_severity.Major}`);
    lines.push(`  - Important: ${report.deltas_by_severity.Important}`);
    lines.push(`  - Minor: ${report.deltas_by_severity.Minor}`);
    lines.push('');
    lines.push('## Font loading');
    for (const v of report.viewports_tested) {
        const m = report.font_report.mockup[v];
        const s = report.font_report.sgs[v];
        lines.push(`### ${v}px`);
        lines.push(`- Mockup: ${m.loaded}/${m.total} loaded, ${m.failed} failed, ${m.stuck} stuck`);
        if (m.failedFamilies.length) lines.push(`  - Failed: ${m.failedFamilies.join('; ')}`);
        if (m.stuckFamilies.length) lines.push(`  - Stuck: ${m.stuckFamilies.join('; ')}`);
        lines.push(`- SGS: ${s.loaded}/${s.total} loaded, ${s.failed} failed, ${s.stuck} stuck`);
        if (s.failedFamilies.length) lines.push(`  - Failed: ${s.failedFamilies.join('; ')}`);
        if (s.stuckFamilies.length) lines.push(`  - Stuck: ${s.stuckFamilies.join('; ')}`);
    }
    lines.push('');
    lines.push('## Deltas by viewport');
    for (const v of report.viewports_tested) {
        const rows = report.deltas.filter(d => d.viewport === v);
        lines.push('');
        lines.push(`### ${v}px`);
        if (rows.length === 0) {
            lines.push('No deltas exceeding threshold.');
            continue;
        }
        lines.push('');
        lines.push('| Selector (SGS) | Property | Mockup | SGS | Δ | Severity |');
        lines.push('|---|---|---|---|---|---|');
        for (const d of rows) {
            const deltaCell = d.deltaPx != null ? `${d.deltaPx}px (${d.deltaPct}%)` : '—';
            lines.push(`| \`${d.sgsSelector}\` | ${d.property} | ${d.mockup} | ${d.sgs} | ${deltaCell} | ${d.severity} |`);
        }
    }
    lines.push('');
    lines.push(`verdict: ${report.verdict}`);
    lines.push('');
    return lines.join('\n');
}

async function main() {
    const args = parseArgs(process.argv);

    if (!args.mockup || !args.sgs || !args.fingerprint) {
        console.error('Usage: node mockup-parity-validator.js --mockup <url> --sgs <url> --fingerprint <path> [--viewports 375,1440] [--out <md-path>]');
        process.exit(1);
    }
    if (!fs.existsSync(args.fingerprint)) {
        console.error(`Fingerprint file not found: ${args.fingerprint}`);
        process.exit(1);
    }
    const fingerprint = JSON.parse(fs.readFileSync(args.fingerprint, 'utf8'));

    const outMd = args.out || path.join('reports', 'parity', `${hostnameOf(args.sgs)}-${new Date().toISOString().slice(0, 10)}.md`);
    const outJson = outMd.replace(/\.md$/, '.json');
    ensureDir(outMd);

    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const results = {};

    try {
        for (const v of args.viewports) {
            console.log(`\n[${v}px] Capturing mockup...`);
            const mockupSide = await captureSide(browser, args.mockup, v, fingerprint, 'mockup');
            console.log(`[${v}px] mockup cookies: ${mockupSide.cookieCount}, fonts: ${mockupSide.fonts.fonts.length}`);

            console.log(`[${v}px] Capturing SGS...`);
            const sgsSide = await captureSide(browser, args.sgs, v, fingerprint, 'sgs');
            console.log(`[${v}px] SGS cookies: ${sgsSide.cookieCount}, fonts: ${sgsSide.fonts.fonts.length}`);

            results[v] = { mockupSide, sgsSide };
        }
    } finally {
        await browser.close();
    }

    const report = buildJsonReport({
        mockupUrl: args.mockup,
        sgsUrl: args.sgs,
        viewports: args.viewports,
        fingerprint,
        results,
    });

    fs.writeFileSync(outJson, JSON.stringify(report, null, 2));
    fs.writeFileSync(outMd, renderMarkdown(report));

    // Console summary
    console.log('\n========================================');
    console.log(`verdict: ${report.verdict}`);
    console.log(`fonts_loaded: ${report.fonts_loaded}`);
    console.log(`Total deltas: ${report.total_deltas} (Major: ${report.deltas_by_severity.Major}, Important: ${report.deltas_by_severity.Important}, Minor: ${report.deltas_by_severity.Minor})`);
    for (const v of args.viewports) {
        const c = report.deltas.filter(d => d.viewport === v).length;
        console.log(`  ${v}px: ${c} deltas`);
    }
    console.log(`Report (md):   ${outMd}`);
    console.log(`Report (json): ${outJson}`);
    console.log('========================================');

    process.exit(report.verdict === 'PASS' ? 0 : 1);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
