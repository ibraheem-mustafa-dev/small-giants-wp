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
 * BORDER-RADIUS is a SECOND, ADDITIVE writer, not the same writer as before.
 * `SgsBorderControl` (44 blocks) and native `__experimentalBorder`
 * (`sgs/media`) still own the BLOCK WRAPPER's border chrome outright — a
 * second writer targeting THAT node is a bug (plugins/sgs-blocks/CLAUDE.md,
 * "Border controls"). The named-shape vocabulary was therefore originally
 * expressed ONLY through `clip-path`, a different CSS property with no
 * possible collision. A genuine editable radius was added 2026-09-01
 * (`--sgs-media-border-radius`, a NEW custom property targeting the MEDIA
 * ELEMENT itself, `.sgs-media-el` — not the wrapper) because `clip-path`
 * alone gives no way to dial a custom rounded corner. `clip-path` is
 * UNCHANGED and still governs the visual clip:
 *
 *   none    -> no clip;              --sgs-media-border-radius NOT emitted
 *              (the default; matches the "nothing for an empty attribute
 *              set" atom contract — the stylesheet's own fallback already
 *              resolves to 0)
 *   square  -> clip-path: inset(0);  --sgs-media-border-radius:0
 *   rounded -> clip-path: inset(0 round 12px) (still this atom's OWN fixed
 *              decorative constant, unchanged); --sgs-media-border-radius
 *              carries the client's OWN tiered `BorderRadius` corners
 *              instead (falls back to a theme token, never a bare pixel)
 *   circle  -> clip-path: circle(50%); --sgs-media-border-radius:50%
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
import { MEDIA_ATOMS } from './registry.js';

const ATOM_ID = 'box-shape';

const CLIP_PATHS = {
	square: 'inset(0)',
	rounded: 'inset(0 round 12px)',
	circle: 'circle(50%)',
};

/**
 * Fallback border-radius when `shape:'rounded'` has no client-set
 * `BorderRadius` at all — a theme token, never a bare pixel constant, so a
 * re-skin still lands correctly.
 */
const ROUNDED_BORDER_RADIUS_FALLBACK = 'var(--wp--custom--border-radius--medium)';

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
				? corners[ k ]
				: '0'
		)
		.join( ' ' );
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

	// Real editable radius, companion to the clip-path above (2026-09-01).
	// `circle` gets a fixed 50%; `rounded` gets the client's own tiered
	// corners (falling back to a theme token when unset); `none`/`square`
	// get a literal 0 — always emitted, never left to the stylesheet's own
	// fallback, since this custom property is brand new and has no existing
	// default to accidentally win against.
	if ( 'circle' === shape ) {
		decls.push( '--sgs-media-border-radius:50%' );
	} else if ( 'rounded' === shape ) {
		const radiusKey = mediaStoredAttrName( blockSlug, prefix, 'BorderRadius' );
		const radiusTabletKey = mediaStoredAttrName( blockSlug, prefix, 'BorderRadiusTablet' );
		const radiusMobileKey = mediaStoredAttrName( blockSlug, prefix, 'BorderRadiusMobile' );
		const desktopShorthand = cornersToRadiusShorthand( attributes[ radiusKey ] );
		const tabletShorthand = cornersToRadiusShorthand( attributes[ radiusTabletKey ] );
		const mobileShorthand = cornersToRadiusShorthand( attributes[ radiusMobileKey ] );
		decls.push(
			`--sgs-media-border-radius:${ desktopShorthand || ROUNDED_BORDER_RADIUS_FALLBACK }`
		);
		if ( tabletShorthand ) {
			decls.push( `--sgs-media-border-radius-tablet:${ tabletShorthand }` );
		}
		if ( mobileShorthand ) {
			decls.push( `--sgs-media-border-radius-mobile:${ mobileShorthand }` );
		}
	} else if ( 'square' === shape ) {
		// 'none' (the default) emits NOTHING here, matching clip-path's own
		// skip and the atom contract's "nothing for an empty attribute set"
		// rule (test-media-atom-parity.mjs) — the stylesheet's own
		// `var( --sgs-media-border-radius, 0 )` fallback already resolves to
		// the same `0`, so this is a no-op-free skip, not a behaviour change.
		decls.push( '--sgs-media-border-radius:0' );
	}

	return decls;
}
