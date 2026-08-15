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
} from '@wordpress/components';
import { ResponsiveOverride, SgsColourPanel } from '../../components';

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
		autoplay,
		autoplaySpeed,
		showDots,
		showArrows,
		dragToScroll,
		dragMomentum,
		loopCarousel,
	} = attributes;

	const blockProps = useBlockProps( {
		className: `sgs-google-reviews sgs-google-reviews--${ variant } sgs-google-reviews--theme-${ theme }`,
	} );

	return (
		<>
			{ /* D619 — ONE grouped, SGS-OWNED colour panel, rendered FIRST so
			   it sits at the top of the inspector. Replaces the "Star
			   Colour" `SelectControl` that used to sit in the "Appearance"
			   panel below. That control offered only 3 fixed slugs
			   (accent/primary/success); render.php resolves `starColour`
			   through `sgs_colour_value()` — the same slug-or-hex resolver
			   every other SgsColourPanel row uses — so it is a genuine free
			   colour setting, not a true enum, and now gets the full
			   palette picker like every other colour on this block.
			   `supports.color` sub-flags are now false so WordPress
			   generates no native colour UI to overlap with this panel. No
			   hover pair exists for this attribute. */ }
			<SgsColourPanel
				rows={ [
					{
						key: 'star',
						label: __( 'Star colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: starColour,
								onChange: ( val ) => setAttributes( { starColour: val || 'accent' } ),
								linked: true,
							},
						],
					},
				] }
			/>
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

				{ [ 'grid', 'slider', 'wall' ].includes( variant ) && (
					<PanelBody title={ __( 'Layout', 'sgs-blocks' ) }>
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
					<PanelBody title={ __( 'Slider Settings', 'sgs-blocks' ) } initialOpen={ false }>
						<ToggleControl
							label={ __( 'Autoplay', 'sgs-blocks' ) }
							checked={ autoplay }
							onChange={ ( value ) => setAttributes( { autoplay: value } ) }
						/>

						{ autoplay && (
							<RangeControl
								label={ __( 'Autoplay Speed (ms)', 'sgs-blocks' ) }
								value={ autoplaySpeed }
								onChange={ ( value ) => setAttributes( { autoplaySpeed: value } ) }
								min={ 2000 }
								max={ 10000 }
								step={ 500 }
								__next40pxDefaultSize
							/>
						) }

						<ToggleControl
							label={ __( 'Show dots', 'sgs-blocks' ) }
							checked={ showDots }
							onChange={ ( value ) => setAttributes( { showDots: value } ) }
						/>

						<ToggleControl
							label={ __( 'Show arrows', 'sgs-blocks' ) }
							checked={ showArrows }
							onChange={ ( value ) => setAttributes( { showArrows: value } ) }
						/>

						{ /*
						 * Draggable + Inertia opt-in (Spec 38 FR-38-13),
						 * mirroring sgs/gallery. Desktop-only click-and-drag
						 * layered over the CSS scroll-snap this variant already
						 * renders — touch keeps its native scroll either way,
						 * so no "touch" caveat belongs in the help text.
						 */ }
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

						{ dragToScroll && (
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
					</PanelBody>
				) }
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
