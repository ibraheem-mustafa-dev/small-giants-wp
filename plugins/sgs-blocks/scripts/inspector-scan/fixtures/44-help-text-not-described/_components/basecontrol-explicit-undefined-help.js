export default function Field( { onOpen } ) {
	return (
		<BaseControl label="X" help={ undefined } __nextHasNoMarginBottom>
			<Button onClick={ onOpen }>Y</Button>
		</BaseControl>
	);
}
