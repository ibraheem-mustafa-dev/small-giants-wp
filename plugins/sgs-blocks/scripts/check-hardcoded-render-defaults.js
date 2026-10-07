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
 *    5. F3b (added 2026-07-15): ALSO parse each attribute's block.json
 *       `default` VALUE itself (not just its name) and flag a literal default
 *       that flattens a theme.json per-element scale — see the F3B section
 *       below the CSS scanner for the full mechanism + the E12 exemption gate
 *       that keeps this from over-firing on ordinary component defaults.
 *       (Blind spot proven live 2026-07-15: sgs/heading shipped
 *       `fontSize: {"default": 28}`, silently overriding theme.json's
 *       differentiated per-h-tag scale on every heading of every client — the
 *       original scan above never looked at `default`, only at attribute
 *       NAMES, so it passed clean.)
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
 *  E12  Theme-element divergence gate (F3b, block.json `default` VALUE scan):
 *        a literal default is only flagged when it flattens a theme.json
 *        per-element scale (see the F3B section below the CSS scanner).
 *
 *  ADDED (E1–E10, converged from 5-agent audit of 268 baseline findings):
 *  - E1  Selector-context awareness: sub-element selectors (__foo) only flagged
 *        when the attr name semantically maps to that element token.
 *        NARROWED by E14: it still exempts every NON-inherited property (the
 *        `size`-suffix flood it exists to stop), but it no longer exempts an
 *        INHERITED property on a sub-element when a control for that property is
 *        emitted onto a different element; E14 decides those by element identity.
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
 *        NARROWED by E14: the block-wide removal of font-size / line-height /
 *        letter-spacing / font-weight / text-transform is gone. The legacy
 *        attr-name path still skips them, but E14 treats the selectors.typography
 *        target as a control, so a hardcode on any OTHER element is classified.
 *  - E10 HTML-attribute consumption: render.php reads the attr as an HTML attribute
 *        (e.g. width="..." on <img>) rather than a CSS property — no CSS competition.
 *  - E14 Element identity for INHERITED properties (font-*, line-height,
 *        letter-spacing, text-*, color, ...): a hardcode on a DESCENDANT of the
 *        element a control paints (CLASS 2), or on a wrapper that leaks into text
 *        sub-elements declaring no value of their own (CLASS 3), is reported;
 *        the same element (CLASS 1) is not. Unresolvable controls or markup are
 *        reported as CANNOT-RESOLVE, never guessed. See the E14 section below.
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
 *   node scripts/check-hardcoded-render-defaults.js --survey         # counts by class + resolver coverage (never fails)
 *   node scripts/check-hardcoded-render-defaults.js --survey --verbose  # ... plus every net-new finding and CLASS 1 classification
 *
 * Wired into prebuild / prestart in package.json.
 */

'use strict';

const fs   = require( 'fs' );
const path = require( 'path' );
const os   = require( 'os' );

const { spliceFragments } = require( './lib/e14-markup-splice' );

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
	// ⛔ 'textwrap' MUST sit before the bare 'wrap' shorthand below (array
	// order = most-specific-first, per attrToCssProps()'s own docstring) —
	// same reason 'flexwrap' already does. Without it, the shared
	// TypographyControls attribute `textWrap` (governing the CSS `text-wrap`
	// property, per includes/helpers-typography.php) falls through to the
	// bare 'wrap' entry and is misclassified as governing `flex-wrap` — a
	// different, unrelated CSS property that just happens to share the
	// substring "wrap". Found live 2026-09-07: 3 blocks' genuine flex-layout
	// `flex-wrap: wrap` declarations were false-flagged as conflicting with
	// their (unrelated) `textWrap` typography attribute.
	{ suffix: 'textwrap',       props: [ 'text-wrap' ],                note: 'controls text-wrap (text reflow), NOT flex-wrap' },
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
		// /* ... */ — blank out non-newline chars so line numbers survive a
		// multi-line comment (the line-based scanner below relies on 1:1
		// line-number correspondence with the original file).
		.replace( /\/\*[\s\S]*?\*\//g, ( m ) => m.replace( /[^\n]/g, ' ' ) )
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
 * E1 hand-authored override table — for an attr whose name coincidentally
 * CONTAINS the word for an unrelated sibling BEM element, so the substring
 * heuristic below would wrongly treat it as owning that element too. Keyed by
 * attr name; the value REPLACES the substring scan for that attr (does not
 * add to it) — only these exact token(s) count as a match.
 *
 * `submenuLinkPadding` (Spec 36 "Item hover paint" M-21, 2026-09-28, added to
 * both sgs/nav-bar-menu and sgs/nav-drawer-menu) contains the word "link" as
 * part of its own "submenuLink" compound, which the plain substring scan also
 * matches against a BARE `.__link` selector — that block's TOP-LEVEL item
 * link, an unrelated sibling of the submenu's `.__sublink` this attr actually
 * governs. Discovered as a net-new false positive the moment both blocks
 * declared the attribute; general-heuristic collisions of this shape are rare
 * enough that a small override table is proportionate over redesigning E1.
 */
const ATTR_ELEMENT_OVERRIDES = {
	submenuLinkPadding: [ 'sublink' ],
};

/**
 * E1: For a sub-element selector, check whether the attr name semantically
 * maps to that element. Returns true (EXEMPT) when the attr does NOT map to
 * the sub-element — i.e. it is a root-level concern being incorrectly applied
 * to a sub-element selector.
 *
 * Semantic match rule: the lowercased attr name must CONTAIN at least one of
 * the element tokens. If none match, the attr "owns" a different element and
 * the declaration on this sub-element selector is NOT a real F3 violation.
 * An attr listed in ATTR_ELEMENT_OVERRIDES uses ONLY its declared token(s)
 * instead of the substring scan (see that table's own docblock for why).
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
	const override = ATTR_ELEMENT_OVERRIDES[ attrName ];
	if ( override ) {
		return ! override.some( ( token ) => bemElements.has( token ) );
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
// E13 — WRAPPER-ROOT LAYOUT-ATTR GOVERNANCE
//
// `gridTemplateColumns`/`gap` (+ their Tablet/Mobile tiers) are LAYOUT attrs that
// SGS_Container_Wrapper reads from $attributes and applies to the block's OUTER
// ROOT element (class-scoped on the wrapper) — never to a BEM sub-element. So a
// hardcoded `grid-template-columns:`/`gap:` literal on any NON-ROOT selector
// (a `__sub-element` OR a `.sgs-<slug>-<component>` descendant like
// `.sgs-form-tile`) is a DIFFERENT element than the attr governs, and is a
// legitimate structural/component default — NOT a dead-by-override hardcode.
//
// Without this, E1's NAME heuristic false-flags them: the attr name
// `gridTemplateColumns` literally contains "grid", so it name-matches a
// `.__grid` sub-element even though the wrapper applies it to the root; and a
// hyphenated descendant (`.sgs-form-tile`, no `__`) is mis-read as the root.
//
// Gated on the block actually delegating to SGS_Container_Wrapper (render.php),
// mirroring E11's governance philosophy: authoritative element-ownership beats
// the attr-name/element heuristic. Native non-wrapper blocks are unaffected.
// ---------------------------------------------------------------------------

// The layout attrs SGS_Container_Wrapper applies to the OUTER ROOT element.
const WRAPPER_ROOT_ATTR_RE  = /^(gridTemplateColumns|gap)(Tablet|Mobile)?$/;
// The CSS properties those attrs own.
const WRAPPER_ROOT_PROPS    = new Set( [ 'grid-template-columns', 'gap' ] );

/**
 * E13: true when a wrapper-root layout attr (gridTemplateColumns/gap) is
 * hardcoded on a BEM `__sub-element` selector in a block that delegates to
 * SGS_Container_Wrapper — i.e. EXEMPT (the wrapper applies the attr to the
 * ROOT element, so a literal on a `__` descendant is a different element).
 *
 * ROBUST-BY-CONSTRUCTION: we do NOT try to derive the block's root class (the
 * root class is not reliably `sgs-<folder>` — some blocks pass a divergent
 * `extra_classes` to the wrapper, e.g. form-field-tiles → `sgs-form-tiles`).
 * Instead we exempt ONLY when EVERY comma-member of the selector targets a BEM
 * `__` sub-element. A root member (no `__`) in a comma-group blocks the
 * exemption, so a genuine ROOT hardcode can never be silently exempted. A
 * hyphenated descendant with no `__` (e.g. `.sgs-form-tile`) is intentionally
 * NOT covered — those are handled with `:where()` or an explicit baseline.
 */
function isWrapperRootAttrMismatch( attrName, property, selector, usesWrapper ) {
	if ( ! usesWrapper ) {
		return false; // only wrapper-delegating blocks route these to the root
	}
	if ( ! WRAPPER_ROOT_ATTR_RE.test( attrName ) || ! WRAPPER_ROOT_PROPS.has( property ) ) {
		return false;
	}
	const members = selector.split( ',' ).map( s => s.trim() ).filter( Boolean );
	if ( members.length === 0 ) {
		return false;
	}
	// Exempt only if EVERY member's LAST class token is a BEM `__` sub-element.
	return members.every( ( m ) => {
		const classes = m.match( /\.[a-zA-Z0-9_-]+/g );
		if ( ! classes || classes.length === 0 ) {
			return false; // no class (e.g. bare element / :where wrapper) — do not exempt here
		}
		const last = classes[ classes.length - 1 ];
		return /__/.test( last ); // last-targeted class is a BEM sub-element
	} );
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
			'FontWeight', 'FontSize', 'Padding', 'WidthType',
		],
		extraTokens: [ 'sgs-button' ],
	},
	sgs_typography_css_rule: {
		// All 22 suffixes the helper reads, matching
		// check-dead-controls.js::PREFIXED_HELPER_SUFFIXES exactly as the
		// docblock above requires. A suffix missing from this list is NOT
		// governed, so E11's element-ownership path is skipped for that attr
		// and it falls through to the E1 attr-name/BEM heuristic, which flags
		// every selector merely sharing a BEM token — e.g. a `label` prefix
		// governing `.sgs-form-field__label` would flag an unrelated
		// `.sgs-form-field__file-label` as well.
		suffixes: [
			'FontSize', 'FontSizeUnit', 'FontSizeTablet', 'FontSizeMobile',
			'FontFamily', 'FontWeight', 'FontStyle', 'TextTransform', 'TextDecoration',
			'LineHeight', 'LineHeightUnit', 'LineHeightTablet', 'LineHeightMobile',
			'LetterSpacing', 'LetterSpacingUnit', 'LetterSpacingTablet', 'LetterSpacingMobile',
			'TextAlign', 'TextWrap', 'TextIndent', 'TextColumns', 'WritingMode',
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

	// Find all occurrences of #$<word> OR .$<word> and then look for CSS props in
	// the surrounding string context (up to 500 chars in each direction). D303
	// (2026-07-10): per-instance scoped selectors moved from ID (`#$uid`) to CLASS
	// (`.$uid.block`, specificity 0,2,0 — never an ID) so the sgsCustomCss residual
	// can override them by source order. This detection MUST match both forms, else
	// it false-flags every D303-normalised block's style.css fallback as ungoverned.
	const uidMarkerRe = /[#.]\$[a-zA-Z_][a-zA-Z0-9_]*/g;
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
//
// NARROWED (E14): the exemption now covers only the legacy attr-name path. A
// declaration on the selectors.typography element itself is the same element as
// the control (CLASS 1); one on any other element is classified by E14.
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
// F3B — BLOCK.JSON DEFAULT-VALUE DIVERGENCE CHECK
//
// The scanners above only look at style.css / render.php LITERAL CSS
// declarations. They never look at a block.json attribute's own `default`
// VALUE — so a hardcoded constant sitting in `"default"` passed clean (proven
// live 2026-07-15: sgs/heading shipped `fontSize: {"default": 28}`, silently
// overriding theme.json's differentiated per-h-tag scale — h1 and h6 both
// rendered at 28px on every client).
//
// THE TEST (Bean-decided 2026-07-15) is NOT "is this a literal?" — almost
// every attribute has one. It is: "does this literal FLATTEN a theme-wide
// default that theme.json intentionally VARIES?" The only construct in
// theme.json that assigns genuinely DIFFERENT per-value styling for the SAME
// CSS property is `styles.elements.<tag>`, keyed per semantic HTML element
// (theme.json gives h1..h6 six different font-sizes). A block exhibits the
// same failure shape ONLY when it declares an enum attribute whose VALUES are
// themselves `styles.elements` keys (e.g. sgs/heading's `level`: h1-h6) — the
// block itself dynamically renders as one of several elements theme.json
// treats differently. A block with no such tag-switching enum (sgs/label's
// <span>, sgs/button's <a>) renders ONE fixed element: theme.json assigns it
// no per-instance-varying default to collapse, so a flat literal default
// there is an ordinary component constant (sgs/label's fontSize:12 kicker
// size), not an F3 violation. This is the mechanical, non-hardcoded
// equivalent of "does it render an h-tag" — derived entirely from theme.json
// + block.json structure, no per-block exception list (E12 below).
// ---------------------------------------------------------------------------

const THEME_JSON_PATH = path.join( ROOT, '..', '..', 'theme', 'sgs-theme', 'theme.json' );

/** Maps a theme.json `styles.*.typography.*` key to its CSS property. */
const THEME_TYPOGRAPHY_KEY_TO_CSS_PROP = {
	fontSize:       'font-size',
	fontWeight:     'font-weight',
	lineHeight:     'line-height',
	letterSpacing:  'letter-spacing',
	textTransform:  'text-transform',
	textDecoration: 'text-decoration',
	fontStyle:      'font-style',
};

/**
 * Extract the CSS properties + values a single theme.json style node (e.g.
 * `styles.elements.h1`) declares at its OWN level — typography / color /
 * border / spacing.padding only. Deliberately does NOT descend into `:hover`
 * / `:focus` pseudo-state sub-objects (those are interactive-state overrides,
 * not the resting-state default this check compares block.json defaults
 * against — mirrors E3's interactive-state exemption in the literal scanner).
 *
 * @param {object}          node     A theme.json style node.
 * @param {Map<string,string>} propsMap Output map: CSS property → value.
 */
function collectStyleNodeProps( node, propsMap ) {
	if ( ! node || 'object' !== typeof node ) {
		return;
	}
	if ( node.typography && 'object' === typeof node.typography ) {
		for ( const [ key, val ] of Object.entries( node.typography ) ) {
			const prop = THEME_TYPOGRAPHY_KEY_TO_CSS_PROP[ key ];
			if ( prop && ( 'string' === typeof val || 'number' === typeof val ) ) {
				propsMap.set( prop, String( val ) );
			}
		}
	}
	if ( node.color && 'object' === typeof node.color ) {
		if ( 'string' === typeof node.color.text ) {
			propsMap.set( 'color', node.color.text );
		}
		if ( 'string' === typeof node.color.background ) {
			propsMap.set( 'background-color', node.color.background );
		}
	}
	if ( node.border && 'object' === typeof node.border ) {
		if ( 'string' === typeof node.border.radius ) {
			propsMap.set( 'border-radius', node.border.radius );
		}
		if ( 'string' === typeof node.border.color ) {
			propsMap.set( 'border-color', node.border.color );
		}
		if ( 'string' === typeof node.border.width ) {
			propsMap.set( 'border-width', node.border.width );
		}
	}
	if ( node.spacing && node.spacing.padding && 'object' === typeof node.spacing.padding ) {
		for ( const side of [ 'top', 'right', 'bottom', 'left' ] ) {
			const val = node.spacing.padding[ side ];
			if ( 'string' === typeof val ) {
				propsMap.set( `padding-${ side }`, val );
			}
		}
	}
}

/**
 * Build Map<cssProperty, Map<elementKey, effectiveValue>> from
 * `theme.json styles.elements`. Applies WP's own cascade fallback:
 * `styles.elements.heading` is the h1-h6 BASELINE (WP applies it to every
 * heading tag before the more-specific h{n} override), so a property that
 * `heading` declares but no individual h{n} overrides resolves to the SAME
 * effective value on every level — that is NOT divergence (e.g. fontWeight:
 * 700 on `heading` + explicit 700 on h5/h6 is uniform, not six different
 * values). Only a genuine per-level DIFFERENCE (theme.json's font-size scale)
 * counts.
 */
function buildElementPropertyValues( themeJson ) {
	const raw      = new Map(); // cssProperty -> Map<elementKey, value>
	const elements = ( themeJson && themeJson.styles && themeJson.styles.elements ) || {};

	for ( const [ elementKey, styleNode ] of Object.entries( elements ) ) {
		const props = new Map();
		collectStyleNodeProps( styleNode, props );
		for ( const [ prop, val ] of props ) {
			if ( ! raw.has( prop ) ) {
				raw.set( prop, new Map() );
			}
			raw.get( prop ).set( elementKey, val );
		}
	}

	const H_TAGS = [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' ];
	for ( const byElement of raw.values() ) {
		if ( byElement.has( 'heading' ) ) {
			const headingVal = byElement.get( 'heading' );
			for ( const h of H_TAGS ) {
				if ( ! byElement.has( h ) ) {
					byElement.set( h, headingVal );
				}
			}
		}
	}
	return raw;
}

/**
 * Given the specific element keys a block's enum attribute switches between
 * (e.g. ["h1".."h6"]), return the set of CSS properties whose EFFECTIVE
 * theme.json value genuinely differs across those keys (absence counts as a
 * distinct state from any declared value).
 */
function getDivergentProps( enumValues, elementPropertyValues ) {
	const divergent = new Set();
	for ( const [ prop, byElement ] of elementPropertyValues ) {
		const seen = new Set();
		for ( const key of enumValues ) {
			seen.add( byElement.has( key ) ? byElement.get( key ) : ' __ABSENT__' );
		}
		if ( seen.size > 1 ) {
			divergent.add( prop );
		}
	}
	return divergent;
}

/**
 * E13 — properties theme.json GOVERNS for every one of `enumValues`, i.e. the
 * theme has an opinion on this property for every element the block renders.
 * Superset of getDivergentProps: a property theme.json sets to the SAME value
 * on every element is governed but NOT divergent.
 *
 * WHY THIS EXISTS (D343): E12 only fires on a DIVERGENT property (theme.json's
 * per-h-tag font-size scale), because its question is "does this default
 * FLATTEN a scale?". That misses the other half of the same bug class: a block
 * default that OVERRIDES a theme value which happens to be UNIFORM across the
 * elements. Proven live 2026-07-16 — sgs/heading's `textColour: "text"` emitted
 * a (0,2,0) scoped rule that beat theme.json's
 * `styles.elements.heading.color.text` (0,0,1), so every client's heading
 * colour was silently disabled. `color` is identical on h1-h6, so it was never
 * "divergent" and E12 stayed silent through the whole D338 sweep.
 *
 * @param {string[]}            enumValues           Element keys the block renders.
 * @param {Map<string,Map>}     elementPropertyValues cssProperty -> elementKey -> value.
 * @return {Set<string>} CSS properties theme.json sets for EVERY element key.
 */
function getThemeGovernedProps( enumValues, elementPropertyValues ) {
	const governed = new Set();
	for ( const [ prop, byElement ] of elementPropertyValues ) {
		if ( enumValues.every( ( key ) => byElement.has( key ) ) ) {
			governed.add( prop );
		}
	}
	return governed;
}

let _themeJsonCache; // undefined = not yet loaded.
function loadThemeJson() {
	if ( undefined !== _themeJsonCache ) {
		return _themeJsonCache;
	}
	try {
		const raw = readIfExists( THEME_JSON_PATH );
		_themeJsonCache = raw ? JSON.parse( raw ) : null;
	} catch ( e ) {
		process.stderr.write(
			`[check-hardcoded-render-defaults] WARNING: could not parse theme.json (${ e.message }) — ` +
			'block.json default-value divergence check (F3b) skipped.\n'
		);
		_themeJsonCache = null;
	}
	return _themeJsonCache;
}

let _elementPropertyValuesCache;
function getElementPropertyValues() {
	if ( undefined === _elementPropertyValuesCache ) {
		_elementPropertyValuesCache = buildElementPropertyValues( loadThemeJson() );
	}
	return _elementPropertyValuesCache;
}

let _allElementKeysCache;
function getAllElementKeys() {
	if ( undefined === _allElementKeysCache ) {
		const themeJson = loadThemeJson();
		const elements  = ( themeJson && themeJson.styles && themeJson.styles.elements ) || {};
		_allElementKeysCache = new Set( Object.keys( elements ) );
	}
	return _allElementKeysCache;
}

/**
 * Format a block.json attribute's `default` as a CSS-literal string suitable
 * for `isLiteralConstant()`, or return null when the default is the correct
 * "inherit / no override" pattern (null, undefined, or "").
 *
 * Numbers get their unit from the sibling `{attrName}Unit` attribute's own
 * default (the convention every SGS typography/box attr follows), so the
 * formatted value matches what render.php actually emits — e.g. heading's
 * `fontSize` + `fontSizeUnit: "px"` → "28px".
 */
function formatDefaultForLiteralCheck( attrName, attrDef, allAttrs ) {
	if ( ! attrDef || ! ( 'default' in attrDef ) ) {
		return null;
	}
	const value = attrDef.default;
	if ( null === value || undefined === value ) {
		return null;
	}
	if ( 'string' === typeof value ) {
		return '' === value ? null : value;
	}
	if ( 'number' === typeof value ) {
		const unitAttr = allAttrs[ `${ attrName }Unit` ];
		const unit     = unitAttr && 'string' === typeof unitAttr.default ? unitAttr.default : '';
		return `${ value }${ unit }`;
	}
	return null; // booleans / objects / arrays — not a scalar CSS literal.
}

/**
 * Best-effort line lookup for an attribute's `"default"` key, for a readable
 * finding (baseline dedup keys on block+file+property+value, not line).
 */
function findAttrDefaultLine( blockJsonRaw, attrName ) {
	const lines = blockJsonRaw.split( '\n' );
	const keyRe = new RegExp( `"${ attrName.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' ) }"\\s*:\\s*\\{` );
	let attrLine = -1;
	for ( let i = 0; i < lines.length; i++ ) {
		if ( keyRe.test( lines[ i ] ) ) {
			attrLine = i;
			break;
		}
	}
	if ( -1 === attrLine ) {
		return 1;
	}
	for ( let i = attrLine; i < lines.length; i++ ) {
		if ( /"default"\s*:/.test( lines[ i ] ) ) {
			return i + 1;
		}
		if ( i > attrLine && /^\s*\},?\s*$/.test( lines[ i ] ) ) {
			break; // this attribute's object closed with no `default` key
		}
	}
	return attrLine + 1;
}

/** Shared literal test (isLiteralConstant + E7 touch-target exemption). */
function isFlaggableLiteral( value, property ) {
	if ( ! isLiteralConstant( value, property ) ) {
		return false;
	}
	if ( TOUCH_TARGET_SIZES.has( value ) && TOUCH_TARGET_PROPS.has( property ) ) {
		return false;
	}
	return true;
}

// E12 escape-hatch tags — see the PART A comment inside checkBlockJsonDefaults
// for why these (and only these) are admitted alongside real theme.json
// element keys.
const HEADING_ENUM_ESCAPE_HATCH_TAGS = new Set( [ 'p', 'div', 'span' ] );

/**
 * E12 PART B — resolve a block attribute to its owning `supports.sgs.elements`
 * key, so E12 can require the enum attribute and a candidate attribute to
 * land on the SAME element before flagging (the prerequisite the PART A
 * comment names). This is a minimal attr→element resolver — it mirrors
 * check-element-manifest-conformance.js's two resolution forms (explicit
 * `attrMap`, then the `{prefix}{PascalCase}` convention) but does not need
 * that script's cluster/member machinery, because all it has to answer is
 * "which element, if any, owns this attribute name".
 *
 * Resolution order:
 *   1. SINGLE-ELEMENT BLOCK — a block declaring exactly one `elements` key
 *      (e.g. sgs/heading's "heading", sgs/product-faq's "box") has every
 *      attribute trivially on that one element (mirrors the D293
 *      "single-semantic-element block IS the wrapper" convention — Spec 32).
 *      This is why sgs/heading, already the one block E12 evaluates today,
 *      keeps working unchanged: enum attr and candidate attr both resolve to
 *      "heading", so scoping is a same-element no-op for it.
 *   2. EXPLICIT `attrMap` VALUE MATCH — an element whose `attrMap` maps some
 *      key to a value equal to `attrName` (case-insensitive), skipping
 *      `native:*` values (those name a WP `supports` path, not a block
 *      attribute, so they can never equal an attribute name).
 *   3. `{element.prefix}{PascalCase suffix}` CONVENTION — same boundary rule
 *      as `findOrphans()` in check-element-manifest-conformance.js: the
 *      prefix must be followed by an uppercase letter (or nothing), so
 *      prefix "icon" matches "iconColour" but not "icons". An element with
 *      no `prefix`, or an explicit `prefix: ""` (the documented orphan-scan
 *      opt-out for elements whose key string-collides with an unrelated
 *      top-level attribute — e.g. form-review's "heading" element vs the
 *      unrelated `headingLevel` attr), is not tried via this route.
 *
 * Returns the element key, or `null` when the attribute cannot be resolved
 * to any element. E12 REFUSES to flag rather than guess in that case — the
 * house "refuse rather than guess" convention (migrate-tier-object.py S2/S3).
 *
 * @param {string} attrName Block attribute name to resolve.
 * @param {object} elements `supports.sgs.elements` map (may be `{}`).
 * @return {string|null}
 */
function resolveAttrElement( attrName, elements ) {
	const keys = Object.keys( elements );
	if ( keys.length === 0 ) {
		return null;
	}
	if ( keys.length === 1 ) {
		return keys[ 0 ];
	}

	for ( const key of keys ) {
		const attrMap = elements[ key ] && elements[ key ].attrMap;
		if ( ! attrMap || 'object' !== typeof attrMap ) {
			continue;
		}
		for ( const mapped of Object.values( attrMap ) ) {
			if ( 'string' !== typeof mapped || mapped.startsWith( 'native:' ) ) {
				continue; // a WP supports path, not a block attribute name
			}
			if ( mapped.toLowerCase() === attrName.toLowerCase() ) {
				return key;
			}
		}
	}

	for ( const key of keys ) {
		const prefix = elements[ key ] && elements[ key ].prefix;
		if ( 'string' !== typeof prefix || '' === prefix ) {
			continue; // undeclared prefix, or explicit opt-out
		}
		if ( ! attrName.startsWith( prefix ) ) {
			continue;
		}
		const rest = attrName.slice( prefix.length );
		if ( rest.length === 0 || rest[ 0 ] === rest[ 0 ].toUpperCase() ) {
			return key;
		}
	}

	return null;
}

/**
 * Scan one block's block.json for a literal `default` that flattens a
 * theme.json per-element scale (F3b). Returns findings in the same shape the
 * CSS/PHP scanners return: { line, property, value, attr }.
 *
 * @param {object}  meta                   Parsed block.json.
 * @param {string}  blockJsonRaw           Raw block.json source (line lookup).
 * @param {boolean} hasSelectorsTypography E9 signal — block declares
 *                                         `selectors.typography`, so WP's own
 *                                         pipeline applies the user's
 *                                         typography value at that selector;
 *                                         a typography default there is an
 *                                         ordinary starting value, not a
 *                                         silent override (mirrors the
 *                                         existing E9 exemption).
 */
function checkBlockJsonDefaults( meta, blockJsonRaw, hasSelectorsTypography ) {
	const findings   = [];
	const attributes = meta.attributes || {};

	const allElementKeys        = getAllElementKeys();
	const elementPropertyValues = getElementPropertyValues();
	if ( allElementKeys.size === 0 || elementPropertyValues.size === 0 ) {
		return findings; // theme.json missing/unparseable — nothing to cross-check
	}

	for ( const [ enumAttrName, enumAttrDef ] of Object.entries( attributes ) ) {
		if ( ! enumAttrDef || ! Array.isArray( enumAttrDef.enum ) ) {
			continue;
		}
		const enumValues = enumAttrDef.enum.filter( ( v ) => 'string' === typeof v && '' !== v );

		// E12 — THEME-ELEMENT DIVERGENCE GATE (see the F3B header comment for
		// the full rationale): only fires when this attr's enum values are
		// THEMSELVES theme.json `styles.elements` keys (PART A), and only flags a
		// candidate attribute that lands on the SAME `supports.sgs.elements` entry
		// as the enum attribute (PART B).
		//
		// HISTORY (D649, kept for the record — do not re-attempt either superseded
		// shape below without re-reading this): the original guard required EVERY
		// enum value to be a real theme.json element key. A heading-level enum
		// legitimately offers a non-heading escape (`p`) so a decorative title can
		// leave the document outline (`sgs/icon-list`'s PHP allowlist, `h2..h6` + `p`,
		// since FR-36-26c) — theme.json declares no `p` element, so that one value
		// disqualified the WHOLE enum and 10 of 11 heading-level-enum blocks
		// (card-grid, form-review, icon-list, pricing-table, process-steps,
		// product-card, product-faq, team-member, timeline, trustpilot-reviews) went
		// unchecked; only `sgs/heading` (enum is `h1`..`h6`, no escape hatch) passed.
		//
		// Two widenings were tried and reverted the same day:
		//   - `some()` instead of `every()` — measured: newly admits three enums that
		//     are not element switches at all, colliding only by string coincidence
		//     (`cart.displayMode`→`link`, `heading.headingRole`→`heading`,
		//     `pricing-table.toggleStyle`→`button`). NOT reinstated.
		//   - `every(elementKey || p|div|span)` alone, with NO same-element scoping —
		//     otherwise the right relaxation (PART A below), but on its own it paired
		//     the enum with EVERY attribute whose default is a literal for a
		//     divergent property, with no check the two are even the same part of the
		//     block. Produced two false positives the same session: `sgs/icon-list`
		//     .iconColour (the per-item marker) flagged against .headingLevel (the
		//     list heading), and `sgs/product-card`.ctaFontWeight (the CTA button)
		//     flagged against .headingLevel likewise. Neither is a real bug — they
		//     just don't share an element.
		//
		// FIX (this pass) — both parts land together; either alone reproduces one of
		// the two reverted failure modes:
		//   PART A — accept the small closed escape-hatch set below alongside real
		//     element keys (not `.some()` — every value must still be either a real
		//     element key or in this set).
		//   PART B — resolveAttrElement() (above) resolves BOTH the enum attribute
		//     and each candidate attribute to their owning `supports.sgs.elements`
		//     entry via that element's `attrMap` or `{prefix}{PascalCase}`
		//     convention. A candidate is only flagged when both resolve AND resolve
		//     to the SAME element. Either attribute resolving to nothing (an
		//     incomplete manifest) means REFUSE, not guess — see the function doc.
		if (
			enumValues.length < 2 ||
			! enumValues.every( ( v ) => allElementKeys.has( v ) || HEADING_ENUM_ESCAPE_HATCH_TAGS.has( v ) )
		) {
			continue;
		}

		const elements    = ( meta.supports && meta.supports.sgs && meta.supports.sgs.elements ) || {};
		const enumElement = resolveAttrElement( enumAttrName, elements );
		if ( ! enumElement ) {
			continue; // can't resolve the enum attr itself to an element — refuse, don't guess
		}

		const divergentProps = getDivergentProps( enumValues, elementPropertyValues );

		// E13 — THEME-ELEMENT OVERRIDE GATE. Properties theme.json governs for
		// every rendered element but which are UNIFORM across them, so E12's
		// divergence test can never see them (D343 — see getThemeGovernedProps).
		const uniformGovernedProps = new Set(
			[ ...getThemeGovernedProps( enumValues, elementPropertyValues ) ]
				.filter( ( p ) => ! divergentProps.has( p ) )
		);

		if ( divergentProps.size === 0 && uniformGovernedProps.size === 0 ) {
			continue;
		}

		for ( const [ attrName, attrDef ] of Object.entries( attributes ) ) {
			// `attributes` can carry bare-string pseudo-comment keys (e.g.
			// card-grid's `_comment_items_media`, a documented convention across
			// 20 blocks — see grep for `"_comment` under `attributes` in any
			// block.json) rather than a real `{ type, default, … }` attribute
			// definition. `'default' in attrDef` THROWS on a non-object RHS, so
			// this must be excluded before the `in` check runs, not just fail it.
			// Only newly reachable here because PART A above now lets more
			// blocks' enums past the entry guard than before this pass.
			if ( attrName === enumAttrName || ! attrDef || 'object' !== typeof attrDef || ! ( 'default' in attrDef ) ) {
				continue;
			}

			// PART B — same-element scoping (see the E12 comment above). Refuse
			// rather than guess when the candidate attribute doesn't resolve to
			// an element at all, or resolves to a DIFFERENT element than the enum
			// attribute — this is exactly what stops icon-list.iconColour /
			// product-card.ctaFontWeight from being flagged against headingLevel.
			if ( resolveAttrElement( attrName, elements ) !== enumElement ) {
				continue;
			}

			const props = attrToCssProps( attrName );
			if ( props.size === 0 ) {
				continue;
			}
			let matchedProps = [ ...props ].filter( ( p ) => divergentProps.has( p ) );
			let matchedGoverned = [ ...props ].filter( ( p ) => uniformGovernedProps.has( p ) );
			if ( matchedProps.length === 0 && matchedGoverned.length === 0 ) {
				continue;
			}
			// E9 extension: Block Selectors API already applies the user's
			// typography value at the declared child selector.
			if ( hasSelectorsTypography ) {
				matchedProps    = matchedProps.filter( ( p ) => ! WP_NATIVE_TYPOGRAPHY_PROPS.has( p ) );
				matchedGoverned = matchedGoverned.filter( ( p ) => ! WP_NATIVE_TYPOGRAPHY_PROPS.has( p ) );
			}
			if ( matchedProps.length === 0 && matchedGoverned.length === 0 ) {
				continue;
			}

			const literalStr = formatDefaultForLiteralCheck( attrName, attrDef, attributes );
			if ( null === literalStr ) {
				continue; // null / "" default — the correct "inherit" pattern
			}

			for ( const property of matchedProps ) {
				if ( ! isFlaggableLiteral( literalStr, property ) ) {
					continue;
				}
				findings.push( {
					line:     findAttrDefaultLine( blockJsonRaw, attrName ),
					property,
					value:    literalStr,
					attr:     `${ attrName } (default flattens ${ enumAttrName }'s theme-differentiated ` +
						`${ property } across ${ enumValues.join( '/' ) })`,
				} );
			}

			// E13 — same bug class, uniform-value half (D343).
			for ( const property of matchedGoverned ) {
				if ( ! isFlaggableLiteral( literalStr, property ) ) {
					continue;
				}
				findings.push( {
					line:     findAttrDefaultLine( blockJsonRaw, attrName ),
					property,
					value:    literalStr,
					attr:     `${ attrName } (default OVERRIDES theme.json's ${ property } for ` +
						`${ enumValues.join( '/' ) } — the block's scoped rule outranks the ` +
						`theme's element rule, so theme.json is silently disabled; default to null/"" to inherit)`,
				} );
			}
		}
	}

	return findings;
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

// ---------------------------------------------------------------------------
// E14 — ELEMENT IDENTITY (CLASS 2 / CLASS 3 INHERITED-PROPERTY HARDCODES)
//
// E1 (sub-element name heuristic), E9 (selectors.typography) and E11 (helper
// selector tokens) all answer "does this declaration's selector LOOK LIKE the
// element the control paints?" and EXEMPT it when it does not. For a
// NON-inherited property that is right (a `gap` on a child is simply a
// different box). For an INHERITED property it hides the exact defect shape the
// gate exists to catch: a direct declaration on a descendant beats an inherited
// value at ANY specificity, so a control painting an ANCESTOR can never reach
// it.
//
// For a hardcoded declaration of an INHERITED property P on selector S, against
// the controls for P (each with its own emitted selector S_c):
//   CLASS 1  S and S_c target the SAME element. SGS controls emit >= 2 classes
//            (0,2,0) against a (0,1,0) base rule, so the control wins.
//            NOT a finding.
//   CLASS 2  S targets a DESCENDANT of S_c's element. The control can never
//            reach it. FINDING.
//   CLASS 3  S is a wrapper/shared class that is an ANCESTOR of text
//            sub-elements which declare no P of their own, so S's value leaks
//            into them. FINDING. (Sub-elements with no control at all leak
//            permanently; sub-elements with a control leak in their default
//            state. The finding note says which.)
//   CANNOT-RESOLVE  a control selector, a helper prefix or the markup could not
//            be resolved well enough to tell the cases apart. Reported rather
//            than guessed either way, and counted separately.
//
// SCOPING (load-bearing): CLASS 2 and 3 exist ONLY for the INHERITED_PROPS
// below. Non-inherited properties (gap, padding, margin, border*, background*,
// width, height...) keep E1/E6/E11/E13 exactly as before; a leak reported for
// `gap` would be a bug.
//
// Where the controls come from: every call to sgs_typography_css_rule() and
// sgs_button_element_style_css() in ANY .php file of the block directory (not
// only render.php). The prefix argument is resolved to the real attribute names
// (prefix + Suffix, mirroring sgs_typography_attr()) and kept only when the
// block.json really declares the attribute. The selector argument is a PHP
// string expression: it is resolved by evaluating the block's own simple
// string assignments (`$root_sel = '.' . $uid . '.wp-block-x';`). Per-instance
// class variables (`$uid`...) become an instance marker that carries no
// identity. Anything else (a function call, a ternary, a parameter) is
// unresolved. A block.json `selectors.typography` target is also a control for
// the WP-native typography properties.
//
// What is NOT modelled (scope limits): specificity beyond the CLASS 1 rule,
// block.json `supports.typography` root controls, colour controls emitted by
// helpers other than sgs_button_element_style_css(), and markup built outside
// literal HTML tags in the block's own .php files.
// ---------------------------------------------------------------------------

/** The CSS properties that inherit. Only these can leak (CLASS 3) or be unreachable (CLASS 2). */
const INHERITED_PROPS = new Set( [
	'font-family', 'font-size', 'font-weight', 'font-style', 'line-height',
	'letter-spacing', 'text-transform', 'text-align', 'text-indent', 'text-wrap',
	'color', 'visibility', 'white-space', 'word-spacing',
] );

/** The inherited typography properties that make a sub-element a "text element". */
const TEXT_EVIDENCE_PROPS = new Set( [
	'font-family', 'font-size', 'font-weight', 'font-style', 'line-height',
	'letter-spacing', 'text-transform',
] );

/**
 * Controls emitted through a shared prefixed helper: argument positions and the
 * suffix → CSS property table. A suffix with tiers/units lists its attr variants.
 */
const CONTROL_HELPERS = {
	sgs_typography_css_rule: {
		prefixArg: 1,
		selectorArg: 2,
		suffixes: [
			{ base: 'FontSize', prop: 'font-size', variants: [ '', 'Unit', 'Tablet', 'Mobile' ] },
			{ base: 'FontFamily', prop: 'font-family', variants: [ '' ] },
			{ base: 'FontWeight', prop: 'font-weight', variants: [ '' ] },
			{ base: 'FontStyle', prop: 'font-style', variants: [ '' ] },
			{ base: 'TextTransform', prop: 'text-transform', variants: [ '' ] },
			{ base: 'LineHeight', prop: 'line-height', variants: [ '', 'Unit', 'Tablet', 'Mobile' ] },
			{ base: 'LetterSpacing', prop: 'letter-spacing', variants: [ '', 'Unit', 'Tablet', 'Mobile' ] },
			{ base: 'TextAlign', prop: 'text-align', variants: [ '' ] },
			{ base: 'TextWrap', prop: 'text-wrap', variants: [ '' ] },
			{ base: 'TextIndent', prop: 'text-indent', variants: [ '' ] },
		],
	},
	sgs_button_element_style_css: {
		prefixArg: 1,
		selectorArg: 2,
		suffixes: [
			{ base: 'ColourText', prop: 'color', variants: [ '' ] },
			{ base: 'FontWeight', prop: 'font-weight', variants: [ '' ] },
			{ base: 'FontSize', prop: 'font-size', variants: [ '' ] },
			// sgs_button_element_line_height() reads a scalar only: a tier-object
			// attribute of the same name paints nothing through this helper.
			{ base: 'LineHeight', prop: 'line-height', variants: [ '' ], scalarOnly: true },
		],
	},
};

const UNK       = '\u0001'; // marks an unresolved PHP fragment inside a resolved string
const INST_CLASS = '__inst__'; // stands for a per-instance class (`$uid`)
const INST_VAR_RE = /^(?:\w*_)?uid$|^(?:\w*_)?(?:block|unique|instance)_?id$|^id$/i;
const VOID_TAGS = new Set( [ 'img', 'br', 'hr', 'input', 'meta', 'link', 'source', 'wbr', 'area', 'col', 'embed', 'param', 'track' ] );

// Advisory-with-ratchet for the E14 findings, mirroring
// check-editor-render-parity.js + editor-render-parity/lib-ceiling.js.
// E14_BLOCKS_BUILD = false: the existing backlog does not red the build.
// E14_OPEN_BACKLOG: per-category ceilings. --check exits 1 when a category's
// net-new count EXCEEDS its ceiling, so a brand-new defect still reds the build.
// The numbers are the counts MEASURED when E14 was introduced: a starting point
// to be LOWERED as the findings are triaged and fixed, never raised to absorb
// new debt. Legacy (non-E14) findings are unaffected and remain blocking.
const E14_BLOCKS_BUILD = false;
// The ceilings are the counts `--check` MEASURES on a clean HEAD, lowered in the
// same commit that removes findings. What remains (plugins/sgs-blocks/reports/
// f3-e14-triage.md §6 holds the full accounting):
// - CLASS-2 28: findings the triage rates DEFENSIBLE (UI chrome, documented
//   intent).
// - CLASS-3 1: sgs/post-grid's empty-state text, rated DEFENSIBLE.
// - CANNOT-RESOLVE 4: the cart badge (two rows; its trigger markup is unseen,
//   CANNOT-TELL), the media caption list's bare `figcaption` member and the
//   theme-toggle icon's svg glyph size.
// A var() value counts as a literal on the E14 path unless the block writes one
// of the custom properties it reads (isUnwrittenVarValue,
// collectWrittenCustomProps).
// Shared PHP is read one hop from a block's require (readBlockPhpFiles): not
// transitively, because includes/render-helpers.php requires the whole helper
// tree and almost every block requires it. A file named for the block
// (`<slug>-*.php`) is its own code and is followed at any depth.
// Markup a function returns is placed under the element its caller puts it in
// (lib/e14-markup-splice.js).
// An element an InnerBlocks template child renders (a `className` in the
// block's editor template) is a front-end element, and the child's own root
// controls own it (collectTemplateChildOwners).
const E14_OPEN_BACKLOG = {
	'CLASS-2':        28,
	'CLASS-3':        1,
	'CANNOT-RESOLVE': 4,
};

/** Stats and the CLASS 1 evidence list, surfaced by --survey. */
const ELEMENT_MODEL_STATS = {
	helperCalls: 0,
	selectorResolved: 0,
	selectorUnresolved: 0,
	prefixUnresolved: 0,
	blocksWithControls: 0,
	class1: [],
	unresolvedControls: [],
};

// ── PHP string-expression resolver ────────────────────────────────────────

/** Index just after the quoted string that opens at str[ i ] (backslash-aware). */
function skipQuoted( str, i ) {
	const q = str[ i ];
	let j = i + 1;
	while ( j < str.length ) {
		if ( '\\' === str[ j ] ) {
			j += 2;
		} else if ( q === str[ j ] ) {
			return j + 1;
		} else {
			j++;
		}
	}
	return str.length;
}

/** Split `str` on `sep` at bracket depth 0, outside quotes. */
function splitTopLevel( str, sep ) {
	const out = [];
	let depth = 0;
	let cur   = '';
	for ( let i = 0; i < str.length; i++ ) {
		const ch = str[ i ];
		if ( "'" === ch || '"' === ch ) {
			const end = skipQuoted( str, i );
			cur += str.slice( i, end );
			i = end - 1;
			continue;
		}
		if ( '([{'.includes( ch ) ) {
			depth++;
		} else if ( ')]}'.includes( ch ) ) {
			depth--;
		}
		if ( ch === sep && 0 === depth ) {
			out.push( cur );
			cur = '';
			continue;
		}
		cur += ch;
	}
	out.push( cur );
	return out;
}

/** Index of the `;` ending the statement that starts at `from` (or the enclosing `)`), quote- and bracket-aware. */
function findStatementEnd( src, from ) {
	let depth = 0;
	for ( let i = from; i < src.length; i++ ) {
		const ch = src[ i ];
		if ( "'" === ch || '"' === ch ) {
			i = skipQuoted( src, i ) - 1;
			continue;
		}
		if ( '([{'.includes( ch ) ) {
			depth++;
		} else if ( ')]}'.includes( ch ) ) {
			if ( 0 === depth ) {
				return i;
			}
			depth--;
		} else if ( ';' === ch && 0 === depth ) {
			return i;
		}
		if ( i - from > 4000 ) {
			return i;
		}
	}
	return src.length;
}

/** Resolve one concat term of a PHP expression to a string (UNK-marked when it cannot be resolved). */
function resolvePhpTerm( term, resolveVar ) {
	const t = term.trim();
	let m = /^'((?:[^'\\]|\\.)*)'$/s.exec( t );
	if ( m ) {
		return m[ 1 ].replace( /\\(['\\])/g, '$1' );
	}
	m = /^"((?:[^"\\]|\\.)*)"$/s.exec( t );
	if ( m ) {
		return m[ 1 ]
			.replace(
				/\{\$([A-Za-z_]\w*)\}|\$([A-Za-z_]\w*)(?![\w[]|->)|\{\$[^}]*\}|\$[A-Za-z_]\w*(?:\[[^\]]*\]|->\w+)/g,
				( all, braced, bare ) => {
					const name = braced || bare;
					return name ? resolveVar( name ) : UNK;
				}
			)
			.replace( /\\(["\\])/g, '$1' );
	}
	m = /^\$([A-Za-z_]\w*)$/.exec( t );
	if ( m ) {
		return resolveVar( m[ 1 ] );
	}
	if ( '(' === t[ 0 ] && ')' === t[ t.length - 1 ] ) {
		return resolvePhpExpr( t.slice( 1, -1 ), resolveVar );
	}
	return UNK;
}

/** Resolve a PHP string-concatenation expression (`'.' . $uid . ' .x'`) to a string. */
function resolvePhpExpr( expr, resolveVar ) {
	if ( ! expr || '' === expr.trim() ) {
		return UNK;
	}
	return splitTopLevel( expr, '.' ).map( ( p ) => resolvePhpTerm( p, resolveVar ) ).join( '' );
}

/**
 * Every named function in `files`: its name, the source range of its parameter
 * list and its parameters (`name`, `def` = default expression or null), in order.
 */
function collectPhpFunctionParams( files ) {
	const fns = [];
	files.forEach( ( f, fileIdx ) => {
		for ( const m of f.src.matchAll( /\bfunction\s+&?([A-Za-z_]\w*)\s*\(/g ) ) {
			const from   = m.index + m[ 0 ].length;
			const end    = findStatementEnd( f.src, from );
			const params = [];
			for ( const piece of splitTopLevel( f.src.slice( from, end ), ',' ) ) {
				const pm = /^\s*(?:[\w\\?|]+\s+)?(&?\s*(?:\.\.\.)?)\$([A-Za-z_]\w*)\s*(?:=([\s\S]*))?$/.exec( piece );
				if ( pm ) {
					params.push( { name: pm[ 2 ], def: undefined !== pm[ 3 ] ? pm[ 3 ].trim() : null, variadic: pm[ 1 ].includes( '...' ) } );
				} else if ( piece.trim() ) {
					params.push( { name: null, def: null, variadic: true } ); // unreadable (attribute, intersection type): keeps its slot
				}
			}
			const brace = f.src.slice( end ).search( /[{;]/ );
			const open  = -1 !== brace && '{' === f.src[ end + brace ] ? end + brace : -1;
			fns.push( { name: m[ 1 ], fileIdx, from, end, params, bodyStart: open, bodyEnd: -1 === open ? -1 : matchBracket( f.src, open ) } );
		}
	} );
	return fns;
}

/**
 * Calls to each function of `fns` across `files`: where each call sits and its
 * trimmed arguments (null when a spread or named argument hides the positions).
 */
function collectPhpCallSites( files, fns ) {
	const sites = new Map();
	for ( const fn of fns ) {
		const list = [];
		for ( const [ fileIdx, f ] of files.entries() ) {
			const starts  = [];
			const regions = captureCallRegions( f.src, fn.name, starts );
			regions.forEach( ( region, i ) => {
				const args = splitTopLevel( region, ',' ).map( ( a ) => a.trim() );
				list.push( { fileIdx, pos: starts[ i ], args: args.some( ( a ) => /^\.\.\.|^[A-Za-z_]\w*\s*:(?!:)/.test( a ) ) ? null : args } );
			} );
		}
		sites.set( fn, list );
	}
	return sites;
}

/**
 * Build a resolver for the block's PHP variables.
 *
 * The block-wide table holds every simple `$x = <expr>;` assignment; a name with
 * one distinct value resolves, anything else is UNK. `resolver.scopedAt( file, pos )`
 * resolves inside the function enclosing that position: a name the function
 * assigns itself is read from its own body, and a parameter is bound to the
 * argument each caller passes (the default for a call that omits it), each
 * argument resolved in its own caller's scope. Two functions sharing a
 * parameter name therefore never conflict, and a chain of pass-through calls
 * (`f( $bem_root )` inside a function that received it) carries the literal.
 */
function buildPhpVarResolver( files ) {
	const raw = new Map(); // name → { exprs: Set<string>, append: boolean }
	for ( const f of files ) {
		const re = /\$([A-Za-z_]\w*)\s*(\.?=)(?![=>])/g;
		let m;
		while ( ( m = re.exec( f.src ) ) !== null ) {
			const prev = m.index > 0 ? f.src[ m.index - 1 ] : '';
			if ( '>' === prev || ':' === prev ) {
				continue; // $this->$x / Class::$x — not a plain variable
			}
			const end  = findStatementEnd( f.src, re.lastIndex );
			const expr = f.src.slice( re.lastIndex, end ).trim();
			if ( ! raw.has( m[ 1 ] ) ) {
				raw.set( m[ 1 ], { exprs: new Set(), append: false } );
			}
			const entry = raw.get( m[ 1 ] );
			if ( '.=' === m[ 2 ] ) {
				entry.append = true;
			} else {
				entry.exprs.add( expr );
			}
		}
	}
	const memo  = new Map();
	const stack = new Set();
	const resolveVar = ( name ) => {
		if ( INST_VAR_RE.test( name ) ) {
			return INST_CLASS;
		}
		if ( memo.has( name ) ) {
			return memo.get( name );
		}
		const entry = raw.get( name );
		if ( ! entry || entry.append || 0 === entry.exprs.size || stack.has( name ) ) {
			return UNK;
		}
		stack.add( name );
		const values = new Set( [ ...entry.exprs ].map( ( e ) => resolvePhpExpr( e, resolveVar ) ) );
		stack.delete( name );
		const value = 1 === values.size ? [ ...values ][ 0 ] : UNK;
		memo.set( name, value );
		return value;
	};

	const fns    = collectPhpFunctionParams( files );
	const sites  = collectPhpCallSites( files, fns );
	const scopes = new Map();
	const single = ( values ) => ( 1 === new Set( values ).size ? values[ 0 ] : UNK );
	const scopeAt = ( fileIdx, pos ) => {
		const fn = fns.find( ( c ) => c.fileIdx === fileIdx && -1 !== c.bodyStart && pos > c.bodyStart && pos < c.bodyEnd );
		return fn ? scopeOf( fn ) : resolveVar;
	};
	const resolveParam = ( fn, idx ) => {
		const p = fn.params[ idx ];
		if ( p.variadic ) {
			return UNK;
		}
		const fallback = null !== p.def ? resolvePhpExpr( p.def, resolveVar ) : UNK;
		const calls    = sites.get( fn );
		if ( 0 === calls.length ) {
			return fallback;
		}
		const values = [];
		for ( const call of calls ) {
			if ( ! call.args ) {
				return UNK;
			}
			const arg = call.args[ idx ];
			values.push( arg ? resolvePhpExpr( arg, scopeAt( call.fileIdx, call.pos ) ) : fallback );
		}
		return single( values );
	};
	const scopeOf = ( fn ) => {
		if ( scopes.has( fn ) ) {
			return scopes.get( fn );
		}
		const body       = files[ fn.fileIdx ].src.slice( fn.bodyStart, fn.bodyEnd );
		const scopeMemo  = new Map();
		const scopeStack = new Set();
		const resolve    = ( name ) => {
			if ( INST_VAR_RE.test( name ) ) {
				return INST_CLASS;
			}
			if ( scopeMemo.has( name ) ) {
				return scopeMemo.get( name );
			}
			if ( scopeStack.has( name ) ) {
				return UNK;
			}
			scopeStack.add( name );
			const exprs = [];
			let append  = false;
			const re    = new RegExp( '\\$' + name + '\\s*(\\.?=)(?![=>])', 'g' );
			let m;
			while ( ( m = re.exec( body ) ) !== null ) {
				if ( '>' === body[ m.index - 1 ] || ':' === body[ m.index - 1 ] ) {
					continue;
				}
				if ( '.=' === m[ 1 ] ) {
					append = true;
				} else {
					exprs.push( body.slice( re.lastIndex, findStatementEnd( body, re.lastIndex ) ).trim() );
				}
			}
			const idx = fn.params.findIndex( ( p ) => p.name === name );
			let value;
			if ( append ) {
				value = UNK;
			} else if ( exprs.length ) {
				value = single( exprs.map( ( e ) => resolvePhpExpr( e, resolve ) ) );
			} else if ( idx >= 0 ) {
				value = resolveParam( fn, idx );
			} else {
				value = resolveVar( name );
			}
			scopeStack.delete( name );
			scopeMemo.set( name, value );
			return value;
		};
		scopes.set( fn, resolve );
		return resolve;
	};
	resolveVar.scopedAt = scopeAt;
	return resolveVar;
}

/** Argument regions of every call to `fnName` (quote- and bracket-aware; skips the definition). */
function captureCallRegions( src, fnName, starts ) {
	const regions = [];
	const needle  = fnName + '(';
	let from = 0;
	let idx;
	while ( ( idx = src.indexOf( needle, from ) ) !== -1 ) {
		from = idx + needle.length;
		if ( idx > 0 && /[A-Za-z0-9_]/.test( src[ idx - 1 ] ) ) {
			continue;
		}
		if ( /(?:->|::)\s*$/.test( src.slice( Math.max( 0, idx - 4 ), idx ) ) ) {
			continue; // a method or static call that happens to share a function's name
		}
		if ( /function\s+&?$/.test( src.slice( Math.max( 0, idx - 24 ), idx ) ) ) {
			continue; // the definition, not a call
		}
		const end = findStatementEnd( src, from );
		regions.push( src.slice( from, end ) );
		if ( starts ) {
			starts.push( idx ); // where the call sits, for a caller that needs its enclosing function
		}
		from = end;
	}
	return regions;
}

// ── Selector parsing ──────────────────────────────────────────────────────

/** Replace `:where( x )` with `x`, and drop the argument of the other functional pseudo-classes. */
function simplifyPseudos( selector ) {
	let s = selector;
	for ( let guard = 0; guard < 6; guard++ ) {
		const next = s
			.replace( /:where\(([^()]*)\)/gi, ' $1 ' )
			.replace( /:(?:is|not|has|nth-[a-z-]+|lang|dir|host)\([^()]*\)/gi, '' );
		if ( next === s ) {
			break;
		}
		s = next;
	}
	return s.replace( /\[[^\]]*\]/g, '' );
}

function parseCompound( text ) {
	const classes = [];
	const re = /\.(-?[A-Za-z_][\w-]*)/g;
	let m;
	while ( ( m = re.exec( text ) ) !== null ) {
		classes.push( m[ 1 ] );
	}
	const inst = classes.includes( INST_CLASS );
	return {
		classes: classes.filter( ( c ) => c !== INST_CLASS ),
		inst,
		unknown: text.includes( UNK ),
		tag:     ( /^[a-z][\w-]*/i.exec( text ) || [ '' ] )[ 0 ],
	};
}

/**
 * Parse a selector list into members; each member is the chain of compounds
 * that are ancestors-or-self of the targeted element (a sibling combinator
 * discards everything before it, because a sibling is not an ancestor).
 */
function parseSelectorMembers( selector ) {
	const out = [];
	for ( const member of splitTopLevel( simplifyPseudos( selector ), ',' ) ) {
		const text = member.trim();
		if ( ! text ) {
			continue;
		}
		const chain = [];
		const re = /\s*([>+~])\s*|\s+/g;
		let last = 0;
		let m;
		const push = ( piece ) => {
			if ( piece.trim() ) {
				chain.push( parseCompound( piece.trim() ) );
			}
		};
		while ( ( m = re.exec( text ) ) !== null ) {
			if ( '' === m[ 0 ] ) {
				re.lastIndex++;
				continue;
			}
			push( text.slice( last, m.index ) );
			if ( '+' === m[ 1 ] || '~' === m[ 1 ] ) {
				chain.length = 0;
			}
			last = re.lastIndex;
		}
		push( text.slice( last ) );
		if ( chain.length ) {
			out.push( chain );
		}
	}
	return out;
}

// ── Block model: root classes, controls, markup ───────────────────────────

/** Blank out PHP block and line comments, keeping line breaks and any `?>`. */
function maskPhpComments( raw ) {
	return raw
		.replace( /\/\*[\s\S]*?\*\//g, ( c ) => c.replace( /[^\n]/g, ' ' ) )
		// A `//` comment ends at the line break OR at a `?>` — keep the `?>`
		// so an inline `<?php // note ?>` does not leave an unclosed PHP tag.
		.replace( /(^|[^:'"])\/\/([^\n]*)/g, ( all, pre, rest ) => {
			const close = rest.indexOf( '?>' );
			return pre + ' ' + ( close >= 0 ? rest.slice( close ) : '' );
		} );
}

/**
 * Resolve the path expression of one `require` / `require_once` found in
 * `fromFile` to an absolute .php path. Understands `__DIR__`,
 * `dirname( __DIR__ [, n] )` and string literals joined by `.`; anything else
 * (constants, variables, function calls) returns null and is skipped.
 */
function resolveRequirePath( expr, fromFile ) {
	let e = expr.trim();
	if ( e.startsWith( '(' ) && e.endsWith( ')' ) ) {
		e = e.slice( 1, -1 ).trim();
	}
	const dir  = path.dirname( fromFile );
	const term = /\s*(?:dirname\(\s*(__DIR__|__FILE__)\s*(?:,\s*(\d+)\s*)?\)|(__DIR__)|'([^']*)'|"([^"$\\]*)")\s*(\.|$)/y;
	let out = '';
	let m;
	while ( ( m = term.exec( e ) ) !== null ) {
		if ( undefined !== m[ 4 ] ) {
			out += m[ 4 ];
		} else if ( undefined !== m[ 5 ] ) {
			out += m[ 5 ];
		} else if ( undefined !== m[ 3 ] ) {
			out += dir;
		} else {
			// dirname( X, n ) applies n dirnames to X (__FILE__ or __DIR__).
			let d = '__FILE__' === m[ 1 ] ? fromFile : dir;
			const levels = m[ 2 ] ? parseInt( m[ 2 ], 10 ) : 1;
			for ( let i = 0; i < levels; i++ ) {
				d = path.dirname( d );
			}
			out += d;
		}
		if ( '' === m[ 6 ] ) {
			return /\.php$/i.test( out ) ? path.resolve( out ) : null;
		}
	}
	return null;
}

/**
 * The block's own PHP files, plus the files they `require` ONE HOP out.
 * The hop is deliberately not transitive: includes/render-helpers.php requires
 * the whole helper tree and almost every block requires it, so following
 * requires found inside required files would pull every helper's markup into
 * every block's element model.
 */
function readBlockPhpFiles( blockDir ) {
	const files = [];
	const seen  = new Set();
	const walk  = ( dir ) => {
		for ( const e of fs.readdirSync( dir, { withFileTypes: true } ) ) {
			const p = path.join( dir, e.name );
			if ( e.isDirectory() && 'node_modules' !== e.name && 'build' !== e.name ) {
				walk( p );
			} else if ( e.isFile() && /\.php$/i.test( e.name ) ) {
				seen.add( path.resolve( p ) );
				files.push( { file: p, src: maskPhpComments( fs.readFileSync( p, 'utf8' ) ) } );
			}
		}
	};
	walk( blockDir );
	// A file named for the block (`<slug>-*.php`) is the block's own code wherever it is
	// required from, so it is followed at any depth; any other file only one hop.
	const slugPrefix = path.basename( blockDir ) + '-';
	const queue      = files.slice();
	for ( let hop = 0; hop < queue.length; hop++ ) {
		const f = queue[ hop ];
		const isFirstHop = ! f.followed; // a file of the block's own directory
		for ( const m of f.src.matchAll( /(?<![\w$>:])require(?:_once)?\b\s*([^;]+);/g ) ) {
			const target = resolveRequirePath( m[ 1 ], f.file );
			if ( ! target || seen.has( target ) ) {
				continue;
			}
			const isOwn = path.basename( target ).startsWith( slugPrefix );
			if ( ! isFirstHop && ! isOwn ) {
				continue;
			}
			try {
				if ( fs.statSync( target ).isFile() ) {
					const entry = { file: target, src: maskPhpComments( fs.readFileSync( target, 'utf8' ) ), followed: true };
					seen.add( target );
					files.push( entry );
					queue.push( entry );
				}
			} catch ( err ) {
				// Missing or unreadable target: skip it, the gate never fails on a require.
			}
		}
	}
	return files;
}

/**
 * Class names carried by the block's ROOT element: the WP wrapper classes, the
 * block.json selectors.root classes, and any class literal that flows into
 * get_block_wrapper_attributes() (followed through up to three variable hops).
 */
function collectRootClasses( files, slug, meta ) {
	const roots = new Set( [ `wp-block-sgs-${ slug }`, `sgs-${ slug }`, slug ] );
	const rootSel = meta.selectors && 'string' === typeof meta.selectors.root ? meta.selectors.root : '';
	for ( const m of rootSel.matchAll( /\.(-?[A-Za-z_][\w-]*)/g ) ) {
		roots.add( m[ 1 ] );
	}
	const ownsClass = ( c ) => c.startsWith( `sgs-${ slug }` ) || c.startsWith( `wp-block-sgs-${ slug }` ) || c === slug;
	for ( const f of files ) {
		for ( const region of captureCallRegions( f.src, 'get_block_wrapper_attributes' ) ) {
			const seenVars = new Set();
			let frontier   = [ region ];
			for ( let hop = 0; hop < 4 && frontier.length; hop++ ) {
				const next = [];
				for ( const text of frontier ) {
					for ( const lm of text.matchAll( /'([^']*)'|"([^"]*)"/g ) ) {
						for ( const tok of ( lm[ 1 ] !== undefined ? lm[ 1 ] : lm[ 2 ] ).split( /\s+/ ) ) {
							if ( /^[A-Za-z_][\w-]*$/.test( tok ) && ownsClass( tok ) ) {
								roots.add( tok );
							}
						}
					}
					for ( const vm of text.matchAll( /\$([A-Za-z_]\w*)/g ) ) {
						if ( seenVars.has( vm[ 1 ] ) || 'attributes' === vm[ 1 ] ) {
							continue;
						}
						seenVars.add( vm[ 1 ] );
						const stmtRe = new RegExp( '\\$' + vm[ 1 ] + '(?:\\[[^\\]]*\\])?\\s*\\.?=(?![=>])', 'g' );
						for ( const g of files ) {
							let sm;
							while ( ( sm = stmtRe.exec( g.src ) ) !== null ) {
								next.push( g.src.slice( stmtRe.lastIndex, findStatementEnd( g.src, stmtRe.lastIndex ) ) );
							}
						}
					}
				}
				frontier = next;
			}
		}
	}
	return roots;
}

/** Controls emitted by the shared helpers, plus the selectors.typography target. */
function collectControlEmissions( files, resolveVar, declaredAttrs, meta, hasSelectorsTypography ) {
	const controls         = [];
	const wildcardProps    = new Set();
	const addControl       = ( prop, attrs, selectorText, source ) => {
		// A control member is usable when its last compound carries a class (or the
		// instance class). A bare-tag member (`.uid h3`) is kept apart: it can only
		// be compared with a bare-tag declaration of the same tag.
		const parsed      = parseSelectorMembers( selectorText );
		const last        = ( chain ) => chain[ chain.length - 1 ];
		const classed     = parsed.filter( ( c ) => ! last( c ).unknown && ( last( c ).classes.length || last( c ).inst ) );
		const bareTags    = parsed.filter( ( c ) => ! last( c ).unknown && ! last( c ).classes.length && ! last( c ).inst && last( c ).tag ).map( ( c ) => last( c ).tag.toLowerCase() );
		const unusable    = parsed.length - classed.length - bareTags.length;
		const members     = parsed.length && classed.length && 0 === unusable ? classed : null;
		const control     = { prop, attrs, members, bareTags, selectorText, source };
		controls.push( control );
		return control;
	};

	for ( const [ fnName, spec ] of Object.entries( CONTROL_HELPERS ) ) {
		for ( const [ fileIdx, f ] of files.entries() ) {
			const starts  = [];
			const regions = captureCallRegions( f.src, fnName, starts );
			for ( const [ ri, region ] of regions.entries() ) {
				ELEMENT_MODEL_STATS.helperCalls++;
				const scoped = resolveVar.scopedAt ? resolveVar.scopedAt( fileIdx, starts[ ri ] ) : resolveVar;
				const args   = splitTopLevel( region, ',' );
				const prefix = args[ spec.prefixArg ] !== undefined ? resolvePhpExpr( args[ spec.prefixArg ], scoped ) : UNK;
				const selRaw = args[ spec.selectorArg ] !== undefined ? resolvePhpExpr( args[ spec.selectorArg ], scoped ) : UNK;
				if ( prefix.includes( UNK ) || prefix.includes( INST_CLASS ) ) {
					ELEMENT_MODEL_STATS.prefixUnresolved++;
					for ( const s of spec.suffixes ) {
						wildcardProps.add( s.prop );
					}
					continue;
				}
				let callControl = null;
				for ( const s of spec.suffixes ) {
					const attrs = s.variants
						.map( ( v ) => ( '' !== prefix ? prefix + s.base + v : s.base.charAt( 0 ).toLowerCase() + s.base.slice( 1 ) + v ) )
						.filter( ( a ) => declaredAttrs.has( a ) )
						.filter( ( a ) => ! s.scalarOnly || 'object' !== ( ( meta.attributes || {} )[ a ] || {} ).type );
					if ( 0 === attrs.length ) {
						continue; // the call site does not correspond to a declared control
					}
					const added = addControl( s.prop, attrs, selRaw, `${ fnName }@${ path.basename( f.file ) }` );
					callControl = callControl || added;
				}
				if ( callControl ) {
					ELEMENT_MODEL_STATS[ callControl.members ? 'selectorResolved' : 'selectorUnresolved' ]++;
				}
			}
		}
	}

	if ( hasSelectorsTypography && meta.selectors && 'string' === typeof meta.selectors.typography ) {
		for ( const prop of WP_NATIVE_TYPOGRAPHY_PROPS ) {
			addControl( prop, [ 'selectors.typography' ], meta.selectors.typography, 'block.json selectors.typography' );
		}
	}
	return { controls, wildcardProps };
}

/** Literal-HTML markup tree of the block: instances with their class sets and parent links. */
function buildMarkupModel( files, rootClasses ) {
	const instances = [];
	const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b((?:"[^"]*"|'[^']*'|<\?[\s\S]*?\?>|[^<>"'])*?)(\/?)>/g;
	for ( const [ fileIdx, f ] of files.entries() ) {
		const stack = [];
		let m;
		tagRe.lastIndex = 0;
		while ( ( m = tagRe.exec( f.src ) ) !== null ) {
			const tag = m[ 2 ].toLowerCase();
			if ( '/' === m[ 1 ] ) {
				for ( let k = stack.length - 1; k >= 0; k-- ) {
					if ( instances[ stack[ k ] ].tag === tag ) {
						// The element, and any unclosed one it implicitly ends, closes here.
						for ( let j = k; j < stack.length; j++ ) {
							instances[ stack[ j ] ].closePos = m.index;
						}
						stack.length = k;
						break;
					}
				}
				continue;
			}
			const attrText = m[ 3 ];
			const cm       = /class\s*=\s*\\?(["'])([\s\S]*?)\\?\1/.exec( attrText );
			const classes  = new Set(
				// A token that touches a PHP string quote (`'sgs-x__orn' . ( … ) . '`) is the literal
				// piece of a concatenated class value; its quote is not part of the class.
				cm ? cm[ 2 ].replace( /<\?[\s\S]*?\?>/g, ' ' ).split( /\s+/ ).map( ( c ) => c.replace( /^'+|'+$/g, '' ) ).filter( ( c ) => /^[A-Za-z_][\w-]*$/.test( c ) && ! /[-_]$/.test( c ) ) : []
			);
			let root = /wrapper_attr|get_block_wrapper/i.test( attrText );
			for ( const c of classes ) {
				if ( rootClasses.has( c ) ) {
					root = true;
				}
			}
			if ( root ) {
				for ( const c of rootClasses ) {
					classes.add( c );
				}
			}
			// A class attribute built at run time (a PHP echo / variable) means this
			// element can carry classes the literal markup does not show.
			const dynamic = ! root && ( cm ? /<\?|\$|'\s*\.|\.\s*'/.test( cm[ 2 ] ) : /<\?|\$|\becho\b/.test( attrText ) );
			instances.push( {
				tag,
				classes,
				root,
				dynamic,
				mainFile: /(?:^|[\\/])render\.php$/.test( f.file ),
				parent:   stack.length ? stack[ stack.length - 1 ] : -1,
				fileIdx,
				pos:      m.index,
				closePos: Infinity, // set where the matching close tag sits; a void or self-closed tag ends where it starts
			} );
			if ( ! VOID_TAGS.has( tag ) && '/' !== m[ 4 ] ) {
				stack.push( instances.length - 1 );
			} else {
				instances[ instances.length - 1 ].closePos = m.index;
			}
		}
	}
	return instances;
}

function buildElementModel( blockDir, meta, declaredAttrs, hasSelectorsTypography, withChildren = true ) {
	const files = readBlockPhpFiles( blockDir );
	const slug  = path.basename( blockDir );
	if ( 0 === files.length ) {
		return null;
	}
	const resolveVar = buildPhpVarResolver( files );
	const { controls, wildcardProps } = collectControlEmissions( files, resolveVar, declaredAttrs, meta, hasSelectorsTypography );
	if ( 0 === controls.length && 0 === wildcardProps.size ) {
		return null;
	}
	ELEMENT_MODEL_STATS.blocksWithControls++;
	for ( const c of controls ) {
		if ( ! c.members ) {
			ELEMENT_MODEL_STATS.unresolvedControls.push( { block: slug, source: c.source, selector: c.selectorText } );
		}
	}
	const rootClasses = collectRootClasses( files, slug, meta );
	const props     = new Set( [ ...controls.map( ( c ) => c.prop ), ...wildcardProps ] );
	const instances = buildMarkupModel( files, rootClasses );
	spliceFragments( instances, files, { collectPhpFunctionParams, collectPhpCallSites, splitTopLevel, matchBracket, skipQuoted } );
	return {
		props,
		controls,
		wildcardProps,
		rootClasses,
		instances,
		childOwners: withChildren ? collectTemplateChildOwners( blockDir ) : new Map(),
		isEditorOnlyClass: ( cls ) => isEditorOnlyClass( cls, blockDir, files ),
	};
}

// ── InnerBlocks template children ─────────────────────────────────────────

const TEMPLATE_CHILDREN_CACHE = new Map();
const CHILD_ROOT_CONTROLS_CACHE = new Map();

/**
 * The SGS children the block's editor templates place with a className:
 * `[ 'sgs/<child>', { …, className: '<classes>' } ]` tuples in its non-test JS.
 * Returns [{ child, classes }]. An attribute object holding a nested object is
 * not matched, which errs towards reporting.
 */
function collectTemplateChildren( blockDir ) {
	if ( ! TEMPLATE_CHILDREN_CACHE.has( blockDir ) ) {
		const out = [];
		for ( const file of listSourceFiles( blockDir, [ '.js' ] ) ) {
			if ( /\.test\.js$/i.test( file ) ) {
				continue;
			}
			const src = maskJsComments( fs.readFileSync( file, 'utf8' ) );
			for ( const m of src.matchAll( /\[\s*(['"])sgs\/([a-z0-9-]+)\1\s*,\s*\{([^{}]*)\}/g ) ) {
				const cm = /\bclassName\s*:\s*(['"])([^'"]+)\1/.exec( m[ 3 ] );
				if ( cm ) {
					out.push( { child: m[ 2 ], classes: cm[ 2 ].split( /\s+/ ).filter( Boolean ) } );
				}
			}
		}
		TEMPLATE_CHILDREN_CACHE.set( blockDir, out );
	}
	return TEMPLATE_CHILDREN_CACHE.get( blockDir );
}

/**
 * Controls the block in `childDir` paints on its OWN root, with resolved
 * members. The child's model is built without its own template children and
 * without touching the survey stats.
 */
function childRootControls( childDir ) {
	if ( CHILD_ROOT_CONTROLS_CACHE.has( childDir ) ) {
		return CHILD_ROOT_CONTROLS_CACHE.get( childDir );
	}
	CHILD_ROOT_CONTROLS_CACHE.set( childDir, [] );
	let meta;
	try {
		meta = JSON.parse( fs.readFileSync( path.join( childDir, 'block.json' ), 'utf8' ) );
	} catch ( err ) {
		return [];
	}
	const hasSelTypo = !! ( meta.selectors && 'object' === typeof meta.selectors && 'typography' in meta.selectors );
	const saved      = JSON.stringify( ELEMENT_MODEL_STATS );
	const model      = buildElementModel( childDir, meta, new Set( Object.keys( meta.attributes || {} ) ), hasSelTypo, false );
	Object.assign( ELEMENT_MODEL_STATS, JSON.parse( saved ) );
	const own = [];
	for ( const c of model ? model.controls : [] ) {
		const members = ( c.members || [] ).filter( ( cm ) => isRootCompound( lastCompound( cm ), model ) );
		if ( members.length ) {
			own.push( { prop: c.prop, attrs: c.attrs, members } );
		}
	}
	CHILD_ROOT_CONTROLS_CACHE.set( childDir, own );
	return own;
}

/**
 * E14 gap 9: className → one controls list per template tuple that places it.
 * Each child paints those properties on its own root, which is the element
 * carrying the className; the element is owned only when every tuple's child
 * paints the property.
 */
function collectTemplateChildOwners( blockDir ) {
	const owners = new Map();
	for ( const { child, classes } of collectTemplateChildren( blockDir ) ) {
		const childDir = path.join( path.dirname( blockDir ), child );
		if ( path.resolve( childDir ) === path.resolve( blockDir ) ) {
			continue;
		}
		const controls = childRootControls( childDir ).map( ( c ) => ( {
			...c,
			attrs: c.attrs.map( ( a ) => `sgs/${ child }:${ a }` ),
		} ) );
		for ( const cls of classes ) {
			owners.set( cls, [ ...( owners.get( cls ) || [] ), controls ] );
		}
	}
	return owners;
}

// ── Editor-only classes ───────────────────────────────────────────────────

const FRONT_END_SRC_CACHE = new Map();

/** Every file under `dir` with one of `exts`, skipping node_modules and build. */
function listSourceFiles( dir, exts ) {
	const out = [];
	let entries;
	try {
		entries = fs.readdirSync( dir, { withFileTypes: true } );
	} catch ( err ) {
		return out;
	}
	for ( const e of entries ) {
		const p = path.join( dir, e.name );
		if ( e.isDirectory() && 'node_modules' !== e.name && 'build' !== e.name ) {
			out.push( ...listSourceFiles( p, exts ) );
		} else if ( e.isFile() && exts.includes( path.extname( e.name ).toLowerCase() ) ) {
			out.push( p );
		}
	}
	return out;
}

/** The plugin's shared `includes/` PHP, read once per run. */
function readSharedIncludesSrc( blockDir ) {
	const incDir = path.resolve( blockDir, '..', '..', '..', 'includes' );
	if ( ! FRONT_END_SRC_CACHE.has( incDir ) ) {
		FRONT_END_SRC_CACHE.set(
			incDir,
			listSourceFiles( incDir, [ '.php' ] ).map( ( f ) => fs.readFileSync( f, 'utf8' ) ).join( '\n' )
		);
	}
	return FRONT_END_SRC_CACHE.get( incDir );
}

const escapeRegExp = ( t ) => t.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );

/**
 * True when `cls` is rendered ONLY by the editor canvas: its literal appears in
 * the block's edit.js, and neither the class nor its `__element` stem (a class
 * built as `$prefix . '__stem'`) appears in any front-end emitter: the block's
 * PHP (own and one-hop required), its other JS (view.js, save.js, helpers) or
 * the plugin's shared includes/ PHP. A declaration on such a class can never
 * block a front-end control.
 */
function isEditorOnlyClass( cls, blockDir, phpFiles ) {
	let editSrc = '';
	try {
		editSrc = fs.readFileSync( path.join( blockDir, 'edit.js' ), 'utf8' );
	} catch ( err ) {
		return false;
	}
	const token = new RegExp( '(?<![\\w-])' + escapeRegExp( cls ) + '(?![\\w-])' );
	if ( ! token.test( editSrc ) ) {
		return false;
	}
	if ( collectTemplateChildren( blockDir ).some( ( t ) => t.classes.includes( cls ) ) ) {
		// An InnerBlocks template className is saved into the post and rendered
		// by the child block on the front end.
		return false;
	}
	const stemAt = cls.indexOf( '__' );
	const stem   = new RegExp( '[\'"]' + escapeRegExp( stemAt > 0 ? cls.slice( stemAt ) : cls ) + '(?![\\w-])' );
	const frontEnd = [
		...phpFiles.map( ( f ) => f.src ),
		...listSourceFiles( blockDir, [ '.js' ] )
			.filter( ( f ) => 'edit.js' !== path.basename( f ) )
			.map( ( f ) => fs.readFileSync( f, 'utf8' ) ),
		readSharedIncludesSrc( blockDir ),
	];
	return ! frontEnd.some( ( src ) => token.test( src ) || ( stemAt > 0 && stem.test( src ) ) );
}

// ── Relations ─────────────────────────────────────────────────────────────

const lastCompound = ( chain ) => chain[ chain.length - 1 ];
const isSubset     = ( a, b ) => a.classes.length > 0 && a.classes.every( ( c ) => b.classes.includes( c ) );

function isRootCompound( c, model ) {
	if ( c.unknown ) {
		return false;
	}
	return c.classes.length > 0
		? c.classes.every( ( cl ) => model.rootClasses.has( cl ) )
		: c.inst;
}

function matchInstances( c, model ) {
	if ( isRootCompound( c, model ) ) {
		return model.instances.map( ( inst, i ) => ( inst.root ? i : -1 ) ).filter( ( i ) => i >= 0 );
	}
	if ( 0 === c.classes.length ) {
		return [];
	}
	return model.instances.map( ( inst, i ) => ( c.classes.every( ( cl ) => inst.classes.has( cl ) ) ? i : -1 ) ).filter( ( i ) => i >= 0 );
}

function isDescendantInstance( model, i, ancestor ) {
	for ( let p = model.instances[ i ].parent; p >= 0; p = model.instances[ p ].parent ) {
		if ( p === ancestor ) {
			return true;
		}
	}
	return false;
}

/**
 * True when instance `i` and every ancestor of it have a fully literal class
 * attribute and the chain ends in the block's own render.php (whose markup is
 * the whole block). Then no run-time-built element can sit above it.
 */
function hasFullyLiteralAncestry( model, i ) {
	let top = i;
	for ( let p = i; p >= 0; p = model.instances[ p ].parent ) {
		if ( model.instances[ p ].dynamic ) {
			return false;
		}
		top = p;
	}
	return model.instances[ top ].mainFile;
}

/**
 * Relation of the element targeted by control compound `a` to the element
 * targeted by the declaration chain `bChain`:
 *   'same' | 'control-above' (S is a descendant of the control's element) |
 *   'control-below' (S is an ancestor of the control's element) | 'unrelated' | 'unknown'
 */
function relateElements( a, bChain, model ) {
	const b = lastCompound( bChain );
	if ( 0 === b.classes.length && ! b.inst ) {
		// A bare tag (`.x__label span`): strictly inside the nearest classed ancestor.
		if ( bChain.length < 2 ) {
			return 'unknown';
		}
		const rel = relateElements( a, bChain.slice( 0, -1 ), model );
		if ( 'same' === rel || 'control-above' === rel ) {
			return 'control-above';
		}
		return 'unrelated' === rel ? 'unrelated' : 'unknown';
	}
	const aRoot = isRootCompound( a, model );
	const bRoot = isRootCompound( b, model );
	if ( aRoot && bRoot ) {
		return 'same';
	}
	if ( isSubset( a, b ) || isSubset( b, a ) ) {
		return 'same';
	}
	for ( const anc of bChain.slice( 0, -1 ) ) {
		if ( aRoot ? isRootCompound( anc, model ) : isSubset( a, anc ) ) {
			return 'control-above';
		}
	}
	const aInst = matchInstances( a, model );
	const bInst = matchInstances( b, model );
	if ( aInst.some( ( i ) => bInst.includes( i ) ) ) {
		return 'same';
	}
	if ( aRoot ) {
		return ( bInst.length > 0 || b.classes.some( ( c ) => /__/.test( c ) ) ) ? 'control-above' : 'unknown';
	}
	if ( bRoot ) {
		return 'control-below';
	}
	if ( bInst.length && 0 === aInst.length && bInst.every( ( i ) => hasFullyLiteralAncestry( model, i ) ) ) {
		// The control's element is never emitted as literal markup, and every
		// ancestor of the declaring element is: the control's element cannot be one of them.
		return 'unrelated';
	}
	if ( aInst.length && bInst.length ) {
		if ( bInst.some( ( i ) => aInst.some( ( j ) => isDescendantInstance( model, i, j ) ) ) ) {
			return 'control-above';
		}
		if ( aInst.some( ( j ) => bInst.some( ( i ) => isDescendantInstance( model, j, i ) ) ) ) {
			return 'control-below';
		}
		return 'unrelated';
	}
	return 'unknown';
}

/**
 * Specificity of a selector chain as [classes, tags]: the per-instance marker
 * counts as a class. Null when any compound is not statically resolvable.
 */
function chainSpecificity( chain ) {
	let classes = 0;
	let tags    = 0;
	for ( const c of chain ) {
		if ( c.unknown ) {
			return null;
		}
		classes += c.classes.length + ( c.inst ? 1 : 0 );
		tags    += c.tag && 0 === c.classes.length && ! c.inst ? 1 : 0;
	}
	return [ classes, tags ];
}

/** True when control chain `a` has strictly higher specificity than declaration chain `b`. */
function chainBeatsChain( a, b ) {
	const sa = chainSpecificity( a );
	const sb = chainSpecificity( b );
	return !! sa && !! sb && ( sa[ 0 ] > sb[ 0 ] || ( sa[ 0 ] === sb[ 0 ] && sa[ 1 ] > sb[ 1 ] ) );
}

/** Does a CSS compound target the markup instance `inst` (non-root compounds only)? */
const compoundMatchesInstance = ( c, inst ) => c.classes.length > 0 && c.classes.every( ( cl ) => inst.classes.has( cl ) );

/**
 * CLASS 3: text descendants of S's element that declare no `prop` of their own.
 * Returns { leaks, unknown }.
 */
function findLeakTargets( bChain, prop, model, declLog ) {
	const b     = lastCompound( bChain );
	const bRoot = isRootCompound( b, model );
	const sInst = matchInstances( b, model );
	if ( ! bRoot && 0 === sInst.length ) {
		return { leaks: [], unknown: true };
	}
	const ownDecls = declLog.map( ( d ) => ( { prop: d.property, members: parseSelectorMembers( d.selector ) } ) );
	const seen  = new Set();
	const leaks = [];
	model.instances.forEach( ( inst, idx ) => {
		const isDescendant = bRoot
			? ! inst.root
			: sInst.some( ( s ) => isDescendantInstance( model, idx, s ) );
		if ( ! isDescendant || 0 === inst.classes.size ) {
			return;
		}
		const key = [ ...inst.classes ].sort().join( '.' );
		if ( seen.has( key ) ) {
			return;
		}
		seen.add( key );
		const declares = ( p ) => ownDecls.some( ( d ) => d.prop === p && d.members.some( ( ch ) => compoundMatchesInstance( lastCompound( ch ), inst ) ) );
		const controlsHere = ( p ) => model.controls.filter( ( c ) => c.members && ( ! p || c.prop === p ) && c.members.some( ( ch ) => compoundMatchesInstance( lastCompound( ch ), inst ) ) );
		const textEvidence = controlsHere( null ).length > 0 || [ ...TEXT_EVIDENCE_PROPS ].some( declares );
		if ( ! textEvidence || declares( prop ) ) {
			return;
		}
		const primary = [ ...inst.classes ].find( ( c ) => ! model.rootClasses.has( c ) ) || [ ...inst.classes ][ 0 ];
		leaks.push( { cls: primary, hasControl: controlsHere( prop ).length > 0 } );
	} );
	return { leaks, unknown: false };
}

/**
 * Classify one hardcoded declaration of an INHERITED property.
 * Returns null (no controls for the property), or { cls, attrs, note } where cls is
 * 'CLASS-1' (same element, not a finding), 'CLASS-2', 'CLASS-3' or 'CANNOT-RESOLVE'.
 */
function classifyInheritedHardcode( cand, model, declLog ) {
	const prop     = cand.property;
	const controls = model.controls.filter( ( c ) => c.prop === prop );
	const wildcard = model.wildcardProps.has( prop );
	if ( 0 === controls.length && ! wildcard ) {
		return null;
	}
	const members = parseSelectorMembers( cand.selector );
	const attrsOf = ( list ) => [ ...new Set( list.flatMap( ( c ) => c.attrs ) ) ].join( ', ' );
	// The parsed chain drops sibling combinators and :not()/:is()/:has(), so it
	// under-counts such a selector's specificity: a "beats" verdict is unsafe.
	const specCounted = ! /[+~]|:(?:not|is|has|matches)\(/.test( cand.selector.replace( /\[[^\]]*\]/g, '' ) );
	let sawSame   = false;
	let worst     = null;
	for ( const chain of members ) {
		const b = lastCompound( chain );
		if ( b.unknown ) {
			worst = worst || { cls: 'CANNOT-RESOLVE', attrs: attrsOf( controls ), note: 'the declaring selector is not statically resolvable' };
			continue;
		}
		if ( b.classes.length > 0 && b.classes.some( ( cl ) => model.isEditorOnlyClass( cl ) ) ) {
			// Rendered by the editor canvas only: no front-end control can be blocked.
			continue;
		}
		if ( specCounted && b.classes.some( ( cl ) => {
			const tuples = model.childOwners.get( cl ) || [];
			return tuples.length > 0 && tuples.every( ( owned ) => owned.some( ( oc ) =>
				oc.prop === prop && oc.members.some( ( cm ) => chainBeatsChain( cm, chain ) )
			) );
		} ) ) {
			// Every InnerBlocks template child that renders this element paints the
			// property on its own root at a strictly higher specificity. A tie is
			// decided by source order, so it falls through.
			sawSame = true;
			continue;
		}
		const rels = controls.map( ( c ) => {
			if ( ! c.members ) {
				return { c, rel: 'unknown' };
			}
			if ( 0 === b.classes.length && ! b.inst && c.bareTags.includes( b.tag.toLowerCase() ) ) {
				return { c, rel: 'same' };
			}
			const set = c.members.map( ( cm ) => relateElements( lastCompound( cm ), chain, model ) );
			const pick = [ 'same', 'control-above', 'control-below', 'unrelated' ].find( ( r ) => set.includes( r ) );
			return { c, rel: pick || 'unknown' };
		} );
		if ( specCounted && controls.some( ( c ) => c.members && c.members.some( ( cm ) =>
			chainBeatsChain( cm, chain ) && 'same' === relateElements( lastCompound( cm ), chain, model )
		) ) ) {
			// A resolved control on the declaring element itself that strictly outranks
			// the literal ((0,2,0) against (0,1,0)) wins whatever ancestors or
			// unplaceable controls elsewhere do. A tie is decided by source order, so
			// it falls through to the ordinary resolution below.
			sawSame = true;
			continue;
		}
		const above = rels.filter( ( r ) => 'control-above' === r.rel ).map( ( r ) => r.c );
		if ( above.length ) {
			return {
				cls:   'CLASS-2',
				attrs: attrsOf( above ),
				note:  `a descendant of the element ${ attrsOf( above ) } paints (${ above[ 0 ].source }); a direct declaration beats the inherited value`,
			};
		}
		const unresolved = rels.filter( ( r ) => 'unknown' === r.rel ).map( ( r ) => r.c );
		if ( unresolved.length || wildcard ) {
			worst = worst || {
				cls:   'CANNOT-RESOLVE',
				attrs: attrsOf( unresolved.length ? unresolved : controls ),
				note:  unresolved.some( ( c ) => ! c.members )
					? 'a control selector in the PHP could not be resolved to a class'
					: ( wildcard ? 'a helper call has an unresolvable prefix' : 'the element relationship could not be established from the markup' ),
			};
			continue;
		}
		if ( rels.some( ( r ) => 'same' === r.rel ) ) {
			sawSame = true;
			continue;
		}
		const { leaks, unknown } = findLeakTargets( chain, prop, model, declLog );
		if ( unknown ) {
			worst = worst || { cls: 'CANNOT-RESOLVE', attrs: attrsOf( controls ), note: 'the declaring class is not found in the block markup' };
			continue;
		}
		if ( leaks.length ) {
			const noControl = [ ...new Set( leaks.filter( ( l ) => ! l.hasControl ).map( ( l ) => l.cls ) ) ];
			const withControl = [ ...new Set( leaks.filter( ( l ) => l.hasControl ).map( ( l ) => l.cls ) ) ];
			return {
				cls:   'CLASS-3',
				attrs: attrsOf( controls ),
				note:  'leaks into ' + [
					noControl.length ? `${ noControl.join( ', ' ) } (no ${ prop } control: permanent)` : '',
					withControl.length ? `${ withControl.join( ', ' ) } (has a control: default state only)` : '',
				].filter( Boolean ).join( '; ' ),
			};
		}
	}
	if ( worst ) {
		return worst;
	}
	return sawSame ? { cls: 'CLASS-1', attrs: attrsOf( controls ), note: 'same element as the control' } : null;
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
 * @param {Object|null} model    E14: element model (controls, markup) or null.
 * @param {Set|null}  e9Props    E9: properties the legacy attr-name path leaves to
 *                               the E14 classifier (blocks with selectors.typography).
 */
/**
 * Index just after the bracket that closes the one opening at src[ open ]
 * (`(` or `{`), skipping quoted strings. -1 when it never closes.
 */
function matchBracket( src, open ) {
	const pair  = { '(': ')', '{': '}' };
	const close = pair[ src[ open ] ];
	let depth   = 0;
	for ( let i = open; i < src.length; i++ ) {
		const c = src[ i ];
		if ( '"' === c || "'" === c ) {
			i = skipQuoted( src, i ) - 1;
		} else if ( c === src[ open ] ) {
			depth++;
		} else if ( c === close && 0 === --depth ) {
			return i + 1;
		}
	}
	return -1;
}

/**
 * Named PHP function bodies in `src` (comments already masked):
 * [{ name, start, end }] where start..end spans the body braces. A function
 * without a body (abstract, interface) is skipped.
 */
function phpFunctionBodies( src ) {
	const out = [];
	const re  = /\bfunction\s+&?\s*([A-Za-z_]\w*)\s*\(/g;
	let m;
	while ( ( m = re.exec( src ) ) !== null ) {
		const paramsEnd = matchBracket( src, m.index + m[ 0 ].length - 1 );
		if ( -1 === paramsEnd ) {
			continue;
		}
		const brace = src.slice( paramsEnd ).search( /[{;]/ );
		if ( -1 === brace || ';' === src[ paramsEnd + brace ] ) {
			continue;
		}
		const start = paramsEnd + brace;
		const end   = matchBracket( src, start );
		if ( -1 !== end ) {
			out.push( { name: m[ 1 ].toLowerCase(), start, end } );
			re.lastIndex = end;
		}
	}
	return out;
}

/**
 * Lower-cased names `src` calls (`name(`, `->name(`, `::name(`) or quotes whole
 * as a callback. A quoted callback must hold an underscore (a prefixed name such
 * as 'sgs_x'): a generic quoted word ('style', 'value') is data, not a reach.
 */
function phpNamesReferenced( src ) {
	const names = new Set();
	for ( const m of src.matchAll( /(?<!\bfunction\s+&?\s*)\b([A-Za-z_]\w*)\s*\(/g ) ) {
		names.add( m[ 1 ].toLowerCase() );
	}
	for ( const m of src.matchAll( /['"]([A-Za-z]\w*_\w+)['"]/g ) ) {
		names.add( m[ 1 ].toLowerCase() );
	}
	return names;
}

/**
 * Custom properties the block WRITES from a control: an assignment (`--x:` or
 * `'--x' =>`) or a whole quoted `'--x'` string (a property map entry handed to
 * an emitter) in the block's own PHP and JS, or in PHP its files reach by
 * `require`. Unlike the element model (readBlockPhpFiles, one hop), the writer
 * set follows requires transitively: a writer is often a helper several hops
 * down (nav-drawer-menu's render.php reaches the file that writes
 * --sgs-ndm-orn-size three hops out), and a write cannot pollute the element
 * model. In a required file, top-level code counts (it runs on require), but a
 * write inside a named function counts only when the block can reach that
 * function: called or named as a callback by the block's own PHP, or by
 * top-level code or a reachable function in the required files. Otherwise every
 * block that requires render-helpers.php would hold the whole helper tree's
 * writes. A `'var(--x)'` string is a read, and a stylesheet is never searched:
 * a property defined only in CSS is a default, not a control channel.
 */
function collectWrittenCustomProps( blockDir ) {
	const written = new Set();
	const files   = readBlockPhpFiles( blockDir );
	const seen    = new Set( files.map( ( f ) => path.resolve( f.file ) ) );
	for ( let i = 0; i < files.length; i++ ) {
		for ( const m of files[ i ].src.matchAll( /(?<![\w$>:])require(?:_once)?\b\s*([^;]+);/g ) ) {
			const target = resolveRequirePath( m[ 1 ], files[ i ].file );
			if ( ! target || seen.has( target ) ) {
				continue;
			}
			seen.add( target );
			try {
				files.push( { file: target, src: maskPhpComments( fs.readFileSync( target, 'utf8' ) ) } );
			} catch ( err ) {
				// Missing or unreadable target: skip it, the gate never fails on a require.
			}
		}
	}
	const ownDir    = path.resolve( blockDir ) + path.sep;
	const sources   = [];
	const functions = new Map(); // name → [ body source ] in required files
	const reachable = new Set();
	const queue     = [];
	const reach     = ( names ) => {
		for ( const n of names ) {
			if ( ! reachable.has( n ) ) {
				reachable.add( n );
				queue.push( n );
			}
		}
	};
	for ( const f of files ) {
		if ( path.resolve( f.file ).startsWith( ownDir ) ) {
			sources.push( f.src );
			reach( phpNamesReferenced( f.src ) );
			continue;
		}
		let top  = '';
		let from = 0;
		for ( const b of phpFunctionBodies( f.src ) ) {
			top += f.src.slice( from, b.start );
			from = b.end;
			functions.set( b.name, [ ...( functions.get( b.name ) || [] ), f.src.slice( b.start, b.end ) ] );
		}
		top += f.src.slice( from );
		sources.push( top );
		reach( phpNamesReferenced( top ) );
	}
	while ( queue.length ) {
		for ( const body of functions.get( queue.shift() ) || [] ) {
			sources.push( body );
			reach( phpNamesReferenced( body ) );
		}
	}
	const walkJs  = ( dir ) => {
		for ( const e of fs.readdirSync( dir, { withFileTypes: true } ) ) {
			const p = path.join( dir, e.name );
			if ( e.isDirectory() && 'node_modules' !== e.name && 'build' !== e.name ) {
				walkJs( p );
			} else if ( e.isFile() && /\.js$/i.test( e.name ) && ! /\.test\.js$/i.test( e.name ) ) {
				sources.push( maskJsComments( fs.readFileSync( p, 'utf8' ) ) );
			}
		}
	};
	walkJs( blockDir );
	for ( const s of sources ) {
		for ( const m of s.matchAll( /(--[A-Za-z0-9_-]+)\s*['"]?\s*(?::|=>)/g ) ) {
			written.add( m[ 1 ] );
		}
		// A quoted name handed to a reader (getPropertyValue / removeProperty)
		// is a read, not a write.
		for ( const m of s.matchAll( /(?<!(?:getPropertyValue|removeProperty)\(\s*)['"](--[A-Za-z0-9_-]+)['"]/g ) ) {
			written.add( m[ 1 ] );
		}
	}
	return written;
}

/**
 * Blank JS `//` and `/* *\/` comments in one left-to-right pass that skips
 * string and template literals, so a `//` inside a string is kept and a `/*`
 * inside a `//` comment opens nothing. Line breaks are kept.
 */
function maskJsComments( src ) {
	let out   = '';
	let quote = '';
	for ( let i = 0; i < src.length; i++ ) {
		const c = src[ i ];
		if ( quote ) {
			out += c;
			if ( '\\' === c && i + 1 < src.length ) {
				out += src[ ++i ];
			} else if ( c === quote ) {
				quote = '';
			}
		} else if ( '"' === c || "'" === c || '`' === c ) {
			quote = c;
			out  += c;
		} else if ( '/' === c && '/' === src[ i + 1 ] ) {
			while ( i < src.length && '\n' !== src[ i ] ) {
				out += ' ';
				i++;
			}
			out += i < src.length ? '\n' : '';
		} else if ( '/' === c && '*' === src[ i + 1 ] ) {
			const end = src.indexOf( '*/', i + 2 );
			const stop = -1 === end ? src.length : end + 2;
			out += src.slice( i, stop ).replace( /[^\n]/g, ' ' );
			i = stop - 1;
		} else {
			out += c;
		}
	}
	return out;
}

/**
 * E14 var() admission: a var() value holds an element exactly as a literal does
 * unless the block writes one of the custom properties it reads. A preset token
 * (`--wp--preset--*`) is never written by a block, so it always counts.
 */
function isUnwrittenVarValue( value, writtenProps ) {
	const props = [ ...value.matchAll( /var\(\s*(--[A-Za-z0-9_-]+)/g ) ].map( ( m ) => m[ 1 ] );
	return props.length > 0 && ! props.some( ( p ) => writtenProps.has( p ) );
}

function scanCssDeclarations( src, targetProps, attrNames, cssToAttrs, helperGov, usesWrapper, model, e9Props, writtenProps = new Set() ) {
	const findings = [];
	const lines    = src.split( '\n' );
	// E14: every default-state declaration of an inherited property (any value),
	// so a sub-element's OWN declaration can be told apart from one it inherits.
	const declLog    = [];
	const candidates = [];
	const legacyForAudit = [];

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
		} else if ( closes > 0 ) {
			// Text before a `}` is never selector text; only what follows the last
			// `}` on the line can start the next selector.
			pendingSelector = line.slice( line.lastIndexOf( '}' ) + 1 ).trim();
		} else if ( line.replace( /"[^"]*"|'[^']*'/g, '' ).includes( ';' ) ) {
			// A `;` outside quotes ends a declaration or statement, including the
			// closing line of a value split over several lines (`linear-gradient(`
			// … `);`) and an `@import …;`, whose text would otherwise read as
			// selector text. A `;` inside an attribute selector's quotes does not.
			pendingSelector = '';
		} else if ( ! /^\s*[\w-]+\s*:/.test( line ) ) {
			// No braces → could be a continuation of a multi-line selector.
			// Only accumulate if it looks like a selector (no `:` followed by value).
			pendingSelector += ' ' + line.trim();
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
		if ( inKeyframes ) {
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

		// E14: log the declaration (any value, :where included) before the
		// :where / target-property filters below.
		if ( INHERITED_PROPS.has( property ) ) {
			declLog.push( { property, selector: currentSelector } );
		}

		// :where( ... ) declarations are low-specificity defaults — never a finding.
		if ( inWhere ) {
			continue;
		}

		// E9 (narrowed): on a selectors.typography block the legacy attr-name path
		// still leaves the WP-native typography properties alone; the E14
		// classifier below decides them by element identity instead.
		const legacyEligible = targetProps.has( property ) && ! ( e9Props && e9Props.has( property ) );
		const modelEligible  = !! ( model && model.props.has( property ) && INHERITED_PROPS.has( property ) );
		if ( ! legacyEligible && ! modelEligible ) {
			continue;
		}

		// E5: capture the full value (may span multiple lines).
		const colonPos = line.indexOf( ':' );
		const rawValue = captureFullValue( lines, i, colonPos );

		if ( ! isLiteralConstant( rawValue, property ) ) {
			if ( modelEligible && CSS_VAR_RE.test( rawValue ) && isUnwrittenVarValue( rawValue, writtenProps ) ) {
				candidates.push( { line: lineNum, property, value: rawValue, selector: currentSelector } );
			}
			continue;
		}

		// E7: WCAG touch-target exemption — 44px / 48px on dimension properties.
		if ( TOUCH_TARGET_SIZES.has( rawValue ) && TOUCH_TARGET_PROPS.has( property ) ) {
			continue;
		}

		// ── Per-attr checks (E1, E6) for every attr that maps to this property ──
		const owningAttrs = legacyEligible ? cssToAttrs.get( property ) : null;

		// Extract BEM sub-element tokens from the current selector (for E1/E6).
		const bemElements = extractBemElements( currentSelector );

		// Check whether ALL owning attrs are exempt for this selector.
		// If at least one owning attr is NOT exempt, the finding stands.
		const nonExemptAttrs = [];
		for ( const attrName of ( owningAttrs || [] ) ) {
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

			// E13: wrapper-root layout attr (gridTemplateColumns/gap) hardcoded on a
			// non-root selector — the wrapper applies it to the ROOT, not here.
			if ( isWrapperRootAttrMismatch( attrName, property, currentSelector, usesWrapper ) ) {
				continue; // this attr is exempt for this selector
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
			// Every owning attr is exempt by the legacy name heuristics (E1/E9/E11).
			// E14 narrows that: for an INHERITED property that has a control emitted
			// elsewhere, element identity decides, not the attr name.
			if ( modelEligible ) {
				candidates.push( { line: lineNum, property, value: rawValue, selector: currentSelector } );
			}
			continue;
		}

		const legacyFinding = {
			line:     lineNum,
			property,
			value:    rawValue,
			selector: currentSelector,
			attrs:    nonExemptAttrs,
		};
		findings.push( legacyFinding );
		if ( modelEligible ) {
			legacyForAudit.push( legacyFinding );
		}
	}

	// E14 (information only): what element identity says about each legacy
	// finding. It never changes whether the finding is reported; it lets the
	// triage see which legacy findings are really CLASS 1 (same element).
	for ( const f of legacyForAudit ) {
		const verdict = classifyInheritedHardcode( f, model, declLog );
		f.e14Class = verdict ? verdict.cls : null;
	}

	// E14: classify the deferred candidates once every declaration is logged.
	for ( const cand of candidates ) {
		const verdict = classifyInheritedHardcode( cand, model, declLog );
		if ( ! verdict ) {
			continue;
		}
		if ( 'CLASS-1' === verdict.cls ) {
			ELEMENT_MODEL_STATS.class1.push( {
				block:    model.block,
				property: cand.property,
				value:    cand.value,
				selector: cand.selector,
				attrs:    verdict.attrs,
			} );
			continue;
		}
		findings.push( {
			line:     cand.line,
			property: cand.property,
			value:    cand.value,
			selector: cand.selector,
			attrs:    [ verdict.attrs || '-' ],
			cls:      verdict.cls,
			note:     verdict.note,
		} );
	}
	findings.sort( ( a, b ) => a.line - b.line );

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

	const blockJsonRaw = fs.readFileSync( blockJsonPath, 'utf8' );

	let meta;
	try {
		meta = JSON.parse( blockJsonRaw );
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

	// ── E14: element model — where each inherited-property control really paints ──
	const elementModel = buildElementModel( blockDir, meta, new Set( attrs ), hasSelectorsTypography );
	if ( elementModel ) {
		elementModel.block = blockName;
	}

	if ( cssToAttrs.size === 0 && ! elementModel ) {
		return []; // no layout-related attrs → nothing to check
	}

	// ── E9 (narrowed): selectors.typography no longer removes the WP-native
	// typography props from the whole block. The legacy attr-name path still
	// leaves them alone (e9Props, applied per declaration in scanCssDeclarations);
	// the E14 classifier decides them by element identity, with the
	// selectors.typography target as a control. ─────────────────────────────────
	const targetProps = new Set( cssToAttrs.keys() );
	const e9Props     = hasSelectorsTypography ? WP_NATIVE_TYPOGRAPHY_PROPS : null;

	if ( targetProps.size === 0 && ! elementModel ) {
		return [];
	}

	const violations  = [];

	// ── F3b: block.json literal `default` that flattens a theme.json
	// per-element (tag-switching) scale — see checkBlockJsonDefaults(). ──────
	for ( const f of checkBlockJsonDefaults( meta, blockJsonRaw, hasSelectorsTypography ) ) {
		violations.push( {
			block:    blockName,
			file:     path.relative( ROOT, blockJsonPath ),
			line:     f.line,
			property: f.property,
			value:    f.value,
			attr:     f.attr,
		} );
	}

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

	if ( effectiveTargetProps.size === 0 && ! elementModel ) {
		return [];
	}

	// ── E11: prefixed-helper selector governance (attr → governed tokens) ────
	const helperGov = collectHelperGovernance( renderPhpSrc );

	// E13: does this block delegate its outer wrapper to SGS_Container_Wrapper?
	// If so, gridTemplateColumns/gap are applied to the ROOT, not sub-elements.
	const usesWrapper = /SGS_Container_Wrapper/.test( renderPhpSrc );

	// --- style.css ---------------------------------------------------------
	const styleCssPath = path.join( blockDir, 'style.css' );
	if ( fs.existsSync( styleCssPath ) ) {
		const cssFindings = scanCssDeclarations(
			stripComments( readIfExists( styleCssPath ) ),
			effectiveTargetProps,
			attrs,
			cssToAttrs,
			helperGov,
			usesWrapper,
			elementModel,
			e9Props,
			elementModel ? collectWrittenCustomProps( blockDir ) : new Set()
		);
		for ( const f of cssFindings ) {
			const owningAttrs = f.attrs.join( ', ' );
			const violation   = {
				block:    blockName,
				file:     path.relative( ROOT, styleCssPath ),
				line:     f.line,
				property: f.property,
				value:    f.value,
				attr:     owningAttrs,
			};
			if ( f.e14Class ) {
				violation.e14Class = f.e14Class; // information only; not part of the baseline key
			}
			if ( f.cls ) {
				// E14 findings carry their class, the declaring selector and why.
				violation.class    = f.cls;
				violation.selector = f.selector;
				violation.note     = f.note;
			}
			violations.push( violation );
		}
	}

	// --- render.php — inline style attributes ------------------------------
	if ( fs.existsSync( renderPhpPath ) ) {
		// The inline-style scan keeps E9's block-wide exemption: element identity
		// is an E14 concern for style.css, which has selectors to compare.
		const phpFindings = scanPhpInlineStyles(
			renderPhpSrc,
			new Set( [ ...effectiveTargetProps ].filter( ( p ) => ! ( e9Props && e9Props.has( p ) ) ) )
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
	//
	// The path is normalised to `/` on every call, and the baseline entries go
	// through this same function, so a baseline written on Windows
	// (`src\blocks\...`) matches on a POSIX runner and the reverse.
	//
	// An E14 finding (CLASS 2 / CLASS 3 / CANNOT-RESOLVE) also keys on its class
	// and declaring selector: two sub-elements hardcoding the same value in one
	// file are distinct defects and must not share one baseline slot. Legacy
	// findings carry no class, so their keys are unchanged.
	const file = String( f.file ).replace( /\\/g, '/' );
	const base = `${ f.block }:${ file }:${ f.property }:${ f.value }`;
	return f.class ? `${ base }:${ f.class }:${ f.selector }` : base;
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
// SELF-TEST — E12 element-scoping (Part A + Part B, this pass)
//
// Mirrors the house `--self-test` convention (see
// scripts/surveys/lib/wrapper-capability-selftest.js /
// scripts/surveys/survey-experimental-imports.js): every rule carries a
// NEGATIVE control (the exact false positive an earlier, reverted version of
// this gate actually produced) alongside a POSITIVE control (proof the gate
// still catches a real same-element hardcode once scoping is added — a
// positive control with no matching negative can't tell "working" apart from
// "always returns nothing").
//
// Runs against synthetic block.json fixtures (NOT the real block.json files)
// so the assertions pin the GATE's logic, not today's manifest content —
// but reads the REAL theme.json (via the already-memoized
// getAllElementKeys()/getElementPropertyValues()) because the per-h-tag
// font-size/font-weight divergence those fixtures rely on IS the theme.json
// contract E12 exists to protect; faking that too would test nothing.
// ---------------------------------------------------------------------------

function selfTestE12() {
	process.stdout.write( '[check-hardcoded-render-defaults --self-test] E12 element-scoping\n\n' );

	let checks   = 0;
	let failures = 0;
	function assert( label, actual, expected ) {
		checks++;
		if ( JSON.stringify( actual ) === JSON.stringify( expected ) ) {
			process.stdout.write( `  PASS  ${ label }\n` );
		} else {
			failures++;
			process.stdout.write(
				`  FAIL  ${ label }\n        expected ${ JSON.stringify( expected ) }\n        actual   ${ JSON.stringify( actual ) }\n`
			);
		}
	}

	const allElementKeys        = getAllElementKeys();
	const elementPropertyValues = getElementPropertyValues();
	if ( allElementKeys.size === 0 || elementPropertyValues.size === 0 ) {
		process.stdout.write( '  SKIP — theme.json unavailable, cannot exercise E12 (treat as a self-test failure, not a pass)\n' );
		process.exit( 1 );
	}

	// CASE 1 — NEGATIVE CONTROL: sgs/icon-list's original reverted false
	// positive. `iconColour` (the "item-icon" element, per-item marker) must
	// NOT be flagged against `headingLevel` (the "heading" element) — they
	// resolve to different elements via the `{prefix}{PascalCase}`
	// convention, exactly as the real icon-list block.json does today.
	{
		const meta = {
			attributes: {
				headingLevel: { type: 'string', enum: [ 'h2', 'h3', 'h4', 'h5', 'h6', 'p' ], default: 'h3' },
				iconColour:   { type: 'string', default: '#ff0000' },
			},
			supports: { sgs: { elements: {
				heading:       { prefix: 'heading' },
				'item-icon':   { prefix: 'icon' },
			} } },
		};
		const findings = checkBlockJsonDefaults( meta, JSON.stringify( meta, null, 2 ), false );
		assert(
			'icon-list.iconColour is NOT flagged against headingLevel (different elements: item-icon vs heading)',
			findings.some( ( f ) => f.attr.startsWith( 'iconColour' ) ),
			false
		);
	}

	// CASE 2 — NEGATIVE CONTROL: sgs/product-card's original reverted false
	// positive. `ctaFontWeight` (the "cta" element) must NOT be flagged
	// against `headingLevel` (the "title" element).
	{
		const meta = {
			attributes: {
				headingLevel:  { type: 'string', enum: [ 'h2', 'h3', 'h4', 'p' ], default: 'h3' },
				ctaFontWeight: { type: 'string', default: '600' },
			},
			supports: { sgs: { elements: {
				title: { prefix: 'title', attrMap: { tag: 'headingLevel' } },
				cta:   { prefix: 'cta' },
			} } },
		};
		const findings = checkBlockJsonDefaults( meta, JSON.stringify( meta, null, 2 ), false );
		assert(
			'product-card.ctaFontWeight is NOT flagged against headingLevel (different elements: cta vs title)',
			findings.some( ( f ) => f.attr.startsWith( 'ctaFontWeight' ) ),
			false
		);
	}

	// CASE 3 — POSITIVE CONTROL (synthetic): a genuine SAME-element hardcode
	// must still be caught. No block among the current 11 heading-level-enum
	// blocks happens to ship a literal font-weight default mapped onto the
	// SAME element as its own headingLevel today (that's exactly why this is
	// a synthetic fixture rather than a real-block citation — see the task
	// report for the honest "no live positive exists yet" finding). This
	// proves the gate still FIRES once an enum attr and a candidate attr
	// resolve to the same element, so PART B isn't silently refusing every
	// case out of over-caution.
	{
		const meta = {
			attributes: {
				headingLevel:    { type: 'string', enum: [ 'h2', 'h3', 'h4', 'h5', 'h6', 'p' ], default: 'h3' },
				titleFontWeight: { type: 'string', default: '700' },
			},
			supports: { sgs: { elements: {
				title: { prefix: 'title', attrMap: { tag: 'headingLevel' } },
			} } },
		};
		const findings = checkBlockJsonDefaults( meta, JSON.stringify( meta, null, 2 ), false );
		assert(
			'a genuine same-element hardcode (synthetic titleFontWeight vs headingLevel, both element=title) IS still flagged',
			findings.some( ( f ) => f.attr.startsWith( 'titleFontWeight' ) ),
			true
		);
	}

	// CASE 4 — supporting unit check on resolveAttrElement() directly: a
	// single-element block (mirrors sgs/heading, sgs/product-faq) resolves
	// ANY attribute to its one element — this is why sgs/heading, already
	// evaluated by E12 before this pass, keeps working unchanged.
	{
		const elements = { box: { isWrapper: true } };
		assert(
			'single-element block resolves an unmapped attribute to its one element',
			resolveAttrElement( 'anythingAtAll', elements ),
			'box'
		);
	}

	// CASE 5 — an attribute that resolves to NO element (incomplete manifest)
	// must REFUSE rather than guess — resolveAttrElement() returns null, not
	// a fallback element.
	{
		const elements = {
			title: { prefix: 'title' },
			cta:   { prefix: 'cta' },
		};
		assert(
			'an attribute matching no element and no attrMap resolves to null (refuse, not guess)',
			resolveAttrElement( 'somethingUnrelated', elements ),
			null
		);
	}

	selfTestE14( assert );
	selfTestRequireHop( assert );
	selfTestParamBinding( assert );
	selfTestMarkupSplice( assert );

	process.stdout.write( `\n${ checks - failures }/${ checks } checks passed\n` );
	process.exit( failures > 0 ? 1 : 0 );
}

/**
 * Write a synthetic one-block tree (block.json, render.php, style.css) into a
 * fresh temp directory named `x` (so the block slug is `x`) and run the real
 * checkBlock() over it. `extraFiles` ({ name: contents }) adds files beside them
 * (edit.js, view.js). `siblings` ({ slug: { attributes, renderPhp } }) writes
 * further blocks beside `x`, for a template child the parent places. The tree is
 * removed afterwards.
 */
function runE14Fixture( attributes, renderPhp, styleCss, extraFiles = {}, siblings = {} ) {
	const tmp      = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-e14-selftest-' ) );
	const blockDir = path.join( tmp, 'x' );
	try {
		fs.mkdirSync( blockDir );
		const attrs = {};
		for ( const entry of attributes ) {
			// A name, or [ name, type ] for a non-string attribute.
			const [ name, type ] = Array.isArray( entry ) ? entry : [ entry, 'string' ];
			attrs[ name ] = { type };
		}
		fs.writeFileSync( path.join( blockDir, 'block.json' ), JSON.stringify( { name: 'sgs/x', attributes: attrs } ), 'utf8' );
		fs.writeFileSync( path.join( blockDir, 'render.php' ), renderPhp, 'utf8' );
		fs.writeFileSync( path.join( blockDir, 'style.css' ), styleCss, 'utf8' );
		for ( const [ name, body ] of Object.entries( extraFiles ) ) {
			fs.writeFileSync( path.join( blockDir, name ), body, 'utf8' );
		}
		for ( const [ slug, sib ] of Object.entries( siblings ) ) {
			const sibDir   = path.join( tmp, slug );
			const sibAttrs = {};
			for ( const name of sib.attributes ) {
				sibAttrs[ name ] = { type: 'string' };
			}
			fs.mkdirSync( sibDir );
			fs.writeFileSync( path.join( sibDir, 'block.json' ), JSON.stringify( { name: `sgs/${ slug }`, attributes: sibAttrs } ), 'utf8' );
			fs.writeFileSync( path.join( sibDir, 'render.php' ), sib.renderPhp, 'utf8' );
		}
		ELEMENT_MODEL_STATS.class1.length = 0;
		const findings = checkBlock( blockDir );
		return { findings, class1: ELEMENT_MODEL_STATS.class1.slice() };
	} finally {
		fs.rmSync( tmp, { recursive: true, force: true } );
	}
}

/** Shared PHP head for the E14 fixtures: a per-instance class and the root selector. */
const E14_FIXTURE_PHP_HEAD =
	"<?php\n$uid = 'sgs-x-' . wp_unique_id();\n$root_sel = '.' . $uid . '.wp-block-sgs-x';\n$css = '';\n";

/** The fixtures' root element: carries the per-instance class and the block's own class. */
const E14_FIXTURE_ROOT_OPEN =
	"?>\n<div <?php echo get_block_wrapper_attributes( array( 'class' => $uid . ' sgs-x' ) ); ?>>\n";

// ---------------------------------------------------------------------------
// SELF-TEST — E14 element identity (cases 6 to 10)
//
// Every fixture is synthetic, written to a temp directory and scanned by the
// real checkBlock(), so the cases pin the classifier's contract (see the
// "E14 — ELEMENT IDENTITY" header above) and not the content of any real block.
// Each positive case has a negative twin: a detector that flags a legitimate
// overridable default is worse than none.
// ---------------------------------------------------------------------------

function selfTestE14( assert ) {
	process.stdout.write( '\n[check-hardcoded-render-defaults --self-test] E14 element identity\n\n' );
	const lineHeightOnHeader = ( r ) => r.findings.filter( ( f ) => 'line-height' === f.property && '.sgs-x-item__header' === f.selector );

	// CASE 6 — CLASS 2 positive: line-height is hardcoded on a sub-element while
	// its control is emitted onto the block root. The control can never reach it.
	{
		const r = runE14Fixture(
			[ 'lineHeight' ],
			E14_FIXTURE_PHP_HEAD +
				"$css .= sgs_typography_css_rule( $attributes, '', $root_sel );\n" +
				E14_FIXTURE_ROOT_OPEN +
				'<div class="sgs-x-item"><div class="sgs-x-item__header">Title</div></div>\n</div>\n',
			'.sgs-x-item__header {\n\tline-height: 1.4;\n}\n'
		);
		assert(
			'CLASS 2: line-height hardcoded on .sgs-x-item__header while the control paints the root IS reported as CLASS-2',
			lineHeightOnHeader( r ).map( ( f ) => f.class ),
			[ 'CLASS-2' ]
		);
	}

	// CASE 7 — CLASS 3 positive: a font-weight on a shared wrapper class that is
	// an ancestor of a text sub-element with no font-weight control or declaration.
	{
		const r = runE14Fixture(
			[ 'labelFontWeight' ],
			E14_FIXTURE_PHP_HEAD +
				"$css .= sgs_typography_css_rule( $attributes, 'label', \"{$root_sel} .sgs-x__label\" );\n" +
				E14_FIXTURE_ROOT_OPEN +
				'<span class="sgs-x__label">Label</span>\n' +
				'<div class="sgs-x__btn"><span class="sgs-x__card-title">Card</span></div>\n</div>\n',
			'.sgs-x__btn {\n\tfont-weight: 600;\n}\n.sgs-x__card-title {\n\tfont-size: 1rem;\n}\n'
		);
		const hits = r.findings.filter( ( f ) => 'font-weight' === f.property && '.sgs-x__btn' === f.selector );
		assert(
			'CLASS 3: font-weight on the .sgs-x__btn wrapper leaking into .sgs-x__card-title IS reported as CLASS-3',
			hits.map( ( f ) => f.class ),
			[ 'CLASS-3' ]
		);
	}

	// CASE 8 — CLASS 1 true negative (load-bearing): the hardcode and the control
	// target the SAME element, control at (0,2,0) against a (0,1,0) base rule.
	// It must not be reported, and it must be recorded as CLASS 1 so the silence
	// is the classifier's verdict and not a model that failed to build. The attribute
	// prefix (`heading`) deliberately does not echo the class (`__title`) and the
	// selector is built in a variable, so the legacy name heuristics (E1/E11) exempt
	// the declaration and the verdict is E14's alone.
	{
		const r = runE14Fixture(
			[ 'headingLineHeight' ],
			E14_FIXTURE_PHP_HEAD +
				"$heading_sel = '.' . $uid . ' .sgs-x__title';\n" +
				"$css .= sgs_typography_css_rule( $attributes, 'heading', $heading_sel );\n" +
				E14_FIXTURE_ROOT_OPEN +
				'<h3 class="sgs-x__title">Title</h3>\n</div>\n',
			'.sgs-x__title {\n\tline-height: 1.4;\n}\n'
		);
		assert(
			'CLASS 1: line-height on the SAME element as its (0,2,0) control is NOT reported',
			r.findings.filter( ( f ) => 'line-height' === f.property ).length,
			0
		);
		assert(
			'CLASS 1: that silence is a CLASS 1 verdict (the classifier saw the declaration and the control)',
			r.class1.map( ( c ) => `${ c.selector } ${ c.property }` ),
			[ '.sgs-x__title line-height' ]
		);
	}

	// CASE 9 — non-inherited true negative: gap and padding hardcoded on a
	// sub-element while a control for each paints the root. A non-inherited
	// property cannot leak or be inherited, so neither may be CLASS 2 / CLASS 3.
	// The shipped helpers only emit inherited properties, so a gap and a padding
	// control are registered on the typography helper for this case alone (and
	// removed in `finally`), which makes the INHERITED_PROPS scoping the only
	// thing standing between those declarations and a CLASS-2 report. A line-height
	// declaration in the same fixture proves the model is live.
	{
		const helper = CONTROL_HELPERS.sgs_typography_css_rule;
		const added  = [
			{ base: 'Gap', prop: 'gap', variants: [ '' ] },
			{ base: 'Padding', prop: 'padding', variants: [ '' ] },
		];
		helper.suffixes.push( ...added );
		let r;
		try {
			r = runE14Fixture(
				[ 'lineHeight', 'gap', 'padding' ],
				E14_FIXTURE_PHP_HEAD +
					"$css .= sgs_typography_css_rule( $attributes, '', $root_sel );\n" +
					E14_FIXTURE_ROOT_OPEN +
					'<div class="sgs-x-item"><div class="sgs-x-item__header">Title</div></div>\n</div>\n',
				'.sgs-x-item__header {\n\tline-height: 1.4;\n\tgap: 8px;\n\tpadding: 4px;\n}\n'
			);
		} finally {
			for ( const a of added ) {
				helper.suffixes.splice( helper.suffixes.indexOf( a ), 1 );
			}
		}
		assert(
			'scoping: line-height in the same fixture is still CLASS-2 (the model is live, so the silence below is meaningful)',
			lineHeightOnHeader( r ).map( ( f ) => f.class ),
			[ 'CLASS-2' ]
		);
		assert(
			'scoping: gap and padding on the sub-element are NOT reported as CLASS-2 or CLASS-3',
			r.findings.filter( ( f ) => ( 'gap' === f.property || 'padding' === f.property ) && ( 'CLASS-2' === f.class || 'CLASS-3' === f.class ) ).length,
			0
		);
	}

	// CASE 11 — editor-only classes. A declaration on a class that only edit.js
	// emits can never block a front-end control. The unplaceable control selector
	// and the `.sgs-x__notice` class (in no markup) give CANNOT-RESOLVE without
	// the rule, so the negative is load-bearing.
	{
		const php = E14_FIXTURE_PHP_HEAD +
			"$css .= sgs_typography_css_rule( $attributes, 'heading', sgs_x_unplaceable_selector() );\n" +
			E14_FIXTURE_ROOT_OPEN + '<p class="sgs-x__body">Body</p>\n</div>\n';
		const css        = '.sgs-x__notice {\n\tline-height: 1.4;\n}\n';
		const noticeRows = ( r ) => r.findings.filter( ( f ) => '.sgs-x__notice' === f.selector ).map( ( f ) => f.class );
		const editJs     = 'export default () => <div className="sgs-x__notice">Empty</div>;\n';

		assert(
			'editor-only: a class only edit.js emits is NOT reported',
			noticeRows( runE14Fixture( [ 'headingLineHeight' ], php, css, { 'edit.js': editJs } ) ),
			[]
		);
		assert(
			'editor-only: the same class also built in view.js (a front-end emitter) IS still CANNOT-RESOLVE',
			noticeRows( runE14Fixture( [ 'headingLineHeight' ], php, css, {
				'edit.js': editJs,
				'view.js': "el.className = 'sgs-x__notice';\n",
			} ) ),
			[ 'CANNOT-RESOLVE' ]
		);
		assert(
			'editor-only: a class in no edit.js (no editor evidence) IS still CANNOT-RESOLVE',
			noticeRows( runE14Fixture( [ 'headingLineHeight' ], php, css ) ),
			[ 'CANNOT-RESOLVE' ]
		);
	}

	// CASE 12 — own control wins by resolution order. The heading control is on
	// the declaring element at (0,2,0) against a (0,1,0) literal; a root control
	// above it must not turn that into CLASS 2.
	{
		const head = E14_FIXTURE_PHP_HEAD + "$css .= sgs_typography_css_rule( $attributes, '', $root_sel );\n";
		const body = E14_FIXTURE_ROOT_OPEN + '<h3 class="sgs-x__title">Title</h3>\n</div>\n';
		const run  = ( headingCall, css ) => runE14Fixture( [ 'lineHeight', 'headingLineHeight' ], head + headingCall + body, css );
		const lh   = ( r, sel ) => r.findings.filter( ( f ) => 'line-height' === f.property && sel === f.selector ).map( ( f ) => f.class );
		const ownCall = "$heading_sel = '.' . $uid . ' .sgs-x__title';\n$css .= sgs_typography_css_rule( $attributes, 'heading', $heading_sel );\n";

		const own = run( ownCall, '.sgs-x__title {\n\tline-height: 1.4;\n}\n' );
		assert( 'own control: a resolved (0,2,0) control on the declaring element beats the root control above it (not reported)', lh( own, '.sgs-x__title' ), [] );
		assert( 'own control: that silence is a CLASS 1 verdict', own.class1.map( ( c ) => c.selector ), [ '.sgs-x__title' ] );

		const tie = run( ownCall, '.sgs-x .sgs-x__title {\n\tline-height: 1.4;\n}\n' );
		assert( 'own control: a specificity TIE (0,2,0) vs (0,2,0) is not an early CLASS 1: the root control above still reports CLASS-2', lh( tie, '.sgs-x .sgs-x__title' ), [ 'CLASS-2' ] );

		const unresolved = run(
			"$css .= sgs_typography_css_rule( $attributes, 'heading', sgs_x_unplaceable_selector() );\n",
			'.sgs-x__title {\n\tline-height: 1.4;\n}\n'
		);
		assert( 'own control: an UNRESOLVABLE control selector is not treated as an own control (still CLASS-2)', lh( unresolved, '.sgs-x__title' ), [ 'CLASS-2' ] );
	}

	// CASE 13 — an InnerBlocks child owns its element. The parent's editor
	// template places an sgs/y child with `className: 'sgs-x__headline'`; y paints
	// font-size on its own root at (0,2,0), which beats the (0,1,0) literal. The
	// twin child declares no typography attribute, so the parent's root control
	// above still reports CLASS-2.
	{
		const childPhp = "<?php\n$uid = 'sgs-y-' . wp_unique_id();\n$root_sel = '.' . $uid . '.wp-block-sgs-y';\n$css = '';\n" +
			"$css .= sgs_typography_css_rule( $attributes, '', $root_sel );\n" +
			"?>\n<h2 <?php echo get_block_wrapper_attributes( array( 'class' => $uid . ' sgs-y' ) ); ?>>Title</h2>\n";
		const run = ( childAttrs ) => runE14Fixture(
			[ 'fontSize' ],
			E14_FIXTURE_PHP_HEAD + "$css .= sgs_typography_css_rule( $attributes, '', $root_sel );\n" +
				E14_FIXTURE_ROOT_OPEN + '<?php echo $content; ?>\n</div>\n',
			'.sgs-x__headline {\n\tfont-size: 2rem;\n}\n',
			{ 'edit.js': "const TEMPLATE = [\n\t[ 'sgs/y', { level: 'h2', className: 'sgs-x__headline' } ],\n];\n" },
			{ y: { attributes: childAttrs, renderPhp: childPhp } }
		);
		const fs2 = ( r ) => r.findings.filter( ( f ) => 'font-size' === f.property && '.sgs-x__headline' === f.selector ).map( ( f ) => f.class );
		assert( 'inner-block child: a template child that paints font-size on its own root owns the element (not reported)', fs2( run( [ 'fontSize' ] ) ), [] );
		assert( 'inner-block child: a template child with no font-size control does not (still CLASS-2)', fs2( run( [ 'textColour' ] ) ), [ 'CLASS-2' ] );

		// The child's (0,2,0) root control cannot be shown to beat a declaration
		// whose selector the parser simplifies: a sibling combinator or
		// :not()/:is()/:has() adds specificity the chain does not count, so a
		// tie looks like a win. Those stay reported.
		const runCss = ( css, sel, tmpl = "[ 'sgs/y', { className: 'sgs-x__headline' } ]," ) => runE14Fixture(
			[ 'fontSize' ],
			E14_FIXTURE_PHP_HEAD + "$css .= sgs_typography_css_rule( $attributes, '', $root_sel );\n" +
				E14_FIXTURE_ROOT_OPEN + '<span class="sgs-x__lead"></span><?php echo $content; ?>\n</div>\n',
			css,
			{ 'edit.js': `const TEMPLATE = [\n\t${ tmpl }\n];\n` },
			{ y: { attributes: [ 'fontSize' ], renderPhp: childPhp }, z: { attributes: [ 'textColour' ], renderPhp: childPhp.replace( /sgs-y/g, 'sgs-z' ) } }
		).findings.filter( ( f ) => 'font-size' === f.property && sel === f.selector ).map( ( f ) => f.class );
		assert(
			'inner-block child: a :not() selector tying the child control (0,2,0) is not owned (reported)',
			runCss( '.sgs-x__headline:not(.is-plain) {\n\tfont-size: 2rem;\n}\n', '.sgs-x__headline:not(.is-plain)' ).length,
			1
		);
		assert(
			'inner-block child: a sibling-combinator selector tying the child control (0,2,0) is not owned (reported)',
			runCss( '.sgs-x__lead + .sgs-x__headline {\n\tfont-size: 2rem;\n}\n', '.sgs-x__lead + .sgs-x__headline' ).length,
			1
		);
		assert(
			'inner-block child: a class placed on two template children owns the element only if EVERY child paints it (reported)',
			runCss(
				'.sgs-x__headline {\n\tfont-size: 2rem;\n}\n',
				'.sgs-x__headline',
				"[ 'sgs/y', { className: 'sgs-x__headline' } ],\n\t[ 'sgs/z', { className: 'sgs-x__headline' } ],"
			),
			[ 'CLASS-2' ]
		);
	}

	// CASE 14 — the button helper's LineHeight is a control only for a scalar
	// attribute: sgs_button_element_line_height() rejects a tier object, so a
	// tier-object attribute of that name must not register a control.
	{
		const run = ( attr ) => runE14Fixture(
			[ attr ],
			E14_FIXTURE_PHP_HEAD + "$css .= sgs_button_element_style_css( $attributes, 'cta', \"{$root_sel} .sgs-x__btn\" );\n" +
				E14_FIXTURE_ROOT_OPEN + '<a class="sgs-x__btn">Buy</a>\n</div>\n',
			'.sgs-x__btn {\n\tline-height: 1.4;\n}\n'
		);
		const owned = ( r ) => r.class1.some( ( c ) => '.sgs-x__btn' === c.selector );
		assert( 'button helper: a string ctaLineHeight is a line-height control on its element (CLASS 1)', owned( run( 'ctaLineHeight' ) ), true );
		assert( 'button helper: a tier-object ctaLineHeight is NOT a control', owned( run( [ 'ctaLineHeight', 'object' ] ) ), false );
	}

	// CASE 10 — ratchet: past a ceiling the exit code is 1, at or under it 0.
	// Drives the same evaluateE14Ratchet() / checkExitCode() main() uses, with
	// synthetic ceilings, so the real E14_OPEN_BACKLOG is never touched.
	{
		const ceilings = { 'CLASS-2': 2, 'CLASS-3': 1 };
		const make     = ( cls, n ) => Array.from( { length: n }, () => ( { class: cls } ) );
		const run      = ( findings ) => {
			const { over } = evaluateE14Ratchet( findings, ceilings );
			return checkExitCode( true, 0, over, findings.length, false );
		};
		assert( 'ratchet: one over the CLASS-2 ceiling exits 1', run( make( 'CLASS-2', 3 ) ), 1 );
		assert( 'ratchet: exactly at the ceiling exits 0', run( [ ...make( 'CLASS-2', 2 ), ...make( 'CLASS-3', 1 ) ] ), 0 );
		assert( 'ratchet: under the ceiling exits 0', run( make( 'CLASS-2', 1 ) ), 0 );
		assert( 'ratchet: a category with no ceiling entry is not counted', run( make( 'CLASS-9', 5 ) ), 0 );
		assert( 'ratchet: without --check the exit code is 0 even over the ceiling', checkExitCode( false, 0, [ 'CLASS-2' ], 3, false ), 0 );
	}

	// Selector capture: a declaration value split over several lines (a
	// `linear-gradient(` whose arguments sit one per line) must not leak its
	// continuation lines into the NEXT rule's selector. Without the reset at `;`
	// and `}` the finding below is filed under "135deg, … ); .sgs-x-item__header".
	{
		const r = runE14Fixture(
			[ 'lineHeight' ],
			E14_FIXTURE_PHP_HEAD +
				"$css .= sgs_typography_css_rule( $attributes, '', $root_sel );\n" +
				E14_FIXTURE_ROOT_OPEN +
				'<div class="sgs-x-item"><div class="sgs-x-item__header">Title</div></div>\n</div>\n',
			'.sgs-x-item {\n\tbackground-image: linear-gradient(\n\t\t135deg,\n\t\trgba(245, 208, 80, 0.08) 0%,\n\t\trgba(31, 122, 122, 0.06) 100%\n\t);\n}\n\n' +
				'.sgs-x-item__header {\n\tline-height: 1.4;\n}\n'
		);
		assert(
			'selector capture: a multi-line gradient value does not leak into the next rule\'s selector',
			lineHeightOnHeader( r ).map( ( f ) => f.class ),
			[ 'CLASS-2' ]
		);
	}

	// Selector capture, each reset pinned on its own: a value closed by `)` and
	// a `}` with no `;` (only the `}` reset clears it), an `@import …;` with no
	// brace (only the `;` reset clears it), and a `;` inside an attribute
	// selector's quotes on a continuation line (must NOT clear the earlier members).
	{
		const headerRule = '.sgs-x-item__header {\n\tline-height: 1.4;\n}\n';
		const bySelector = ( css ) => lineHeightOnHeader( runE14Fixture(
			[ 'lineHeight' ],
			E14_FIXTURE_PHP_HEAD +
				"$css .= sgs_typography_css_rule( $attributes, '', $root_sel );\n" +
				E14_FIXTURE_ROOT_OPEN +
				'<div class="sgs-x-item"><div class="sgs-x-item__header">Title</div></div>\n</div>\n',
			css
		) ).map( ( f ) => f.class );
		assert(
			'selector capture: a value closed by `)` then `}` (no `;`) does not leak into the next selector',
			bySelector( '.sgs-x-item {\n\tbackground-image: linear-gradient(\n\t\tred,\n\t\tblue\n\t)\n}\n' + headerRule ),
			[ 'CLASS-2' ]
		);
		assert(
			'selector capture: an @import statement does not leak into the next selector',
			bySelector( '@import url("a.css");\n' + headerRule ),
			[ 'CLASS-2' ]
		);
		const listed = runE14Fixture(
			[ 'lineHeight' ],
			E14_FIXTURE_PHP_HEAD +
				"$css .= sgs_typography_css_rule( $attributes, '', $root_sel );\n" +
				E14_FIXTURE_ROOT_OPEN +
				'<div class="sgs-x-item"><div class="sgs-x-item__header">Title</div></div>\n</div>\n',
			'.sgs-x-item__header,\n.sgs-x-item__a[data-x="a;b"],\n.sgs-x-item__zz {\n\tline-height: 1.4;\n}\n'
		);
		assert(
			'selector capture: a `;` inside an attribute selector\'s quotes keeps the earlier members of the list',
			listed.findings.some( ( f ) => 'line-height' === f.property && f.selector.includes( '.sgs-x-item__header' ) ),
			true
		);
	}

	// var() admission: a preset token on a sub-element holds it against the
	// root's control exactly as a literal does.
	const fontSizeOnHeader = ( r ) => r.findings.filter( ( f ) => 'font-size' === f.property && '.sgs-x-item__header' === f.selector );
	const varFixture = ( php, css ) => runE14Fixture(
		[ 'fontSize' ],
		E14_FIXTURE_PHP_HEAD +
			"$css .= sgs_typography_css_rule( $attributes, '', $root_sel );\n" + php +
			E14_FIXTURE_ROOT_OPEN +
			'<div class="sgs-x-item"><div class="sgs-x-item__header">Title</div></div>\n</div>\n',
		css
	);
	assert(
		'var() admission: a preset token on a sub-element IS reported as CLASS-2',
		fontSizeOnHeader( varFixture( '', '.sgs-x-item__header {\n\tfont-size: var(--wp--preset--font-size--small, 0.875rem);\n}\n' ) ).map( ( f ) => f.class ),
		[ 'CLASS-2' ]
	);
	assert(
		'var() admission: a custom property the block writes from a control is NOT reported',
		fontSizeOnHeader( varFixture(
			"$css .= $root_sel . '{--sgs-x-header-size:' . esc_attr( $attributes['fontSize'] ) . '}';\n",
			'.sgs-x-item__header {\n\tfont-size: var(--sgs-x-header-size, 0.875rem);\n}\n'
		) ).length,
		0
	);
	assert(
		'var() admission: a custom property defined only in the stylesheet IS reported (a default is not a writer)',
		fontSizeOnHeader( varFixture(
			'',
			'.sgs-x {\n\t--sgs-x-header-size: 0.875rem;\n}\n.sgs-x-item__header {\n\tfont-size: var(--sgs-x-header-size, 0.875rem);\n}\n'
		) ).map( ( f ) => f.class ),
		[ 'CLASS-2' ]
	);
}

// ---------------------------------------------------------------------------
// SELF-TEST — readBlockPhpFiles() follows a require exactly ONE hop
//
// The hop must not be transitive: includes/render-helpers.php requires the whole
// helper tree and almost every block requires it, so a transitive follower would
// put every helper's markup into every block's element model. The fixture is a
// plugin-shaped temp tree (includes/ beside blocks/x/) where the block requires
// B and B requires C; both directions are asserted, because a test of the
// positive alone passes identically for a transitive follower.
// ---------------------------------------------------------------------------

function selfTestRequireHop( assert ) {
	process.stdout.write( '\n[check-hardcoded-render-defaults --self-test] require one-hop\n\n' );
	const tmp = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-hop-selftest-' ) );
	try {
		const inc      = path.join( tmp, 'includes' );
		const blockDir = path.join( tmp, 'blocks', 'x' );
		fs.mkdirSync( inc );
		fs.mkdirSync( blockDir, { recursive: true } );
		fs.writeFileSync( path.join( inc, 'b.php' ), "<?php\nrequire_once __DIR__ . '/c.php';\nrequire_once __DIR__ . '/x-part.php';\n?>\n<section class=\"sgs-hop-b\"></section>\n", 'utf8' );
		// Files named for the block (`x-*.php`) are followed at any depth: they are the block's own.
		fs.writeFileSync( path.join( inc, 'x-part.php' ), "<?php\nrequire_once __DIR__ . '/x-deeper.php';\n?>\n<i class=\"sgs-hop-xpart\"></i>\n", 'utf8' );
		fs.writeFileSync( path.join( inc, 'x-deeper.php' ), '<?php ?>\n<u class="sgs-hop-xdeeper"></u>\n', 'utf8' );
		fs.writeFileSync(
			path.join( inc, 'c.php' ),
			"<?php $css = '--sgs-hop-deep:' . $v; $hover = 'var(--sgs-hop-read)';\n" +
				"$map = array( 'css' => '--sgs-hop-map' );\n" +
				"// --sgs-hop-phpcomment: 1;\n" +
				"function sgs_hop_called( $a ) { $w = '--sgs-hop-fn-called:1'; return sgs_hop_chain( $a ); }\n" +
				"function sgs_hop_chain( $a ) { return '--sgs-hop-fn-chain:1'; }\n" +
				"function sgs_hop_callback() { return array( '--sgs-hop-fn-cb' => 1 ); }\n" +
				"function sgs_hop_uncalled() { $s = '}'; $w = '--sgs-hop-fn-uncalled:1'; }\n" +
				"function sgs_hop_html() { ?>\n<p>Don't panic</p>\n<?php $w = '--sgs-hop-fn-html:1'; }\n" +
				"function sgs_hop_heredoc() { $h = <<<HTML\n<p>It's here</p>\nHTML;\n$w = '--sgs-hop-fn-heredoc:1'; }\n" +
				"function style() { return '--sgs-hop-fn-generic:1'; }\n" +
				"?>\n<aside class=\"sgs-hop-c\"></aside>\n",
			'utf8'
		);
		fs.writeFileSync(
			path.join( blockDir, 'edit.js' ),
			"const s = { '--sgs-hop-js': size };\n// --sgs-hop-jscomment: 1\n/* '--sgs-hop-jsblock' */\n" +
				"const v = el.style.getPropertyValue( '--sgs-hop-jsread' );\n" +
				"// the *Tablet/*Mobile siblings\nw[ '--sgs-hop-afterslash' ] = v;\n" +
				"const u = 'a // b'; el.style.setProperty( '--sgs-hop-sameline', 1 );\n/* a later block comment */\n",
			'utf8'
		);
		fs.writeFileSync( path.join( blockDir, 'edit.test.js' ), "const t = { '--sgs-hop-test': 1 };\n", 'utf8' );
		fs.writeFileSync( path.join( blockDir, 'style.css' ), '.sgs-hop-own { --sgs-hop-css: 1rem; }\n', 'utf8' );
		fs.writeFileSync( path.join( inc, 'paren.php' ), '<?php ?>\n<nav class="sgs-hop-paren"></nav>\n', 'utf8' );
		fs.writeFileSync( path.join( inc, 'plain.php' ), '<?php ?>\n<p class="sgs-hop-plain"></p>\n', 'utf8' );
		fs.writeFileSync( path.join( inc, 'commented.php' ), '<?php ?>\n<footer class="sgs-hop-commented"></footer>\n', 'utf8' );
		fs.writeFileSync( path.join( inc, 'notphp.txt' ), '<figure class="sgs-hop-txt"></figure>\n', 'utf8' );
		fs.writeFileSync(
			path.join( blockDir, 'render.php' ),
			'<?php\n' +
				"require_once dirname( __DIR__, 2 ) . '/includes/b.php';\n" +
				"require_once dirname( __DIR__, 2 ) . '/includes/b.php';\n" + // dedupe
				"require_once( dirname( __DIR__, 2 ) . '/includes/paren.php' );\n" +
				"require dirname( __DIR__, 2 ) . '/includes/plain.php';\n" +
				"require_once dirname( __DIR__, 2 ) . '/includes/does-not-exist.php';\n" + // missing: skipped
				"require_once dirname( __DIR__, 2 ) . '/includes/notphp.txt';\n" + // not .php: skipped
				"// require_once dirname( __DIR__, 2 ) . '/includes/commented.php';\n" + // comment: not followed
				"/* require_once dirname( __DIR__, 2 ) . '/includes/commented.php'; */\n" +
				"$css = sgs_hop_called( $attributes );\nadd_filter( 'sgs_hop', 'sgs_hop_callback' );\n$kind = 'style';\n" +
				"?>\n<div class=\"sgs-hop-own\"></div>\n",
			'utf8'
		);
		const files   = readBlockPhpFiles( blockDir );
		const classes = new Set();
		for ( const inst of buildMarkupModel( files, new Set() ) ) {
			for ( const c of inst.classes ) {
				classes.add( c );
			}
		}
		const names = files.map( ( f ) => path.basename( f.file ) ).sort();
		assert( 'one hop: the block\'s own markup is in the model', classes.has( 'sgs-hop-own' ), true );
		assert( 'one hop: markup in B (required by the block) IS in the model (hop 1 followed)', classes.has( 'sgs-hop-b' ), true );
		assert( 'one hop: markup in C (required by B, not by the block) is NOT in the model (hop 2 not followed)', classes.has( 'sgs-hop-c' ), false );
		assert( 'one hop: C is never even read', names.includes( 'c.php' ), false );
		assert( 'block-named files: x-part.php (hop 2) and x-deeper.php (hop 3), both named for the block, are in the model', [ classes.has( 'sgs-hop-xpart' ), classes.has( 'sgs-hop-xdeeper' ) ], [ true, true ] );
		assert( 'require forms: parenthesised require_once and bare require are both followed', [ classes.has( 'sgs-hop-paren' ), classes.has( 'sgs-hop-plain' ) ], [ true, true ] );
		assert( 'require forms: a require inside a // or /* */ comment is not followed', classes.has( 'sgs-hop-commented' ), false );
		assert( 'require forms: a non-.php target is not read', classes.has( 'sgs-hop-txt' ), false );
		assert( 'require forms: a missing target is skipped and a repeated require is read once', names, [ 'b.php', 'paren.php', 'plain.php', 'render.php', 'x-deeper.php', 'x-part.php' ] );
		const written = collectWrittenCustomProps( blockDir );
		assert( 'writer set: a property written two hops out (C) IS written (the writer set is transitive)', written.has( '--sgs-hop-deep' ), true );
		assert( 'writer set: a property written in the block\'s edit.js IS written', written.has( '--sgs-hop-js' ), true );
		assert( 'writer set: a var(--x) string is a read, not a write', written.has( '--sgs-hop-read' ), false );
		assert( 'writer set: a property defined only in the stylesheet is NOT written', written.has( '--sgs-hop-css' ), false );
		assert( 'writer set: a quoted \'--x\' map entry (a name handed to an emitter) IS written', written.has( '--sgs-hop-map' ), true );
		assert( 'writer set: a property in a comment of a required PHP file is NOT written', written.has( '--sgs-hop-phpcomment' ), false );
		assert( 'writer set: a property in a JS // or /* */ comment is NOT written', [ written.has( '--sgs-hop-jscomment' ), written.has( '--sgs-hop-jsblock' ) ], [ false, false ] );
		assert( 'writer set: a name passed to getPropertyValue is a read, NOT a write', written.has( '--sgs-hop-jsread' ), false );
		assert( 'writer set: a *.test.js file is not a writer', written.has( '--sgs-hop-test' ), false );
		assert( 'writer set: a `//` comment holding `/*` does not swallow a later JS writer', written.has( '--sgs-hop-afterslash' ), true );
		assert( 'writer set: `//` inside a JS string does not hide a writer later on the line', written.has( '--sgs-hop-sameline' ), true );
		assert(
			'writer set: a helper function the block calls, one it calls in turn, and one it names as a callback ARE writers',
			[ written.has( '--sgs-hop-fn-called' ), written.has( '--sgs-hop-fn-chain' ), written.has( '--sgs-hop-fn-cb' ) ],
			[ true, true, true ]
		);
		assert( 'writer set: a helper function nothing in the block reaches is NOT a writer (a `}` in a string does not end its body)', written.has( '--sgs-hop-fn-uncalled' ), false );
		assert(
			'writer set: an apostrophe in a function\'s inline HTML or heredoc does not leak an unreached function\'s write',
			[ written.has( '--sgs-hop-fn-html' ), written.has( '--sgs-hop-fn-heredoc' ) ],
			[ false, false ]
		);
		assert( 'writer set: a generic quoted word (\'style\') is not a callback reach for a function of that name', written.has( '--sgs-hop-fn-generic' ), false );
	} finally {
		fs.rmSync( tmp, { recursive: true, force: true } );
	}
}

function selfTestParamBinding( assert ) {
	process.stdout.write( '\n[check-hardcoded-render-defaults --self-test] function parameters bind to call-site literals\n\n' );
	// `at( file, marker )` is the resolver for the position of `marker` in that file.
	const build = ( ...srcs ) => {
		const resolver = buildPhpVarResolver( srcs.map( ( src, i ) => ( { file: `f${ i }.php`, src } ) ) );
		return ( file, marker ) => resolver.scopedAt( file, srcs[ file ].indexOf( marker ) );
	};
	const one = build(
		"function sgs_pb_one( array $a, string $root, $tail = '__x' ) { $s = '.' . $root . $tail; return sgs_pb_pass( $root, 1 ); }\n" +
			"function sgs_pb_pass( string $root, $n ) { return sgs_pb_deep( $root ); }\n" +
			'function sgs_pb_deep( $r ) { return $r; }\n' +
			"$css = sgs_pb_one( $attributes, 'sgs-pb-block' );\n"
	);
	assert( 'param binding: a parameter takes the literal its one caller passes', one( 0, '$s = ' )( 'root' ), 'sgs-pb-block' );
	assert( 'param binding: a parameter the call omits takes its declared default', one( 0, '$s = ' )( 'tail' ), '__x' );
	assert( 'param binding: a local built from parameters resolves in the function\'s own scope', one( 0, 'return sgs_pb_pass' )( 's' ), '.sgs-pb-block__x' );
	assert( 'param binding: a pass-through chain, even under another name, carries the literal down', [ one( 0, 'return sgs_pb_deep' )( 'root' ), one( 0, 'return $r' )( 'r' ) ], [ 'sgs-pb-block', 'sgs-pb-block' ] );
	assert( 'param binding: a parameter bound to a non-literal argument stays unresolved', one( 0, '$s = ' )( 'a' ), UNK );
	const two = build( "function sgs_pb_two( $root ) { return $root; }\n$a = sgs_pb_two( 'sgs-pb-a' );\n$b = sgs_pb_two( 'sgs-pb-b' );\n" );
	assert( 'param binding: two callers passing different literals leave the parameter unresolved', two( 0, 'return $root' )( 'root' ), UNK );
	const none = build( 'function sgs_pb_none( $root ) { return $root; }\n' );
	assert( 'param binding: a function nothing calls leaves its parameter unresolved', none( 0, 'return $root' )( 'root' ), UNK );
	const split = build( "function sgs_pb_split( $root ) { return $root; }\n", "$x = sgs_pb_split( 'sgs-pb-file' );\n" );
	assert( 'param binding: the call may sit in another file of the block\'s set', split( 0, 'return $root' )( 'root' ), 'sgs-pb-file' );
	const share = build(
		"function sgs_pb_a( $root ) { return $root; }\nfunction sgs_pb_b( $root ) { return $root; }\n" +
			"$a = sgs_pb_a( 'sgs-pb-one' );\n$b = sgs_pb_b( 'sgs-pb-two' );\n"
	);
	assert(
		'param binding: two functions sharing a parameter name each keep their own binding',
		[ share( 0, 'return $root' )( 'root' ), share( 0, 'return $root; }\n$a' )( 'root' ) ],
		[ 'sgs-pb-one', 'sgs-pb-two' ]
	);
	const top = build( "function sgs_pb_top( $sel ) { return $sel; }\n$sel = '.sgs-pb-top';\n$x = sgs_pb_top( $sel );\n" );
	assert( 'param binding: a same-named argument from top-level code resolves through the caller\'s own scope', top( 0, 'return $sel' )( 'sel' ), '.sgs-pb-top' );
	const method = build( "function sgs_pb_m( $root ) { return $root; }\n$o->sgs_pb_m( 'sgs-pb-wrong' );\nOther::sgs_pb_m( 'sgs-pb-wrong' );\n$x = sgs_pb_m( 'sgs-pb-right' );\n" );
	assert( 'param binding: a method or static call that shares a function\'s name is not a call site', method( 0, 'return $root' )( 'root' ), 'sgs-pb-right' );
	const methodOnly = build( "function sgs_pb_mo( $root ) { return $root; }\n$o->sgs_pb_mo( 'sgs-pb-wrong' );\n" );
	assert( 'param binding: a function only a same-named method calls stays unresolved', methodOnly( 0, 'return $root' )( 'root' ), UNK );
	const attr = build( "function sgs_pb_at( #[Sensitive] $t, $u ) { return $u; }\n$x = sgs_pb_at( 'sgs-pb-first', 'sgs-pb-second' );\n" );
	assert( 'param binding: a parameter the parser cannot read keeps its slot, so later parameters bind to their own argument', attr( 0, 'return $u' )( 'u' ), 'sgs-pb-second' );
	const reassigned = build( "function sgs_pb_re( $root ) { $root = 'sgs-pb-inner'; return $root; }\n$x = sgs_pb_re( 'sgs-pb-arg' );\n" );
	assert( 'param binding: a parameter the function reassigns reads its own assignment', reassigned( 0, 'return $root' )( 'root' ), 'sgs-pb-inner' );
}

/**
 * Gap 13: markup a function returns is a child of the element its caller puts it
 * in. Every fixture paints `itemLineHeight` onto `.sgs-x__link` and declares
 * `line-height: 1` on `.sgs-x__orn`, an element only `sgs_x_label()` builds. The
 * verdict is CLASS-2 once the model places `.sgs-x__orn` under the link, and
 * CANNOT-RESOLVE while it cannot place it.
 */
function selfTestMarkupSplice( assert ) {
	process.stdout.write( '\n[check-hardcoded-render-defaults --self-test] markup a function returns is placed in its caller\'s element\n\n' );
	const label =
		"<?php\nfunction sgs_x_label() {\n\t$o = '<span class=\"sgs-x__orn' . ( empty( $GLOBALS['sgs_x_swap'] ) ? '' : ' sgs-x__orn--swap' ) . '\" aria-hidden=\"true\">*</span>';\n\treturn $o . '<span class=\"sgs-x__txt\">T</span>';\n}\n";
	const control = "$css .= sgs_typography_css_rule( $attributes, 'item', \"{$root_sel} .sgs-x__link\" );\n";
	const css     = '.sgs-x__orn {\n\tline-height: 1;\n}\n';
	const verdict = ( render, inc ) => {
		const r = runE14Fixture( [ 'itemLineHeight' ], E14_FIXTURE_PHP_HEAD + control + E14_FIXTURE_ROOT_OPEN + render + '</div>\n', css, { 'inc.php': inc } );
		return r.findings.filter( ( f ) => 'line-height' === f.property && '.sgs-x__orn' === f.selector ).map( ( f ) => f.class );
	};

	assert(
		'splice: a call passed to sprintf() lands in the element holding its %N$s slot',
		verdict( "<?php echo sprintf( '<a class=\"sgs-x__link\" href=\"%1$s\">%2$s</a>', '#', sgs_x_label() ); ?>\n", label ),
		[ 'CLASS-2' ]
	);
	assert(
		'splice: a plain %s slot is counted in order',
		verdict( "<?php echo sprintf( '<a class=\"sgs-x__link\" href=\"%s\">%s</a>', '#', sgs_x_label() ); ?>\n", label ),
		[ 'CLASS-2' ]
	);
	assert(
		'splice: a call passed to a wrapper function lands where the wrapper puts its parameter',
		verdict(
			"<?php echo sgs_x_wrap( 'a', sgs_x_label() ); ?>\n",
			label + "function sgs_x_wrap( $li, $inner ) {\n\treturn sprintf( '<li><span class=\"sgs-x__link\">%2$s</span></li>', $li, $inner );\n}\n"
		),
		[ 'CLASS-2' ]
	);
	assert(
		'splice: a variable assigned from the call, copied and concatenated into a literal element',
		verdict(
			"<?php echo sgs_x_row(); ?>\n",
			label + "function sgs_x_row() {\n\t$inner = sgs_x_label() . '';\n\t$copy = $inner;\n\treturn '<summary class=\"sgs-x__link\">' . $copy . '</summary>';\n}\n"
		),
		[ 'CLASS-2' ]
	);
	assert(
		'splice: a function returning the call hands it on to its own caller\'s element',
		verdict(
			"<?php echo sprintf( '<a class=\"sgs-x__link\">%1$s</a>', sgs_x_pass() ); ?>\n",
			label + 'function sgs_x_pass() {\n\treturn sgs_x_label();\n}\n'
		),
		[ 'CLASS-2' ]
	);
	assert(
		'splice: a call whose result lands in no element stays unplaced (negative control)',
		verdict( '<?php echo sgs_x_label(); ?>\n', label ),
		[ 'CANNOT-RESOLVE' ]
	);
	assert(
		'splice: a tag opened in an earlier statement is not the element a later call lands in (negative control: no CLASS-2)',
		verdict( "<?php $a = '<p class=\"sgs-x__link\">'; $b = sgs_x_label(); $c = '</p>'; ?>\n", label ),
		[]
	);
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

/**
 * The E14 ratchet: per-category counts of net-new E14 findings and which
 * categories exceed their ceiling. Pure, so --self-test can drive it with
 * synthetic findings and ceilings without touching E14_OPEN_BACKLOG.
 *
 * @param {Object[]} e14New   Net-new findings that carry an E14 class.
 * @param {Object}   ceilings Category to ceiling (E14_OPEN_BACKLOG in a real run).
 * @return {{counts: Object, over: string[]}}
 */
function evaluateE14Ratchet( e14New, ceilings ) {
	const counts = {};
	for ( const cls of Object.keys( ceilings ) ) {
		counts[ cls ] = e14New.filter( ( f ) => f.class === cls ).length;
	}
	const over = Object.keys( ceilings ).filter( ( cls ) => counts[ cls ] > ceilings[ cls ] );
	return { counts, over };
}

/**
 * The --check exit code. Legacy findings and an exceeded E14 ceiling are
 * blocking; E14 findings within their ceilings block only when E14_BLOCKS_BUILD.
 */
function checkExitCode( check, legacyNewCount, e14Over, e14NewCount, blocksBuild ) {
	return check && ( legacyNewCount || e14Over.length || ( blocksBuild && e14NewCount ) ) ? 1 : 0;
}

/** E14 class of a finding: legacy findings carry none. */
const findingClass = ( f ) => f.class || 'LEGACY';

function countBy( list, keyFn ) {
	const out = new Map();
	for ( const item of list ) {
		const k = keyFn( item );
		out.set( k, ( out.get( k ) || 0 ) + 1 );
	}
	return out;
}

/** --survey: the element-identity counts, resolver coverage and per-block net-new. Never fails. */
function printSurvey( allFindings, netNew, accepted, baselineSize, blockCount, verbose ) {
	const out  = ( line ) => process.stdout.write( line + '\n' );
	const rows = ( map ) => [ ...map.entries() ].sort( ( a, b ) => b[ 1 ] - a[ 1 ] );
	const st   = ELEMENT_MODEL_STATS;
	out( '[check-hardcoded-render-defaults --survey]' );
	out( `Blocks scanned:                     ${ blockCount }` );
	out( `Blocks with a resolvable control:   ${ st.blocksWithControls }` );
	out( `Helper calls found:                 ${ st.helperCalls }` );
	out( `  selector resolved to a class:     ${ st.selectorResolved }` );
	out( `  selector NOT resolved:            ${ st.selectorUnresolved }` );
	out( `  prefix NOT resolved (wildcard):   ${ st.prefixUnresolved }` );
	out( `Baseline entries:                  ${ baselineSize }` );
	out( `All findings:                       ${ allFindings.length }` );
	for ( const [ cls, n ] of rows( countBy( allFindings, findingClass ) ) ) {
		out( `  ${ cls.padEnd( 16 ) } ${ n }` );
	}
	out( `Accepted by the baseline:           ${ accepted.length }` );
	out( `NET-NEW:                            ${ netNew.length }` );
	for ( const [ cls, n ] of rows( countBy( netNew, findingClass ) ) ) {
		out( `  ${ cls.padEnd( 16 ) } ${ n }` );
	}
	out( `Classified CLASS 1 (same element, not a finding): ${ st.class1.length }` );
	const legacyAudit = allFindings.filter( ( f ) => ! f.class && f.e14Class );
	out( `Legacy findings re-classified by element identity:  ${ legacyAudit.length }` );
	for ( const [ cls, n ] of rows( countBy( legacyAudit, ( f ) => f.e14Class ) ) ) {
		out( `  ${ cls.padEnd( 16 ) } ${ n }` );
	}
	out( 'Net-new by block (top 15):' );
	for ( const [ block, n ] of rows( countBy( netNew, ( f ) => f.block ) ).slice( 0, 15 ) ) {
		out( `  ${ block }: ${ n }` );
	}
	if ( verbose ) {
		out( 'CLASS 1 classifications:' );
		for ( const c of st.class1 ) {
			out( `  ${ c.block } | ${ c.selector } { ${ c.property }: ${ c.value } } (controls: ${ c.attrs })` );
		}
		out( 'Legacy findings and their element-identity class:' );
		for ( const f of legacyAudit ) {
			out( `  [${ f.e14Class }] ${ f.block } | ${ f.file } | ${ f.property }: ${ f.value }` );
		}
		out( 'Control selectors that could not be resolved to a class:' );
		const seenUnresolved = new Set();
		for ( const u of st.unresolvedControls ) {
			const line = `  ${ u.block } | ${ u.source } | ${ String( u.selector ).replace( /\u0001/g, '?' ) }`;
			if ( ! seenUnresolved.has( line ) ) {
				seenUnresolved.add( line );
				out( line );
			}
		}
		out( 'Net-new findings:' );
		for ( const f of netNew ) {
			out( `  [${ findingClass( f ) }] ${ f.block } | ${ f.file } | ${ f.selector || '' } { ${ f.property }: ${ f.value } } ${ f.note || '' }` );
		}
	}
}

function main() {
	const args            = process.argv.slice( 2 );
	const check           = args.includes( '--check' );
	const asJson          = args.includes( '--json' );
	const doWriteBaseline = args.includes( '--write-baseline' );
	const survey          = args.includes( '--survey' );

	if ( args.includes( '--self-test' ) ) {
		selfTestE12();
		return;
	}

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

	// --survey: counts only, never fails (exit 0).
	if ( survey ) {
		printSurvey( allFindings, netNew, accepted, baselineKeys.size, blockDirs.length, args.includes( '--verbose' ) );
		return;
	}

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

	// Legacy findings stay BLOCKING exactly as before. E14 findings (CLASS-2,
	// CLASS-3, CANNOT-RESOLVE) are ADVISORY with a per-category ratchet.
	const legacyNew = netNew.filter( ( f ) => ! f.class );
	const e14New    = netNew.filter( ( f ) => f.class );
	const { counts: e14Counts, over: e14Over } = evaluateE14Ratchet( e14New, E14_OPEN_BACKLOG );

	if ( e14New.length ) {
		process.stdout.write(
			`[check-hardcoded-render-defaults] E14 element-identity findings (${ E14_BLOCKS_BUILD ? 'BLOCKING' : 'advisory' }, ratcheted): ` +
			Object.keys( E14_OPEN_BACKLOG ).map( ( c ) => `${ c } ${ e14Counts[ c ] }/${ E14_OPEN_BACKLOG[ c ] }` ).join( ', ' ) +
			'. Run --survey --verbose to list them.\n'
		);
	}
	if ( e14Over.length ) {
		process.stderr.write(
			`[check-hardcoded-render-defaults] E14 ceiling EXCEEDED for ${ e14Over.join( ', ' ) }: a NEW defect of this class was introduced. ` +
			'Fix it; do not raise the ceiling.\n'
		);
		for ( const f of e14New.filter( ( x ) => e14Over.includes( x.class ) ) ) {
			process.stderr.write( `  - [${ f.class }] ${ f.block } | ${ f.file }:${ f.line } | ${ f.selector } { ${ f.property }: ${ f.value } } (${ f.note })\n` );
		}
	}

	if ( legacyNew.length ) {
		process.stderr.write(
			`[check-hardcoded-render-defaults] ${ legacyNew.length } NET-NEW F3 violation(s):\n`
		);
		for ( const f of legacyNew ) {
			process.stderr.write(
				f.class
					? `  - [${ f.class }] ${ f.block } | ${ f.file }:${ f.line } | ${ f.selector } { ${ f.property }: ${ f.value } } ` +
						`(controls: ${ f.attr }; ${ f.note })\n`
					: `  - ${ f.block } | ${ f.file }:${ f.line } | ${ f.property }: ${ f.value } ` +
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
			`[check-hardcoded-render-defaults] OK — 0 net-new legacy F3 violations across ${ blockDirs.length } blocks ` +
			`(${ baselineCount } known debt item(s) in baseline).\n`
		);
	}

	const exitCode = checkExitCode( check, legacyNew.length, e14Over, e14New.length, E14_BLOCKS_BUILD );
	if ( exitCode ) {
		process.exit( exitCode );
	}
}

main();
