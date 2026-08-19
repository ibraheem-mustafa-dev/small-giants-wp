/**
 * The shared panel that actually mounts the superseded control.
 * One fix here repairs every block rendering <SharedLinkPanel>.
 */
export function SharedLinkPanel( { attributes, setAttributes } ) {
	return (
		<PanelBody title="Link">
			<SgsLinkControl
				value={ attributes.url }
				onChange={ ( url ) => setAttributes( { url } ) }
			/>
		</PanelBody>
	);
}
