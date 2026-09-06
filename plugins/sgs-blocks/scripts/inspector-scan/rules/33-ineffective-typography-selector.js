'use strict';

// GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md Part F.1
// source=file evidence=live-read 2026-08-18.
//
// WHY THIS RULE EXISTS — the defect class no other gate can see.
//
// Every rule before this one in the scanner asks "is there a control?"
// (DECLARED) or "does it render?" (RENDERED). Neither asks the third
// question: does the control's CSS actually reach the painted element it
// claims to style (CONSUMED)? A native typography control can exist, render
// in the inspector, save a value onto the block, generate real CSS — and
// still change nothing on the page.
//
// THE WORKED EXAMPLE — sgs/hero. block.json's `selectors.typography` targets
// `.sgs-hero__headline`. That class is real and does render — but
// hero/edit.js:156 sets it as the `className` of a CHILD block inside the
// InnerBlocks TEMPLATE array (`[ 'sgs/heading', { className:
// 'sgs-hero__headline', ... } ]`), not on any element hero itself renders.
// render.php never emits `class="sgs-hero__headline"` as an HTML attribute —
// it only uses the string to build a CSS SELECTOR
// (`$root_sel . ' .sgs-hero__headline'`, lines 863/870) that DOES match the
// child's DOM node. Per this framework's HC2 rule (plugins/sgs-blocks/
// CLAUDE.md), that generated rule sits at specificity (0,2,0) and cannot beat
// the child block's own inline typography styles at (1,0,0,0). Spec 35 F.1:
// "a composite's selectors.typography targets its own ROOT, never a child's
// dead BEM class." cta-section/info-box/notice-banner were fixed for this;
// hero never was. Its 7 declared native typography controls (fontSize,
// fontFamily, fontWeight, lineHeight, letterSpacing, textTransform,
// textDecoration) are silent no-ops.
//
// A NAIVE TEXT SEARCH CANNOT SEE THIS — proven today. A flat "is this class
// string present anywhere in the block's files" probe across all 83 blocks
// returned 2 findings, both FALSE POSITIVES (sgs/modal ->
// wp-block-sgs-modal, sgs/social-icons -> wp-block-sgs-social-icons — both
// are the WP-CORE-GENERATED root class from get_block_wrapper_attributes(),
// legitimately absent from source because WP writes it at render time, never
// authored) — and it MISSED hero entirely, because `.sgs-hero__headline` IS
// present in hero's own files, just never as a DOM class attribute.
//
// THE FOUR CASES this rule distinguishes for the effective typography
// selector of every block that declares native `supports.typography`:
//   (a) DEAD    — the class token appears nowhere as a real DOM emission
//                 (only in comments, or not at all).
//   (b) CHILD-OWNED — the class token is set ONLY as an InnerBlocks TEMPLATE
//                 child's className (the hero shape) — ineffective by CSS
//                 specificity, ALWAYS flagged regardless of whether render.php
//                 also builds a (losing) scoped selector string from it.
//   (c) WP-ROOT — no `selectors.typography` declared (or it resolves to the
//                 block's own `selectors.root`) AND that root equals the
//                 WP-core-generated `wp-block-<namespace>-<name>` class —
//                 legitimately absent from source; NEVER flagged.
//   (d) SELF    — the class token is emitted as a real DOM class attribute
//                 by the block's own edit.js/save.js/render.php, or by a
//                 shared PHP render helper under plugins/sgs-blocks/includes/
//                 (the sgs/post-grid shape: markup lives in
//                 Post_Grid_REST::render_card(), not in post-grid's own
//                 render.php) — fine, not flagged.
//
// DOM-EMISSION DETECTION (PHP/JS text, per line, comment-stripped): a line
// containing the token counts as DOM emission UNLESS it is CSS-selector-
// building context (matches `_sel\b` / `'selector'` / `wp_style_engine` and
// has no literal `class="...token..."`/`className="...token..."` on the same
// line). This line-level heuristic was validated by hand against every one
// of the 14 non-wp-root blocks in the live tree before being coded (see
// EXPECTED POPULATION below) — it is NOT a guess dressed as a rule.
//
// A DECLARED, NOT SILENTLY GUESSED, BLIND SPOT: `sgs/pricing-table` declares
// `selectors.typography = ".sgs-pricing-table__title"`, but the rendered
// heading only ever carries `.sgs-pricing-table__name` — render.php's own
// comment (line 456) calls `__title` a "back-compat alias" and pairs both
// classes in the SAME wp_style_engine selector list
// (`$root_sel . ' .sgs-pricing-table__name, ' . $root_sel . ' .sgs-pricing-table__title'`).
// This rule DOES flag it as case (a) DEAD — the DECLARED selector itself
// never matches any element, which is exactly the declared/rendered mismatch
// Spec 35 F.1 is about — even though typography still visibly reaches the
// page today via the redundant paired `__name` selector in the same
// generated rule. That "still visually fine because of an incidental alias"
// nuance is NOT modelled here; the fix text says so explicitly so Bean can
// judge severity rather than being told it's a silent no-op like hero.
//
// EXPECTED POPULATION, declared before the first live run per
// rules.json _meta.zeroIsAClaim: 25 blocks declare native
// `supports.typography`. Of those, 11 resolve to the WP-generated root class
// (case c, skipped): accordion, breadcrumbs, business-info, container,
// countdown-timer, cta-section, form, info-box, product-faq, quote,
// social-icons. Of the remaining 14, this rule is PREDICTED to flag exactly
// 3: sgs/hero (case b — the worked example), sgs/pricing-table and
// sgs/testimonial-slider (both case a — testimonial-slider's own render.php
// comment at line 211 already says outright "no element in this block's own
// markup ever carried that class"). The other 11 (card-grid,
// collapsible-text, counter, icon-list, notice-banner, post-grid,
// process-steps, table-of-contents, team-member, testimonial, timeline) were
// hand-verified to emit the token as a real DOM class attribute (post-grid's
// only via the shared includes/class-post-grid-rest.php render helper) and
// are predicted clean.
//
// COMMENTS DO NOT COUNT — `ctx.cache.strippedText()` for edit.js/save.js
// (AST comment table); a documented `/* */`-only regex strip for render.php
// and shared includes PHP (same known limitation as rule 28: a `/*` inside a
// PHP string literal swallows the rest of the file — not fixed here).
//
// DECLARED BLIND SPOTS (not fixed here, same class as rule 14's):
//   - The DOM-emission line heuristic is text-shaped, not a real PHP AST. A
//     block using an emission idiom this rule doesn't recognise (e.g. the
//     class token built entirely from string concatenation split across
//     multiple lines, or a computed/dynamic classname with no literal token
//     substring on any single line) could false-flag as DEAD. None of the 25
//     live blocks hit this at the time of writing (hand-verified above).
//   - The shared-includes scan is a flat token grep over
//     plugins/sgs-blocks/includes/**/*.php with the SAME comment-stripped
//     class="/className=" heuristic as the block's own files — it does not
//     verify the helper is actually the one THIS block calls, only that the
//     token is DOM-emitted somewhere in the shared layer. Given these class
//     tokens are BEM-unique per block (`sgs-<block>__<element>`), a
//     coincidental cross-block match is not a realistic risk today.
//   - `selectors.typography` given as an object with per-property selectors
//     that DISAGREE (block.json's own `root` differs from e.g. `fontSize`)
//     is not modelled — this rule follows `.root` (or the first string
//     value) only, exactly as WP's own selector-resolution does for the
//     controls that matter most (fontSize/fontFamily/etc. all fall back to
//     `.root` when not individually declared). No live block hits this today
//     (hero declares the same class on every sub-key).

const fs = require( 'fs' );
const path = require( 'path' );
const { makeFinding } = require( '../core/finding' );

function escapeRegExp( s ) {
	return s.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
}

// namespace/block-name string shape used by every InnerBlocks TEMPLATE
// entry's first element in this codebase (e.g. 'sgs/heading', 'core/paragraph').
const BLOCK_NAME_RE = /^[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*$/;

/**
 * Resolves the effective typography selector for a block, per WP's own
 * selectors.typography -> selectors.root fallback behaviour.
 * Returns { selectorString, isExplicitTypographySelector }.
 */
function resolveEffectiveSelector( blockJson, name ) {
	const selectors = blockJson.selectors && typeof blockJson.selectors === 'object' ? blockJson.selectors : {};
	const typo = selectors.typography;
	if ( typeof typo === 'string' && typo.trim() ) {
		return { selectorString: typo, explicit: true };
	}
	if ( typo && typeof typo === 'object' ) {
		if ( typeof typo.root === 'string' && typo.root.trim() ) {
			return { selectorString: typo.root, explicit: true };
		}
		const firstString = Object.values( typo ).find( ( v ) => typeof v === 'string' && v.trim() );
		if ( firstString ) return { selectorString: firstString, explicit: true };
	}
	if ( typeof selectors.root === 'string' && selectors.root.trim() ) {
		return { selectorString: selectors.root, explicit: false };
	}
	// No selectors declared at all -> WP falls back to its own generated
	// `.wp-block-<namespace>-<name>` root class.
	return { selectorString: '.' + wpRootClass( name ), explicit: false };
}

function wpRootClass( name ) {
	return 'wp-block-' + String( name || '' ).replace( '/', '-' );
}

/** Last simple class token in a (possibly compound/combinator) selector string. */
function lastClassToken( selectorString ) {
	const matches = String( selectorString || '' ).match( /\.([A-Za-z0-9_-]+)/g );
	if ( ! matches || ! matches.length ) return null;
	return matches[ matches.length - 1 ].slice( 1 );
}

/**
 * Finds every InnerBlocks TEMPLATE array entry in edit.js whose className
 * property equals `token`, via AST (not text) so a commented-out template
 * entry never counts. Returns [start,end) CHARACTER-OFFSET ranges for those
 * className string literals, so the DOM-emission text scan can exclude them
 * (they are child-owned, not self-owned).
 *
 * Character offsets, not line numbers: ctx.cache.strippedText() blanks a
 * multi-line block comment's ENTIRE character range (including any newlines
 * it contains) with spaces of equal length — collapsing it onto one "line"
 * and shifting every subsequent line number relative to the raw source the
 * AST was parsed from. Line-number cross-referencing between an
 * AST location (raw offsets) and split('\n') of the stripped text breaks
 * the instant a multi-line comment appears earlier in the file — proven
 * live: hero/edit.js's leading JSDoc blocks shifted its real
 * `.sgs-hero__headline` occurrence off the AST-reported line 156, causing
 * this rule to silently produce ZERO findings for hero (the one block this
 * rule exists to catch) until this was switched to offsets. Character
 * offsets do not have this problem — strippedText() is guaranteed the same
 * TOTAL LENGTH as the raw text (only comment ranges are replaced with
 * equal-length space runs), so an AST node's `.start`/`.end` offsets index
 * the same position in both.
 */
function findTemplateOwnedRanges( ctx, editFile, token ) {
	const ranges = [];
	ctx.cache.traverse( editFile, {
		ArrayExpression( nodePath ) {
			const els = nodePath.node.elements;
			if ( ! els || els.length < 2 ) return;
			const first = els[ 0 ];
			const second = els[ 1 ];
			if ( ! first || first.type !== 'StringLiteral' || ! BLOCK_NAME_RE.test( first.value ) ) return;
			if ( ! second || second.type !== 'ObjectExpression' ) return;
			for ( const prop of second.properties ) {
				if (
					prop.type === 'ObjectProperty' &&
					! prop.computed &&
					( ( prop.key.type === 'Identifier' && prop.key.name === 'className' ) ||
						( prop.key.type === 'StringLiteral' && prop.key.value === 'className' ) ) &&
					prop.value.type === 'StringLiteral' &&
					prop.value.value === token
				) {
					ranges.push( [ prop.value.start, prop.value.end ] );
				}
			}
		},
	} );
	return ranges;
}

function offsetInAnyRange( offset, ranges ) {
	return ranges.some( ( [ s, e ] ) => offset >= s && offset < e );
}

/** The line of text surrounding a character offset, for context checks
 * (class="..." / selector-building) without relying on split('\n') line
 * numbers (see the offset-vs-line note above). */
function lineAtOffset( text, offset ) {
	const start = text.lastIndexOf( '\n', offset - 1 ) + 1;
	let end = text.indexOf( '\n', offset );
	if ( end === -1 ) end = text.length;
	return text.slice( start, end );
}

// ctx.cache.strippedText() only strips /* */ block comments for non-JS
// files (core/sources.js — a documented, known-limited PHP/CSS stripper).
// PHP `//` line comments survive it untouched, and this codebase's render.php
// files routinely put the class token in an explanatory `//` comment right
// next to the real code that builds a CSS selector from it (the real
// hero/render.php:840 line is exactly this shape: "// targets
// .sgs-hero__headline, so scope the rule there rather than root_sel."). Left
// unstripped, that comment line would itself look like a DOM-emission
// candidate to the line scan below and produce a false "case (d) fine".
// Best-effort, single-line, quote-aware `//` strip — the same declared
// limitation class as the shared stripper (a `//` inside a multi-line
// string or one embedded in a same-line string this scan misjudges the
// quote-state of is not defended against), but a real fix for the common
// case (a `//` comment on its own line, or trailing a statement) that this
// rule's own fixtures and the real render.php files above actually hit.
function stripPhpLineComments( text ) {
	return text
		.split( '\n' )
		.map( ( line ) => {
			let inSingle = false;
			let inDouble = false;
			for ( let i = 0; i < line.length - 1; i++ ) {
				const ch = line[ i ];
				if ( ch === "'" && ! inDouble ) inSingle = ! inSingle;
				else if ( ch === '"' && ! inSingle ) inDouble = ! inDouble;
				else if ( ! inSingle && ! inDouble && ch === '/' && line[ i + 1 ] === '/' && line[ i - 1 ] !== ':' ) {
					return line.slice( 0, i );
				}
			}
			return line;
		} )
		.join( '\n' );
}

/** Comment-stripped text for a scan target, with the extra `//` strip above
 * applied on top of ctx.cache.strippedText() for .php files only (.js files
 * already get a correct AST-derived strip that handles `//` natively). */
function scanText( ctx, file ) {
	const base = ctx.cache.strippedText( file );
	if ( base && path.extname( file ) === '.php' ) return stripPhpLineComments( base );
	return base;
}

const SELECTOR_CONTEXT_RE = /(_sel\b|['"]selector['"]|wp_style_engine)/i;

function domClassAttrRe( token ) {
	const t = escapeRegExp( token );
	return new RegExp( `class(Name)?\\s*=\\s*(\\{[^}]*)?["'\`][^"'\`]*\\b${ t }\\b`, 'i' );
}

/**
 * Scans `text` for every occurrence of `token`, skipping occurrences inside
 * `excludeRanges` (character [start,end) pairs — see the offset-vs-line note
 * above), and classifies each surviving occurrence by the LINE it sits on. A
 * line matching a literal class="/className="...token... attribute always
 * counts as DOM emission. Otherwise a line is CSS-selector-building context
 * (excluded) if it matches SELECTOR_CONTEXT_RE; any other line mentioning
 * the token counts as DOM emission by default (the array/wrapper-classes-
 * list idiom used by e.g. notice-banner, which builds
 * `$wrapper_classes[] = 'token'` with no literal class="..." on that line
 * and no "_sel"/"selector" wording either).
 */
function hasDomEmission( text, token, excludeRanges ) {
	if ( ! text ) return false;
	const tokenRe = new RegExp( '\\b' + escapeRegExp( token ) + '\\b', 'g' );
	const classAttrRe = domClassAttrRe( token );
	let m;
	while ( ( m = tokenRe.exec( text ) ) ) {
		const offset = m.index;
		if ( excludeRanges && excludeRanges.length && offsetInAnyRange( offset, excludeRanges ) ) continue;
		const line = lineAtOffset( text, offset );
		if ( classAttrRe.test( line ) ) return true;
		if ( ! SELECTOR_CONTEXT_RE.test( line ) ) return true;
	}
	return false;
}

/** Only resolved against the REAL repo layout (src/blocks/<block>) — null
 * in self-test, where ctx.blocksDir points inside an isolated fixture temp
 * dir with no such sibling, so the shared-includes surface is safely absent
 * there rather than accidentally resolving to something outside the sandbox. */
function sharedIncludesDir( blocksDir ) {
	const parts = blocksDir.split( path.sep );
	if ( parts.length >= 2 && parts[ parts.length - 1 ] === 'blocks' && parts[ parts.length - 2 ] === 'src' ) {
		return path.join( blocksDir, '..', '..', 'includes' );
	}
	return null;
}

function walkPhpFiles( dir ) {
	const out = [];
	let entries;
	try {
		entries = fs.readdirSync( dir, { withFileTypes: true } );
	} catch ( e ) {
		return out;
	}
	for ( const entry of entries ) {
		const full = path.join( dir, entry.name );
		if ( entry.isDirectory() ) {
			out.push( ...walkPhpFiles( full ) );
		} else if ( entry.isFile() && entry.name.endsWith( '.php' ) ) {
			out.push( full );
		}
	}
	return out;
}

module.exports = {
	id: '33-ineffective-typography-selector',
	checklistItem: null,
	title: "A block's declared typography selector actually matches an element it renders (Spec 35 F.1)",
	scope: 'per-block',
	needs: [ 'json:block.json', 'ast:edit.js', 'text:render.php', 'text:save.js' ],
	run( ctx, block ) {
		const blockDir = path.join( ctx.blocksDir, block.tail );
		const blockJsonFile = path.join( blockDir, 'block.json' );
		const parsed = ctx.cache.json( blockJsonFile );
		if ( ! parsed.ok || ! parsed.data ) return [];
		const blockJson = parsed.data;

		const supports = blockJson.supports && typeof blockJson.supports === 'object' ? blockJson.supports : {};
		if ( ! supports.typography ) return []; // not in scope: no declared native typography support.

		const name = blockJson.name || block.slug;
		const { selectorString, explicit } = resolveEffectiveSelector( blockJson, name );
		const token = lastClassToken( selectorString );
		if ( ! token ) return []; // couldn't extract a class token — nothing to check.

		// Case (c): resolves to the WP-core-generated root class (whether via an
		// explicit selectors.root that equals it, or via total absence of
		// `selectors`). Legitimately absent from source — never flag.
		if ( token === wpRootClass( name ) ) return [];

		const editFile = path.join( blockDir, 'edit.js' );
		const saveFile = path.join( blockDir, 'save.js' );
		const renderFile = path.join( blockDir, 'render.php' );

		const templateOwnedRanges = fs.existsSync( editFile )
			? findTemplateOwnedRanges( ctx, editFile, token )
			: [];
		const templateOwned = templateOwnedRanges.length > 0;

		let domFound = false;
		if ( fs.existsSync( editFile ) ) {
			domFound = domFound || hasDomEmission( scanText( ctx, editFile ), token, templateOwnedRanges );
		}
		if ( fs.existsSync( saveFile ) ) {
			domFound = domFound || hasDomEmission( scanText( ctx, saveFile ), token, null );
		}
		if ( fs.existsSync( renderFile ) ) {
			domFound = domFound || hasDomEmission( scanText( ctx, renderFile ), token, null );
		}
		if ( ! domFound ) {
			const includesDir = sharedIncludesDir( ctx.blocksDir );
			if ( includesDir && fs.existsSync( includesDir ) ) {
				for ( const file of walkPhpFiles( includesDir ) ) {
					if ( hasDomEmission( scanText( ctx, file ), token, null ) ) {
						domFound = true;
						break;
					}
				}
			}
		}

		if ( domFound ) return []; // case (d): self-rendered somewhere real. Fine.

		if ( templateOwned ) {
			// Case (b): the class lives ONLY on an InnerBlocks TEMPLATE child.
			return [
				makeFinding( {
					rule: this.id,
					block: block.slug,
					file: editFile,
					severity: 'warn',
					detail: `${ block.slug } — declared typography selector "${ selectorString }" is set ONLY as an InnerBlocks TEMPLATE child's className (${ editFile }), never emitted by ${ block.slug }'s own rendered markup. Any scoped rule block.json's ${ explicit ? 'selectors.typography' : 'selectors.root' } generates (e.g. "<root> ${ selectorString }") sits at CSS specificity (0,2,0) and cannot beat the child block's own inline typography styles at (1,0,0,0) — the native typography controls this selector backs are silent no-ops (Spec 35 F.1).`,
					fix: `Retarget block.json's selectors.typography to ${ block.slug }'s own root element (matching cta-section/info-box/notice-banner's fix), not the InnerBlocks child's class. If the child block genuinely owns the typography, move the native typography support to that child block instead of declaring it here.`,
					keyParts: [ 'child-owned-selector', token ],
				} ),
			];
		}

		// Case (a): the token is not a real DOM emission anywhere reachable,
		// and it isn't an InnerBlocks-template child className either — dead.
		return [
			makeFinding( {
				rule: this.id,
				block: block.slug,
				file: fs.existsSync( renderFile ) ? renderFile : editFile,
				severity: 'warn',
				detail: `${ block.slug } — declared typography selector "${ selectorString }" (class "${ token }") is never emitted as a real DOM class attribute by ${ block.slug }'s own edit.js/save.js/render.php or by any shared render helper under includes/. The declared selector does not match any element this block renders, so its native typography controls have no guaranteed target (Spec 35 F.1).`,
				fix: `Either retarget block.json's selectors.typography to the class the block actually renders for its primary text element, or add that class to the rendered markup so the declared selector starts matching something.`,
				keyParts: [ 'dead-selector', token ],
			} ),
		];
	},
	selfTest: {
		fixture: 'fixtures/33-ineffective-typography-selector',
		mustFlag: [ 'child-only-typography', 'nowhere-selector' ],
		mustNotFlag: [ 'wp-generated-root-class', 'root-correctly-targeted', 'no-selectors-declared', 'no-typography-support-declared' ],
	},
};
