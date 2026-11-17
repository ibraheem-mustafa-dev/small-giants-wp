/**
 * Scroll row controls: arrows, position dots and mouse drag for a native sideways-scrolling row.
 *
 * Used by sgs/container's "Scroll sideways" (`scrollArrows`, `scrollDots`, `scrollDrag`). The row stays native CSS
 * scroll-snap and this script only moves it (`scrollTo`) and reads where it is, so without script the row still swipes
 * and nothing dead is shown: the server prints the bar hidden and it appears (`is-ready`) only while the row scrolls.
 *
 * The row names what to wire in `data-sgs-scroll-controls` (a token list of `arrows`, `dots`, `drag`). Its controls bar
 * is the next sibling, `.sgs-container__scroll-nav`, holding the two arrows and an empty `.sgs-container__dots` group.
 *
 * A "stop" is a scroll position the row rests on: each item's start (less the row's scroll padding), clamped to the
 * furthest the row scrolls, so the items past that point share the last stop and every dot is reachable. An arrow moves
 * one stop and a dot goes to its stop. Previous is disabled at the start and next at the end (focus moves to the other
 * arrow first, so a keyboard user is never dropped). Reduced motion: no smooth scrolling. Drag is the mouse only, since a
 * finger already swipes natively; it turns snapping off while the pointer is down, then settles on the nearest stop, and
 * swallows the click that ends a drag so a link in an item is not followed.
 *
 * Mirrors the look and the dot and arrow behaviour of sgs/testimonial-slider and sgs/gallery's carousel.
 *
 * @package SGS\Blocks
 */

const DRAG_THRESHOLD = 5;
const DEFAULT_DOT_LABEL = 'Go to position %d';

/**
 * Whether the visitor has asked for reduced motion, read fresh each time.
 *
 * @return {boolean} True when `prefers-reduced-motion: reduce` matches.
 */
function reducedMotion() {
	return !! ( window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches );
}

/**
 * Whether the row is a sideways scroller right now: it scrolls on this device (overflow-x is auto or scroll, which the
 * tier rules print only where Scroll sideways is on) and its items overflow.
 *
 * @param {HTMLElement} row The row.
 * @return {boolean} True while the row scrolls.
 */
function rowScrolls( row ) {
	const overflowX = window.getComputedStyle( row ).overflowX;
	return ( 'auto' === overflowX || 'scroll' === overflowX ) && row.scrollWidth > row.clientWidth + 1;
}

/**
 * The positions the row can rest on, in order, without repeats.
 *
 * @param {HTMLElement} row The row.
 * @return {number[]} Scroll positions in px, from 0 to the furthest scroll.
 */
export function scrollStops( row ) {
	const max = Math.max( 0, row.scrollWidth - row.clientWidth );
	const pad = Number.parseFloat( window.getComputedStyle( row ).scrollPaddingInlineStart ) || 0;
	const rowLeft = row.getBoundingClientRect().left;
	const stops = [];
	Array.from( row.children ).forEach( ( item ) => {
		if ( item.hidden ) {
			return;
		}
		const at = Math.round( item.getBoundingClientRect().left - rowLeft + row.scrollLeft - pad );
		const stop = Math.min( max, Math.max( 0, at ) );
		if ( 0 === stops.length || stop - stops[ stops.length - 1 ] > 1 ) {
			stops.push( stop );
		}
	} );
	return stops;
}

/**
 * The index of the stop nearest a scroll position.
 *
 * @param {number[]} stops Stops from scrollStops().
 * @param {number}   left  Scroll position.
 * @return {number} Index into stops.
 */
function nearestStop( stops, left ) {
	let best = 0;
	stops.forEach( ( stop, i ) => {
		if ( Math.abs( stop - left ) < Math.abs( stops[ best ] - left ) ) {
			best = i;
		}
	} );
	return best;
}

/**
 * Wire one row.
 *
 * @param {HTMLElement} row An element carrying `data-sgs-scroll-controls`.
 */
export function initScrollRowControl( row ) {
	const wanted = ( row.getAttribute( 'data-sgs-scroll-controls' ) || '' ).split( /\s+/ );
	const nav = row.nextElementSibling?.matches( '.sgs-container__scroll-nav' ) ? row.nextElementSibling : null;
	const prev = wanted.includes( 'arrows' ) ? nav?.querySelector( '.sgs-container__arrow--prev' ) : null;
	const next = wanted.includes( 'arrows' ) ? nav?.querySelector( '.sgs-container__arrow--next' ) : null;
	const dotsEl = wanted.includes( 'dots' ) ? nav?.querySelector( '.sgs-container__dots' ) : null;
	const drag = wanted.includes( 'drag' );
	const dotLabel = dotsEl?.getAttribute( 'data-sgs-dot-label' ) || DEFAULT_DOT_LABEL;

	let stops = [];
	let frame = 0;

	const goTo = ( left ) => {
		row.scrollTo( { left, behavior: reducedMotion() ? 'auto' : 'smooth' } );
	};

	const buildDots = () => {
		dotsEl.textContent = '';
		stops.forEach( ( stop, i ) => {
			const dot = document.createElement( 'button' );
			dot.type = 'button';
			dot.className = 'sgs-container__dot sgs-slider-nav__dot';
			dot.setAttribute( 'aria-label', dotLabel.replace( '%d', String( i + 1 ) ) );
			dot.addEventListener( 'click', () => goTo( stops[ i ] ) );
			dotsEl.appendChild( dot );
		} );
	};

	const setDisabled = ( button, other, disabled ) => {
		if ( disabled && document.activeElement === button && other && ! other.disabled ) {
			other.focus();
		}
		button.disabled = disabled;
	};

	const syncPosition = () => {
		const left = row.scrollLeft;
		if ( dotsEl ) {
			const active = nearestStop( stops, left );
			Array.from( dotsEl.children ).forEach( ( dot, i ) => {
				dot.classList.toggle( 'sgs-container__dot--active', i === active );
				dot.classList.toggle( 'is-active', i === active );
				if ( i === active ) {
					dot.setAttribute( 'aria-current', 'true' );
				} else {
					dot.removeAttribute( 'aria-current' );
				}
			} );
		}
		const max = Math.max( 0, row.scrollWidth - row.clientWidth );
		if ( prev ) {
			setDisabled( prev, next, left <= 1 );
		}
		if ( next ) {
			setDisabled( next, prev, left >= max - 1 );
		}
	};

	const sync = () => {
		const scrolls = rowScrolls( row );
		nav?.classList.toggle( 'is-ready', scrolls );
		row.classList.toggle( 'sgs-container__inner--draggable', drag && scrolls );
		if ( ! scrolls ) {
			stops = [];
			if ( dotsEl ) {
				dotsEl.textContent = '';
			}
			return;
		}
		const fresh = scrollStops( row );
		if ( dotsEl && ( fresh.length !== stops.length || 0 === dotsEl.children.length ) ) {
			stops = fresh;
			buildDots();
		}
		stops = fresh;
		syncPosition();
	};

	row.addEventListener(
		'scroll',
		() => {
			if ( frame ) {
				return;
			}
			frame = window.requestAnimationFrame( () => {
				frame = 0;
				if ( stops.length ) {
					syncPosition();
				}
			} );
		},
		{ passive: true }
	);

	prev?.addEventListener( 'click', () => {
		const left = row.scrollLeft;
		const before = stops.filter( ( stop ) => stop < left - 1 );
		goTo( before.length ? before[ before.length - 1 ] : 0 );
	} );
	next?.addEventListener( 'click', () => {
		const left = row.scrollLeft;
		const after = stops.find( ( stop ) => stop > left + 1 );
		goTo( undefined === after ? stops[ stops.length - 1 ] : after );
	} );

	if ( drag ) {
		let start = null;
		let dragging = false;
		let swallowClick = false;

		const end = () => {
			if ( ! start ) {
				return;
			}
			const wasDragging = dragging;
			start = null;
			dragging = false;
			row.classList.remove( 'is-dragging' );
			if ( wasDragging ) {
				swallowClick = true;
				window.setTimeout( () => {
					swallowClick = false;
				}, 0 );
				if ( stops.length ) {
					goTo( stops[ nearestStop( stops, row.scrollLeft ) ] );
				}
			}
		};

		row.addEventListener( 'pointerdown', ( event ) => {
			if ( 'mouse' !== event.pointerType || 0 !== event.button || ! rowScrolls( row ) ) {
				return;
			}
			start = { x: event.clientX, left: row.scrollLeft, id: event.pointerId };
		} );
		row.addEventListener( 'pointermove', ( event ) => {
			if ( ! start || 'mouse' !== event.pointerType ) {
				return;
			}
			const dx = event.clientX - start.x;
			if ( ! dragging ) {
				if ( Math.abs( dx ) < DRAG_THRESHOLD ) {
					return;
				}
				dragging = true;
				row.classList.add( 'is-dragging' );
				row.setPointerCapture?.( start.id );
			}
			row.scrollLeft = start.left - dx;
		} );
		row.addEventListener( 'pointerup', end );
		row.addEventListener( 'pointercancel', end );
		row.addEventListener( 'dragstart', ( event ) => event.preventDefault() );
		row.addEventListener(
			'click',
			( event ) => {
				if ( swallowClick ) {
					event.preventDefault();
					event.stopPropagation();
					swallowClick = false;
				}
			},
			true
		);
	}

	sync();
	if ( 'function' === typeof window.ResizeObserver ) {
		new window.ResizeObserver( sync ).observe( row );
	}
	// A device change moves the row between scrolling and not without always changing its size.
	window.addEventListener( 'resize', sync );
}

/**
 * Wire the rows of one block on the page. The block's view script passes its own row selector.
 *
 * @param {string} selector Selector of that block's rows, each carrying `data-sgs-scroll-controls`.
 */
export function initScrollRowControls( selector ) {
	document.querySelectorAll( selector ).forEach( initScrollRowControl );
}
