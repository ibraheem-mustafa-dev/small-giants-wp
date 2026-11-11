/**
 * Post Grid — Content inspector panel.
 */

import { __ } from '@wordpress/i18n';
import { SelectControl, RangeControl, ToggleControl } from '@wordpress/components';
import SgsBooleanField from '../../../components/SgsBooleanField';
import { ToolsPanel, ToolsPanelItem } from '../../../components/primitives';
import ResponsiveOverride from '../../../components/ResponsiveOverride';
import { IconPicker } from '../../../components/IconPicker';

import SgsFreeTextField from '../../../components/SgsFreeTextField';
const LOADING_OPTIONS = [
	{ label: __( 'Automatic', 'sgs-blocks' ), value: '' },
	{ label: __( 'Load first', 'sgs-blocks' ), value: 'first' },
	{ label: __( 'Load later', 'sgs-blocks' ), value: 'later' },
];

export default function ContentPanel( { attributes, setAttributes, set } ) {
	const {
		imageLoading,
		showImage,
		imageDecorative,
		showTitle,
		showExcerpt,
		excerptLength,
		showDate,
		dateFormat,
		showAuthor,
		showCategory,
		metaLayout,
		showReadMore,
		readMoreText,
		readMoreIcon,
		readMorePin,
		cardLink,
	} = attributes;

	return (
				<ToolsPanel
					label={ __( 'Content', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( {
							showImage: true,
							imageLoading: '',
							imageDecorative: false,
							showTitle: true,
							showExcerpt: true,
							excerptLength: 20,
							showDate: true,
							dateFormat: '',
							showAuthor: false,
							showCategory: true,
							metaLayout: '',
							showReadMore: true,
							readMoreText: 'Read more',
							cardLink: false,
						} )
					}
				>
					<ToolsPanelItem
						label={ __( 'Show image', 'sgs-blocks' ) }
						hasValue={ () => showImage !== true }
						onDeselect={ () =>
							setAttributes( { showImage: true } )
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
									{ /* The ratio, height, fit, focal point, radius and shape are the adopted media panels (edit.js). */ }
									<SelectControl
										label={ __( 'Load priority', 'sgs-blocks' ) }
										help={ __( 'Automatic loads the pictures above the fold first and the rest as they scroll into view.', 'sgs-blocks' ) }
										value={ imageLoading || '' }
										options={ LOADING_OPTIONS }
										onChange={ set( 'imageLoading' ) }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
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
					{ showDate && (
						<ToolsPanelItem
							label={ __( 'Date format', 'sgs-blocks' ) }
							hasValue={ () => '' !== dateFormat }
							onDeselect={ () => setAttributes( { dateFormat: '' } ) }
						>
							<SelectControl
								__next40pxDefaultSize
								__nextHasNoMarginBottom
								label={ __( 'Date format', 'sgs-blocks' ) }
								value={ [ 'M Y', 'F Y', 'j M Y', 'd/m/Y', '' ].includes( dateFormat ) ? dateFormat : 'custom' }
								options={ [
									{ label: __( 'Site default', 'sgs-blocks' ), value: '' },
									{ label: __( 'Feb 2026 (M Y)', 'sgs-blocks' ), value: 'M Y' },
									{ label: __( 'February 2026 (F Y)', 'sgs-blocks' ), value: 'F Y' },
									{ label: __( '12 Feb 2026 (j M Y)', 'sgs-blocks' ), value: 'j M Y' },
									{ label: __( '12/02/2026 (d/m/Y)', 'sgs-blocks' ), value: 'd/m/Y' },
									{ label: __( 'Custom', 'sgs-blocks' ), value: 'custom' },
								] }
								onChange={ ( v ) => setAttributes( { dateFormat: 'custom' === v ? 'j F Y' : v } ) }
								__nextHasNoMarginBottom
							/>
							{ ! [ 'M Y', 'F Y', 'j M Y', 'd/m/Y', '' ].includes( dateFormat ) && (
								<SgsFreeTextField
									label={ __( 'Custom date format (PHP)', 'sgs-blocks' ) }
									value={ dateFormat }
									onChange={ set( 'dateFormat' ) }
								/>
							) }
						</ToolsPanelItem>
					) }
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
						label={ __( 'Category and date row', 'sgs-blocks' ) }
						hasValue={ () => '' !== ( metaLayout || '' ) }
						onDeselect={ () => setAttributes( { metaLayout: '' } ) }
					>
						<SelectControl
							label={ __( 'Category and date row', 'sgs-blocks' ) }
							value={ metaLayout || '' }
							options={ [
								{ label: __( 'Separate lines', 'sgs-blocks' ), value: '' },
								{ label: __( 'One row: category left, date right', 'sgs-blocks' ), value: 'inline' },
							] }
							onChange={ set( 'metaLayout' ) }
							help={ __( 'Flat and minimal card styles only.', 'sgs-blocks' ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Show read more', 'sgs-blocks' ) }
						hasValue={ () =>
							showReadMore !== true ||
							readMoreText !== 'Read more' ||
							'' !== ( readMoreIcon || '' ) ||
							!! readMorePin?.desktop || !! readMorePin?.tablet || !! readMorePin?.mobile
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
									<SgsFreeTextField type="rich" noLink
										label={ __( 'Read more text', 'sgs-blocks' ) }
										value={ readMoreText }
										onChange={ set( 'readMoreText' ) }
									/>
									<IconPicker
										label={ __( 'Read more icon', 'sgs-blocks' ) }
										value={ [ '', 'none' ].includes( readMoreIcon || '' ) ? null : { source: 'lucide', name: readMoreIcon } }
										onChange={ ( { name } ) => setAttributes( { readMoreIcon: name } ) }
										sources={ [ 'lucide' ] }
									/>
									<SelectControl
										label={ __( 'Icon style', 'sgs-blocks' ) }
										value={ [ '', 'none' ].includes( readMoreIcon || '' ) ? ( readMoreIcon || '' ) : 'custom' }
										options={ [
											{ label: __( 'Text arrow', 'sgs-blocks' ), value: '' },
											{ label: __( 'No icon', 'sgs-blocks' ), value: 'none' },
											{ label: __( 'Icon chosen above', 'sgs-blocks' ), value: 'custom', disabled: true },
										] }
										onChange={ ( v ) => setAttributes( { readMoreIcon: v } ) }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
									<ResponsiveOverride
										label={ __( 'Read more position', 'sgs-blocks' ) }
										value={ readMorePin }
										onChange={ ( obj ) => setAttributes( { readMorePin: obj } ) }
									>
										{ ( { ownValue, setOwnValue } ) => (
											<SelectControl
												label={ __( 'Read more position', 'sgs-blocks' ) }
												hideLabelFromVision
												value={ ownValue || '' }
												options={ [
													{ label: __( 'Inherit', 'sgs-blocks' ), value: '' },
													{ label: __( 'Pinned to the card bottom', 'sgs-blocks' ), value: 'pinned' },
													{ label: __( 'Straight after the excerpt', 'sgs-blocks' ), value: 'inline' },
												] }
												onChange={ setOwnValue }
												help={ __( 'Pinned: the link is a full-width row at the bottom of every card, so cards of different text length line up. Not applied to the list layout.', 'sgs-blocks' ) }
												__nextHasNoMarginBottom
												__next40pxDefaultSize
											/>
										) }
									</ResponsiveOverride>
									{ /* Read more colour moved to the shared SgsColourPanel
									     above (D622 is superseded). */ }
								</>
							) }
						</SgsBooleanField>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Whole card is the link', 'sgs-blocks' ) }
						hasValue={ () => !! cardLink }
						onDeselect={ () => setAttributes( { cardLink: false } ) }
					>
						<SgsBooleanField
							label={ __( 'Whole card is the link', 'sgs-blocks' ) }
							checked={ !! cardLink }
							onChange={ set( 'cardLink' ) }
							help={ __( 'The whole card opens the post, with one link named by the post title. The read more text stays as a visual cue, not a second link.', 'sgs-blocks' ) }
						/>
					</ToolsPanelItem>
				</ToolsPanel>
	);
}
