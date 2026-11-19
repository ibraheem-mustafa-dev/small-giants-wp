/**
 * Whether a key press belongs to an open `<dialog>` nested inside a navigation
 * surface rather than to the surface itself.
 *
 * A mega panel or the nav drawer can hold a block that opens its own dialog
 * (the gallery's lightbox). Escape pressed in that dialog bubbles up to the
 * surface's own keydown handler; if the surface acts on it (closing itself and
 * calling `preventDefault()`, which also cancels the dialog's own close), the
 * dialog is left open and modal inside a hidden surface and the page is inert.
 * Every key from inside such a dialog belongs to the dialog: Escape closes it
 * natively, and Tab stays inside it.
 *
 * Only a dialog INSIDE `owner` counts. The surface may itself sit inside a
 * dialog (a mega panel inside the nav drawer), and keys there still belong to
 * the surface.
 *
 * @param {KeyboardEvent} event The key press.
 * @param {Element|null}  owner The surface whose handler is running (the panel or the drawer element).
 * @return {boolean} True when the handler should leave the key alone.
 */
export function keyBelongsToInnerDialog( event, owner ) {
	const target = event && event.target;
	if ( ! owner || ! target || typeof target.closest !== 'function' ) {
		return false;
	}
	const dialog = target.closest( 'dialog[open]' );
	return !! dialog && dialog !== owner && owner.contains( dialog );
}
