#!/usr/bin/env node
/**
 * Render.php inline-vs-media audit.
 *
 * Detects where render.php emits an inline desktop CSS value for a property
 * that should be overridden by an @media (max-width) rule in the block's
 * style.css, but the mobile rule lacks !important, so the inline style wins.
 *
 * This is defect F4 / M1-mobile from hero-poc-qc-2026-05-04.md:
 *   render.php emits style="padding: 56px 48px" (desktop value) as inline style.
 *   style.css has @media (max-width: 767px) { .sgs-hero__content { padding: 28px 20px 40px } }
 *   The @media rule CANNOT beat an inline style unless it has !important.
 *   Result: mobile gets desktop padding.
 *
 * Usage:
 *   node scripts/render-mobile-override-audit.js [--dir plugins/sgs-blocks/src/blocks]
 *   node scripts/render-mobile-override-audit.js --block hero
 *
 * Exit code 0 = clean, 1 = violations found.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_BLOCKS_DIR = 'plugins/sgs-blocks/src/blocks';

function parseArgs(argv) {
    const args = { blocksDir: DEFAULT_BLOCKS_DIR, block: null };
    for (let i = 2; i < argv.length; i++) {
        if (argv[i] === '--dir') args.blocksDir = argv[++i];
        else if (argv[i] === '--block') args.block = argv[++i];
    }
    return args;
}

function extractInlineStyleProps(renderPhpContent) {
    /**
     * Find all CSS property names emitted via inline style by render.php.
     * Looks for patterns like:
     *   $styles[] = 'padding: ...';
     *   $styles[] = 'font-size: ...';
     *   'style="padding: ...'
     *   sprintf( 'padding: %s', ... )
     * Returns array of { prop, lineNumber, line }
     */
    const props = [];
    const lines = renderPhpContent.split('\n');

    lines.forEach((line, idx) => {
        // Match $styles[] = 'property: ...' pattern
        const stylesMatch = line.match(/\$styles\[\s*\]\s*=\s*['"`]([a-z-]+)\s*:/i);
        if (stylesMatch) {
            props.push({ prop: stylesMatch[1].toLowerCase(), lineNumber: idx + 1, line: line.trim() });
            return;
        }

        // Match style=" direct emission
        const styleAttrMatch = line.match(/style=["']([a-z-]+)\s*:/i);
        if (styleAttrMatch) {
            props.push({ prop: styleAttrMatch[1].toLowerCase(), lineNumber: idx + 1, line: line.trim() });
            return;
        }

        // Match sprintf/printf with CSS property
        const sprintfMatch = line.match(/sprintf\s*\(\s*['"`]([a-z-]+)\s*:/i);
        if (sprintfMatch) {
            props.push({ prop: sprintfMatch[1].toLowerCase(), lineNumber: idx + 1, line: line.trim() });
        }
    });

    return props;
}

function extractMediaQueryProps(styleCSSContent) {
    /**
     * Find all CSS properties inside @media (max-width:...) blocks.
     * Returns array of { prop, mediaQuery, hasImportant, lineNumber, line }
     */
    const mobileProps = [];
    const lines = styleCSSContent.split('\n');
    let inMediaBlock = false;
    let mediaQuery = '';
    let braceDepth = 0;
    let inRule = false;
    let ruleDepth = 0;

    lines.forEach((line, idx) => {
        const trimmed = line.trim();

        // Detect @media (max-width:...)
        if (trimmed.startsWith('@media') && /max-width/i.test(trimmed)) {
            inMediaBlock = true;
            mediaQuery = trimmed.replace(/\{.*$/, '').trim();
            braceDepth = (trimmed.match(/\{/g) || []).length;
            return;
        }

        if (inMediaBlock) {
            braceDepth += (trimmed.match(/\{/g) || []).length;
            braceDepth -= (trimmed.match(/\}/g) || []).length;

            if (braceDepth <= 0) {
                inMediaBlock = false;
                mediaQuery = '';
                return;
            }

            // Find property declarations inside the media block
            if (trimmed.includes(':') && !trimmed.startsWith('@') && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
                const colonIdx = trimmed.indexOf(':');
                const prop = trimmed.substring(0, colonIdx).trim().toLowerCase();
                const value = trimmed.substring(colonIdx + 1).replace(/;.*$/, '').trim();
                const hasImportant = value.includes('!important') || trimmed.includes('!important');

                // Only care about layout/sizing/typography properties that inline styles can override
                const watchedProps = ['padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
                    'font-size', 'font-weight', 'line-height', 'letter-spacing', 'margin',
                    'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
                    'width', 'max-width', 'min-height', 'height', 'gap', 'flex-direction'];

                if (prop && watchedProps.includes(prop)) {
                    mobileProps.push({ prop, mediaQuery, hasImportant, lineNumber: idx + 1, line: trimmed });
                }
            }
        }
    });

    return mobileProps;
}

function auditBlock(blockDir, blockName) {
    const renderPath = path.join(blockDir, 'render.php');
    const stylePath = path.join(blockDir, 'style.css');

    if (!fs.existsSync(renderPath) || !fs.existsSync(stylePath)) return [];

    const renderContent = fs.readFileSync(renderPath, 'utf8');
    const styleContent = fs.readFileSync(stylePath, 'utf8');

    const inlineProps = extractInlineStyleProps(renderContent);
    const mobileProps = extractMediaQueryProps(styleContent);

    const violations = [];

    for (const inline of inlineProps) {
        // Find matching mobile override for same property
        const mobileOverride = mobileProps.find(m => m.prop === inline.prop);
        if (mobileOverride && !mobileOverride.hasImportant) {
            violations.push({
                type: 'F4-inline-beats-mobile',
                severity: 'CRITICAL',
                block: blockName,
                renderFile: renderPath,
                styleFile: stylePath,
                renderLine: inline.lineNumber,
                styleLine: mobileOverride.lineNumber,
                prop: inline.prop,
                renderCode: inline.line,
                styleCode: mobileOverride.line,
                mediaQuery: mobileOverride.mediaQuery,
                message: `render.php emits '${inline.prop}' as inline style (line ${inline.renderLine}), but style.css has a ${mobileOverride.mediaQuery} override (line ${mobileOverride.styleLine}) WITHOUT !important. Inline style wins — mobile override is silently ignored.`,
                fix: `Add !important to the mobile override rule: '${mobileOverride.line.replace(/;/, ' !important;')}'. Or move the desktop value into a @media (min-width: 768px) rule instead of inline style.`,
            });
        }
    }

    return violations;
}

function walkBlockDirs(dir) {
    const dirs = [];
    if (!fs.existsSync(dir)) return dirs;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
        if (e.isDirectory()) dirs.push({ name: e.name, path: path.join(dir, e.name) });
    }
    return dirs;
}

function main() {
    const args = parseArgs(process.argv);
    const repoRoot = process.cwd();
    const blocksDir = path.join(repoRoot, args.blocksDir);

    let blockDirs = walkBlockDirs(blocksDir);
    if (args.block) {
        blockDirs = blockDirs.filter(b => b.name === args.block);
    }

    if (blockDirs.length === 0) {
        console.log('No block directories found.');
        process.exit(0);
    }

    console.log(`Auditing ${blockDirs.length} block(s) for render.php inline-vs-mobile override issues...\n`);

    const allViolations = [];
    for (const { name, path: dir } of blockDirs) {
        const violations = auditBlock(dir, name);
        if (violations.length > 0) {
            console.log(`  sgs/${name}: ${violations.length} violation(s)`);
            allViolations.push(...violations);
        }
    }

    const critical = allViolations.filter(v => v.severity === 'CRITICAL');

    console.log(`\n--- Summary ---`);
    console.log(`Blocks audited: ${blockDirs.length}`);
    console.log(`Critical (inline beats mobile override): ${critical.length}`);

    if (critical.length > 0) {
        console.log(`\n--- Critical violations ---`);
        for (const v of critical) {
            console.log(`\n[CRITICAL] sgs/${v.block} — ${v.prop}`);
            console.log(`  render.php ${v.renderFile}:${v.renderLine}`);
            console.log(`    → ${v.renderCode}`);
            console.log(`  style.css  ${v.styleFile}:${v.styleLine} (${v.mediaQuery})`);
            console.log(`    → ${v.styleCode}`);
            console.log(`  Problem:   ${v.message}`);
            console.log(`  Fix:       ${v.fix}`);
        }
    }

    process.exit(critical.length > 0 ? 1 : 0);
}

main();
