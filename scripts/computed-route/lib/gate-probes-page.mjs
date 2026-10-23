// The in-page halves of the gate chain's live probes (lib/gate-probes.mjs). Each function is passed to
// page.evaluate, so it is self-contained: it reads only `document`, `window` and its one argument.

// Every rule of every readable stylesheet that declares one of `props` and whose selector matches the element, value
// independent (it is every rule that could ever govern the property on this element, set or not). The pointer state the
// caller put the page in (a hover) is the state `matches` sees. Returns { absent: true } when the element is not in the
// page, else { hits: [{ selector, sheet, property, value }], inline: [property], unread: how many stylesheets or rules
// could not be read or evaluated (a cross-origin sheet, a container query, a nested rule), sheets }.
export function enumerateInPage( [ selector, props ] ) {
	const el = document.querySelector( selector );
	if ( ! el ) {
		return { absent: true };
	}
	const hits = [];
	let unread = 0;
	const declared = ( style ) => props.find( ( p ) => '' !== style.getPropertyValue( p ) );
	const visit = ( rules, sheet ) => {
		for ( const r of rules ) {
			if ( r.selectorText ) {
				const p = r.style ? declared( r.style ) : undefined;
				if ( p ) {
					let matched = false;
					try {
						matched = el.matches( r.selectorText );
					} catch ( e ) {
						unread++;
					}
					matched && hits.push( { selector: r.selectorText, sheet, property: p, value: r.style.getPropertyValue( p ) } );
				}
				r.cssRules && r.cssRules.length && ( unread += r.cssRules.length );
			} else if ( r.cssRules ) {
				if ( r.media ) {
					r.media.mediaText && window.matchMedia( r.media.mediaText ).matches && visit( r.cssRules, sheet );
				} else if ( window.CSSSupportsRule && r instanceof window.CSSSupportsRule ) {
					CSS.supports( r.conditionText ) && visit( r.cssRules, sheet );
				} else if ( window.CSSLayerBlockRule && r instanceof window.CSSLayerBlockRule ) {
					visit( r.cssRules, sheet );
				} else {
					unread += r.cssRules.length;
				}
			}
		}
	};
	let sheets = 0;
	for ( const s of document.styleSheets ) {
		sheets++;
		let rules = null;
		try {
			rules = s.cssRules;
		} catch ( e ) {
			unread++;
		}
		rules && visit( rules, s.href || 'inline <style>' );
	}
	return { hits, inline: props.filter( ( p ) => '' !== el.style.getPropertyValue( p ) ), unread, sheets };
}

// The rule that wins `prop` on the element, found by trial: with transitions off, each matching declaring rule (and the
// element's inline style) has the property removed in turn; the one whose removal changes the computed value is the
// winner. Everything removed is put back. Returns { absent: true } or { before, winners: [selector or 'element.style'],
// restored }.
export function winnerInPage( [ selector, prop ] ) {
	const el = document.querySelector( selector );
	if ( ! el ) {
		return { absent: true };
	}
	const tame = document.createElement( 'style' );
	tame.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}';
	document.head.appendChild( tame );
	const read = () => getComputedStyle( el ).getPropertyValue( prop );
	const before = read();
	const winners = [];
	let restored = true;
	const trial = ( style, name ) => {
		const value = style.getPropertyValue( prop );
		const priority = style.getPropertyPriority( prop );
		style.removeProperty( prop );
		const after = read();
		style.setProperty( prop, value, priority );
		restored = restored && style.getPropertyValue( prop ) === value && read() === before;
		after !== before && winners.push( name );
	};
	const visit = ( rules ) => {
		for ( const r of rules ) {
			if ( r.selectorText && r.style && '' !== r.style.getPropertyValue( prop ) ) {
				let matched = false;
				try {
					matched = el.matches( r.selectorText );
				} catch ( e ) {
					matched = false;
				}
				matched && trial( r.style, r.selectorText );
			} else if ( ! r.selectorText && r.cssRules && ( ! r.media || window.matchMedia( r.media.mediaText ).matches ) ) {
				visit( r.cssRules );
			}
		}
	};
	for ( const s of document.styleSheets ) {
		try {
			visit( s.cssRules );
		} catch ( e ) {
			// a cross-origin sheet cannot be read; its rule, if it wins, leaves no winner and the probe does not pass
		}
	}
	'' !== el.style.getPropertyValue( prop ) && trial( el.style, 'element.style' );
	tame.remove();
	return { before, winners, restored };
}
