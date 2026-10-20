// In-page helpers of the state reader (Spec 48 FR-48-81, lib/fill-state-read.mjs::readStates): entering and leaving
// one state token on its host, and reading a target's rendered values. Each runs inside the page through
// page.evaluate, so it is self-contained.

// In-page: enter (on) or leave (off) one non-pseudo token on its host; returns what to restore.
export function applyToken( [ hostSel, reach, text, call, on, saved ] ) {
	const host = document.querySelector( hostSel );
	if ( ! host ) {
		return null;
	}
	if ( 'set-attribute' === reach ) {
		const m = /^\[\s*([\w-]+)(?:\s*([~|^$*]?=)\s*["']?([^"'\]]*)["']?)?/.exec( text );
		const name = m[ 1 ];
		if ( on ) {
			const before = host.getAttribute( name );
			const value = undefined === m[ 3 ] ? ( 'aria-current' === name ? 'page' : '' ) : ( '~=' === m[ 2 ] && before ? `${ before } ${ m[ 3 ] }` : m[ 3 ] );
			host.setAttribute( name, value );
			return { name, before };
		}
		if ( null === saved.before ) {
			host.removeAttribute( saved.name );
		} else {
			host.setAttribute( saved.name, saved.before );
		}
		return null;
	}
	if ( 'toggle-class' === reach ) {
		const cls = text.replace( /^\./, '' );
		if ( on ) {
			const had = host.classList.contains( cls );
			host.classList.add( cls );
			return { cls, had };
		}
		if ( ! saved.had ) {
			host.classList.remove( saved.cls );
		}
		return null;
	}
	if ( 'call' === reach ) {
		const leave = { showModal: 'close', showPopover: 'hidePopover' }[ call ];
		const OPEN = 'data-sgs-state-was-open';
		if ( ! on ) {
			host[ leave ]();
			// Opening an auto popover light-dismisses the others: the ones open before are opened again.
			document.querySelectorAll( `[${ OPEN }]` ).forEach( ( p ) => {
				p.removeAttribute( OPEN );
				if ( ! p.matches( ':popover-open' ) ) {
					p.showPopover();
				}
			} );
			return null;
		}
		// A dialog or popover already open at rest is left open: there is nothing to undo.
		if ( ( 'showModal' === call && host.open ) || ( 'showPopover' === call && host.matches( ':popover-open' ) ) ) {
			return null;
		}
		document.querySelectorAll( ':popover-open' ).forEach( ( p ) => p !== host && p.setAttribute( OPEN, '' ) );
		try {
			host[ call ]();
		} catch {
			// A host that cannot enter the state (not a dialog or not a popover) is left as it was.
			document.querySelectorAll( `[${ OPEN }]` ).forEach( ( p ) => p.removeAttribute( OPEN ) );
			return null;
		}
		return {};
	}
	if ( 'scroll' === reach ) {
		if ( on ) {
			const y = scrollY;
			scrollTo( 0, Math.max( 600, innerHeight ) );
			return { y };
		}
		scrollTo( 0, saved.y );
		return null;
	}
	return null;
}

// In-page: the rendered values of `props` on a job's element.
export function renderedOf( [ finder, resolveSrc, props ] ) {
	// eslint-disable-next-line no-new-func
	const el = new Function( `return (${ resolveSrc });` )()( finder );
	if ( ! el ) {
		return null;
	}
	const cs = getComputedStyle( el );
	return Object.fromEntries( props.map( ( p ) => [ p, cs.getPropertyValue( p ).trim() ] ) );
}
