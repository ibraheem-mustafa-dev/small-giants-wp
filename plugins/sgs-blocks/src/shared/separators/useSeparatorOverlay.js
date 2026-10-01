/**
 * Separators — the editor hook for the runtime overlay.
 *
 * In an editor without CSS gap decorations (Safari, Firefox) the canvas paints the
 * same overlay the page does, so a container's lines are visible while editing. In
 * a browser with decorations it does nothing. Re-runs when `key` changes (the
 * serialised settings that move or restyle a line); the overlay's own observers
 * cover resizes and added or removed blocks.
 *
 * @package SGS\Blocks
 */

import { useEffect } from '@wordpress/element';
import { initSeparatorList } from './overlay';
import './editor.css';

/**
 * @param {{current: HTMLElement|null}} ref    The list element's ref.
 * @param {string}                      key    '' for no lines, else a string that changes with the settings.
 */
export function useSeparatorOverlay( ref, key ) {
	useEffect( () => {
		if ( ! ref.current || '' === key ) {
			return undefined;
		}
		// Canvas children are block wrappers (`data-block`); the inserter and drop
		// markers are not items.
		return initSeparatorList( ref.current, { isItem: ( el ) => el.hasAttribute( 'data-block' ) } );
	}, [ ref, key ] );
}
