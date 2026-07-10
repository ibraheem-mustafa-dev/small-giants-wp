/**
 * check-hardcoded-render-defaults.js
 *
 * STRUCTURAL GUARD (Gate B) — stops the "hardcoded render default" class of
 * bug (F3) from regressing. An F3 violation occurs when a block declares an
 * attribute that is SUPPOSED to control a CSS property, but that same CSS
 * property is ALSO hardcoded with a literal value in the block's render.php
 * or style.css — silently overriding the attribute so the editor control
 * does nothing on the painted page.
 *
 * HOW IT WORKS
 * ------------
 *  For each block under src/blocks/<block>/:
 *    1. Parse block.json → collect attribute names.
 *    2. Map each attr name → the CSS property (or properties) it is expected
 *       to control, using the ATTR_TO_CSS_PROPS suffix map below.
 *    3. Scan style.css and render.php for CSS declarations that:
 *         a) set one of those mapped CSS properties,
 *         b) with a LITERAL value (not a CSS custom-property reference and not
 *            a PHP-interpolated value), and
 *         c) are NOT covered by an exemption (see EXEMPTIONS below).
 *    4. Report the violation: file, line, property, literal value, the attr
 *       that should own it.
 *
 * EXEMPTIONS (a declaration is NOT a violation when)
 * ---------------------------------------------------
 *  STRUCTURAL (original):
 *  - Value uses a CSS custom property:  var(--...)
 *  - Declaration is inside :where(...)  (low-specificity default)
 *  - File is editor.css                 (editor-only, not painted)
 *  - Value is a CSS reset keyword:      inherit | initial | unset | revert | normal | none | auto
 *  - Value is 0 (universal reset)
 *  - PHP render.php: the value is dynamically emitted (contains $, esc_attr,
 *    <?php, or a PHP interpolation marker) — only LITERAL string constants qualify.
 *  - The CSS selector is scoped to a :where() or a reset / animation /
 *    keyframes context (handled by the context-aware scanner).
 *
 *  ADDED (E1–E10, converged from 5-agent audit of 268 baseline findings):
 *  - E1  Selector-context awareness: sub-element selectors (__foo) only flagged
 *        when the attr name semantically maps to that element token.
 *  - E2  Variant/modifier scope: selectors containing --modifier or .is-style-*
 *        implement the class-switch pattern, not competing defaults.
 *  - E3  Interactive/pseudo states: :hover, :focus*, :active, [open], ::before/after etc.
 *  - E4  Responsive structural rules: declarations inside @media / @container.
 *  - E5  Multi-line value capture: join through the terminating ; before testing.
 *  - E6  Narrow `size` suffix: only flag on root/matching-element selectors.
 *  - E7  WCAG touch targets: 44px / 48px on width/height/min-width/min-height.
 *  - E8  Scoped-<style> wins: render.php emits a #$uid-scoped rule for the same
 *        property → style.css literal is a dormant fallback beaten by specificity.
 *  - E9  WP Block Selectors API typography: block.json declares selectors.typography
 *        → WP pipeline applies user values; base font-size literal is not competing.
 *  - E10 HTML-attribute consumption: render.php reads the attr as an HTML attribute
 *        (e.g. width="..." on <img>) rather than a CSS property — no CSS competition.
 *
 * BASELINE
 * --------
 *  Because existing blocks carry many current hardcodes (layout debt predates
 *  Gate B), the first run with --write-baseline seeds ALL current findings
 *  into scripts/hardcoded-render-defaults-baseline.json. Subsequent runs
 *  fail ONLY on NET-NEW violations that are not in the baseline. The baseline
 *  count is always printed so burn-down is visible.
 *
 *  To accept a new intentional hardcode: run with --write-baseline (dangerous)
 *  OR manually add the finding to the baseline with a reason — do NOT dump
 *  noise in to hide a real F3 violation. False-positive patterns should be
 *  fixed by broadening the EXEMPTION logic in this script instead.
 *
 * Usage
 * -----
 *   node scripts/check-hardcoded-render-defaults.js                  # report (exit 0 unless net-new)
 *   node scripts/check-hardcoded-render-defaults.js --check          # prebuild/CI gate (exit 1 on net-new)
 *   node scripts/check-hardcoded-render-defaults.js --write-baseline # seed / refresh the baseline
 *   node scripts/check-hardcoded-render-defaults.js --json           # machine-readable output
 *
 * Wired into prebuild / prestart in package.json.
 */

'use strict';

const fs   = require( 'fs' );
const path = require( 'path' );

const ROOT      = path.join( __dirname, '..' );
const BLOCKS_DIR = path.join( ROOT, 'src', 'blocks' );
const BASELINE_FILE = path.join( __dirname, 'hardcoded-render-defaults-baseline.json' );

// ---------------------------------------------------------------------------
// ATTR → CSS PROPERTIES MAP
//
// Derived mechanically from camelCase attr-name suffixes: given an attr name
// like `flexWrap`, `gap`, `labelFontSize`, `contentWidth`, the suffix (or
// full name) maps to the CSS property (or properties) it is expected to own.
//
// One-line justification per entry. Ordered from most-specific to least so
// the first match wins (most-specific is checked first in attrToCssProps()).
//
// Convention: keys are suffix patterns (lowercase, no dashes).
// A suffix is matched against the lowercased attr name with endsWith().
// Full-name matches are listed as patterns that equal the full lowercase name.
// ---------------------------------------------------------------------------

const SUFFIX_MAP = [
	// Typography
	{ suffix: 'fontsize',       props: [ 'font-size' ],                note: 'controls the element font size' },
	{ suffix: 'lineheight',     props: [ 'line-height' ],              note: 'controls line height' },
	{ suffix: 'letterspacing',  props: [ 'letter-spacing' ],           note: 'controls letter spacing' },
	{ suffix: 'fontweight',     props: [ 'font-weight' ],              note: 'controls font weight' },
	{ suffix: 'texttransform',  props: [ 'text-transform' ],           note: 'controls text transform' },
	// Alignment
	{ suffix: 'textalign',      props: [ 'text-align' ],               note: 'controls text alignment' },
	{ suffix: 'alignment',      props: [ 'text-align' ],                note: 'generic alignment attr → text-align (NOT align-items: a generic *Alignment attr governs text/content alignment or positions via a --align-* modifier class, not the flex/grid align-items axis — e.g. mega-menu panelAlignment sets sgs-mega-menu--align-* positioning, not align-items. align-items is covered by the alignitems + verticalalign suffixes.)' },
	{ suffix: 'verticalalign',  props: [ 'vertical-align', 'align-items' ], note: 'vertical alignment' },
	{ suffix: 'alignitems',     props: [ 'align-items' ],              note: 'flex/grid align-items' },
	{ suffix: 'aligncontent',   props: [ 'align-content' ],            note: 'flex/grid align-content' },
	{ suffix: 'justifycontent', props: [ 'justify-content' ],          note: 'flex/grid justify-content' },
	// Flex / layout
	{ suffix: 'flexwrap',       props: [ 'flex-wrap' ],                note: 'controls flex-wrap' },
	{ suffix: 'wrap',           props: [ 'flex-wrap' ],                note: 'shorthand wrap attr → flex-wrap' },
	{ suffix: 'flexdirection',  props: [ 'flex-direction' ],           note: 'controls flex-direction' },
	{ suffix: 'direction',      props: [ 'flex-direction' ],           note: 'shorthand direction attr → flex-direction' },
	// Grid
	{ suffix: 'gridtemplatecolumns', props: [ 'grid-template-columns' ], note: 'controls grid columns template' },
	{ suffix: 'columns',        props: [ 'grid-template-columns' ],    note: 'columns count → grid-template-columns' },
	// Spacing
	{ suffix: 'gap',            props: [ 'gap', 'column-gap', 'row-gap' ], note: 'controls gap / column-gap / row-gap' },
	{ suffix: 'paddingy',       props: [ 'padding', 'padding-top', 'padding-bottom' ], note: 'vertical padding (top+bottom) — e.g. cta button PaddingY' },
	{ suffix: 'paddingx',       props: [ 'padding', 'padding-left', 'padding-right' ], note: 'horizontal padding (left+right) — e.g. cta button PaddingX' },
	{ suffix: 'padding',        props: [ 'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left' ], note: 'controls padding' },
	{ suffix: 'paddingtop',     props: [ 'padding-top' ],              note: 'padding-top' },
	{ suffix: 'paddingright',   props: [ 'padding-right' ],            note: 'padding-right' },
	{ suffix: 'paddingbottom',  props: [ 'padding-bottom' ],           note: 'padding-bottom' },
	{ suffix: 'paddingleft',    props: [ 'padding-left' ],             note: 'padding-left' },
	{ suffix: 'margin',         props: [ 'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left' ], note: 'controls margin' },
	{ suffix: 'margintop',      props: [ 'margin-top' ],               note: 'margin-top' },
	{ suffix: 'marginright',    props: [ 'margin-right' ],             note: 'margin-right' },
	{ suffix: 'marginbottom',   props: [ 'margin-bottom' ],            note: 'margin-bottom' },
	{ suffix: 'marginleft',     props: [ 'margin-left' ],              note: 'margin-left' },
	// Sizing
	{ suffix: 'maxwidth',       props: [ 'max-width' ],                note: 'controls max-width' },
	{ suffix: 'minwidth',       props: [ 'min-width' ],                note: 'controls min-width' },
	{ suffix: 'maxheight',      props: [ 'max-height' ],               note: 'controls max-height' },
	{ suffix: 'minheight',      props: [ 'min-height' ],               note: 'controls min-height' },
	{ suffix: 'width',          props: [ 'width', 'max-width' ],       note: 'controls width / max-width' },
	{ suffix: 'height',         props: [ 'height' ],                   note: 'controls height' },
	{ suffix: 'size',           props: [ 'font-size', 'width', 'height' ], note: 'generic size attr (star/icon/badge size → font-size or width+height)' },
	// Colour
	{ suffix: 'colour',         props: [ 'color', 'background-color', 'fill', 'stroke', 'border-color' ], note: 'SGS-style *Colour attr → colour properties' },
	{ suffix: 'color',          props: [ 'color', 'background-color', 'fill', 'stroke', 'border-color' ], note: 'US-spelling *Color attr → colour properties' },
	{ suffix: 'backgroundcolour', props: [ 'background-color', 'background' ], note: 'background colour attr' },
	{ suffix: 'backgroundcolor',  props: [ 'background-color', 'background' ], note: 'background colour attr (US)' },
	// Border
	{ suffix: 'borderwidth',    props: [ 'border-width', 'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width' ], note: 'border width' },
	{ suffix: 'bordercolour',   props: [ 'border-color' ],             note: 'border colour' },
	{ suffix: 'bordercolor',    props: [ 'border-color' ],             note: 'border colour (US)' },
	{ suffix: 'borderradius',   props: [ 'border-radius' ],            note: 'border radius' },
	// Opacity / z-index
	{ suffix: 'opacity',        props: [ 'opacity' ],                  note: 'controls opacity' },
	{ suffix: 'zindex',         props: [ 'z-index' ],                  note: 'controls z-index' },
];

// ---------------------------------------------------------------------------
// CSS VALUE EXEMPTION PATTERNS
//
// A declaration value is EXEMPT (not a violation) when it matches any of
// these. The check applies AFTER stripping whitespace.
// ---------------------------------------------------------------------------

/**
 * CSS reset / non-layout keywords that are never "attr-owned" constants, plus
 * `currentColor` (always derives from the parent colour cascade — not a fixed
 * override) and `transparent` (a structural reset on hover/focus states, not
 * a hardcoded colour override).
 */
const EXEMPT_VALUE_RE =
	/^(inherit|initial|unset|revert|revert-layer|normal|none|auto|currentcolor|transparent|0|0px|0%|0rem|0em)$/i;

/**
 * CSS custom property reference — the sanctioned overridable-default pattern.
 * Allow optional whitespace after the opening paren: `var( --sgs-x, 1 )` is
 * common in WP / SGS codebases (phpcs forces the space).
 */
const CSS_VAR_RE = /var\s*\(\s*--/;

/**
 * Value contains a PHP dynamic expression. An inline style in render.php
 * is exempt if the ENTIRE value string contains a PHP interpolation —
 * meaning the PHP script writes it, not a static constant.
 * Also matches sprintf placeholders (`%s`, `%d`, `%f`) which appear in
 * string-template arguments that are later filled with PHP values.
 */
const PHP_DYNAMIC_RE = /\$[a-zA-Z_]|\besc_attr\b|\besc_html\b|<\?php|%[sdfe]/;

// ---------------------------------------------------------------------------
// E7 — WCAG touch target values
// 44px and 48px on dimension properties are canonical touch-target minimums
// (WCAG 2.2 SC 2.5.8). These are never attr-owned layout constants.
// ---------------------------------------------------------------------------
const TOUCH_TARGET_SIZES = new Set( [ '44px', '48px' ] );
const TOUCH_TARGET_PROPS = new Set( [ 'width', 'height', 'min-width', 'min-height' ] );

// ---------------------------------------------------------------------------
// E3 — Interactive / pseudo-state selectors
// Declarations under these selectors are interactive variants, not competing
// defaults. They are driven by user interaction / browser state, not attr values.
// ---------------------------------------------------------------------------
const INTERACTIVE_PSEUDO_RE = /:hover|:focus(?:-visible|-within)?|:active|:disabled|\[open\]|::(?:before|after|first-letter|placeholder|backdrop|selection|marker|details-content|-webkit-)/i;

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function readIfExists( p ) {
	return fs.existsSync( p ) ? fs.readFileSync( p, 'utf8' ) : '';
}

/**
 * Given a camelCase attribute name, return the set of CSS properties it is
 * expected to control. Returns an empty Set when the attr name does not match
 * any suffix in SUFFIX_MAP (e.g. purely semantic attrs like `content`, `label`).
 *
 * Strategy: normalise attr to lowercase, then walk SUFFIX_MAP from most-specific
 * to least-specific (array order). First match wins.
 */
function attrToCssProps( attrName ) {
	const lower = attrName.toLowerCase();
	for ( const entry of SUFFIX_MAP ) {
		if ( lower.endsWith( entry.suffix ) ) {
			return new Set( entry.props );
		}
	}
	return new Set();
}

/**
 * Strip CSS and PHP comments from source so a property surviving only in a
 * comment is NOT flagged. Also strips @media / selector context noise for the
 * purpose of finding literal values (the per-line scanner handles context).
 */
function stripComments( src ) {
	return src
		.replace( /\/\*[\s\S]*?\*\//g, ' ' ) // /* ... */
		.replace( /(^|[^:])\/\/[^\n]*/g, '$1 ' ) // // ... (not http://)
		.replace( /^\s*#[^\n]*/gm, ' ' ); // # PHP comment
}

// ---------------------------------------------------------------------------
// E1 — SELECTOR-CONTEXT HELPERS
//
// Given a selector (the text that opened the most recent `{`), determine
// whether it targets a BEM sub-element (`__something`) and, if so, whether
// the given attr name semantically maps to that element.
// ---------------------------------------------------------------------------

/**
 * Extract the BEM sub-element token(s) from a selector string.
 * e.g. ".sgs-gallery__caption" → ["caption"]
 *      ".sgs-trust-bar__badge-label" → ["badge-label", "badge", "label"]
 * Returns null if the selector has no `__element` part (root-level selector).
 *
 * We extract ALL `__`-delimited tokens and also the individual dash-separated
 * parts of the element (so `badge-label` matches both `badge` and `label`).
 */
function extractBemElements( selector ) {
	// Find all `__something` fragments. Use a global match.
	const matches = selector.match( /__([a-zA-Z0-9-]+)/g );
	if ( ! matches || matches.length === 0 ) {
		return null; // no sub-element — root selector
	}
	const tokens = new Set();
	for ( const m of matches ) {
		const element = m.slice( 2 ); // strip __
		tokens.add( element.toLowerCase() );
		// Also add each dash-part (e.g. "badge-label" → "badge", "label")
		for ( const part of element.split( '-' ) ) {
			if ( part.length > 1 ) {
				tokens.add( part.toLowerCase() );
			}
		}
	}
	return tokens;
}

/**
 * E1: For a sub-element selector, check whether the attr name semantically
 * maps to that element. Returns true (EXEMPT) when the attr does NOT map to
 * the sub-element — i.e. it is a root-level concern being incorrectly applied
 * to a sub-element selector.
 *
 * Semantic match rule: the lowercased attr name must CONTAIN at least one of
 * the element tokens. If none match, the attr "owns" a different element and
 * the declaration on this sub-element selector is NOT a real F3 violation.
 *
 * Example:
 *   attrName = "gap"         selector tokens = ["header"] → no match → EXEMPT
 *   attrName = "captionColour" selector tokens = ["caption"] → "caption" in "captioncolour" → NOT exempt (real)
 *   attrName = "labelFontSize" selector tokens = ["label"] → "label" in "labelfontsize" → NOT exempt (real)
 *   attrName = "gap"         selector tokens = null (root) → NOT exempt (checked normally)
 */
function isBemSubElementMismatch( attrName, bemElements ) {
	if ( bemElements === null ) {
		return false; // root selector — apply full checking
	}
	const lowerAttr = attrName.toLowerCase();
	for ( const token of bemElements ) {
		if ( lowerAttr.includes( token ) ) {
			return false; // attr DOES map to this element → not exempt
		}
	}
	// No token matched → the attr controls something else; this sub-element
	// declaration is not owned by this attr → exempt.
	return true;
}

// ---------------------------------------------------------------------------
// E6 — NARROW THE `size` SUFFIX
//
// Attrs ending in `size` (iconSize, starSize, badgeSize, pillSize, etc.) map
// to font-size + width + height via SUFFIX_MAP. Without narrowing, every
// width/height/font-size on any sub-element in the file gets flagged.
//
// Narrowing rule: `size`-suffix attrs ONLY flag declarations on:
//   (a) root-element selectors (no `__` in the selector), OR
//   (b) selectors whose element token contains "icon", "size", "star", "badge",
//       "circle", "pill", or matches the attr's own prefix before "size".
// ---------------------------------------------------------------------------

/**
 * Returns the element-match tokens for a `size`-type attr.
 * e.g. "iconSize" → ["icon", "size"]
 *      "starSize" → ["star", "size"]
 *      "badgeSize" → ["badge", "size"]
 *      "pillSize" → ["pill", "size"]
 *      "imageSize" → ["image", "img", "size"]
 *      "iconCircleSize" → ["icon", "circle", "size"]
 */
function sizeAttrTokens( attrName ) {
	const lower = attrName.toLowerCase();
	// Strip "size" suffix to get the prefix
	const prefix = lower.endsWith( 'size' ) ? lower.slice( 0, -4 ) : lower;
	const tokens = new Set( [ 'size' ] );
	// Add each dash-separated or camelCase part of the prefix
	// Split on camelCase transitions (lowercase → uppercase boundary)
	const parts = prefix.split( /(?=[A-Z])/g ).map( p => p.toLowerCase() ).filter( Boolean );
	for ( const p of parts ) {
		if ( p.length > 1 ) {
			tokens.add( p );
		}
	}
	// Common aliase: image → img
	if ( tokens.has( 'image' ) ) {
		tokens.add( 'img' );
	}
	return tokens;
}

// ---------------------------------------------------------------------------
// E11 — PREFIXED-HELPER SELECTOR GOVERNANCE
//
// Some attrs are consumed by a shared "prefixed attribute set" PHP helper —
// sgs_button_element_style_css() (built-in CTA colour/border/radius/padding/
// font) and sgs_typography_css_rule() (per-element typography). The helper
// builds the CSS key by string concatenation ($prefix . 'Suffix') and applies
// it to a SPECIFIC selector passed at the call site. So the attr governs ONLY
// those selectors — NOT every element in the block whose CSS happens to set the
// same property.
//
// Without this, adding e.g. `ctaBorderRadius` makes the gate flag EVERY
// hardcoded `border-radius` in the block (on `.pill`, a trial-tag, etc.) as if
// the CTA attr owned it — a false association. E11 reads render.php for each
// helper call, extracts the literal PREFIX + the SELECTOR class tokens, and
// (for the button helper, whose styled element also carries `.sgs-button`) adds
// the `sgs-button` token. A hardcoded value of a helper attr's property is then
// flagged ONLY when the containing rule's selector references one of the
// helper's governed tokens. This REPLACES the E1/E6 name-heuristic for helper
// attrs (whose element-ownership is authoritative from the call site, not the
// attr name); native attrs keep the existing E1/E6 behaviour unchanged.
// ---------------------------------------------------------------------------

/**
 * Suffixes each shared prefixed-helper reads (mirrors the helper's own doc:
 * includes/helpers-button-style.php + includes/helpers-typography.php). Only
 * the suffixes that map to a CSS property matter here, but the full lists are
 * kept so the governance set matches the dead-control guard's list exactly.
 * `extraTokens` are class tokens the styled element carries beyond the ones in
 * the selector literal (the button helper's element is always a `.sgs-button`).
 */
const HELPER_SELECTOR_SUFFIXES = {
	sgs_button_element_style_css: {
		suffixes: [
			'ColourBackground', 'ColourText', 'ColourBorder',
			'ColourBackgroundHover', 'ColourTextHover', 'ColourBorderHover',
			'BorderStyle', 'BorderWidth', 'BorderRadius',
			'FontWeight', 'FontSize', 'PaddingY', 'PaddingX', 'WidthType',
		],
		extraTokens: [ 'sgs-button' ],
	},
	sgs_typography_css_rule: {
		suffixes: [
			'FontSize', 'FontSizeUnit', 'FontSizeTablet', 'FontSizeMobile',
			'FontWeight', 'FontStyle', 'TextTransform', 'TextDecoration',
			'LineHeight', 'LineHeightUnit', 'LineHeightTablet', 'LineHeightMobile',
			'LetterSpacing', 'LetterSpacingUnit', 'LetterSpacingTablet', 'LetterSpacingMobile',
		],
		extraTokens: [],
	},
};

/**
 * Capture the raw argument text of each call to `fnName` in `src` (balanced
 * parens; whole-identifier match). Returns an array of arg-region strings.
 */
function captureCallArgRegions( src, fnName ) {
	const regions = [];
	const needle = fnName + '(';
	let from = 0;
	let idx;
	while ( ( idx = src.indexOf( needle, from ) ) !== -1 ) {
		// Whole-identifier guard: the char before must not be an identifier char.
		const before = idx > 0 ? src[ idx - 1 ] : '';
		if ( /[A-Za-z0-9_]/.test( before ) ) {
			from = idx + needle.length;
			continue;
		}
		let i = idx + needle.length;
		let depth = 1;
		const start = i;
		while ( i < src.length && depth > 0 ) {
			const ch = src[ i ];
			if ( ch === '(' ) {
				depth++;
			} else if ( ch === ')' ) {
				depth--;
			}
			i++;
		}
		regions.push( src.slice( start, i - 1 ) );
		from = i;
	}
	return regions;
}

/**
 * Build a Map<attrName, Set<token>> of prefixed-helper governance from
 * render.php. For each helper call: the FIRST string literal in the argument
 * list is the prefix, all SUBSEQUENT string literals are the selector fragments
 * (a PHP concat like `'.' . $uid . ' .product-card__view'`). Class tokens are
 * extracted from the concatenated selector fragments; the helper's extraTokens
 * are added. Each `prefix + suffix` attr maps to that call's token set (unioned
 * across calls). A call with a non-literal (computed) prefix is skipped.
 */
function collectHelperGovernance( renderPhpSrc ) {
	const gov = new Map();
	if ( ! renderPhpSrc ) {
		return gov;
	}
	const src = renderPhpSrc
		.replace( /\/\*[\s\S]*?\*\//g, ' ' )
		.replace( /(^|[^:])\/\/[^\n]*/g, '$1 ' );

	for ( const [ fnName, spec ] of Object.entries( HELPER_SELECTOR_SUFFIXES ) ) {
		for ( const region of captureCallArgRegions( src, fnName ) ) {
			const lits = [];
			const litRe = /'([^']*)'|"([^"]*)"/g;
			let lm;
			while ( ( lm = litRe.exec( region ) ) !== null ) {
				lits.push( lm[ 1 ] !== undefined ? lm[ 1 ] : lm[ 2 ] );
			}
			if ( lits.length < 2 ) {
				continue; // need a literal prefix + at least one selector fragment
			}
			const prefix = lits[ 0 ];
			const selectorText = lits.slice( 1 ).join( ' ' );
			const tokens = new Set( spec.extraTokens.map( ( t ) => t.toLowerCase() ) );
			const clsRe = /\.([a-zA-Z0-9_-]+)/g;
			let cm;
			while ( ( cm = clsRe.exec( selectorText ) ) !== null ) {
				tokens.add( cm[ 1 ].toLowerCase() );
			}
			if ( tokens.size === 0 ) {
				continue;
			}
			for ( const suffix of spec.suffixes ) {
				const attrName = '' !== prefix
					? prefix + suffix
					: suffix.charAt( 0 ).toLowerCase() + suffix.slice( 1 );
				if ( ! gov.has( attrName ) ) {
					gov.set( attrName, new Set() );
				}
				for ( const t of tokens ) {
					gov.get( attrName ).add( t );
				}
			}
		}
	}
	return gov;
}

/**
 * Does `selector` reference any of the governed class tokens AS A CLASS? Matches
 * `.<token>` at a class boundary (the char after the token must not continue the
 * class name), so token `price` matches `.price` / `.price:hover` / `.price ` but
 * NOT `.price-from-amount` and NOT the bare word "price" inside a CSS comment
 * that the scanner accumulates into the selector text. This precision matters:
 * the accumulated selector can include the preceding comment (e.g. "Per-unit
 * price …"), so a bare substring match would wrongly attribute that rule to a
 * price-prefixed helper attr.
 */
function selectorReferencesGovernedToken( selector, tokens ) {
	const lower = selector.toLowerCase();
	for ( const t of tokens ) {
		if ( ! t ) {
			continue;
		}
		const escaped = t.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
		const re = new RegExp( '\\.' + escaped + '(?![a-z0-9_-])', 'i' );
		if ( re.test( lower ) ) {
			return true;
		}
	}
	return false;
}

// ---------------------------------------------------------------------------
// E8 — SCOPED-<STYLE>-WINS DETECTION
//
// Before flagging a style.css declaration, check whether the block's render.php
// emits a #$uid-scoped rule for the same CSS property. When it does, the
// style.css literal is a dormant fallback beaten by the higher-specificity
// scoped rule — not a real F3 violation.
//
// Pattern: PHP builds a string like "#$uid.sgs-feature-grid { ... gap: ... }"
// and echoes it as a <style> tag. We look for:
//   1. A string in render.php containing "#$uid" (or the equivalent with a
//      variable that becomes a UID) AND
//   2. The target CSS property name appearing in that string.
// ---------------------------------------------------------------------------

/**
 * Build the set of CSS properties that render.php emits in a #$uid-scoped
 * <style> block. Returns a Set of property names (lowercased).
 */
function getScopedStyleProps( renderPhpSrc ) {
	if ( ! renderPhpSrc ) {
		return new Set();
	}
	const props = new Set();

	// Look for PHP heredoc / string blocks that contain a UID variable
	// (typically `#$uid` or `#$block_id` or similar) used inside a CSS block.
	// We search for the pattern:  $css = "...#$<varname>...property: ...";
	// or echo '<style>' followed by a string containing #$<var>.
	//
	// Strategy: find lines that contain a CSS property name preceded by a
	// '#' + '$' sequence (the #$uid selector pattern). We normalise to
	// lower-case and collect the property names.

	// Strip PHP block comments first.
	const stripped = renderPhpSrc
		.replace( /\/\*[\s\S]*?\*\//g, ' ' )
		.replace( /(^|[^:])\/\/[^\n]*/g, '$1 ' );

	// Match a CSS property declaration within a string that also mentions #$
	// (UID-scoped block). We look for the text pattern:
	//   #$<identifier>  ... (within some lines) ... property: value;
	// A simpler heuristic: collect all CSS property names from lines that
	// appear BETWEEN a '#$' reference and the end of the string literal.
	//
	// Even simpler: if the file has '#$' + prop anywhere in a string context,
	// treat that as a scoped emission of that prop.
	//
	// We split on string delimiters and look inside each string chunk.
	// PHP strings can span multiple lines (heredoc, double-quote with concat).
	// Rather than full PHP parsing, we use a regex that captures content between
	// double-quoted string regions that include #$ (good enough for this pattern).

	// Find all occurrences of #$<word> and then look for CSS props in the
	// surrounding string context (up to 500 chars in each direction).
	const uidMarkerRe = /#\$[a-zA-Z_][a-zA-Z0-9_]*/g;
	let m;
	while ( ( m = uidMarkerRe.exec( stripped ) ) !== null ) {
		const start  = Math.max( 0, m.index - 50 );
		const end    = Math.min( stripped.length, m.index + 500 );
		const chunk  = stripped.slice( start, end );
		// Extract CSS property names from this chunk
		const propRe = /\b([\w-]+)\s*:/g;
		let pm;
		while ( ( pm = propRe.exec( chunk ) ) !== null ) {
			const candidate = pm[ 1 ].toLowerCase().trim();
			// Only recognise known CSS property names (avoid PHP keys)
			if ( /^[a-z-]+$/.test( candidate ) && candidate.includes( '-' ) || isKnownCssProp( candidate ) ) {
				props.add( candidate );
			}
		}
	}

	return props;
}

/** Lightweight list of CSS property names we care about for E8. */
function isKnownCssProp( name ) {
	return new Set( [
		'gap', 'row-gap', 'column-gap',
		'grid-template-columns', 'grid-template-rows',
		'flex-direction', 'flex-wrap', 'align-items', 'justify-content',
		'font-size', 'width', 'height', 'max-width', 'min-height',
		'padding', 'margin', 'color', 'background-color', 'border-radius',
	] ).has( name );
}

// ---------------------------------------------------------------------------
// E9 — WP BLOCK SELECTORS API TYPOGRAPHY
//
// If block.json declares `selectors.typography` (targeting a child element),
// WP's own styling pipeline applies the user's fontSize/lineHeight/etc. values
// via generated CSS on that child selector — the literal in style.css is the
// design-system default and is NOT competing with the attr at the same
// specificity level. We exempt font-size / line-height / letter-spacing /
// font-weight / text-transform for any block that declares selectors.typography.
// ---------------------------------------------------------------------------

const WP_NATIVE_TYPOGRAPHY_PROPS = new Set( [
	'font-size', 'line-height', 'letter-spacing', 'font-weight', 'text-transform',
] );

// ---------------------------------------------------------------------------
// E10 — HTML-ATTRIBUTE CONSUMPTION
//
// If render.php reads the attr as an HTML attribute (e.g. width="..." on an
// <img>, or height="...") rather than ever emitting it as a CSS property, the
// attr is consumed by the HTML layer and has no CSS-level conflict.
//
// Heuristic: search render.php for the pattern: attr-name (as slug) followed
// by `="` or `= "` in an HTML context, NOT in a `style="..."` value.
// ---------------------------------------------------------------------------

/**
 * Build the set of attribute names that render.php consumes as HTML attributes
 * (rather than CSS properties). Returns a Set of camelCase attr names.
 *
 * We look for patterns like:
 *   width="<?php ... ?>"   (PHP echo inside html attr)
 *   'width="' . $something  (concatenated html attr)
 * When an attr whose name matches a known HTML attr (width, height) appears
 * in an HTML-attribute context, we consider it HTML-consumed.
 */
function getHtmlAttrConsumedAttrs( renderPhpSrc, blockAttrs ) {
	if ( ! renderPhpSrc ) {
		return new Set();
	}
	const consumed = new Set();
	// HTML attribute names we check (a subset that could be confused with CSS)
	const htmlAttrNames = [ 'width', 'height' ];
	for ( const htmlAttr of htmlAttrNames ) {
		// Look for patterns like:  width="   or  width='  (not inside a style="...")
		// Crude but effective: the attr appears as an HTML attribute when it is
		// immediately followed by = and a quote and the preceding text is NOT `style`.
		const re = new RegExp( `(?<!style\\s*=\\s*["'][^"']{0,200})\\b${ htmlAttr }\\s*=\\s*["']`, 'i' );
		if ( re.test( renderPhpSrc ) ) {
			// Find block attrs whose name ends with this html attr suffix
			for ( const attrName of blockAttrs ) {
				const lower = attrName.toLowerCase();
				if ( lower.endsWith( htmlAttr ) && lower !== htmlAttr ) {
					// e.g. imageWidth → html attr is "width"; if the attr has a prefix,
					// this is likely consumed as an html attr + CSS custom property.
					// Only exempt if the attr name is EXACTLY the html attr or a known
					// image dimension attr.
					if ( lower === 'imagewidth' || lower === 'imageheight' ||
						lower === 'logowidth' || lower === 'logoheight' ||
						lower === 'avatarwidth' || lower === 'avatarheight' ) {
						consumed.add( attrName );
					}
				}
			}
		}
	}
	return consumed;
}

// ---------------------------------------------------------------------------
// CSS SCANNER
//
// Scans a CSS (or PHP containing heredoc/echo CSS) source file for
// declarations of the form:   property: literal-value;
//
// Returns findings: { file, line, property, value, context }.
// ---------------------------------------------------------------------------

/**
 * Is `value` a literal constant that could override an attr-driven value?
 * Returns false (safe / exempt) when:
 *   - uses var(--...)
 *   - is a reset keyword or 0
 *   - is a PHP dynamic expression
 *   - is a CSS percentage used as a structural ratio (100% on w/h is structural)
 */
function isLiteralConstant( value, property ) {
	const v = value.trim();
	if ( ! v ) {
		return false;
	}
	if ( CSS_VAR_RE.test( v ) ) {
		return false; // uses custom property → sanctioned overridable default
	}
	if ( EXEMPT_VALUE_RE.test( v ) ) {
		return false; // reset keyword or 0
	}
	if ( PHP_DYNAMIC_RE.test( v ) ) {
		return false; // PHP-generated value
	}
	// 100% / 100vw / 100vh on width/height/max-width is a structural "fill the
	// available space / clamp to the viewport" reset, not a layout constant that
	// overrides an attr. A `max-width:100vw` is a universal viewport-overflow
	// safety clamp (e.g. on .sgs-mobile-nav) — NOT the drawer-width control (which
	// governs a narrower value on the drawer element). Exempt it.
	if ( /^100(%|vw|vh)$/.test( v ) && /^(width|height|max-width)$/.test( property ) ) {
		return false;
	}
	// `1em` / `1.5em` etc. on width/height for inline SVG/icon elements scales
	// with the font size — it's a RELATIVE structural value, not a fixed
	// constant competing with an iconSize attr (which emits absolute px via
	// render.php). Exempt it.
	if ( /^\d*\.?\d+em$/.test( v ) && /^(width|height)$/.test( property ) ) {
		return false;
	}
	// `1px` on width/height/border is the standard accessibility visually-hidden
	// pattern (e.g. honeypot fields, screen-reader-only elements). It is never a
	// layout constant competing with an attr-driven dimension.
	if ( /^1px$/.test( v ) && /^(width|height|border(-width)?)$/.test( property ) ) {
		return false;
	}
	return true;
}

/**
 * E5 — MULTI-LINE VALUE CAPTURE
 *
 * Join a run of lines from `startLine` until we find the terminating `;` or `}`.
 * Returns the full value string (everything after the `:` up to the `;`).
 */
function captureFullValue( lines, startLine, colonPos ) {
	let collected = lines[ startLine ].slice( colonPos + 1 );
	let lineIdx   = startLine;

	while ( lineIdx < lines.length ) {
		const semiIdx = collected.indexOf( ';' );
		const braceIdx = collected.indexOf( '}' );
		if ( semiIdx !== -1 && ( braceIdx === -1 || semiIdx < braceIdx ) ) {
			return collected.slice( 0, semiIdx ).trim();
		}
		if ( braceIdx !== -1 ) {
			return collected.slice( 0, braceIdx ).trim();
		}
		lineIdx++;
		if ( lineIdx < lines.length ) {
			collected += ' ' + lines[ lineIdx ].trim();
		}
	}
	return collected.trim();
}

/**
 * Scan `src` for CSS declarations matching any property in `targetProps`.
 * Applies all exemptions:
 *   - :where(...) blocks (low-specificity default OK)
 *   - @keyframes blocks
 *   - @media / @container blocks (E4)
 *   - Selector contains --modifier or .is-style-* (E2)
 *   - Selector or its ancestor contains interactive/pseudo state (E3)
 *   - Sub-element selector where attr doesn't map to that element (E1)
 *   - WCAG touch-target 44px/48px on dimension props (E7)
 *   - `size`-suffix attrs on non-matching sub-elements (E6)
 *
 * Returns array of { line (1-based), property, value, selector, inWhereBlock }.
 *
 * @param {string}   src         Full CSS source (comments already stripped).
 * @param {Set}      targetProps CSS property names to watch for.
 * @param {string[]} attrNames   Block attribute names (for E1/E6 checks).
 * @param {Map}      cssToAttrs  CSS property → Set of attr names.
 * @param {Map}      helperGov   E11: attrName → Set of governed selector tokens
 *                               for prefixed-helper attrs (authoritative
 *                               element-ownership, replaces E1/E6 for them).
 */
function scanCssDeclarations( src, targetProps, attrNames, cssToAttrs, helperGov ) {
	const findings = [];
	const lines    = src.split( '\n' );

	let depthTotal    = 0; // { } brace depth
	let whereDepth    = 0;
	let inWhere       = false;
	let keyframeDepth = 0;
	let inKeyframes   = false;
	let mediaDepth    = 0;  // E4: @media / @container depth
	let inMedia       = false;

	// Selector tracking (E1/E2/E3): maintain a stack of selectors at each brace depth.
	// When we see a `{`, push the preceding selector text. When we see `}`, pop.
	/** @type {string[]} */
	const selectorStack = [];
	// Buffer for the "pending selector" — accumulated text since the last `}` or start.
	let pendingSelector = '';

	for ( let i = 0; i < lines.length; i++ ) {
		const line    = lines[ i ];
		const lineNum = i + 1;

		const opens  = ( line.match( /\{/g ) || [] ).length;
		const closes = ( line.match( /\}/g ) || [] ).length;

		// ── :where( detection ────────────────────────────────────────────────
		if ( /:[a-z-]*where\s*\(/i.test( line ) ) {
			inWhere    = true;
			whereDepth = depthTotal + opens;
		}

		// ── @keyframes detection ─────────────────────────────────────────────
		if ( /^\s*@keyframes/i.test( line ) ) {
			inKeyframes   = true;
			keyframeDepth = depthTotal + opens;
		}

		// ── E4: @media / @container detection ────────────────────────────────
		if ( /^\s*@(?:media|container)\b/i.test( line ) ) {
			inMedia    = true;
			mediaDepth = depthTotal + opens;
		}

		// ── Selector stack management ─────────────────────────────────────────
		// Accumulate pending selector text from lines that look like selectors
		// (i.e. do not contain declarations and precede a `{`).
		if ( opens > 0 ) {
			// The text up to the first `{` on this line is the tail of the selector.
			const beforeBrace = line.indexOf( '{' );
			if ( beforeBrace >= 0 ) {
				pendingSelector += ' ' + line.slice( 0, beforeBrace );
			}
			selectorStack.push( pendingSelector.trim() );
			pendingSelector = '';
		} else if ( closes === 0 ) {
			// No braces → could be a continuation of a multi-line selector.
			// Only accumulate if it looks like a selector (no `:` followed by value).
			if ( ! /^\s*[\w-]+\s*:/.test( line ) ) {
				pendingSelector += ' ' + line.trim();
			}
		}

		// Update depth AFTER selector stack push.
		depthTotal += opens - closes;

		// Pop selector stack for each close-brace.
		for ( let c = 0; c < closes; c++ ) {
			if ( selectorStack.length > 0 ) {
				selectorStack.pop();
			}
		}

		// Exit :where / @keyframes / @media when depth drops back to entry level.
		if ( inWhere && depthTotal < whereDepth ) {
			inWhere = false;
		}
		if ( inKeyframes && depthTotal < keyframeDepth ) {
			inKeyframes = false;
		}
		if ( inMedia && depthTotal < mediaDepth ) {
			inMedia = false;
		}

		// ── Exempt contexts ───────────────────────────────────────────────────
		if ( inWhere || inKeyframes ) {
			continue;
		}
		// E4: skip everything inside @media / @container
		if ( inMedia ) {
			continue;
		}

		// Current selector context for E1/E2/E3 checks.
		// Use the full selector chain (join stack) for the most complete check.
		const currentSelector = selectorStack.join( ' ' );

		// E2: skip if selector chain contains a BEM modifier (--modifier) or .is-style-*.
		if ( /--[a-zA-Z0-9-]+/.test( currentSelector ) || /\.is-style-/.test( currentSelector ) ) {
			continue;
		}

		// E3: skip if selector chain contains an interactive / pseudo state.
		if ( INTERACTIVE_PSEUDO_RE.test( currentSelector ) ) {
			continue;
		}

		// ── Match CSS declaration: property: value; ───────────────────────────
		// E5: multi-line value capture — match property up to the `:`,
		// then collect the value through the terminating `;`.
		const declRe = /^\s*([\w-]+)\s*:/;
		const m      = declRe.exec( line );
		if ( ! m ) {
			continue;
		}
		const property = m[ 1 ].toLowerCase().trim();

		if ( ! targetProps.has( property ) ) {
			continue;
		}

		// E5: capture the full value (may span multiple lines).
		const colonPos = line.indexOf( ':' );
		const rawValue = captureFullValue( lines, i, colonPos );

		if ( ! isLiteralConstant( rawValue, property ) ) {
			continue;
		}

		// E7: WCAG touch-target exemption — 44px / 48px on dimension properties.
		if ( TOUCH_TARGET_SIZES.has( rawValue ) && TOUCH_TARGET_PROPS.has( property ) ) {
			continue;
		}

		// ── Per-attr checks (E1, E6) for every attr that maps to this property ──
		const owningAttrs = cssToAttrs.get( property );
		if ( ! owningAttrs ) {
			continue;
		}

		// Extract BEM sub-element tokens from the current selector (for E1/E6).
		const bemElements = extractBemElements( currentSelector );

		// Check whether ALL owning attrs are exempt for this selector.
		// If at least one owning attr is NOT exempt, the finding stands.
		const nonExemptAttrs = [];
		for ( const attrName of owningAttrs ) {
			// E11: prefixed-helper attr — element-ownership is authoritative from
			// the helper's call selector(s), NOT the attr-name/element heuristic.
			// Flag ONLY when the rule's selector references a governed token; this
			// REPLACES E1/E6 for the attr (native attrs fall through unchanged).
			if ( helperGov && helperGov.has( attrName ) ) {
				if ( selectorReferencesGovernedToken( currentSelector, helperGov.get( attrName ) ) ) {
					nonExemptAttrs.push( attrName );
				}
				continue;
			}

			// E1: sub-element selector mismatch — attr doesn't map to this element.
			if ( isBemSubElementMismatch( attrName, bemElements ) ) {
				continue; // this attr is exempt for this selector
			}

			// E6: narrow `size` suffix — only flag on root or semantically matching selectors.
			if ( attrName.toLowerCase().endsWith( 'size' ) ) {
				if ( bemElements !== null ) {
					// On a sub-element: only flag if the attr's size tokens overlap with the element.
					const sizeTokens = sizeAttrTokens( attrName );
					let matched = false;
					for ( const token of bemElements ) {
						if ( sizeTokens.has( token ) ) {
							matched = true;
							break;
						}
					}
					if ( ! matched ) {
						continue; // E6 exempt
					}
				}
				// On root selector: allow fall-through to report
			}

			nonExemptAttrs.push( attrName );
		}

		if ( nonExemptAttrs.length === 0 ) {
			continue; // all owning attrs are exempt for this declaration
		}

		findings.push( {
			line:     lineNum,
			property,
			value:    rawValue,
			selector: currentSelector,
			attrs:    nonExemptAttrs,
		} );
	}

	return findings;
}

// ---------------------------------------------------------------------------
// PHP RENDER.PHP SCANNER
//
// Looks for echo'd inline style attributes that contain hardcoded literal
// values for a target property.  Only flags genuinely static string constants;
// PHP-dynamic values (containing $, esc_attr, <?php) are exempt.
//
// Pattern targeted:
//   echo 'style="flex-direction: column"';
//   echo "<div style=\"gap: 10px\">";
//   style="gap: 10px"    (literal string fragment not wrapped in PHP)
// ---------------------------------------------------------------------------

function scanPhpInlineStyles( src, targetProps ) {
	const findings = [];

	// Strip PHP single-line comments (// ...) and block comments (/* ... */)
	// BEFORE splitting into lines, so a comment containing `style="..."` is
	// never mistaken for a real static inline style (hero render.php line 358
	// comment incident).
	const stripped = src
		.replace( /\/\*[\s\S]*?\*\//g, ' ' ) // /* ... */
		.replace( /(^|[^:])\/\/[^\n]*/g, '$1 ' ); // // ... (not http://)

	const lines = stripped.split( '\n' );

	// Match style="..." or style='...' literals in echo'd strings.
	// We look for the whole value of the style attr in a string context.
	const styleAttrRe = /style\s*=\s*["']([^"']*?)["']/gi;

	for ( let i = 0; i < lines.length; i++ ) {
		const line    = lines[ i ];
		const lineNum = i + 1;

		// If the line contains PHP dynamics, the style value is not a constant —
		// skip it. This is a line-level check; per-property scanning is below.
		if ( PHP_DYNAMIC_RE.test( line ) ) {
			continue;
		}

		let m;
		styleAttrRe.lastIndex = 0;
		while ( ( m = styleAttrRe.exec( line ) ) !== null ) {
			const styleValue = m[ 1 ];
			// Parse individual declarations from the style value.
			const declRe = /([\w-]+)\s*:\s*([^;]+)/g;
			let d;
			while ( ( d = declRe.exec( styleValue ) ) !== null ) {
				const property = d[ 1 ].toLowerCase().trim();
				const rawValue = d[ 2 ].trim();
				if ( ! targetProps.has( property ) ) {
					continue;
				}
				if ( ! isLiteralConstant( rawValue, property ) ) {
					continue;
				}
				// E7: touch target
				if ( TOUCH_TARGET_SIZES.has( rawValue ) && TOUCH_TARGET_PROPS.has( property ) ) {
					continue;
				}
				findings.push( { line: lineNum, property, value: rawValue } );
			}
		}
	}

	return findings;
}

// ---------------------------------------------------------------------------
// PER-BLOCK SCAN
// ---------------------------------------------------------------------------

/**
 * Scan one block directory. Returns an array of violation objects:
 *   { block, file, line, property, value, attr }
 */
function checkBlock( blockDir ) {
	const blockJsonPath = path.join( blockDir, 'block.json' );
	if ( ! fs.existsSync( blockJsonPath ) ) {
		return [];
	}

	let meta;
	try {
		meta = JSON.parse( fs.readFileSync( blockJsonPath, 'utf8' ) );
	} catch ( e ) {
		// Invalid block.json — skip without crashing the gate.
		process.stderr.write(
			`[check-hardcoded-render-defaults] WARNING: invalid block.json in ${ blockDir } (${ e.message }) — skipped.\n`
		);
		return [];
	}

	const blockName = meta.name || path.basename( blockDir );
	const attrs     = Object.keys( meta.attributes || {} );

	// ── E9: Block Selectors API typography detection ─────────────────────────
	// If block.json declares selectors.typography, WP applies font-size etc.
	// via generated CSS on the targeted child element — literal base values in
	// style.css are not competing defaults.
	const hasSelectorsTypography = !! (
		meta.selectors && (
			meta.selectors.typography ||
			( typeof meta.selectors === 'object' && 'typography' in meta.selectors )
		)
	);

	// Build a map: CSS property → Set of attr names that own it.
	// Used in violation reporting to name which attr should own the property.
	/** @type {Map<string, Set<string>>} */
	const cssToAttrs = new Map();
	for ( const attr of attrs ) {
		for ( const prop of attrToCssProps( attr ) ) {
			if ( ! cssToAttrs.has( prop ) ) {
				cssToAttrs.set( prop, new Set() );
			}
			cssToAttrs.get( prop ).add( attr );
		}
	}

	if ( cssToAttrs.size === 0 ) {
		return []; // no layout-related attrs → nothing to check
	}

	// ── E9: Remove WP-native typography props when block uses selectors.typography ──
	const targetProps = new Set( cssToAttrs.keys() );
	if ( hasSelectorsTypography ) {
		for ( const prop of WP_NATIVE_TYPOGRAPHY_PROPS ) {
			targetProps.delete( prop );
		}
	}

	if ( targetProps.size === 0 ) {
		return [];
	}

	const violations  = [];

	// Load render.php for E8/E10 analysis.
	const renderPhpPath = path.join( blockDir, 'render.php' );
	const renderPhpSrc  = readIfExists( renderPhpPath );

	// ── E8: build set of props emitted as #$uid-scoped styles in render.php ──
	const scopedStyleProps = getScopedStyleProps( renderPhpSrc );

	// ── E10: build set of attrs consumed as HTML attributes in render.php ────
	const htmlAttrConsumed = getHtmlAttrConsumedAttrs( renderPhpSrc, attrs );

	// Build effective targetProps excluding E8 (scoped) and E10 (html-attr) props.
	const effectiveTargetProps = new Set();
	for ( const prop of targetProps ) {
		// E8: if render.php emits a scoped #$uid rule for this prop, style.css
		// literal is a dormant fallback — skip it.
		if ( scopedStyleProps.has( prop ) ) {
			continue;
		}
		// E10: if the owning attrs for this prop are all html-attr-consumed, skip.
		const owners = cssToAttrs.get( prop );
		if ( owners ) {
			const allHtmlConsumed = [ ...owners ].every( a => htmlAttrConsumed.has( a ) );
			if ( allHtmlConsumed ) {
				continue;
			}
		}
		effectiveTargetProps.add( prop );
	}

	if ( effectiveTargetProps.size === 0 ) {
		return [];
	}

	// ── E11: prefixed-helper selector governance (attr → governed tokens) ────
	const helperGov = collectHelperGovernance( renderPhpSrc );

	// --- style.css ---------------------------------------------------------
	const styleCssPath = path.join( blockDir, 'style.css' );
	if ( fs.existsSync( styleCssPath ) ) {
		const cssFindings = scanCssDeclarations(
			readIfExists( styleCssPath ),
			effectiveTargetProps,
			attrs,
			cssToAttrs,
			helperGov
		);
		for ( const f of cssFindings ) {
			const owningAttrs = f.attrs.join( ', ' );
			violations.push( {
				block:    blockName,
				file:     path.relative( ROOT, styleCssPath ),
				line:     f.line,
				property: f.property,
				value:    f.value,
				attr:     owningAttrs,
			} );
		}
	}

	// --- render.php — inline style attributes ------------------------------
	if ( fs.existsSync( renderPhpPath ) ) {
		const phpFindings = scanPhpInlineStyles(
			renderPhpSrc,
			effectiveTargetProps
		);
		for ( const f of phpFindings ) {
			const owningAttrs = [ ...( cssToAttrs.get( f.property ) || [] ) ].join( ', ' );
			violations.push( {
				block:    blockName,
				file:     path.relative( ROOT, renderPhpPath ),
				line:     f.line,
				property: f.property,
				value:    f.value,
				attr:     owningAttrs,
			} );
		}
	}

	return violations;
}

// ---------------------------------------------------------------------------
// BASELINE
// ---------------------------------------------------------------------------

function loadBaseline() {
	if ( ! fs.existsSync( BASELINE_FILE ) ) {
		return { _comment: '', accepted: [] };
	}
	try {
		const data = JSON.parse( fs.readFileSync( BASELINE_FILE, 'utf8' ) );
		return data;
	} catch ( e ) {
		throw new Error( `Invalid hardcoded-render-defaults-baseline.json: ${ e.message }` );
	}
}

function findingKey( f ) {
	// Stable key for baseline deduplication. Does NOT include line number
	// because a minor refactor (adding a comment line) must not invalidate
	// an accepted baseline entry.
	return `${ f.block }:${ f.file }:${ f.property }:${ f.value }`;
}

function writeBaseline( allFindings ) {
	const accepted = allFindings.map( ( f ) => ( {
		block:    f.block,
		file:     f.file,
		property: f.property,
		value:    f.value,
		attr:     f.attr,
		reason:   'baseline — pre-existing F3 debt (fix tracked separately)',
	} ) );
	// Deduplicate by key.
	const seen = new Set();
	const deduped = accepted.filter( ( f ) => {
		const k = findingKey( f );
		if ( seen.has( k ) ) {
			return false;
		}
		seen.add( k );
		return true;
	} );
	const data = {
		_comment:
			'Accepted hardcoded-render-default findings (Gate B). Each entry is a pre-existing ' +
			'F3 violation accepted as layout debt. To FIX: replace the literal with var(--sgs-x, <default>) ' +
			'OR read the attr in render.php and emit it dynamically, then delete the baseline entry. ' +
			'To accept a NEW intentional hardcode: add an entry manually with a reason — do NOT re-run ' +
			'--write-baseline (it overwrites ALL accepted reasons).',
		baselineSeededAt: new Date().toISOString(),
		accepted: deduped,
	};
	fs.writeFileSync( BASELINE_FILE, JSON.stringify( data, null, '\t' ) + '\n', 'utf8' );
	return deduped.length;
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

function main() {
	const args            = process.argv.slice( 2 );
	const check           = args.includes( '--check' );
	const asJson          = args.includes( '--json' );
	const doWriteBaseline = args.includes( '--write-baseline' );

	const blockDirs = fs
		.readdirSync( BLOCKS_DIR, { withFileTypes: true } )
		.filter( ( d ) => d.isDirectory() && d.name !== 'extensions' )
		.map( ( d ) => path.join( BLOCKS_DIR, d.name ) );

	// Collect all findings across all blocks.
	let allFindings = [];
	for ( const dir of blockDirs ) {
		allFindings = allFindings.concat( checkBlock( dir ) );
	}

	// Deduplicate (same property+value in a single block+file can appear on
	// multiple lines — keep all lines for reporting but deduplicate for the
	// baseline key comparison).
	const baseline     = loadBaseline();
	const baselineKeys = new Set( ( baseline.accepted || [] ).map( findingKey ) );
	const netNew       = allFindings.filter( ( f ) => ! baselineKeys.has( findingKey( f ) ) );
	const accepted     = allFindings.filter( ( f ) => baselineKeys.has( findingKey( f ) ) );

	// --write-baseline: seed / refresh the baseline with ALL current findings.
	if ( doWriteBaseline ) {
		const count = writeBaseline( allFindings );
		process.stdout.write(
			`[check-hardcoded-render-defaults] Baseline written: ${ count } finding(s) accepted across ` +
			`${ blockDirs.length } blocks → ${ BASELINE_FILE }\n`
		);
		return;
	}

	if ( asJson ) {
		process.stdout.write(
			JSON.stringify(
				{ netNew, accepted, baselineSize: baselineKeys.size, totalBlocks: blockDirs.length },
				null,
				2
			) + '\n'
		);
		return;
	}

	// Human-readable report.
	const baselineCount = baselineKeys.size;

	// Group accepted by block for the burn-down summary.
	/** @type {Map<string, number>} */
	const acceptedByBlock = new Map();
	for ( const f of accepted ) {
		acceptedByBlock.set( f.block, ( acceptedByBlock.get( f.block ) || 0 ) + 1 );
	}

	if ( baselineCount > 0 ) {
		process.stdout.write(
			`[check-hardcoded-render-defaults] Baseline: ${ baselineCount } accepted finding(s) (F3 debt).\n`
		);
		// Top blocks by debt — burn-down visibility.
		const top = [ ...acceptedByBlock.entries() ]
			.sort( ( a, b ) => b[ 1 ] - a[ 1 ] )
			.slice( 0, 10 );
		if ( top.length ) {
			process.stdout.write( '  Debt by block (top 10):\n' );
			for ( const [ block, count ] of top ) {
				process.stdout.write( `    ${ block }: ${ count }\n` );
			}
		}
	}

	if ( netNew.length ) {
		process.stderr.write(
			`[check-hardcoded-render-defaults] ${ netNew.length } NET-NEW F3 violation(s):\n`
		);
		for ( const f of netNew ) {
			process.stderr.write(
				`  - ${ f.block } | ${ f.file }:${ f.line } | ${ f.property }: ${ f.value } ` +
				`(attr "${ f.attr }" should own this)\n`
			);
		}
		process.stderr.write(
			'\nFix options:\n' +
			'  1. Replace the literal with var(--sgs-x, <default>) in the CSS — the sanctioned overridable-default pattern.\n' +
			'  2. Read the attr in render.php and emit it as an inline style (dynamic, not a constant).\n' +
			'  3. Scope the declaration inside :where(...) so attr-driven styles override it via specificity.\n' +
			'Do NOT dump findings into the baseline — that hides the bug. Fix the exemption logic in\n' +
			'this script if the finding is a genuine false positive.\n'
		);
	} else {
		process.stdout.write(
			`[check-hardcoded-render-defaults] OK — 0 net-new F3 violations across ${ blockDirs.length } blocks ` +
			`(${ baselineCount } known debt item(s) in baseline).\n`
		);
	}

	if ( check && netNew.length ) {
		process.exit( 1 );
	}
}

main();
