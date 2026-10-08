/**
 * Editor-canvas mirror of the grid-item defaults (Spec 32 FR-32-12), the JS
 * twin of includes/helpers-grid-item.php.
 *
 * The six `--sgs-gi-*` values are set on the grid element itself (the band when
 * one renders, as the front end does), where container/style.css's one
 * zero-specificity consumer paints them on every direct cell. The states a
 * custom property cannot express (background hover, text-colour gradient and
 * hover, the border-gradient ring) ride an editor <style> scoped to this
 * instance, at both cell depths, exactly like the front end's scoped rules.
 *
 * @package SGS\Blocks
 */

import {
	tierBoxProperties,
	borderRadiusProperties,
	resolveShadowPreviewComposed,
	backgroundPaintPreview,
	textPaintPreview,
	isCssGradient,
	isSlug,
	shadowHoverValue,
	BORDER_STYLE_KEYWORDS,
} from '../../utils';
import { resolveColourToken } from '../../components/DesignTokenPicker';


/**
 * Split a `gridItemBorder` shorthand into width/style/colour, order-independent
 * (the twin of sgs_grid_border_parts()).
 *
 * @param {string} value Shorthand, e.g. "2px dashed primary".
 * @return {{width: string, style: string, colour: string}} Parts.
 */
export function gridBorderParts( value ) {
	const out = { width: '', style: '', colour: '' };
	const tokens = String( value || '' ).trim().split( /\s+/ ).filter( Boolean );
	for ( const token of tokens ) {
		if ( ! out.style && BORDER_STYLE_KEYWORDS.includes( token.toLowerCase() ) ) {
			out.style = token.toLowerCase();
		} else if ( ! out.width && /^[\d.]+(px|rem|em|%)?$/.test( token ) ) {
			out.width = token;
		} else if ( ! out.colour ) {
			out.colour = token;
		}
	}
	return out;
}

// A React style fragment as CSS declarations (camelCase to kebab-case). A value
// carrying `; { } < >` is dropped: it would break out of the <style> text.
const paintDecls = ( paint ) =>
	Object.entries( paint )
		.filter( ( [ , value ] ) => ! /[;{}<>]/.test( String( value ) ) )
		.map( ( [ key, value ] ) => `${ key.replace( /[A-Z]/g, ( c ) => `-${ c.toLowerCase() }` ) }:${ value }` )
		.join( ';' );

/**
 * The `--sgs-gi-*` values painting at the previewed tier.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} tier       'desktop' | 'tablet' | 'mobile'.
 * @param {Array}  palette    Theme colour palette.
 * @return {Object} React style fragment of custom properties.
 */
export function gridItemVars( attributes, tier, palette ) {
	// Padding and radius are one custom property per set side or corner, as render.php prints them.
	const vars = {
		...tierBoxProperties( attributes.gridItemPadding, tier, '--sgs-gi-padding-' ),
		...borderRadiusProperties( attributes.gridItemBorderRadius, tier, '--sgs-gi-radius-' ),
	};
	const gradient = attributes.gridItemBackgroundGradient;
	const ground = isCssGradient( gradient ) ? gradient : resolveColourToken( attributes.gridItemBackground, palette );
	if ( ground ) {
		vars[ '--sgs-gi-bg' ] = ground;
	}
	const border = gridBorderParts( attributes.gridItemBorder );
	const borderValue = [ border.width, border.style, border.colour ? resolveColourToken( border.colour, palette ) : '' ]
		.filter( Boolean )
		.join( ' ' );
	if ( borderValue ) {
		vars[ '--sgs-gi-border' ] = borderValue;
	}
	const shadow = resolveShadowPreviewComposed( attributes.gridItemShadow, attributes.gridItemShadowColour );
	if ( shadow ) {
		vars[ '--sgs-gi-shadow' ] = shadow;
	}
	const text = resolveColourToken( attributes.gridItemTextColour, palette );
	if ( text ) {
		vars[ '--sgs-gi-color' ] = text;
	}
	return vars;
}

/**
 * The scoped state rules at both cell depths, for an editor <style>. Every
 * gradient must be one whole gradient value (isCssGradient's `whole` form), as
 * it is written into stylesheet text.
 *
 * @param {Object} attributes       Block attributes.
 * @param {string} scope            Selector of this instance's root in the canvas.
 * @param {Array}  palette          Theme colour palette.
 * @param {Object} [shadowHoverMap] `settings.custom.shadowHover`, for the shadow's lift on hover.
 * @return {string} CSS, '' when nothing is set.
 */
export function gridItemStateCss( attributes, scope, palette, shadowHoverMap ) {
	const cellFilter = ':not([aria-hidden="true"]):not(.sgs-container__lottie-bg):not(style):not(script):not(.block-list-appender)';
	const cells = [
		`${ scope } > :where(:not(.sgs-container__inner)${ cellFilter })`,
		`${ scope } > :where(.sgs-container__inner) > :where(${ cellFilter })`,
	];

	const wholeGradient = ( value ) => ( isCssGradient( value, { whole: true } ) ? value : '' );
	const bgHover = paintDecls( backgroundPaintPreview( attributes.gridItemBackgroundHover, wholeGradient( attributes.gridItemBackgroundHoverGradient ), palette ) );
	const textGradient = wholeGradient( attributes.gridItemTextColourGradient )
		? paintDecls( textPaintPreview( '', attributes.gridItemTextColourGradient, palette ) )
		: '';
	const textHover = paintDecls( textPaintPreview( attributes.gridItemTextColourHover, wholeGradient( attributes.gridItemTextColourHoverGradient ), palette ) );
	const borderGradient = wholeGradient( attributes.gridItemBorderGradient );
	const borderGradientHover = wholeGradient( attributes.gridItemBorderGradientHover );
	// The automatic lift (helpers-shadow-hover.php::sgs_shadow_hover_rules): on unless the
	// switch is off or a hover shadow preset replaces it.
	const liftOn = false !== attributes.shadowLiftOnHover && ! isSlug( String( attributes.sgsHoverShadow ?? '' ) );
	const liftValue = liftOn ? shadowHoverValue( attributes.gridItemShadow, attributes.gridItemShadowColour, shadowHoverMap ) : '';
	const lift = liftValue ? paintDecls( { boxShadow: liftValue } ) : '';
	const ringWidth = gridBorderParts( attributes.gridItemBorder ).width || '2px';

	return cells
		.map( ( cell ) => {
			let css = '';
			if ( borderGradient ) {
				// The same masked ::before ring sgs_border_gradient_css() emits.
				css += `${ cell }{border-color:transparent;position:relative;background-clip:padding-box;}`;
				css += `${ cell }::before{content:"";position:absolute;inset:0;margin:-${ ringWidth };border-radius:inherit;padding:${ ringWidth };background:${ borderGradient };-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none;}`;
				if ( borderGradientHover && borderGradientHover !== borderGradient ) {
					css += `${ cell }:hover::before,${ cell }:focus-within::before{background:${ borderGradientHover };}`;
				}
			}
			if ( bgHover ) {
				css += `${ cell }:hover,${ cell }:focus-within{${ bgHover };}`;
			}
			if ( textGradient ) {
				css += `${ cell }{${ textGradient };}`;
			}
			if ( textHover ) {
				css += `${ cell }:hover,${ cell }:focus-within{${ textHover };}`;
			}
			if ( lift ) {
				css += `${ cell }:hover,${ cell }:focus-visible{${ lift };}`;
			}
			return css;
		} )
		.join( '' );
}
