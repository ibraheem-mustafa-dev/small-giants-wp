/**
 * SGS Nav Drawer: the `grow-from-anchor` entry animation (Spec 36 U-5, gap G-3).
 *
 * The drawer's own box HEIGHT animates from its anchor's height to its full
 * height with the top fixed, and back on close; it is never a clip. The
 * keyframes (`sgs-nav-drawer-grow-in` / `-out` in style.css) read two
 * custom-property VALUES this module measures and writes on the dialog:
 *
 * - `--sgs-nd-grow-from`: the anchor's height. For `header-box` it is the
 *   header's own height (`--sgs-drawer-hb-row-h`, published by the shared store
 *   before it opens the dialog); for any other anchor it is 0.
 * - `--sgs-nd-grow-to`: the full height, from `scrollHeight`, kept current while
 *   the drawer is open (a ResizeObserver on its rows), so the close starts from
 *   the real height even after an accordion opened.
 *
 * Both are in the dialog's own CSS pixels: a measured screen length is divided
 * by the dialog's effective zoom (the header's fluid scale), and the box-sizing
 * decides whether padding and borders count. Where the browser supports
 * `interpolate-size`, the `auto` fallback in the keyframes carries the first
 * frame even before this runs. The store's close waits on the CSS exit
 * animation it finds on the dialog, so nothing here touches the close order.
 *
 * Reduced motion: style.css only runs the keyframes under
 * `prefers-reduced-motion: no-preference`, and this module adds nothing then.
 *
 * @package SGS\Blocks
 */

const GROW_CLASS = 'sgs-nav-drawer--grow';
const GROWING_CLASS = 'sgs-nav-drawer--growing';
const ENTRY_ANIMATION = 'sgs-nav-drawer-grow-in';

/**
 * @param {HTMLElement} drawer The dialog.
 * @return {boolean} Whether the resolved shape at this width is grow-from-anchor.
 */
function growsNow( drawer ) {
	return '1' === window.getComputedStyle( drawer ).getPropertyValue( '--sgs-nd-grow' ).trim();
}

/**
 * @return {boolean} Whether the visitor asked for reduced motion.
 */
function reducedMotion() {
	return window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
}

/**
 * The dialog's effective zoom, so screen pixels convert to its own pixels.
 *
 * @param {HTMLElement}         drawer The dialog.
 * @param {CSSStyleDeclaration} style  Its computed style.
 * @return {number} The zoom factor (1 when unzoomed).
 */
function zoomOf( drawer, style ) {
	if ( 'number' === typeof drawer.currentCSSZoom && drawer.currentCSSZoom > 0 ) {
		return drawer.currentCSSZoom;
	}
	const zoom = parseFloat( style.zoom );
	return zoom > 0 ? zoom : 1;
}

/**
 * Measure both ends of the grow and write them on the dialog.
 *
 * @param {HTMLElement} drawer The dialog.
 */
function measure( drawer ) {
	const style = window.getComputedStyle( drawer );
	const px = ( value ) => parseFloat( value ) || 0;
	const frame =
		px( style.paddingTop ) +
		px( style.paddingBottom ) +
		px( style.borderTopWidth ) +
		px( style.borderBottomWidth );
	const borders = px( style.borderTopWidth ) + px( style.borderBottomWidth );
	const borderBox = 'border-box' === style.boxSizing;

	const anchor =
		'1' === style.getPropertyValue( '--sgs-nd-grows' ).trim()
			? px( style.getPropertyValue( '--sgs-drawer-hb-row-h' ) ) / zoomOf( drawer, style )
			: 0;
	const full = drawer.scrollHeight + borders;
	const cap = 'none' === style.maxHeight ? Infinity : px( style.maxHeight );

	// `height` is the content box unless the dialog is border-box.
	const from = borderBox ? Math.max( anchor, frame ) : Math.max( 0, anchor - frame );
	const to = Math.min( borderBox ? full : full - frame, cap );

	drawer.style.setProperty( '--sgs-nd-grow-from', `${ Math.round( from ) }px` );
	drawer.style.setProperty( '--sgs-nd-grow-to', `${ Math.max( Math.round( to ), Math.round( from ) ) }px` );
}

/**
 * Wire one drawer: measure on open (and again before the first painted frame,
 * after the store has settled the close control), keep the full height current
 * while open, hide overflow while it grows, and clear everything on close.
 *
 * @param {HTMLElement} drawer The dialog.
 */
function wire( drawer ) {
	let observer = null;
	let wasOpen = drawer.open;

	const settle = () => drawer.classList.remove( GROWING_CLASS );

	const onOpen = () => {
		if ( ! growsNow( drawer ) ) {
			return;
		}
		measure( drawer );
		window.requestAnimationFrame( () => drawer.open && measure( drawer ) );

		if ( ! reducedMotion() ) {
			drawer.classList.add( GROWING_CLASS );
			const entry = drawer
				.getAnimations()
				.find( ( animation ) => ENTRY_ANIMATION === animation.animationName );
			if ( entry ) {
				entry.finished.then( settle, settle );
			} else {
				window.requestAnimationFrame( settle );
			}
		}

		if ( 'function' === typeof window.ResizeObserver ) {
			observer = new window.ResizeObserver( () => {
				if (
					drawer.open &&
					! drawer.classList.contains( GROWING_CLASS ) &&
					! drawer.classList.contains( 'is-closing' )
				) {
					measure( drawer );
				}
			} );
			Array.from( drawer.children ).forEach( ( child ) => observer.observe( child ) );
		}
	};

	const onClose = () => {
		settle();
		if ( observer ) {
			observer.disconnect();
			observer = null;
		}
		drawer.style.removeProperty( '--sgs-nd-grow-from' );
		drawer.style.removeProperty( '--sgs-nd-grow-to' );
	};

	new window.MutationObserver( ( records ) => {
		const isOpen = drawer.open;
		if ( isOpen !== wasOpen ) {
			wasOpen = isOpen;
			( isOpen ? onOpen : onClose )();
			return;
		}
		// The store flags the opener live after show(); a close-only chrome row
		// may drop then, changing the full height.
		if (
			isOpen &&
			! drawer.classList.contains( 'is-closing' ) &&
			records.some( ( record ) => 'data-sgs-nav-opener-live' === record.attributeName ) &&
			growsNow( drawer )
		) {
			measure( drawer );
		}
	} ).observe( drawer, {
		attributes: true,
		attributeFilter: [ 'open', 'data-sgs-nav-opener-live' ],
	} );

	if ( drawer.open ) {
		onOpen();
	}
}

/**
 * Wire every drawer on the page that grows at some width.
 */
export default function initGrowFromAnchor() {
	document.querySelectorAll( `.wp-block-sgs-nav-drawer.${ GROW_CLASS }` ).forEach( wire );
}
