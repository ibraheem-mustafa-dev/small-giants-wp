/**
 * "Show the focus look in the editor": editor-only state, never saved. The canvas twin of the keyboard focus ring
 * (theme focus.css's `.sgs-focus-preview` arm) so the author can see what a visitor tabbing to the button will see.
 * The state lives in the edit component (useState), so it is not an attribute, not in save.js and not in render.php.
 */
import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { CheckboxControl } from '@wordpress/components';

export const FOCUS_PREVIEW_CLASS = 'sgs-focus-preview';

/** @return {{ className: string, control: JSX.Element }} the canvas class (empty while unticked) and the checkbox. */
export function useFocusPreview() {
	const [ showFocus, setShowFocus ] = useState( false );
	return {
		className: showFocus ? FOCUS_PREVIEW_CLASS : '',
		control: (
			<CheckboxControl
				label={ __( 'Show the focus look in the editor', 'sgs-blocks' ) }
				help={ __( 'Previews the keyboard focus ring on this button. It is only shown here and is never saved.', 'sgs-blocks' ) }
				checked={ showFocus }
				onChange={ setShowFocus }
				__nextHasNoMarginBottom
			/>
		),
	};
}
