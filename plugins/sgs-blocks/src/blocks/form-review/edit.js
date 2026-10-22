import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl, SelectControl, ToggleControl } from '@wordpress/components';

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

			<div { ...blockProps }>
				<HeadingTag className="sgs-form-review__heading">{ heading }</HeadingTag>
				{ intro && <p className="sgs-form-review__intro">{ intro }</p> }
				<div
					className="sgs-form-review__placeholder"
					style={ {
						padding: '24px',
						border: '2px dashed #ccc',
						borderRadius: '8px',
						backgroundColor: '#f9f9f9',
						textAlign: 'center',
						color: '#666',
					} }
				>
					{ false !== showEditLinks && (
						<button type="button" className="sgs-form-review__edit" tabIndex={ -1 }>
							{ editLabel || __( 'Edit', 'sgs-blocks' ) }
						</button>
					) }
					<p>
						{ __(
							'Review step — entered fields will be displayed here on the frontend.',
							'sgs-blocks'
						) }
					</p>
				</div>
			</div>
		</>
	);
}
