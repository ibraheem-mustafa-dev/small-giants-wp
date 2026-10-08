/**
 * Post Grid — Content inspector panel.
 */

import { __ } from '@wordpress/i18n';
import { SelectControl, RangeControl, ToggleControl, TextControl } from '@wordpress/components';
import MediaElementPanel from '../../../components/MediaElementPanel';
import SgsBooleanField from '../../../components/SgsBooleanField';
import { ToolsPanel, ToolsPanelItem } from '../../../components/primitives';
import { ASPECT_RATIO_OPTIONS, IMAGE_SIZE_OPTIONS } from './constants';

export default function ContentPanel( { attributes, setAttributes, set } ) {
	const {
		aspectRatio,
		imageSize,
		showImage,
		imageDecorative,
		showTitle,
		showExcerpt,
		excerptLength,
		showDate,
		showAuthor,
		showCategory,
		showReadMore,
		readMoreText,
		imageZoomHover,
	} = attributes;

	return (
				<ToolsPanel
					label={ __( 'Content', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( {
							showImage: true,
							imageSize: 'medium_large',
							imageDecorative: false,
							aspectRatio: '16 / 9',
							imageZoomHover: true,
							showTitle: true,
							showExcerpt: true,
							excerptLength: 20,
							showDate: true,
							showAuthor: false,
							showCategory: true,
							showReadMore: true,
							readMoreText: 'Read more',
						} )
					}
				>
					<ToolsPanelItem
						label={ __( 'Show image', 'sgs-blocks' ) }
						hasValue={ () =>
							showImage !== true || imageZoomHover !== true
						}
						onDeselect={ () =>
							setAttributes( {
								showImage: true,
								imageZoomHover: true,
							} )
						}
						isShownByDefault
					>
						<SgsBooleanField
							label={ __( 'Show image', 'sgs-blocks' ) }
							checked={ showImage }
							onChange={ set( 'showImage' ) }
						>
							{ showImage && (
								<>
									{ /* Consolidated in from the "Layout" panel — CO-2 /
									     THE PLACEMENT RULE TIER 1 names "Post image" a
									     declared element; aspect ratio is image-owned. */ }
									<SelectControl
										label={ __( 'Image aspect ratio', 'sgs-blocks' ) }
										value={ aspectRatio }
										options={ ASPECT_RATIO_OPTIONS }
										onChange={ set( 'aspectRatio' ) }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
									<SelectControl
										label={ __( 'Image size', 'sgs-blocks' ) }
										value={ imageSize }
										options={ IMAGE_SIZE_OPTIONS }
										onChange={ set( 'imageSize' ) }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
									{ /* 37-media-no-handroll: object-fit for the featured-image <img>
									     (sgs-post-grid__img), one media-atom control covering both the
									     grid-mode and list-mode selectors in style.css — same element,
									     rendered once per card by Post_Grid_REST::render_card(). */ }
									<MediaElementPanel
										attributes={ attributes }
										setAttributes={ setAttributes }
										prefix=""
										blockSlug="sgs/post-grid"
										insertion="element"
										atoms={ [ 'object-fit' ] }
										mediaType="image"
										scope="element"
									/>
									<ToggleControl
										label={ __( 'Featured images are decorative', 'sgs-blocks' ) }
										help={ __(
											'Hides every post’s featured image from screen readers across this whole grid. Turn on only if the images add no information beyond the post title — posts are queried dynamically, so this applies to all cards, not one at a time.',
											'sgs-blocks'
										) }
										checked={ imageDecorative }
										onChange={ set( 'imageDecorative' ) }
										__nextHasNoMarginBottom
									/>
									{ /* Consolidated in from the "Hover Effects" panel —
									     same TIER 1 reason; image zoom on hover is
									     image-owned. */ }
									<ToggleControl
										label={ __( 'Image zoom on hover', 'sgs-blocks' ) }
										checked={ imageZoomHover }
										onChange={ set( 'imageZoomHover' ) }
										__nextHasNoMarginBottom
									/>
								</>
							) }
						</SgsBooleanField>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Show title', 'sgs-blocks' ) }
						hasValue={ () => showTitle !== true }
						onDeselect={ () => setAttributes( { showTitle: true } ) }
						isShownByDefault
					>
						<ToggleControl
							label={ __( 'Show title', 'sgs-blocks' ) }
							checked={ showTitle }
							onChange={ set( 'showTitle' ) }
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Show excerpt', 'sgs-blocks' ) }
						hasValue={ () =>
							showExcerpt !== true || excerptLength !== 20
						}
						onDeselect={ () =>
							setAttributes( {
								showExcerpt: true,
								excerptLength: 20,
							} )
						}
						isShownByDefault
					>
						<SgsBooleanField
							label={ __( 'Show excerpt', 'sgs-blocks' ) }
							checked={ showExcerpt }
							onChange={ set( 'showExcerpt' ) }
						>
							{ showExcerpt && (
								<>
									<RangeControl
										label={ __( 'Excerpt length (words)', 'sgs-blocks' ) }
										value={ excerptLength }
										onChange={ set( 'excerptLength' ) }
										min={ 5 }
										max={ 80 }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
									{ /* Excerpt colour moved to the shared SgsColourPanel
									     above (D622, which used to route it here, is
									     superseded — see that component's own docblock). */ }
								</>
							) }
						</SgsBooleanField>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Show date', 'sgs-blocks' ) }
						hasValue={ () => showDate !== true }
						onDeselect={ () => setAttributes( { showDate: true } ) }
					>
						<ToggleControl
							label={ __( 'Show date', 'sgs-blocks' ) }
							checked={ showDate }
							onChange={ set( 'showDate' ) }
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Show author', 'sgs-blocks' ) }
						hasValue={ () => showAuthor !== false }
						onDeselect={ () => setAttributes( { showAuthor: false } ) }
					>
						<ToggleControl
							label={ __( 'Show author', 'sgs-blocks' ) }
							checked={ showAuthor }
							onChange={ set( 'showAuthor' ) }
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Show category', 'sgs-blocks' ) }
						hasValue={ () => showCategory !== true }
						onDeselect={ () => setAttributes( { showCategory: true } ) }
					>
						<ToggleControl
							label={ __( 'Show category', 'sgs-blocks' ) }
							checked={ showCategory }
							onChange={ set( 'showCategory' ) }
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Show read more', 'sgs-blocks' ) }
						hasValue={ () =>
							showReadMore !== true ||
							readMoreText !== 'Read more'
						}
						onDeselect={ () =>
							setAttributes( {
								showReadMore: true,
								readMoreText: 'Read more',
							} )
						}
					>
						<SgsBooleanField
							label={ __( 'Show read more', 'sgs-blocks' ) }
							checked={ showReadMore }
							onChange={ set( 'showReadMore' ) }
						>
							{ showReadMore && (
								<>
									<TextControl
										label={ __( 'Read more text', 'sgs-blocks' ) }
										value={ readMoreText }
										onChange={ set( 'readMoreText' ) }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
									{ /* Read more colour moved to the shared SgsColourPanel
									     above (D622 is superseded). */ }
								</>
							) }
						</SgsBooleanField>
					</ToolsPanelItem>
				</ToolsPanel>
	);
}
