// Ref tracing (GAP-CHECKLIST.md section 16). A config with `refPrefix` (e.g. 'cr-ref-') gets, on every style,
// hover and box row, the measured live element's nearest ancestor-or-self carrying a class with that prefix
// (`ref`) and the element's selector path from it (`path`), and every enclosing ref with its own path (`owners`). A tool that wrote the ref classes into a layout can
// then map each row back to one block and one rendered element of it.

// Extra properties measured when a config sets refPrefix: the spacing and width a layout setting writes, which
// the default list leaves to the box and position rows.
export const REF_PROPS = [ 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'width', 'max-width', 'text-wrap', 'gap', 'flex-direction', 'flex-wrap' ];

// In-page and in Node: the selector path from a ref element down to `el`. Each step is the element's BEM class (the
// first class starting with "sgs-" that is not a modifier and not a per-instance id such as sgs-text-aebb51cc, which
// changes on every build), or its tag name when it has none, plus
// :nth-of-type(n) only when a sibling shares that step. Steps are joined by " > "; the ref element itself is "".
// Self-contained (passed to page.evaluate as source).
export function elementPath( el, refEl ) {
	const step = ( e ) => {
		const bem = [ ...e.classList ].find( ( c ) => /^sgs-[a-z0-9-]+(__[a-z0-9-]+)?$/.test( c ) && ! c.includes( '--' ) && ! /-[0-9a-f]{8}$/.test( c ) );
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

// In-page: the ref, its block root class and the paths for one measured element. `carrier` is the element that
// paints the first text (collectPair reads text properties from it), so text rows get that element's path; `layoutEl`
// is the element laying out the children (collectPair reads layout properties from it), so layout rows get its path;
// `iconEl` is the pair's first painted svg, so icon size rows get its path.
export function traceRef( el, carrier, prefix, pathSrc, layoutEl = null, iconEl = null ) {
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
	const blockOf = ( r ) => [ ...r.classList ].find( ( c ) => /^sgs-[a-z0-9-]+$/.test( c ) && ! c.includes( '--' ) && ! c.startsWith( prefix ) && ! /-[0-9a-f]{8}$/.test( c ) ) || null;
	const tagOf = ( e ) => ( e ? e.tagName.toLowerCase() : null );
	const from = ( r, rRef ) => ( {
		ref: rRef,
		block: blockOf( r ),
		path: path( el, r ),
		textPath: carrier && r.contains( carrier ) ? path( carrier, r ) : null,
		layoutPath: layoutEl && r.contains( layoutEl ) ? path( layoutEl, r ) : null,
		iconPath: iconEl && r.contains( iconEl ) ? path( iconEl, r ) : null,
		tags: { path: tagOf( el ), textPath: tagOf( carrier ), layoutPath: tagOf( layoutEl ), iconPath: tagOf( iconEl ) },
	} );
	// The enclosing blocks, nearest first: a parent block's setting can paint an element of its child (a form's field
	// style on each field's control), so Solve can resolve a row against them when the nearest block has no setting.
	const owners = [];
	for ( let a = refEl.parentElement; a && a !== document.documentElement; a = a.parentElement ) {
		const r = [ ...a.classList ].find( ( c ) => c.startsWith( prefix ) );
		if ( r ) {
			owners.push( from( a, r ) );
		}
	}
	return { ...from( refEl, ref ), owners };
}

// The properties collectPair reads from the text carrier rather than the element.
export const TEXT_CARRIED = [ 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-transform', 'color', 'text-shadow' ];

// The properties collectPair reads from the element laying out the children (paint.mjs::LAYOUT_PROPS).
export const LAYOUT_CARRIED = [ 'gap', 'row-gap', 'column-gap', 'flex-wrap', 'flex-direction', 'grid-template-columns', 'justify-content', 'align-items' ];

// Node side: stamps ref, block and path on one pair's rows from the live snapshot's trace. Text properties (at rest and
// on hover: hoverStyles reads colour from the same carrier) take the text path; layout properties the layout path;
// an icon's size the icon's path.
// Enclosing blocks (trace.owners) are stamped as d.owners: [{ ref, block, path, tag }], nearest first, with the same
// path choice (tag: the measured element's tag).
const pathKey = ( d, t ) => {
	if ( d.pseudo ) {
		return 'path';
	}
	if ( [ 'style', 'hover' ].includes( d.kind ) && TEXT_CARRIED.includes( d.key ) && null != t.textPath ) {
		return 'textPath';
	}
	if ( 'style' === d.kind && LAYOUT_CARRIED.includes( d.key ) && null != t.layoutPath ) {
		return 'layoutPath';
	}
	if ( 'style' === d.kind && /^icon-(width|height)$/.test( d.key ) && null != t.iconPath ) {
		return 'iconPath';
	}
	return 'path';
};
// A pseudo layer's row (d.pseudo) takes its element's path plus the pseudo: calibration keys the layer the same way.
const pathFor = ( d, t ) => ( null == t[ pathKey( d, t ) ] ? t[ pathKey( d, t ) ] : t[ pathKey( d, t ) ] + ( d.pseudo || '' ) );
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
		d.path = pathFor( d, trace );
		if ( trace.owners?.length ) {
			d.owners = trace.owners.map( ( o ) => ( { ref: o.ref, block: o.block, path: pathFor( d, o ), ...( o.tags ? { tag: o.tags[ pathKey( d, o ) ] } : {} ) } ) );
		}
	}
	return diffs;
}
