/**
 * SGS marquee ready gate (Spec 38A FR-38A-44). `Sgs_Motion_Assets::print_marquee_gate` prints this file inline at the
 * top of <head> (without this comment, and with `SGS_MARQUEE_BREAKPOINTS` replaced by the `SGS_Breakpoints` tier
 * widths) on a page that renders a marquee.
 *
 * A marquee gets its one-row running layout from `data-sgs-marquee="on"` on the block root and
 * `data-sgs-marquee-lane="on"` on the lane (the parent of `[data-sgs-marquee-set]`), which the deferred module
 * `src/shared/effects/fx-marquee.js` sets. Until it runs the static layout paints, and the swap to one row shifts the
 * page. This gate sets the same marks while the parser adds the set, so the first paint is already the running layout.
 * It decides exactly as the module's `canRun` does: not reduced motion, not switched off at this device tier
 * (`src/shared/effects/off-switch.js`), inside the `below-breakpoint` range, and Web Animations present.
 *
 * It stops watching at DOMContentLoaded. If the module has not set `window.sgsMarqueeArmed` by the window's load event
 * (it failed to download or threw: a deferred module always runs before load), the gate removes its marks, so the
 * static layout returns and every item shows. Without MutationObserver or Web Animations, or with reduced motion, it
 * marks nothing; with JavaScript blocked it never runs; in each case the static layout shows.
 */
( ( d, w, bp ) => {
	if (
		! w.MutationObserver ||
		! w.matchMedia ||
		! w.Element ||
		typeof w.Element.prototype.animate !== 'function' ||
		w.matchMedia( '(prefers-reduced-motion: reduce)' ).matches
	) {
		return;
	}
	const ROOT = '[data-sgs-fx~="marquee"]';
	const SET = '[data-sgs-marquee-set]';
	const PREFIX = 'data-sgs-fx-marquee-';
	const matches = ( query ) => w.matchMedia( query ).matches;
	const tier = matches( '(max-width: ' + bp.mobile + '.98px)' )
		? 'mobile'
		: matches( '(min-width: ' + ( bp.mobile + 1 ) + 'px) and (max-width: ' + bp.tablet + '.98px)' )
			? 'tablet'
			: 'desktop';
	const below = {
		tablet: '(max-width: ' + bp.tablet + 'px)',
		mobile: '(max-width: ' + bp.mobile + 'px)',
	};
	const marked = [];

	const number = ( text ) => {
		const value = parseFloat( text );
		return isFinite( value ) ? value : null;
	};
	const wouldRun = ( root ) => {
		const range = root.getAttribute( PREFIX + 'below-breakpoint' );
		if ( 'overflow' === range ) {
			// Whether the items overflow is known only after measuring, so the module decides; marking now would show
			// a running layout that snaps back when the items fit, or hide a resting wrap the module has to measure.
			return false;
		}
		if ( below[ range ] && ! matches( below[ range ] ) ) {
			return false;
		}
		if ( 'desktop' === tier ) {
			return true;
		}
		if ( root.hasAttribute( 'data-sgs-fx-disable-' + tier ) ) {
			return false;
		}
		const off = root.getAttribute( 'data-sgs-fx-off-' + tier ) || '';
		return ! off.split( /\s+/ ).includes( 'marquee' );
	};
	const mark = ( set ) => {
		const root = set.closest( ROOT );
		const lane = set.parentElement;
		if ( ! root || ! lane || 'on' === root.getAttribute( 'data-sgs-marquee' ) || ! wouldRun( root ) ) {
			return;
		}
		root.setAttribute( 'data-sgs-marquee', 'on' );
		lane.setAttribute( 'data-sgs-marquee-lane', 'on' );
		marked.push( { root, lane } );
		if ( 'true' === root.getAttribute( PREFIX + 'edge-fade' ) ) {
			const prop = w.getComputedStyle( root ).getPropertyValue( '--sgs-marquee-edge-fade-width' ).trim();
			const width = number( '' !== prop ? prop : root.getAttribute( PREFIX + 'edge-fade-width' ) );
			root.style.setProperty(
				'--sgs-marquee-fade-size',
				( null !== width && width >= 0 && width <= 50 ? width : 5 ) + '%'
			);
		}
	};
	const scan = ( records ) => {
		records.forEach( ( record ) => {
			record.addedNodes.forEach( ( node ) => {
				if ( 1 !== node.nodeType ) {
					return;
				}
				if ( node.matches( SET ) ) {
					mark( node );
				}
				node.querySelectorAll( SET ).forEach( mark );
			} );
		} );
	};

	const observer = new w.MutationObserver( scan );
	observer.observe( d.documentElement, { childList: true, subtree: true } );
	d.addEventListener( 'DOMContentLoaded', () => {
		scan( observer.takeRecords() );
		observer.disconnect();
	} );
	w.addEventListener( 'load', () => {
		if ( w.sgsMarqueeArmed ) {
			return;
		}
		marked.forEach( ( item ) => {
			item.root.removeAttribute( 'data-sgs-marquee' );
			item.lane.removeAttribute( 'data-sgs-marquee-lane' );
			item.root.style.removeProperty( '--sgs-marquee-fade-size' );
		} );
	} );
} )( document, window, SGS_MARQUEE_BREAKPOINTS );
