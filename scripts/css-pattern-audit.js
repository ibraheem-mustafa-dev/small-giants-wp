#!/usr/bin/env node
/**
 * CSS pattern audit — static analysis for risky patterns in deployed/built CSS.
 *
 * Catches defect classes that screenshots miss because they manifest during
 * sub-second time windows. Run before any deploy (L8 visual-qa layer).
 *
 * Usage:
 *   node scripts/css-pattern-audit.js [--dir plugins/sgs-blocks/build] [--report <path>]
 *   node scripts/css-pattern-audit.js --file plugins/sgs-blocks/src/blocks/hero/style.css
 *
 * Exit code 0 = clean, 1 = violations found.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_DIRS = [
    'plugins/sgs-blocks/build',
    'plugins/sgs-blocks/src',
    'theme/sgs-theme',
];

function parseArgs(argv) {
    const args = { dirs: DEFAULT_DIRS, files: [], report: null };
    for (let i = 2; i < argv.length; i++) {
        if (argv[i] === '--dir') args.dirs = [argv[++i]];
        else if (argv[i] === '--file') args.files.push(argv[++i]);
        else if (argv[i] === '--report') args.report = argv[++i];
    }
    return args;
}

function extractRuleBlocks(cssContent) {
    const blocks = [];
    const lines = cssContent.split('\n');
    let inBlock = false;
    let braceDepth = 0;
    let currentSelector = '';
    let currentProps = {};
    let blockStart = 0;
    let mediaContext = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith('@keyframes')) {
            // Skip keyframe blocks entirely
            let depth = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
            while (depth > 0 && i < lines.length - 1) {
                i++;
                depth += (lines[i].match(/\{/g) || []).length;
                depth -= (lines[i].match(/\}/g) || []).length;
            }
            continue;
        }

        if (line.startsWith('@media')) {
            mediaContext = line.replace(/\{.*$/, '').trim();
            continue;
        }

        if (!inBlock && line.includes('{') && !line.startsWith('//') && !line.startsWith('*')) {
            currentSelector = line.replace(/\{.*$/, '').trim();
            if (mediaContext) currentSelector = `${mediaContext} → ${currentSelector}`;
            currentProps = {};
            blockStart = i + 1;
            inBlock = true;
            braceDepth = 1;
            continue;
        }

        if (inBlock) {
            braceDepth += (line.match(/\{/g) || []).length;
            braceDepth -= (line.match(/\}/g) || []).length;

            if (braceDepth <= 0) {
                if (Object.keys(currentProps).length > 0) {
                    blocks.push({ selector: currentSelector, properties: currentProps, lineStart: blockStart });
                }
                inBlock = false;
                currentSelector = '';
                currentProps = {};
                if (braceDepth < 0) mediaContext = '';
            } else if (line.includes(':') && !line.startsWith('//') && !line.startsWith('*')) {
                const colonIdx = line.indexOf(':');
                const prop = line.substring(0, colonIdx).trim().toLowerCase();
                const val = line.substring(colonIdx + 1).replace(/;.*$/, '').trim();
                if (prop && val) currentProps[prop] = val;
            }
        }
    }

    return blocks;
}

function delayToMs(delayStr) {
    if (!delayStr) return 0;
    const val = parseFloat(delayStr);
    if (isNaN(val)) return 0;
    return delayStr.includes('ms') ? val : val * 1000;
}

function parseCSSAnimations(content, filePath) {
    const violations = [];
    const ruleBlocks = extractRuleBlocks(content);

    // Cross-block pass: if ANY block in the file has animation with `both` fill-mode
    // AND ANY other block in the same file has a non-zero animation-delay, that's M1.
    // This catches the common pattern where fill-mode is on a shared selector and
    // individual delays are on separate per-element selectors.
    const blocksWithBoth = ruleBlocks.filter(b => {
        const a = b.properties['animation'];
        const f = b.properties['animation-fill-mode'];
        return (a && /\bboth\b/.test(a)) || f === 'both' || f === 'forwards';
    });
    const blocksWithDelay = ruleBlocks.filter(b => {
        const d = b.properties['animation-delay'];
        return d && delayToMs(d) > 0;
    });
    if (blocksWithBoth.length > 0 && blocksWithDelay.length > 0) {
        for (const delayBlock of blocksWithDelay) {
            violations.push({
                type: 'M1-animation-first-paint',
                severity: 'CRITICAL',
                file: filePath,
                line: delayBlock.lineStart,
                selector: delayBlock.selector,
                value: `animation-delay: ${delayBlock.properties['animation-delay']}`,
                message: `Selector '${delayBlock.selector}' has animation-delay:${delayBlock.properties['animation-delay']} AND the file contains animation-fill-mode:both on a shared selector ('${blocksWithBoth[0].selector}'). This combination makes the element invisible during the delay window at first paint (M1 defect).`,
                fix: 'Remove fill-mode:both from the shared animation rule, or set all delays to 0, or move animations to opt-in block attribute (enableEntranceAnimation: boolean, default false).',
            });
        }
    }

    for (const block of ruleBlocks) {
        const { selector, properties, lineStart } = block;
        const animShorthand = properties['animation'];
        const fillMode = properties['animation-fill-mode'];
        const delayProp = properties['animation-delay'];
        const animName = properties['animation-name'];

        // M1 pattern via shorthand: animation: <name> <duration> <easing> <delay> ... both
        if (animShorthand) {
            const hasBoth = /\bboth\b/.test(animShorthand);
            // Shorthand order: name duration timing-function delay iteration-count direction fill-mode play-state
            // Extract delay: 2nd time value in the shorthand
            const timeValues = [...animShorthand.matchAll(/(\d+\.?\d*)(s|ms)/g)].map(m => ({
                val: parseFloat(m[1]),
                unit: m[2],
                ms: m[2] === 's' ? parseFloat(m[1]) * 1000 : parseFloat(m[1]),
            }));
            const delay = timeValues.length >= 2 ? timeValues[1] : null;
            const hasNonZeroDelay = delay && delay.ms > 0;

            if (hasBoth && hasNonZeroDelay) {
                violations.push({
                    type: 'M1-animation-first-paint',
                    severity: 'CRITICAL',
                    file: filePath,
                    line: lineStart,
                    selector,
                    value: animShorthand,
                    message: `animation shorthand has fill-mode:both AND delay ${delay.val}${delay.unit} — element will be invisible during the delay window at first paint (M1 defect).`,
                    fix: 'Remove fill-mode:both, or set delay to 0, or make animation an opt-in block attribute (enableEntranceAnimation: boolean, default false).',
                });
            }
        }

        // M1 pattern via separate properties
        if ((fillMode === 'both' || fillMode === 'forwards') && delayProp) {
            const delayMs = delayToMs(delayProp);
            if (delayMs > 0) {
                violations.push({
                    type: 'M1-animation-first-paint',
                    severity: 'CRITICAL',
                    file: filePath,
                    line: lineStart,
                    selector,
                    value: `fill-mode:${fillMode} + delay:${delayProp}`,
                    message: `animation-fill-mode:${fillMode} with delay ${delayProp} — element invisible during delay at first paint (M1 defect).`,
                    fix: 'Remove fill-mode:both/forwards, set delay to 0, or move to opt-in block attribute.',
                });
            }
        }

        // Risk: fill-mode both without delay (safe now, risky if delay added later)
        if ((fillMode === 'both' || fillMode === 'forwards') && !delayProp && !animShorthand) {
            violations.push({
                type: 'animation-fill-mode-risk',
                severity: 'WARNING',
                file: filePath,
                line: lineStart,
                selector,
                value: `fill-mode:${fillMode}`,
                message: `animation-fill-mode:${fillMode} without explicit delay — safe now, but fragile. Adding a delay will cause M1.`,
                fix: 'Prefer fill-mode:none or document that delay must remain 0.',
            });
        }

        // Hardcoded animation on non-reduced-motion context
        if ((animShorthand || animName) && !selector.includes('@media')) {
            const name = animName || (animShorthand && animShorthand.split(/\s+/)[0]);
            if (name && name !== 'none' && !name.includes('ken-burns') && !name.startsWith('var(')) {
                violations.push({
                    type: 'hardcoded-entrance-animation',
                    severity: 'WARNING',
                    file: filePath,
                    line: lineStart,
                    selector,
                    value: name,
                    message: `Hardcoded animation '${name}' on '${selector}'. Entrance animations should be opt-in block attributes (enableEntranceAnimation: boolean, default false), not global CSS.`,
                    fix: 'Move to block.json attribute + render.php conditional. Only add the CSS class when attribute is true.',
                });
            }
        }
    }

    return violations;
}

function auditFileFast(filePath, content) {
    /**
     * Fast file-level regex scan for M1 pattern regardless of how rules are split
     * across selectors. If the file contains BOTH animation fill-mode:both AND
     * non-zero animation-delay anywhere, it is a critical M1 risk.
     */
    const violations = [];
    // Remove comments and @keyframe blocks for cleaner matching
    const stripped = content
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/@keyframes[^{]+\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, '');

    const hasBoth = /\banimation[^:]*:[^;]*\bboth\b/i.test(stripped)
        || /animation-fill-mode\s*:\s*both/i.test(stripped)
        || /animation-fill-mode\s*:\s*forwards/i.test(stripped);

    if (!hasBoth) return violations;

    // Find all non-zero animation-delay declarations and their line numbers
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
        const m = line.match(/animation-delay\s*:\s*(\d+\.?\d*)(s|ms)/i);
        if (!m) return;
        const ms = m[2] === 's' ? parseFloat(m[1]) * 1000 : parseFloat(m[1]);
        if (ms > 0) {
            // Extract selector from previous non-empty, non-comment line
            let selector = '(unknown)';
            for (let k = idx - 1; k >= Math.max(0, idx - 5); k--) {
                const prev = lines[k].trim();
                if (prev && !prev.startsWith('//') && !prev.startsWith('*') && !prev.startsWith('/*') && !prev.startsWith('@')) {
                    selector = prev.replace(/[{;].*/, '').trim();
                    break;
                }
            }
            violations.push({
                type: 'M1-animation-first-paint',
                severity: 'CRITICAL',
                file: filePath,
                line: idx + 1,
                selector,
                value: line.trim(),
                message: `animation-delay:${m[1]}${m[2]} combined with animation-fill-mode:both elsewhere in this file. Element will be invisible during the delay window at first paint (M1 defect from common-wp-styling-errors.md).`,
                fix: 'Remove fill-mode:both from the shared animation rule, or set all delays to 0ms, or move entrance animations to opt-in block attribute (enableEntranceAnimation: boolean, default false).',
            });
        }
    });

    return violations;
}

/**
 * H-10a — Background shorthand audit (Section R, 2026-05-06).
 *
 * Greps for `background: linear-gradient(...)` or `background: url(...)` in
 * any rule. For each match, checks whether the enclosing selector includes
 * `:not(.has-background)`.
 *
 * Why this matters: `background:` shorthand resets ALL background sub-properties
 * including `background-color`. When WordPress applies a palette colour via the
 * `.has-*-background-color` class (NOT via inline style), the shorthand silently
 * paints over it. The `:not(.has-background)` guard prevents this — WordPress
 * adds `.has-background` to ANY block that has a background colour or gradient set
 * via the editor. See common-wp-styling-errors.md Section R (R4) and H-9.
 *
 * Exemptions (NOT block-wrapper rules — cannot receive .has-background):
 *   - Rules on pseudo-elements (::before, ::after)
 *   - Rules on child elements inside the block (overlay divs, caption overlays, etc.)
 *   - Rules on state classes where the shorthand is the intentional state display
 *     (e.g. skeleton shimmer — `background:` should be `background-image:` but cannot
 *      receive `.has-background` since the skeleton class is never on the block wrapper)
 *
 * The audit flags ALL shorthand matches for human review; severity is `error` for
 * block-wrapper selectors (those without `::`, `__`, or specific inner-element tokens).
 */
function checkBackgroundShorthand(cssContent, filePath) {
    const violations = [];
    const lines = cssContent.split('\n');

    // Regex to find `background:` property with a gradient or url value.
    // Matches both single-line and the start of a multi-line declaration.
    const bgShorthandRe = /^\s*background\s*:\s*(linear-gradient|radial-gradient|url\s*\()/i;

    // Walk lines looking for the pattern, then back-track to find the enclosing selector.
    for (let i = 0; i < lines.length; i++) {
        if (!bgShorthandRe.test(lines[i])) continue;

        // Back-track to find selector (look up to 20 lines for an opening `{`)
        let selector = '(unknown)';
        for (let k = i - 1; k >= Math.max(0, i - 20); k--) {
            const t = lines[k].trim();
            if (t.endsWith('{')) {
                selector = t.replace(/\s*\{.*$/, '').trim();
                break;
            }
            if (t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('@') && t.includes('{')) {
                selector = t.replace(/\s*\{.*$/, '').trim();
                break;
            }
        }

        const hasGuard = selector.includes(':not(.has-background)');

        // Classify: is this a block-wrapper rule or an inner-element rule?
        // Inner-element signals: BEM `__` element separator, `::before`/`::after`,
        // known inner-element class fragments.
        const isInnerElement =
            selector.includes('::before') ||
            selector.includes('::after') ||
            selector.includes('__') ||      // BEM element
            /--skeleton|--shimmer|--overlay|--fade|--caption/.test(selector);

        if (hasGuard) {
            // Guard present — verify the shorthand is also converted to background-image.
            // Still flag if `background:` shorthand is used (should be `background-image:`).
            violations.push({
                type: 'R4-background-shorthand-longhand',
                severity: 'WARNING',
                file: filePath,
                line: i + 1,
                selector,
                value: lines[i].trim(),
                message: `Selector '${selector}' has :not(.has-background) guard (good) but uses 'background:' shorthand — prefer 'background-image:' to avoid resetting background-color (Section R, H-9).`,
                fix: "Replace 'background:' with 'background-image:' for the gradient/image value.",
            });
        } else if (isInnerElement) {
            // Inner element — no .has-background possible. Flag for shorthand→longhand conversion only.
            violations.push({
                type: 'R4-background-shorthand-inner',
                severity: 'WARNING',
                file: filePath,
                line: i + 1,
                selector,
                value: lines[i].trim(),
                message: `Inner-element selector '${selector}' uses 'background:' shorthand. Convert to 'background-image:' to avoid resetting background-color (Section R, H-9). No :not(.has-background) guard needed (inner element cannot receive the WP class).`,
                fix: "Replace 'background:' with 'background-image:'.",
            });
        } else {
            // Block-wrapper rule without guard — this IS the R4 defect pattern.
            violations.push({
                type: 'R4-background-shorthand-missing-has-background-guard',
                severity: 'CRITICAL',
                file: filePath,
                line: i + 1,
                selector,
                value: lines[i].trim(),
                message: `background shorthand without :not(.has-background) guard in ${filePath}:${i + 1} — will paint over user palette colours. Selector: '${selector}'. WordPress applies palette colours via .has-*-background-color class (NOT inline style), so :not([style*="background-color"]) alone does not prevent this.`,
                fix: "Add :not(.has-background) to selector AND replace 'background:' with 'background-image:'.",
            });
        }
    }

    return violations;
}

function auditFile(filePath) {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf8');
    // Fast file-level M1 check first (catches split-selector patterns that block parser misses)
    const fastViolations = auditFileFast(filePath, content);
    // Per-block structural checks
    const blockViolations = parseCSSAnimations(content, filePath);
    // H-10a — background shorthand audit (Section R)
    const bgViolations = checkBackgroundShorthand(content, filePath);
    // Merge, deduplicate by type+line
    const seen = new Set(fastViolations.map(v => `${v.type}:${v.line}`));
    const merged = [...fastViolations];
    for (const v of [...blockViolations, ...bgViolations]) {
        const key = `${v.type}:${v.line}`;
        if (!seen.has(key)) { seen.add(key); merged.push(v); }
    }
    return merged;
}

function walkCSSFiles(dir, results) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory() && e.name !== 'node_modules') walkCSSFiles(full, results);
        else if (e.isFile() && e.name.endsWith('.css')) results.push(full);
    }
}

function collectCSSFiles(dirs) {
    const files = [];
    for (const dir of dirs) {
        walkCSSFiles(dir, files);
    }
    return [...new Set(files)];
}

function main() {
    const args = parseArgs(process.argv);
    const repoRoot = process.cwd();

    const filesToAudit = args.files.length > 0
        ? args.files
        : collectCSSFiles(args.dirs.map(d => path.join(repoRoot, d)));

    if (filesToAudit.length === 0) {
        console.log('No CSS files found to audit.');
        process.exit(0);
    }

    console.log(`Auditing ${filesToAudit.length} CSS file(s)...\n`);

    const allViolations = [];
    for (const file of filesToAudit) {
        const violations = auditFile(file);
        if (violations.length > 0) {
            console.log(`  ${file}: ${violations.length} violation(s)`);
            allViolations.push(...violations);
        }
    }

    const critical = allViolations.filter(v => v.severity === 'CRITICAL');
    const warnings = allViolations.filter(v => v.severity === 'WARNING');

    console.log(`\n--- Summary ---`);
    console.log(`Files audited: ${filesToAudit.length}`);
    console.log(`Critical: ${critical.length}`);
    console.log(`Warnings: ${warnings.length}`);

    if (critical.length > 0) {
        console.log(`\n--- Critical violations (will FAIL pre-commit) ---`);
        for (const v of critical) {
            console.log(`\n[CRITICAL] ${v.type}`);
            console.log(`  File:     ${v.file}:${v.line}`);
            console.log(`  Selector: ${v.selector}`);
            console.log(`  Problem:  ${v.message}`);
            console.log(`  Fix:      ${v.fix}`);
        }
    }

    if (warnings.length > 0) {
        console.log(`\n--- Warnings (informational, will not block commit) ---`);
        for (const v of warnings) {
            console.log(`\n[WARNING] ${v.type}`);
            console.log(`  File:     ${v.file}:${v.line}`);
            console.log(`  Selector: ${v.selector}`);
            console.log(`  Problem:  ${v.message}`);
        }
    }

    if (args.report) {
        const reportDir = path.dirname(args.report);
        if (reportDir) fs.mkdirSync(reportDir, { recursive: true });
        fs.writeFileSync(args.report, JSON.stringify({
            auditedAt: new Date().toISOString(),
            filesAudited: filesToAudit.length,
            critical: critical.length,
            warnings: warnings.length,
            violations: allViolations,
        }, null, 2));
        console.log(`\nReport written to ${args.report}`);
    }

    process.exit(critical.length > 0 ? 1 : 0);
}

main();
