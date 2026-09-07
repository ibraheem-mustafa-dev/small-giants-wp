/**
 * `box-shape` atom — L2b control + disclosure + validator + value-setter.
 *
 * Bean's ruling: box-shape is TWO axes, not one — the sizing MODE
 * (auto / fixed height / aspect ratio, `MediaSizingPanel`'s existing 3-way
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
 * "Border controls"). The named-shape vocabulary is expressed ONLY through
 * `clip-path`, a different CSS property with no possible collision:
 *
 *   none    -> no clip
 *   square  -> clip-path: inset(0)
 *   rounded -> clip-path: inset(0 round 12px) (this atom's OWN fixed
 *              decorative constant, unchanged)
 *   circle  -> clip-path: circle(50%)
 *
 * `clip-path` is the CLIP. The border's own PAINT — width/style/colour/
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
 * `custom` ARRIVES HERE FROM THE `object-fit` ATOM. `sgs/hero`'s
 * `splitMediaObjectFit` carries a 4th value, `custom`, that is not a CSS fit
 * value at all — it means "sizing mode = explicit width/height"
 * (`hero/render.php:625` gates object-fit off for it). `object-fit`'s own
 * `validate()` never accepts `custom` into either of ITS vocabularies (see
 * that atom's docblock) — the value is handed to THIS atom to interpret. This
 * atom treats it as `MediaSizing:'height'` (this atom's own "explicit
 * width/height" mode) whenever `splitMediaObjectFit === 'custom'` and no
 * `MediaSizing` value is already stored — see `resolveSizingMode()` below.
 *
 * RATIO FORMAT DIVERGES — spaced `"16 / 9"` (`MediaSizingPanel`,
 * `image-sequence/render.php` — the only server-side ratio allowlist) vs
 * unspaced `"16/10"` (`card-grid`/`gallery`/`post-grid`, free text). This
 * atom EMITS the spaced canonical form always, and READS both — see
 * `normaliseRatio()`.
 *
 * THREE `reads` TRAPS, ALL MEASURED (registry.js `box-shape.reads`):
 *   - `sgs/product-card`'s `imageHeight` is a plain `"180px"` STRING, not
 *     this atom's tier-object shape. `resolveHeight()` accepts either.
 *   - `sgs/hero`'s `splitMediaWidth` is a NUMBER paired with
 *     `splitMediaWidthUnit`, not a tier object. `resolveWidth()` accepts
 *     either.
 *   - `sgs/decorative-image`'s `maxWidthPercent` is a bare percentage
 *     number — already this atom's own canonical shape (`MaxWidthPercent`),
 *     no bridging needed.
 *
 * `css()` mirrors `includes/media/atoms/box-shape.php`'s
 * `sgs_media_atom_box_shape_css()` byte-for-byte — enforced by
 * `scripts/tests/test-media-atom-parity.mjs`.
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
import { MEDIA_ATOMS } from './registry.js';

const ATOM_ID = 'box-shape';

const CLIP_PATHS = {
	square: 'inset(0)',
	rounded: 'inset(0 round 12px)',
	circle: 'circle(50%)',
};

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
 * Reject an out-of-vocabulary `MediaSizing` value to `'auto'` — `custom`
 * (the object-fit atom's sizing-mode sentinel, see module docblock) resolves
 * to `'height'` only when nothing has explicitly chosen a mode yet.
 *
 * @param {*} rawSizing Raw `MediaSizing` value.
 * @param {*} objectFit The surface's own object-fit value (may be `custom`).
 * @return {string} 'auto' | 'height' | 'ratio'.
 */
export function resolveSizingMode( rawSizing, objectFit ) {
	const vocabulary = MEDIA_ATOMS[ ATOM_ID ].vocabulary.sizing;
	if ( vocabulary.includes( rawSizing ) ) {
		return rawSizing;
	}
	if ( 'custom' === objectFit ) {
		return 'height';
	}
	return 'auto';
}

/** Reject an out-of-vocabulary `Shape` value to `'none'`. */
export function validateShape( value ) {
	const vocabulary = MEDIA_ATOMS[ ATOM_ID ].vocabulary.shape;
	return 'string' === typeof value && vocabulary.includes( value ) ? value : 'none';
}

/**
 * Read a Height-shaped value in EITHER stored shape: this atom's own tier
 * object (`{desktop,tablet,mobile}`, numbers) or `sgs/product-card`'s flat
 * unit-embedded STRING (`"180px"`).
 *
 * @param {*} raw Raw attribute value.
 * @return {Object} `{desktop,tablet,mobile}` — numbers when the source was a
 *                  tier object, or a single unit-embedded string under
 *                  `desktop` when the source was the flat-string shape
 *                  (flagged via `__unitEmbedded` so the caller does not also
 *                  append a separate unit).
 */
export function resolveHeight( raw ) {
	if ( 'string' === typeof raw && raw ) {
		return { desktop: raw, __unitEmbedded: true };
	}
	if ( raw && 'object' === typeof raw ) {
		const out = {};
		[ 'desktop', 'tablet', 'mobile' ].forEach( ( t ) => {
			if ( 'number' === typeof raw[ t ] || ( 'string' === typeof raw[ t ] && '' !== raw[ t ] ) ) {
				out[ t ] = raw[ t ];
			}
		} );
		return out;
	}
	return {};
}

/**
 * Read a Width-shaped value in EITHER stored shape: this atom's own tier
 * object, or `sgs/hero`'s `splitMediaWidth` NUMBER (a single desktop value,
 * paired with `splitMediaWidthUnit` handled by the caller).
 *
 * @param {*} raw Raw attribute value.
 * @return {Object} `{desktop,tablet,mobile}`.
 */
export function resolveWidth( raw ) {
	if ( 'number' === typeof raw ) {
		return { desktop: raw };
	}
	if ( raw && 'object' === typeof raw ) {
		const out = {};
		[ 'desktop', 'tablet', 'mobile' ].forEach( ( t ) => {
			if ( 'number' === typeof raw[ t ] || ( 'string' === typeof raw[ t ] && '' !== raw[ t ] ) ) {
				out[ t ] = raw[ t ];
			}
		} );
		return out;
	}
	return {};
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
// `String.fromCharCode()` instead, same convention `test-media-atom-parity
// .mjs` already uses for a bare backslash for the identical reason.
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
 * `cornersToRadiusShorthand()` emitted a UNITLESS shorthand
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
function toLengthValue( value ) {
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
 * Convert a 4-corner box object into the CSS `border-radius` shorthand VALUE
 * string, in the shorthand's own order (top-left, top-right, bottom-right,
 * bottom-left) — note this differs from `ResponsiveBorderRadiusControl`'s
 * declared key ORDER (topLeft, topRight, bottomLeft, bottomRight), so corners
 * are read by NAME, never assumed to already be in shorthand order. An unset
 * corner defaults to `0` so the shorthand is always well-formed; an
 * ENTIRELY-empty object returns '' so the caller can fall back to the shared
 * preset instead of emitting a no-op `0 0 0 0`.
 *
 * @param {*} corners Raw `BorderRadius`-shaped value.
 * @return {string} `"TL TR BR BL"`, or '' when nothing is set.
 */
export function cornersToRadiusShorthand( corners ) {
	if ( ! corners || 'object' !== typeof corners ) {
		return '';
	}
	const order = [ 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' ];
	const hasAny = order.some(
		( k ) => undefined !== corners[ k ] && null !== corners[ k ] && '' !== corners[ k ]
	);
	if ( ! hasAny ) {
		return '';
	}
	return order
		.map( ( k ) =>
			undefined !== corners[ k ] && null !== corners[ k ] && '' !== corners[ k ]
				? toLengthValue( corners[ k ] )
				: '0'
		)
		.join( ' ' );
}

/**
 * Convert a 4-SIDE box object into the CSS `border-width` shorthand VALUE
 * string ("top right bottom left") — `SgsBorderControl`'s own `widthValues`
 * shape. An unset side defaults to `0`; an entirely-empty object returns ''
 * so the caller can skip the declaration outright. Sibling to
 * `cornersToRadiusShorthand()` above, same rules, different key set (this
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

/** Format a numeric-or-string tier value with its unit, unless already unit-embedded. */
function formatLength( value, unit, alreadyEmbedded ) {
	if ( undefined === value || null === value || '' === value ) {
		return '';
	}
	if ( alreadyEmbedded || 'string' === typeof value ) {
		return String( value );
	}
	return `${ value }${ unit || 'px' }`;
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
export function disclosure( { attributes = {}, prefix = '', blockSlug = '' } = {} ) {
	const sizingKey = mediaStoredAttrName( blockSlug, prefix, 'MediaSizing' );
	const fitKey = mediaStoredAttrName( blockSlug, prefix, 'ObjectFit' );
	const mode = resolveSizingMode( attributes[ sizingKey ], attributes[ fitKey ] );
	return {
		state: 'shown',
		hiddenReason: null,
		mode,
		heightState: 'height' === mode ? 'visible' : 'hidden',
		ratioState: 'ratio' === mode ? 'visible' : 'hidden',
	};
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
 * Custom-property declarations for this atom. Mirrors
 * `includes/media/atoms/box-shape.php`'s `sgs_media_atom_box_shape_css()`
 * exactly.
 *
 * @param {Object} props
 * @param {Object} props.attributes
 * @param {string} [props.prefix]
 * @param {string} [props.blockSlug]
 * @return {string[]} `--custom-property:value;` declarations, never bare rules.
 */
export function css( { attributes, prefix = '', blockSlug = '' } ) {
	const decls = [];

	const sizingKey = mediaStoredAttrName( blockSlug, prefix, 'MediaSizing' );
	const fitKey = mediaStoredAttrName( blockSlug, prefix, 'ObjectFit' );
	const mode = resolveSizingMode( attributes[ sizingKey ], attributes[ fitKey ] );

	if ( 'height' === mode ) {
		const heightKey = mediaStoredAttrName( blockSlug, prefix, 'Height' );
		const unitKey = mediaStoredAttrName( blockSlug, prefix, 'HeightUnit' );
		const resolved = resolveHeight( attributes[ heightKey ] );
		const unit = attributes[ unitKey ] || 'px';
		[ [ 'desktop', '' ], [ 'tablet', '-tablet' ], [ 'mobile', '-mobile' ] ].forEach( ( pair ) => {
			const tier = pair[ 0 ];
			const suffix = pair[ 1 ];
			const val = formatLength( resolved[ tier ], unit, resolved.__unitEmbedded );
			if ( val ) {
				decls.push( `--sgs-media-height${ suffix }:${ val }` );
			}
		} );
	}

	if ( 'ratio' === mode ) {
		const ratioKey = mediaStoredAttrName( blockSlug, prefix, 'AspectRatio' );
		const ratio = normaliseRatio( attributes[ ratioKey ] );
		if ( ratio ) {
			decls.push( `--sgs-media-aspect-ratio:${ ratio }` );
		}
	}

	const widthKey = mediaStoredAttrName( blockSlug, prefix, 'Width' );
	const widthUnitKey = mediaStoredAttrName( blockSlug, prefix, 'WidthUnit' );
	const resolvedWidth = resolveWidth( attributes[ widthKey ] );
	const widthUnit = attributes[ widthUnitKey ] || 'px';
	[ [ 'desktop', '' ], [ 'tablet', '-tablet' ], [ 'mobile', '-mobile' ] ].forEach( ( pair ) => {
		const tier = pair[ 0 ];
		const suffix = pair[ 1 ];
		const val = formatLength( resolvedWidth[ tier ], widthUnit, false );
		if ( val ) {
			decls.push( `--sgs-media-width${ suffix }:${ val }` );
		}
	} );

	const minHeightKey = mediaStoredAttrName( blockSlug, prefix, 'MinHeight' );
	const minHeightRaw = attributes[ minHeightKey ];
	const minHeightObj = minHeightRaw && 'object' === typeof minHeightRaw ? minHeightRaw : {};
	[ [ 'desktop', '' ], [ 'tablet', '-tablet' ], [ 'mobile', '-mobile' ] ].forEach( ( pair ) => {
		const tier = pair[ 0 ];
		const suffix = pair[ 1 ];
		const val = minHeightObj[ tier ];
		if ( val ) {
			decls.push( `--sgs-media-min-height${ suffix }:${ val }` );
		}
	} );

	const maxWidthKey = mediaStoredAttrName( blockSlug, prefix, 'MaxWidth' );
	const maxWidthUnitKey = mediaStoredAttrName( blockSlug, prefix, 'MaxWidthUnit' );
	const maxWidthRaw = attributes[ maxWidthKey ];
	const maxWidthDesktop = maxWidthRaw && 'object' === typeof maxWidthRaw ? maxWidthRaw.desktop : undefined;
	if ( undefined !== maxWidthDesktop && null !== maxWidthDesktop && '' !== maxWidthDesktop ) {
		decls.push( `--sgs-media-max-width:${ maxWidthDesktop }${ attributes[ maxWidthUnitKey ] || 'px' }` );
	}

	const maxHeightKey = mediaStoredAttrName( blockSlug, prefix, 'MaxHeight' );
	const maxHeightUnitKey = mediaStoredAttrName( blockSlug, prefix, 'MaxHeightUnit' );
	const maxHeightRaw = attributes[ maxHeightKey ];
	const maxHeightDesktop = maxHeightRaw && 'object' === typeof maxHeightRaw ? maxHeightRaw.desktop : undefined;
	if ( undefined !== maxHeightDesktop && null !== maxHeightDesktop && '' !== maxHeightDesktop ) {
		decls.push( `--sgs-media-max-height:${ maxHeightDesktop }${ attributes[ maxHeightUnitKey ] || 'px' }` );
	}

	const maxWidthPercentKey = mediaStoredAttrName( blockSlug, prefix, 'MaxWidthPercent' );
	const maxWidthPercent = attributes[ maxWidthPercentKey ];
	if ( 'number' === typeof maxWidthPercent ) {
		decls.push( `--sgs-media-max-width-percent:${ maxWidthPercent }%` );
	}

	const shapeKey = mediaStoredAttrName( blockSlug, prefix, 'Shape' );
	const shape = validateShape( attributes[ shapeKey ] );
	if ( 'none' !== shape ) {
		decls.push( `--sgs-media-clip-path:${ CLIP_PATHS[ shape ] }` );
	}

	// The border's own paint — width/style/colour/radius, ungated by `shape`
	// (2026-09-02). Straightforward custom properties, same shape as every
	// other decl in this atom: emitted when a real value is set, skipped
	// entirely otherwise ("nothing for an empty attribute set").
	const radiusKey = mediaStoredAttrName( blockSlug, prefix, 'BorderRadius' );
	const radiusTabletKey = mediaStoredAttrName( blockSlug, prefix, 'BorderRadiusTablet' );
	const radiusMobileKey = mediaStoredAttrName( blockSlug, prefix, 'BorderRadiusMobile' );
	const desktopRadiusShorthand = cornersToRadiusShorthand( attributes[ radiusKey ] );
	const tabletRadiusShorthand = cornersToRadiusShorthand( attributes[ radiusTabletKey ] );
	const mobileRadiusShorthand = cornersToRadiusShorthand( attributes[ radiusMobileKey ] );
	if ( desktopRadiusShorthand ) {
		decls.push( `--sgs-media-border-radius:${ desktopRadiusShorthand }` );
	}
	if ( tabletRadiusShorthand ) {
		decls.push( `--sgs-media-border-radius-tablet:${ tabletRadiusShorthand }` );
	}
	if ( mobileRadiusShorthand ) {
		decls.push( `--sgs-media-border-radius-mobile:${ mobileRadiusShorthand }` );
	}

	const borderWidthKey = mediaStoredAttrName( blockSlug, prefix, 'BorderWidth' );
	const borderWidthShorthand = sidesToWidthShorthand( attributes[ borderWidthKey ] );
	if ( borderWidthShorthand ) {
		decls.push( `--sgs-media-border-width:${ borderWidthShorthand }` );
	}

	const borderStyleKey = mediaStoredAttrName( blockSlug, prefix, 'BorderStyle' );
	const borderStyle = validateBorderStyle( attributes[ borderStyleKey ] );
	if ( borderStyle ) {
		decls.push( `--sgs-media-border-style:${ borderStyle }` );
	}

	// Colour pair — gradient wins over flat colour, same rule as
	// `overlay.js`'s `resolvePaint()`. A gradient rides `border-image`
	// (`box-shape.css`'s `border-image-slice:1` companion) rather than
	// `border-color`, since a single CSS custom property cannot carry the
	// masked-::before-ring technique `sgs_border_gradient_css()` uses — that
	// helper builds a full scoped CSS rule, and this atom's contract is
	// custom-property VALUES only, never bare rules.
	const borderColourKey = mediaStoredAttrName( blockSlug, prefix, 'BorderColour' );
	const borderColourGradientKey = mediaStoredAttrName( blockSlug, prefix, 'BorderColourGradient' );
	const borderGradient = validateBorderGradient( attributes[ borderColourGradientKey ] );
	if ( borderGradient ) {
		decls.push( `--sgs-media-border-image:${ borderGradient }` );
	} else {
		const borderColour = resolveBorderColour( attributes[ borderColourKey ] );
		if ( borderColour ) {
			decls.push( `--sgs-media-border-color:${ borderColour }` );
		}
	}

	// Hover colour pair — same gradient-wins-over-flat rule, same shape as
	// `overlay.js`'s `hoverPaint` (2026-09-07). Only ONE of the two hover
	// custom properties is ever emitted (never both), matching the base
	// pair above; `box-shape.css`'s `:hover`/`:focus-visible` rule falls
	// back through `var(--x-hover, var(--x, default))` so an unset hover
	// leaves the resting value untouched.
	const borderColourHoverKey = mediaStoredAttrName( blockSlug, prefix, 'BorderColourHover' );
	const borderColourHoverGradientKey = mediaStoredAttrName( blockSlug, prefix, 'BorderColourHoverGradient' );
	const borderHoverGradient = validateBorderGradient( attributes[ borderColourHoverGradientKey ] );
	if ( borderHoverGradient ) {
		decls.push( `--sgs-media-border-image-hover:${ borderHoverGradient }` );
	} else {
		const borderHoverColour = resolveBorderColour( attributes[ borderColourHoverKey ] );
		if ( borderHoverColour ) {
			decls.push( `--sgs-media-border-color-hover:${ borderHoverColour }` );
		}
	}

	return decls;
}
