'use strict';

// GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART O §"The defect
// register" ("The fourth quadrant: declared + rendered + NO CONTROL") and §11
// field 7 ("Five buckets, not a boolean. The fifth is the fourth quadrant and
// needs the render-without-control rule").
//
// source=file evidence=live-read plugins/sgs-blocks/scripts/check-dead-controls.js
// on 2026-08-08. That script has FIVE checks and NONE of them covers this shape:
//   - CHECK 1/2 fire only when a control EXISTS (`:715` "Attributes that DO have
//     a control ... are explicitly skipped here").
//   - CHECK 4 (`checkFullyDeadAttrs`, `:704`) fires only when there is no control
//     AND no consumption. An attribute that IS consumed is skipped by
//     construction — so the whole of the fourth quadrant is invisible to it.
//     Confirmed empirically in the contract: running CHECK 4 reports 3 dead
//     attrs and sees NONE of the 53.
//   - CHECK 5 is dead ASSIGNMENTS inside render.php, a different shape again.
// This rule is therefore the exact complement of CHECK 4, not a duplicate of it:
//   CHECK 4  = no control AND no render.
//   rule 21  = no control AND render.
//
// EXPECTED POPULATION (declared BEFORE the first live run, per
// rules.json._meta.zeroIsAClaim — derived independently of this file's code, by
// the 2026-08-07 control-type-contract council's per-attribute audit, NOT by
// running anything written here): **53**, composed as
//   hover values across 9 blocks (incl. sgs/gallery: grayscaleHover,
//     shadowHover) ......................................................... 31
//   lineHeight/letterSpacing tiers (button 4, brand-strip 4, text 2) ....... 10
//   physics-canvas ......................................................... 8
//   heading/text boxShadow ................................................. 4
// A live number materially different from 53 is a red flag about THIS RULE, not
// about the framework, and must be reconciled attribute-by-attribute before the
// rule's advisoryReason is written.
//
// ── THE TWO TRAPS (both were walked into during the manual audit; between them
// they produced nearly 54 wrong findings) ────────────────────────────────────
// Trap A — FALSE NEGATIVE from literal-name matching on the RENDER side.
//   `sgs/brand-strip`'s tier attrs never appear verbatim in any PHP file. They
//   are built by `sgs_typography_attr( $prefix, 'LineHeightTablet' )` at
//   includes/helpers-typography.php:90,91,98,99. A literal-name render check
//   scores them "not rendered" and skips them — silently losing 4 of the 10
//   typography findings.
// Trap B — FALSE POSITIVE from literal-name matching on the CONTROL side.
//   `fontSizeTablet` has a real, working control, but its name is never written
//   out: src/components/TypographyControls.js:144 builds it as
//   `typographyAttrName( prefix, 'FontSizeTablet' )`. A literal-name control
//   check scores it "no control" and flags it.
//
// Both traps are the SAME phenomenon seen from two sides: an attribute key
// assembled from a variable part and a LITERAL part. So this rule resolves that
// one shape ONCE (`dynamicPartsOf` below) and applies it symmetrically to both
// corpora. Detecting it on the render side kills Trap A; detecting it on the
// control side kills Trap B.
//
// This is deliberately NOT a name-keyed allowlist of known attrs or known
// components. Per the 2026-08-08 methodology guardrail ("Detect by what a
// control DOES, not what it is called" — every gate keyed to a component name
// has a blind spot by construction, and `_KNOWN_CONTROLS` has exactly this bug),
// the corpora are resolved from source: a block's control corpus is its own
// edit.js PLUS the source of every shared component it actually renders
// (resolved via core/components.js the same way rule 18 resolves MediaPicker),
// and its render corpus is its own render files PLUS only those shared includes
// whose own functions it actually calls.

const fs = require( 'fs' );
const path = require( 'path' );
const { makeFinding } = require( '../core/finding' );
const { resolveComponentFiles } = require( '../core/components' );

// Attribute keys that are documentation, not attributes. House convention,
// mirrored from check-dead-controls.js:342-352 (WordPress would register these
// as real schema fields with no consumer — 11 such keys exist library-wide).
const DOC_ATTR_RE = /^(_comment|_note)/;

// ── EXTENSION-OWNED attributes ──────────────────────────────────────────────
// `inspector-scan` structurally CANNOT see src/blocks/extensions/ (no
// extensionsDir in run.js buildCtx; core/roster.js:58-70 admits only
// directories containing a block.json), so an extension's controls are
// invisible to this rule and any extension attr would false-positive. This is
// the documented BLOCKED extension surface, not a judgement about these attrs.
//
// ⛔ THIS WAS A NAME-SHAPE TEST AND THAT WAS A BUG (fixed 2026-08-28).
// It read `/^sgs[A-Z_]/` — "does the NAME look system-ish?" — which is exactly
// the failure mode this rule's own header warns against ("Detect by what a
// control DOES, not what it is called... every gate keyed to a component name
// has a blind spot by construction"). The exclusion had that blind spot too:
//
//   The whole `fx` motion family is extension-owned, and NOT ONE of those
//   names matches `^sgs[A-Z_]` — the family is `fx`, `fxTrigger`,
//   `fxGridDotColour`, … So the escape hatch missed, twice over, the very
//   surface it was written to cover.
//
// The consequence was a CATCH-22 with no passing state. Declare an extension
// attr on a block and THIS rule fires (no control visible). Leave it
// undeclared and `check-undeclared-attrs.py` fires (`undeclared_render_ref`,
// "render.php reads an attribute block.json does not declare"). Neither state
// satisfies both gates, so the only way out was a permanent suppression —
// `scripts/block-file-consistency-baseline.json:147-153` carries exactly that
// for `sgs/decorative-image`'s `fx`, and its own reasoning text names this
// regex as the cause.
//
// THE PREDICATE IS NOW OWNERSHIP, READ FROM SOURCE. `collectAttributes()` is
// the parser `generate-extension-attributes.js` already uses to build
// `includes/extension-attributes.generated.php` — the server-side mirror of
// every attribute the extensions register. Reusing it (rather than copying its
// regex here) means there is ONE definition of "extension-owned" in the tree;
// a second copy would drift the first time the convention changed, which is
// the same single-source discipline `coreSupportedAttrs()` above follows by
// reading each block's own `supports`.
//
// FAILS TOWARD A FALSE POSITIVE, never a false negative — this rule's stated
// doctrine. If the extensions directory cannot be read, the set is EMPTY, so
// nothing is excluded and genuine extension attrs merely become noisy. The
// alternative (excluding on failure) would silently hide real dead controls.
let EXTENSION_ATTR_CACHE = null;
function extensionOwnedAttrs() {
	if ( EXTENSION_ATTR_CACHE ) return EXTENSION_ATTR_CACHE;
	try {
		// eslint-disable-next-line global-require
		const { collectAttributes } = require( '../../generate-extension-attributes' );
		EXTENSION_ATTR_CACHE = new Set( collectAttributes().keys() );
	} catch ( e ) {
		EXTENSION_ATTR_CACHE = new Set();
	}
	return EXTENSION_ATTR_CACHE;
}

// ── The WORDPRESS-CORE control surface ──────────────────────────────────────
// A SECOND structurally-invisible control surface, sibling to the extension
// surface above and NOT covered by it (the contract's §"EXTENSION SURFACE axis"
// names only src/blocks/extensions/). When a block.json opts into a core
// `supports` flag, WordPress itself REGISTERS the named attribute and RENDERS
// its control — the anchor field in the Advanced panel, the alignment toolbar,
// the Colour panel, the text-align toolbar. None of that lives in the block's
// edit.js or in any SGS shared component, so a corpus built from those two
// sources can never see it, and every such attribute false-positives.
//
// ⛔ EVERY MAPPING BELOW IS VERIFIED AGAINST WORDPRESS CORE SOURCE, not recalled.
// Read 2026-08-08 over SSH from the canary's own wp-includes/block-supports/ on
// WP 7.0.3 — the ONLY acceptable evidence class here, because a mapping that is
// merely plausible creates a permanent, silent blind spot. The test each one had
// to pass: does core REGISTER A NAMED ATTRIBUTE of this exact name? Citations:
//   anchor          anchor.php:26-27           registers attributes['anchor']
//   align           align.php:25               registers attributes['align']
//   backgroundColor colors.php:50-51           registers attributes['backgroundColor']
//   textColor       colors.php:56-57           registers attributes['textColor']
//   gradient        colors.php:62-63           registers attributes['gradient']
//   className       custom-classname.php:25-26 registers attributes['className']
//   layout          layout.php:244             registers attributes['layout']
//   fontSize        typography.php:137         reads block_attributes['fontSize']
//   fontFamily      typography.php:149         reads block_attributes['fontFamily']
//
// ⛔ `typography.textAlign` IS A REAL SUPPORT KEY AND IS DELIBERATELY ABSENT.
// It was in the first version of this map and was WRONG. Core reads the value
// from `$block_attributes['style']['typography']['textAlign']`
// (typography.php:184,246-247) — the `style` object, NOT a named `textAlign`
// attribute. So a block declaring its own top-level `textAlign` attribute has a
// DIFFERENT thing from what core's control writes, and flagging it is correct.
// sgs/cta-section is exactly that case: render.php:278-279 reads
// $attributes['textAlign'] while core's control writes style.typography.textAlign,
// so no control reaches the value the block actually paints. A 4-rater council
// challenged this entry and BOTH the council's reason ("not a real support key")
// and the original mapping were wrong; core source settled it. Do not re-add it
// without re-reading typography.php.
//
// MEASURED: five findings are the core-control shape — sgs/heading.anchor,
// sgs/button.anchor, sgs/responsive-logo.align, sgs/cta-section.backgroundColor
// and .textColor. Verified by reading each block.json's supports AND confirming
// edit.js never mentions the attribute — i.e. the control is core's, not a
// missed local one.
//
// This is NOT a name-keyed allowlist of attributes (the failure mode the rule
// header warns about, and the bug in `_KNOWN_CONTROLS`). The predicate is the
// BLOCK'S OWN DECLARED `supports` — a per-block opt-in read from its block.json
// — and the names below are the fixed attribute keys the WordPress block API
// registers for those flags. A block that does not declare the support gets no
// exclusion, so the axis stays machine-readable per R-31-1.
//
// Deliberately NOT included: spacing / border / dimensions / shadow supports.
// Those serialise into the single `style` object attribute rather than
// registering a named attribute, so they can never produce a finding here and
// listing them would be inert code pretending to be a guard.
function coreSupportedAttrs( supports ) {
	const out = new Set();
	if ( ! supports || typeof supports !== 'object' ) return out;

	if ( supports.anchor ) out.add( 'anchor' );
	// `align` may be `true` or an array of permitted alignments; both register
	// the attribute and both render the toolbar control.
	if ( supports.align ) out.add( 'align' );
	// custom-classname.php:18 gates SOLELY on `customClassName`, defaulting to
	// TRUE when the key is absent (`block_has_support( $block_type,
	// 'customClassName', true )`). `supports.className` is a DIFFERENT key
	// governing the automatic `wp-block-<name>` class and has no bearing on the
	// `className` attribute — an earlier version of this line ANDed the two,
	// which a QC council correctly flagged as conflating them.
	if ( supports.customClassName !== false ) out.add( 'className' );
	// `layout` registers a named `layout` attribute plus core's Layout panel.
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
		// NO textAlign — see the block comment above. Core keeps that value in
		// style.typography.textAlign, so a named `textAlign` attribute is the
		// block's own and genuinely uncontrolled.
	}

	return out;
}

// ── HELPER-DERIVED attribute names ──────────────────────────────────────────
// A THIRD structurally-invisible control surface, sibling to the core-supports
// surface above. `shadowAttrKeys()`, `gradientOverlayAttrKeys()` and
// `typographyAttrKeys()` (src/components/{ShadowControl,GradientOverlayControl,
// TypographyControls}.js) COMPUTE their returned attribute names at call-time
// (`base + 'Colour'`) rather than writing them out as literal strings this
// static scanner can read.
//
// MEASURED (D810, 2026-08-26): adopting `gradientOverlayAttrKeys()` on
// sgs/hero took this rule from 82 -> 84 flagged, the two new findings being
// `mediaOverlayGradient` and `mediaBackgroundGradient` — exactly the derived
// keys, both real client-reachable controls the rule could no longer see.
// Bean-approved fix (D810's own close-out): teach the rule to expand these
// three call sites rather than leave adoption of a name helper permanently
// blind to it.
//
// This is NOT a name-keyed allowlist of blocks or attributes — the same
// discipline as `coreSupportedAttrs()` above. It reads the call site's OWN
// LITERAL first argument (the exact mechanism `shadowAttrKeys( 'boxShadow',
// { hoverColour: true } )` already uses at ShadowControl.js:129) and derives
// names with the IDENTICAL formula the real helper uses
// (ShadowControl.js:76-91, GradientOverlayControl.js:109-120,
// TypographyControls.js:146-179) — provably exact, not a guessed convention.
// A call whose base/prefix argument is not a literal string (a variable, e.g.
// TypographyControls.js:279's own internal `typographyAttrKeys( prefix )`)
// yields no derivation for that call, so the rule fails toward a false
// positive there, never a false negative — this rule's own doctrine.
//
// `solid` is DELIBERATELY NOT derived for gradientOverlayAttrKeys() — see
// GradientOverlayControl.js:100-103 and D810: `solid` is `<base>` twice in
// some overlay families and `<base>Colour` once in others, not a uniform
// derivation, so every call site is required to write it out literally
// (`attrNames.solid` or the `{ solid: '...' }` override) and this rule keeps
// resolving/flagging it exactly as it does today — untouched by this function.
const SHADOW_KEYS_RE = /\bshadowAttrKeys\(\s*['"]([^'"]+)['"]\s*(?:,\s*(\{[^}]*\}))?\s*\)/g;
const GRADIENT_KEYS_RE = /\bgradientOverlayAttrKeys\(\s*['"]([^'"]+)['"]/g;
const TYPOGRAPHY_KEYS_RE = /\btypographyAttrKeys\(\s*(?:['"]([^'"]*)['"]|[^)'"]+)\s*\)/g;

// Mirrors typographyAttrKeys()'s own PascalCase suffix list exactly
// (TypographyControls.js:158-179) — kept as a literal list here rather than
// re-deriving it, for the same reason coreSupportedAttrs()'s core-API mapping
// above is a literal list: it is a fixed, verified-against-source contract,
// not a pattern to infer.
const TYPOGRAPHY_SUFFIXES = [
	'FontFamily', 'FontSize', 'FontSizeUnit', 'FontSizeTablet', 'FontSizeMobile',
	'FontWeight', 'FontStyle', 'LineHeight', 'LineHeightUnit', 'TextDecoration',
	'TextTransform', 'LetterSpacing', 'LetterSpacingUnit',
	'FontWeightHover', 'TextDecorationHover', 'TextTransformHover',
];

function helperDerivedAttrs( corpus ) {
	const out = new Set();

	let m;
	SHADOW_KEYS_RE.lastIndex = 0;
	while ( ( m = SHADOW_KEYS_RE.exec( corpus ) ) ) {
		const base = m[ 1 ];
		const opts = m[ 2 ] || '';
		out.add( base + 'Colour' );
		if ( /\bhover\s*:\s*true\b/.test( opts ) ) out.add( base + 'Hover' );
		if ( /\bhoverColour\s*:\s*true\b/.test( opts ) ) out.add( base + 'ColourHover' );
	}

	GRADIENT_KEYS_RE.lastIndex = 0;
	while ( ( m = GRADIENT_KEYS_RE.exec( corpus ) ) ) {
		out.add( m[ 1 ] + 'Gradient' );
	}

	TYPOGRAPHY_KEYS_RE.lastIndex = 0;
	while ( ( m = TYPOGRAPHY_KEYS_RE.exec( corpus ) ) ) {
		const prefix = m[ 1 ]; // undefined when the call's argument wasn't a literal string
		if ( prefix === undefined ) continue;
		for ( const suffix of TYPOGRAPHY_SUFFIXES ) {
			out.add( prefix ? prefix + suffix : suffix.charAt( 0 ).toLowerCase() + suffix.slice( 1 ) );
		}
	}

	return out;
}

// Files that constitute a block's own RENDER surface — what the framework paints.
const OWN_RENDER_FILES = [ 'render.php', 'view.js', 'save.js', 'style.css' ];

// ── Dynamic key-construction shapes ─────────────────────────────────────────
// Each captures a LITERAL fragment sitting against a concatenation or
// interpolation boundary. A PascalCase capture is a SUFFIX (the variable part is
// the prefix); a camelCase capture before `${` is a PREFIX (the variable part is
// the suffix).

const SUFFIX_SHAPES = [
	// PHP:  $attributes[ $base . 'Tablet' ]      /  $prefix . 'LineHeightTablet'
	/\$\w+\s*\.\s*['"]([A-Z][A-Za-z0-9_]*)['"]/g,
	// PHP:  "{$base}Tablet"
	/\{\$\w+\}([A-Z][A-Za-z0-9_]*)/g,
	// PHP:  sgs_typography_attr( $prefix, 'LineHeightTablet' )
	// JS:   typographyAttrName( prefix, 'FontSizeTablet' )
	/\(\s*[\w$.[\]]+\s*,\s*['"]([A-Z][A-Za-z0-9_]*)['"]\s*\)/g,
	// JS:   mediaStoredAttrName( blockSlug, prefix, 'ObjectFit' ) — the same
	// trailing-literal shape as the two-arg pattern above, one fixed arg
	// further out. Every media atom's control() builds its attribute name
	// this way (src/components/media/atoms/*.control.js), so without this
	// shape every media-atom attribute false-positives as uncontrolled —
	// this is Trap A (see the file header) recurring for a 3-arg helper.
	/\(\s*[\w$.[\]]+\s*,\s*[\w$.[\]]+\s*,\s*['"]([A-Z][A-Za-z0-9_]*)['"]\s*\)/g,
	// JS:   `${ base }Tablet`   /   attributes[ `${ side }MediaType` ]
	/\$\{[^}]*\}\s*([A-Z][A-Za-z0-9_]*)/g,
];

const PREFIX_SHAPES = [
	// JS:   `padding${ tier === 'tablet' ? 'Tablet' : 'Mobile' }`
	/`\s*([a-z][A-Za-z0-9_]*)\$\{/g,
	// PHP:  'padding' . $tier
	/['"]([a-z][A-Za-z0-9_]*)['"]\s*\.\s*\$\w+/g,
];

function lcFirst( s ) {
	return s.charAt( 0 ).toLowerCase() + s.slice( 1 );
}

// ── LOCAL WRAPPER indirection (P-RULE21-ONE-ARG-LITERAL-RESIDUAL) ──────────
// A local arrow-function wrapper forwarding its own single parameter as the
// LAST argument of a call already matching one of SUFFIX_SHAPES' own 2-/3-arg
// trailing-literal shapes (e.g.
// `const key = ( base ) => mediaStoredAttrName( blockSlug, prefix, base )`,
// `src/components/media/atoms/video-behaviour.control.js:129`) hides a real
// derived attribute name from every shape above — the literal never sits
// directly against the builder call. It sits one hop away, at the wrapper's
// own call site (`key( 'VideoLoop' )`), or at the wrapper's CALLER's call
// site one hop further still (`pairPickerRow({ ..., idBase: 'VideoId', ... })`
// + `name( idBase + suffix )` inside it, `source.control.js:48,53-54`).
//
// A GENERIC "any 1-arg call with a literal" pattern was rejected for exactly
// this residual — it also matches `__( 'text' )` and over-suppresses the
// whole tree (the same over-suppression this rule's own header already
// walked into once with Trap A/B). The gate here is structural, not
// name-shaped: only a call whose CALLEE is proven, from THIS SAME corpus, to
// be a thin pass-through wrapper around an already-recognised builder shape
// qualifies. `__` never satisfies that — it is imported, never locally
// defined as `const __ = ( x ) => someBuilder( ..., x )`.
const WRAPPER_DEF_RE = /\bconst\s+(\w+)\s*=\s*\(\s*(\w+)\s*\)\s*=>\s*[\w$.[\]]+\(\s*(?:[\w$.[\]]+\s*,\s*)+\2\s*\)/g;

// The framework's fixed device-tier suffix vocabulary (mirrors
// TYPOGRAPHY_SUFFIXES above — a literal list because it is a verified,
// project-wide contract, not a pattern to infer per corpus).
const TIER_SUFFIXES = [ '', 'Tablet', 'Mobile' ];

function localWrapperDerivedSuffixes( corpus ) {
	const out = new Set();
	const wrapperNames = new Set();

	let m;
	WRAPPER_DEF_RE.lastIndex = 0;
	while ( ( m = WRAPPER_DEF_RE.exec( corpus ) ) ) wrapperNames.add( m[ 1 ] );

	for ( const wrapper of wrapperNames ) {
		// Direct literal call: key( 'VideoLoop' )
		const literalRe = new RegExp( `\\b${ wrapper }\\(\\s*['"]([A-Z][A-Za-z0-9_]*)['"]\\s*\\)`, 'g' );
		let lm;
		while ( ( lm = literalRe.exec( corpus ) ) ) out.add( lm[ 1 ] );

		// Literal + tier-suffix-variable concatenation: name( 'VideoAlt' + suffix )
		const literalConcatRe = new RegExp( `\\b${ wrapper }\\(\\s*['"]([A-Z][A-Za-z0-9_]*)['"]\\s*\\+\\s*\\w+\\s*\\)`, 'g' );
		let lcm;
		while ( ( lcm = literalConcatRe.exec( corpus ) ) ) {
			for ( const tier of TIER_SUFFIXES ) out.add( lcm[ 1 ] + tier );
		}

		// One-hop-further concatenation call: name( idBase + suffix ) — the
		// base half's literal values live at ITS OWN call sites, as an
		// object-literal property of the same name (the destructuring
		// convention every call site here follows, e.g. `idBase: 'VideoId'`).
		const concatRe = new RegExp( `\\b${ wrapper }\\(\\s*(\\w+)\\s*\\+\\s*(\\w+)\\s*\\)`, 'g' );
		let cm;
		while ( ( cm = concatRe.exec( corpus ) ) ) {
			const baseVar = cm[ 1 ];
			const baseRe = new RegExp( `\\b${ baseVar }\\s*:\\s*['"]([A-Z][A-Za-z0-9_]*)['"]`, 'g' );
			let bm;
			while ( ( bm = baseRe.exec( corpus ) ) ) {
				for ( const tier of TIER_SUFFIXES ) out.add( bm[ 1 ] + tier );
			}
		}
	}

	return out;
}

/**
 * Collects every dynamically-constructed key fragment in a corpus.
 * Returns { suffixes: Set<PascalCase>, prefixes: Set<camelCase> }.
 */
function dynamicPartsOf( corpus ) {
	const suffixes = new Set();
	const prefixes = new Set();
	for ( const re of SUFFIX_SHAPES ) {
		re.lastIndex = 0;
		let m;
		while ( ( m = re.exec( corpus ) ) ) suffixes.add( m[ 1 ] );
	}
	for ( const s of localWrapperDerivedSuffixes( corpus ) ) suffixes.add( s );
	for ( const re of PREFIX_SHAPES ) {
		re.lastIndex = 0;
		let m;
		while ( ( m = re.exec( corpus ) ) ) prefixes.add( m[ 1 ] );
	}
	return { suffixes, prefixes };
}

/**
 * Does `attr` resolve against this corpus — either by its literal name, or by a
 * dynamic construction that provably assembles it?
 *
 * Literal match is word-boundaried so `gap` does not match `gapTablet` (that
 * tier-blind join is STOP-17, and is the precise bug that let hero.splitImageTablet
 * ship declared-and-inert past CHECK 1 — see check-dead-controls.js:421-433).
 */
function resolves( attr, corpus, parts ) {
	if ( new RegExp( `\\b${ attr }\\b` ).test( corpus ) ) return true;

	for ( const suffix of parts.suffixes ) {
		// prefix '' case: sgs_typography_attr( '', 'LineHeightTablet' ) -> lineHeightTablet
		if ( attr === lcFirst( suffix ) ) return true;
		// non-empty prefix: <prefix>LineHeightTablet
		if ( attr.length > suffix.length && attr.endsWith( suffix ) ) return true;
	}
	for ( const prefix of parts.prefixes ) {
		// <prefix> + PascalCase remainder, e.g. padding + Tablet
		if ( attr.length > prefix.length && attr.startsWith( prefix ) ) {
			const rest = attr.slice( prefix.length );
			if ( /^[A-Z]/.test( rest ) ) return true;
		}
	}
	return false;
}

/**
 * Is `attr` reachable through the block's VARIATION SWITCHER rather than an
 * inspector control?
 *
 * WHY (D792-era close-out, Bean's call 2026-08-26). `sgs/nav-drawer.variantPreset`
 * was a REAL finding — every variation was `scope: [ 'inserter' ]`, so the look
 * was chosen once at insertion and could never be changed afterwards. Adding
 * `'transform'` to each scope gave the native block-toolbar switcher, and every
 * variation already carried `isActive: [ 'variantPreset' ]`, which is what the
 * switcher needs. The client CAN now change it — with zero custom UI.
 *
 * This rule asks whether an INSPECTOR control resolves the attribute, so it kept
 * reporting the finding after the fix. That is a false positive, and by this
 * project's own doctrine a false positive is a detector bug, never baseline
 * fodder — so the rule learns the surface instead.
 *
 * ⛔ BOTH signals are required, and that is the whole precision argument. A
 * `transform` scope with no `isActive` gives a switcher that cannot tell which
 * variation is active; an `isActive` with no `transform` scope is inserter-only,
 * which is exactly the ORIGINAL defect. Either alone must still flag — see the
 * `variation-inserter-only-still-flags` fixture, which is the negative control
 * proving this exemption does not overmatch.
 *
 * ⚠ KNOWN LIMIT, stated rather than hidden: the two signals are matched across
 * the whole file, not paired within one variation object. A file mixing a
 * transform-scoped variation with an inserter-only one that alone carries the
 * `isActive` would be exempted wrongly. `sgs/nav-drawer` is currently the ONLY
 * block in the framework with a `variations.js`, so the population is one and
 * uniform; tighten to per-object pairing if a second block ever disagrees.
 */
function resolvedByVariationSwitcher( ctx, block, attr ) {
	const file = path.join( ctx.blocksDir, block.tail, 'variations.js' );
	const src = readIfExists( ctx, file );
	if ( ! src ) return false;

	// Some variation is reachable from the block toolbar after insertion.
	if ( ! /\bscope\s*:\s*\[[^\]]*['"]transform['"]/.test( src ) ) return false;

	// ...and the switcher can tell which variation this attribute selects.
	const isActive = src.match( /\bisActive\s*:\s*\[[^\]]*\]/g ) || [];
	return isActive.some( ( block_ ) => new RegExp( `\\b${ attr }\\b` ).test( block_ ) );
}

function readIfExists( ctx, file ) {
	return fs.existsSync( file ) ? ctx.stripped( file ) || '' : '';
}

/**
 * The IMPORT-BOUND sibling of `localRefsIn()` above — same dispatcher-table
 * problem, one level further out.
 *
 * ⛔ WHY THIS EXISTS (2026-09-02). `MediaElementPanel.js`'s `ATOM_CONTROLS`
 * map is STRUCTURALLY IDENTICAL to `ContainerWrapperControls.js`'s
 * `KIND_PANELS` — `const control = ATOM_CONTROLS[ id ]; … control( props )` is
 * the same "invoked from a table, not rendered as a JSX tag" shape
 * `localRefsIn()` was built to resolve. But `KIND_PANELS`'s VALUES are
 * inline arrow functions rendering SAME-FILE JSX components
 * (`<WidthPanel>`, `<BackgroundPanel>`, …), which the existing
 * tag-matching recursion in `controlCorpus()` already follows once
 * `localRefsIn()` surfaces `KIND_PANELS` itself as a same-file reference.
 * `ATOM_CONTROLS`'s VALUES are IMPORTED bindings — `sourceControl`,
 * `objectFitControl`, … — one per atom's own `*.control.js` file
 * (`src/components/media/atoms/object-fit.control.js` etc.). An
 * `import { control as objectFitControl } from './media/atoms/object-fit.control.js'`
 * is invisible to `localRefsIn()`'s DECL regex (`function|const|let|class`
 * only), so the table's values dead-ended: `MediaElementPanel.js`'s OWN text
 * reaches the corpus fine (it is itself a JSX tag, `<MediaElementPanel`,
 * resolved by the normal component-tag recursion), but the literal
 * PascalCase suffixes each atom's `control()` builds via
 * `mediaStoredAttrName( blockSlug, prefix, 'ObjectFit' )` (`'ObjectFit'`,
 * `'Colour'`, `'Opacity'`, …) live only in the imported `.control.js`
 * files, never in `MediaElementPanel.js` itself.
 *
 * MEASURED: this single shape produced 74 of rule 21's 128 findings before
 * this fix — every sgs/media attribute (45) and every sgs/hero split-media
 * attribute (29), the exact two blocks this rule's own header already
 * documented as false positives pending this mechanism.
 *
 * Bounded the same way `localRefsIn()` is bounded, and for the same reason:
 * only imports the SCOPED region actually references (never the whole
 * file's import list) are followed, and only RELATIVE imports resolve (a
 * bare `@wordpress/…` specifier has no local file to read). A dispatch
 * table shaped differently than this — imports feeding something other than
 * a plain identifier-keyed call — still fails toward a false positive here,
 * never a false negative, matching this rule's own doctrine.
 *
 * @param {string} source File source to scan for `import { … as X } from '…'`
 *                         statements.
 * @param {string} scoped The isolated region (an export body, or a local
 *                         declaration's own body via `exportBody()`) whose
 *                         references decide which imports are followed.
 * @param {string} dir    Absolute directory `source` lives in, so a relative
 *                         import specifier resolves to a real file.
 * @return {string[]} Absolute file paths of the imported modules referenced.
 */
function importedRefsIn( source, scoped, dir ) {
	const IMPORT_RE = /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
	const word = ( n ) => new RegExp( /\b/.source + n + /\b/.source );
	const out = [];
	let m;
	IMPORT_RE.lastIndex = 0;
	while ( ( m = IMPORT_RE.exec( source ) ) ) {
		const specifiers = m[ 1 ];
		const from = m[ 2 ];
		// Only a RELATIVE import resolves to a real file this rule can read —
		// a bare package specifier ('@wordpress/components') has none.
		if ( ! from.startsWith( '.' ) ) continue;

		for ( const spec of specifiers.split( ',' ) ) {
			const trimmed = spec.trim();
			if ( ! trimmed ) continue;
			// `{ control as sourceControl }` -> the LOCAL binding name is what
			// the scoped region actually references, never the exported name.
			const asMatch = trimmed.match( /\bas\s+([A-Za-z_$][\w$]*)\s*$/ );
			const local = asMatch ? asMatch[ 1 ] : trimmed.split( /\s+/ ).pop();
			if ( ! local || ! word( local ).test( scoped ) ) continue;

			// A BARREL import ('../../../components', no extension) resolves to a
			// DIRECTORY, not a file — e.g. WidthPanel.js's own
			// `import { ResponsiveControl, … } from '../../../components'`. This
			// rule only ever wants a single leaf file's own literal attribute
			// suffixes (the shape ATOM_CONTROLS's *.control.js values are), so a
			// directory resolution is deliberately SKIPPED rather than expanded
			// to its index.js — pulling in a whole barrel's text risks the exact
			// over-match this rule's own doctrine fails away from. Fails toward a
			// false positive (a real control missed) here, never a false
			// negative reached by accident.
			const resolved = path.resolve( dir, from );
			const withExt = fs.existsSync( resolved ) && fs.statSync( resolved ).isFile()
				? resolved
				: resolved + '.js';
			if ( fs.existsSync( withExt ) && fs.statSync( withExt ).isFile() ) out.push( withExt );
		}
	}
	return out;
}

/**
 * Every control-component file in the tree, keyed by component name.
 *
 * MEASURED 2026-08-08: resolving shared components from `src/components/` ALONE
 * (which is all core/components.js scans) produced 826 live findings against an
 * independently-derived expected population of 53. The dominant false-positive
 * family was the whole container/grid attribute set — `gap*`, `gridTemplate*`,
 * `contentWidth`, `maxWidth`, `alignContent`, `justifyItems`, `columns*` —
 * across ~22 blocks. Cause: `ContainerWrapperControls`, the façade that owns
 * every one of those controls, does NOT live in `src/components/`. It lives at
 * `src/blocks/container/components/ContainerWrapperControls.js` — a BLOCK-LOCAL
 * shared-component directory that core/components.js has no visibility into
 * (confirmed by grep: 6 blocks import it from `../container/components/`).
 *
 * Resolved HERE rather than by widening core/components.js, deliberately. That
 * module is consumed by rules 01 and 18, whose committed backlogs are 66 and 15;
 * widening its discovery would silently restage both populations — the same
 * "a write with an untraced reader propagates silently" shape that makes the
 * roster/`surfaces.*` coupling dangerous. Blast radius stays inside rule 21.
 */
// Resolved against the REAL src/ tree, never ctx.blocksDir. Shared-component
// discovery is a property of the framework, not of any one fixture — the same
// reasoning core/selftest.js:44-46 gives for resolving components against the
// real src/components/index.js rather than the fixture temp dir. Using
// ctx.blocksDir here would silently yield an EMPTY component map during
// self-test (blocksDir is a temp dir), so the shared-component negative control
// would pass for the wrong reason.
const REAL_SRC = path.resolve( __dirname, '..', '..', '..', 'src' );

let COMPONENT_FILE_CACHE = null;
function allControlComponentFiles() {
	if ( COMPONENT_FILE_CACHE ) return COMPONENT_FILE_CACHE;
	// PROMOTED to core/components.js resolveComponentFiles() on 2026-08-19 (C0).
	// The private copy that lived here indexed exported names + filename and took
	// FIRST-WINS in readdir order. The 2026-08-17 wrapper-panel split made that
	// wrong: `ContainerWrapperControls.js` became a 268-line facade that
	// RE-EXPORTS the six panels and sorts alphabetically before them, so it
	// claimed `LayoutPanel`/`WidthPanel`/`WrapperColourPanel`/… while the
	// attribute vocabulary those names carry had MOVED OUT of it (measured:
	// gapTablet 0 vs 2, flexDirection 0 vs 2, gridTemplateRows 0 vs 6,
	// justifyItems 0 vs 3 against LayoutPanel.js). This rule therefore resolved
	// `<LayoutPanel` to a file containing none of the controls it asked about and
	// reported those attributes as uncontrolled — false POSITIVES, which are a
	// detector bug and never baseline fodder. The shared resolver fixes it by
	// PRECEDENCE: a file that DECLARES a name beats one that only re-exports it.
	//
	// It also widens the corpus to src/blocks/extensions/. discover() and its
	// exportsMap are deliberately UNTOUCHED, so rules 01 and 18 do not move.
	//
	// ── src/components/media/ (2026-09-02) ──────────────────────────────────
	// `resolveComponentFiles()`'s own `addDir()` reads ONE directory's `.js`
	// files, non-recursively — `src/components/media/` is a SUBDIRECTORY of
	// `src/components/`, so `MediaPanelLayout.js` / `HeroSplitMediaPanelLayout.js`
	// / `DecorativeImagePanelLayout.js` / `ProductCardImagePanelLayout.js` were
	// never indexed at all, for any rule. MEASURED: this is why the ATOM_CONTROLS
	// fix (importedRefsIn(), above) alone did not move sgs/media's or sgs/hero's
	// findings — `sgs/media`'s edit.js renders `<MediaPanelLayout`, not
	// `<MediaElementPanel` directly, so the JSX-tag recursion dead-ended at the
	// FIRST hop, before ATOM_CONTROLS was ever reached.
	//
	// Passed via `resolveComponentFiles()`'s own `extraDirs` parameter — the
	// exact escape hatch this promotion already ships, so this is widening the
	// CALL, not the shared function. `discover()`'s own call (used by rules 01
	// and 18) is untouched, so their populations do not move.
	COMPONENT_FILE_CACHE = resolveComponentFiles( [ path.join( REAL_SRC, 'components', 'media' ) ] );
	return COMPONENT_FILE_CACHE;
}

/**
 * The block's CONTROL corpus: its own edit.js plus the SOURCE of every control
 * component it actually renders. Component membership is decided by the block's
 * JSX containing `<ComponentName`, cross-referenced against a component file
 * that was itself read — never by matching an import-path string (rule 18's
 * established technique, widened here from "does it render an <img>" to "what
 * attribute keys does it build").
 */
/**
 * Isolates ONE named export's own body from a component file, by finding its
 * declaration and brace-matching to the end of it.
 *
 * Returns null when the declaration cannot be found or the braces do not
 * balance. Callers MUST treat null as "do not recurse" rather than "recurse on
 * everything" — an unscoped fallback here would reintroduce the per-file
 * over-reach this function exists to prevent, and would do so silently.
 *
 * Brace-matching is string-aware only to the extent of skipping line and block
 * comments and the three quote kinds; a brace inside a regex literal would
 * defeat it, which is precisely why the failure mode is "return null" and not
 * "return a best guess".
 */
function exportBody( source, name ) {
	const decl = new RegExp(
		`(?:export\\s+(?:default\\s+)?)?(?:function|const|let|class)\\s+${ name }\\b`
	);
	const start = source.search( decl );
	if ( start === -1 ) return null;

	// Find the BODY brace, not the parameter list's. Every panel in this
	// codebase is declared as `export function X( { attributes, setAttributes } )
	// {` (ContainerWrapperControls.js:254,421,641), so a naive indexOf('{')
	// lands on the DESTRUCTURING brace and brace-matching then closes on the
	// parameter list — yielding a body with no JSX in it and silently disabling
	// recursion. Measured: that bug made this whole function inert. So skip any
	// brace that sits inside an open parameter list.
	let open = -1;
	let parens = 0;
	for ( let i = start; i < source.length; i++ ) {
		const ch = source[ i ];
		if ( ch === '(' ) parens++;
		else if ( ch === ')' ) parens--;
		else if ( ch === '{' && parens === 0 ) {
			open = i;
			break;
		}
	}
	if ( open === -1 ) return null;

	let depth = 0;
	for ( let i = open; i < source.length; i++ ) {
		const ch = source[ i ];

		if ( ch === '/' && source[ i + 1 ] === '/' ) {
			const nl = source.indexOf( '\n', i );
			if ( nl === -1 ) return null;
			i = nl;
			continue;
		}
		if ( ch === '/' && source[ i + 1 ] === '*' ) {
			const end = source.indexOf( '*/', i + 2 );
			if ( end === -1 ) return null;
			i = end + 1;
			continue;
		}
		if ( ch === '"' || ch === "'" || ch === '`' ) {
			for ( let j = i + 1; j < source.length; j++ ) {
				if ( source[ j ] === '\\' ) {
					j++;
					continue;
				}
				if ( source[ j ] === ch ) {
					i = j;
					break;
				}
				if ( j === source.length - 1 ) return null;
			}
			continue;
		}

		if ( ch === '{' ) depth++;
		else if ( ch === '}' ) {
			depth--;
			if ( depth === 0 ) return source.slice( open, i + 1 );
		}
	}
	return null;
}

/**
 * The same-file top-level declarations an isolated export body REFERENCES.
 *
 * ⛔ WHY THIS EXISTS (2026-08-27). `exportBody()` above isolates one export so
 * recursion cannot leak across a façade's siblings — that scoping is load-bearing
 * and is NOT being relaxed. But it assumes an export reaches its children by
 * RENDERING them as JSX. A TABLE-DRIVEN DISPATCHER does not:
 *
 *   const panels = KIND_PANELS[ kind ] ?? KIND_PANELS.section;
 *   return <InspectorControls>{ panels.map( ( renderPanel ) => renderPanel( … ) ) }</InspectorControls>;
 *
 * The only tags in that body are <InspectorControls> and <Fragment>. The panels
 * are INVOKED, not rendered, so a tag-only frontier dead-ends and every attribute
 * they own is reported as having no control.
 *
 * MEASURED on the live tree the day this was written: that single shape produced
 * **139 of rule 21's 211 FLAGGED findings**, across the 16 blocks mounting
 * `ContainerWrapperControls`. Every one was a FALSE POSITIVE — the controls are
 * reachable in the editor today (`kind="layout"` → `KIND_PANELS.layout` →
 * `<WidthPanel>` → `contentWidth`). A false positive is a detector bug, never
 * baseline fodder.
 *
 * The fix is deliberately NARROW: follow only declarations the isolated body
 * actually names, and only within the SAME file. It does NOT fall back to the
 * whole file — a per-file attempt was measured trading 20 false positives for 10
 * false negatives, and a false negative hides a real defect forever.
 *
 * Guarded by fixture `control-via-dispatcher-table`, written and watched FAILING
 * before this function existed.
 */
function localRefsIn( source, scoped, selfName ) {
	const DECL = /^(?:export\s+(?:default\s+)?)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm;
	const word = ( n ) => new RegExp( /\b/.source + n + /\b/.source );
	const out = [];
	for ( const m of source.matchAll( DECL ) ) {
		const name = m[ 1 ];
		if ( name === selfName ) continue;
		if ( ! word( name ).test( scoped ) ) continue;
		out.push( name );
	}
	return out;
}

function controlCorpus( ctx, block ) {
	const editFile = path.join( ctx.blocksDir, block.tail, 'edit.js' );
	const own = readIfExists( ctx, editFile );
	if ( ! own ) return { text: '', editFile, ok: false };

	// TRANSITIVE, not one level. MEASURED 2026-08-08 (QC council rater C): a
	// single level of expansion produced 20 false positives across the 4 blocks
	// that render <BackgroundPanel> (container, cta-section, hero, trust-bar).
	// Cause: ContainerWrapperControls.js:935 renders <GradientOverlayControl>,
	// and THAT file is where backgroundOverlayColour / overlayGradient /
	// overlayGradientAngle / overlayGradientFrom / overlayGradientTo are
	// actually wired (src/components/GradientOverlayControl.js:15-17,156-159).
	// The names never appear in ContainerWrapperControls.js at all — the whole
	// `attributes`/`setAttributes` pair is forwarded as objects — so one level
	// of expansion reaches a file that mentions none of them and the block
	// scores "no control" for five controls a client can genuinely reach.
	//
	// A component rendering a sub-component is the normal shape of a control
	// panel, so this was never a one-off: any future panel built the same way
	// would reproduce the class. Hence a fix in the resolver rather than 20
	// baseline entries.
	//
	// Bounded by a visited-set (a component pair that renders each other cannot
	// loop) and by the component map itself, which is finite. Blast radius stays
	// inside this rule — rules 01 and 18 use core/components.js, untouched here.
	// ⛔ RECURSION IS SCOPED TO THE SPECIFIC EXPORT, NOT THE WHOLE FILE — and
	// that distinction is the whole correctness argument. The component map is
	// file-keyed by EVERY name a file exports, because a 57KB file like
	// ContainerWrapperControls.js exports LayoutPanel, WidthPanel,
	// BackgroundPanel, GradientOverlayControl's host and more. Recursing on the
	// whole FILE would credit a block that renders only <WidthPanel> with
	// everything any OTHER export of that file renders.
	//
	// MEASURED 2026-08-08, and it is not hypothetical: a first version recursed
	// per-file and silently cleared sgs/site-header's and sgs/site-footer's five
	// overlay findings each. Those are REAL — those blocks render <WidthPanel>
	// (edit.js:29 imports from ContainerWrapperControls) and never
	// <BackgroundPanel>, so their client genuinely cannot reach the gradient
	// overlay. Per-file recursion turned 10 true findings into false negatives
	// while fixing 20 false positives — a strictly worse trade, because a
	// suppressed real defect is invisible forever whereas a false positive is
	// merely noisy.
	//
	// So: expand a component by isolating THAT export's own body, and recurse
	// only on the components rendered inside it. If the body cannot be isolated,
	// DO NOT recurse — the rule fails toward a false positive, never a false
	// negative.
	const components = allControlComponentFiles();
	const seenExports = new Set();
	let text = own;
	let frontier = [ own ];

	while ( frontier.length ) {
		const next = [];
		for ( const source of frontier ) {
			for ( const [ name, file ] of components ) {
				const id = `${ file }#${ name }`;
				if ( seenExports.has( id ) ) continue;
				if ( ! new RegExp( `<${ name }\\b` ).test( source ) ) continue;
				seenExports.add( id );

				const body = readIfExists( ctx, file );
				if ( ! body ) continue;
				// The file's full vocabulary still joins the corpus — unchanged
				// behaviour, and correct: a block rendering any export of a file
				// can be styled by the attribute keys that file builds.
				text += '\n' + body;

				// But only THIS export's own body decides what recurses.
				const scoped = exportBody( body, name );
				if ( scoped ) {
					next.push( scoped );
					// A dispatcher reaches its panels by CALLING them rather than
					// rendering them, so the tag frontier alone dead-ends. Follow the
					// same-file declarations this body actually names. See localRefsIn().
					const regionsToScan = [ scoped ];
					for ( const local of localRefsIn( body, scoped, name ) ) {
						const localBody = exportBody( body, local );
						if ( localBody ) {
							next.push( localBody );
							regionsToScan.push( localBody );
						}
					}
					// A SIBLING dispatcher shape: the table's values are IMPORTED
					// bindings (MediaElementPanel.js's ATOM_CONTROLS -> each atom's
					// own *.control.js file) rather than same-file JSX components.
					// Scan both this export's own body AND every local body just
					// resolved above (ATOM_CONTROLS itself is one such local ref) —
					// see importedRefsIn().
					for ( const region of regionsToScan ) {
						for ( const importedFile of importedRefsIn( body, region, path.dirname( file ) ) ) {
							const importedSrc = readIfExists( ctx, importedFile );
							if ( ! importedSrc ) continue;
							text += '\n' + importedSrc;

							// ONE FURTHER HOP, same scoping discipline one level
							// deeper. MEASURED: `link.control.js` and `caption.control.js`
							// do NOT build their attribute names inline (unlike
							// `object-fit.control.js`) — they call `attrKeys()`/
							// equivalent imported from a SIBLING *.js LOGIC module
							// (`link.js`), which is where the literal
							// `mediaStoredAttrName( blockSlug, prefix, 'LinkUrl' )`
							// calls actually live. Without this hop, linkUrl/
							// linkOpensNewTab/linkRel/captionTag stayed false
							// positives even after ATOM_CONTROLS resolution, because
							// the literal suffixes are one import further out than
							// MediaElementPanel.js's own dispatch table reaches.
							// Scoped to the imported file's own 'control' export body
							// — never a whole-file fallback — matching localRefsIn()'s
							// stated discipline just above.
							const importedScoped = exportBody( importedSrc, 'control' ) || importedSrc;
							for ( const nestedFile of importedRefsIn( importedSrc, importedScoped, path.dirname( importedFile ) ) ) {
								const nestedSrc = readIfExists( ctx, nestedFile );
								if ( nestedSrc ) text += '\n' + nestedSrc;
							}
						}
					}
				}
			}
		}
		frontier = next;
	}

	return { text, editFile, ok: true };
}

/**
 * The block's RENDER corpus: its own render files, plus only those shared
 * includes/*.php files whose OWN declared functions this block actually calls.
 *
 * Admitting every shared include unconditionally would be wrong in the
 * false-positive direction: helpers-typography.php mentions 'LineHeightTablet',
 * so every block declaring a tier attr would score "rendered" whether or not it
 * ever calls the helper. Requiring a real call keeps Trap A closed (brand-strip
 * DOES call it) without inventing render consumption for blocks that don't.
 */
function renderCorpus( ctx, block ) {
	const dir = path.join( ctx.blocksDir, block.tail );
	let own = '';
	for ( const f of OWN_RENDER_FILES ) own += '\n' + readIfExists( ctx, path.join( dir, f ) );

	// Fixture-local `_includes` mirrors selftest.js's `_theme` convention, so the
	// shared-include path is genuinely exercisable in isolation. A rule reading a
	// FIXED absolute real-repo path could never be made to fail in self-test
	// (H6, "a gate that cannot fail reads green forever").
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

			// Admission predicate. MEASURED 2026-08-08: matching any declared
			// `function name(` is too broad to mean anything on its own —
			// class-sgs-container-wrapper.php declares exactly ONE function, the
			// method `render`, so the predicate degenerated to `\brender\s*\(`,
			// which 34 of 84 blocks match. A predicate that loose is the
			// "gate's evidence predicate can be too broad" shape, even when its
			// verdict happens to be right (nav-menu really does call
			// `SGS_Container_Wrapper::render(` at render.php:1436).
			//
			// So a CLASS file must be invoked as a class (`Name::` or
			// `new Name`), and only a genuinely top-level function may be
			// admitted by a bare call.
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
	id: '21-render-without-control',
	checklistItem: null,
	title: 'Every attribute the framework RENDERS has a control the client can reach',
	scope: 'per-block',
	needs: [ 'stripped:edit.js', 'stripped:render.php', 'json:block.json', 'components' ],
	run( ctx, block ) {
		const blockJsonFile = path.join( ctx.blocksDir, block.tail, 'block.json' );
		const blockJson = ctx.json( blockJsonFile );
		if ( ! blockJson.ok ) return []; // malformed/absent block.json is roster-drift/parse-error territory

		const control = controlCorpus( ctx, block );
		if ( ! control.ok ) return []; // no edit.js at all — a different rule's concern

		const render = renderCorpus( ctx, block );
		if ( ! render.trim() ) return []; // nothing renders here, so nothing can be render-without-control

		const controlParts = dynamicPartsOf( control.text );
		const renderParts = dynamicPartsOf( render );

		// Read from the block's OWN declared supports, so the exclusion is a
		// per-block opt-in rather than a global attribute-name allowlist.
		const coreControlled = coreSupportedAttrs( blockJson.data.supports );
		// Read from the block's OWN call sites to shadowAttrKeys()/
		// gradientOverlayAttrKeys()/typographyAttrKeys() — same per-block
		// opt-in discipline, see the block comment above helperDerivedAttrs().
		const helperControlled = helperDerivedAttrs( control.text );

		// Read from the extensions' OWN source, via the same parser that builds
		// the server-side mirror — an ownership fact, not a name-shape guess.
		const extensionOwned = extensionOwnedAttrs();

		const findings = [];
		for ( const attr of Object.keys( blockJson.data.attributes || {} ) ) {
			if ( DOC_ATTR_RE.test( attr ) ) continue;
			if ( extensionOwned.has( attr ) ) continue; // extension surface — structurally invisible here
			if ( coreControlled.has( attr ) ) continue; // WordPress core surface — likewise invisible here
			if ( helperControlled.has( attr ) ) continue; // resolved via a name-derivation helper call site
			if ( resolves( attr, control.text, controlParts ) ) continue; // reachable by the client
			// ...or reachable via the native block-toolbar variation switcher,
			// which is a client-facing control surface this rule cannot see by
			// reading edit.js alone. See resolvedByVariationSwitcher().
			if ( resolvedByVariationSwitcher( ctx, block, attr ) ) continue;
			if ( ! resolves( attr, render, renderParts ) ) continue; // not rendered -> CHECK 4's territory

			findings.push(
				makeFinding( {
					rule: this.id,
					block: block.slug,
					file: blockJsonFile,
					severity: 'warn',
					detail:
						`"${ attr }" is declared in block.json and IS consumed by this block's render surface ` +
						'(its own render.php/view.js/save.js/style.css, or a shared include it calls), but NO ' +
						'inspector control resolves it — not in edit.js, and not in any shared component this ' +
						'block renders. The framework paints this value and no client can change it.',
					fix:
						`Add an inspector control for "${ attr }" following the matching control contract in ` +
						'.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART O, OR remove it from block.json and hard-code ' +
						'the rendered value if it was never meant to be client-settable.',
					keyParts: [ attr ],
				} )
			);
		}
		return findings;
	},
	selfTest: {
		fixture: 'fixtures/21-render-without-control',
		mustFlag: [
			'rendered-no-control',
			'rendered-via-shared-include-no-control',
			// Positive twin of `core-supports-provided-control` — same nine
			// attribute names, same defect shape, `supports` absent (and
			// `customClassName: false`, the only way to exercise the negative
			// side of that branch). Proves the core-supports exclusion reads the
			// block's own opt-in rather than skipping the names unconditionally
			// (H6: a gate that cannot fail reads green forever).
			'core-supports-absent-still-flags',
			// Regression guard on the one mapping that was WRONG: typography's
			// textAlign is a real support key that registers NO named attribute,
			// so it must still flag while its sibling fontSize is excluded.
			'textalign-support-still-flags',
			// NEGATIVE CONTROL for the variation-switcher exemption. `isActive`
			// is present but every scope is `inserter` only — the original
			// nav-drawer defect, where the look is chosen once at insertion and
			// can never be changed. If this stops flagging, the exemption has
			// widened to "any variations.js mentioning the attribute".
			'variation-inserter-only-still-flags',
			// OVERMATCH GUARDS for helperDerivedAttrs() (D810 fix). Each call
			// passes a VARIABLE, not a literal string, as the base/prefix
			// argument, so the derivation formula is genuinely unknown to this
			// static scanner and the declared attribute must still flag. If the
			// exemption ever widened from "the call site's own literal
			// argument" to "any matching helper call anywhere nearby", these
			// three stop flagging incorrectly.
			'shadow-helper-dynamic-base-still-flags',
			'gradient-helper-solid-colour-still-flags',
			'typography-helper-dynamic-prefix-still-flags',
			// OVERMATCH GUARD for the extension-ownership exclusion. Both attrs
			// are shaped like extension attrs and registered by NO extension, so
			// both must still flag. `sgsNotARegisteredAttr` additionally matches
			// the OLD `/^sgs[A-Z_]/` regex — it was silently excluded before, so
			// this fixture also proves the over-broad half of that bug is closed.
			// If the ownership lookup ever reverts to a prefix test, this fails.
			'extension-lookalike-still-flags',
		],
		mustNotFlag: [
			'rendered-with-control',
			// A `transform`-scoped variation carrying `isActive` IS a
			// client-reachable control — the native block-toolbar switcher —
			// even though no inspector control exists. See
			// resolvedByVariationSwitcher().
			'control-via-variation-transform',
			'control-via-dynamic-key',
			'declared-but-not-rendered',
			'control-via-shared-component',
			'core-supports-provided-control',
			// Guards TRANSITIVE component resolution: the controls live two
			// levels down (<BackgroundPanel> -> <GradientOverlayControl>) and a
			// one-level resolver reports five false defects here.
			'control-via-nested-shared-component',
			// Guards DISPATCHER-TABLE resolution: the facade invokes its panels from
			// KIND_PANELS rather than rendering them as JSX tags, so a tag-only
			// recursion dead-ends and reports a false defect. 139 of 211 live findings.
			'control-via-dispatcher-table',
			// NEGATIVE CONTROLS for helperDerivedAttrs() (D810 fix). Each
			// derived key never appears literally anywhere in its fixture --
			// it exists only as the value shadowAttrKeys()/
			// gradientOverlayAttrKeys()/typographyAttrKeys() compute at call
			// time from the call site's own literal argument. This is the
			// exact shape that blinded the rule on sgs/hero (D810:
			// mediaOverlayGradient / mediaBackgroundGradient, 82 -> 84).
			'shadow-helper-derived',
			'gradient-helper-derived',
			'typography-helper-derived',
			// The extension surface, excluded by OWNERSHIP rather than by name
			// shape. `fx` and `fxGridDotColour` match no `sgs*` pattern at all,
			// which is exactly why the old regex missed the whole motion family
			// and put every declaring block in a catch-22 with
			// check-undeclared-attrs.py. Paired with
			// `extension-lookalike-still-flags` above.
			'extension-owned-attr',
		],
	},
};
