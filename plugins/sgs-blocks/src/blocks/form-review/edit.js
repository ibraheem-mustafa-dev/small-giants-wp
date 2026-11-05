import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, useSettings } from '@wordpress/block-editor';
import { PanelBody, TextControl, SelectControl, ToggleControl } from '@wordpress/components';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';
import { SgsColourPanel, fillRow, textRow, SgsBorderControl, SgsLengthControl, TypographyControls, ResponsiveControl, ResponsiveLengthControl, ResponsiveBoxControl } from '../../components';
import { patchTier } from '../../utils/patch-tier';
import { backgroundPaintPreview, textPaintPreview, typographyPreviewStyle, usePreviewTier, sgsLengthPreview, sgsBorderPreview } from '../../utils';

import AuthoredText from '../../components/AuthoredText';
import SgsFreeTextField from '../../components/SgsFreeTextField';
// D649 — no JSON `enum` reliance in the UI list order; mirrors sgs/icon-list's
// allow-list exactly (render.php validates the same set independently).
const HEADING_LEVEL_OPTIONS = [
	{ label: __( 'Heading 2', 'sgs-blocks' ), value: 'h2' },
	{ label: __( 'Heading 3', 'sgs-blocks' ), value: 'h3' },
	{ label: __( 'Heading 4', 'sgs-blocks' ), value: 'h4' },
	{ label: __( 'Heading 5', 'sgs-blocks' ), value: 'h5' },
	{ label: __( 'Heading 6', 'sgs-blocks' ), value: 'h6' },
	{ label: __( 'Paragraph (not a heading)', 'sgs-blocks' ), value: 'p' },
];

export default function Edit( { attributes, setAttributes } ) {
	const { heading, headingLevel, intro, showEditLinks, editLabel } = attributes;
	const tier = usePreviewTier();
	const [ colourPalette ] = useSettings( 'color.palette' );
	const cardStyle = {
		...backgroundPaintPreview( attributes.cardBackgroundColour, attributes.cardBackgroundColourGradient, colourPalette ),
		padding: sgsLengthPreview( attributes.cardPadding ) || undefined,
		...sgsBorderPreview(
			{
				widthValues: attributes.cardBorderWidth,
				styleValue: attributes.cardBorderStyle,
				colourValue: attributes.cardBorderColour,
				radiusValues: attributes.cardBorderRadius,
			},
			tier
		),
	};
	const titleStyle = typographyPreviewStyle( attributes, 'cardTitle', tier );
	const pickTier = ( value ) => value?.[ tier ] ?? value?.desktop;
	const editStyle = {
		...typographyPreviewStyle( attributes, 'editButton', tier ),
		...backgroundPaintPreview( attributes.editButtonBackgroundColour, '', colourPalette ),
		...textPaintPreview( attributes.editButtonColour, '', colourPalette ),
		...sgsBorderPreview(
			{
				widthValues: attributes.editButtonBorderWidth,
				styleValue: attributes.editButtonBorderStyle,
				colourValue: attributes.editButtonBorderColour,
				radiusValues: attributes.editButtonBorderRadius,
			},
			tier
		),
	};
	const editMinHeight = sgsLengthPreview( pickTier( attributes.editButtonMinHeight ) );
	if ( editMinHeight ) {
		editStyle.minHeight = editMinHeight;
	}
	const editPad = pickTier( attributes.editButtonPadding );
	if ( editPad ) {
		editStyle.padding = [ editPad.top, editPad.right, editPad.bottom, editPad.left ].map( ( side ) => side || 0 ).join( ' ' );
	}
	const listStyle = {
		gridTemplateColumns: `repeat(${ parseInt( pickTier( attributes.listColumns ), 10 ) || 1 }, minmax(0, 1fr))`,
		rowGap: sgsLengthPreview( pickTier( attributes.listRowGap ) ) || undefined,
		columnGap: sgsLengthPreview( pickTier( attributes.listColumnGap ) ) || undefined,
	};
	const rowStyle = 'stacked' === attributes.rowLayout ? { gridTemplateColumns: 'minmax(0, 1fr)' } : undefined;
	const cardsStyle = {
		gap: sgsLengthPreview( pickTier( attributes.cardsGap ) ) || undefined,
		marginTop: sgsLengthPreview( pickTier( attributes.cardsMarginTop ) ) || undefined,
	};
	const termStyle = textPaintPreview( attributes.termColour, attributes.termColourGradient, colourPalette );
	const valueStyle = textPaintPreview( attributes.valueColour, attributes.valueColourGradient, colourPalette );

	const blockProps = useBlockProps( { className: 'sgs-form-review' } );

	// D649 — heading level is an identity control (document-outline
	// placement), not a style control; mirrors render.php's own fallback.
	const HeadingTag = headingLevel || 'h3';

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Review Settings', 'sgs-blocks' ) }>
					<SgsFreeTextField type="rich"
						label={ __( 'Heading', 'sgs-blocks' ) }
						value={ heading }
						onChange={ ( val ) =>
							setAttributes( { heading: val } )
						}
					/>
					<SelectControl
						label={ __( 'Heading level', 'sgs-blocks' ) }
						value={ headingLevel || 'h3' }
						options={ HEADING_LEVEL_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { headingLevel: val } )
						}
						help={ __(
							'Pick the level that fits your page outline — usually H2 or H3 depending on where this review step sits.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SgsFreeTextField type="rich"
						label={ __( 'Intro text', 'sgs-blocks' ) }
						value={ intro }
						onChange={ ( val ) => setAttributes( { intro: val } ) }
						help={ __( 'Shown under the heading. Leave empty to hide it.', 'sgs-blocks' ) }
					/>
					<ToggleControl
						label={ __( 'Show an Edit button on each section', 'sgs-blocks' ) }
						checked={ false !== showEditLinks }
						onChange={ ( val ) => setAttributes( { showEditLinks: val } ) }
						help={ __( 'Takes the visitor back to that step.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
					/>
					{ false !== showEditLinks && (
						<TextControl
							label={ __( 'Edit button text', 'sgs-blocks' ) }
							value={ editLabel }
							onChange={ ( val ) => setAttributes( { editLabel: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
				</PanelBody>
			</InspectorControls>

			<InspectorControls group="styles">
				<SgsColourPanel
					rows={ [
						fillRow( {
							key: 'card',
							label: __( 'Card background', 'sgs-blocks' ),
							attrs: { base: 'cardBackgroundColour', gradient: 'cardBackgroundColourGradient' },
							attributes,
							setAttributes,
						} ),
						textRow( {
							key: 'term',
							label: __( 'Row label', 'sgs-blocks' ),
							attrs: { base: 'termColour', gradient: 'termColourGradient' },
							attributes,
							setAttributes,
						} ),
						textRow( {
							key: 'value',
							label: __( 'Row value', 'sgs-blocks' ),
							attrs: { base: 'valueColour', gradient: 'valueColourGradient' },
							attributes,
							setAttributes,
						} ),
						textRow( {
							key: 'editText',
							label: __( 'Edit button text', 'sgs-blocks' ),
							attrs: { base: 'editButtonColour', hover: 'editButtonColourHover' },
							attributes,
							setAttributes,
						} ),
						fillRow( {
							key: 'editFill',
							label: __( 'Edit button background', 'sgs-blocks' ),
							attrs: { base: 'editButtonBackgroundColour', hover: 'editButtonBackgroundColourHover' },
							attributes,
							setAttributes,
						} ),
					] }
				/>
				<PanelBody title={ __( 'Card border and spacing', 'sgs-blocks' ) } initialOpen={ false }>
					<SgsBorderControl
						widthValues={ attributes.cardBorderWidth ?? {} }
						onWidthChange={ ( next ) => setAttributes( { cardBorderWidth: next } ) }
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ attributes.cardBorderStyle }
						onStyleChange={ ( val ) => setAttributes( { cardBorderStyle: val } ) }
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourStates={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: attributes.cardBorderColour,
								onChange: ( val ) => setAttributes( { cardBorderColour: val ?? '' } ),
							},
						] }
						radiusValues={ {
							base: attributes.cardBorderRadius?.desktop ?? {},
							tablet: attributes.cardBorderRadius?.tablet ?? {},
							mobile: attributes.cardBorderRadius?.mobile ?? {},
						} }
						onRadiusChange={ ( tier, next ) => {
							const key = tier === 'base' ? 'desktop' : tier;
							setAttributes( { cardBorderRadius: { ...attributes.cardBorderRadius, [ key ]: next } } );
						} }
					/>
					<SgsLengthControl
						label={ __( 'Card padding', 'sgs-blocks' ) }
						value={ attributes.cardPadding }
						onChange={ ( val ) => setAttributes( { cardPadding: val ?? '' } ) }
						presets
					/>
				</PanelBody>
				<PanelBody title={ __( 'Card title typography', 'sgs-blocks' ) } initialOpen={ false }>
					<TypographyControls
						fontSizePresets
						showFontFamily
						showTransform
						showLetterSpacing
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix="cardTitle"
					/>
				</PanelBody>
				<PanelBody title={ __( 'Rows and layout', 'sgs-blocks' ) } initialOpen={ false }>
					<ToolsPanel
						label={ __( 'Row and card spacing', 'sgs-blocks' ) }
						resetAll={ () => setAttributes( { rowLayout: 'side', listColumns: {}, listRowGap: {}, listColumnGap: {}, cardsGap: {}, cardsMarginTop: {} } ) }
					>
						<ToolsPanelItem
							label={ __( 'Answer position', 'sgs-blocks' ) }
							isShownByDefault
							hasValue={ () => 'side' !== attributes.rowLayout }
							onDeselect={ () => setAttributes( { rowLayout: 'side' } ) }
						>
							<SelectControl
								label={ __( 'Answer position', 'sgs-blocks' ) }
								value={ attributes.rowLayout || 'side' }
								options={ [
									{ label: __( 'Beside the label', 'sgs-blocks' ), value: 'side' },
									{ label: __( 'Under the label', 'sgs-blocks' ), value: 'stacked' },
								] }
								onChange={ ( val ) => setAttributes( { rowLayout: val } ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Rows side by side', 'sgs-blocks' ) }
							isShownByDefault
							hasValue={ () => Object.keys( attributes.listColumns ?? {} ).length > 0 }
							onDeselect={ () => setAttributes( { listColumns: {} } ) }
						>
							<ResponsiveControl label={ __( 'Rows side by side', 'sgs-blocks' ) }>
								{ ( breakpoint ) => (
									<SelectControl
										label={ __( 'Rows side by side', 'sgs-blocks' ) }
										hideLabelFromVision
										value={ String( attributes.listColumns?.[ breakpoint ] ?? '' ) }
										options={ [
											{ label: __( 'Inherit', 'sgs-blocks' ), value: '' },
											{ label: '1', value: '1' },
											{ label: '2', value: '2' },
											{ label: '3', value: '3' },
											{ label: '4', value: '4' },
										] }
										onChange={ ( val ) => patchTier( attributes, setAttributes, 'listColumns', breakpoint, val ? parseInt( val, 10 ) : '' ) }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								) }
							</ResponsiveControl>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Space between rows', 'sgs-blocks' ) }
							hasValue={ () => Object.keys( attributes.listRowGap ?? {} ).length > 0 }
							onDeselect={ () => setAttributes( { listRowGap: {} } ) }
						>
							<ResponsiveLengthControl
								label={ __( 'Space between rows', 'sgs-blocks' ) }
								value={ attributes.listRowGap }
								onChange={ ( next ) => setAttributes( { listRowGap: next } ) }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Space between columns', 'sgs-blocks' ) }
							hasValue={ () => Object.keys( attributes.listColumnGap ?? {} ).length > 0 }
							onDeselect={ () => setAttributes( { listColumnGap: {} } ) }
						>
							<ResponsiveLengthControl
								label={ __( 'Space between columns', 'sgs-blocks' ) }
								value={ attributes.listColumnGap }
								onChange={ ( next ) => setAttributes( { listColumnGap: next } ) }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Space between cards', 'sgs-blocks' ) }
							isShownByDefault
							hasValue={ () => Object.keys( attributes.cardsGap ?? {} ).length > 0 }
							onDeselect={ () => setAttributes( { cardsGap: {} } ) }
						>
							<ResponsiveLengthControl
								label={ __( 'Space between cards', 'sgs-blocks' ) }
								value={ attributes.cardsGap }
								onChange={ ( next ) => setAttributes( { cardsGap: next } ) }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Space above the cards', 'sgs-blocks' ) }
							hasValue={ () => Object.keys( attributes.cardsMarginTop ?? {} ).length > 0 }
							onDeselect={ () => setAttributes( { cardsMarginTop: {} } ) }
						>
							<ResponsiveLengthControl
								label={ __( 'Space above the cards', 'sgs-blocks' ) }
								value={ attributes.cardsMarginTop }
								onChange={ ( next ) => setAttributes( { cardsMarginTop: next } ) }
							/>
						</ToolsPanelItem>
					</ToolsPanel>
				</PanelBody>
				<PanelBody title={ __( 'Edit button', 'sgs-blocks' ) } initialOpen={ false }>
					<SgsBorderControl
						widthValues={ attributes.editButtonBorderWidth ?? {} }
						onWidthChange={ ( next ) => setAttributes( { editButtonBorderWidth: next } ) }
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ attributes.editButtonBorderStyle }
						onStyleChange={ ( val ) => setAttributes( { editButtonBorderStyle: val } ) }
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourStates={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: attributes.editButtonBorderColour,
								onChange: ( val ) => setAttributes( { editButtonBorderColour: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: attributes.editButtonBorderColourHover,
								onChange: ( val ) => setAttributes( { editButtonBorderColourHover: val ?? '' } ),
							},
						] }
						radiusValues={ {
							base: attributes.editButtonBorderRadius?.desktop ?? {},
							tablet: attributes.editButtonBorderRadius?.tablet ?? {},
							mobile: attributes.editButtonBorderRadius?.mobile ?? {},
						} }
						onRadiusChange={ ( tierKey, next ) => {
							const key = tierKey === 'base' ? 'desktop' : tierKey;
							setAttributes( { editButtonBorderRadius: { ...attributes.editButtonBorderRadius, [ key ]: next } } );
						} }
					/>
					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						presets
						values={ {
							base: attributes.editButtonPadding?.desktop ?? {},
							tablet: attributes.editButtonPadding?.tablet ?? {},
							mobile: attributes.editButtonPadding?.mobile ?? {},
						} }
						onChange={ ( tierKey, next ) => {
							const key = 'base' === tierKey ? 'desktop' : tierKey;
							setAttributes( { editButtonPadding: { ...attributes.editButtonPadding, [ key ]: next } } );
						} }
					/>
					<ResponsiveLengthControl
						label={ __( 'Minimum height', 'sgs-blocks' ) }
						value={ attributes.editButtonMinHeight }
						onChange={ ( next ) => setAttributes( { editButtonMinHeight: next } ) }
					/>
					<TypographyControls
						fontSizePresets
						showFontFamily
						showTransform
						showLetterSpacing
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix="editButton"
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<AuthoredText as={ HeadingTag } className="sgs-form-review__heading" value={ heading } />
				{ intro && <AuthoredText as="p" className="sgs-form-review__intro" value={ intro } /> }
				{ /* A sample card painted from the card settings; the front end builds one per step from the visitor's answers. */ }
				<div className="sgs-form-review__cards" style={ cardsStyle }>
					<section className="sgs-form-review__card" style={ cardStyle }>
						<div className="sgs-form-review__card-head">
							<p className="sgs-form-review__card-title" style={ titleStyle }>
								{ __( 'Your details', 'sgs-blocks' ) }
							</p>
							{ false !== showEditLinks && (
								<button type="button" className="sgs-form-review__edit" tabIndex={ -1 } style={ editStyle }>
									{ editLabel || __( 'Edit', 'sgs-blocks' ) }
								</button>
							) }
						</div>
						<dl className="sgs-form-review__list" style={ listStyle }>
							{ [ __( 'Name', 'sgs-blocks' ), __( 'Phone', 'sgs-blocks' ) ].map( ( term ) => (
								<div className="sgs-form-review__row" style={ rowStyle } key={ term }>
									<dt className="sgs-form-review__term" style={ termStyle }>{ term }</dt>
									<dd className="sgs-form-review__detail" style={ valueStyle }>{ __( 'Sample answer', 'sgs-blocks' ) }</dd>
								</div>
							) ) }
						</dl>
					</section>
				</div>
			</div>
		</>
	);
}
