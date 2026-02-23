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
import {
	PanelBody,
	SelectControl,
	ToggleControl,
	RangeControl,
	TextControl,
	Notice,
} from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	const {
		variant,
		placeId,
		columns,
		columnsTablet,
		columnsMobile,
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
		textColour,
		backgroundColour,
		autoplay,
		autoplaySpeed,
		showDots,
		showArrows,
	} = attributes;

	const blockProps = useBlockProps( {
		className: `sgs-google-reviews sgs-google-reviews--${ variant } sgs-google-reviews--theme-${ theme }`,
	} );

	return (
		<>
			<InspectorControls>
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
					/>
				</PanelBody>

				<PanelBody title={ __( 'Google Business Profile', 'sgs-blocks' ) }>
					<TextControl
						label={ __( 'Place ID', 'sgs-blocks' ) }
						value={ placeId }
						onChange={ ( value ) => setAttributes( { placeId: value } ) }
						help={ __( 'Leave empty to use default from plugin settings.', 'sgs-blocks' ) }
					/>

					<Notice status="info" isDismissible={ false }>
						<p>{ __( 'Configure Google API key and default Place ID in Settings → SGS Blocks → Google Reviews.', 'sgs-blocks' ) }</p>
					</Notice>
				</PanelBody>

				{ [ 'grid', 'slider', 'wall' ].includes( variant ) && (
					<PanelBody title={ __( 'Layout', 'sgs-blocks' ) }>
						<RangeControl
							label={ __( 'Columns (Desktop)', 'sgs-blocks' ) }
							value={ columns }
							onChange={ ( value ) => setAttributes( { columns: value } ) }
							min={ 1 }
							max={ 4 }
						/>

						<RangeControl
							label={ __( 'Columns (Tablet)', 'sgs-blocks' ) }
							value={ columnsTablet }
							onChange={ ( value ) => setAttributes( { columnsTablet: value } ) }
							min={ 1 }
							max={ 3 }
						/>

						<RangeControl
							label={ __( 'Columns (Mobile)', 'sgs-blocks' ) }
							value={ columnsMobile }
							onChange={ ( value ) => setAttributes( { columnsMobile: value } ) }
							min={ 1 }
							max={ 2 }
						/>
					</PanelBody>
				) }

				<PanelBody title={ __( 'Filters', 'sgs-blocks' ) }>
					<RangeControl
						label={ __( 'Maximum Reviews', 'sgs-blocks' ) }
						value={ maxReviews }
						onChange={ ( value ) => setAttributes( { maxReviews: value } ) }
						min={ 1 }
						max={ 50 }
					/>

					<RangeControl
						label={ __( 'Minimum Rating', 'sgs-blocks' ) }
						value={ minRating }
						onChange={ ( value ) => setAttributes( { minRating: value } ) }
						min={ 1 }
						max={ 5 }
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
					/>

					<SelectControl
						label={ __( 'Star Colour', 'sgs-blocks' ) }
						value={ starColour }
						options={ [
							{ label: __( 'Accent', 'sgs-blocks' ), value: 'accent' },
							{ label: __( 'Primary', 'sgs-blocks' ), value: 'primary' },
							{ label: __( 'Success', 'sgs-blocks' ), value: 'success' },
						] }
						onChange={ ( value ) => setAttributes( { starColour: value } ) }
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
