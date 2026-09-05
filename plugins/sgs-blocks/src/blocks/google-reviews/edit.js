/**
 * Google Reviews — Editor Component
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import {
	InspectorControls,
	useBlockProps,
} from '@wordpress/block-editor';
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';
import {
	PanelBody,
	SelectControl,
	ToggleControl,
	RangeControl,
	TextControl,
	Notice,
	ToolsPanel,
	ToolsPanelItem,
} from '@wordpress/components';
import { ResponsiveOverride,
	SgsBorderControl,
	resolveColourToken,
	DesignTokenPicker,
} from '../../components';
import MediaElementPanel from '../../components/MediaElementPanel';

export default function Edit( { attributes, setAttributes } ) {
	const {
		variant,
		placeId,
		columns,
		maxReviews,
		minRating,
		textOnly,
		excludeKeywords,
		sortBy,
		showAggregate,
		showBreakdown,
		showAvatar,
		showDate,
		showGoogleLogo,
		reviewRequestUrl,
		theme,
		cardStyle,
		starColour,
		starColourGradient,
		starColourHover,
		autoplay,
		autoplaySpeed,
		showDots,
		showArrows,
		dragToScroll,
		dragMomentum,
		loopCarousel,
		writeReviewColourBackground,
		writeReviewColourBackgroundHover,
		writeReviewColourBackgroundGradient,
		writeReviewColourBackgroundHoverGradient,
		writeReviewColourText,
		writeReviewColourTextHover,
		writeReviewColourTextGradient,
		writeReviewColourTextHoverGradient,
		arrowColourBackground,
		arrowColourBackgroundHover,
		arrowColourBackgroundGradient,
		arrowColourBackgroundHoverGradient,
		arrowColourText,
		arrowColourTextHover,
		arrowColourTextGradient,
		arrowColourTextHoverGradient,
		arrowColourBorder,
		arrowColourBorderHover,
		arrowColourBorderGradient,
		arrowColourBorderHoverGradient,
		dotColour,
		dotColourHover,
		dotColourGradient,
		dotColourHoverGradient,
	} = attributes;

	const blockProps = useBlockProps( {
		className: `sgs-google-reviews sgs-google-reviews--${ variant } sgs-google-reviews--theme-${ theme }`,
	} );

	return (
		<>
			{ /* Spec 35 THE PLACEMENT RULE (D537) — the single mixed "Colour"
			   panel is split per declared element: star fill -> "Star icon";
			   arrow text/fill/border+hover -> "Slider arrow"; write-review
			   text/fill+hover -> "Write-review button". Built directly with
			   DesignTokenPicker (mirrors what SgsColourPanel does internally)
			   since SgsColourPanel has no per-caller title override and each
			   element needs its own panel name. `dotColour` (the slider
			   pagination dot) has NO declared element in block.json's
			   supports.sgs.elements — an unclaimed `fill`-family attribute —
			   so it keeps its own small property-family panel rather than
			   being folded into an element it doesn't belong to. */ }
			<InspectorControls group="styles">
				<PanelBody title={ __( 'Star icon', 'sgs-blocks' ) } className="sgs-colour-panel">
					<DesignTokenPicker
						label={ __( 'Star colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: starColour,
								onChange: ( val ) => setAttributes( { starColour: val || 'accent' } ),
								gradientValue: starColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { starColourGradient: val ?? '' } ),
								linked: true,
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: starColourHover,
								onChange: ( val ) => setAttributes( { starColourHover: val ?? '' } ),
								linked: true,
							},
						] }
					/>
				</PanelBody>
			</InspectorControls>

			<InspectorControls group="styles">
				<PanelBody title={ __( 'Slider arrow', 'sgs-blocks' ) } className="sgs-colour-panel">
					<DesignTokenPicker
						label={ __( 'Slider arrow background', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: arrowColourBackground,
								onChange: ( val ) => setAttributes( { arrowColourBackground: val ?? '' } ),
								gradientValue: arrowColourBackgroundGradient,
								onGradientChange: ( val ) =>
									setAttributes( { arrowColourBackgroundGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: arrowColourBackgroundHover,
								onChange: ( val ) => setAttributes( { arrowColourBackgroundHover: val ?? '' } ),
								gradientValue: arrowColourBackgroundHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { arrowColourBackgroundHoverGradient: val ?? '' } ),
							},
						] }
					/>
					<DesignTokenPicker
						label={ __( 'Slider arrow icon colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: arrowColourText,
								onChange: ( val ) => setAttributes( { arrowColourText: val ?? '' } ),
								gradientValue: arrowColourTextGradient,
								onGradientChange: ( val ) => setAttributes( { arrowColourTextGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: arrowColourTextHover,
								onChange: ( val ) => setAttributes( { arrowColourTextHover: val ?? '' } ),
								gradientValue: arrowColourTextHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { arrowColourTextHoverGradient: val ?? '' } ),
							},
						] }
					/>
					<DesignTokenPicker
						label={ __( 'Slider arrow border', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: arrowColourBorder,
								onChange: ( val ) => setAttributes( { arrowColourBorder: val ?? '' } ),
								gradientValue: arrowColourBorderGradient,
								onGradientChange: ( val ) =>
									setAttributes( { arrowColourBorderGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: arrowColourBorderHover,
								onChange: ( val ) => setAttributes( { arrowColourBorderHover: val ?? '' } ),
								gradientValue: arrowColourBorderHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { arrowColourBorderHoverGradient: val ?? '' } ),
							},
						] }
					/>
				</PanelBody>
			</InspectorControls>

			<InspectorControls group="styles">
				<PanelBody title={ __( 'Write-review button', 'sgs-blocks' ) } className="sgs-colour-panel">
					<DesignTokenPicker
						label={ __( 'Write-review button background', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: writeReviewColourBackground,
								onChange: ( val ) => setAttributes( { writeReviewColourBackground: val ?? '' } ),
								gradientValue: writeReviewColourBackgroundGradient,
								onGradientChange: ( val ) =>
									setAttributes( { writeReviewColourBackgroundGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: writeReviewColourBackgroundHover,
								onChange: ( val ) => setAttributes( { writeReviewColourBackgroundHover: val ?? '' } ),
								gradientValue: writeReviewColourBackgroundHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { writeReviewColourBackgroundHoverGradient: val ?? '' } ),
							},
						] }
					/>
					<DesignTokenPicker
						label={ __( 'Write-review button text', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: writeReviewColourText,
								onChange: ( val ) => setAttributes( { writeReviewColourText: val ?? '' } ),
								gradientValue: writeReviewColourTextGradient,
								onGradientChange: ( val ) =>
									setAttributes( { writeReviewColourTextGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: writeReviewColourTextHover,
								onChange: ( val ) => setAttributes( { writeReviewColourTextHover: val ?? '' } ),
								gradientValue: writeReviewColourTextHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { writeReviewColourTextHoverGradient: val ?? '' } ),
							},
						] }
					/>
				</PanelBody>
			</InspectorControls>

			{ /* dotColour — unclaimed `fill`-family attribute, no declared
			   element. Kept as its own minimal property-family panel rather
			   than folded into an element panel it does not belong to. */ }
			<InspectorControls group="styles">
				<PanelBody title={ __( 'Fill', 'sgs-blocks' ) } className="sgs-colour-panel">
					<DesignTokenPicker
						label={ __( 'Slider pagination dot colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: dotColour,
								onChange: ( val ) => setAttributes( { dotColour: val ?? '' } ),
								gradientValue: dotColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { dotColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: dotColourHover,
								onChange: ( val ) => setAttributes( { dotColourHover: val ?? '' } ),
								gradientValue: dotColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { dotColourHoverGradient: val ?? '' } ),
							},
						] }
					/>
				</PanelBody>
			</InspectorControls>

			<InspectorControls>
				<ContainerWrapperControls attributes={ attributes } setAttributes={ setAttributes } kind="layout" />
				<PanelBody title={ __( 'Variant', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Display Type', 'sgs-blocks' ) }
						value={ variant }
						options={ [
							{ label: __( 'Grid', 'sgs-blocks' ), value: 'grid' },
							{ label: __( 'Slider', 'sgs-blocks' ), value: 'slider' },
							{ label: __( 'List', 'sgs-blocks' ), value: 'list' },
							{ label: __( 'Badge', 'sgs-blocks' ), value: 'badge' },
							{ label: __( 'Floating Badge', 'sgs-blocks' ), value: 'floating-badge' },
							{ label: __( 'Wall (Masonry)', 'sgs-blocks' ), value: 'wall' },
						] }
						onChange={ ( value ) => setAttributes( { variant: value } ) }
						__next40pxDefaultSize
					/>
				</PanelBody>

				<PanelBody title={ __( 'Google Business Profile', 'sgs-blocks' ) }>
					<TextControl
						label={ __( 'Place ID', 'sgs-blocks' ) }
						value={ placeId }
						onChange={ ( value ) => setAttributes( { placeId: value } ) }
						help={ __( 'Leave empty to use default from plugin settings.', 'sgs-blocks' ) }
						__next40pxDefaultSize
					/>

					<Notice status="info" isDismissible={ false }>
						<p>{ __( 'Configure Google API key and default Place ID in Settings → SGS Blocks → Google Reviews.', 'sgs-blocks' ) }</p>
					</Notice>
				</PanelBody>

				{ /* INNER element (block.json's `inner`, the grid/flex layout —
				   Spec 35 THE PLACEMENT RULE TIER 1) — `columns` is its only
				   content control today. Was a generic "Layout" panel; renamed
				   so it reads as the element it actually belongs to rather
				   than a catch-all. */ }
				{ [ 'grid', 'slider', 'wall' ].includes( variant ) && (
					<PanelBody title={ __( 'Inner', 'sgs-blocks' ) }>
						{ /*
							  columns is a TIER OBJECT — ONE attr holding
							  {desktop,tablet,mobile} (Spec 35 pass 4). It must
							  therefore use ResponsiveOverride, which reads and
							  writes the object, NOT ResponsiveControl, which
							  writes one flat attr per tier.

							  ⛔ Do NOT revert this to `ResponsiveControl` + an
							  attrMap of `{desktop:'columns',
							  tablet:'columnsTablet', mobile:'columnsMobile'}`.
							  Those siblings are no longer declared by
							  block.json — WordPress silently discards them
							  (D338), and a raw number written to `columns`
							  itself coerces the object-typed attr to its
							  default, dropping the whole setting (D563 bug
							  class).
						*/ }
						<ResponsiveOverride
							label={ __( 'Columns', 'sgs-blocks' ) }
							value={ columns }
							onChange={ ( obj ) => setAttributes( { columns: obj } ) }
						>
							{ ( { tier, ownValue, effectiveValue, setOwnValue } ) => {
								const maxMap = { desktop: 4, tablet: 3, mobile: 2 };
								return (
									<RangeControl
										value={
											ownValue !== ''
												? ownValue
												: ( effectiveValue !== '' ? effectiveValue : ( maxMap[ tier ] || 3 ) )
										}
										onChange={ setOwnValue }
										min={ 1 }
										max={ maxMap[ tier ] }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								);
							} }
						</ResponsiveOverride>
					</PanelBody>
				) }

				<PanelBody title={ __( 'Filters', 'sgs-blocks' ) }>
					<RangeControl
						label={ __( 'Maximum Reviews', 'sgs-blocks' ) }
						value={ maxReviews }
						onChange={ ( value ) => setAttributes( { maxReviews: value } ) }
						min={ 1 }
						max={ 50 }
						__next40pxDefaultSize
					/>

					<RangeControl
						label={ __( 'Minimum Rating', 'sgs-blocks' ) }
						value={ minRating }
						onChange={ ( value ) => setAttributes( { minRating: value } ) }
						min={ 1 }
						max={ 5 }
						__next40pxDefaultSize
					/>

					<ToggleControl
						label={ __( 'Text reviews only', 'sgs-blocks' ) }
						help={ __( 'Hide reviews without written content', 'sgs-blocks' ) }
						checked={ textOnly }
						onChange={ ( value ) => setAttributes( { textOnly: value } ) }
					/>

					<TextControl
						label={ __( 'Exclude keywords', 'sgs-blocks' ) }
						value={ excludeKeywords }
						onChange={ ( value ) => setAttributes( { excludeKeywords: value } ) }
						help={ __( 'Comma-separated words to hide reviews containing these terms', 'sgs-blocks' ) }
						__next40pxDefaultSize
					/>

					<SelectControl
						label={ __( 'Sort by', 'sgs-blocks' ) }
						value={ sortBy }
						options={ [
							{ label: __( 'Newest', 'sgs-blocks' ), value: 'newest' },
							{ label: __( 'Highest rated', 'sgs-blocks' ), value: 'highest' },
							{ label: __( 'Lowest rated', 'sgs-blocks' ), value: 'lowest' },
						] }
						onChange={ ( value ) => setAttributes( { sortBy: value } ) }
						__next40pxDefaultSize
					/>
				</PanelBody>

				<PanelBody title={ __( 'Display Options', 'sgs-blocks' ) } initialOpen={ false }>
					<ToggleControl
						label={ __( 'Show aggregate rating', 'sgs-blocks' ) }
						checked={ showAggregate }
						onChange={ ( value ) => setAttributes( { showAggregate: value } ) }
					/>

					{ showAggregate && (
						<ToggleControl
							label={ __( 'Show rating breakdown', 'sgs-blocks' ) }
							checked={ showBreakdown }
							onChange={ ( value ) => setAttributes( { showBreakdown: value } ) }
						/>
					) }

					<ToggleControl
						label={ __( 'Show avatars', 'sgs-blocks' ) }
						checked={ showAvatar }
						onChange={ ( value ) => setAttributes( { showAvatar: value } ) }
					/>

					{ showAvatar && (
						<MediaElementPanel
							attributes={ attributes }
							setAttributes={ setAttributes }
							blockSlug="sgs/google-reviews"
							insertion="element"
							atoms={ [ 'object-fit' ] }
							mediaType="image"
						/>
					) }

					<ToggleControl
						label={ __( 'Show dates', 'sgs-blocks' ) }
						checked={ showDate }
						onChange={ ( value ) => setAttributes( { showDate: value } ) }
					/>

					<ToggleControl
						label={ __( 'Show Google logo', 'sgs-blocks' ) }
						help={ __( 'Required by Google attribution policy', 'sgs-blocks' ) }
						checked={ showGoogleLogo }
						onChange={ ( value ) => setAttributes( { showGoogleLogo: value } ) }
					/>

					<TextControl
						label={ __( 'Review request URL', 'sgs-blocks' ) }
						value={ reviewRequestUrl }
						onChange={ ( value ) => setAttributes( { reviewRequestUrl: value } ) }
						help={ __( 'Optional: link to Google review submission page', 'sgs-blocks' ) }
						type="url"
						__next40pxDefaultSize
					/>
				</PanelBody>

				<PanelBody title={ __( 'Appearance', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Theme', 'sgs-blocks' ) }
						value={ theme }
						options={ [
							{ label: __( 'Light', 'sgs-blocks' ), value: 'light' },
							{ label: __( 'Dark', 'sgs-blocks' ), value: 'dark' },
							{ label: __( 'Transparent', 'sgs-blocks' ), value: 'transparent' },
						] }
						onChange={ ( value ) => setAttributes( { theme: value } ) }
						__next40pxDefaultSize
					/>

					<SelectControl
						label={ __( 'Card Style', 'sgs-blocks' ) }
						value={ cardStyle }
						options={ [
							{ label: __( 'Flat', 'sgs-blocks' ), value: 'flat' },
							{ label: __( 'Bordered', 'sgs-blocks' ), value: 'bordered' },
							{ label: __( 'Elevated', 'sgs-blocks' ), value: 'elevated' },
						] }
						onChange={ ( value ) => setAttributes( { cardStyle: value } ) }
						__next40pxDefaultSize
					/>
				</PanelBody>

				{ variant === 'slider' && (
					<ToolsPanel
						label={ __( 'Slider Settings', 'sgs-blocks' ) }
						resetAll={ () =>
							setAttributes( {
								autoplay: false,
								autoplaySpeed: 5000,
								showDots: true,
								showArrows: true,
								dragToScroll: false,
								dragMomentum: true,
								loopCarousel: false,
							} )
						}
					>
						<ToolsPanelItem
							label={ __( 'Autoplay', 'sgs-blocks' ) }
							hasValue={ () => autoplay !== false }
							onDeselect={ () => setAttributes( { autoplay: false } ) }
							isShownByDefault
						>
							<ToggleControl
								label={ __( 'Autoplay', 'sgs-blocks' ) }
								checked={ autoplay }
								onChange={ ( value ) => setAttributes( { autoplay: value } ) }
							/>
						</ToolsPanelItem>

						{ autoplay && (
							<ToolsPanelItem
								label={ __( 'Autoplay Speed (ms)', 'sgs-blocks' ) }
								hasValue={ () => autoplaySpeed !== 5000 }
								onDeselect={ () => setAttributes( { autoplaySpeed: 5000 } ) }
							>
								<RangeControl
									label={ __( 'Autoplay Speed (ms)', 'sgs-blocks' ) }
									value={ autoplaySpeed }
									onChange={ ( value ) => setAttributes( { autoplaySpeed: value } ) }
									min={ 2000 }
									max={ 10000 }
									step={ 500 }
									__next40pxDefaultSize
								/>
							</ToolsPanelItem>
						) }

						<ToolsPanelItem
							label={ __( 'Show dots', 'sgs-blocks' ) }
							hasValue={ () => showDots !== true }
							onDeselect={ () => setAttributes( { showDots: true } ) }
						>
							<ToggleControl
								label={ __( 'Show dots', 'sgs-blocks' ) }
								checked={ showDots }
								onChange={ ( value ) => setAttributes( { showDots: value } ) }
							/>
						</ToolsPanelItem>

						<ToolsPanelItem
							label={ __( 'Show arrows', 'sgs-blocks' ) }
							hasValue={ () => showArrows !== true }
							onDeselect={ () => setAttributes( { showArrows: true } ) }
						>
							<ToggleControl
								label={ __( 'Show arrows', 'sgs-blocks' ) }
								checked={ showArrows }
								onChange={ ( value ) => setAttributes( { showArrows: value } ) }
							/>
						</ToolsPanelItem>

						{ /*
						 * Draggable + Inertia opt-in (Spec 38 FR-38-13),
						 * mirroring sgs/gallery. Desktop-only click-and-drag
						 * layered over the CSS scroll-snap this variant already
						 * renders — touch keeps its native scroll either way,
						 * so no "touch" caveat belongs in the help text.
						 */ }
						<ToolsPanelItem
							label={ __( 'Drag to scroll (desktop)', 'sgs-blocks' ) }
							hasValue={ () => dragToScroll !== false }
							onDeselect={ () => setAttributes( { dragToScroll: false } ) }
							isShownByDefault
						>
							<ToggleControl
								label={ __( 'Drag to scroll (desktop)', 'sgs-blocks' ) }
								checked={ dragToScroll }
								onChange={ ( value ) =>
									setAttributes( { dragToScroll: value } )
								}
								help={ __(
									'Lets visitors click and drag with a mouse to scroll the reviews, on top of the usual arrows, dots, swipe and scrollbar.',
									'sgs-blocks'
								) }
							/>
						</ToolsPanelItem>

						{ dragToScroll && (
							<ToolsPanelItem
								label={ __( 'Momentum', 'sgs-blocks' ) }
								hasValue={ () => dragMomentum !== true }
								onDeselect={ () => setAttributes( { dragMomentum: true } ) }
							>
								<ToggleControl
									label={ __( 'Momentum', 'sgs-blocks' ) }
									checked={ dragMomentum }
									onChange={ ( value ) =>
										setAttributes( { dragMomentum: value } )
									}
									help={ __(
										'Slider keeps coasting briefly after the visitor releases the drag, like a real scroll flick.',
										'sgs-blocks'
									) }
								/>
							</ToolsPanelItem>
						) }

						{ /*
						 * Infinite loop (Spec 38 §11 loop FR), mirroring
						 * sgs/gallery. Deliberately its OWN toggle, not gated
						 * behind "Drag to scroll" — Bean's ruling: looping is
						 * an independent control, combinable with drag or
						 * used entirely on its own (native swipe/scrollbar/
						 * keyboard/arrows/dots still loop with drag off).
						 * Default off, same as drag.
						 */ }
						<ToolsPanelItem
							label={ __( 'Loop', 'sgs-blocks' ) }
							hasValue={ () => loopCarousel !== false }
							onDeselect={ () => setAttributes( { loopCarousel: false } ) }
						>
							<ToggleControl
								label={ __( 'Loop', 'sgs-blocks' ) }
								checked={ loopCarousel }
								onChange={ ( value ) =>
									setAttributes( { loopCarousel: value } )
								}
								help={ __(
									'Scrolling, dragging or using the arrows past the last review continues into the first, and back again — never a dead end.',
									'sgs-blocks'
								) }
							/>
						</ToolsPanelItem>
					</ToolsPanel>
				) }
				{ /* WRAPPER element (isWrapper:true) — border/radius resolve to its
				   TIER-2 Layout property family (block.json attrMap: css:border-*
				   -> borderWidth/Style/Colour/Radius on the `layout` cluster).
				   Was a generic "Border" catch-all panel; renamed to the family
				   name per THE PLACEMENT RULE. */ }
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
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
				<div className="sgs-google-reviews__placeholder">
					<div className="sgs-google-reviews__placeholder-icon">⭐⭐⭐⭐⭐</div>
					<h3>{ __( 'Google Reviews', 'sgs-blocks' ) }</h3>
					<p>
						{ __( 'Configure Google API settings in WordPress admin to display reviews.', 'sgs-blocks' ) }
					</p>
					<p className="sgs-google-reviews__placeholder-settings">
						<strong>{ __( 'Variant:', 'sgs-blocks' ) }</strong> { variant }<br />
						<strong>{ __( 'Max Reviews:', 'sgs-blocks' ) }</strong> { maxReviews }<br />
						{ placeId && (
							<>
								<strong>{ __( 'Place ID:', 'sgs-blocks' ) }</strong> { placeId }
							</>
						) }
					</p>
				</div>
			</div>
		</>
	);
}
