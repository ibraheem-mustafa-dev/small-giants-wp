/**
 * SGS Wishlist Panel — alert opt-in checkboxes (FR-30-15).
 *
 * Delegated on the bars container built by `render-bars.js::alertsBarHtml`.
 * A failed request reverts the tick and announces `errorText` through the
 * panel's one polite status region — never a silent no-op.
 *
 * @package
 */
import { setWishlistAlerts } from '../../shared/wishlist-store';

/**
 * Wire every `[data-sgs-wishlist-alert]` checkbox inside `container`.
 *
 * @param {HTMLElement} container The `[data-sgs-wishlist-bars]` element.
 * @param {Object}      labels    `labels.js::readPanelData()` output.
 * @param {Function}    announce  `(message:string) => void` — the panel's status region.
 */
export function wireAlerts( container, labels, announce ) {
	container.addEventListener( 'change', async ( event ) => {
		const checkbox = event.target.closest( '[data-sgs-wishlist-alert]' );
		if ( ! checkbox ) {
			return;
		}
		const key = checkbox.dataset.sgsWishlistAlert; // 'price' | 'stock'
		const nextValue = checkbox.checked;
		checkbox.disabled = true;
		const result = await setWishlistAlerts( { [ key ]: nextValue } );
		checkbox.disabled = false;
		if ( ! result.ok ) {
			checkbox.checked = ! nextValue; // Revert to the last-known state.
			announce( labels.errorText );
			return;
		}
		const labelText = checkbox.nextElementSibling?.textContent || '';
		announce( labelText );
	} );
}
