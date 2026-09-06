export default function Field( { url, onOpen } ) {
	return (
		<BaseControl label="Link" help={ __( 'Choose where this links to.', 'sgs-blocks' ) } __nextHasNoMarginBottom>
			<Button variant="tertiary" onClick={ onOpen }>
				{ url || 'Add link' }
			</Button>
		</BaseControl>
	);
}
