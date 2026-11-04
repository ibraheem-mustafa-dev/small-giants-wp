/**
 * The "Basket count" format's view module (Spec 27 FR-30-24): fills every `.sgs-basket-count` span with the number of
 * items in the basket and keeps it current.
 *
 * Loaded only on a page whose markup holds the class (includes/helpers-inline-formats.php::sgs_basket_count_enqueue).
 * The span is printed empty, so nothing shows until the first reading arrives (never a flashing 0).
 *
 * @package
 */

import { onCartChange } from './index';

const spans = document.querySelectorAll( '.sgs-basket-count' );

if ( spans.length ) {
	onCartChange( ( cart ) => {
		const count = Number(
			cart?.items_count ??
				( cart?.items || [] ).reduce(
					( sum, item ) => sum + Number( item?.quantity ?? 0 ),
					0
				)
		);
		spans.forEach( ( span ) => {
			span.textContent = String( count );
		} );
	} );
}
