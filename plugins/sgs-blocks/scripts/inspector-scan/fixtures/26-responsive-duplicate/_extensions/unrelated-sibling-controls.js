/**
 * MUST NOT FLAG — two sibling controls with no tier relationship.
 *
 * Guards against grouping on "two controls in one parent". `title` and
 * `subtitle` share a parent and nothing else; neither carries a tier word.
 */
export default function UnrelatedSiblingControls( { attributes, setAttributes } ) {
	return (
		<PanelBody title="Content">
			<TextControl
				label="Title"
				value={ attributes.title }
				onChange={ ( val ) => setAttributes( { title: val } ) }
			/>
			<TextControl
				label="Subtitle"
				value={ attributes.subtitle }
				onChange={ ( val ) => setAttributes( { subtitle: val } ) }
			/>
		</PanelBody>
	);
}
