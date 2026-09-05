import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl, ToggleControl, SelectControl, Icon } from '@wordpress/components';
import { ResponsiveBoxControl, SgsColourPanel, fillRow, textRow,
	SgsBorderControl,
	resolveColourToken,
	MediaElementPanel,
} from '../../components';

/**
 * Editor view for sgs/buybox.
 *
 * Static placeholder panel — the block is fully server-rendered on the
 * product page (render.php resolves the product from context.postId).
 * A live ServerSideRender preview is deliberately avoided: outside a
 * product template context there is no product to render, so the preview
 * would always show the core-blocks fallback and mislead operators.
 */
export default function Edit( { attributes, setAttributes } ) {
	const {
		soldOutLabel,
		unavailableLabel,
		notifyEnabled,
		notifyMeLabel,
		addToCartLabel,
		perUnitDenomination,
		dragToScroll,
		dragMomentum,
		loopCarousel,
		showLadder,
		framingMode,
		decoyEnabled,
		style,
		marginTablet,
		marginMobile,
		backgroundColour,
		backgroundColourGradient,
	} = attributes;

	const colourRows = [
		fillRow( {
			key: 'background',
			label: __( 'Background colour', 'sgs-blocks' ),
			attrs: {
				base: 'backgroundColour',
				hover: 'backgroundColourHover',
				gradient: 'backgroundColourGradient',
				hoverGradient: 'backgroundColourHoverGradient',
			},
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'text',
			label: __( 'Text colour', 'sgs-blocks' ),
			attrs: {
				base: 'textColour',
				hover: 'textColourHover',
				gradient: 'textColourGradient',
				hoverGradient: 'textColourHoverGradient',
			},
			attributes,
			setAttributes,
		} ),
	];

	// Contrast check for border colour against the buybox's own background.
	// When the background has a gradient sibling, skip the check (flat colour would be inaccurate).
	const buyboxContrastAgainst =
		backgroundColour && ! backgroundColourGradient
			? backgroundColour
			: '';

	const blockProps = useBlockProps( {
		className: 'sgs-buybox sgs-buybox--editor-placeholder',
	} );

	return (
		<>
			<SgsColourPanel rows={ colourRows } />

			<InspectorControls>
				<PanelBody title={ __( 'Buybox labels', 'sgs-blocks' ) }>
					<TextControl
						label={ __( 'Add to Cart label', 'sgs-blocks' ) }
						value={ addToCartLabel }
						onChange={ ( val ) =>
							setAttributes( { addToCartLabel: val } )
						}
						placeholder={ __( 'Add to Cart', 'sgs-blocks' ) }
						help={ __(
							'Empty = the default translated label.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __( 'Per-unit denomination', 'sgs-blocks' ) }
						value={ perUnitDenomination }
						onChange={ ( val ) =>
							setAttributes( { perUnitDenomination: val } )
						}
						placeholder={ __( 'per %s', 'sgs-blocks' ) }
						help={ __(
							'Override the per-unit label. %s is replaced with the unit label (e.g. "per bar", "per 100g"). Empty = translated default.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __( 'Sold-out label', 'sgs-blocks' ) }
						value={ soldOutLabel }
						onChange={ ( val ) =>
							setAttributes( { soldOutLabel: val } )
						}
						help={ __(
							'Screen-reader suffix on pills whose combination is sold out.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __( 'Unavailable label', 'sgs-blocks' ) }
						value={ unavailableLabel }
						onChange={ ( val ) =>
							setAttributes( { unavailableLabel: val } )
						}
						help={ __(
							'Screen-reader suffix on pills whose combination does not exist.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ToggleControl
						label={ __( 'Show back-in-stock notify form', 'sgs-blocks' ) }
						checked={ notifyEnabled }
						onChange={ ( val ) =>
							setAttributes( { notifyEnabled: val } )
						}
						help={ __(
							'Show the email-capture form on out-of-stock variations so shoppers can request a notification.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Notify-me label', 'sgs-blocks' ) }
						value={ notifyMeLabel }
						onChange={ ( val ) =>
							setAttributes( { notifyMeLabel: val } )
						}
						help={ __(
							'Heading shown above the email form when a variation is out of stock.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
				<PanelBody
					title={ __( 'Gallery interaction', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					{ /*
					 * Draggable + Inertia roster opt-in (Spec 38 FR-38-13,
					 * register Step 3). Targets the thumbnail strip, not the
					 * block root — mirrors sgs/gallery's toggle exactly.
					 */ }
					<ToggleControl
						label={ __(
							'Drag to scroll thumbnails (desktop)',
							'sgs-blocks'
						) }
						checked={ dragToScroll }
						onChange={ ( val ) =>
							setAttributes( { dragToScroll: val } )
						}
						help={ __(
							'Lets shoppers click and drag with a mouse to scroll the thumbnail strip, on top of the usual swipe and scrollbar.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					{ dragToScroll && (
						<ToggleControl
							label={ __( 'Momentum', 'sgs-blocks' ) }
							checked={ dragMomentum }
							onChange={ ( val ) =>
								setAttributes( { dragMomentum: val } )
							}
							help={ __(
								'Strip keeps coasting briefly after the shopper releases the drag, like a real scroll flick.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
					) }
					{ /*
					 * Infinite loop (Spec 38 §11 loop FR). Deliberately its OWN
					 * toggle, not gated behind "Drag to scroll thumbnails" —
					 * Bean's ruling: looping is an independent control,
					 * combinable with drag or used entirely on its own (native
					 * swipe/scrollbar/keyboard still loop with drag off).
					 * Mirrors sgs/gallery's toggle exactly. Default off.
					 */ }
					<ToggleControl
						label={ __( 'Loop', 'sgs-blocks' ) }
						checked={ loopCarousel }
						onChange={ ( val ) =>
							setAttributes( { loopCarousel: val } )
						}
						help={ __(
							'Scrolling or dragging past the last thumbnail continues into the first, and back again — never a dead end.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ /* ── Value ladder panel ── */ }
				<PanelBody
					title={ __( 'Value ladder', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __( 'Show price ladder', 'sgs-blocks' ) }
						help={ __(
							'Off shows just the price and per-item note — suited to browsing grids.',
							'sgs-blocks'
						) }
						checked={ false !== showLadder }
						onChange={ ( v ) =>
							setAttributes( { showLadder: v } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Savings framing', 'sgs-blocks' ) }
						help={ __(
							'How per-unit savings are worded on the price-per-unit ladder. Savings only show when a single-unit reference price is set + confirmed on the product editor.',
							'sgs-blocks'
						) }
						value={ framingMode || 'loss-aversion' }
						options={ [
							{
								value: 'loss-aversion',
								label: __(
									'Loss aversion ("save 8p each vs buying singly")',
									'sgs-blocks'
								),
							},
							{
								value: 'savings',
								label: __(
									'Savings ("save 8p each")',
									'sgs-blocks'
								),
							},
							{
								value: 'neutral',
								label: __(
									'Neutral (no saving text)',
									'sgs-blocks'
								),
							},
						] }
						onChange={ ( v ) =>
							setAttributes( { framingMode: v } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ToggleControl
						label={ __(
							'Promote the second-largest pack',
							'sgs-blocks'
						) }
						help={ __(
							'Places a "Most popular" badge on the second-largest pack (decoy pricing). A per-product setting on the product editor overrides this for that product.',
							'sgs-blocks'
						) }
						checked={ !! decoyEnabled }
						onChange={ ( v ) =>
							setAttributes( { decoyEnabled: v } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			{ /* ── Styles tab ─────────────────────────────────────────────── */ }
			<InspectorControls group="styles">
				<PanelBody
					title={ __( 'Gallery images', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					{ /* Two independently-scoped media elements — 'main' is the
					     large PDP display image, 'thumb' is the thumbnail-rail
					     image (a distinct role, not the same image rendered
					     twice). Mirrors sgs/before-after's before/after pattern
					     so a client can set a different fit for each. Rule
					     37-media-no-handroll. */ }
					<p className="sgs-buybox__media-panel-label">
						{ __( 'Main image', 'sgs-blocks' ) }
					</p>
					<MediaElementPanel
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix="main"
						blockSlug="sgs/buybox"
						insertion="element"
						atoms={ [ 'object-fit' ] }
						mediaType="image"
						scope="element"
					/>
					<p className="sgs-buybox__media-panel-label">
						{ __( 'Thumbnail images', 'sgs-blocks' ) }
					</p>
					<MediaElementPanel
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix="thumb"
						blockSlug="sgs/buybox"
						insertion="element"
						atoms={ [ 'object-fit' ] }
						mediaType="image"
						scope="element"
					/>
				</PanelBody>
				<PanelBody
					title={ __( 'Spacing', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ResponsiveBoxControl
						label={ __( 'Margin', 'sgs-blocks' ) }
						presets
						values={ {
							base: style?.spacing?.margin ?? {},
							tablet: marginTablet ?? {},
							mobile: marginMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( 'base' === tier ) {
								setAttributes( { style: { ...style, spacing: { ...style?.spacing, margin: next } } } );
							} else {
								setAttributes( { [ `margin${ 'tablet' === tier ? 'Tablet' : 'Mobile' }` ]: next } );
							}
						} }
					/>
				</PanelBody>
				{ /* NOTE (2026-09-03 investigation): this panel currently shows as
				   EXEMPT from routing in the inspector-scan `01-tab-group` report
				   because `borderColourGradient`'s DB row (block_attributes) has a
				   NULL css_property, so the detector misreads it as a structural
				   no-CSS anchor. That DB row is wrong — border-colour-gradient is
				   real CSS (sgs/accordion's equivalent row correctly carries
				   'border-color-gradient'). This IS genuine border styling (width/
				   style/colour/radius are all real CSS), so it is routed to Styles
				   here to match sgs/accordion's Border panel — do not revert this
				   once the DB row is corrected and the exemption naturally clears. */ }
				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
					<SgsBorderControl
						widthValues={ attributes.borderWidth ?? {} }
						onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ attributes.borderStyle }
						onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourValue={ attributes.borderColour }
						onColourChange={ ( val ) => setAttributes( { borderColour: val ?? '' } ) }
						colourGradientValue={ attributes.borderColourGradient }
						onColourGradientChange={ ( val ) => setAttributes( { borderColourGradient: val ?? '' } ) }
						colourLinked={ true }
						contrastAgainst={ buyboxContrastAgainst }
						radiusValues={ {
								base: attributes.borderRadius?.desktop ?? {},
								tablet: attributes.borderRadius?.tablet ?? {},
								mobile: attributes.borderRadius?.mobile ?? {},
							} }
						onRadiusChange={ ( tier, next ) => {
							const key = tier === 'base' ? 'desktop' : tier;
							setAttributes( { borderRadius: { ...attributes.borderRadius, [ key ]: next } } );
						} }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<Icon icon="cart" size={ 32 } />
				<p className="sgs-buybox__placeholder-title">
					{ __( 'Buybox', 'sgs-blocks' ) }
				</p>
				<p className="sgs-buybox__placeholder-help">
					{ __(
						'Renders the product configurator (option pills, live price, add to cart) on the product page. Simple products fall back to the standard WooCommerce price and add-to-cart blocks.',
						'sgs-blocks'
					) }
				</p>
			</div>
		</>
	);
}
