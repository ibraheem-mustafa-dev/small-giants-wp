// Reads a draft's shop surfaces (the buy box, the filter, the basket drawer) out of its `.dc.html` template source as a
// flat list of units (Spec 48 FR-48-60, FR-48-61, FR-48-62): every control, text run and image in the surface's region,
// each carrying the conditions (`sc-if` values, `sc-for` lists) it sits under. Pure: sources and surface records in,
// units out. The matcher (lib/shop-parts.mjs) classifies the units.
const TAG = /<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
const VOID = new Set( [ 'br', 'hr', 'img', 'input', 'meta', 'link', 'source', 'area', 'base', 'col', 'embed', 'wbr' ] );
const ATTR = /([\w:@.-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };
const CONTROLS = new Set( [ 'button', 'a', 'select', 'textarea', 'input' ] );
const SKIPPED = new Set( [ 'svg', 'option', 'script', 'style', 'helmet', 'sc-helmet' ] );
const ADD_HANDLER = /\badd(?:ToBag|ToCart|ToBasket|FrameOnly|WithLens)?\b/;
const ADD_TEXT = /add(?:ed)? to (?:basket|bag|cart)/i;
const FILTER_SIGNAL = /filter|sort|chips|price|clear/i;
const DRAWER_LABEL = /\b(?:basket|bag|cart)\b/i;

const decode = ( s ) => s.replace( /&(?:amp|lt|gt|quot|nbsp|#39);/g, ( m ) => ENTITIES[ m ] );
const squash = ( s ) => decode( s ).replace( /\s+/g, ' ' ).trim();
const stripExpr = ( v ) => String( v ).replace( /^\{\{\s*|\s*\}\}$/g, '' ).trim();

function attrsOf( rest ) {
	const out = {};
	for ( const m of rest.matchAll( ATTR ) ) {
		out[ m[ 1 ] ] = m[ 2 ] ?? m[ 3 ] ?? m[ 4 ] ?? '';
	}
	return out;
}

// The element tree of a template: `{ tag, attrs, children, parent }` elements and `{ text, parent }` runs. Comments,
// styles and scripts are dropped first, so their content is never read as markup.
export function parseTemplate( source ) {
	const clean = source.replace( /<!--[\s\S]*?-->/g, '' ).replace( /<(style|script)\b[\s\S]*?<\/\1>/gi, '' );
	const root = { tag: '#root', attrs: {}, children: [], parent: null };
	let at = root;
	let last = 0;
	for ( const m of clean.matchAll( TAG ) ) {
		const text = clean.slice( last, m.index );
		if ( text.trim() ) {
			at.children.push( { text, parent: at } );
		}
		last = m.index + m[ 0 ].length;
		const [ , close, rawName, rest ] = m;
		const tag = rawName.toLowerCase();
		if ( close ) {
			let up = at;
			while ( up && up.tag !== tag ) {
				up = up.parent;
			}
			if ( up && up.parent ) {
				at = up.parent;
			}
			continue;
		}
		const el = { tag, attrs: attrsOf( rest ), children: [], parent: at };
		at.children.push( el );
		if ( ! VOID.has( tag ) && ! /\/\s*$/.test( rest ) ) {
			at = el;
		}
	}
	return root;
}

function* walk( node ) {
	for ( const c of node.children || [] ) {
		yield c;
		if ( c.tag ) {
			yield* walk( c );
		}
	}
}
const elements = ( node ) => [ ...walk( node ) ].filter( ( n ) => n.tag );
const within = ( node, test ) => {
	for ( let n = node; n; n = n.parent ) {
		if ( test( n ) ) {
			return true;
		}
	}
	return false;
};
const textOf = ( node ) => squash( [ ...walk( node ) ].filter( ( n ) => ! n.tag && ! within( n.parent, ( p ) => p !== node && SKIPPED.has( p.tag ) ) ).map( ( n ) => n.text ).join( ' ' ) );
const handlerOf = ( el ) => stripExpr( el.attrs.onClick || el.attrs.onChange || '' );

const isAddControl = ( el ) => ( 'button' === el.tag || 'a' === el.tag ) && ( ADD_HANDLER.test( handlerOf( el ) ) || ADD_TEXT.test( textOf( el ) ) );
const isFilterSignal = ( el ) => ( CONTROLS.has( el.tag ) && FILTER_SIGNAL.test( `${ el.attrs[ 'aria-label' ] || '' } ${ handlerOf( el ) } ${ stripExpr( el.attrs.value || '' ) }` ) ) || ( 'group' === el.attrs.role && /filter/i.test( el.attrs[ 'aria-label' ] || '' ) );
const inImport = ( el ) => within( el, ( n ) => 'dc-import' === n.tag );

// The outermost elements of `list` (none inside another).
const outermost = ( list ) => list.filter( ( el ) => ! list.some( ( o ) => o !== el && within( el.parent, ( p ) => p === o ) ) );
const lowestCommon = ( els ) => {
	let n = els[ 0 ].parent;
	while ( n && ! els.every( ( e ) => within( e, ( p ) => p === n ) ) ) {
		n = n.parent;
	}
	return n;
};

export const drawerRegions = ( root ) => outermost( elements( root ).filter( ( e ) => ! CONTROLS.has( e.tag ) && 'svg' !== e.tag && 'img' !== e.tag && ( 'aside' === e.tag || 'dialog' === e.attrs.role ) && DRAWER_LABEL.test( e.attrs[ 'aria-label' ] || '' ) ) );

// The buy box: the lowest element holding both the first add-to-basket control and a page heading, plus any
// add-to-basket bar the page shows conditionally (a sticky bar).
export function buyboxRegions( root ) {
	const drawers = drawerRegions( root );
	const add = elements( root ).find( ( e ) => isAddControl( e ) && ! inImport( e ) && ! drawers.some( ( d ) => within( e, ( p ) => p === d ) ) );
	if ( ! add ) {
		return [];
	}
	let n = add.parent;
	while ( n && ! elements( n ).some( ( e ) => 'h1' === e.tag ) ) {
		n = n.parent;
	}
	const regions = n && n.parent ? [ n ] : [];
	const bars = elements( root ).filter( ( e ) => 'sc-if' === e.tag && /show\w*bar|sticky/i.test( e.attrs.value || '' ) && elements( e ).some( isAddControl ) );
	return [ ...regions, ...bars ];
}

// The filter: the lowest element holding every filter or sort control outside drawers and imported components.
export function filterRegions( root ) {
	const drawers = drawerRegions( root );
	const signals = elements( root ).filter( ( e ) => isFilterSignal( e ) && ! inImport( e ) && ! drawers.some( ( d ) => within( e, ( p ) => p === d ) ) );
	const n = signals.length ? lowestCommon( signals ) : null;
	return n && n.parent ? [ n ] : [];
}

const REGIONS = { buybox: buyboxRegions, filter: filterRegions, drawer: drawerRegions };
export const SURFACE_KINDS = Object.keys( REGIONS );

// The units of a region: one per control (its own words, aria label, placeholder, input type, handler, href; a checkbox's
// words are the text runs beside it), per text run outside a control, and per image or imported component. Decorative glyphs with no letter or digit are not units.
export function unitsOf( region, { file } ) {
	const out = [];
	const visit = ( node, conds ) => {
		for ( const c of node.children ) {
			if ( ! c.tag ) {
				const text = squash( c.text );
				if ( /[A-Za-z0-9{]/.test( text ) ) {
					out.push( { kind: 'text', tag: '#text', parent: node.tag, text, conds, file } );
				}
				continue;
			}
			if ( SKIPPED.has( c.tag ) ) {
				continue;
			}
			const here = 'sc-if' === c.tag ? [ ...conds, stripExpr( c.attrs.value || '' ) ] : 'sc-for' === c.tag ? [ ...conds, stripExpr( c.attrs.list || '' ) ] : conds;
			if ( 'dc-import' === c.tag ) {
				out.push( { kind: 'import', tag: c.tag, text: c.attrs.name || '', conds, file } );
			} else if ( 'img' === c.tag ) {
				out.push( { kind: 'image', tag: 'img', text: squash( c.attrs.alt || '' ), src: c.attrs.src || '', conds, file } );
			} else if ( CONTROLS.has( c.tag ) || 'switch' === c.attrs.role ) {
				const label = 'input' === c.tag ? '' : textOf( c );
				out.push( { kind: 'control', tag: c.tag, text: label, aria: c.attrs[ 'aria-label' ] || '', placeholder: c.attrs.placeholder || '', type: c.attrs.type || c.attrs.role || '', on: handlerOf( c ), href: c.attrs.href || '', conds, file } );
			} else {
				visit( c, here );
			}
		}
	};
	visit( region, 'sc-if' === region.tag ? [ stripExpr( region.attrs.value || '' ) ] : [] );
	return out;
}

const dcFile = ( dc ) => `${ dc }.dc.html`;
const NAMES = {
	buybox: [ /buy ?box/i, /^product$/i ],
	filter: [ /filter/i ],
	drawer: [ /(?:basket|bag).*drawer|drawer.*(?:basket|bag)/i ],
};

// Every shop surface of a draft: for each kind, the first name pattern that some handoff surface record matches picks
// the draft file (`dc`) to read, and the region reader finds the surface in it. `sources` maps a draft file name to its
// template source. A kind with no matching record, no file or no region is returned with `problem` set and no units.
export function readShopSurfaces( { records, sources } ) {
	return SURFACE_KINDS.map( ( kind ) => {
		const rec = NAMES[ kind ].map( ( rx ) => records.filter( ( r ) => rx.test( r.name || '' ) ) ).find( ( l ) => l.length )?.[ 0 ];
		if ( ! rec ) {
			return { kind, record: null, file: null, units: [], problem: `no handoff surface record names a ${ kind }` };
		}
		const file = dcFile( rec.dc );
		if ( ! ( file in sources ) ) {
			return { kind, record: rec.name, file, units: [], problem: `${ file } is not in the draft folder` };
		}
		const regions = REGIONS[ kind ]( parseTemplate( sources[ file ] ) );
		if ( ! regions.length ) {
			return { kind, record: rec.name, file, units: [], problem: `${ file } holds no ${ kind } region the reader recognises` };
		}
		return { kind, record: rec.name, file, units: regions.flatMap( ( r ) => unitsOf( r, { file } ) ), problem: null };
	} );
}
