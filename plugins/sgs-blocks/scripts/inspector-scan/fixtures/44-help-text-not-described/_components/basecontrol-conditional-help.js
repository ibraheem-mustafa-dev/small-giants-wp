// A pass-through / conditional `help` value — presumed capable of carrying
// real text, so this MUST flag (this is the LinkPopoverControl.js /
// DesignTokenPicker.js shape: help is not authored inline, it is supplied by
// the caller).
export default function Field( { showHelp, onOpen } ) {
	return (
		<BaseControl label="X" help={ showHelp ? __( 'Text', 'sgs-blocks' ) : undefined } __nextHasNoMarginBottom>
			<Button onClick={ onOpen }>Y</Button>
		</BaseControl>
	);
}
