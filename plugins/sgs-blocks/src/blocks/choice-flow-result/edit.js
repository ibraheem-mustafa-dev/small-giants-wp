import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, RichText } from '@wordpress/block-editor';
import { PanelBody, TextControl, SelectControl } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	const { heading, body, matchTags, action } = attributes;

	const blockProps = useBlockProps( { className: 'sgs-choice-flow-result' } );

	// Free-text comma-separated tags, kept deliberately simple per FR-43-12
	// ("keep it simple, a weighted-tag match is enough for v1, no formula/
	// expression engine"). No tag-picker/autocomplete UI this phase.
	const tagsValue = ( matchTags || [] ).join( ', ' );

	const onTagsChange = ( val ) => {
		const nextTags = val
			.split( ',' )
			.map( ( tag ) => tag.trim() )
			.filter( ( tag ) => tag.length > 0 );

		setAttributes( { matchTags: nextTags } );
	};

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Terminal action', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Action', 'sgs-blocks' ) }
						value={ action || 'recommend' }
						options={ [
							{ label: __( 'Recommendation (heading + body)', 'sgs-blocks' ), value: 'recommend' },
							{ label: __( 'Add to bag', 'sgs-blocks' ), value: 'add-to-bag' },
						] }
						onChange={ ( val ) => setAttributes( { action: val } ) }
						help={ __(
							'Add to bag shows a summary of the chosen add-ons and a real Add to bag button — the product/variation and every priced answer on the path taken.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
				<PanelBody title={ __( 'Result Matching', 'sgs-blocks' ) }>
					<TextControl
						label={ __( 'Match tags', 'sgs-blocks' ) }
						value={ tagsValue }
						onChange={ onTagsChange }
						help={ __(
							'Leave blank if this is your only result. If you have multiple possible results, add tags here that match the tags your questions’ answers carry — whichever result matches most wins.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<RichText
					tagName="h3"
					className="sgs-choice-flow-result__heading"
					value={ heading }
					onChange={ ( val ) => setAttributes( { heading: val } ) }
					placeholder={ __( 'Your recommended result…', 'sgs-blocks' ) }
					allowedFormats={ [] }
				/>
				<RichText
					tagName="div"
					className="sgs-choice-flow-result__body"
					value={ body }
					onChange={ ( val ) => setAttributes( { body: val } ) }
					placeholder={ __(
						'Explain the recommendation to your visitor…',
						'sgs-blocks'
					) }
					allowedFormats={ [ 'core/bold', 'core/italic', 'core/link' ] }
					multiline="p"
				/>
				{ /* Canvas preview only — the real summary + Add to bag button are
				   built client-side by sgs/choice-flow's own pricing module (it
				   alone knows the path taken); this is a static stand-in so the
				   `action` attribute reflects visibly in the editor canvas
				   (check-editor-render-parity.js CHECK A). */ }
				{ 'add-to-bag' === action && (
					<div className="sgs-choice-flow-result__addon-summary-preview">
						{ __( 'Chosen add-ons will summarise here.', 'sgs-blocks' ) }
						<button type="button" disabled className="sgs-choice-flow-result__add-to-bag">
							{ __( 'Add to bag', 'sgs-blocks' ) }
						</button>
					</div>
				) }
			</div>
		</>
	);
}
