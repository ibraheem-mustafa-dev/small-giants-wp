import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl, SelectControl, ToggleControl } from '@wordpress/components';
import { SgsColourPanel, fillRow, textRow, SgsBorderControl, SgsLengthControl, TypographyControls } from '../../components';
import { colourVar, typographyPreviewStyle, usePreviewTier, sgsLengthPreview, sgsBorderPreview } from '../../utils';

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
	const cardStyle = {
		backgroundColor: colourVar( attributes.cardBackgroundColour ) || undefined,
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
	const termStyle = { color: colourVar( attributes.termColour ) || undefined };
	const valueStyle = { color: colourVar( attributes.valueColour ) || undefined };

	const blockProps = useBlockProps( { className: 'sgs-form-review' } );

	// D649 — heading level is an identity control (document-outline
	// placement), not a style control; mirrors render.php's own fallback.
	const HeadingTag = headingLevel || 'h3';

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Review Settings', 'sgs-blocks' ) }>
					<TextControl
						label={ __( 'Heading', 'sgs-blocks' ) }
						value={ heading }
						onChange={ ( val ) =>
							setAttributes( { heading: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
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
					<TextControl
						label={ __( 'Intro text', 'sgs-blocks' ) }
						value={ intro }
						onChange={ ( val ) => setAttributes( { intro: val } ) }
						help={ __( 'Shown under the heading. Leave empty to hide it.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
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
							attrs: { base: 'cardBackgroundColour' },
							attributes,
							setAttributes,
						} ),
						textRow( {
							key: 'term',
							label: __( 'Row label', 'sgs-blocks' ),
							attrs: { base: 'termColour' },
							attributes,
							setAttributes,
						} ),
						textRow( {
							key: 'value',
							label: __( 'Row value', 'sgs-blocks' ),
							attrs: { base: 'valueColour' },
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
			</InspectorControls>

			<div { ...blockProps }>
				<HeadingTag className="sgs-form-review__heading">{ heading }</HeadingTag>
				{ intro && <p className="sgs-form-review__intro">{ intro }</p> }
				{ /* A sample card painted from the card settings; the front end builds one per step from the visitor's answers. */ }
				<div className="sgs-form-review__cards">
					<section className="sgs-form-review__card" style={ cardStyle }>
						<div className="sgs-form-review__card-head">
							<p className="sgs-form-review__card-title" style={ titleStyle }>
								{ __( 'Your details', 'sgs-blocks' ) }
							</p>
							{ false !== showEditLinks && (
								<button type="button" className="sgs-form-review__edit" tabIndex={ -1 }>
									{ editLabel || __( 'Edit', 'sgs-blocks' ) }
								</button>
							) }
						</div>
						<dl className="sgs-form-review__list">
							<dt className="sgs-form-review__term" style={ termStyle }>{ __( 'Name', 'sgs-blocks' ) }</dt>
							<dd className="sgs-form-review__detail" style={ valueStyle }>{ __( 'Sample answer', 'sgs-blocks' ) }</dd>
						</dl>
					</section>
				</div>
			</div>
		</>
	);
}
