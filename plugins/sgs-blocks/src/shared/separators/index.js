/**
 * Separators — frontend entry. An adopting block's view.js calls `initSeparators()`
 * once; it finds every list that carries separators (a root with the
 * `sgs-has-separators` class and a `data-sgs-sep-list` value, `self` or a path below the
 * root that starts with a child combinator such as `> .sgs-container__inner`, written by
 * `includes/helpers-separators-css.php::sgs_separators_root_attrs`) and starts the
 * overlay on each. In a browser with native gap decorations it does nothing.
 *
 * @package SGS\Blocks
 */

import { initSeparatorList, supportsGapDecorations } from './overlay';

/**
 * Start the overlay on every separators list inside a scope.
 *
 * @param {ParentNode} [scope] Where to look. Default: the whole document.
 */
export function initSeparators( scope = document ) {
	if ( supportsGapDecorations() ) {
		return;
	}
	scope.querySelectorAll( '.sgs-has-separators' ).forEach( ( root ) => {
		const selector = root.getAttribute( 'data-sgs-sep-list' ) || 'self';
		const lists = 'self' === selector ? [ root ] : root.querySelectorAll( `:scope ${ selector }` );
		lists.forEach( ( list ) => {
			initSeparatorList( list );
		} );
	} );
}

export { initSeparatorList, supportsGapDecorations };
