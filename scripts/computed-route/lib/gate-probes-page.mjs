// The in-page halves of the gate chain's live probes (lib/gate-probes.mjs). Each function is passed to
// page.evaluate, so it is self-contained: it reads only `document`, `window` and its one argument.

// Every rule of every readable stylesheet that declares one of `props` and whose selector matches the element, value
// independent (it is every rule that could ever govern the property on this element, set or not). The pointer state the
// caller put the page in (a hover) is the state `matches` sees. Link, document and adopted stylesheets are read, an
// @import is followed, and rules that cannot match an element (@keyframes, @font-face, @property, @page, @counter-style,
// @namespace) are skipped. Returns { absent: true } when the element is not in the page, else { hits: [{ selector, sheet,
// property, value, origin }], inline: [property], unread: how many stylesheets or rules could not be read or evaluated (a
// cross-origin sheet, a container query, a nested rule), sheets }.
export function enumerateInPage( [ selector, props ] ) {
	const el = document.querySelector( selector );
	if ( ! el ) {
		return { absent: true };
	}
	const hits = [];
	let unread = 0;
	const SKIPPED = [ 'CSSKeyframesRule', 'CSSFontFaceRule', 'CSSPropertyRule', 'CSSPageRule', 'CSSCounterStyleRule', 'CSSNamespaceRule' ];
	// A rule nested in a style rule can match the element only when the element is, or sits inside, what the parent selector
	// matches, or is its sibling; any other nested rule is none of its business.
	const nestedMayMatch = ( parent ) => {
		try {
			return [ ...document.querySelectorAll( parent ) ].some( ( m ) => m.contains( el ) || m.parentElement === el.parentElement );
		} catch ( e ) {
			return true;
		}
	};
	const declared = ( style ) => props.find( ( p ) => '' !== style.getPropertyValue( p ) );
	// A rule's origin: `custom-css` in a block's sgsCustomCss residual element (`<style id="sgs-custom-css-<uid>">`), else
	// `stylesheet`.
	const originOf = ( s ) => ( /^sgs-custom-css-/.test( s?.ownerNode?.id || '' ) ? 'custom-css' : 'stylesheet' );
	const visit = ( rules, sheet, origin ) => {
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
					matched && hits.push( { selector: r.selectorText, sheet, property: p, value: r.style.getPropertyValue( p ), origin } );
				}
				r.cssRules && r.cssRules.length && nestedMayMatch( r.selectorText ) && ( unread += r.cssRules.length );
			} else if ( r.styleSheet ) {
				let inner = null;
				try {
					inner = r.styleSheet.cssRules;
				} catch ( e ) {
					unread++;
				}
				inner ? visit( inner, r.styleSheet.href || sheet, origin ) : r.styleSheet || unread++;
			} else if ( SKIPPED.some( ( n ) => window[ n ] && r instanceof window[ n ] ) ) {
				continue;
			} else if ( r.cssRules ) {
				if ( r.media ) {
					r.media.mediaText && window.matchMedia( r.media.mediaText ).matches && visit( r.cssRules, sheet, origin );
				} else if ( window.CSSSupportsRule && r instanceof window.CSSSupportsRule ) {
					CSS.supports( r.conditionText ) && visit( r.cssRules, sheet, origin );
				} else if ( window.CSSLayerBlockRule && r instanceof window.CSSLayerBlockRule ) {
					visit( r.cssRules, sheet, origin );
				} else {
					unread += r.cssRules.length;
				}
			}
		}
	};
	let sheets = 0;
	for ( const s of [ ...document.styleSheets, ...( document.adoptedStyleSheets || [] ) ] ) {
		sheets++;
		let rules = null;
		try {
			rules = s.cssRules;
		} catch ( e ) {
			unread++;
		}
		rules && visit( rules, s.href || 'inline <style>', originOf( s ) );
	}
	return { hits, inline: props.filter( ( p ) => '' !== el.style.getPropertyValue( p ) ), unread, sheets };
}

// The rule that wins `prop` on the element, found by trial: with transitions off, each matching declaring rule (and the
// element's inline style) has the property removed in turn; the one whose removal changes the computed value is the
// winner. Everything removed is put back. Returns { absent: true } or { before, winners: [{ rule: selector or
// 'element.style', origin: 'stylesheet', 'custom-css' (a block's sgsCustomCss residual element) or 'inline' }],
// restored, unread: how many sheets or nested rules could not be read, so a winner may be unseen }.
export function winnerInPage( [ selector, prop ] ) {
	const el = document.querySelector( selector );
	if ( ! el ) {
		return { absent: true };
	}
	// A rule nested in a style rule can match the element only when the element is, or sits inside, what the parent selector
	// matches, or is its sibling; any other nested rule is none of its business.
	const nestedMayMatch = ( parent ) => {
		try {
			return [ ...document.querySelectorAll( parent ) ].some( ( m ) => m.contains( el ) || m.parentElement === el.parentElement );
		} catch ( e ) {
			return true;
		}
	};
	const tame = document.createElement( 'style' );
	tame.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}';
	document.head.appendChild( tame );
	const read = () => getComputedStyle( el ).getPropertyValue( prop );
	const before = read();
	const winners = [];
	let restored = true;
	let unread = 0;
	const originOf = ( s ) => ( /^sgs-custom-css-/.test( s?.ownerNode?.id || '' ) ? 'custom-css' : 'stylesheet' );
	const trial = ( style, name, origin ) => {
		const value = style.getPropertyValue( prop );
		const priority = style.getPropertyPriority( prop );
		style.removeProperty( prop );
		const after = read();
		style.setProperty( prop, value, priority );
		restored = restored && style.getPropertyValue( prop ) === value && read() === before;
		after !== before && winners.push( { rule: name, origin } );
	};
	const visit = ( rules, origin ) => {
		for ( const r of rules ) {
			if ( r.selectorText && r.style && '' !== r.style.getPropertyValue( prop ) ) {
				let matched = false;
				try {
					matched = el.matches( r.selectorText );
				} catch ( e ) {
					unread++;
				}
				matched && trial( r.style, r.selectorText, origin );
			}
			if ( r.selectorText ) {
				r.cssRules && r.cssRules.length && nestedMayMatch( r.selectorText ) && ( unread += r.cssRules.length );
			} else if ( r.styleSheet ) {
				try {
					visit( r.styleSheet.cssRules, origin );
				} catch ( e ) {
					unread++;
				}
			} else if ( r.cssRules && ( ! r.media || window.matchMedia( r.media.mediaText ).matches ) && ! ( window.CSSKeyframesRule && r instanceof window.CSSKeyframesRule ) ) {
				visit( r.cssRules, origin );
			}
		}
	};
	for ( const s of [ ...document.styleSheets, ...( document.adoptedStyleSheets || [] ) ] ) {
		try {
			visit( s.cssRules, originOf( s ) );
		} catch ( e ) {
			unread++;
		}
	}
	'' !== el.style.getPropertyValue( prop ) && trial( el.style, 'element.style', 'inline' );
	tame.remove();
	return { before, winners, restored, unread };
}
