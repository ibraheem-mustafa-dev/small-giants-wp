import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, RichText } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	const { heading, body, matchTags } = attributes;

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
			</div>
		</>
	);
}
