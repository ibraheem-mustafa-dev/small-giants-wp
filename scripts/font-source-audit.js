#!/usr/bin/env node
/**
 * Font source audit — static analysis for external CDN URLs in theme.json fontFace declarations.
 *
 * SGS Framework rule: all fonts must be self-hosted as WOFF2 files under
 * theme/sgs-theme/assets/fonts/. External CDN font sources (fonts.gstatic.com,
 * fonts.googleapis.com, etc.) silently fail on CSP-locked servers and block
 * browsers that have cross-origin restrictions — the fallback font loads instead,
 * with no console error visible in standard QA.
 *
 * Scans:
 *   - theme/sgs-theme/theme.json
 *   - theme/sgs-theme/styles/*.json (all style variations)
 *
 * Usage:
 *   node scripts/font-source-audit.js
 *   node scripts/font-source-audit.js --report .claude/reports/font-audit.json
 *
 * Exit code 0 = clean, 1 = external CDN font source found.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(__dirname, '..');

const SCAN_TARGETS = [
    path.join(REPO_ROOT, 'theme', 'sgs-theme', 'theme.json'),
    ...glob(path.join(REPO_ROOT, 'theme', 'sgs-theme', 'styles'), '*.json'),
];

// Any https:// URL in fontFace[].src is an external CDN reference.
const EXTERNAL_PATTERN = /^https?:\/\//i;

// ── Helpers ─────────────────────────────────────────────────────────────────

function glob(dir, pattern) {
    if (!fs.existsSync(dir)) return [];
    const re = new RegExp('^' + pattern.replace('*', '.*') + '$');
    return fs.readdirSync(dir)
        .filter(f => re.test(f))
        .map(f => path.join(dir, f));
}

function extractFontFamilies(json) {
    try {
        return json?.settings?.typography?.fontFamilies ?? [];
    } catch {
        return [];
    }
}

// ── Main ─────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
    const args = { report: null };
    for (let i = 2; i < argv.length; i++) {
        if (argv[i] === '--report') args.report = argv[++i];
    }
    return args;
}

const args       = parseArgs(process.argv);
const violations = [];
let   filesOk    = 0;

for (const filePath of SCAN_TARGETS) {
    if (!fs.existsSync(filePath)) continue;

    let json;
    try {
        json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
        console.error(`[ERROR] Could not parse ${filePath}: ${e.message}`);
        continue;
    }

    const families = extractFontFamilies(json);
    let fileClean = true;

    for (const family of families) {
        const faces = Array.isArray(family.fontFace) ? family.fontFace : [];
        for (const face of faces) {
            const sources = Array.isArray(face.src) ? face.src : [face.src].filter(Boolean);
            for (const src of sources) {
                if (typeof src === 'string' && EXTERNAL_PATTERN.test(src)) {
                    violations.push({
                        file:       path.relative(REPO_ROOT, filePath),
                        fontFamily: family.fontFamily || family.slug || '(unknown)',
                        badSrc:     src,
                    });
                    fileClean = false;
                }
            }
        }
    }

    if (fileClean) filesOk++;
}

// ── Report ───────────────────────────────────────────────────────────────────

if (violations.length === 0) {
    console.log(`[OK] font-source-audit — all ${SCAN_TARGETS.length} files clean. No external CDN font sources.`);
} else {
    for (const v of violations) {
        console.log(`
[CRITICAL] external-font-cdn
  File:       ${v.file}
  FontFamily: ${v.fontFamily}
  Bad src:    ${v.badSrc}
  Fix:        Self-host the font in theme/sgs-theme/assets/fonts/<family>/ and use file:./assets/fonts/<family>/<file>.woff2
`);
    }
    console.log(`${violations.length} violation(s) found across ${SCAN_TARGETS.length} scanned file(s).`);
}

if (args.report) {
    const report = {
        timestamp:       new Date().toISOString(),
        scanned:         SCAN_TARGETS.length,
        clean:           filesOk,
        violationCount:  violations.length,
        violations,
    };
    const dir = path.dirname(args.report);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(args.report, JSON.stringify(report, null, 2));
    console.log(`Report written to ${args.report}`);
}

process.exit(violations.length > 0 ? 1 : 0);
