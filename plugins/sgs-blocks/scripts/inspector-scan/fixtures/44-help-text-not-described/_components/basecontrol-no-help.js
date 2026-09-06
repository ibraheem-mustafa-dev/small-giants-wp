export default function Field( { onOpen } ) {
	return (
		<BaseControl label="Colour" __nextHasNoMarginBottom>
			<Button onClick={ onOpen }>Pick</Button>
		</BaseControl>
	);
}
