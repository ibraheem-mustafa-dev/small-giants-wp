/**
 * Fixture: negative control -- no border-shaped control at all. Must be
 * refused with 'width-match-count!=1' (0 matches), never guessed.
 */
export default function Edit( { attributes, setAttributes } ) {
	const { padding } = attributes;
	return (
		<PanelBody title={ __( 'Spacing', 'sgs-blocks' ) }>
			<ResponsiveBoxControl
				label={ __( 'Padding', 'sgs-blocks' ) }
				presets
				values={ { base: padding ?? {} } }
				onChange={ ( tier, next ) => setAttributes( { padding: next } ) }
			/>
		</PanelBody>
	);
}
