/**
 * sgs/button — the editor canvas's inline style for the button root, built from
 * the same attributes and in the same order as render.php's scoped rules, at the
 * device tier the editor is previewing.
 *
 * @package SGS\Blocks
 */

import { resolveColourToken, motionEasingCss } from '../../components';
import { resolveShadowPreviewComposed } from '../../utils/tokens';
import {
	backgroundPaintPreview,
	textPaintPreview,
	tierBoxLonghands,
	typographyPreviewStyle,
	tierLengthPreview,
	tierValueOf,
	isCssGradient,
	sgsBorderPreview,
} from '../../utils';

const TIER_CHAIN = {
	desktop: [ 'desktop' ],
	tablet: [ 'tablet', 'desktop' ],
	mobile: [ 'mobile', 'tablet', 'desktop' ],
};

const isUnset = ( v ) => undefined === v || null === v || '' === v;

/**
 * Width at one tier, exactly as render.php's `$width_css_value`: full → 100%,
 * custom → value + unit, fit → fit-content, anything else → no override.
 *
 * @param {string} type Width type at the tier.
 * @param {*}      val  Custom width at the tier.
 * @param {string} unit Custom width unit at the tier.
 * @return {string|null} CSS width, or null for no override.
 */
function widthValue( type, val, unit ) {
	if ( 'full' === type ) {
		return '100%';
	}
	if ( 'custom' === type ) {
		return isUnset( val ) ? null : `${ Math.abs( parseInt( val, 10 ) ) || 0 }${ '%' === unit ? '%' : 'px' }`;
	}
	if ( 'fit' === type ) {
		return 'fit-content';
	}
	return null;
}

/**
 * The width a tier paints: the narrowest tier with an override wins, desktop
 * defaulting to fit (render.php's base rule).
 *
 * @param {Object} attributes Block attributes.
 * @param {string} tier       Previewed tier.
 * @return {string|null} CSS width.
 */
function tierWidth( attributes, tier ) {
	const { widthType = {}, customWidth = {}, customWidthUnit = {} } = attributes;
	for ( const t of TIER_CHAIN[ tier ] || TIER_CHAIN.desktop ) {
		const type = 'desktop' === t ? widthType?.[ t ] || 'fit' : widthType?.[ t ];
		const value = widthValue( type, customWidth?.[ t ], customWidthUnit?.[ t ] );
		if ( null !== value ) {
			return value;
		}
	}
	return null;
}

/**
 * Min-height at a tier: each tier carries its own unit attribute
 * (minHeightUnit / minHeightTabletUnit / minHeightMobileUnit).
 *
 * @param {Object} attributes Block attributes.
 * @param {string} tier       Previewed tier.
 * @return {string|undefined} CSS length, or undefined (style.css default).
 */
function tierMinHeight( attributes, tier ) {
	const unitAttr = { desktop: 'minHeightUnit', tablet: 'minHeightTabletUnit', mobile: 'minHeightMobileUnit' };
	for ( const t of TIER_CHAIN[ tier ] || TIER_CHAIN.desktop ) {
		const v = attributes.minHeight?.[ t ];
		if ( ! isUnset( v ) ) {
			const unit = attributes[ unitAttr[ t ] ];
			return `${ Math.abs( parseInt( v, 10 ) ) || 0 }${ [ 'px', 'em', 'rem', '%' ].includes( unit ) ? unit : 'px' }`;
		}
	}
	return undefined;
}

/**
 * @param {Object} attributes Block attributes.
 * @param {Array}  palette    Theme colour palette (slug resolution).
 * @param {string} tier       Previewed tier from `usePreviewTier()`.
 * @return {{ style: Object, backgroundLayerStyle: Object|null }} The root's style, and
 *   the sibling layer that carries the fill while a gradient text colour clips the root.
 */
export function buttonPreviewStyle( attributes, palette, tier = 'desktop' ) {
	const {
		transitionDuration,
		transitionEasing,
		transitionEasingCustom,
		colourText,
		colourTextGradient,
		colourBackground,
		colourBackgroundGradient,
		borderColour,
		borderColourGradient,
		borderStyle,
		borderWidth,
		boxShadow,
		boxShadowColour,
		padding,
		margin,
		contentAlign,
		iconGap,
		iconSize,
	} = attributes;

	const style = {};

	// Content alignment + label-to-icon gap at the tier (render.php's sgs_emit_responsive_css).
	const align = tierValueOf( contentAlign, tier );
	if ( [ 'flex-start', 'center', 'flex-end' ].includes( align ) ) {
		style.justifyContent = align;
	}
	const gap = tierLengthPreview( iconGap, tier );
	if ( gap ) {
		style.gap = gap;
	}
	// Icon size: the custom property the icon's svg rule reads.
	const size = tierValueOf( iconSize, tier );
	if ( ! isUnset( size ) ) {
		style[ '--sgs-btn-icon-size' ] = `${ Math.abs( parseInt( size, 10 ) ) || 0 }px`;
	}
	if ( transitionDuration > 0 ) {
		style.transition = `all ${ transitionDuration }ms ${ motionEasingCss( transitionEasing || 'ease', transitionEasingCustom || '', 'ease' ) }`;
	}

	// A gradient TEXT colour needs background-clip:text on the root, which would
	// erase the root's own fill, so the front end moves the fill onto a ::after
	// layer; the canvas uses a real sibling layer for the same job.
	const hasValidTextGradient = !! ( isCssGradient( colourTextGradient ) );
	const bgPaintPreview = backgroundPaintPreview( colourBackground, colourBackgroundGradient, palette );
	let backgroundLayerStyle = null;
	if ( hasValidTextGradient ) {
		style.position = 'relative';
		style.isolation = 'isolate';
		style.backgroundColor = 'transparent';
		style.backgroundImage = 'none';
		if ( bgPaintPreview.backgroundColor || bgPaintPreview.backgroundImage ) {
			backgroundLayerStyle = {
				position: 'absolute',
				inset: 0,
				zIndex: -1,
				borderRadius: 'inherit',
				pointerEvents: 'none',
				...bgPaintPreview,
			};
		}
		Object.assign( style, textPaintPreview( colourText, colourTextGradient, palette ) );
	} else {
		Object.assign( style, bgPaintPreview );
		if ( colourText ) {
			style.color = resolveColourToken( colourText, palette );
		}
	}

	// A preset class (render.php's $border_style_is_preset) already paints a border, so a chosen
	// style or colour overrides it without a width; any other button paints a border only beside one.
	const presetBorder = [ 'primary', 'secondary', 'outline' ].includes( attributes.inheritStyle ?? 'primary' );
	Object.assign( style, sgsBorderPreview( { widthValues: borderWidth, styleValue: borderStyle, colourValue: borderColour, colourGradientValue: borderColourGradient, radiusValues: attributes.borderRadius }, tier, palette, { defaultBorder: presetBorder } ) );

	// Typography: the twin of render.php's sgs_typography_css_rule( $attributes, '' ).
	Object.assign( style, typographyPreviewStyle( attributes, '', tier ) );

	// Base-state shadow (hover cannot show on a static canvas element).
	const boxShadowPreview = resolveShadowPreviewComposed( boxShadow, resolveColourToken( boxShadowColour, palette ) );
	if ( boxShadowPreview ) {
		style.boxShadow = boxShadowPreview;
	}
	Object.assign( style, tierBoxLonghands( padding, tier, 'padding' ) );
	Object.assign( style, tierBoxLonghands( margin, tier, 'margin' ) );
	const width = tierWidth( attributes, tier );
	if ( width ) {
		style.width = width;
	}
	const minHeight = tierMinHeight( attributes, tier );
	if ( minHeight ) {
		style.minHeight = minHeight;
	}

	return { style, backgroundLayerStyle };
}

/**
 * Whether render.php's labelCollapse rule clips the label at this tier
 * ('all' everywhere, 'tablet' at tablet and mobile, 'mobile' at mobile only).
 * The rule is emitted only when the button has an icon.
 *
 * @param {string}  labelCollapse 'none' | 'mobile' | 'tablet' | 'all'.
 * @param {boolean} hasIcon       Whether an icon is set.
 * @param {string}  tier          Previewed tier.
 * @return {boolean} True when the label is visually hidden at the tier.
 */
export function labelCollapsedAt( labelCollapse, hasIcon, tier ) {
	if ( ! hasIcon ) {
		return false;
	}
	return 'all' === labelCollapse ||
		( 'tablet' === labelCollapse && ( 'tablet' === tier || 'mobile' === tier ) ) ||
		( 'mobile' === labelCollapse && 'mobile' === tier );
}

/** render.php's visually-hidden clip for a collapsed label, kept in the accessibility tree. */
export const LABEL_CLIP_STYLE = Object.freeze( {
	position: 'absolute',
	width: '1px',
	height: '1px',
	padding: 0,
	margin: '-1px',
	overflow: 'hidden',
	clip: 'rect(0,0,0,0)',
	whiteSpace: 'nowrap',
	border: 0,
} );
