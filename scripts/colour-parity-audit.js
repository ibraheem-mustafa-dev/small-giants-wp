#!/usr/bin/env node
/**
 * Colour Parity Audit — automated comparison between mockup HTML brief and SGS variation JSON.
 *
 * Why this exists:
 *   On 2026-05-05 Bean asked "Can't you just extract the colours directly from the draft and
 *   compare them to our theme's styles json file?". Yes — this script does that.
 *
 * What it does:
 *   1. Parses the mockup HTML's <style> block for :root CSS custom property declarations
 *      (--primary, --surface-pink, --text, etc.)
 *   2. Reads the SGS variation JSON: settings.color.palette[] + settings.custom.* nested colours
 *   3. Diffs them: matches mockup --variable → variation palette slug; reports value mismatches
 *
 * Usage:
 *   node scripts/colour-parity-audit.js --mockup <html-path> --variation <json-path>
 *   node scripts/colour-parity-audit.js --list-mockup-colours <html-path>
 *   node scripts/colour-parity-audit.js --list-variation-colours <json-path>
 *
 * Exit code 0 = parity OK, 1 = deltas found.
 */

const fs = require('fs');

function parseArgs(argv) {
    const args = { mockup: null, variation: null, listMockup: null, listVariation: null, json: false };
    for (let i = 2; i < argv.length; i++) {
        if (argv[i] === '--mockup') args.mockup = argv[++i];
        else if (argv[i] === '--variation') args.variation = argv[++i];
        else if (argv[i] === '--list-mockup-colours') args.listMockup = argv[++i];
        else if (argv[i] === '--list-variation-colours') args.listVariation = argv[++i];
        else if (argv[i] === '--json') args.json = true;
        else if (argv[i] === '--help' || argv[i] === '-h') {
            console.log('Usage: node scripts/colour-parity-audit.js --mockup <html> --variation <json>');
            process.exit(0);
        }
    }
    return args;
}

function normaliseColour(value) {
    if (!value) return null;
    let v = value.trim().toLowerCase().replace(/\/\*.*?\*\//g, '').trim();
    if (/^#[0-9a-f]{3,8}$/.test(v)) {
        if (v.length === 4) v = '#' + v.slice(1).split('').map(c => c + c).join('');
        if (v.length === 7 || v.length === 9) return v;
    }
    const rgbMatch = v.match(/^rgba?\(\s*(\d+)\s*,?\s*(\d+)\s*,?\s*(\d+)\s*(?:[,/]\s*([\d.]+))?\s*\)$/);
    if (rgbMatch) {
        const [, r, g, b, a] = rgbMatch;
        const hex = '#' + [r, g, b].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
        if (a !== undefined && parseFloat(a) < 1) {
            return hex + Math.round(parseFloat(a) * 255).toString(16).padStart(2, '0');
        }
        return hex;
    }
    const named = { white: '#ffffff', black: '#000000', transparent: 'transparent' };
    if (named[v]) return named[v];
    if (v.startsWith('var(')) return v;
    return null;
}

function extractMockupColours(htmlPath) {
    const content = fs.readFileSync(htmlPath, 'utf8');
    const colours = {};
    const rootRegex = /:root\s*\{([^}]*)\}/g;
    let match;
    while ((match = rootRegex.exec(content)) !== null) {
        const propRegex = /--([\w-]+)\s*:\s*([^;]+);/g;
        let propMatch;
        while ((propMatch = propRegex.exec(match[1])) !== null) {
            const [, name, rawValue] = propMatch;
            const normalised = normaliseColour(rawValue);
            if (normalised && (normalised.startsWith('#') || normalised === 'transparent' || normalised.startsWith('var('))) {
                colours[name] = { raw: rawValue.trim(), normalised };
            }
        }
    }
    const styleBlocks = [...content.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)];
    const usedHexes = new Set();
    for (const sb of styleBlocks) {
        for (const h of sb[1].matchAll(/#[0-9a-fA-F]{3,8}\b/g)) usedHexes.add(h[0].toLowerCase());
    }
    return { rootVariables: colours, usedHexes: Array.from(usedHexes).sort() };
}

function extractVariationColours(jsonPath) {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const palette = {};
    const custom = {};
    for (const p of (data.settings?.color?.palette || [])) {
        if (p.slug && p.color) palette[p.slug] = { raw: p.color, normalised: normaliseColour(p.color), name: p.name || p.slug };
    }
    function walkCustom(obj, pathPrefix = '') {
        if (typeof obj !== 'object' || obj === null) return;
        for (const [key, val] of Object.entries(obj)) {
            const fullPath = pathPrefix ? `${pathPrefix}.${key}` : key;
            if (typeof val === 'string') {
                const norm = normaliseColour(val);
                if (norm) custom[fullPath] = { raw: val, normalised: norm };
            } else if (typeof val === 'object') walkCustom(val, fullPath);
        }
    }
    walkCustom(data.settings?.custom || {});
    return { palette, custom };
}

function diff(mockup, variation) {
    const deltas = [];
    const matched = [];
    const mockupOnly = [];
    const variationOnly = [];
    for (const [name, mock] of Object.entries(mockup.rootVariables)) {
        const slugCandidates = [name, name.replace(/-/g, '_'), name.toLowerCase()];
        let matchedSlug = null;
        for (const slug of slugCandidates) {
            if (variation.palette[slug]) { matchedSlug = slug; break; }
        }
        if (matchedSlug) {
            const v = variation.palette[matchedSlug];
            if (mock.normalised === v.normalised) {
                matched.push({ name, slug: matchedSlug, mockup: mock.normalised, variation: v.normalised });
            } else {
                deltas.push({
                    type: 'value-mismatch', severity: 'Major',
                    name, slug: matchedSlug, mockup: mock.normalised, variation: v.normalised,
                    message: `Mockup --${name} = ${mock.normalised} but variation palette '${matchedSlug}' = ${v.normalised}`,
                });
            }
        } else if (mock.normalised && mock.normalised.startsWith('var(')) {
            matched.push({ name, slug: null, mockup: mock.normalised, variation: '(var ref)' });
        } else {
            mockupOnly.push({ name, value: mock.normalised, raw: mock.raw });
        }
    }
    for (const [slug, v] of Object.entries(variation.palette)) {
        const hasMatch = Object.keys(mockup.rootVariables).some(name => name === slug || name.replace(/-/g, '_') === slug);
        if (!hasMatch) variationOnly.push({ slug, value: v.normalised, name: v.name });
    }
    return { matched, deltas, mockupOnly, variationOnly };
}

function printReport(result, args) {
    if (args.json) { console.log(JSON.stringify(result, null, 2)); return; }
    const { matched, deltas, mockupOnly, variationOnly } = result;
    console.log(`\n=== Colour Parity Audit ===`);
    console.log(`Mockup:    ${args.mockup}`);
    console.log(`Variation: ${args.variation}\n`);
    console.log(`Matched (mockup --var === variation palette slug, same value): ${matched.length}`);
    for (const m of matched) {
        console.log(`  OK --${m.name} = ${m.mockup}` + (m.slug && m.slug !== m.name ? ` (matches slug '${m.slug}')` : ''));
    }
    console.log(`\nDeltas (mockup --var matches a slug but VALUE differs): ${deltas.length}`);
    for (const d of deltas) {
        console.log(`\n  FAIL [${d.severity}] --${d.name}`);
        console.log(`    mockup:    ${d.mockup}`);
        console.log(`    variation: ${d.variation} (slug '${d.slug}')`);
        console.log(`    Fix: update palette '${d.slug}' in variation JSON to '${d.mockup}'`);
    }
    console.log(`\nMockup-only (no matching variation slug): ${mockupOnly.length}`);
    for (const m of mockupOnly) console.log(`  WARN --${m.name} = ${m.value}`);
    console.log(`\nVariation-only (palette slug not used by mockup): ${variationOnly.length}`);
    for (const v of variationOnly) console.log(`  INFO palette '${v.slug}' = ${v.value} (${v.name})`);
    console.log(`\nVerdict: ${deltas.length === 0 ? 'PASS' : `FAIL (${deltas.length} mismatch)`}`);
}

function main() {
    const args = parseArgs(process.argv);
    if (args.listMockup) {
        const mockup = extractMockupColours(args.listMockup);
        if (args.json) { console.log(JSON.stringify(mockup, null, 2)); return; }
        console.log(`Mockup --variables (${args.listMockup}):\n`);
        for (const [name, info] of Object.entries(mockup.rootVariables)) {
            console.log(`  --${name} = ${info.normalised}`);
        }
        return;
    }
    if (args.listVariation) {
        const variation = extractVariationColours(args.listVariation);
        if (args.json) { console.log(JSON.stringify(variation, null, 2)); return; }
        console.log(`Variation palette (${args.listVariation}):\n`);
        for (const [slug, info] of Object.entries(variation.palette)) {
            console.log(`  ${slug.padEnd(20)} ${info.normalised}  (${info.name})`);
        }
        return;
    }
    if (!args.mockup || !args.variation) {
        console.error('--mockup and --variation are required (or --list-* flags). See --help.');
        process.exit(2);
    }
    const mockup = extractMockupColours(args.mockup);
    const variation = extractVariationColours(args.variation);
    const result = diff(mockup, variation);
    printReport(result, args);
    process.exit(result.deltas.length === 0 ? 0 : 1);
}

main();
