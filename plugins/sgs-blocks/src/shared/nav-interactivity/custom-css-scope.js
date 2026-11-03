/**
 * Keep a block's Custom CSS reaching an element the page moves to `<body>`.
 *
 * `includes/custom-css.php::render_custom_css` puts a per-instance scope
 * class (`sgs-c-<key>`) on the block's outer element and scopes every rule
 * under it (`.sgs-c-x.sgs-c-x .sgs-cart__item-thumb`). A drawer dialog
 * (`store.js::reparentToBody`) or a mega panel
 * (`mega-disclosure.js::reparentPanelIfNeeded`) moved to `<body>` leaves that
 * ancestor, so those rules stop matching while it is open. Copying the scope
 * classes of its ancestors onto the moved element keeps every rule aimed at
 * its contents matching; a rule aimed at the moved element itself is written
 * `&.sgs-cart__panel`.
 */

const SCOPE_CLASS = /^sgs-c-[a-z0-9-]+$/;

/**
 * Add the Custom CSS scope classes of `el`'s ancestors to `el`. Call before the move.
 *
 * @param {HTMLElement} el Element about to be moved out of its block.
 * @return {string[]} The classes added (pass to `dropCustomCssScope` when moving it back).
 */
export function carryCustomCssScope( el ) {
	const added = [];
	for ( let node = el.parentElement; node && node !== document.body; node = node.parentElement ) {
		for ( const cls of node.classList ) {
			if ( SCOPE_CLASS.test( cls ) && ! el.classList.contains( cls ) ) {
				el.classList.add( cls );
				added.push( cls );
			}
		}
	}
	return added;
}

/**
 * Remove classes `carryCustomCssScope` added, once the element is back in its block.
 *
 * @param {HTMLElement} el      The element moved back.
 * @param {string[]}    classes The classes `carryCustomCssScope` returned.
 */
export function dropCustomCssScope( el, classes ) {
	for ( const cls of classes || [] ) {
		el.classList.remove( cls );
	}
}
