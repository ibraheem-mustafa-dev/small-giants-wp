/**
 * SGS Wishlist Panel — share-by-link controls (FR-30-15 §4e).
 *
 * Delegated on the bars container built by `render-bars.js::alertsBarHtml`.
 * Toggling on, copying, and making a new link each round-trip
 * `POST /sgs/v1/wishlist/share`; a failure announces `errorText` and never
 * silently no-ops.
 *
 * @package
 */
import { setWishlistShare } from '../../shared/wishlist-store';

/**
 * Copy a field's value to the clipboard, falling back to `select()` +
 * `execCommand` when the async Clipboard API is unavailable (older browsers,
 * or a non-secure context).
 *
 * @param {HTMLInputElement} field The read-only share-link input.
 * @return {Promise<boolean>} Whether the copy succeeded.
 */
async function copyField( field ) {
	try {
		if ( navigator?.clipboard?.writeText ) {
			await navigator.clipboard.writeText( field.value );
			return true;
		}
	} catch ( e ) {
		// Fall through to the select()/execCommand fallback below.
	}
	try {
		field.select();
		return document.execCommand( 'copy' );
	} catch ( e ) {
		return false;
	}
}

/**
 * Wire the share toggle, copy and "Make a new link" controls inside
 * `container`.
 *
 * @param {HTMLElement} container The `[data-sgs-wishlist-bars]` element.
 * @param {Object}      labels    `labels.js::readPanelData()` output.
 * @param {Function}    announce  `(message:string) => void` — the panel's status region.
 */
export function wireShare( container, labels, announce ) {
	container.addEventListener( 'click', async ( event ) => {
		const toggle = event.target.closest( '[data-sgs-wishlist-share-toggle]' );
		const copyButton = event.target.closest( '[data-sgs-wishlist-share-copy]' );
		const regenerateButton = event.target.closest( '[data-sgs-wishlist-share-regenerate]' );
		const shareBlock = container.querySelector( '.sgs-wishlist-panel__share' );
		const controls = shareBlock?.querySelector( '.sgs-wishlist-panel__share-controls' );
		const field = shareBlock?.querySelector( '[data-sgs-wishlist-share-field]' );

		if ( toggle ) {
			const nextEnabled = 'true' !== toggle.getAttribute( 'aria-pressed' );
			toggle.disabled = true;
			const result = await setWishlistShare( { enabled: nextEnabled } );
			toggle.disabled = false;
			if ( ! result.ok ) {
				announce( labels.errorText );
				return;
			}
			toggle.setAttribute( 'aria-pressed', result.share.enabled ? 'true' : 'false' );
			if ( controls ) {
				controls.hidden = ! result.share.enabled;
			}
			if ( field ) {
				field.value = result.share.url || '';
			}
			return;
		}

		if ( copyButton && field ) {
			const copied = await copyField( field );
			announce( copied ? labels.shareCopiedText : labels.errorText );
			return;
		}

		if ( regenerateButton ) {
			regenerateButton.disabled = true;
			const result = await setWishlistShare( { enabled: true, regenerate: true } );
			regenerateButton.disabled = false;
			if ( ! result.ok ) {
				announce( labels.errorText );
				return;
			}
			if ( field ) {
				field.value = result.share.url || '';
			}
		}
	} );
}
