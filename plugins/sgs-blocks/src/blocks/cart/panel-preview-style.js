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
	resolveTier,
	tierLengthPreview,
	sgsLengthPreview,
	resolveShadowPreviewComposed,
	tierBoxLonghands,
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
			...tierBoxLonghands(
				attributes.panelEmptyPadding,
				tier,
				'padding'
			),
			// Centred: the empty block takes the free height of the item list above and below it.
			marginTop:
				'center' === attributes.panelEmptyPlacement
					? 'auto'
					: undefined,
			marginBottom:
				'center' === attributes.panelEmptyPlacement
					? 'auto'
					: undefined,
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
			...tierBoxLonghands( attributes.emptyCtaPadding, tier, 'padding' ),
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
		// The quantity stepper's pill (render: includes/helpers-cart-panel-items-css.php).
		qty: {
			...typographyPreviewStyle( attributes, 'itemQty', tier ),
			color: colour( attributes.itemQtyColour ),
			backgroundColor: colour( attributes.itemQtyBg ),
			borderRadius: radius( attributes.itemQtyRadius ),
			'--sgs-cart-qty-height': tierLengthPreview(
				attributes.itemQtyHeight,
				tier
			),
			...sgsBorderPreview(
				{
					widthValues: attributes.itemQtyBorderWidth,
					styleValue: attributes.itemQtyBorderStyle,
					colourValue: attributes.itemQtyBorderColour,
				},
				tier,
				palette
			),
		},
		subtotal: {
			...typographyPreviewStyle( attributes, 'subtotal', tier ),
			color: colour( attributes.subtotalLabelColour ),
		},
		// The note under the subtotal (render: includes/helpers-cart-panel-items-css.php).
		taxNote: {
			...typographyPreviewStyle( attributes, 'panelTaxNote', tier ),
			color: colour( attributes.panelTaxNoteColour ),
		},
		freeBand: {
			backgroundColor: colour( attributes.freeDeliveryBandBg ),
			...sgsBorderPreview(
				{
					widthValues: attributes.freeDeliveryBandBorderWidth,
					styleValue: attributes.freeDeliveryBandBorderStyle,
					colourValue: attributes.freeDeliveryBandBorderColour,
				},
				tier,
				palette
			),
			...tierBoxLonghands(
				attributes.freeDeliveryBandPadding,
				tier,
				'padding'
			),
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
			'--sgs-cart-editor-close-size': tierLengthPreview(
				attributes.panelCloseSize,
				tier
			),
			// A close size set for the tier overrules the button's 44px tap floor, as render.php does.
			'--sgs-cart-close-tap-min': tierLengthPreview(
				attributes.panelCloseSize,
				tier
			)
				? '0px'
				: undefined,
			// The close button's own tap area, when set, wins over both.
			minWidth: tierLengthPreview( attributes.panelCloseTapSize, tier ),
			minHeight: tierLengthPreview( attributes.panelCloseTapSize, tier ),
		},
		footer: {
			backgroundColor: colour( attributes.panelFooterBg ),
			borderTopColor: colour( attributes.panelFooterBorderColour ),
			...tierBoxLonghands(
				attributes.panelFooterPadding,
				tier,
				'padding'
			),
		},
		header: {
			borderBottomColor: colour( attributes.panelHeadBorderColour ),
			...tierBoxLonghands( attributes.panelHeadPadding, tier, 'padding' ),
		},
		thumb: {
			backgroundColor: colour( attributes.itemThumbBg ),
			borderRadius: radius( attributes.itemThumbRadius ),
		},
		removeText: {
			...typographyPreviewStyle( attributes, 'itemRemove', tier ),
			color: colour( attributes.itemRemoveColour ),
			borderBottomColor: colour( attributes.itemRemoveBorderColour ),
			// A text decoration replaces the drawn line under the link, as includes/helpers-cart-panel-items-css.php does.
			borderBottomWidth: attributes.itemRemoveTextDecoration
				? 0
				: undefined,
			...tierBoxLonghands(
				attributes.itemRemovePadding,
				tier,
				'padding'
			),
		},
		// The number between the stepper buttons. It is bold by default, so the stepper's weight is set on it too, as
		// includes/helpers-cart-panel-css.php does.
		qtyNumber: {
			width: tierLengthPreview( attributes.itemQtyNumberWidth, tier ),
			minWidth: tierLengthPreview( attributes.itemQtyNumberWidth, tier ),
			fontWeight: attributes.itemQtyFontWeight || undefined,
		},
		emptyBody: {
			...typographyPreviewStyle( attributes, 'emptyBody', tier ),
			color: colour( attributes.emptyBodyColour ),
			maxWidth: tierLengthPreview( attributes.emptyBodyMaxWidth, tier ),
		},
		emptyLink: {
			...typographyPreviewStyle( attributes, 'emptyLink', tier ),
			color: colour( attributes.emptyLinkColour ),
			...tierBoxLonghands( attributes.emptyLinkPadding, tier, 'padding' ),
		},
		// The gift box, its label, helper line and fields (render: includes/helpers-cart-panel-items-css.php).
		giftBox: {
			backgroundColor: colour( attributes.giftBoxBg ),
			...sgsBorderPreview(
				{
					widthValues: attributes.giftBoxBorderWidth,
					styleValue: attributes.giftBoxBorderStyle,
					colourValue: attributes.giftBoxBorderColour,
				},
				tier,
				palette
			),
			borderRadius: radius( attributes.giftBoxRadius ),
			...tierBoxLonghands( attributes.giftBoxPadding, tier, 'padding' ),
			...tierBoxLonghands( attributes.giftBoxMargin, tier, 'margin' ),
		},
		giftLabel: {
			...typographyPreviewStyle( attributes, 'giftLabel', tier ),
		},
		giftHelp: {
			...typographyPreviewStyle( attributes, 'giftHelp', tier ),
			color: colour( attributes.giftHelpColour ),
			opacity: attributes.giftHelpColour ? 1 : undefined,
		},
		giftField: {
			backgroundColor: colour( attributes.giftFieldBg ),
			...sgsBorderPreview(
				{
					widthValues: attributes.giftFieldBorderWidth,
					styleValue: attributes.giftFieldBorderStyle,
					colourValue: attributes.giftFieldBorderColour,
				},
				tier,
				palette
			),
			borderRadius: radius( attributes.giftFieldRadius ),
			...tierBoxLonghands( attributes.giftFieldPadding, tier, 'padding' ),
		},
		giftMessage: {
			...typographyPreviewStyle( attributes, 'giftMessage', tier ),
		},
		// The upsell row under the basket lines (render: includes/helpers-cart-panel-extras.php::sgs_cart_upsell_html).
		upsell: {
			backgroundColor: colour( attributes.upsellBg ),
			borderRadius: radius( attributes.upsellRadius ),
			...tierBoxLonghands( attributes.upsellPadding, tier, 'padding' ),
		},
		upsellImage: {
			width: tierLengthPreview( attributes.upsellImageSize, tier ),
			height: tierLengthPreview( attributes.upsellImageSize, tier ),
			borderRadius: radius( attributes.upsellImageRadius ),
		},
		upsellTitle: {
			...typographyPreviewStyle( attributes, 'upsellTitle', tier ),
		},
		upsellText: {
			...typographyPreviewStyle( attributes, 'upsellText', tier ),
			color: colour( attributes.upsellTextColour ),
		},
		upsellButton: {
			...typographyPreviewStyle( attributes, 'upsellButton', tier ),
			backgroundColor: colour( attributes.upsellButtonBg ),
			color: colour( attributes.upsellButtonColour ),
			...sgsBorderPreview(
				{
					widthValues: attributes.upsellButtonBorderWidth,
					styleValue: attributes.upsellButtonBorderStyle,
					colourValue: attributes.upsellButtonBorderColour,
				},
				tier,
				palette
			),
			borderRadius: radius( attributes.upsellButtonRadius ),
			...tierBoxLonghands(
				attributes.upsellButtonPadding,
				tier,
				'padding'
			),
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
			height: tierLengthPreview(
				attributes.freeDeliveryTrackHeight,
				tier
			),
			...tierBoxLonghands(
				attributes.freeDeliveryBarMargin,
				tier,
				'margin'
			),
			borderRadius: radius( attributes.freeDeliveryTrackRadius ),
		},
		items: {
			gap: tierLengthPreview( attributes.panelBodyGap, tier ),
			...tierBoxLonghands( attributes.panelBodyPadding, tier, 'padding' ),
			'--sgs-cart-item-thumb': tierLengthPreview(
				attributes.itemThumbSize,
				tier
			),
		},
		item: {
			gap: tierLengthPreview( attributes.itemGap, tier ),
		},
		view: {
			...typographyPreviewStyle( attributes, 'panelView', tier ),
			color: colour( attributes.panelViewColour ),
			borderRadius: radius( attributes.checkoutRadius ),
		},
	};
	// An unset setting is left off so the element keeps the stylesheet's own value.
	Object.keys( styles ).forEach( ( key ) => {
		styles[ key ] = Object.fromEntries(
			Object.entries( styles[ key ] ).filter(
				( [ , value ] ) => undefined !== value && '' !== value
			)
		);
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
	const style = {
		...textPaintPreview(
			attributes.panelTextColour,
			attributes.panelTextColourGradient,
			palette
		),
	};
	const fill = backgroundPaintPreview(
		attributes.panelBg,
		attributes.panelBgGradient,
		palette
	);
	if ( fill.backgroundImage || fill.backgroundColor ) {
		style[ '--sgs-cart-editor-panel-fill' ] =
			fill.backgroundImage || fill.backgroundColor;
	}
	const maxWidth = tierLengthPreview( attributes.panelMaxWidth, tier );
	if ( maxWidth ) {
		style.maxWidth = maxWidth;
	}
	const shadow = resolveShadowPreviewComposed(
		attributes.panelShadow,
		attributes.panelShadowColour
	);
	if ( shadow ) {
		style.boxShadow = shadow;
	}
	const track = resolveColourToken(
		attributes.freeDeliveryTrackColour,
		palette
	);
	if ( track ) {
		style[ '--sgs-cart-free-delivery-track' ] = track;
	}
	return style;
}

/**
 * The trigger's width and height at a device, each as a CSS length (a preset slug becomes its spacing variable), inheriting the
 * device above, as render-scoped-css.php prints them.
 *
 * @param {Object} size `{desktop:{width,height},…}`.
 * @param {string} tier The previewed device.
 * @return {{width: string, height: string}} Empty strings for a side with no value.
 */
function resolveTriggerSize( size, tier ) {
	const order = [ 'desktop', 'tablet', 'mobile' ].slice(
		0,
		[ 'desktop', 'tablet', 'mobile' ].indexOf( tier ) + 1
	);
	const out = { width: '', height: '' };
	order.forEach( ( device ) => {
		[ 'width', 'height' ].forEach( ( side ) => {
			const raw = size?.[ device ]?.[ side ];
			out[ side ] = sgsLengthPreview( raw ) || out[ side ];
		} );
	} );
	return out;
}

/**
 * Trigger, pill label and count badge styles (render.php's pill and badge rules).
 *
 * The badge and the trigger each draw their fill on a `::after` layer in
 * editor.css, fed by a custom property, exactly as render.php does.
 *
 * @param {Object}  attributes Block attributes.
 * @param {string}  tier       Previewed device tier.
 * @param {Array}   palette    Theme colour palette.
 * @param {boolean} hasPill    Whether the trigger is the pill style.
 * @return {{trigger: Object, pillLabel: Object, badge: Object}} Styles.
 */
export function triggerStyles( attributes, tier, palette, hasPill ) {
	const badge = {
		...textPaintPreview(
			attributes.badgeTextColour,
			attributes.badgeTextColourGradient,
			palette
		),
	};
	// A plain pill count inherits the pill label's typography; the icon badge and the bubble use their own.
	if ( ! hasPill || 'bubble' === attributes.pillCountStyle ) {
		Object.assign(
			badge,
			typographyPreviewStyle( attributes, 'badge', tier )
		);
	}
	// render-scoped-css.php paints badgeColour (solid) or badgeColourGradient on the badge's ::after.
	const badgeFill = backgroundPaintPreview(
		attributes.badgeColour,
		attributes.badgeColourGradient,
		palette
	);
	if ( badgeFill.backgroundImage || badgeFill.backgroundColor ) {
		badge[ '--sgs-cart-editor-badge-fill' ] =
			badgeFill.backgroundImage || badgeFill.backgroundColor;
	}
	// The trigger's own look, shared by the icon button and the pill. Each style keeps its own background (pillBgColour or iconBg),
	// painted on the trigger's ::after layer (render-scoped-css.php); a size set at this device replaces the 44px tap floor and
	// prints as saved (no minimum), and a pill takes the height only.
	const trigger = hasPill ? typographyPreviewStyle( attributes, 'pill', tier ) : {};
	const fill = hasPill
		? backgroundPaintPreview(
				attributes.pillBgColour,
				attributes.pillBgColourGradient,
				palette
		  )
		: backgroundPaintPreview(
				attributes.iconBg,
				attributes.iconBgGradient,
				palette
		  );
	if ( fill.backgroundImage || fill.backgroundColor ) {
		trigger[
			hasPill
				? '--sgs-cart-editor-pill-fill'
				: '--sgs-cart-editor-icon-fill'
		] = fill.backgroundImage || fill.backgroundColor;
	}
	const radius = sgsLengthPreview( attributes.triggerBorderRadius );
	if ( radius ) {
		trigger.borderRadius = radius;
	}
	const size = resolveTriggerSize( attributes.triggerSize, tier );
	if ( ! hasPill && size.width ) {
		trigger.minWidth = size.width;
	}
	if ( size.height ) {
		trigger.minHeight = size.height;
	}
	Object.assign(
		trigger,
		tierBoxLonghands( attributes.triggerPadding, tier, 'padding' )
	);
	if ( ! hasPill ) {
		return { trigger, pillLabel: {}, badge };
	}
	// The pill's stylesheet gives no width, so the border paints only beside a chosen width.
	Object.assign(
		trigger,
		sgsBorderPreview(
			{
				widthValues: attributes.pillBorderWidth,
				styleValue: attributes.pillBorderStyle,
				colourValue: attributes.pillBorderColour,
			},
			tier,
			palette
		)
	);
	// The pill's shadow, and the same value as --sgs-focus-under so the focus ring composes over it (render-scoped-css.php).
	const pillShadow = resolveShadowPreviewComposed(
		attributes.pillShadow,
		attributes.pillShadowColour
	);
	if ( pillShadow ) {
		trigger.boxShadow = pillShadow;
		trigger[ '--sgs-focus-under' ] = pillShadow;
	}
	return {
		trigger,
		pillLabel: textPaintPreview(
			attributes.pillTextColour,
			attributes.pillTextColourGradient,
			palette
		),
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
	const gradient = backgroundPaintPreview(
		'',
		attributes.scrimColourGradient,
		palette
	).backgroundImage;
	const fill =
		gradient ||
		resolveColourToken( attributes.scrimColour, palette ) ||
		'#000';
	const rawOpacity = resolveTier( attributes.scrimOpacity, tier, '' ).value;
	const opacity =
		'' !== rawOpacity && ! isNaN( Number( rawOpacity ) )
			? Math.max( 0, Math.min( 1, Number( rawOpacity ) ) )
			: 0;
	const style = { '--sgs-scrim-fill': fill, '--sgs-scrim-opacity': opacity };
	const blur = tierLengthPreview( attributes.scrimBlur, tier );
	if ( blur ) {
		style[ '--sgs-scrim-blur' ] = blur;
	}
	return style;
}
