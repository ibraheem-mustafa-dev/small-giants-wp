/**
 * Shared overlay scrollbar (Spec 32 FR-32-26).
 *
 * An element that carries `data-sgs-overlay-scroll`, or matches one of the selectors in OVERLAY_SELECTORS, keeps its native
 * scrolling (wheel, touch, keyboard, focus scrolling, scroll snapping) and gains a thumb drawn over its end edge that takes no
 * layout width. The native bar is hidden only once this module has mounted (the `sgs-overlay-scroll` class), so without script
 * the element keeps the slim native bar from scrollbars.css.
 *
 * The thumb is an absolutely positioned, aria-hidden child of the scroller. It follows the content with a transform equal to
 * scrollTop plus the thumb offset, is drawn only while the content overflows, shows while the scroller scrolls or the pointer
 * moves over it, and fades after IDLE_MS. Coarse-pointer devices, whose platform already draws an overlay bar, are skipped
 * unless the attribute value is `force`. Vertical scrolling only.
 *
 * Elements that appear later (a drawer reparented, a panel rendered on demand) are picked up by one MutationObserver, which
 * scans only the added subtrees; elements that leave the document are released. `window.sgsOverlayScroll.scan( root )` mounts
 * an explicit subtree.
 *
 * Layout cost: a scan reads every new scroller's computed position before it writes any thumb or class, and every scheduled
 * repaint runs in one shared animation frame that measures all dirty scrollers before writing any thumb, so a page pays
 * one style and layout pass per batch, not one per scroller.
 *
 * @package SGS\Theme
 */

export const OVERLAY_SELECTORS = [
	'[data-sgs-overlay-scroll]',
	'.wp-block-sgs-nav-drawer',
	'.sgs-nav-drawer__body',
	'.sgs-modal__dialog',
	'.sgs-cart__panel-items',
	'.sgs-choice-flow__body',
	'.sgs-shop-filters__scroll',
	'.sgs-shop-filters-plain .wc-block-product-filter-checkbox-list__items',
	'[class*="__mega-panel-wrap"]',
].join( ',' );

const IDLE_MS = 800;
const END_INSET = 4;
const MIN_THUMB = 28;

/**
 * Thumb size and offset for a scroller's metrics.
 *
 * @param {{scrollPos:number, scrollSize:number, clientSize:number, endInset?:number, minThumb?:number}} m Scroll metrics.
 * @return {{visible:boolean, thumbSize:number, thumbOffset:number, trackSize:number, maxScroll:number}} The thumb geometry.
 */
export function thumbMetrics( { scrollPos, scrollSize, clientSize, endInset = END_INSET, minThumb = MIN_THUMB } ) {
	const maxScroll = Math.max( 0, scrollSize - clientSize );
	const trackSize = Math.max( 0, clientSize - endInset * 2 );
	if ( maxScroll < 1 || trackSize <= 0 ) {
		return { visible: false, thumbSize: 0, thumbOffset: 0, trackSize, maxScroll };
	}
	const thumbSize = Math.min( trackSize, Math.max( minThumb, ( clientSize / scrollSize ) * trackSize ) );
	const ratio = Math.min( 1, Math.max( 0, scrollPos / maxScroll ) );
	return { visible: true, thumbSize, thumbOffset: ratio * ( trackSize - thumbSize ), trackSize, maxScroll };
}

/**
 * Scroll position that a thumb drag of `delta` pixels from `startScroll` reaches.
 *
 * @param {number} startScroll Scroll position when the drag began.
 * @param {number} delta       Pointer travel in pixels.
 * @param {{thumbSize:number, trackSize:number, maxScroll:number}} g Geometry.
 * @return {number} The clamped scroll position.
 */
export function dragScrollPos( startScroll, delta, g ) {
	const travel = g.trackSize - g.thumbSize;
	if ( travel <= 0 ) {
		return startScroll;
	}
	return Math.min( g.maxScroll, Math.max( 0, startScroll + ( delta * g.maxScroll ) / travel ) );
}

const controllers = new Map();

// Scrollers waiting for a repaint, flushed together in one frame: every read first, then every write.
const dirty = new Map();
let flushFrame = 0;

function flush() {
	flushFrame = 0;
	const batch = Array.from( dirty.values() );
	dirty.clear();
	const measured = batch.map( ( painter ) => painter.measure() );
	batch.forEach( ( painter, i ) => painter.apply( measured[ i ] ) );
}

function mount( el, isStatic ) {
	const reduced = window.matchMedia( '(prefers-reduced-motion: reduce)' );
	const thumb = document.createElement( 'div' );
	thumb.className = 'sgs-overlay-scroll__thumb';
	thumb.setAttribute( 'aria-hidden', 'true' );
	thumb.hidden = true;
	el.appendChild( thumb );
	el.classList.add( 'sgs-overlay-scroll' );
	if ( isStatic ) {
		el.classList.add( 'sgs-overlay-scroll--relative' );
	}

	let geo = thumbMetrics( { scrollPos: 0, scrollSize: 0, clientSize: 0 } );
	let hideTimer = 0;
	let dragging = false;
	let overThumb = false;

	const hide = () => {
		if ( dragging || overThumb ) {
			return;
		}
		thumb.classList.remove( 'is-visible' );
	};
	const show = () => {
		if ( ! geo.visible ) {
			return;
		}
		thumb.classList.add( 'is-visible' );
		clearTimeout( hideTimer );
		hideTimer = setTimeout( hide, IDLE_MS );
	};
	const measure = () => {
		const scrollPos = el.scrollTop;
		return { scrollPos, g: thumbMetrics( { scrollPos, scrollSize: el.scrollHeight, clientSize: el.clientHeight } ) };
	};
	const apply = ( { scrollPos, g } ) => {
		geo = g;
		thumb.hidden = ! geo.visible;
		if ( ! geo.visible ) {
			thumb.classList.remove( 'is-visible' );
			return;
		}
		thumb.style.setProperty( '--sgs-overlay-scroll-h', geo.thumbSize + 'px' );
		thumb.style.setProperty( '--sgs-overlay-scroll-y', scrollPos + END_INSET + geo.thumbOffset + 'px' );
	};
	const paint = () => {
		dirty.delete( el );
		apply( measure() );
	};
	const schedule = () => {
		dirty.set( el, { measure, apply } );
		if ( ! flushFrame ) {
			flushFrame = requestAnimationFrame( flush );
		}
	};
	const onScroll = () => {
		paint();
		show();
	};

	let startY = 0;
	let startScroll = 0;
	const onThumbDown = ( e ) => {
		if ( 0 !== e.button ) {
			return;
		}
		dragging = true;
		startY = e.clientY;
		startScroll = el.scrollTop;
		thumb.setPointerCapture( e.pointerId );
		thumb.classList.add( 'is-dragging' );
		e.preventDefault();
		e.stopPropagation();
	};
	const onThumbMove = ( e ) => {
		if ( dragging ) {
			el.scrollTop = dragScrollPos( startScroll, e.clientY - startY, geo );
		}
	};
	const onThumbUp = () => {
		dragging = false;
		thumb.classList.remove( 'is-dragging' );
		show();
	};

	// A press in the thumb's strip, outside the thumb, pages the scroller (as a native track does).
	const onTrackDown = ( e ) => {
		if ( 0 !== e.button || ! geo.visible || ! thumb.classList.contains( 'is-visible' ) || thumb.contains( e.target ) ) {
			return;
		}
		const box = el.getBoundingClientRect();
		const hit = thumb.offsetWidth || 8;
		const rtl = 'rtl' === getComputedStyle( el ).direction;
		const inStrip = rtl ? e.clientX <= box.left + el.clientLeft + hit : e.clientX >= box.right - el.clientLeft - hit;
		if ( ! inStrip ) {
			return;
		}
		const y = e.clientY - box.top - el.clientTop;
		const thumbTop = END_INSET + geo.thumbOffset;
		if ( y >= thumbTop && y <= thumbTop + geo.thumbSize ) {
			return;
		}
		el.scrollBy( { top: ( y < thumbTop ? -1 : 1 ) * el.clientHeight * 0.9, behavior: reduced.matches ? 'auto' : 'smooth' } );
		e.preventDefault();
		e.stopPropagation();
		window.addEventListener( 'click', ( c ) => c.stopPropagation(), { capture: true, once: true } );
	};

	const onMove = ( e ) => {
		if ( 'mouse' === e.pointerType ) {
			paint();
			show();
		}
	};
	const enterThumb = () => {
		overThumb = true;
		show();
	};
	const leaveThumb = () => {
		overThumb = false;
		show();
	};

	el.addEventListener( 'scroll', onScroll, { passive: true } );
	el.addEventListener( 'pointermove', onMove, { passive: true } );
	el.addEventListener( 'pointerdown', onTrackDown, true );
	thumb.addEventListener( 'pointerdown', onThumbDown );
	thumb.addEventListener( 'pointermove', onThumbMove );
	thumb.addEventListener( 'pointerup', onThumbUp );
	thumb.addEventListener( 'pointercancel', onThumbUp );
	thumb.addEventListener( 'pointerenter', enterThumb );
	thumb.addEventListener( 'pointerleave', leaveThumb );

	const resize = new ResizeObserver( schedule );
	resize.observe( el );
	Array.from( el.children ).forEach( ( c ) => c !== thumb && resize.observe( c ) );
	const mutations = new MutationObserver( ( records ) => {
		// A script that replaces the scroller's children (the cart panel renders its rows with innerHTML and replaceChildren) takes
		// the thumb with them; put it back so the scroller keeps its bar.
		if ( thumb.parentNode !== el ) {
			el.appendChild( thumb );
		}
		if ( records.some( ( r ) => r.target !== thumb && ! thumb.contains( r.target ) ) ) {
			schedule();
		}
	} );
	mutations.observe( el, { childList: true, subtree: true, attributes: true, attributeFilter: [ 'open', 'hidden', 'class', 'aria-expanded' ] } );

	controllers.set( el, () => {
		dirty.delete( el );
		clearTimeout( hideTimer );
		resize.disconnect();
		mutations.disconnect();
		el.removeEventListener( 'scroll', onScroll );
		el.removeEventListener( 'pointermove', onMove );
		el.removeEventListener( 'pointerdown', onTrackDown, true );
		thumb.remove();
		el.classList.remove( 'sgs-overlay-scroll', 'sgs-overlay-scroll--relative' );
	} );
	schedule();
}

/**
 * Mount every matching element at or under `root`.
 *
 * @param {ParentNode} root Subtree to scan.
 */
export function scan( root = document ) {
	const found = Array.from( root.querySelectorAll( OVERLAY_SELECTORS ) );
	if ( 1 === root.nodeType && root.matches( OVERLAY_SELECTORS ) ) {
		found.unshift( root );
	}
	const coarse = window.matchMedia( '(hover: none) and (pointer: coarse)' ).matches;
	const fresh = found.filter(
		( el ) => ! controllers.has( el ) && ( ! coarse || 'force' === el.getAttribute( 'data-sgs-overlay-scroll' ) )
	);
	// Every read before any write: one style pass for the whole batch.
	const statics = fresh.map( ( el ) => 'static' === getComputedStyle( el ).position );
	fresh.forEach( ( el, i ) => mount( el, statics[ i ] ) );
}

function release() {
	controllers.forEach( ( destroy, el ) => {
		if ( ! el.isConnected ) {
			destroy();
			controllers.delete( el );
		}
	} );
}

function start() {
	scan( document );
	// Added element roots and whether anything left, collected until the next frame.
	const added = new Set();
	let removed = false;
	let queued = false;
	const flushAdded = () => {
		queued = false;
		if ( removed ) {
			removed = false;
			release();
		}
		const roots = new Set( added );
		added.clear();
		// A root inside another collected root is covered by that root's scan (one walk up each root's ancestors).
		const covered = ( node ) => {
			for ( let up = node.parentElement; up; up = up.parentElement ) {
				if ( roots.has( up ) ) {
					return true;
				}
			}
			return false;
		};
		roots.forEach( ( node ) => {
			if ( node.isConnected && ! covered( node ) ) {
				scan( node );
			}
		} );
	};
	new MutationObserver( ( records ) => {
		records.forEach( ( record ) => {
			record.addedNodes.forEach( ( node ) => {
				if ( 1 === node.nodeType && ! node.classList.contains( 'sgs-overlay-scroll__thumb' ) ) {
					added.add( node );
				}
			} );
			if ( record.removedNodes.length ) {
				removed = true;
			}
		} );
		if ( ! queued && ( added.size || removed ) ) {
			queued = true;
			requestAnimationFrame( flushAdded );
		}
	} ).observe( document.body, { childList: true, subtree: true } );
	window.sgsOverlayScroll = { scan };
}

if ( 'undefined' !== typeof document && 'undefined' !== typeof window && 'function' === typeof window.matchMedia ) {
	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', start, { once: true } );
	} else {
		start();
	}
}
