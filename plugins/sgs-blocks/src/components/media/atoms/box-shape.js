/**
 * `box-shape` atom — L2b control + disclosure + validator + value-setter.
 *
 * Bean's ruling: box-shape is TWO axes, not one — the sizing MODE
 * (auto / fixed height / aspect ratio, the old sizing panel's 3-way
 * model) plus a NAMED SHAPE (none / rounded / circle / square) that the
 * census's `presentation.gaps` flagged as the missing half. Height and
 * Aspect ratio stay mutually exclusive MODES (registry.js `requires`); Shape
 * is an independent decoration layered on top of whichever box the mode
 * produces.
 *
 * BORDER-RADIUS/WIDTH/STYLE/COLOUR are ADDITIVE writers targeting the MEDIA
 * ELEMENT itself (`.sgs-media-el`), NOT the block WRAPPER's border chrome —
 * `SgsBorderControl` (44 blocks) and native `__experimentalBorder`
 * (`sgs/media`) still own that outright (plugins/sgs-blocks/CLAUDE.md,
 * "Border controls"). The named shapes themselves are the `shape` atom's.
 *
 * The border's own PAINT — width/style/colour/
 * radius — is a SEPARATE, independent capability layered on top, wired
 * 2026-09-02 by feeding `SgsBorderControl` this atom's own attribute names
 * with ZERO custom logic (Bean's ruling: "take the original border helper
 * and shove it into any border with 0 nuance, customising it for the layer
 * it's being applied to"). It shows UNGATED for every `shape` value — a
 * `none`-shape element can still carry a visible border. `BorderRadius`
 * carries the client's own tiered corners with no shape-based fallback
 * token any more (that bespoke shape-to-radius mapping was Bean-rejected
 * 2026-09-02 and removed); an unset `BorderRadius` simply emits nothing,
 * matching the atom's own "nothing for an empty attribute set" contract.
 * `BorderWidth` is an UNTIERED 4-side box object — per-device border width
 * is CANCELLED, not deferred (Bean, 2026-08-29).
 *
 * `BorderColourHover`/`BorderColourHoverGradient` (2026-09-07) are the
 * hover-state colour pair, colour-only — no hover variant for width/style/
 * radius, matching `sgs/button`/`sgs/container`'s own `states.hover.attrMap`
 * convention. Emission mirrors `overlay.js`'s `hoverPaint` shape exactly
 * (gradient wins, one custom property emitted, never both).
 *
 * ⚠ COLLISION RISK, NAMED NOT SOLVED: no block adopts this atom's `BorderRadius`
 * base AND a native/`SgsBorderControl` radius on the SAME element today
 * (`sgs/media` only declares `atoms:['object-fit','focal-point']` — verified
 * live in its block.json), so nothing collides yet. A future block that adopts
 * both on one node would have two radius writers on that node and needs a
 * design call before it ships, not an assumption either one wins.
 *
 * RATIO FORMAT DIVERGES — spaced `"16 / 9"` (the old sizing panel,
 * `image-sequence/render.php` — the only server-side ratio allowlist) vs
 * unspaced `"16/10"` (`card-grid`/`gallery`/`post-grid`, free text). This
 * atom EMITS the spaced canonical form always, and READS both — see
 * `normaliseRatio()`.
 *
 * `reads` TRAP, MEASURED (registry.js `box-shape.reads`):
 *   - `sgs/product-card`'s `imageHeight` is a plain `"180px"` STRING, not
 *     this atom's tier-object shape. `resolveHeight()` accepts either.
 *
 * A percentage max-width is a max-width with a `%` unit, so there is no
 * dedicated percentage attribute. Height, Width, MaxWidth and MaxHeight each
 * store one CSS length string per device (`{desktop,tablet,mobile}`, unit
 * inside the string) and print through `cssLengthValue()`.
 *
 * `css()` mirrors `includes/media/atoms/box-shape.php`'s
 * `sgs_media_atom_box_shape_css()` byte-for-byte — enforced by
 * `scripts/tests/test-media-emitter-parity.mjs`.
 *
 * LOGIC HALF ONLY. Split from the JSX control per the purity contract
 * (`scripts/check-media-atom-purity.js`): this module must be importable by
 * plain Node — no JSX, no `@wordpress/components` (a webpack EXTERNAL, not
 * installed in `node_modules`). The JSX control lives in
 * `box-shape.control.js` and imports from here.
 *
 * @package SGS\Blocks
 */
import { mediaStoredAttrName } from '../../MediaElementControls.js';
import { colourVar } from '../../../utils/tokens.js';
import { cssLengthValue } from '../../../utils/css-length.js';
import { MEDIA_ATOMS } from './registry.js';
import { isLegacyCall, rulesFor, omitted, REASONS } from '../panels/disclosure-context.js';

const ATOM_ID = 'box-shape';

/**
 * Border styles this atom accepts — the same allowlist `sgs/before-after`'s
 * render.php enforces for its own block-private border (Shape B).
 */
const BORDER_STYLES = [ 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' ];

/**
 * Gradient charset/breakout rules, mirrored from `overlay.js`'s
 * `validateGradient()` (not imported — every atom mirrors its own copy
 * rather than sharing, matching that atom's own documented reasoning) and
 * from `sgs_css_gradient_value()` (helpers-tokens.php), which has no JS
 * twin of its own.
 */
const GRADIENT_PATTERN = /^(repeating-)?(linear|radial|conic)-gradient\([A-Za-z0-9\s.,%()#/_-]+\)$/i;
const GRADIENT_BREAKOUT = /[;{}]|url\s*\(|<|>|@|expression/i;

/**
 * Normalise a ratio string in EITHER format to the canonical spaced form.
 * Reads "16/10" and "16 / 10" identically; refuses anything that is not two
 * positive numbers either side of a slash.
 *
 * @param {*} value Raw candidate.
 * @return {string} "W / H", or '' when not a valid ratio.
 */
export function normaliseRatio( value ) {
	if ( 'string' !== typeof value ) {
		return '';
	}
	const m = value.trim().match( /^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/ );
	if ( ! m ) {
		return '';
	}
	return `${ m[ 1 ] } / ${ m[ 2 ] }`;
}

/**
 * Resolve the sizing mode: an in-vocabulary `MediaSizing` value wins; an
 * unset or unknown one is derived from the stored Height / AspectRatio.
 *
 * @param {*} rawSizing Raw `MediaSizing` value.
 * @param {*} objectFit The surface's own object-fit value (not read; kept for the twin's signature).
 * @return {string} 'auto' | 'height' | 'ratio' | 'fill'.
 */
export function resolveSizingMode(
	rawSizing,
	objectFit,
	attributes = null,
	prefix = '',
	blockSlug = ''
) {
	const vocabulary = MEDIA_ATOMS[ ATOM_ID ].vocabulary.sizing;
	if ( vocabulary.includes( rawSizing ) ) {
		return rawSizing;
	}
	// DERIVED MODE (D1001) — byte-identical twin of
	// `sgs_media_atom_box_shape_resolve_sizing_mode()`; read that function's
	// comment for the full rationale. Summary: an absent `MediaSizing` fell to
	// 'auto', the one mode that HIDES the Height control and suppresses its
	// CSS, so a stored height rendered nothing with no reachable control.
	// `"default": "auto"` in block.json would ship the same bug, because 'auto'
	// IS the hiding state — so the mode is derived from what was stored.
	// Presence uses the SAME helpers `css()` emits with (`resolveHeight` /
	// `normaliseRatio`), never a second notion of "set". An explicit
	// in-vocabulary value always wins, checked above.
	if ( attributes ) {
		const heightKey = mediaStoredAttrName( blockSlug, prefix, 'Height' );
		const resolved = resolveHeight( attributes[ heightKey ] );
		const tiers = [ 'desktop', 'tablet', 'mobile' ];
		if ( tiers.some( ( tier ) => '' !== String( ( resolved && resolved[ tier ] ) ?? '' ) ) ) {
			return 'height';
		}
		const ratioKey = mediaStoredAttrName( blockSlug, prefix, 'AspectRatio' );
		if ( '' !== normaliseRatio( attributes[ ratioKey ] ) ) {
			return 'ratio';
		}
	}

	return 'auto';
}

/** Reject an out-of-vocabulary `Shape` value to `'none'`. */
export function validateShape( value ) {
	const vocabulary = MEDIA_ATOMS[ ATOM_ID ].vocabulary.shape;
	return 'string' === typeof value && vocabulary.includes( value ) ? value : 'none';
}

/**
 * Read a per-device tier object of CSS length strings, ignoring any other
 * shape or an empty tier.
 *
 * @param {*} raw Raw attribute value.
 * @return {Object} `{desktop,tablet,mobile}` (only the set tiers).
 */
function resolveTierStrings( raw ) {
	const out = {};
	if ( raw && 'object' === typeof raw ) {
		[ 'desktop', 'tablet', 'mobile' ].forEach( ( t ) => {
			if ( 'string' === typeof raw[ t ] && '' !== raw[ t ] ) {
				out[ t ] = raw[ t ];
			}
		} );
	}
	return out;
}

/**
 * Read a Height-shaped value: a per-device tier object of CSS length strings,
 * or `sgs/product-card`'s flat `"180px"` string (read as the desktop value).
 *
 * @param {*} raw Raw attribute value.
 * @return {Object} `{desktop,tablet,mobile}` (only the set tiers).
 */
export function resolveHeight( raw ) {
	if ( 'string' === typeof raw && raw ) {
		return { desktop: raw };
	}
	return resolveTierStrings( raw );
}

/**
 * Read a Width-shaped value: this atom's per-device tier object of CSS length
 * strings.
 *
 * @param {*} raw Raw attribute value.
 * @return {Object} `{desktop,tablet,mobile}` (only the set tiers).
 */
export function resolveWidth( raw ) {
	return resolveTierStrings( raw );
}

/**
 * Function names `sgs_css_length_value()` (helpers-css-safety.php) allowlists
 * for balanced-paren consumption — kept in sync with that function's own
 * step 3 pattern by name, not by import (this module must stay Node-plain,
 * see the purity contract in the module docblock).
 */
const LENGTH_FN_NAME = /^(?:var|calc|min|max|minmax|clamp|repeat)\(/i;

/**
 * Consume every balanced-paren `var()`/`calc()`/`min()`/`max()`/`minmax()`/
 * `clamp()`/`repeat()` call in `value`, mirroring
 * `sgs_css_length_value()`'s step-3 recursive-paren consumption (PHP's PCRE2
 * `(?1)` recursion has no JS equivalent, so this walks the string by hand
 * instead — same result: a call whose parens balance is removed whole, one
 * whose parens don't balance is left untouched so its stray `(` survives
 * into the caller's post-consumption breakout check).
 *
 * @param {string} value Raw candidate.
 * @return {string} `value` with every balanced allowlisted call removed.
 */
function consumeAllowlistedLengthCalls( value ) {
	let out = '';
	let i = 0;
	while ( i < value.length ) {
		const rest = value.slice( i );
		const m = rest.match( LENGTH_FN_NAME );
		if ( m ) {
			let depth = 1;
			let j = i + m[ 0 ].length;
			while ( j < value.length && depth > 0 ) {
				if ( '(' === value[ j ] ) {
					depth++;
				} else if ( ')' === value[ j ] ) {
					depth--;
				}
				j++;
			}
			if ( 0 === depth ) {
				i = j;
				continue;
			}
		}
		out += value[ i ];
		i++;
	}
	return out;
}

// The two-character comment-open sequence is deliberately never spelled out
// literally anywhere in this file, in a string OR in a comment:
// `scripts/check-media-atom-purity.js`'s own comment-stripper scans raw
// source for it BEFORE it strips string literals, so ANY occurrence — even
// inside a string literal, even inside a plain `//` comment describing this
// very fact — is misread as a block-comment opener, and everything up to the
// next real comment-close (including this module's own `css`/`validate`/
// `disclosure` exports, further down the file) is silently swallowed; the
// gate then reports those exports as missing. Built via
// `String.fromCharCode()` instead (the same reason `BS` is built from char codes
// elsewhere in the gate scripts).
const COMMENT_OPEN = String.fromCharCode( 47, 42 );

/**
 * Validate a non-numeric length-shaped string, mirroring
 * `sgs_css_length_value()` (helpers-css-safety.php) — the project's
 * established shared sanitiser for exactly this class of value, cited by
 * this atom's own PHP twin's docblock but never actually routed through
 * until this fix. Same discipline as this file's own
 * `validateBorderGradient()`/`resolveBorderColour()`: reject CSS-breakout
 * characters and dangerous raw substrings before returning anything.
 *
 * @param {string} value Raw candidate (already known non-numeric).
 * @return {string} A safe CSS value fragment, or '' on rejection.
 */
function sanitiseLengthString( value ) {
	if ( '' === value ) {
		return '';
	}
	// Dangerous raw substrings, checked before any function-call consumption.
	if ( /url\s*\(|expression\s*\(|@import/i.test( value ) ) {
		return '';
	}
	// CSS-breakout characters on the RAW input, before consumption — a
	// payload wrapped inside an allowlisted call (e.g. "calc(}body{...)")
	// must be caught here, not just in the post-consumption remainder check.
	if ( /[\\{}<>;=]/.test( value ) || value.includes( COMMENT_OPEN ) ) {
		return '';
	}
	const consumed = consumeAllowlistedLengthCalls( value );
	// Anything left that can break out of a declaration, open a comment, or
	// is an unconsumed/unbalanced parenthesis → reject.
	if ( /[\\&=}{;<>()]/.test( consumed ) || consumed.includes( COMMENT_OPEN ) ) {
		return '';
	}
	return value.trim().replace( /\s+/g, ' ' );
}

/**
 * Append `px` to a bare number, matching `sgs_css_length_value()`'s own
 * bare-number convention (`sgs/before-after`'s block-private border reads
 * its box values through that shared sanitiser; this atom's border shares
 * the exact same `SgsBorderControl` UI, which stores a plain number). A
 * value already carrying a unit (a string) is routed through
 * `sanitiseLengthString()` rather than passed through unsanitised.
 *
 * ⛔ Found live 2026-09-01, sgs/media's first real deploy of this atom's
 * border feature: without this, `sidesToWidthShorthand()`/
 * the radius emitter produced a UNITLESS shorthand
 * (`--sgs-media-border-width:4 4 4 4`), which is invalid CSS — the browser
 * discards the whole declaration and falls back to `border-width: medium`
 * (~3px), the exact G5 anti-pattern `sgs/before-after`'s own render.php
 * comment names and avoids via `sgs_css_length_value()`. Radius had the
 * identical defect. Measured: computed `border-width` read `3px` and
 * `border-top-left-radius` read `0px` against an authored 4px/30px value.
 *
 * ⛔ NEGATIVE NUMBERS: a negative `border-width`/`border-radius` corner is
 * invalid CSS and, once joined into the 4-value shorthand, invalidates the
 * WHOLE declaration — the exact same failure class as the unitless case
 * above, triggered by a different malformed input. Clamped to `0px` here
 * rather than passed through.
 *
 * @param {*} value Raw corner/side value (number, numeric string, or a
 *                  length-shaped string such as a `var()`/`calc()` call).
 * @return {string} A safe `px`-suffixed or sanitised length, or `'0'` when
 *                  the input cannot be trusted.
 */
export function toLengthValue( value ) {
	if ( 'number' === typeof value ) {
		return value < 0 ? '0px' : `${ value }px`;
	}
	if ( 'string' === typeof value ) {
		const trimmed = value.trim();
		if ( /^-?\d+(\.\d+)?$/.test( trimmed ) ) {
			return parseFloat( trimmed ) < 0 ? '0px' : `${ trimmed }px`;
		}
		const sanitised = sanitiseLengthString( trimmed );
		return sanitised || '0';
	}
	return '0';
}

/**
 * Per-corner `border-radius` custom-property declarations for ONE tier, in the
 * order top-left, top-right, bottom-right, bottom-left. Corners are read by
 * NAME — `ResponsiveBorderRadiusControl` declares its keys in a different
 * order (topLeft, topRight, bottomLeft, bottomRight) — and only the corners the
 * client set are emitted, so an unset corner falls through to the wider tier's
 * value in the stylesheet instead of being zeroed. Mirrors
 * `sgs_media_atom_box_shape_corner_radius_decls()` in the PHP twin.
 *
 * @param {*}      corners Raw `BorderRadius`-shaped value for one tier.
 * @param {string} suffix  Tier suffix: '', '-tablet' or '-mobile'.
 * @return {string[]} `--sgs-media-border-<corner>-radius<suffix>:<value>` declarations.
 */
export function cornerRadiusDecls( corners, suffix ) {
	if ( ! corners || 'object' !== typeof corners ) {
		return [];
	}
	return [
		[ 'topLeft', 'top-left' ],
		[ 'topRight', 'top-right' ],
		[ 'bottomRight', 'bottom-right' ],
		[ 'bottomLeft', 'bottom-left' ],
	]
		.filter(
			( pair ) =>
				undefined !== corners[ pair[ 0 ] ] &&
				null !== corners[ pair[ 0 ] ] &&
				'' !== corners[ pair[ 0 ] ]
		)
		.map(
			( pair ) =>
				`--sgs-media-border-${ pair[ 1 ] }-radius${ suffix }:${ toLengthValue( corners[ pair[ 0 ] ] ) }`
		);
}

/**
 * Convert a 4-SIDE box object into the CSS `border-width` shorthand VALUE
 * string ("top right bottom left") — `SgsBorderControl`'s own `widthValues`
 * shape. An unset side defaults to `0`; an entirely-empty object returns ''
 * so the caller can skip the declaration outright. Sibling to
 * `cornerRadiusDecls()` above, same rules, different key set (this
 * one CANNOT read a corner-keyed object and vice versa).
 *
 * @param {*} sides Raw `BorderWidth`-shaped value.
 * @return {string} `"T R B L"`, or '' when nothing is set.
 */
export function sidesToWidthShorthand( sides ) {
	if ( ! sides || 'object' !== typeof sides ) {
		return '';
	}
	const order = [ 'top', 'right', 'bottom', 'left' ];
	const hasAny = order.some(
		( k ) => undefined !== sides[ k ] && null !== sides[ k ] && '' !== sides[ k ]
	);
	if ( ! hasAny ) {
		return '';
	}
	return order
		.map( ( k ) =>
			undefined !== sides[ k ] && null !== sides[ k ] && '' !== sides[ k ]
				? toLengthValue( sides[ k ] )
				: '0'
		)
		.join( ' ' );
}

/** Reject an out-of-vocabulary `BorderStyle` value to ''. */
export function validateBorderStyle( value ) {
	return 'string' === typeof value && BORDER_STYLES.includes( value ) ? value : '';
}

/**
 * Validate a gradient string. Mirrors `sgs_css_gradient_value()`
 * (helpers-tokens.php) and `overlay.js`'s own `validateGradient()`.
 *
 * @param {*} value Raw candidate.
 * @return {string} The gradient, or '' when invalid/empty.
 */
export function validateBorderGradient( value ) {
	const v = 'string' === typeof value ? value.trim() : '';
	if ( ! v || ! GRADIENT_PATTERN.test( v ) || GRADIENT_BREAKOUT.test( v ) ) {
		return '';
	}
	return v;
}

/**
 * Resolve a colour attribute (palette slug or raw CSS colour) to a paintable
 * value. Mirrors `sgs_colour_value()`'s slug branch, same as `overlay.js`'s
 * own `resolveColour()`.
 *
 * @param {*} value Raw candidate.
 * @return {string} A paintable CSS colour value, or '' when empty.
 */
export function resolveBorderColour( value ) {
	if ( 'string' !== typeof value || ! value.trim() ) {
		return '';
	}
	return colourVar( value.trim() ) || value.trim();
}

/**
 * Height/Aspect ratio are mutually exclusive (registry.js `requires`); the
 * other rows (Shape, min/max/width) are independent of sizing mode.
 *
 * @param {Object} props
 * @param {Object} props.attributes Block attributes.
 * @param {string} [props.prefix]
 * @param {string} [props.blockSlug]
 * @return {{state: string, hiddenReason: (string|null), mode: string, heightState: string, ratioState: string}}
 */
function legacyDisclosure( { attributes = {}, prefix = '', blockSlug = '' } = {} ) {
	const sizingKey = mediaStoredAttrName( blockSlug, prefix, 'MediaSizing' );
	const fitKey = mediaStoredAttrName( blockSlug, prefix, 'ObjectFit' );
	const mode = resolveSizingMode( attributes[ sizingKey ], attributes[ fitKey ], attributes, prefix, blockSlug );
	return {
		state: 'shown',
		hiddenReason: null,
		mode,
		heightState: 'height' === mode ? 'visible' : 'hidden',
		ratioState: 'ratio' === mode ? 'visible' : 'hidden',
	};
}

/**
 * Per-base disclosure at the active device (Spec 49 §9.3). Returns a map of
 * base to `{ state, hiddenReason }`, the second legal return shape. Called the
 * earlier way, `disclosure( { attributes, prefix, blockSlug } )`, it returns
 * what it always did.
 *
 * @param {Object} attrs  Block attributes.
 * @param {string} device 'desktop' | 'tablet' | 'mobile'.
 * @param {string} prefix Surface prefix.
 * @param {Object} opts   `{ blockSlug, kinds, context, parallax }`.
 * @return {Object} Per-base states.
 */
export function disclosure( attrs, device, prefix = '', opts = {} ) {
	if ( isLegacyCall( attrs, device ) ) {
		return legacyDisclosure( attrs );
	}
	return rulesFor( 'shape', attrs, device, prefix, opts, ( base, c ) => {
		if ( c.background || 'MediaSizing' === base ) {
			return omitted();
		}
		if ( 'AspectRatio' === base ) {
			return c.heightMatchesSpace ? omitted() : undefined;
		}
		if ( 'BorderRadius' === base ) {
			return c.shapeHidesCorners ? omitted( REASONS.corners ) : undefined;
		}
		if ( 'BorderWidth' === base ) {
			return c.isMask ? omitted( REASONS.borders ) : undefined;
		}
		if ( base.startsWith( 'Border' ) ) {
			if ( c.isMask ) {
				return omitted( REASONS.borders );
			}
			return c.hasBorderWidth ? undefined : omitted();
		}
		return undefined;
	} );
}

/**
 * Generic reject-to-default validator, mirroring `object-fit`'s
 * `validate(value, scope)` shape so every atom carries the same entry
 * point — required by the atom contract
 * (`scripts/check-media-atom-purity.js`).
 *
 * @param {*}      value Raw candidate.
 * @param {string} [kind] 'shape' (default) | 'sizing' | 'ratio'.
 * @return {string} A vocabulary member / canonical string, never the raw
 *                  out-of-vocabulary input.
 */
export function validate( value, kind = 'shape' ) {
	if ( 'sizing' === kind ) {
		return resolveSizingMode( value );
	}
	if ( 'ratio' === kind ) {
		return normaliseRatio( value );
	}
	return validateShape( value );
}

/**
 * Push one `--name`, `--name-tablet`, `--name-mobile` declaration per set
 * device, each value passed through `cssLengthValue()` (the twin of
 * `sgs_css_length_value()`).
 *
 * @param {string[]} decls Declarations, appended to.
 * @param {string}   name  Custom property name without a device suffix.
 * @param {Object}   tiers `{desktop,tablet,mobile}` length strings.
 */
function pushTierLengths( decls, name, tiers ) {
	[ [ 'desktop', '' ], [ 'tablet', '-tablet' ], [ 'mobile', '-mobile' ] ].forEach( ( pair ) => {
		const val = cssLengthValue( tiers[ pair[ 0 ] ] );
		if ( val ) {
			decls.push( `${ name }${ pair[ 1 ] }:${ val }` );
		}
	} );
}

/**
 * C3 emitter: this atom prints no CSS of its own (see `includes/media/emit-none.php`).
 *
 * @return {string} Always ''.
 */
export function emit() {
	return '';
}
