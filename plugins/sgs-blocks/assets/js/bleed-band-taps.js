/**
 * Shadow-bleed bands never take a click or a tap meant for what they overlap.
 *
 * A row that scrolls sideways clips both axes, so it reserves room for its tiles' shadows inside its own box: padding of
 * `--sgs-shadow-bleed` (80px) cancelled by a matching negative margin (theme utilities; the rule is
 * `scripts/check-shadow-clip.py`). The layout does not move and the shadows paint, but that padding is part of the
 * row's box, so the band reaches over the content above and below the row and, painted later, takes its clicks: a
 * button just above a footer gallery could not be tapped (a live shop at 375px, 2026-11-26).
 *
 * The row keeps the pointer for its own work (its scrollbar drags, a wheel or a swipe from a gap between tiles scrolls
 * it, the tiles take their own clicks), so the band cannot simply ignore the pointer. Instead, a click that lands on a
 * band is handed to whatever lies beneath that point (the topmost element there that is not the band, inside it or one
 * of its ancestors): the original click is stopped, and the element beneath gets the press it would have had (pointer
 * and mouse down and up, focus for a focusable control, the picker for a select) and then the click (a link follows, a
 * button presses, a field takes focus). A ctrl, cmd or shift click, or a middle click, on a covered link opens it in a
 * new tab, since a synthetic click cannot carry those (a middle press over a covered link does not start autoscroll). A scrollbar press or drag fires no click, a click on a tile or in
 * the gap between tiles is not on the padding, and a drag that ends on the band (it started more than DRAG_SLOP away)
 * is left alone, so none of those is touched. An iframe beneath cannot take a synthetic click, so its click passes.
 *
 * A band is an element whose stylesheet rule reserves the bleed and marks itself with `--sgs-bleed-band: 1` (every
 * band rule does; check-shadow-clip.py refuses one without it), with padding on a side whose margin is negative. The
 * marker keeps WordPress core's own full-width sections (side padding cancelled by an equal negative margin) out.
 *
 * Always on (enqueued with the extension assets, includes/class-sgs-blocks.php::enqueue_frontend_assets) and
 * dependency-free; it works on a click, on a touch (arming the band under it for iOS), and on a mouse move only while
 * the pointer is over a band.
 */
( function () {
	if ( ! window.addEventListener || ! document.elementsFromPoint ) {
		return;
	}

	const CONTROLS =
		'a[href], button, input, select, textarea, label, summary, [role="button"], [contenteditable="true"]';
	const FOCUSABLE =
		'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
	const DRAG_SLOP = 10;
	const POINTER_CLASS = 'sgs-bleed-band--pointer';
	let down = null;

	/**
	 * @param {string} value A computed length.
	 * @return {number} Its pixels, 0 when unset.
	 */
	function px( value ) {
		const n = parseFloat( value );
		return isNaN( n ) ? 0 : n;
	}

	/**
	 * True when `el` itself carries the band marker. The marker does not inherit (`@property` in extensions.css, loaded on
	 * every front-end page); where an engine lacks `@property` a descendant would read it too, so an element whose parent
	 * also reads it is taken as an inheritor, not a band.
	 *
	 * @param {Element}             el The element under test.
	 * @param {CSSStyleDeclaration} cs Its computed style.
	 * @return {boolean} Whether it is marked.
	 */
	function carriesMarker( el, cs ) {
		const value = function ( style ) {
			return String(
				style.getPropertyValue( '--sgs-bleed-band' )
			).trim();
		};
		if ( value( cs ) !== '1' ) {
			return false;
		}
		const parent = el.parentElement;
		return ! parent || value( window.getComputedStyle( parent ) ) !== '1';
	}

	/**
	 * True when `el` is a marked band and (x, y) lies level with its padding on a side whose margin is negative: the part
	 * of the band that a negative margin lays over a neighbour. Only the band's own axis is measured (the height of a top
	 * or bottom band, the width of a side band), so a wrapper's box beside the row at the band's height counts too.
	 *
	 * @param {Element} el The element under test.
	 * @param {number}  x  Client x.
	 * @param {number}  y  Client y.
	 * @return {boolean} Whether the point is on its band.
	 */
	function inBand( el, x, y ) {
		if (
			! el ||
			el.nodeType !== 1 ||
			el === document.documentElement ||
			el === document.body
		) {
			return false;
		}
		const cs = window.getComputedStyle( el );
		if ( ! carriesMarker( el, cs ) ) {
			return false;
		}
		const r = el.getBoundingClientRect();
		const top = r.top + px( cs.borderTopWidth );
		const bottom = r.bottom - px( cs.borderBottomWidth );
		const left = r.left + px( cs.borderLeftWidth );
		const right = r.right - px( cs.borderRightWidth );
		return (
			( px( cs.marginTop ) < 0 &&
				px( cs.paddingTop ) > 0 &&
				y >= top &&
				y < top + px( cs.paddingTop ) ) ||
			( px( cs.marginBottom ) < 0 &&
				px( cs.paddingBottom ) > 0 &&
				y <= bottom &&
				y > bottom - px( cs.paddingBottom ) ) ||
			( px( cs.marginLeft ) < 0 &&
				px( cs.paddingLeft ) > 0 &&
				x >= left &&
				x < left + px( cs.paddingLeft ) ) ||
			( px( cs.marginRight ) < 0 &&
				px( cs.paddingRight ) > 0 &&
				x <= right &&
				x > right - px( cs.paddingRight ) )
		);
	}

	/**
	 * What the click was meant for: the topmost element at (x, y) that is not the band, not inside it and not one of its
	 * ancestors (a block wrapper whose box the band's negative margin drags over its neighbours by margin collapsing),
	 * and not another band. Null when nothing else lies there.
	 *
	 * @param {Element} band The band the click landed on.
	 * @param {number}  x    Client x.
	 * @param {number}  y    Client y.
	 * @return {Element|null} The element beneath.
	 */
	function beneath( band, x, y ) {
		const stack = document.elementsFromPoint( x, y );
		for ( let i = 0; i < stack.length; i++ ) {
			const el = stack[ i ];
			if (
				el === band ||
				band.contains( el ) ||
				el.contains( band ) ||
				inBand( el, x, y )
			) {
				continue;
			}
			return el;
		}
		return null;
	}

	/**
	 * True when `el` is a marked band: it carries `--sgs-bleed-band: 1` and padding on a side whose margin is negative.
	 * Position-free.
	 *
	 * @param {Element} el The element under test.
	 * @return {boolean} Whether it is a band.
	 */
	function isBand( el ) {
		const cs = window.getComputedStyle( el );
		return (
			carriesMarker( el, cs ) &&
			[ 'Top', 'Bottom', 'Left', 'Right' ].some( function ( side ) {
				return (
					px( cs[ 'margin' + side ] ) < 0 &&
					px( cs[ 'padding' + side ] ) > 0
				);
			} )
		);
	}

	/**
	 * The marked bands that can make a click on `target` a band click: the target itself and its children and
	 * grandchildren that carry the marker and padding on a side whose margin is negative. A wrapper can take a band's box
	 * as its own (a positioned flex wrapper sizes to the row's border box, bands included), so the click lands on the
	 * wrapper, not on the row. A control is never a band. Position-free, so it can be kept per target.
	 *
	 * @param {Element} target The event's target.
	 * @return {Element[]} The candidate bands.
	 */
	function candidates( target ) {
		if ( ! target || target.nodeType !== 1 || target.closest( CONTROLS ) ) {
			return [];
		}
		const out = [];
		const test = function ( el ) {
			if ( isBand( el ) ) {
				out.push( el );
			}
		};
		test( target );
		for ( let i = 0; i < target.children.length; i++ ) {
			test( target.children[ i ] );
			for ( let j = 0; j < target.children[ i ].children.length; j++ ) {
				test( target.children[ i ].children[ j ] );
			}
		}
		return out;
	}

	/**
	 * The element whose box covers (x, y) only through a bleed band (the target, when one of its candidate bands has
	 * its band at that point), or null.
	 *
	 * @param {Element}   target The event's target.
	 * @param {number}    x      Client x.
	 * @param {number}    y      Client y.
	 * @param {Element[]} [list] The target's candidates, when already known.
	 * @return {Element|null} The covering element.
	 */
	function bandAt( target, x, y, list ) {
		return ( list || candidates( target ) ).some( function ( el ) {
			return inBand( el, x, y );
		} )
			? target
			: null;
	}

	/**
	 * The band a trusted press-and-release landed on and the element beneath it, or null: when the event is synthetic,
	 * when the press started more than DRAG_SLOP away (a drag), when something already handled the press (a listener
	 * cancelled its pointerdown, as the theme's overlay scrollbar does on its track), when no band is there, when
	 * nothing lies beneath, or when what lies beneath is an iframe (it cannot take a synthetic click, so the original
	 * click passes).
	 *
	 * @param {MouseEvent} event A click or auxclick.
	 * @return {{band: Element, target: Element}|null} The band and the element beneath.
	 */
	function covered( event ) {
		if (
			! event.isTrusted ||
			! down ||
			( down.press && down.press.defaultPrevented )
		) {
			return null;
		}
		if (
			Math.abs( event.clientX - down.x ) > DRAG_SLOP ||
			Math.abs( event.clientY - down.y ) > DRAG_SLOP
		) {
			return null;
		}
		const band = bandAt( event.target, event.clientX, event.clientY );
		const target = band
			? beneath( band, event.clientX, event.clientY )
			: null;
		if ( ! target || target.tagName === 'IFRAME' ) {
			return null;
		}
		return { band, target };
	}

	/**
	 * The pointer id of the press behind a click: the click's own where the engine gives one (a click is a PointerEvent
	 * in Chromium and Firefox), else the recorded pointerdown's.
	 *
	 * @param {MouseEvent} event The original click.
	 * @return {number} The pointer id.
	 */
	function pointerIdOf( event ) {
		if ( typeof event.pointerId === 'number' && event.pointerId > 0 ) {
			return event.pointerId;
		}
		return down && typeof down.pointerId === 'number' ? down.pointerId : 1;
	}

	/**
	 * Presses the element beneath: pointer and mouse down, focus for a focusable control, then up. The ancestors the
	 * band and the element share already had the real press (it came through the band), so these presses stop below
	 * their lowest common ancestor: only the elements that missed the real press get one, and a block root that
	 * toggles on a press (a loop's tap-to-pause) is not toggled twice. The click that follows bubbles all the way.
	 *
	 * @param {Element}    band   The band the click landed on.
	 * @param {Element}    target The element beneath.
	 * @param {MouseEvent} event  The original click.
	 * @return {Element|null} The focusable control pressed, if any.
	 */
	function press( band, target, event ) {
		let stop = target;
		while ( stop.parentNode && ! stop.parentNode.contains( band ) ) {
			stop = stop.parentNode;
		}
		const halt = function ( e ) {
			e.stopPropagation();
		};
		const types = [ 'pointerdown', 'mousedown', 'pointerup', 'mouseup' ];
		types.forEach( function ( type ) {
			stop.addEventListener( type, halt );
		} );
		let focusable = null;
		try {
			fire( target, 'pointerdown', event );
			fire( target, 'mousedown', event );
			focusable = target.closest( FOCUSABLE );
			if ( focusable && typeof focusable.focus === 'function' ) {
				focusable.focus( { preventScroll: true } );
			}
			fire( target, 'pointerup', event );
			fire( target, 'mouseup', event );
		} finally {
			types.forEach( function ( type ) {
				stop.removeEventListener( type, halt );
			} );
		}
		return focusable;
	}

	/**
	 * Dispatches one synthetic event of `type` on `target`, copying the original's position and keys.
	 *
	 * @param {Element}    target The element beneath.
	 * @param {string}     type   The event type.
	 * @param {MouseEvent} event  The original click.
	 */
	function fire( target, type, event ) {
		const pointer = type.indexOf( 'pointer' ) === 0;
		const Ctor =
			pointer && window.PointerEvent
				? window.PointerEvent
				: window.MouseEvent;
		target.dispatchEvent(
			new Ctor( type, {
				bubbles: true,
				cancelable: true,
				composed: true,
				view: window,
				detail: type === 'click' ? event.detail : 0,
				screenX: event.screenX,
				screenY: event.screenY,
				clientX: event.clientX,
				clientY: event.clientY,
				ctrlKey: event.ctrlKey,
				shiftKey: event.shiftKey,
				altKey: event.altKey,
				metaKey: event.metaKey,
				button: 0,
				buttons: type === 'pointerdown' || type === 'mousedown' ? 1 : 0,
				pointerId: pointerIdOf( event ),
				pointerType: event.pointerType || 'mouse',
				isPrimary: true,
			} )
		);
	}

	/**
	 * Opens a covered link in a new tab, for a click a synthetic event cannot carry (modifier keys, middle button). A
	 * download link is left to the ordinary hand-off.
	 *
	 * @param {Element}    target The element beneath.
	 * @param {MouseEvent} event  The original click or auxclick.
	 * @return {boolean} Whether a link was opened.
	 */
	function openApart( target, event ) {
		const link = target.closest( 'a[href]:not([download])' );
		if ( ! link ) {
			return false;
		}
		event.preventDefault();
		event.stopImmediatePropagation();
		window.open( link.href, '_blank', 'noopener' );
		return true;
	}

	window.addEventListener(
		'pointerdown',
		function ( event ) {
			if ( event.isTrusted ) {
				// The press itself is kept: a listener that cancels it (a scrollbar track) owns the click that follows.
				down = {
					x: event.clientX,
					y: event.clientY,
					pointerId: event.pointerId,
					press: event,
				};
			}
		},
		{ capture: true, passive: true }
	);

	window.addEventListener(
		'click',
		function ( event ) {
			if ( event.button !== 0 ) {
				return;
			}
			const hit = covered( event );
			if ( ! hit ) {
				return;
			}
			const target = hit.target;
			if (
				( event.ctrlKey || event.metaKey || event.shiftKey ) &&
				openApart( target, event )
			) {
				return;
			}
			event.preventDefault();
			event.stopImmediatePropagation();
			const focusable = press( hit.band, target, event );
			fire( target, 'click', event );
			if (
				focusable &&
				focusable.tagName === 'SELECT' &&
				typeof focusable.showPicker === 'function'
			) {
				try {
					focusable.showPicker();
				} catch ( e ) {}
			}
		},
		true
	);

	// A middle click on a covered link opens it in a new tab. A middle press on a scroll container starts the
	// browser's autoscroll and then no auxclick comes (Chromium), so the press is cancelled over a covered link and
	// the link opens on the middle button's release; the auxclick, where one comes, is only cancelled.
	const coveredLink = function ( event ) {
		const hit = event.button === 1 ? covered( event ) : null;
		return hit && hit.target.closest( 'a[href]:not([download])' )
			? hit.target
			: null;
	};
	window.addEventListener(
		'mousedown',
		function ( event ) {
			if ( event.button === 1 && event.isTrusted && ! down ) {
				down = {
					x: event.clientX,
					y: event.clientY,
					pointerId: 1,
				};
			}
			if ( coveredLink( event ) ) {
				event.preventDefault();
			}
		},
		true
	);
	window.addEventListener(
		'mouseup',
		function ( event ) {
			const target = coveredLink( event );
			if ( target ) {
				openApart( target, event );
			}
		},
		true
	);
	window.addEventListener(
		'auxclick',
		function ( event ) {
			if ( coveredLink( event ) ) {
				event.preventDefault();
				event.stopImmediatePropagation();
			}
		},
		true
	);

	// Mouse only: the band shows the pointer cursor while a control lies beneath it. At most one check per animation
	// frame; the candidate bands are found once per target, so a target with none costs nothing after its first frame.
	let moved = null;
	let seen = null;
	let list = [];
	let marked = null;
	window.addEventListener(
		'pointermove',
		function ( event ) {
			if ( event.pointerType !== 'mouse' ) {
				return;
			}
			const pending = moved;
			moved = event;
			if ( pending ) {
				return;
			}
			window.requestAnimationFrame( function () {
				const e = moved;
				moved = null;
				if ( e.target !== seen ) {
					seen = e.target;
					list = candidates( seen );
				}
				const band =
					list.length && bandAt( seen, e.clientX, e.clientY, list );
				const under = band && beneath( band, e.clientX, e.clientY );
				const on = !! ( under && under.closest( CONTROLS ) );
				if ( marked && ( ! on || marked !== band ) ) {
					marked.classList.remove( POINTER_CLASS );
					marked = null;
				}
				if ( on ) {
					band.classList.add( POINTER_CLASS );
					marked = band;
				}
			} );
		},
		{ passive: true }
	);

	// iOS Safari sends a click only when the touched element or an ancestor responds to clicks: a click, mouse or pointer
	// listener on a node, editability, or focusability (WebKit LocalFrame.cpp::ancestorRespondingToClickEventsNodeQualifier;
	// `cursor: pointer` no longer counts, and this script's window listener is not on a node), else the tap fails with no
	// click at all. So a touch on a band (or on a wrapper that takes a band's box) gives the touched element a no-op click
	// listener. The tap's target is chosen when the tap
	// gesture ends (WKSyntheticTapGestureRecognizer reports it on its Ended state, then WebPage::potentialTapAtPosition),
	// after this touchstart has run, so arming on the touch is in time and nothing scans the page. The listener sits on
	// the band, never the page root: iOS flashes its tap highlight on the element that responds, so the armed element
	// takes .sgs-bleed-band--armed (extensions.css: a transparent highlight, its links and controls keep theirs), which
	// also covers a wrapper that takes a band's box and has no band rule of its own.
	const noop = function () {};
	window.addEventListener(
		'touchstart',
		function ( event ) {
			if ( candidates( event.target ).length ) {
				event.target.addEventListener( 'click', noop );
				event.target.classList.add( 'sgs-bleed-band--armed' );
			}
		},
		{ capture: true, passive: true }
	);
} )();
