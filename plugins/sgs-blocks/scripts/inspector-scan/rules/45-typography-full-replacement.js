'use strict';

// GROUND-TRUTH: spec=plugins/sgs-blocks/CLAUDE.md "TYPOGRAPHY — use the SHARED
// component, never bespoke font controls" (Bean R-22-13, 2026-06-11) +
// scripts/consistency/cluster-member-sets.json `clusters.text.owningComponent`
// ("TypographyControls + DesignTokenPicker") source=file evidence=live-read
// 2026-09-05.
//
// WHY THIS RULE EXISTS, AND WHY IT IS NOT A DUPLICATE OF RULE 33.
//
// Bean has confirmed (this session, cited above) the architecture decision:
// WordPress's native `supports.typography` block support is FULLY REPLACED,
// everywhere, by the shared `TypographyControls` component (edit.js) +
// `sgs_typography_css_rule()` helper (render.php, `includes/helpers-
// typography.php`). Under that decision ANY remaining native
// `supports.typography` declaration is a violation on its own — regardless
// of whether its selector currently resolves to a real, painted element.
//
// `33-ineffective-typography-selector.js` asks a NARROWER, orthogonal
// question: "does this block's declared typography selector match anything
// it renders?" It explicitly does NOT flag case (d) SELF — a block whose
// selector correctly targets a real DOM element it owns — because that is a
// WORKING native declaration by rule 33's own definition. This rule flags
// exactly that case, because "working" is no longer the bar; "native" is.
// The two rules are complementary, not overlapping: rule 33 finds native
// declarations that don't even WORK; this rule finds every native
// declaration, working or not, because none should exist post-migration.
// (Confirmed live 2026-09-05: rule 33's own backlog is 0 — its 3 predicted
// findings were fixed in the 2026-09-02 uniformity sweep — while 25 blocks
// still declare `supports.typography`. Those 25 are this rule's population,
// not rule 33's.)
//
// THREE THINGS THIS RULE FLAGS, per block:
//
//   (A) NATIVE-DECLARED — `supports.typography` declares at least one real,
//       recognised sub-capability as truthy (fontSize/lineHeight/fontFamily/
//       fontWeight/fontStyle/letterSpacing/textAlign/textDecoration/
//       textTransform). Flagged regardless of selector correctness, and
//       regardless of whether the block ALSO uses TypographyControls
//       somewhere — a block can be mid-migration, carrying both.
//
//   (B) GAP — the block declares NO native typography support, but
//       `supports.sgs.elements` names an element whose `attrMap` includes a
//       REAL typography member — `css:font-size`/`font-weight`/`line-height`/
//       `letter-spacing`/`font-style`/`text-transform`/`text-decoration`/
//       `text-align`/`font-family` (or the equivalent `native:typography.*`
//       path) — and NEITHER edit.js mounts `TypographyControls` NOR
//       render.php calls `sgs_typography_css_rule(`. This is bucket D from
//       the census brief: a block with real typography-bearing content that
//       has neither the old nor the new mechanism — a genuine build gap, not
//       an architecture violation.
//
//   (C) PARTIAL — the block declares no native typography support and has a
//       real typography element (same precondition as B), and exactly ONE of
//       {edit.js mounts TypographyControls, render.php calls
//       sgs_typography_css_rule()} is true, not both. This is the "both
//       bucket" case flagged by a prior risk-assessment agent: a block
//       partway through adopting the shared component (e.g. the control
//       exists in the inspector but render.php never wires the CSS rule, or
//       vice versa). Flagged as its own kind so it is never conflated with a
//       clean adopter (both true) or a total gap (both false).
//
// WHY A REAL TYPOGRAPHY ATTRMAP KEY, NOT THE "text" CLUSTER LABEL ALONE: the
// first draft of this rule gated (B)/(C) on `clusters.includes('text')` —
// `scripts/consistency/cluster-member-sets.json`'s `text` cluster is
// explicitly `"owningComponent": "TypographyControls + DesignTokenPicker"`,
// which looked like exactly the right manifest-first signal. Run live, it
// produced 19 GAP findings, and EVERY ONE resolved to an element whose
// `attrMap` held only `css:color`/background/border-family keys: icon fills
// (sgs/icon, sgs/cart's own icon), close/trigger buttons (sgs/modal,
// sgs/nav-drawer), plain colour-only wrapper overrides (sgs/site-header,
// sgs/tabs, sgs/star-rating). The `text` cluster's OWN `css:color` /
// `css:color-gradient` members are shared with colour-only elements — an
// SVG icon painted via `currentColor` genuinely routes through the same
// cluster member a real heading's text colour does, so cluster membership
// alone cannot distinguish "has running text" from "has a colour that
// happens to key off the text mechanism". The fix (this version) requires
// one of the cluster's OTHER, typography-specific members — verified live
// against the four canonical blocks (sgs/text, sgs/heading, sgs/button,
// sgs/label all declare real `css:font-size`/`font-weight`/etc keys) and
// confirmed it drops all 19 false positives while keeping every real one.
// A block with no such element is out of scope for (B)/(C): it may
// genuinely have no free-running text (an icon, a media block), and
// guessing from attribute-name regexes is exactly the trap this codebase's
// migration method warns against (THE-MIGRATION-METHOD.md Step 5's "shape,
// not string" test — this IS that test, applied to the rule's own first
// draft before shipping it).
//
// PER-BLOCK, NOT PER-ELEMENT (declared blind spot, same class as rule 33's
// own §DECLARED BLIND SPOTS). (C)'s partial detection cannot tell you WHICH
// text-cluster element is missing its half of the wiring when a block
// declares several — it only proves the block-wide mismatch exists. That is
// enough to route the finding to a human; per-element precision would need
// mapping each `TypographyControls` JSX mount and each
// `sgs_typography_css_rule()` call site to a specific manifest element, which
// is a bigger, separate build (the codemod's own crosscheck, not this
// detector).
//
// DOES NOT MODEL: a block whose `TypographyControls` import is present but
// dead (never actually rendered — e.g. imported and unused). A text search
// cannot see "mounted" vs "imported"; `check-dead-controls.js` already owns
// the general dead-control question and is not duplicated here.

const path = require( 'path' );
const { makeFinding } = require( '../core/finding' );

// The only sub-flags that constitute a REAL native typography capability.
// Meta keys (`__experimentalSkipSerialization`, `__experimentalDefaultControls`)
// are deliberately excluded — an allowlist, not a denylist, so an unrecognised
// future key never silently counts as "real" without this rule being updated
// to know what it means.
const REAL_TYPOGRAPHY_SUBFLAGS = [
	'fontSize',
	'lineHeight',
	'fontFamily',
	'fontWeight',
	'fontStyle',
	'letterSpacing',
	'textAlign',
	'textDecoration',
	'textTransform',
];

/** True when `supports.typography` grants at least one real capability. */
function declaresRealNativeTypography( typographySupport ) {
	if ( typographySupport === true ) return true;
	if ( ! typographySupport || typeof typographySupport !== 'object' ) return false;
	return REAL_TYPOGRAPHY_SUBFLAGS.some( ( key ) => typographySupport[ key ] === true );
}

// The text cluster's own TYPOGRAPHY members (cluster-member-sets.json
// `clusters.text.members[].key`) — deliberately EXCLUDES `css:color` and
// `css:color-gradient`. Those two keys are shared with plain colour rows
// (DesignTokenPicker) that carry no typography attribute at all: `clusters:
// ["text"]` is declared on plenty of non-text elements SOLELY because they
// paint via the text cluster's colour member (an icon's SVG fill via
// `currentColor`, a wrapper's own text-colour override). Checked live
// 2026-09-05 against a first draft of this rule that gated on cluster
// membership alone: it produced 19 findings, and EVERY ONE resolved to an
// element whose attrMap held only css:color/background/border-family keys —
// icon fills (sgs/icon, sgs/cart's icon), close/trigger buttons (sgs/modal,
// sgs/nav-drawer), wrapper text-colour overrides (sgs/site-header,
// sgs/tabs) — zero had a real font-size/weight/line-height/etc member. A
// genuine typography-bearing element (sgs/text, sgs/heading, sgs/button,
// sgs/label — all four confirmed live to have real font-* attrMap keys)
// requires one of THESE keys, not colour alone.
const TYPOGRAPHY_ATTR_MAP_KEYS = [
	'css:font-size',
	'css:font-weight',
	'css:line-height',
	'css:letter-spacing',
	'css:font-style',
	'css:text-transform',
	'css:text-decoration',
	'css:text-align',
	'css:font-family',
	'native:typography.fontSize',
	'native:typography.fontWeight',
	'native:typography.lineHeight',
	'native:typography.letterSpacing',
	'native:typography.fontStyle',
	'native:typography.textTransform',
	'native:typography.textDecoration',
	'native:typography.textAlign',
	'native:typography.fontFamily',
];

/** Any declared element (in `supports.sgs.elements`) whose `attrMap` names a
 * REAL typography member — not merely `"text"` cluster membership, which is
 * also declared on colour-only elements (see the comment above). */
function hasRealTypographyElement( blockJson ) {
	const elements =
		blockJson.supports &&
		blockJson.supports.sgs &&
		blockJson.supports.sgs.elements &&
		typeof blockJson.supports.sgs.elements === 'object'
			? blockJson.supports.sgs.elements
			: {};
	return Object.values( elements ).some( ( el ) => {
		if ( ! el ) return false;
		const attrMap = el.attrMap && typeof el.attrMap === 'object' ? el.attrMap : {};
		return Object.keys( attrMap ).some( ( k ) => TYPOGRAPHY_ATTR_MAP_KEYS.includes( k ) );
	} );
}

// Best-effort, single-line, quote-aware `//` strip for PHP — the same
// declared-limitation shape as rule 33's own stripper (does not defend a `//`
// embedded inside a same-line string whose quote state it misjudges, or one
// inside a multi-line string), applied on top of ctx.cache.strippedText()'s
// `/* */` strip so a commented-out mention of the helper is never counted as
// a real call.
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
				else if ( ! inSingle && ! inDouble && ch === '/' && line[ i + 1 ] === '/' ) {
					return line.slice( 0, i );
				}
			}
			return line;
		} )
		.join( '\n' );
}

function usesTypographyControlsInEdit( ctx, editFile ) {
	const fs = require( 'fs' );
	if ( ! fs.existsSync( editFile ) ) return false;
	const text = ctx.cache.strippedText( editFile ) || '';
	return /\bTypographyControls\b/.test( text );
}

function callsSharedHelperInRender( ctx, renderFile ) {
	const fs = require( 'fs' );
	if ( ! fs.existsSync( renderFile ) ) return false;
	const raw = ctx.cache.strippedText( renderFile ) || '';
	const text = stripPhpLineComments( raw );
	return /\bsgs_typography_css_rule\s*\(/.test( text );
}

module.exports = {
	id: '45-typography-full-replacement',
	checklistItem: null,
	title:
		'Native supports.typography is fully replaced by TypographyControls + sgs_typography_css_rule() (Bean-locked architecture decision)',
	scope: 'per-block',
	needs: [ 'json:block.json', 'text:edit.js', 'text:render.php' ],
	run( ctx, block ) {
		const blockDir = path.join( ctx.blocksDir, block.tail );
		const blockJsonFile = path.join( blockDir, 'block.json' );
		const parsed = ctx.cache.json( blockJsonFile );
		if ( ! parsed.ok || ! parsed.data ) return [];
		const blockJson = parsed.data;
		const supports = blockJson.supports && typeof blockJson.supports === 'object' ? blockJson.supports : {};

		const editFile = path.join( blockDir, 'edit.js' );
		const renderFile = path.join( blockDir, 'render.php' );

		const findings = [];

		// (A) Native typography still declared — flag regardless of anything else.
		if ( declaresRealNativeTypography( supports.typography ) ) {
			findings.push(
				makeFinding( {
					rule: this.id,
					block: block.slug,
					file: blockJsonFile,
					severity: 'warn',
					kind: 'native-typography-declared',
					detail: `${ block.slug } — block.json still declares a real native \`supports.typography\` sub-capability. Bean's architecture decision (2026-09-05) is a FULL replacement of native typography support with the shared TypographyControls component + sgs_typography_css_rule() helper, everywhere — a native declaration is a violation on its own, independent of whether its selector currently resolves to anything real (that is rule 33's separate question).`,
					fix: `Remove \`supports.typography\` from block.json and replace this element's font-size/weight/style/line-height/letter-spacing/text-align/text-transform/text-decoration controls with the shared \`TypographyControls\` component in edit.js, wired to \`sgs_typography_css_rule( $attributes, '<prefix>', '<selector>' )\` in render.php (plugins/sgs-blocks/CLAUDE.md "TYPOGRAPHY — use the SHARED component").`,
					keyParts: [ 'native-typography-declared' ],
				} )
			);
			// A block can be genuinely mid-migration (native AND shared component
			// both present) — but (B)/(C) exist to catch a MISSING mechanism, and
			// this block already has one (native). Reporting (B)/(C) alongside (A)
			// would tell the same block "you have no typography mechanism" while
			// simultaneously flagging the one it has as the thing to remove — a
			// confusing, self-contradictory pair of findings. (A) alone is enough
			// to route this block to the codemod's "both" bucket for manual
			// classification (see the codemod design's third question).
			return findings;
		}

		// (B)/(C) only apply to a block with real typography-bearing content.
		if ( ! hasRealTypographyElement( blockJson ) ) return findings;

		const hasEditControl = usesTypographyControlsInEdit( ctx, editFile );
		const hasRenderHelper = callsSharedHelperInRender( ctx, renderFile );

		if ( hasEditControl && hasRenderHelper ) return findings; // conformant.

		if ( ! hasEditControl && ! hasRenderHelper ) {
			findings.push(
				makeFinding( {
					rule: this.id,
					block: block.slug,
					file: fs_existsOr( renderFile, editFile ),
					severity: 'warn',
					kind: 'typography-gap-no-mechanism',
					detail: `${ block.slug } — declares a text-cluster element (supports.sgs.elements, clusters:["text"]) but has NEITHER native \`supports.typography\` NOR the shared \`TypographyControls\`/\`sgs_typography_css_rule()\` mechanism. This element has typography-shaped attributes with no way to control them.`,
					fix: `Add \`TypographyControls\` to edit.js for this element and wire it to \`sgs_typography_css_rule( $attributes, '<prefix>', '<selector>' )\` in render.php, per plugins/sgs-blocks/CLAUDE.md "TYPOGRAPHY — use the SHARED component".`,
					keyParts: [ 'typography-gap-no-mechanism' ],
				} )
			);
			return findings;
		}

		// Exactly one of the two is true — partial/mismatched adoption.
		findings.push(
			makeFinding( {
				rule: this.id,
				block: block.slug,
				file: fs_existsOr( renderFile, editFile ),
				severity: 'warn',
				kind: 'typography-component-partial',
				detail: `${ block.slug } — declares a text-cluster element and has ONLY ${
					hasEditControl ? 'the edit.js TypographyControls control' : 'the render.php sgs_typography_css_rule() call'
				}, not both. A control with no render-side rule saves a value that never paints; a render rule with no control can never be set by a client. (Per-element precision is a declared blind spot of this rule — a block naming several text-cluster elements may have some fully wired and one missing a half; this finding proves the block-wide mismatch exists, not which element.)`,
				fix: `Wire the missing half: ${
					hasEditControl
						? 'add the matching sgs_typography_css_rule() call in render.php for this element\'s selector'
						: 'add the matching TypographyControls control in edit.js for this element'
				}.`,
				keyParts: [ 'typography-component-partial' ],
			} )
		);
		return findings;
	},
	selfTest: {
		fixture: 'fixtures/45-typography-full-replacement',
		mustFlag: [
			'native-typography-declared',
			'typography-gap-no-mechanism',
			'typography-component-partial-edit-only',
			'typography-component-partial-render-only',
		],
		mustNotFlag: [
			'typography-component-conformant',
			'typography-support-all-false',
			'no-text-cluster-no-typography',
			'text-cluster-colour-only-not-typography',
		],
	},
};

// Small local helper — `makeFinding` requires a `file`; prefer render.php
// when it exists (the more likely fix location for a helper-call finding),
// else fall back to edit.js. Named oddly (not camelCase) on purpose so it
// reads unmistakably as a local utility, not a core/ import.
function fs_existsOr( preferred, fallback ) {
	const fs = require( 'fs' );
	return fs.existsSync( preferred ) ? preferred : fallback;
}
