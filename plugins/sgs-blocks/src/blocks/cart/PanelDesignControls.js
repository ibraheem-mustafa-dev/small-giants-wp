import { __ } from '@wordpress/i18n';
import { PanelBody, RangeControl } from '@wordpress/components';
import {
	MotionEasingControl,
	ResponsiveBoxControl,
	ResponsiveOverride,
	SgsLengthControl,
	SgsSeparatorControl,
	ShadowControl,
	shadowAttrKeys,
	TypographyControls,
} from '../../components';
import { spacingDefaultsFor } from '../../utils/spacing-defaults';

// Typography per panel text element: [prefix, label, fields]. The fields match
// the attributes block.json declares for that prefix.
const TEXT_TARGETS = [
	[ 'panelTitle', __( 'Heading', 'sgs-blocks' ), { showFontFamily: true } ],
	[ 'panelCount', __( 'Heading count', 'sgs-blocks' ), { showFontFamily: true, showWeight: false } ],
	[ 'emptyMessage', __( 'Empty message', 'sgs-blocks' ), { showFontFamily: true } ],
	[ 'panelEmpty', __( 'Empty block', 'sgs-blocks' ), { showSize: false, showWeight: false, showTextAlign: true } ],
	[ 'emptyCta', __( 'Empty button', 'sgs-blocks' ), { showLetterSpacing: true, showTransform: true } ],
	[ 'itemBrand', __( 'Item brand', 'sgs-blocks' ), { showWeight: false, showLetterSpacing: true, showTransform: true } ],
	[ 'itemName', __( 'Item name', 'sgs-blocks' ), {} ],
	[ 'itemDetail', __( 'Item details', 'sgs-blocks' ), { showWeight: false } ],
	[ 'itemPrice', __( 'Item price', 'sgs-blocks' ), {} ],
	[ 'itemAction', __( 'Item links', 'sgs-blocks' ), { showWeight: false } ],
	[ 'subtotal', __( 'Subtotal', 'sgs-blocks' ), {} ],
	[ 'freeDeliveryText', __( 'Free-delivery message', 'sgs-blocks' ), { showWeight: false } ],
	[ 'checkout', __( 'Checkout button', 'sgs-blocks' ), { showLetterSpacing: true, showTransform: true } ],
	[ 'panelNote', __( 'Note under Checkout', 'sgs-blocks' ), { showWeight: false, showTextAlign: true } ],
].map( ( [ prefix, label, fields ] ) => ( {
	key: prefix,
	prefix,
	label,
	showStyle: false,
	showLineHeight: false,
	...fields,
} ) );

// Per-device lengths: [attribute, label, default shown as the placeholder].
const LENGTHS = [
	[ 'panelMaxWidth', __( 'Panel width (maximum)', 'sgs-blocks' ), '400px' ],
	[ 'panelCloseSize', __( 'Close icon size', 'sgs-blocks' ), '24px' ],
	[ 'panelBodyGap', __( 'Space between items', 'sgs-blocks' ), '16px' ],
	[ 'itemThumbSize', __( 'Item image size', 'sgs-blocks' ), '64px' ],
	[ 'itemGap', __( 'Space beside the item image', 'sgs-blocks' ), '12px' ],
	[ 'emptyMessageGap', __( 'Space under the empty message', 'sgs-blocks' ), '12px' ],
	[ 'freeDeliveryTrackHeight', __( 'Free-delivery bar height', 'sgs-blocks' ), '6px' ],
	[ 'checkoutMinHeight', __( 'Checkout button height', 'sgs-blocks' ), '44px' ],
];

// Padding and margin boxes, per device: [attribute, label].
const BOXES = [
	[ 'panelHeadPadding', __( 'Head row padding', 'sgs-blocks' ) ],
	[ 'panelBodyPadding', __( 'Item list padding', 'sgs-blocks' ) ],
	[ 'panelFooterPadding', __( 'Footer padding', 'sgs-blocks' ) ],
	[ 'panelEmptyPadding', __( 'Empty block padding', 'sgs-blocks' ) ],
	[ 'emptyCtaPadding', __( 'Empty button padding', 'sgs-blocks' ) ],
	[ 'freeDeliveryBarMargin', __( 'Free-delivery bar margin', 'sgs-blocks' ) ],
];

// Corner radii (one value): [attribute, label].
const RADII = [
	[ 'itemThumbRadius', __( 'Item image corners', 'sgs-blocks' ) ],
	[ 'emptyCtaRadius', __( 'Empty button corners', 'sgs-blocks' ) ],
	[ 'checkoutRadius', __( 'Checkout and View cart corners', 'sgs-blocks' ) ],
	[ 'freeDeliveryTrackRadius', __( 'Free-delivery bar corners', 'sgs-blocks' ) ],
];

/**
 * SGS Cart — the mini-cart panel's design: text, sizes, spacing, corners,
 * shadow and the drawer's slide-in. Every value is scoped to the panel by
 * includes/helpers-cart-panel.php::sgs_cart_panel_css().
 *
 * @param {Object}   root0               Props.
 * @param {string}   root0.name          The block's registered name (reads its declared spacing defaults).
 * @param {Object}   root0.attributes    The block's current attributes.
 * @param {Function} root0.setAttributes The block's attribute setter.
 * @param {boolean}  root0.hasPanel      Whether displayMode is flyout|drawer.
 * @param {boolean}  root0.hasDrawer     Whether displayMode is drawer.
 */
export default function PanelDesignControls( { name, attributes, setAttributes, hasPanel, hasDrawer } ) {
	if ( ! hasPanel ) {
		return null;
	}
	return (
		<>
			<PanelBody title={ __( 'Mini-cart text', 'sgs-blocks' ) } initialOpen={ false }>
				<TypographyControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					targets={ TEXT_TARGETS }
				/>
			</PanelBody>

			<PanelBody title={ __( 'Mini-cart sizes and spacing', 'sgs-blocks' ) } initialOpen={ false }>
				{ LENGTHS.map( ( [ attr, label, fallback ] ) => (
					<ResponsiveOverride
						key={ attr }
						label={ label }
						value={ attributes[ attr ] }
						onChange={ ( obj ) => setAttributes( { [ attr ]: obj } ) }
					>
						{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
							<SgsLengthControl
								presets={ false }
								label={ label }
								hideLabelFromVision
								value={ ownValue || '' }
								placeholder={ inherited ? effectiveValue : fallback }
								onChange={ ( val ) => setOwnValue( val || '' ) }
							/>
						) }
					</ResponsiveOverride>
				) ) }
				<SgsSeparatorControl
					label={ __( 'Lines between items', 'sgs-blocks' ) }
					value={ attributes.separators }
					onChange={ ( next ) => setAttributes( { separators: next } ) }
					axes={ [ 'row' ] }
				/>
				{ BOXES.map( ( [ attr, label ] ) => (
					<ResponsiveBoxControl
						key={ attr }
						label={ label }
						presets
						defaults={ spacingDefaultsFor( name, attr ) }
						values={ {
							base: attributes[ attr ]?.desktop ?? {},
							tablet: attributes[ attr ]?.tablet ?? {},
							mobile: attributes[ attr ]?.mobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							const key = 'base' === tier ? 'desktop' : tier;
							setAttributes( { [ attr ]: { ...( attributes[ attr ] || {} ), [ key ]: next } } );
						} }
					/>
				) ) }
				{ RADII.map( ( [ attr, label ] ) => (
					<SgsLengthControl
						key={ attr }
						presets={ false }
						label={ label }
						value={ attributes[ attr ] || '' }
						onChange={ ( val ) => setAttributes( { [ attr ]: val || '' } ) }
					/>
				) ) }
			</PanelBody>

			<PanelBody title={ __( 'Mini-cart shadow and motion', 'sgs-blocks' ) } initialOpen={ false }>
				<ShadowControl
					label={ __( 'Panel shadow', 'sgs-blocks' ) }
					attributes={ attributes }
					setAttributes={ setAttributes }
					attrNames={ shadowAttrKeys( 'panelShadow' ) }
				/>
				{ hasDrawer && (
					<>
						<RangeControl
							label={ __( 'Slide-in time (ms)', 'sgs-blocks' ) }
							help={ __( '0 keeps the 250ms default.', 'sgs-blocks' ) }
							value={ attributes.panelSlideDuration ?? 0 }
							min={ 0 }
							max={ 3000 }
							step={ 10 }
							onChange={ ( val ) => setAttributes( { panelSlideDuration: val ?? 0 } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						<MotionEasingControl
							label={ __( 'Slide-in speed curve', 'sgs-blocks' ) }
							value={ attributes.panelSlideEasing }
							custom={ attributes.panelSlideEasingCustom }
							fallback="ease-out-css"
							onChange={ ( value ) => setAttributes( { panelSlideEasing: value } ) }
							onCustomChange={ ( value ) => setAttributes( { panelSlideEasingCustom: value } ) }
						/>
					</>
				) }
			</PanelBody>
		</>
	);
}
