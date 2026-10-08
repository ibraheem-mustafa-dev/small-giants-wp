/**
 * SGS Google Rating Badge: editor component.
 *
 * The canvas shows the real server render (the badge is dynamic: the figures come from the block, Site
 * Info or live Google data). Every inspector control reads and writes an attribute render.php consumes.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
	RangeControl,
} from '@wordpress/components';
import { NumberControl, ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';
import ServerSideRender from '../../components/ServerSideRender';
import {
	SgsColourPanel,
	SgsBorderControl,
	SgsBoxControl,
	ResponsiveOverride,
	ResponsiveLengthControl,
	ShadowControl,
	TypographyControls,
	LogicalAlignControl,
	SsrPreviewGuard,
	BOX_UNITS,
	normaliseResponsiveBox,
	fillRow,
	textRow,
} from '../../components';

const typoTarget = ( prefix, label ) => ( {
	key: prefix,
	label,
	prefix,
	showSize: true,
	showWeight: true,
	showStyle: true,
	showLineHeight: true,
	showResponsive: true,
	showFontFamily: true,
	showDecoration: true,
	showTransform: true,
	showLetterSpacing: true,
	showTextAlign: true,
	showTextWrap: true,
} );

/** A tier object of lengths ({desktop, tablet, mobile}) with one length per device. */
function TierLength( { label, attr, attributes, setAttributes } ) {
	return (
		<ResponsiveLengthControl
			label={ label }
			units={ BOX_UNITS }
			value={ attributes[ attr ] }
			onChange={ ( obj ) => setAttributes( { [ attr ]: obj } ) }
		/>
	);
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		badgeStyle,
		dataSource,
		rating,
		reviewCount,
		placeId,
		listingUrl,
		openInNewTab,
		linkLabel,
		showCount,
		showSource,
		compactBelow,
		position,
		floatingCorner,
		alignment,
		fullWidth,
		minHeight,
		borderWidth,
		borderStyle,
		borderColour,
		borderColourHover,
		backgroundColour,
		borderRadius,
	} = attributes;

	const blockProps = useBlockProps( { className: 'sgs-google-rating-badge-editor' } );
	const set = ( key ) => ( value ) => setAttributes( { [ key ]: value } );
	const usesManual = 'synced' !== dataSource;
	const usesLive = 'manual' !== dataSource;
	// null = the preset's own default (pill hides the source, card and stacked show it).
	const sourceDefault = 'pill' !== badgeStyle;
	const showSourceValue = null === showSource || undefined === showSource ? sourceDefault : showSource;

	const colourRows = [
		fillRow( {
			key: 'badgeBackground',
			label: __( 'Badge background', 'sgs-blocks' ),
			attrs: { base: 'backgroundColour', hover: 'backgroundColourHover' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'score',
			label: __( 'Score', 'sgs-blocks' ),
			attrs: { base: 'scoreColour' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'caption',
			label: __( 'Caption', 'sgs-blocks' ),
			attrs: { base: 'captionColour' },
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: 'stars',
			label: __( 'Stars', 'sgs-blocks' ),
			attrs: { base: 'starColour', gradient: 'starColourGradient' },
			attributes,
			setAttributes,
		} ),
		...( 'card' === badgeStyle
			? [
					fillRow( {
						key: 'accentStripe',
						label: __( 'Accent stripe', 'sgs-blocks' ),
						attrs: { base: 'accentStripeColour', gradient: 'accentStripeColourGradient' },
						attributes,
						setAttributes,
					} ),
			  ]
			: [] ),
	];

	return (
		<>
			<InspectorControls group="color">
				<SgsColourPanel rows={ colourRows } />
			</InspectorControls>
			<InspectorControls>
				<PanelBody title={ __( 'Style', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Badge style', 'sgs-blocks' ) }
						value={ badgeStyle }
						options={ [
							{ label: __( 'Pill (one line)', 'sgs-blocks' ), value: 'pill' },
							{ label: __( 'Card (accent stripe)', 'sgs-blocks' ), value: 'card' },
							{ label: __( 'Stacked (centred column)', 'sgs-blocks' ), value: 'stacked' },
						] }
						onChange={ set( 'badgeStyle' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<LogicalAlignControl
						label={ __( 'Alignment', 'sgs-blocks' ) }
						value={ alignment }
						defaultValue="start"
						onChange={ set( 'alignment' ) }
					/>
					<ToggleControl
						label={ __( 'Fill the width', 'sgs-blocks' ) }
						help={ __( 'The badge stretches across its container, like a full-width button.', 'sgs-blocks' ) }
						checked={ !! fullWidth }
						onChange={ ( value ) => setAttributes( { fullWidth: value } ) }
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __( 'Minimum height (px)', 'sgs-blocks' ) }
						value={ minHeight }
						onChange={ ( value ) => setAttributes( { minHeight: value ?? 44 } ) }
						min={ 0 }
						max={ 120 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				<PanelBody title={ __( 'Rating figures', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Where the figures come from', 'sgs-blocks' ) }
						value={ dataSource }
						options={ [
							{ label: __( 'Automatic (typed or Site Info, else live Google)', 'sgs-blocks' ), value: 'auto' },
							{ label: __( 'Typed here or Site Info only', 'sgs-blocks' ), value: 'manual' },
							{ label: __( 'Live Google data only', 'sgs-blocks' ), value: 'synced' },
						] }
						help={ __( 'With nothing real to show, the badge is not drawn on the live site.', 'sgs-blocks' ) }
						onChange={ set( 'dataSource' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ usesManual && (
						<>
							<RangeControl
								label={ __( 'Rating (out of 5)', 'sgs-blocks' ) }
								value={ rating }
								onChange={ ( value ) => setAttributes( { rating: value ?? 0 } ) }
								min={ 0 }
								max={ 5 }
								step={ 0.1 }
								help={ __( 'Leave at 0 to use the rating saved in Site Info.', 'sgs-blocks' ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<NumberControl
								label={ __( 'Number of reviews', 'sgs-blocks' ) }
								value={ reviewCount }
								min={ 0 }
								onChange={ ( value ) => setAttributes( { reviewCount: Math.max( 0, parseInt( value, 10 ) || 0 ) } ) }
								help={ __( 'Leave at 0 to use the count saved in Site Info.', 'sgs-blocks' ) }
								__next40pxDefaultSize
							/>
						</>
					) }
					{ usesLive && (
						<TextControl
							label={ __( 'Google place ID', 'sgs-blocks' ) }
							value={ placeId }
							onChange={ set( 'placeId' ) }
							help={ __( 'Leave empty to use the site-wide place ID.', 'sgs-blocks' ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
				</PanelBody>

				<PanelBody title={ __( 'Link and caption', 'sgs-blocks' ) } initialOpen={ false }>
					<TextControl
						label={ __( 'Link to (https only)', 'sgs-blocks' ) }
						value={ listingUrl }
						onChange={ set( 'listingUrl' ) }
						type="url"
						help={ __( 'Leave empty to use the Google Maps link, then the Google link in Site Info. With no https link the badge is not a link.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ToggleControl
						label={ __( 'Open in a new tab', 'sgs-blocks' ) }
						checked={ openInNewTab }
						onChange={ set( 'openInNewTab' ) }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Link label for screen readers', 'sgs-blocks' ) }
						value={ linkLabel }
						onChange={ set( 'linkLabel' ) }
						help={ __( 'Leave empty for "Rated 4.7 out of 5 on Google from 15 reviews".', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ToggleControl
						label={ __( 'Show the review count', 'sgs-blocks' ) }
						checked={ showCount }
						onChange={ set( 'showCount' ) }
						__nextHasNoMarginBottom
					/>
					{ 'synced' === dataSource ? (
						<p>{ __( 'Live Google data always shows "on Google Maps" (Google requires it).', 'sgs-blocks' ) }</p>
					) : (
						<ToggleControl
							label={ __( 'Show "on Google"', 'sgs-blocks' ) }
							help={ __( 'Live Google data always shows "on Google Maps", whatever this says.', 'sgs-blocks' ) }
							checked={ showSourceValue }
							onChange={ set( 'showSource' ) }
							__nextHasNoMarginBottom
						/>
					) }
				</PanelBody>

				<PanelBody title={ __( 'Small screens', 'sgs-blocks' ) } initialOpen={ false }>
					<RangeControl
						label={ __( 'Compact below (px)', 'sgs-blocks' ) }
						value={ compactBelow }
						onChange={ ( value ) => setAttributes( { compactBelow: value ?? 0 } ) }
						min={ 0 }
						max={ 2000 }
						step={ 10 }
						help={ __( 'Below this width the badge shows the G, one star and the score only. 0 turns it off.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				<PanelBody title={ __( 'Position', 'sgs-blocks' ) } initialOpen={ false }>
					<ToggleGroupControl
						label={ __( 'Position', 'sgs-blocks' ) }
						value={ position }
						onChange={ set( 'position' ) }
						isBlock
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					>
						<ToggleGroupControlOption value="static" label={ __( 'In the page', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="floating" label={ __( 'Floating', 'sgs-blocks' ) } />
					</ToggleGroupControl>
					{ 'floating' === position && (
						<>
							<ToggleGroupControl
								label={ __( 'Corner', 'sgs-blocks' ) }
								value={ floatingCorner }
								onChange={ set( 'floatingCorner' ) }
								isBlock
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							>
								<ToggleGroupControlOption value="bottom-right" label={ __( 'Bottom right', 'sgs-blocks' ) } />
								<ToggleGroupControlOption value="bottom-left" label={ __( 'Bottom left', 'sgs-blocks' ) } />
								<ToggleGroupControlOption value="top-right" label={ __( 'Top right', 'sgs-blocks' ) } />
								<ToggleGroupControlOption value="top-left" label={ __( 'Top left', 'sgs-blocks' ) } />
							</ToggleGroupControl>
							<TierLength
								label={ __( 'Distance from the corner', 'sgs-blocks' ) }
								attr="floatingOffset"
								attributes={ attributes }
								setAttributes={ setAttributes }
							/>
						</>
					) }
				</PanelBody>

				<PanelBody title={ __( 'Spacing', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveOverride value={ attributes.padding } onChange={ set( 'padding' ) }>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsBoxControl
								label={ __( 'Padding', 'sgs-blocks' ) }
								values={ ownValue && 'object' === typeof ownValue ? ownValue : {} }
								units={ BOX_UNITS }
								presets
								onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
							/>
						) }
					</ResponsiveOverride>
					<TierLength
						label={ __( 'Gap between the pieces', 'sgs-blocks' ) }
						attr="gap"
						attributes={ attributes }
						setAttributes={ setAttributes }
					/>
				</PanelBody>

				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
					<SgsBorderControl
						widthValues={ borderWidth ?? {} }
						onWidthChange={ set( 'borderWidth' ) }
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ borderStyle }
						onStyleChange={ ( value ) => setAttributes( { borderStyle: value || 'none' } ) }
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourStates={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: borderColour,
								onChange: ( value ) => setAttributes( { borderColour: value ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: borderColourHover,
								onChange: ( value ) => setAttributes( { borderColourHover: value ?? '' } ),
							},
						] }
						contrastAgainst={ backgroundColour }
						radiusValues={ {
							base: borderRadius?.desktop ?? {},
							tablet: borderRadius?.tablet ?? {},
							mobile: borderRadius?.mobile ?? {},
						} }
						onRadiusChange={ ( tier, next ) => {
							const key = 'base' === tier ? 'desktop' : tier;
							setAttributes( { borderRadius: { ...borderRadius, [ key ]: next } } );
						} }
					/>
				</PanelBody>

				<PanelBody title={ __( 'Shadow', 'sgs-blocks' ) } initialOpen={ false }>
					<ShadowControl
						label={ __( 'Shadow', 'sgs-blocks' ) }
						attributes={ attributes }
						setAttributes={ setAttributes }
						attrNames={ {
							base: 'shadow',
							colour: 'shadowColour',
							hoverColour: 'shadowColourHover',
						} }
					/>
				</PanelBody>

				<PanelBody title={ __( 'Typography', 'sgs-blocks' ) } initialOpen={ false }>
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						targets={ [
							typoTarget( 'score', __( 'Score', 'sgs-blocks' ) ),
							typoTarget( 'caption', __( 'Caption', 'sgs-blocks' ) ),
						] }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<SsrPreviewGuard>
					<ServerSideRender
						block="sgs/google-rating-badge"
						attributes={ attributes }
						EmptyResponsePlaceholder={ () => (
							<p className="sgs-google-rating-badge-editor__empty">
								{ __( 'Google rating badge: add a rating here or in Site Info (or connect Google) and it appears on the site.', 'sgs-blocks' ) }
							</p>
						) }
					/>
				</SsrPreviewGuard>
			</div>
		</>
	);
}
