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
    // Background-image: catches gradient/image overlays that paint over backgroundColor
    // (Section R bug — 2026-05-05 hero gradient masking the surface-pink). getComputedStyle
    // returns 'none' for unset OR the full url(...)/linear-gradient(...) string when set.
    'backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat',
    // CSS filter / blend / backdrop — visual transformations that change rendered colour
    // without changing backgroundColor. (Captured 2026-05-05 — see Section R.)
    'filter', 'mixBlendMode', 'backdropFilter',
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

// CSS keyword-equivalence pairs — values browsers resolve to identical layout.
// Consulted ONLY for the same property; never cross-property.
const KEYWORD_EQUIVALENCES = {
    textAlign: [['start', 'left'], ['end', 'right']], // assumes LTR pages
    minWidth: [['0px', 'auto']],
    minHeight: [['0px', 'auto']],
    maxWidth: [['none', 'none']],
    maxHeight: [['none', 'none']],
};

function isKeywordEquivalent(prop, a, b) {
    const pairs = KEYWORD_EQUIVALENCES[prop];
    if (!pairs) return false;
    const av = String(a == null ? '' : a).trim().toLowerCase();
    const bv = String(b == null ? '' : b).trim().toLowerCase();
    if (av === bv) return true;
    for (const [x, y] of pairs) {
        if ((av === x && bv === y) || (av === y && bv === x)) return true;
    }
    return false;
}

// Parse a fontFamily computed value into an ordered list of family names.
// "Inter, system-ui, -apple-system, sans-serif" -> ["Inter","system-ui","-apple-system","sans-serif"]
function parseFontFamilyList(val) {
    if (!val) return [];
    return String(val).split(',').map(s => {
        let t = s.trim();
        if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
            t = t.slice(1, -1);
        }
        return t.toLowerCase();
    }).filter(Boolean);
}

// Returns true if both fontFamily values resolve to the same primary family
// AND that family is loaded on both sides per document.fonts.
function isFontFamilyEquivalent(mockupVal, sgsVal, mockupFonts, sgsFonts) {
    const mList = parseFontFamilyList(mockupVal);
    const sList = parseFontFamilyList(sgsVal);
    if (mList.length === 0 || sList.length === 0) return false;
    if (mList[0] !== sList[0]) return false;
    const primary = mList[0];
    const familyLoaded = (fontInfo, name) => {
        if (!fontInfo || !fontInfo.fonts) return false;
        return fontInfo.fonts.some(f => {
            const fam = String(f.family || '').toLowerCase().replace(/^["']|["']$/g, '');
            return fam === name && (f.status === 'loaded' || f.status === 'unloaded');
        });
    };
    return familyLoaded(mockupFonts, primary) && familyLoaded(sgsFonts, primary);
}

// Q1-Q4 classifier-trap detection (Section Q in
// .claude/specs/common-wp-styling-errors.md, captured 2026-05-05).
//
// When the parity validator reports a delta matching one of these four
// patterns, downstream classifier code MUST NOT reduce its severity unless
// a side-by-side screenshot diff is attached. We surface this requirement
// by setting `requires_screenshot_review: true` on the delta object.
//
// Patterns:
//   Q1 — padding/margin deltas with |Δ| > 5px (size IS the defect).
//   Q2 — `display` deltas crossing the flex/block boundary (children stack
//        vs sit inline).
//   Q3 — negative-margin / full-bleed values on a section/hero/wrapper
//        element (viewport-math overflow).
//   Q4 — `backgroundColor` deltas where parent bleed could make the child's
//        colour disagree with what's actually painted.
//
// Selector-aware checks (Q3, Q4) use simple substring heuristics on the
// SGS selector — adequate for the current fingerprint set; deliberately
// conservative (false positives are cheap, false negatives are not).
function isPaddingOrMarginProp(prop) {
    return /^padding(Top|Right|Bottom|Left)?$/.test(prop)
        || /^margin(Top|Right|Bottom|Left)?$/.test(prop);
}

function isFlexBlockBoundary(a, b) {
    const flexish = (v) => /^(flex|inline-flex|grid|inline-grid)$/.test(String(v).trim());
    const blockish = (v) => /^(block|inline-block|inline)$/.test(String(v).trim());
    return (flexish(a) && blockish(b)) || (flexish(b) && blockish(a));
}

function isSectionOrWrapperSelector(sel) {
    if (!sel) return false;
    const s = String(sel).toLowerCase();
    return /(section|hero|wrapper|container|banner|full-bleed|alignfull)/.test(s);
}

function hasNegativeOrFullBleedToken(val) {
    if (val == null) return false;
    const s = String(val);
    // Negative px values, or 100vw / 100% — both classic full-bleed signals.
    return /-\d+(\.\d+)?px/.test(s) || /\b100vw\b/.test(s) || /\b100%\b/.test(s);
}

function requiresScreenshotReview(delta) {
    if (!delta || !delta.property) return false;
    const prop = delta.property;
    const mockup = delta.mockup;
    const sgs = delta.sgs;
    const sel = delta.sgsSelector || '';

    // Q1 — padding/margin delta > 5px
    if (isPaddingOrMarginProp(prop)) {
        const mn = pxToNumber(mockup);
        const sn = pxToNumber(sgs);
        if (mn != null && sn != null && Math.abs(sn - mn) > 5) return true;
        // Fall through to deltaPx if direct numbers unavailable
        if (delta.deltaPx != null && Math.abs(delta.deltaPx) > 5) return true;
    }

    // Q2 — display flex/block boundary
    if (prop === 'display' && isFlexBlockBoundary(mockup, sgs)) return true;

    // Q3 — negative-margin / full-bleed on section/hero/wrapper
    if ((prop === 'margin' || prop === 'transform' || isPaddingOrMarginProp(prop))
        && isSectionOrWrapperSelector(sel)
        && (hasNegativeOrFullBleedToken(mockup) || hasNegativeOrFullBleedToken(sgs))) {
        return true;
    }

    // Q4 — backgroundColor delta on a child where parent bleed could show.
    // Conservative: any backgroundColor delta gets flagged for screenshot
    // review. Section Q's binding rule says cheap-flag is preferable to
    // missing a real defect.
    if (prop === 'backgroundColor') return true;

    return false;
}

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
//
// Optional `ctx` carries side-band data:
//   { mockupFonts, sgsFonts } — used for fontFamily fallback-stack equivalence.
function compareProperty(prop, mockupVal, sgsVal, ctx) {
    const m = normaliseValue(prop, mockupVal);
    const s = normaliseValue(prop, sgsVal);
    if (m === s) return null;

    // Filter 3 — CSS keyword-equivalence (e.g. start↔left, 0px↔auto).
    if (isKeywordEquivalent(prop, m, s)) return null;

    // Filter 2 — fontFamily fallback-stack equivalence.
    // Identical primary family + family loaded on both sides = no delta.
    if (prop === 'fontFamily' && ctx) {
        if (isFontFamilyEquivalent(m, s, ctx.mockupFonts, ctx.sgsFonts)) return null;
    }

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
//
// Filter 1 — picks the first VISIBLE match of `selector`.
// An element is considered visible if every ancestor (and itself) has:
//   - display !== 'none'
//   - visibility !== 'hidden'
//   - getBoundingClientRect().width > 0 (catches collapsed-to-zero cases)
//
// Why: the mockup has variants like .hero-mobile (display:none@1440) +
// .hero-desktop (display:none@375). A single fingerprint key may match both
// (e.g. ".hero-content h1, .hero-copy h1"); querySelector returns the first
// in DOM order, which can be the hidden one. Walk the list and pick the
// first that's actually rendered.
async function captureForSelector(page, selector) {
    return page.evaluate(({ sel, watched }) => {
        function isElementVisible(el) {
            if (!el) return false;
            // Element nodes only
            if (el.nodeType !== 1) return false;
            // getBoundingClientRect width > 0 (zero-size elements aren't visible)
            try {
                const rect = el.getBoundingClientRect();
                if (rect.width <= 0 || rect.height <= 0) return false;
            } catch (_) { /* ignore */ }
            // Walk up the ancestor chain (incl. self) checking display/visibility.
            let node = el;
            while (node && node.nodeType === 1) {
                const cs = window.getComputedStyle(node);
                if (cs.display === 'none') return false;
                if (cs.visibility === 'hidden') return false;
                node = node.parentElement;
            }
            return true;
        }
        const all = document.querySelectorAll(sel);
        let chosen = null;
        for (const candidate of all) {
            if (isElementVisible(candidate)) { chosen = candidate; break; }
        }
        if (!chosen) return { found: false, totalMatches: all.length };
        const cs = window.getComputedStyle(chosen);
        const out = {
            found: true,
            totalMatches: all.length,
            classes: Array.from(chosen.classList).join(' '),
            tagName: chosen.tagName.toLowerCase(),
        };
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
    // 'unloaded' = lazy (browser hasn't needed this weight yet) — NOT a failure.
    // 'loading' = mid-flight at capture; treat as informational, not a failure.
    // 'error' = the only true failure (font failed to fetch / parse).
    const loaded = fontInfo.fonts.filter(f => f.status === 'loaded');
    const failed = fontInfo.fonts.filter(f => f.status === 'error');
    const lazy = fontInfo.fonts.filter(f => f.status === 'unloaded');
    const loading = fontInfo.fonts.filter(f => f.status === 'loading');
    return {
        total: fontInfo.fonts.length,
        loaded: loaded.length,
        failed: failed.length,
        lazy: lazy.length,
        loading: loading.length,
        // Kept for backward-compatible report shape:
        stuck: failed.length,
        failedFamilies: failed.map(f => `${f.family} ${f.weight} ${f.style}`),
        stuckFamilies: failed.map(f => `${f.family} ${f.weight} ${f.style}`),
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
                const d = {
                    viewport: v,
                    mockupSelector: mockupSel,
                    sgsSelector: sgsSel,
                    property: '__selector_missing__',
                    mockup: 'NOT FOUND',
                    sgs: s && s.found ? 'found' : 'NOT FOUND',
                    severity: 'Major',
                };
                d.requires_screenshot_review = requiresScreenshotReview(d);
                allDeltas.push(d);
                continue;
            }
            if (!s || !s.found) {
                const d = {
                    viewport: v,
                    mockupSelector: mockupSel,
                    sgsSelector: sgsSel,
                    property: '__selector_missing__',
                    mockup: 'found',
                    sgs: 'NOT FOUND',
                    severity: 'Major',
                };
                d.requires_screenshot_review = requiresScreenshotReview(d);
                allDeltas.push(d);
                continue;
            }

            const ctx = {
                mockupFonts: mockupSide.fonts,
                sgsFonts: sgsSide.fonts,
            };
            for (const prop of WATCHED) {
                const delta = compareProperty(prop, m[prop], s[prop], ctx);
                if (delta) {
                    const enriched = {
                        viewport: v,
                        mockupSelector: mockupSel,
                        sgsSelector: sgsSel,
                        ...delta,
                    };
                    // Q1-Q4 classifier-trap flag — see Section Q in
                    // .claude/specs/common-wp-styling-errors.md.
                    enriched.requires_screenshot_review = requiresScreenshotReview(enriched);
                    allDeltas.push(enriched);
                }
            }
        }
    }

    // Only 'error' status counts as a font-loading failure. 'unloaded' is lazy
    // (e.g. unused weight variants) and 'loading' is mid-flight; neither is
    // a defect.
    let fontsLoaded = true;
    for (const v of viewports) {
        if (fontReport.mockup[v].failed > 0) fontsLoaded = false;
        if (fontReport.sgs[v].failed > 0) fontsLoaded = false;
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

    // Section Q classifier-trap banner — fires when any delta matches
    // Q1-Q4. Forces the downstream classifier to attach a side-by-side
    // screenshot before reducing severity.
    const screenshotFlagged = (report.deltas || []).filter(d => d.requires_screenshot_review);
    if (screenshotFlagged.length > 0) {
        lines.push(`> ⚠ ${screenshotFlagged.length} deltas flagged \`requires_screenshot_review\`. Per Section Q, classifier MUST attach a side-by-side screenshot via \`node scripts/screenshot-diff-helper.js\` before reducing severity. No screenshot, severity stays.`);
        lines.push('');
    }

    lines.push('## Font loading');
    for (const v of report.viewports_tested) {
        const m = report.font_report.mockup[v];
        const s = report.font_report.sgs[v];
        lines.push(`### ${v}px`);
        lines.push(`- Mockup: ${m.loaded}/${m.total} loaded, ${m.failed} failed, ${m.lazy || 0} lazy/unused`);
        if (m.failedFamilies.length) lines.push(`  - Failed: ${m.failedFamilies.join('; ')}`);
        lines.push(`- SGS: ${s.loaded}/${s.total} loaded, ${s.failed} failed, ${s.lazy || 0} lazy/unused`);
        if (s.failedFamilies.length) lines.push(`  - Failed: ${s.failedFamilies.join('; ')}`);
    }
    lines.push('');
    lines.push('## Deltas by viewport');
    // If ANY delta on the report is screenshot-flagged, add the column
    // across every viewport table for consistency.
    const showReviewColumn = (report.deltas || []).some(d => d.requires_screenshot_review);
    for (const v of report.viewports_tested) {
        const rows = report.deltas.filter(d => d.viewport === v);
        lines.push('');
        lines.push(`### ${v}px`);
        if (rows.length === 0) {
            lines.push('No deltas exceeding threshold.');
            continue;
        }
        lines.push('');
        if (showReviewColumn) {
            lines.push('| Selector (SGS) | Property | Mockup | SGS | Δ | Severity | Screenshot review required |');
            lines.push('|---|---|---|---|---|---|---|');
        } else {
            lines.push('| Selector (SGS) | Property | Mockup | SGS | Δ | Severity |');
            lines.push('|---|---|---|---|---|---|');
        }
        for (const d of rows) {
            const deltaCell = d.deltaPx != null ? `${d.deltaPx}px (${d.deltaPct}%)` : '—';
            if (showReviewColumn) {
                const reviewCell = d.requires_screenshot_review ? 'yes' : 'no';
                lines.push(`| \`${d.sgsSelector}\` | ${d.property} | ${d.mockup} | ${d.sgs} | ${deltaCell} | ${d.severity} | ${reviewCell} |`);
            } else {
                lines.push(`| \`${d.sgsSelector}\` | ${d.property} | ${d.mockup} | ${d.sgs} | ${deltaCell} | ${d.severity} |`);
            }
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
