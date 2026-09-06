/**
 * Migrated away from <SgsLinkControl> on 2026-08-13 — this docblock names it
 * deliberately so the comment-stripping path stays under test.
 */
export function PanelWithProseOnly( { attributes, setAttributes } ) {
	return (
		<PanelBody title="Link">
			<LinkPopoverField
				value={ attributes.url }
				onChange={ ( url ) => setAttributes( { url } ) }
			/>
		</PanelBody>
	);
}
