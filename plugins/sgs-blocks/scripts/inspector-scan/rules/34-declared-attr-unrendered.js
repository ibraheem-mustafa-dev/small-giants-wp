'use strict';

// GROUND-TRUTH: spec=.claude/plans/phase-shop-container-remediation.md "R-3 BATCH
// ENFORCEMENT-SCRIPT FIX — the register", subsection R3-e ("block.json declares ->
// render.php consumes it: LARGELY UNCOVERED — the biggest hole. No gate asserts a
// declared attr is read by render.php or the wrapper. This is the edge that would
// have caught the contentWidth class of defect.") The register's own instruction on
// shape: "Build the missing edge as an inspector-scan RULE, not as script #61 — it
// inherits the resolver and the baseline machinery for free."
//
// source=file evidence=live-read rule 21 (rules/21-render-without-control.js), which
// already resolves a block's RENDER corpus (own render.php/view.js/save.js/style.css
// PLUS shared includes/*.php the block actually calls, e.g. class-sgs-container-
// wrapper.php via `SGS_Container_Wrapper::render(`). Rule 21 asks the CONTROL-side
// question ("is a rendered attr reachable by an inspector control?"). This rule asks
// the orthogonal RENDER-side question the register names as the biggest hole: "is a
// DECLARED attr consumed by the render surface AT ALL" — irrespective of whether it
// has a control. That is a genuinely different edge (declared-vs-rendered, not
// rendered-vs-controlled), so it earns its own rule rather than a branch on 21.
//
// The render-corpus resolution machinery (readIfExists/renderCorpus/dynamicPartsOf/
// resolves/coreSupportedAttrs/DOC_ATTR_RE/SYSTEM_ATTR_RE) is DUPLICATED here from rule
// 21 rather than imported, deliberately — the same reasoning rule 21 itself gives for
// keeping its own component resolution local ("Blast radius stays inside rule 21."):
// widening a shared module to serve a second rule risks silently restaging that
// rule's own committed backlog (21's is 199), the exact "a write with an untraced
// reader propagates silently" shape this framework has been bitten by before. A
// shared core/render-corpus.js extraction is a legitimate FUTURE refactor once both
// rules' backlogs are stable, not a day-one requirement.
//
// ── THE CANONICAL PROBE (must never flag) ──────────────────────────────────────
// `contentWidth` on `sgs/container`: declared container/block.json:481, consumed by
// class-sgs-container-wrapper.php:424 (`$attributes['contentWidth'] ?? ''`) — a
// LITERAL bracket read inside the shared wrapper class, which container/render.php
// admits into its render corpus by calling `SGS_Container_Wrapper::render(`. This is
// the exact shape rule 21's `renderCorpus()`/`resolves()` already handle correctly,
// so re-using that machinery verbatim is what makes the probe pass by construction
// rather than by a bespoke carve-out (R-31-1/R-31-9 forbid a named exception).
//
// ── COMPUTED-KEY READS — THE HONEST-HANDLING DECISION ──────────────────────────
// `class-sgs-container-wrapper.php` also reads attributes through a COMPUTED key:
// `foreach ( array( 'alignContent' => 'align-content', ... ) as $sgs_attr => $x ) {
// if ( isset( $attributes[ $sgs_attr ] ) ) { ... } }` (~:2402-2418). The bracket
// expression is `$attributes[ $sgs_attr ]` — a bare-variable key, not a string
// literal and not a concat/interpolation shape `dynamicPartsOf()` can resolve. A
// human reading the surrounding foreach can see the array literal supplies the real
// keys, but parsing an arbitrary enclosing foreach's array-literal source reliably is
// a much bigger undertaking than this rule's scope, and getting it wrong either way
// is worse than declining to guess (survey-wrapper-capability.js, the sibling census
// script, independently reached the same conclusion and reports these as "UNRESOLVED
// computed-key reads" rather than resolving them).
//
// So: when a block's render corpus contains ANY bare-variable `$attributes[ $var ]`
// bracket read, this rule does NOT attempt to resolve which attribute names that
// covers. For every attribute in that block that isn't otherwise resolved (literal
// match, or a `dynamicPartsOf` suffix/prefix construction), it emits a DISTINCT,
// clearly-labelled `informational`-severity finding ("cannot be statically proven
// either way") instead of silently counting it as consumed (false green) or flagging
// it as dead (false positive). This is the one honest answer available without a
// much bigger parser, and is scoped PER-CORPUS (only blocks whose render corpus
// actually contains the unresolvable shape get the softer treatment) — a block with
// no computed-key reads anywhere in its corpus still gets the full warn-severity
// dead-declaration finding.

const fs = require( 'fs' );
const path = require( 'path' );
const { makeFinding } = require( '../core/finding' );

// Attribute keys that are documentation, not attributes (house convention, mirrored
// from rule 21 / check-dead-controls.js:342-352).
const DOC_ATTR_RE = /^(_comment|_note)/;

// Extension-injected attributes — structurally invisible to this rule for the same
// reason rule 21 excludes them: `inspector-scan` has no `extensionsDir` corpus wired
// into buildCtx's render side, so a genuine extension-owned `sgs*` attr would false-
// positive as "nothing renders it" when in fact `src/blocks/extensions/*.php` does.
const SYSTEM_ATTR_RE = /^sgs[A-Z_]/;

// ── The WORDPRESS-CORE render surface ───────────────────────────────────────────
// A block declaring a core `supports` flag gets that named attribute CONSUMED by
// WordPress core itself (get_block_wrapper_attributes(), the style engine, the
// typography/colour support classes) — never by the block's own render.php. Copied
// verbatim from rule 21's citations (re-verified against the same WP 7.0.3 core
// source reads, 2026-08-08) because the render-side question is identical: does
// *anything* consume this value, and core counts.
function coreSupportedAttrs( supports ) {
	const out = new Set();
	if ( ! supports || typeof supports !== 'object' ) return out;

	if ( supports.anchor ) out.add( 'anchor' );
	if ( supports.align ) out.add( 'align' );
	if ( supports.customClassName !== false ) out.add( 'className' );
	if ( supports.layout ) out.add( 'layout' );

	const colour = supports.color;
	if ( colour && typeof colour === 'object' ) {
		if ( colour.background ) out.add( 'backgroundColor' );
		if ( colour.text ) out.add( 'textColor' );
		if ( colour.gradients ) out.add( 'gradient' );
	}

	const type = supports.typography;
	if ( type && typeof type === 'object' ) {
		if ( type.fontSize ) out.add( 'fontSize' );
		if ( type.fontFamily ) out.add( 'fontFamily' );
		// No textAlign — core keeps that value in style.typography.textAlign, not a
		// named `textAlign` attribute, so a block's own `textAlign` attr is genuinely
		// its own to consume. See rule 21's fuller citation for the WP source proof.
	}

	return out;
}

// Files that constitute a block's own RENDER surface — what the framework paints.
// `save.js` is included deliberately: a STATIC block (save() returns real markup,
// no render.php) consumes its attributes there instead, and the brief for this rule
// names that explicitly ("for blocks that are save.js-rendered rather than dynamic
// — its save.js").
const OWN_RENDER_FILES = [ 'render.php', 'view.js', 'save.js', 'style.css' ];

// ── Dynamic key-construction shapes (verbatim copy of rule 21's, same corpus,
// same false-negative trap: a suffix/prefix built from a variable + a literal
// fragment, e.g. `sgs_typography_attr( $prefix, 'LineHeightTablet' )`). ─────────
const SUFFIX_SHAPES = [
	/\$\w+\s*\.\s*['"]([A-Z][A-Za-z0-9_]*)['"]/g,
	/\{\$\w+\}([A-Z][A-Za-z0-9_]*)/g,
	/\(\s*[\w$.[\]]+\s*,\s*['"]([A-Z][A-Za-z0-9_]*)['"]\s*\)/g,
	/\$\{[^}]*\}\s*([A-Z][A-Za-z0-9_]*)/g,
];

const PREFIX_SHAPES = [
	/`\s*([a-z][A-Za-z0-9_]*)\$\{/g,
	/['"]([a-z][A-Za-z0-9_]*)['"]\s*\.\s*\$\w+/g,
];

// Bare-variable bracket read on `$attributes` — the shape that CANNOT be resolved
// statically (no literal fragment to key off at all). Matched separately from the
// SUFFIX/PREFIX shapes above, which all require a literal fragment.
const COMPUTED_KEY_RE = /\$attributes\s*\[\s*\$[A-Za-z_]\w*\s*\]/;

function lcFirst( s ) {
	return s.charAt( 0 ).toLowerCase() + s.slice( 1 );
}

function dynamicPartsOf( corpus ) {
	const suffixes = new Set();
	const prefixes = new Set();
	for ( const re of SUFFIX_SHAPES ) {
		re.lastIndex = 0;
		let m;
		while ( ( m = re.exec( corpus ) ) ) suffixes.add( m[ 1 ] );
	}
	for ( const re of PREFIX_SHAPES ) {
		re.lastIndex = 0;
		let m;
		while ( ( m = re.exec( corpus ) ) ) prefixes.add( m[ 1 ] );
	}
	return { suffixes, prefixes };
}

/**
 * Does `attr` resolve against this render corpus — either by its literal name
 * (word-boundaried, so `gap` never matches `gapTablet` — STOP-17), or by a
 * dynamic suffix/prefix construction that provably assembles it?
 */
function resolves( attr, corpus, parts ) {
	if ( new RegExp( `\\b${ attr }\\b` ).test( corpus ) ) return true;

	for ( const suffix of parts.suffixes ) {
		if ( attr === lcFirst( suffix ) ) return true;
		if ( attr.length > suffix.length && attr.endsWith( suffix ) ) return true;
	}
	for ( const prefix of parts.prefixes ) {
		if ( attr.length > prefix.length && attr.startsWith( prefix ) ) {
			const rest = attr.slice( prefix.length );
			if ( /^[A-Z]/.test( rest ) ) return true;
		}
	}
	return false;
}

function readIfExists( ctx, file ) {
	return fs.existsSync( file ) ? ctx.stripped( file ) || '' : '';
}

/**
 * The block's RENDER corpus: its own render files, plus only those shared
 * includes/*.php files whose OWN declared functions/classes this block actually
 * calls. Verbatim copy of rule 21's `renderCorpus()` — same admission predicate
 * (a class must be invoked as `Name::`/`new Name`; a bare function must be a
 * genuinely top-level declaration AND be called), same fixture-local `_includes`
 * override for self-test isolation (H6 — a rule reading a fixed absolute
 * real-repo path could never be exercised failing in isolation).
 */
function renderCorpus( ctx, block ) {
	const dir = path.join( ctx.blocksDir, block.tail );
	let own = '';
	for ( const f of OWN_RENDER_FILES ) own += '\n' + readIfExists( ctx, path.join( dir, f ) );

	const fixtureIncludes = path.join( ctx.blocksDir, '_includes' );
	const includesDir = fs.existsSync( fixtureIncludes )
		? fixtureIncludes
		: path.resolve( ctx.blocksDir, '..', '..', 'includes' );

	let shared = '';
	if ( fs.existsSync( includesDir ) ) {
		for ( const f of fs.readdirSync( includesDir ) ) {
			if ( ! f.endsWith( '.php' ) ) continue;
			const full = path.join( includesDir, f );
			const src = readIfExists( ctx, full );
			if ( ! src ) continue;

			let called = false;

			const classRe = /\bclass\s+([A-Za-z_]\w*)/g;
			let m;
			while ( ( m = classRe.exec( src ) ) ) {
				const cls = m[ 1 ];
				if ( new RegExp( `\\b${ cls }\\s*::|new\\s+${ cls }\\b` ).test( own ) ) {
					called = true;
					break;
				}
			}

			if ( ! called && ! /\bclass\s+[A-Za-z_]\w*/.test( src ) ) {
				const fnRe = /^\s*function\s+([a-z_]\w*)\s*\(/gm;
				while ( ( m = fnRe.exec( src ) ) ) {
					if ( new RegExp( `\\b${ m[ 1 ] }\\s*\\(` ).test( own ) ) {
						called = true;
						break;
					}
				}
			}

			if ( called ) shared += '\n' + src;
		}
	}
	return own + shared;
}

module.exports = {
	id: '34-declared-attr-unrendered',
	checklistItem: null,
	title: 'Every attribute block.json declares is consumed somewhere on the render side',
	scope: 'per-block',
	needs: [ 'stripped:render.php', 'stripped:save.js', 'json:block.json' ],
	run( ctx, block ) {
		const blockJsonFile = path.join( ctx.blocksDir, block.tail, 'block.json' );
		const blockJson = ctx.json( blockJsonFile );
		if ( ! blockJson.ok ) return []; // malformed/absent block.json is roster-drift/parse-error territory

		const render = renderCorpus( ctx, block );
		// Nothing renders here at all (no render.php/view.js/save.js/style.css and no
		// admitted shared include) — a different rule's concern (e.g. the block may be
		// entirely editor-side), not a "declared but unconsumed" claim this rule can
		// support with evidence.
		if ( ! render.trim() ) return [];

		const renderParts = dynamicPartsOf( render );
		const coreControlled = coreSupportedAttrs( blockJson.data.supports );
		const hasComputedKeyRead = COMPUTED_KEY_RE.test( render );

		const findings = [];
		for ( const attr of Object.keys( blockJson.data.attributes || {} ) ) {
			if ( DOC_ATTR_RE.test( attr ) ) continue;
			if ( SYSTEM_ATTR_RE.test( attr ) ) continue; // extension surface — structurally invisible here
			if ( coreControlled.has( attr ) ) continue; // WordPress core render surface — likewise invisible

			if ( resolves( attr, render, renderParts ) ) continue; // provably consumed — nothing to report

			if ( hasComputedKeyRead ) {
				// Honest middle ground: the corpus contains a bare-variable computed-key
				// read this rule cannot resolve, so "not literally found" does not mean
				// "not consumed". Distinct finding kind, informational severity — never
				// silently treated as consumed (false green) or as dead (false positive).
				findings.push(
					makeFinding( {
						rule: this.id,
						block: block.slug,
						file: blockJsonFile,
						severity: 'informational',
						detail:
							`"${ attr }" is declared in block.json and was NOT found by a literal or dynamic-suffix ` +
							"match anywhere in this block's render corpus (own render files or a shared include it " +
							'calls) — but that corpus also contains a computed-key read (`$attributes[ $var ]`) this ' +
							'rule cannot statically resolve, so consumption cannot be proven or disproven here.',
						fix:
							`Manually confirm whether "${ attr }" is read via the computed-key loop in the shared ` +
							'include this block calls. If it is genuinely unread, remove the declaration; if it is ' +
							'read, no action is needed — this finding exists because static analysis cannot tell.',
						keyParts: [ attr, 'computed-key-unresolved' ],
					} )
				);
				continue;
			}

			findings.push(
				makeFinding( {
					rule: this.id,
					block: block.slug,
					file: blockJsonFile,
					severity: 'warn',
					detail:
						`"${ attr }" is declared in block.json but is NOT consumed anywhere on this block's render ` +
						"side — not in its own render.php/view.js/save.js/style.css, not in any shared include " +
						"(e.g. SGS_Container_Wrapper) it calls, and it is not a WordPress-core-support attribute. " +
						'Nothing paints this value; a client can set it and see no effect.',
					fix:
						`Add render-side consumption for "${ attr }" (render.php, a shared include this block ` +
						'calls, or save.js for a static block), OR remove it from block.json if it was never meant ' +
						'to affect output. This is the block.json-declares-to-render.php-consumes edge (R3-e) — the ' +
						'shape that let contentWidth-class defects ship silently.',
					keyParts: [ attr ],
				} )
			);
		}
		return findings;
	},
	selfTest: {
		fixture: 'fixtures/34-declared-attr-unrendered',
		mustFlag: [
			// The rule's basic ability to catch a genuinely dead declaration — proves
			// it is not a rule that can never fail (the negative-control requirement).
			'declared-not-rendered',
			// Proves the honest-handling branch actually fires (a finding IS produced)
			// rather than the unresolvable case silently vanishing into "consumed".
			'computed-key-present-unresolved',
		],
		mustNotFlag: [
			// The canonical R3-e probe's self-test analogue: a literal bracket read
			// inside a shared include the block calls (mirrors contentWidth in the
			// real class-sgs-container-wrapper.php).
			'rendered-via-shared-wrapper',
			// Literal read inside the block's own render.php.
			'rendered-directly',
			// Dynamic suffix construction (Trap A from rule 21 — sgs_typography_attr
			// style prefix+literal-suffix key assembly).
			'rendered-via-dynamic-key',
			// Static block: consumed in save.js, no render.php at all.
			'save-js-rendered',
			// WordPress-core support attribute — consumed by core, not by us.
			'core-supports-attr-not-flagged',
			// House-convention documentation attribute.
			'doc-attr-not-flagged',
			// Extension-owned attribute — structurally invisible render surface.
			'system-attr-not-flagged',
		],
	},
};
