// Reads a draft's shop surfaces (the buy box, the filter, the basket drawer) out of its `.dc.html` source as a flat list
// of units (Spec 48 FR-48-60, FR-48-61, FR-48-62): every control, text run and image in the surface's region, each with
// the conditions (`sc-if` values, `sc-for` lists) it sits under and the structural facts the matcher classifies it by
// (lib/shop-parts.mjs). The regions and the facts come from what the draft's code is and does, never from its words:
//   - the buy box is the lowest element holding the first control whose handler appends a record to a collection (an
//     add-to-basket, lib/shop-parts-logic.mjs::effectOf) and the page's h1, plus each conditional bar outside it that
//     repeats that control's handler (a sticky add bar);
//   - the basket drawer is an `aside`, `dialog` or `role="dialog"` holding a loop and a currency amount outside it;
//   - the filter is the lowest element holding every control whose handler sets a state key the product listing (a
//     loop of imported cards) reads.
// Pure: sources and surface records in, units out.
import { countBinding, effectOf, emptinessBinding, logicOf, moneyBinding, selectionReads } from './shop-parts-logic.mjs';

const TAG = /<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
const VOID = new Set( [ 'br', 'hr', 'img', 'input', 'meta', 'link', 'source', 'area', 'base', 'col', 'embed', 'wbr' ] );
const ATTR = /([\w:@.-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };
const CONTROLS = new Set( [ 'button', 'a', 'select', 'textarea', 'input' ] );
const SKIPPED = new Set( [ 'svg', 'option', 'script', 'style', 'helmet', 'sc-helmet' ] );
const BINDING = /\{\{\s*([^}]+?)\s*\}\}/g;

const decode = ( s ) => s.replace( /&(?:amp|lt|gt|quot|nbsp|#39);/g, ( m ) => ENTITIES[ m ] );
const squash = ( s ) => decode( s ).replace( /\s+/g, ' ' ).trim();
const stripExpr = ( v ) => String( v ).replace( /^\{\{\s*|\s*\}\}$/g, '' ).trim();
const bindingsOf = ( text ) => [ ...String( text || '' ).matchAll( BINDING ) ].map( ( m ) => m[ 1 ] );
// The first name a condition reads (`it` in `!it.done`, `it.open && x`).
const leadName = ( expr ) => /^[\s!(]*([A-Za-z_$][\w$]*)/.exec( expr )?.[ 1 ] ?? '';

function attrsOf( rest ) {
	const out = {};
	for ( const m of rest.matchAll( ATTR ) ) {
		out[ m[ 1 ] ] = m[ 2 ] ?? m[ 3 ] ?? m[ 4 ] ?? '';
	}
	return out;
}

// The element tree of a template: `{ tag, attrs, children, parent, n, tpl }` elements (`n` numbers them in source order)
// and `{ text, parent }` runs. Comments are dropped and each style and script is kept as an empty element, so their
// content is never read as markup. `tpl` is the number the draft runtime stamps on the element as `data-dc-tpl`: its
// pre-order index among the elements of the template between `<x-dc>` and the last `</x-dc>` (support.js::compileTemplate
// stamps every element of the parsed template in document order, so the k-th start tag there is element k), null for an
// element outside it; a source with no `<x-dc>` is all template.
export function parseTemplate( source ) {
	const clean = source.replace( /<!--[\s\S]*?-->/g, '' ).replace( /<(style|script)\b((?:[^>"']|"[^"]*"|'[^']*')*)>[\s\S]*?<\/\1\s*>/gi, '<$1$2></$1>' );
	const root = { tag: '#root', attrs: {}, children: [], parent: null, n: 0, tpl: null };
	const open = clean.search( /<x-dc[\s>]/i );
	const end = clean.toLowerCase().lastIndexOf( '</x-dc' );
	let at = root;
	let last = 0;
	let count = 0;
	let stamp = 0;
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
		const inTemplate = open < 0 || ( m.index > open && m.index < end );
		const el = { tag, attrs: attrsOf( rest ), children: [], parent: at, n: ++count, tpl: inTemplate ? stamp++ : null };
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
const handlerOf = ( el ) => stripExpr( el.attrs.onClick || el.attrs.onChange || el.attrs.onInput || '' );
const inImport = ( el ) => within( el, ( n ) => 'dc-import' === n.tag );
const isDialog = ( e ) => 'aside' === e.tag || 'dialog' === e.tag || 'dialog' === e.attrs.role;
const isControl = ( e ) => CONTROLS.has( e.tag ) || 'switch' === e.attrs.role;

// The outermost elements of `list` (none inside another).
const outermost = ( list ) => list.filter( ( el ) => ! list.some( ( o ) => o !== el && within( el.parent, ( p ) => p === o ) ) );
const lowestCommon = ( els ) => {
	let n = els[ 0 ].parent;
	while ( n && ! els.every( ( e ) => within( e, ( p ) => p === n ) ) ) {
		n = n.parent;
	}
	return n;
};
const textRuns = ( node ) => [ ...walk( node ) ].filter( ( n ) => ! n.tag );
const moneyText = ( L, t ) => {
	const b = bindingsOf( t.text );
	return b.length > 0 && b.every( ( x ) => moneyBinding( L, x ) );
};

const isAddControl = ( L, el ) => ( 'button' === el.tag || 'a' === el.tag ) && !! handlerOf( el ) && effectOf( L, handlerOf( el ) ).appends;

// Whether a loop's items carry a control that changes the basket without adding to it: it writes an outside store, or
// sets a state key every add control sets (the basket itself).
const editsBasket = ( L, loop, addKeys ) => elements( loop ).some( ( x ) => {
	if ( ! isControl( x ) || ! handlerOf( x ) ) {
		return false;
	}
	const fx = effectOf( L, handlerOf( x ), loop.attrs.as && handlerOf( x ).split( '.' )[ 0 ] === loop.attrs.as ? stripExpr( loop.attrs.list || '' ) : null );
	return ! fx.appends && ( fx.writesStore || fx.sets.some( ( k ) => addKeys.has( k ) ) );
} );

// The state keys every add control sets (the basket itself).
function basketKeys( root, L ) {
	const adds = elements( root ).filter( ( e ) => isAddControl( L, e ) ).map( ( e ) => effectOf( L, handlerOf( e ) ).sets );
	return new Set( adds.length ? adds[ 0 ].filter( ( k ) => adds.every( ( set ) => set.includes( k ) ) ) : [] );
}

// The basket drawers: outermost dialogs holding a loop whose items edit the basket, and a currency amount outside every
// loop.
export function drawerRegions( root, L ) {
	const all = elements( root );
	const addKeys = basketKeys( root, L );
	return outermost( all.filter( ( e ) => isDialog( e ) && elements( e ).some( ( x ) => 'sc-for' === x.tag && editsBasket( L, x, addKeys ) ) &&
		textRuns( e ).some( ( t ) => moneyText( L, t ) && ! within( t.parent, ( p ) => p !== e && 'sc-for' === p.tag && within( p, ( q ) => q === e ) ) ) ) );
}

// The buy box: the lowest element holding both the first add-to-basket control and the page's h1, plus each conditional
// bar outside it that repeats the add control's handler.
export function buyboxRegions( root, L ) {
	const drawers = drawerRegions( root, L );
	const add = elements( root ).find( ( e ) => ! inImport( e ) && ! drawers.some( ( d ) => within( e, ( p ) => p === d ) ) && isAddControl( L, e ) );
	if ( ! add ) {
		return [];
	}
	let n = add.parent;
	while ( n && ! elements( n ).some( ( e ) => 'h1' === e.tag ) ) {
		n = n.parent;
	}
	const regions = n && n.parent ? [ n ] : [];
	const main = regions[ 0 ];
	const bars = elements( root ).filter( ( e ) => 'sc-if' === e.tag && ! ( main && within( e, ( p ) => p === main ) ) && ! ( main && within( main, ( p ) => p === e ) ) &&
		elements( e ).some( ( x ) => isControl( x ) && handlerOf( x ) === handlerOf( add ) ) );
	return [ ...regions, ...outermost( bars ).map( ( b ) => Object.assign( b, { bar: true } ) ) ];
}

const narrows = ( L, el, keys ) => !! handlerOf( el ) && effectOf( L, handlerOf( el ) ).sets.some( ( k ) => keys.has( k ) );

// The controls that belong to a listing: those inside its highest ancestor that holds no other listing.
function nearest( loop, loops, signals ) {
	let own = loop;
	for ( let a = loop.parent; a && ! loops.some( ( l ) => l !== loop && within( l, ( p ) => p === a ) ); a = a.parent ) {
		own = a;
	}
	return signals.filter( ( e ) => within( e, ( p ) => p === own ) );
}

// The product listing a filter drives: of the loops of imported cards (outside drawers), the one with the most
// controls of its own (nearest) that set a state key selecting its items (lib/shop-parts-logic.mjs::selectionReads).
// { loop, keys, signals } or null.
function listing( root, L ) {
	const drawers = drawerRegions( root, L );
	const loops = elements( root ).filter( ( e ) => 'sc-for' === e.tag && elements( e ).some( ( x ) => 'dc-import' === x.tag ) && ! inImport( e ) );
	const controls = elements( root ).filter( ( e ) => isControl( e ) && ! inImport( e ) && ! drawers.some( ( d ) => within( e, ( p ) => p === d ) ) && ! loops.some( ( l ) => within( e, ( p ) => p === l ) ) );
	let best = null;
	for ( const loop of loops ) {
		const keys = selectionReads( L, loop.attrs.list );
		const signals = keys.size ? nearest( loop, loops, controls.filter( ( e ) => narrows( L, e, keys ) ) ) : [];
		if ( signals.length && ( ! best || signals.length > best.signals.length ) ) {
			best = { loop, keys, signals };
		}
	}
	return best;
}

// The filter: the lowest element holding every control (outside drawers, imports and the listing itself) whose handler
// sets a state key that selects the product listing's items.
export function filterRegions( root, L ) {
	const found = listing( root, L );
	const n = found ? lowestCommon( found.signals ) : null;
	return n && n.parent ? [ n ] : [];
}

const REGIONS = { buybox: buyboxRegions, filter: filterRegions, drawer: drawerRegions };
export const SURFACE_KINDS = Object.keys( REGIONS );

// The row a node sits in: the nearest ancestor-or-self with more than one child (a wrapper around one child is not a row).
const rowOf = ( node ) => {
	let n = node;
	while ( n.parent && n.children.filter( ( c ) => c.tag || c.text.trim() ).length < 2 ) {
		n = n.parent;
	}
	return n;
};

// The `data-dc-tpl` of the rendered element a unit was found on: the element itself, or for a text run the element
// holding it. The runtime's control-flow elements (`sc-if`, `sc-else`, `sc-for`) render no element of their own, so a
// run directly inside one is located by the nearest ancestor that does render.
const FLOW = new Set( [ 'sc-if', 'sc-else', 'sc-for' ] );
const stampOf = ( el ) => {
	let n = el;
	while ( n && FLOW.has( n.tag ) ) {
		n = n.parent;
	}
	return n?.tpl ?? null;
};

const GLYPH = /^[^\p{L}\p{N}]+$/u;
// Whether an element is a stepper: a glyph-only button, a value, and a glyph-only button side by side.
const isStepper = ( el ) => {
	const kids = el.children.filter( ( c ) => c.tag || c.text.trim() );
	if ( 3 !== kids.length ) {
		return false;
	}
	const glyphButton = ( c ) => 'button' === c.tag && GLYPH.test( textOf( c ) || '' ) && textOf( c );
	return glyphButton( kids[ 0 ] ) && glyphButton( kids[ 2 ] ) && ! ( kids[ 1 ].tag && isControl( kids[ 1 ] ) ) && bindingsOf( kids[ 1 ].tag ? textOf( kids[ 1 ] ) : kids[ 1 ].text ).length > 0;
};

// The route a link opens, when it is another draft file: { file, form } (`form` when that file's template holds three
// or more form fields), else null.
function routeOf( href, sources ) {
	const file = String( href || '' ).split( /[?#]/ )[ 0 ];
	if ( ! file.endsWith( '.dc.html' ) || ! ( file in sources ) ) {
		return null;
	}
	const fields = elements( parseTemplate( sources[ file ] ) ).filter( ( e ) => [ 'input', 'select', 'textarea' ].includes( e.tag ) && 'hidden' !== e.attrs.type ).length;
	return { file, form: fields >= 3 };
}

// The units of a region: one per control (its own words, aria label, placeholder, input type, handler, href; a checkbox's
// words are the text runs beside it), per text run outside a control, and per image or imported component. Decorative
// glyphs with no letter or digit are not units. Each unit carries `rowN` (the number of its row element) and `facts`: its role, input type, ARIA state (pressed,
// expanded), the loop it repeats in, its heading level, whether it is part of a stepper, the region part it sits in
// (`bar` for a sticky bar), the handler's effect, whether its bound value is a currency amount or a collection count,
// whether a condition above it tests a collection is empty or discloses a control's expanded content, the route a link
// opens, whether the handler narrows the product listing (`listingKeys`), whether it edits the basket without adding
// to it (it writes an outside store or a key in `addKeys`), and for a control in a loop: whether its handler is the loop
// item's own (`itemBound`), whether a condition inside the loop reads the item (`itemCond`: it shows on some items only),
// and whether its handler leaves the surface for somewhere else (`leaves`: it sets to false a key the surface's handoff
// record opens it with, `openKeys`, and sets another key besides).
export function unitsOf( region, { file, dc = null, L = null, sources = {}, listingKeys = new Set(), addKeys = new Set(), openKeys = new Set(), perUnit = [] } ) {
	const out = [];
	const expanded = new Set( elements( region ).filter( ( e ) => e.attrs[ 'aria-expanded' ] ).map( ( e ) => stripExpr( e.attrs[ 'aria-expanded' ] ) ) );
	const visit = ( node, ctx ) => {
		const stepper = ctx.stepper || isStepper( node );
		for ( const c of node.children ) {
			const base = { conds: ctx.conds, file, dc, tpl: stampOf( c.tag ? c : node ), rowN: rowOf( node ).n };
			const facts = { loop: ctx.loop, heading: ctx.heading, stepper, bar: !! region.bar, empty: ctx.empty, disclosed: ctx.disclosed };
			if ( ! c.tag ) {
				const text = squash( c.text );
				if ( /[A-Za-z0-9{]/.test( text ) ) {
					const b = bindingsOf( text );
					out.push( { ...base, kind: 'text', tag: '#text', parent: node.tag, text, facts: { ...facts, money: b.length > 0 && b.every( ( x ) => moneyBinding( L, x ) ), count: 1 === b.length && countBinding( L, b[ 0 ] ), perUnit: perUnit.find( ( p ) => b.some( ( x ) => x.endsWith( `.${ p.field }` ) ) )?.word || null } } );
				}
				continue;
			}
			if ( SKIPPED.has( c.tag ) ) {
				continue;
			}
			const value = stripExpr( c.attrs.value || '' );
			const next = { ...ctx, stepper };
			if ( 'sc-if' === c.tag ) {
				next.conds = [ ...ctx.conds, value ];
				next.itemCond = ctx.itemCond || ( !! ctx.loopAs && ctx.loopAs === leadName( value ) );
				next.empty = ctx.empty || emptinessBinding( L, value );
				next.disclosed = ctx.disclosed || expanded.has( value );
			} else if ( 'sc-for' === c.tag ) {
				next.conds = [ ...ctx.conds, stripExpr( c.attrs.list || '' ) ];
				next.loop = stripExpr( c.attrs.list || '' );
				next.loopAs = c.attrs.as || '';
			} else if ( /^h[1-6]$/.test( c.tag ) ) {
				next.heading = Number( c.tag[ 1 ] );
			}
			if ( 'dc-import' === c.tag ) {
				out.push( { ...base, kind: 'import', tag: c.tag, text: c.attrs.name || '', facts } );
			} else if ( 'img' === c.tag ) {
				out.push( { ...base, kind: 'image', tag: 'img', text: squash( c.attrs.alt || '' ), src: c.attrs.src || '', facts } );
			} else if ( isControl( c ) ) {
				const label = 'input' === c.tag ? '' : textOf( c );
				const on = handlerOf( c );
				const itemBound = !! ctx.loopAs && on.split( '.' )[ 0 ] === ctx.loopAs;
				const effect = effectOf( L, on, itemBound ? ctx.loop : null );
				out.push( { ...base, kind: 'control', tag: c.tag, text: label, aria: c.attrs[ 'aria-label' ] || '', placeholder: c.attrs.placeholder || '', type: c.attrs.type || c.attrs.role || '', on, href: c.attrs.href || '', facts: {
					...facts,
					role: c.attrs.role || '',
					inputType: 'input' === c.tag ? ( c.attrs.type || 'text' ).toLowerCase() : '',
					pressed: [ 'aria-pressed', 'aria-checked', 'aria-selected' ].some( ( k ) => k in c.attrs ),
					expanded: 'aria-expanded' in c.attrs,
					effect,
					route: routeOf( c.attrs.href, sources ),
					narrows: effect.sets.some( ( k ) => listingKeys.has( k ) ),
					editsBasket: ! effect.appends && ( effect.writesStore || effect.sets.some( ( k ) => addKeys.has( k ) ) ),
					money: bindingsOf( label ).some( ( x ) => moneyBinding( L, x ) ),
					perUnit: perUnit.find( ( p ) => bindingsOf( label ).some( ( x ) => x.endsWith( `.${ p.field }` ) ) )?.word || null,
					itemBound,
					itemCond: !! ctx.itemCond,
					leaves: effect.off.some( ( k ) => openKeys.has( k ) ) && effect.sets.some( ( k ) => ! openKeys.has( k ) ),
				} } );
			} else {
				visit( c, next );
			}
		}
	};
	const start = { conds: [], loop: null, loopAs: '', heading: 0, stepper: false, empty: false, disclosed: false, itemCond: false };
	if ( 'sc-if' === region.tag ) {
		start.conds = [ stripExpr( region.attrs.value || '' ) ];
	}
	visit( region, start );
	return out;
}

// The shop's result count wherever the shop page draws it (FR-48-61): every text run bound to a count of a collection
// (lib/shop-parts-logic.mjs::countBinding) on the page holding the product listing (the listing's <main>, else the draft)
// outside the filter region, the drawers, the imported components and the listing's own items, one unit each, so a count
// above the listing or beside the cards is the shop's count as one inside the filter is; a count on another page of the
// draft (a basket or wishlist count) is not the shop's.
export function countUnits( root, regions, { file, dc = null, L = null } ) {
	const drawers = drawerRegions( root, L );
	const loop = listing( root, L )?.loop ?? null;
	let page = loop;
	while ( page && 'main' !== page.tag ) {
		page = page.parent;
	}
	const outside = ( e ) => ( ! page || within( e, ( p ) => p === page ) ) && ! regions.some( ( r ) => within( e, ( p ) => p === r ) ) && ! drawers.some( ( d ) => within( e, ( p ) => p === d ) ) && ! inImport( e ) && ! ( loop && within( e, ( p ) => p === loop ) ) && ! within( e, ( p ) => SKIPPED.has( p.tag ) );
	const out = [];
	for ( const el of elements( root ).filter( outside ) ) {
		for ( const c of el.children.filter( ( x ) => ! x.tag ) ) {
			const text = squash( c.text );
			const b = bindingsOf( text );
			if ( 1 === b.length && countBinding( L, b[ 0 ] ) ) {
				const conds = [];
				for ( let p = el; p; p = p.parent ) {
					'sc-if' === p.tag && conds.unshift( stripExpr( p.attrs.value || '' ) );
				}
				out.push( { conds, file, dc, tpl: stampOf( el ), rowN: rowOf( el ).n, kind: 'text', tag: '#text', parent: el.tag, text, facts: { loop: null, heading: 0, stepper: false, bar: false, empty: false, disclosed: false, money: false, count: true } } );
			}
		}
	}
	return out;
}

const dcFile = ( dc ) => `${ dc }.dc.html`;
const NAMES = {
	buybox: [ /buy ?box/i, /^product$/i ],
	filter: [ /filter/i ],
	drawer: [ /(?:basket|bag).*drawer|drawer.*(?:basket|bag)/i ],
};

// The keys a handoff surface record's states set to true: what opens the surface (`bagOpen` in `{ bagOpen: true }`).
const openKeysOf = ( rec ) => new Set( ( rec.states || [] ).flatMap( ( st ) => Object.entries( st?.state_keys || {} ).filter( ( [ , v ] ) => true === v ).map( ( [ k ] ) => k ) ) );

// Every shop surface of a draft: for each kind, the first name pattern that some handoff surface record matches picks
// the draft file (`dc`) to read, and the region reader finds the surface in it. `sources` maps a draft file name to its
// source. A kind with no matching record, no file or no region is returned with `problem` set and no units.
export function readShopSurfaces( { records, sources, perUnit = [] } ) {
	return SURFACE_KINDS.map( ( kind ) => {
		const rec = NAMES[ kind ].map( ( rx ) => records.filter( ( r ) => rx.test( r.name || '' ) ) ).find( ( l ) => l.length )?.[ 0 ];
		if ( ! rec ) {
			return { kind, record: null, file: null, units: [], problem: `no handoff surface record names a ${ kind }` };
		}
		const file = dcFile( rec.dc );
		if ( ! ( file in sources ) ) {
			return { kind, record: rec.name, file, units: [], problem: `${ file } is not in the draft folder` };
		}
		const root = parseTemplate( sources[ file ] );
		const L = logicOf( sources[ file ] );
		const regions = REGIONS[ kind ]( root, L );
		if ( ! regions.length ) {
			return { kind, record: rec.name, file, units: [], problem: `${ file } holds no ${ kind } region the reader recognises by its structure` };
		}
		const listingKeys = 'filter' === kind ? listing( root, L )?.keys || new Set() : new Set();
		const addKeys = basketKeys( root, L );
		const openKeys = openKeysOf( rec );
		const units = regions.flatMap( ( r ) => unitsOf( r, { file, dc: rec.dc, L, sources, listingKeys, addKeys, openKeys, perUnit } ) );
		return { kind, record: rec.name, file, units: 'filter' === kind ? [ ...units, ...countUnits( root, regions, { file, dc: rec.dc, L } ) ] : units, problem: null };
	} );
}
