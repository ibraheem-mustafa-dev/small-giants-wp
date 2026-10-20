// The construct registry's readers for the template, binding, logic-value, script and link kinds (Spec 48 FR-48-24,
// FR-48-85): each takes one census row and its census ({ rows, sources }) and returns where the route reads that
// occurrence, or throws when nothing can (the census then records the occurrence as a gap). Template elements, loops
// and import hosts are read by the skeleton inventory on the render by draft identity, with their loop and import
// membership (lib/skeleton-inventory.mjs::readInventory); a binding's rendered value reaches the consumer of its target
// (text and styles through Fill, a link through its link decisions, a handler, ref or form attribute as its own
// capability); renderVals keys and getters are read through the bindings and code that use them; a helmet script
// through the constructs the census found in it; a link by what its address is; a helmet font by the families it loads
// (the snapshot's self-hosted faces take them, lib/head-check.mjs::fontCheck).
import { holes } from './intake-census-template.mjs';
import { parseLogic, walkAst } from './intake-census-logic.mjs';
import { fontUrlFamilies } from './intake-head.mjs';

// Tags that make up the document rather than the page: the census reads them, the skeleton never proposes a block.
const DOCUMENT_TAGS = new Set( [ 'helmet', 'html', 'head', 'body', 'base', 'meta', 'title', 'link', 'style', 'script', 'noscript' ] );
// Template tags whose children carry them as membership (a condition, a loop, an import host).
const MEMBERSHIP_TAGS = new Set( [ 'sc-if', 'sc-for', 'dc-import' ] );

// A template element: its draft identity and whether the skeleton reads it as a block, as its children's membership,
// or as part of the document.
export function readTemplateElement( row ) {
	const tag = row.detail?.tag;
	if ( ! tag ) {
		throw new Error( `template element ${ row.draftId } has no tag` );
	}
	let role = 'skeleton';
	if ( DOCUMENT_TAGS.has( tag ) ) {
		role = 'document';
	} else if ( MEMBERSHIP_TAGS.has( tag ) ) {
		role = 'membership';
	}
	return { identity: row.draftId, tag, role, ...( row.detail.inFor ? { inLoop: true } : {} ) };
}

// A loop: the expression it repeats over and the name each item takes. A list that is not a {{ }} binding repeats
// nothing the runtime can stamp.
export function readLoop( row ) {
	const [ list ] = holes( String( row.detail?.list ?? '' ) );
	if ( ! list ) {
		throw new Error( `sc-for at ${ row.draftId } repeats over ${ JSON.stringify( row.detail?.list ?? null ) }, which is not a {{ }} binding (the runtime reads it as text and refuses it as not an array)` );
	}
	return { list, as: row.detail.as || 'item', identity: row.draftId };
}

// An import host: the component it stamps, which the export must hold.
export function readImport( row, ctx ) {
	const name = row.detail?.name;
	const source = ( ctx.sources || [] ).find( ( s ) => s.component === name );
	if ( ! source ) {
		throw new Error( `dc-import at ${ row.draftId } stamps ${ JSON.stringify( name ?? null ) }, which the export does not hold` );
	}
	return { component: name, file: source.file, props: row.detail.props || [], identity: row.draftId };
}

// Where a binding's rendered value is read, by the place it fills: `capability` names the construct kind that owns a
// target the route reads as a construct of its own; an attribute is owned by its element's attribute capability.
export function bindingTarget( where ) {
	const w = String( where ?? '' );
	if ( 'text' === w ) {
		return { target: 'content' };
	}
	if ( ! w.startsWith( 'attr:' ) ) {
		return null;
	}
	const a = w.slice( 5 );
	if ( 'style' === a || 'style-hover' === a ) {
		return { target: 'style' };
	}
	if ( 'href' === a ) {
		return { target: 'link' };
	}
	if ( 'list' === a ) {
		return { target: 'loop', capability: 'construct:sc-for' };
	}
	if ( 'ref' === a ) {
		return { target: 'ref', capability: 'construct:ref' };
	}
	if ( /^on[A-Z]/.test( a ) ) {
		return { target: 'handler', capability: 'construct:handler' };
	}
	return { target: 'attribute', attribute: a };
}

// A {{ }} binding: what it fills and the expression the runtime evaluates there.
export function readBinding( row ) {
	const t = bindingTarget( row.detail?.where );
	if ( ! t ) {
		throw new Error( `binding at ${ row.draftId } fills ${ JSON.stringify( row.detail?.where ?? null ) }, which is neither text nor an attribute` );
	}
	return { ...t, expression: row.detail.expression ?? null };
}

// The free names every template expression of a census uses (bindings, conditions and loop lists), counted: the
// identifiers of each expression parsed with the pinned parser, a member's property names excluded. Built once per census.
const namesCache = new WeakMap();
function templateNames( rows ) {
	if ( namesCache.has( rows ) ) {
		return namesCache.get( rows );
	}
	const counts = new Map();
	const expressions = rows.flatMap( ( r ) => {
		if ( 'binding' === r.kind ) {
			return [ r.detail?.expression ];
		}
		if ( 'sc-if' === r.kind ) {
			return holes( String( r.detail?.value ?? '' ) );
		}
		return 'sc-for' === r.kind ? holes( String( r.detail?.list ?? '' ) ) : [];
	} ).filter( ( e ) => 'string' === typeof e && e.trim() );
	for ( const e of expressions ) {
		let ast;
		try {
			ast = parseLogic( `(${ e });`, { sourceType: 'script' } );
		} catch {
			continue;
		}
		walkAst( ast.program, ( n, parents ) => {
			const p = parents[ parents.length - 1 ];
			const isProperty = p && ( ( 'MemberExpression' === p.type && p.property === n && ! p.computed ) || ( 'ObjectProperty' === p.type && p.key === n && ! p.computed ) );
			if ( 'Identifier' === n.type && ! isProperty ) {
				counts.set( n.name, ( counts.get( n.name ) || 0 ) + 1 );
			}
		} );
	}
	namesCache.set( rows, counts );
	return counts;
}

// A renderVals key: how many template expressions use it. A key no expression uses is dead code in the draft, read
// and reported as unused.
export function readRenderKey( row, ctx ) {
	const key = row.detail?.name;
	if ( ! key ) {
		throw new Error( `renderVals key at ${ row.draftId } has no name` );
	}
	const uses = templateNames( ctx.rows || [] ).get( key ) || 0;
	return { key, uses, ...( uses ? {} : { unused: true } ) };
}

// The `this.<name>` reads in a component's logic, counted. Built once per census sources list.
const thisCache = new WeakMap();
function thisReads( sources ) {
	if ( thisCache.has( sources ) ) {
		return thisCache.get( sources );
	}
	const by = new Map();
	for ( const s of sources ) {
		const counts = new Map();
		let ast = null;
		try {
			ast = s.logic ? parseLogic( s.logic ) : null;
		} catch {
			ast = null;
		}
		walkAst( ast?.program, ( n ) => {
			if ( 'MemberExpression' === n.type && 'ThisExpression' === n.object.type && ! n.computed && 'Identifier' === n.property.type ) {
				counts.set( n.property.name, ( counts.get( n.property.name ) || 0 ) + 1 );
			}
		} );
		by.set( s.component, counts );
	}
	thisCache.set( sources, by );
	return by;
}

// A logic getter: how many times its component's code reads it (`this.<name>`) and how many template expressions use
// it by name. A getter nothing reads is dead code, read and reported as unused.
export function readGetter( row, ctx ) {
	const name = row.detail?.name;
	if ( ! name ) {
		throw new Error( `getter at ${ row.draftId } has no name` );
	}
	const code = thisReads( ctx.sources || [] ).get( row.component )?.get( name ) || 0;
	const template = templateNames( ctx.rows || [] ).get( name ) || 0;
	return { getter: name, code, template, ...( code + template ? {} : { unused: true } ) };
}

// A helmet script: its address and the constructs the census found in it (their rows carry the script's file name as
// their component). An inline script's constructs sit on its draft.
export function readHelmetScript( row, ctx ) {
	const src = row.detail?.src ?? null;
	const file = src ? src.replace( /^\.\//, '' ).split( /[?#]/ )[ 0 ] : null;
	const constructs = file ? ( ctx.rows || [] ).filter( ( r ) => r.component === file ).map( ( r ) => r.id ) : [];
	if ( src && ! ( ctx.sources || [] ).some( ( s ) => ( s.scripts || [] ).some( ( x ) => x.src === src ) ) ) {
		throw new Error( `helmet script at ${ row.draftId } loads ${ src }, which the export does not hold` );
	}
	return { src, inline: row.detail?.inline || 0, constructs };
}

// A link by its address: an in-page anchor or placeholder `#`, a phone or mail link, a bound address (read from the
// render), a page of the draft, an external site, or a font host the head connects to.
export function readLink( row ) {
	const href = String( row.detail?.href ?? '' );
	const rel = String( row.detail?.rel ?? '' );
	let kind;
	if ( holes( href ).length ) {
		kind = 'bound';
	} else if ( /\b(?:preconnect|dns-prefetch|preload|stylesheet)\b/.test( rel ) ) {
		kind = 'head';
	} else if ( href.startsWith( '#' ) ) {
		kind = 'anchor';
	} else if ( /^(?:tel|mailto|sms):/i.test( href ) ) {
		kind = 'contact';
	} else if ( /^javascript:/i.test( href ) ) {
		kind = 'script';
	} else if ( /^data:/i.test( href ) ) {
		kind = 'data';
	} else if ( /^https?:\/\//i.test( href ) ) {
		kind = 'external';
	} else if ( href ) {
		kind = 'page';
	} else {
		throw new Error( `link at ${ row.draftId } has no address` );
	}
	return { href, kind, ...( rel ? { rel } : {} ) };
}

// A helmet font load: the families a font stylesheet or @import loads (with their weights), or an @font-face's family.
// A load whose families cannot be read throws, so the census records it as a gap.
export function readHelmetFont( row ) {
	const via = row.detail?.via;
	if ( '@font-face' === via ) {
		const family = String( row.detail?.family ?? '' ).replace( /^['"]|['"]$/g, '' ).trim();
		if ( ! family ) {
			throw new Error( `@font-face at ${ row.draftId } names no family` );
		}
		return { via, families: [ { family, weights: [], italic: false } ], src: row.detail.src ?? null };
	}
	const href = String( row.detail?.href ?? '' );
	const families = fontUrlFamilies( href );
	if ( ! families.length ) {
		throw new Error( `font ${ via } at ${ row.draftId } loads ${ JSON.stringify( href ) }, whose families are not read (Google Fonts URLs are)` );
	}
	return { via, href, families };
}
