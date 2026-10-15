/**
 * The burger button's `menu-open` motion state (Spec 38A FR-38A-53, unit M5.17).
 *
 * `sgs/nav-bar-menu` declares the state `menu-open`. A burger that holds an Entrance layer (the renderer marks the
 * button `data-sgs-me~="state"`) is a state host: while the menu is open the button carries `menu-open` in
 * `data-sgs-motion-state`, and the layer's own from and to values play on it. The `sgs/nav` store owns opening and
 * closing and shows it on the button's `aria-expanded` (`data-wp-bind--aria-expanded="state.isOpen"`); this module
 * turns each flip into the state. The pose change itself (the bars' lines) is a CSS transition on `aria-expanded`
 * whose speed and easing the layer sets (render.php writes `--sgs-nbm-burger-morph-duration` and `-easing`).
 *
 * `@sgs/motion-state` is loaded through `src/shared/motion-state-publish.js` (a native `import()` that resolves
 * through the import map and fails soft), only when the button carries a state entrance. No inline style is written.
 *
 * @package
 */

import { hasStateMotion, setState } from '../../shared/motion-state-publish';

export const BURGER = '.sgs-nav-bar-menu__burger';
export const STATE = 'menu-open';

const wired = new WeakSet();

/**
 * Wire one burger.
 *
 * @param {Element} burger The burger button.
 * @return {boolean} True when it was wired now.
 */
export function wireBurgerMotionState( burger ) {
	if (
		! burger ||
		wired.has( burger ) ||
		! hasStateMotion( burger ) ||
		'function' !== typeof window.MutationObserver
	) {
		return false;
	}
	wired.add( burger );
	const sync = () =>
		setState(
			burger,
			STATE,
			'true' === burger.getAttribute( 'aria-expanded' )
		);
	new window.MutationObserver( sync ).observe( burger, {
		attributes: true,
		attributeFilter: [ 'aria-expanded' ],
	} );
	if ( 'true' === burger.getAttribute( 'aria-expanded' ) ) {
		sync();
	}
	return true;
}

/**
 * Wire every burger under a root that holds a state entrance.
 *
 * @param {Document|Element} [root=document] Where to look.
 * @return {number} How many burgers were wired.
 */
export default function initBurgerMotionState( root = document ) {
	if ( ! root || 'function' !== typeof root.querySelectorAll ) {
		return 0;
	}
	let count = 0;
	root.querySelectorAll( BURGER ).forEach( ( burger ) => {
		if ( wireBurgerMotionState( burger ) ) {
			count++;
		}
	} );
	return count;
}
