// Ref tracing (GAP-CHECKLIST.md section 16). A config with `refPrefix` (e.g. 'cr-ref-') gets, on every style,
// hover and box row, the measured live element's nearest ancestor-or-self carrying a class with that prefix
// (`ref`) and the element's selector path from it (`path`). A tool that wrote the ref classes into a layout can
// then map each row back to one block and one rendered element of it.

// Extra properties measured when a config sets refPrefix: the spacing and width a layout setting writes, which
// the default list leaves to the box and position rows.
export const REF_PROPS = [ 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'width', 'max-width', 'text-wrap', 'gap' ];

// In-page and in Node: the selector path from a ref element down to `el`. Each step is the element's BEM class (the
// first class starting with "sgs-" that is not a modifier), or its tag name when it has none, plus
// :nth-of-type(n) only when a sibling shares that step. Steps are joined by " > "; the ref element itself is "".
// Self-contained (passed to page.evaluate as source).
export function elementPath( el, refEl ) {
	const step = ( e ) => {
		const bem = [ ...e.classList ].find( ( c ) => /^sgs-[a-z0-9-]+(__[a-z0-9-]+)?$/.test( c ) && ! c.includes( '--' ) );
		const base = bem ? `.${ bem }` : e.tagName.toLowerCase();
		const p = e.parentElement;
		if ( ! p ) {
			return base;
		}
		const same = [ ...p.children ].filter( ( s ) => ( bem ? s.classList.contains( bem ) : s.tagName === e.tagName ) );
		if ( same.length < 2 ) {
			return base;
		}
		const ofType = [ ...p.children ].filter( ( s ) => s.tagName === e.tagName );
		return `${ base }:nth-of-type(${ ofType.indexOf( e ) + 1 })`;
	};
	const steps = [];
	for ( let e = el; e && e !== refEl; e = e.parentElement ) {
		steps.unshift( step( e ) );
	}
	return steps.join( ' > ' );
}

// In-page: the ref, its block root class and the paths for one measured element. `text` is the element that paints
// the first text (collectPair reads text properties from it), so text rows get that element's path.
export function traceRef( el, carrier, prefix, pathSrc ) {
	// eslint-disable-next-line no-new-func
	const path = new Function( `return (${ pathSrc });` )();
	let refEl = null;
	let ref = null;
	for ( let a = el; a && a !== document.documentElement; a = a.parentElement ) {
		ref = [ ...a.classList ].find( ( c ) => c.startsWith( prefix ) );
		if ( ref ) {
			refEl = a;
			break;
		}
	}
	if ( ! refEl ) {
		return null;
	}
	const block = [ ...refEl.classList ].find( ( c ) => /^sgs-[a-z0-9-]+$/.test( c ) && ! c.includes( '--' ) && ! c.startsWith( prefix ) ) || null;
	return {
		ref,
		block,
		path: path( el, refEl ),
		textPath: carrier && refEl.contains( carrier ) ? path( carrier, refEl ) : null,
	};
}

// The properties collectPair reads from the text carrier rather than the element.
export const TEXT_CARRIED = [ 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-transform', 'color', 'text-shadow' ];

// Node side: stamps ref, block and path on one pair's rows from the live snapshot's trace.
export function stampRefs( diffs, trace ) {
	if ( ! trace ) {
		return diffs;
	}
	for ( const d of diffs ) {
		if ( ! [ 'style', 'hover', 'box' ].includes( d.kind ) ) {
			continue;
		}
		d.ref = trace.ref;
		d.block = trace.block;
		d.path = 'style' === d.kind && TEXT_CARRIED.includes( d.key ) && null !== trace.textPath ? trace.textPath : trace.path;
	}
	return diffs;
}
