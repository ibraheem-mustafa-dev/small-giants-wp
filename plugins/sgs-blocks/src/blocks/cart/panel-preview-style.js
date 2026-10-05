/**
 * Editor-canvas mirrors for the mini-cart panel and the trigger.
 *
 * `includes/helpers-cart-panel-css.php::sgs_cart_panel_css()` and render.php
 * print the panel's typography, colours, per-device lengths, padding boxes,
 * radii and shadow into a scoped stylesheet keyed to the live panel; the canvas
 * has no server render, so these build the same values for the static preview
 * at the previewed device tier. Editor-only: the front end carries no inline
 * style.
 *
 * @package SGS\Blocks
 */
import {
	typographyPreviewStyle,
	textPaintPreview,
	backgroundPaintPreview,
	sgsBorderPreview,
	tierBoxShorthand,
	resolveTier,
	tierLengthPreview,
	sgsLengthPreview,
	resolveShadowPreviewComposed,
	isCssGradient,
} from '../../utils';
import { resolveColourToken } from '../../components';

/**
 * The style object for every panel element, keyed by element name.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} tier       Previewed device tier.
 * @param {Array}  palette    Theme colour palette.
 * @return {Object} Map of element name to React style object.
 */
export function panelElementStyles( attributes, tier, palette ) {
	const colour = ( value ) => resolveColourToken( value, palette );
	const radius = ( value ) => sgsLengthPreview( value );
	const styles = {
		heading: {
			...typographyPreviewStyle( attributes, 'panelTitle', tier ),
		},
		count: {
			...typographyPreviewStyle( attributes, 'panelCount', tier ),
			color: colour( attributes.panelCountColour ),
		},
		empty: {
			...typographyPreviewStyle( attributes, 'panelEmpty', tier ),
			color: colour( attributes.panelEmptyColour ),
			padding: tierBoxShorthand( attributes.panelEmptyPadding, tier ),
		},
		emptyMessage: {
			...typographyPreviewStyle( attributes, 'emptyMessage', tier ),
			color: colour( attributes.emptyMessageColour ),
			marginBottom: tierLengthPreview( attributes.emptyMessageGap, tier ),
		},
		emptyCta: {
			...typographyPreviewStyle( attributes, 'emptyCta', tier ),
			backgroundColor: colour( attributes.emptyCtaBg ),
			color: colour( attributes.emptyCtaColour ),
			padding: tierBoxShorthand( attributes.emptyCtaPadding, tier ),
			borderRadius: radius( attributes.emptyCtaRadius ),
		},
		brand: {
			...typographyPreviewStyle( attributes, 'itemBrand', tier ),
			color: colour( attributes.itemBrandColour ),
		},
		name: {
			...typographyPreviewStyle( attributes, 'itemName', tier ),
		},
		details: {
			...typographyPreviewStyle( attributes, 'itemDetail', tier ),
			color: colour( attributes.itemDetailColour ),
		},
		price: {
			...typographyPreviewStyle( attributes, 'itemPrice', tier ),
		},
		action: {
			...typographyPreviewStyle( attributes, 'itemAction', tier ),
		},
		subtotal: {
			...typographyPreviewStyle( attributes, 'subtotal', tier ),
			color: colour( attributes.subtotalLabelColour ),
		},
		freeText: {
			...typographyPreviewStyle( attributes, 'freeDeliveryText', tier ),
			color: colour( attributes.freeDeliveryTextColour ),
		},
		checkout: {
			...typographyPreviewStyle( attributes, 'checkout', tier ),
			backgroundColor: colour( attributes.checkoutBg ),
			color: colour( attributes.checkoutColour ),
			minHeight: tierLengthPreview( attributes.checkoutMinHeight, tier ),
			borderRadius: radius( attributes.checkoutRadius ),
		},
		note: {
			...typographyPreviewStyle( attributes, 'panelNote', tier ),
			color: colour( attributes.panelNoteColour ),
		},
		close: {
			color: colour( attributes.panelCloseColour ),
			'--sgs-cart-editor-close-size': tierLengthPreview( attributes.panelCloseSize, tier ),
		},
		footer: {
			backgroundColor: colour( attributes.panelFooterBg ),
			borderTopColor: colour( attributes.panelFooterBorderColour ),
			padding: tierBoxShorthand( attributes.panelFooterPadding, tier ),
		},
		header: {
			borderBottomColor: colour( attributes.panelHeadBorderColour ),
			padding: tierBoxShorthand( attributes.panelHeadPadding, tier ),
		},
		thumb: {
			backgroundColor: colour( attributes.itemThumbBg ),
			borderRadius: radius( attributes.itemThumbRadius ),
		},
		removeText: {
			color: colour( attributes.itemRemoveColour ),
			borderBottomColor: colour( attributes.itemRemoveBorderColour ),
		},
		save: {
			color: colour( attributes.itemActionColour ),
			borderBottomColor: colour( attributes.itemActionBorderColour ),
		},
		subtotalValue: {
			color: colour( attributes.subtotalValueColour ),
		},
		freeFill: {
			backgroundColor: colour( attributes.freeDeliveryFillColour ),
		},
		freeTrack: {
			backgroundColor: colour( attributes.freeDeliveryTrackColour ),
			height: tierLengthPreview( attributes.freeDeliveryTrackHeight, tier ),
			margin: tierBoxShorthand( attributes.freeDeliveryBarMargin, tier ),
			borderRadius: radius( attributes.freeDeliveryTrackRadius ),
		},
		items: {
			gap: tierLengthPreview( attributes.panelBodyGap, tier ),
			padding: tierBoxShorthand( attributes.panelBodyPadding, tier ),
			'--sgs-cart-item-thumb': tierLengthPreview( attributes.itemThumbSize, tier ),
		},
		item: {
			gap: tierLengthPreview( attributes.itemGap, tier ),
		},
		view: {
			borderRadius: radius( attributes.checkoutRadius ),
		},
	};
	// An unset setting is left off so the element keeps the stylesheet's own value.
	Object.keys( styles ).forEach( ( key ) => {
		styles[ key ] = Object.fromEntries( Object.entries( styles[ key ] ).filter( ( [ , value ] ) => undefined !== value && '' !== value ) );
	} );
	return styles;
}

/**
 * The panel root: width cap, shadow, text colour and the custom properties the
 * fill layer and the free-delivery track read.
 *
 * The fill is a `::after` layer in editor.css (the front end draws the same
 * layer), so a gradient text colour never clips it.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} tier       Previewed device tier.
 * @param {Array}  palette    Theme colour palette.
 * @return {Object} React style object.
 */
export function panelRootStyle( attributes, tier, palette ) {
	const style = { ...textPaintPreview( attributes.panelTextColour, attributes.panelTextColourGradient, palette ) };
	const fill = backgroundPaintPreview( attributes.panelBg, attributes.panelBgGradient, palette );
	if ( fill.backgroundImage || fill.backgroundColor ) {
		style[ '--sgs-cart-editor-panel-fill' ] = fill.backgroundImage || fill.backgroundColor;
	}
	const maxWidth = tierLengthPreview( attributes.panelMaxWidth, tier );
	if ( maxWidth ) {
		style.maxWidth = maxWidth;
	}
	const shadow = resolveShadowPreviewComposed( attributes.panelShadow, attributes.panelShadowColour );
	if ( shadow ) {
		style.boxShadow = shadow;
	}
	const track = resolveColourToken( attributes.freeDeliveryTrackColour, palette );
	if ( track ) {
		style[ '--sgs-cart-free-delivery-track' ] = track;
	}
	return style;
}

/**
 * Trigger, pill label and count badge styles (render.php's pill and badge rules).
 *
 * The badge and the pill each draw their fill on a `::after` layer in
 * editor.css, fed by a custom property, exactly as render.php does.
 *
 * @param {Object}  attributes Block attributes.
 * @param {string}  tier       Previewed device tier.
 * @param {Array}   palette    Theme colour palette.
 * @param {boolean} hasPill    Whether the trigger is the pill style.
 * @return {{trigger: Object, pillLabel: Object, badge: Object}} Styles.
 */
export function triggerStyles( attributes, tier, palette, hasPill ) {
	const badge = { ...textPaintPreview( attributes.badgeTextColour, attributes.badgeTextColourGradient, palette ) };
	const badgeFill = attributes.badgeColourGradient;
	if ( isCssGradient( badgeFill ) ) {
		badge[ '--sgs-cart-editor-badge-fill' ] = badgeFill;
	}
	if ( ! hasPill ) {
		return { trigger: {}, pillLabel: {}, badge };
	}
	const trigger = typographyPreviewStyle( attributes, 'pill', tier );
	const fill = backgroundPaintPreview( attributes.pillBgColour, attributes.pillBgColourGradient, palette );
	if ( fill.backgroundImage || fill.backgroundColor ) {
		trigger[ '--sgs-cart-editor-pill-fill' ] = fill.backgroundImage || fill.backgroundColor;
	}
	// The pill's stylesheet gives no width, so the border paints only beside a chosen width.
	Object.assign( trigger, sgsBorderPreview( { widthValues: attributes.pillBorderWidth, styleValue: attributes.pillBorderStyle, colourValue: attributes.pillBorderColour }, tier, palette ) );
	const radius = sgsLengthPreview( attributes.pillBorderRadius );
	if ( radius ) {
		trigger.borderRadius = radius;
	}
	const minHeight = tierLengthPreview( attributes.pillMinHeight, tier );
	if ( minHeight ) {
		trigger.minHeight = minHeight;
	}
	return {
		trigger,
		pillLabel: textPaintPreview( attributes.pillTextColour, attributes.pillTextColourGradient, palette ),
		badge,
	};
}

/**
 * The drawer's scrim: the see-through layer dimming the page behind the open
 * drawer, as `sgs_scrim_render()` writes it (fill, 0-1 opacity and blur per
 * device). A gradient wins over the flat colour; an unset colour is black.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} tier       Previewed device tier.
 * @param {Array}  palette    Theme colour palette.
 * @return {Object} React style object (custom properties editor.css reads).
 */
export function scrimPreviewStyle( attributes, tier, palette ) {
	const gradient = backgroundPaintPreview( '', attributes.scrimColourGradient, palette ).backgroundImage;
	const fill = gradient || resolveColourToken( attributes.scrimColour, palette ) || '#000';
	const rawOpacity = resolveTier( attributes.scrimOpacity, tier, '' ).value;
	const opacity = '' !== rawOpacity && ! isNaN( Number( rawOpacity ) ) ? Math.max( 0, Math.min( 1, Number( rawOpacity ) ) ) : 0;
	const style = { '--sgs-scrim-fill': fill, '--sgs-scrim-opacity': opacity };
	const blur = tierLengthPreview( attributes.scrimBlur, tier );
	if ( blur ) {
		style[ '--sgs-scrim-blur' ] = blur;
	}
	return style;
}
