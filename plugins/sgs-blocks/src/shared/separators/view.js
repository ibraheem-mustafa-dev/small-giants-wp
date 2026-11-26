/**
 * Separators: the frontend script module `@sgs/separators` (build/shared/separators.js).
 *
 * `includes/helpers-separators-css.php::sgs_separators_enqueue_fallback` enqueues it on
 * every page that prints a flow list, so no block needs a view script of its own for
 * the lines. In a browser without native CSS gap decorations it paints them from
 * measured item positions; elsewhere it does nothing.
 *
 * @package SGS\Blocks
 */

import { initSeparators } from './index';

if ( 'loading' === document.readyState ) {
	document.addEventListener( 'DOMContentLoaded', () => initSeparators() );
} else {
	initSeparators();
}
