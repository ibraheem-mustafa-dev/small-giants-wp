// Intake routing (Spec 48 FR-48-26): the three routing adapters a Claude Design export can use, the precedence rule
// that picks one from the code, and the routes and links the page map consumes (FR-48-30). Links are read from
// template attribute values (FR-48A-3) and from the logic's AST; data-driven hrefs (`{{ item.href }}`) resolve through
// the object literals holding that key. Every link no adapter resolves, every binding that cannot be read statically
// and every draft that fails to parse is a gap row { construct, draftId, error } (R-48-3), never dropped.
import fs from 'fs';
import path from 'path';
import { walkFolder, reachable, resolveRef } from './handoff.mjs';
import {
	loadDraft, attrOf, readBinding, bindingKey, evalStr, snippet, keyName, isThisMember, propName, isFn, resolveName,
	subtree, classMethod, scanTags, fnBinding, enclosingFn,
} from './intake-ast.mjs';

const EXTERNAL = /^([a-z][a-z0-9+.-]*:|\/\/)/i;
const tagId = ( d, t ) => `${ d.file }:${ t.line }:${ t.col } <${ t.name }${ attrOf( t, 'aria-label' ) ? ` aria-label="${ attrOf( t, 'aria-label' ) }"` : '' }>`;
const logicId = ( d, n ) => `${ d.file }:${ d.idx.line( n ) } (logic)`;
const gap = ( construct, draftId, error ) => ( { construct, draftId, error } );

// The export: entry drafts (MANIFEST.json `entry_drafts`, else every root draft no draft mounts), the reachable drafts
// loaded, the page files (entries plus drafts reached by an href or src link) and the drafts mounted by <dc-import>.
export function loadExport( folder ) {
	const { files } = walkFolder( folder );
	const drafts = files.filter( ( f ) => f.endsWith( '.dc.html' ) );
	const [ mounted, linked ] = [ new Set(), new Set() ];
	for ( const f of drafts ) {
		for ( const t of scanTags( fs.readFileSync( path.join( folder, f ), 'utf8' ) ) ) {
			if ( 'dc-import' === t.name && attrOf( t, 'name' ) ) {
				mounted.add( `${ attrOf( t, 'name' ) }.dc.html` );
			}
			t.attrs.filter( ( a ) => /^(href|src)$/i.test( a.name ) ).map( ( a ) => resolveRef( a.value, f ) )
				.forEach( ( p ) => p?.endsWith( '.dc.html' ) && p !== f && linked.add( p ) );
		}
	}
	const manifest = path.join( folder, 'MANIFEST.json' );
	const entries = fs.existsSync( manifest ) ? JSON.parse( fs.readFileSync( manifest, 'utf8' ) ).entry_drafts || []
		: drafts.filter( ( f ) => ! f.includes( '/' ) && ! mounted.has( f ) );
	const reach = [ ...reachable( folder, entries, files ).drafts ].sort();
	const pages = reach.filter( ( f ) => entries.includes( f ) || linked.has( f ) );
	return { folder, entries, pages, mounted, drafts: reach.map( ( f ) => loadDraft( folder, f ) ) };
}

const setStateHasPage = ( idx, fn ) => subtree( idx, fn ).some( ( n ) => 'CallExpression' === n.type && 'setState' === propName( n.callee )
	&& subtree( idx, n.arguments[ 0 ] || n ).some( ( o ) => 'ObjectProperty' === o.type && 'page' === keyName( o ) ) );
const writesHash = ( n ) => 'AssignmentExpression' === n?.type && 'hash' === propName( n.left )
	&& ( 'location' === n.left.object.name || 'location' === propName( n.left.object ) );

// The router evidence of one draft's logic: the pages getter, a hashchange listener, a routing go() (one that sets
// state.page or writes location.hash; a form-step or view switcher named go is not a router) and every function that
// sets state.page from its own parameter.
function evidence( d ) {
	const idx = d.idx;
	if ( ! idx ) {
		return { setters: [] };
	}
	const getter = idx.all.find( ( n ) => /ClassMethod|ObjectMethod/.test( n.type ) && 'get' === n.kind && 'pages' === keyName( n ) );
	const hashchange = idx.all.find( ( n ) => 'CallExpression' === n.type && 'addEventListener' === propName( n.callee ) && 'hashchange' === n.arguments[ 0 ]?.value );
	const go = classMethod( idx, 'go' );
	const goFn = go && ( isFn( go ) ? go : go.value );
	const setters = idx.all.filter( ( n ) => isFn( n ) && n.params.length && setStateHasPage( idx, n ) && subtree( idx, n ).some( ( o ) => 'ObjectProperty' === o.type
		&& 'page' === keyName( o ) && 'Identifier' === o.value.type && resolveName( idx, o.value )?.fn === n ) );
	let body = goFn ? ( 'BlockStatement' === goFn.body.type ? goFn.body.body : [ { type: 'ExpressionStatement', expression: goFn.body } ] ) : [];
	if ( 1 === body.length && 'IfStatement' === body[ 0 ].type && ! body[ 0 ].alternate ) {
		body = 'BlockStatement' === body[ 0 ].consequent.type ? body[ 0 ].consequent.body : [ body[ 0 ].consequent ];
	}
	const goHashOnly = 1 === body.length && 'ExpressionStatement' === body[ 0 ].type && writesHash( body[ 0 ].expression );
	const goSetsPage = !! goFn && setStateHasPage( idx, goFn );
	const goRoutes = goSetsPage || ( !! goFn && subtree( idx, goFn ).some( writesHash ) );
	return { getter, hashchange, go: goRoutes ? goFn : null, goHashOnly, goSetsPage, setters };
}

const describe = ( d, e ) => [
	e.getter && `${ logicId( d, e.getter ) } get pages()`, e.hashchange && `${ logicId( d, e.hashchange ) } hashchange listener`,
	e.go && `${ logicId( d, e.go ) } go() ${ e.goHashOnly ? 'writes only location.hash' : e.goSetsPage ? 'sets state.page' : 'writes location.hash' }`,
	...e.setters.filter( ( s ) => s !== e.go ).map( ( s ) => `${ logicId( d, s ) } setState({ page }) from a parameter` ),
].filter( Boolean );

const entryEvidence = ( exp ) => exp.drafts.filter( ( d ) => exp.entries.includes( d.file ) ).map( ( d ) => ( { d, e: evidence( d ) } ) );

// The whole-value branches of a conditional or logical expression.
const branches = ( n ) => ( 'ConditionalExpression' === n.type ? [ ...branches( n.consequent ), ...branches( n.alternate ) ]
	: 'LogicalExpression' === n.type ? ( '&&' === n.operator ? branches( n.right ) : [ ...branches( n.left ), ...branches( n.right ) ] ) : [ n ] );

const isLocation = ( n ) => 'location' === ( n?.name || propName( n ) );

// Every href in the export, classified by the adapter: static template values, data-driven values (through the object
// literals holding the bound key, following a value that forwards another key), `this.go(x)` arguments in `goDraft`
// (the hash router's draft, where go() is the link helper) and `location.href = x` / `location.assign(x)` in logic.
// `classify( href, draft, how )` returns { route, detail?, external? }, { error } or { skip } (owned elsewhere).
function collectLinks( exp, classify, { goDraft = null } = {} ) {
	const links = [];
	const gaps = [];
	const add = ( from, href, d, extra = {} ) => {
		const c = classify( href, d, extra );
		if ( c.skip || links.some( ( l ) => l.from === from && l.href === href ) ) {
			return;
		}
		if ( c.error ) {
			gaps.push( gap( 'link', from, `${ JSON.stringify( href ) }: ${ c.error }` ) );
		}
		links.push( { from, href, route: c.route ?? null, ...( c.external ? { external: true } : {} ), ...( c.detail ? { detail: c.detail } : {} ), ...extra } );
	};
	for ( const d of exp.drafts ) {
		if ( d.error ) {
			gaps.push( gap( 'draft', d.file, d.error ) );
			continue;
		}
		const keys = new Map();
		const bind = ( key, who ) => keys.set( key, [ ...( keys.get( key ) || [] ), who ] );
		for ( const t of d.tags.filter( ( x ) => 'link' !== x.name && undefined !== attrOf( x, 'href' ) ) ) {
			const value = attrOf( t, 'href' );
			let b;
			try {
				b = readBinding( value );
			} catch ( e ) {
				gaps.push( gap( 'link', tagId( d, t ), `binding ${ value } does not parse: ${ e.message }` ) );
				continue;
			}
			if ( ! b || undefined !== b.prefix ) {
				add( tagId( d, t ), b ? b.prefix : value, d, b ? { partial: value } : {} );
			} else if ( bindingKey( b.expr ) ) {
				bind( bindingKey( b.expr ), `${ tagId( d, t ) } href="${ value }"` );
			} else {
				gaps.push( gap( 'link', tagId( d, t ), `href binding {{ ${ b.text } }} is not a property path and cannot be read statically` ) );
			}
		}
		if ( ! d.idx ) {
			keys.forEach( ( who, key ) => gaps.push( gap( 'link', who[ 0 ], `binding key "${ key }" has no logic to resolve it` ) ) );
			continue;
		}
		const fromEval = ( r, from, extra ) => {
			r.values.forEach( ( v ) => add( from, v, d, extra ) );
			r.partial.forEach( ( v ) => add( from, v, d, { ...extra, partial: true } ) );
		};
		for ( const n of d.idx.all ) {
			const call = 'CallExpression' === n.type ? n : null;
			const arg = ( goDraft === d.file && call && isThisMember( call.callee, 'go' ) && call.arguments[ 0 ] )
				|| ( 'AssignmentExpression' === n.type && 'href' === propName( n.left ) && isLocation( n.left.object ) && n.right )
				|| ( call && /^(assign|replace)$/.test( propName( call.callee ) || '' ) && isLocation( call.callee.object ) && call.arguments[ 0 ] );
			if ( ! arg ) {
				continue;
			}
			const from = `${ logicId( d, n ) } ${ snippet( d.idx, n, 80 ) }`;
			const r = evalStr( d.idx, arg );
			if ( ! r.values.length && ! r.partial.length && 'MemberExpression' === arg.type && bindingKey( arg ) ) {
				bind( bindingKey( arg ), from );
				continue;
			}
			fromEval( r, from, { call: snippet( d.idx, n, 80 ) } );
			( r.partial.length ? [] : r.unresolved ).forEach( ( u ) => gaps.push( gap( 'link', from, `argument ${ snippet( d.idx, u ) } is not a static string` ) ) );
		}
		for ( const [ key, who ] of keys ) {
			const props = d.idx.all.filter( ( n ) => 'ObjectProperty' === n.type && keyName( n ) === key && ! isFn( n.value ) );
			if ( ! props.length ) {
				gaps.push( gap( 'link', who[ 0 ], `no object literal in the logic holds the bound key "${ key }"` ) );
			}
			for ( const p of props ) {
				const from = `${ logicId( d, p ) } ${ key }: ${ snippet( d.idx, p.value, 80 ) }`;
				for ( const b of branches( p.value ) ) {
					const r = evalStr( d.idx, b );
					if ( 'MemberExpression' === b.type && ! b.computed && ! r.values.length && ! r.partial.length ) {
						if ( b.property.name !== key ) {
							bind( b.property.name, `${ from } (forwards ${ snippet( d.idx, b, 60 ) })` );
						}
						continue;
					}
					fromEval( r, from, { boundBy: who } );
					( r.partial.length ? [] : r.unresolved ).forEach( ( u ) => gaps.push( gap( 'link', from,
						`the value bound to "${ key }" (${ snippet( d.idx, u ) }) cannot be read statically; bound by ${ who[ 0 ] }` ) ) );
				}
			}
		}
	}
	return { links, gaps };
}

const defaultPage = ( d ) => {
	const st = d.idx?.all.find( ( n ) => 'ClassProperty' === n.type && 'state' === keyName( n ) && 'ObjectExpression' === n.value?.type );
	const p = st?.value.properties.find( ( x ) => 'ObjectProperty' === x.type && 'page' === keyName( x ) );
	return 'StringLiteral' === p?.value.type ? p.value.value : null;
};

// Adapter 1: routes are the `pages` getter's keys (a returned object literal, or the one it memoises into this._x).
const hash = {
	name: 'hash',
	matches( exp ) {
		const hit = entryEvidence( exp ).find( ( { e } ) => e.getter && e.hashchange );
		return { match: !! hit, evidence: hit ? describe( hit.d, hit.e ) : [ 'no entry draft has both a `pages` getter and a hashchange listener' ] };
	},
	read( exp ) {
		const { d, e } = entryEvidence( exp ).find( ( x ) => x.e.getter && x.e.hashchange );
		const gaps = [];
		const keys = [];
		const inGetter = subtree( d.idx, e.getter );
		for ( const ret of inGetter.filter( ( n ) => 'ReturnStatement' === n.type && enclosingFn( d.idx, n ) === e.getter ) ) {
			const obj = isThisMember( ret.argument )
				? inGetter.find( ( n ) => 'AssignmentExpression' === n.type && isThisMember( n.left, ret.argument.property.name ) && 'ObjectExpression' === n.right.type )?.right
				: ret.argument;
			for ( const p of 'ObjectExpression' === obj?.type ? obj.properties : [] ) {
				const k = 'SpreadElement' === p.type ? null : keyName( p );
				if ( null === k ) {
					gaps.push( gap( 'route', logicId( d, p ), `pages getter entry ${ snippet( d.idx, p, 60 ) } has no static key` ) );
				} else if ( ! keys.includes( k ) ) {
					keys.push( k );
				}
			}
		}
		if ( ! keys.length ) {
			gaps.push( gap( 'route', logicId( d, e.getter ), 'the pages getter returns no object literal whose keys can be read' ) );
		}
		const home = defaultPage( d );
		const classify = ( href, _d, how ) => {
			if ( EXTERNAL.test( href ) ) {
				return { external: true };
			}
			if ( how.partial && ! href.includes( '?' ) ) {
				return { error: 'the hash key is built at run time (static prefix only)' };
			}
			if ( ! href.startsWith( '#' ) ) {
				return { error: 'not a #<key> link; a hash-route export routes only through the pages getter' };
			}
			const key = href.slice( 1 ).replace( /^\//, '' ).split( '?' )[ 0 ];
			const route = '' === key ? home : key;
			return keys.includes( route ) ? { route } : { error: '' === key ? 'empty hash and no default state.page' : `"${ key }" is not a key of the pages getter` };
		};
		const r = collectLinks( exp, classify, { goDraft: d.file } );
		return { routes: keys.map( ( key ) => ( { key, source: `${ d.file } get pages()` } ) ), links: r.links, gaps: [ ...gaps, ...r.gaps ] };
	},
};

// The routes a handler value reaches through a call of the page setter (`names`), following local functions, curried
// helpers and class methods with that call's own arguments bound.
function routesReached( idx, node, names, env = new Map(), depth = 0, seen = new Set() ) {
	const out = { values: [], unresolved: [] };
	const follow = ( fn, args ) => {
		if ( isFn( fn ) && ! seen.has( fn ) && depth < 4 ) {
			const r = routesReached( idx, fn.body, names, new Map( env ).set( fn, args ), depth + 1, new Set( seen ).add( fn ) );
			out.values.push( ...r.values );
			out.unresolved.push( ...r.unresolved );
		}
	};
	if ( 'Identifier' === node.type ) {
		follow( resolveName( idx, node )?.init, [] );
	}
	for ( const n of subtree( idx, node ).filter( ( x ) => 'CallExpression' === x.type ) ) {
		if ( isThisMember( n.callee ) && names.has( n.callee.property.name ) ) {
			const r = evalStr( idx, n.arguments[ 0 ], 0, env );
			out.values.push( ...r.values );
			out.unresolved.push( ...r.unresolved.map( ( u ) => snippet( idx, u ) ) );
		} else if ( 'Identifier' === n.callee.type ) {
			follow( resolveName( idx, n.callee )?.init, n.arguments );
		} else if ( isThisMember( n.callee ) ) {
			const m = classMethod( idx, n.callee.property.name );
			follow( m && ( isFn( m ) ? m : m.value ), n.arguments );
		}
	}
	return out;
}

// Adapter 2: routes are the values the page setter (go(), or a method setting state.page from its parameter) is
// called with; links are the template elements whose handlers reach it.
const statePage = {
	name: 'state-page',
	matches( exp ) {
		const hits = entryEvidence( exp ).filter( ( { e } ) => e.go || e.setters.length );
		return { match: hits.length > 0, evidence: hits.length ? hits.flatMap( ( { d, e } ) => describe( d, e ) ) : [ 'no entry draft has a go() that sets state.page or writes location.hash, or a method that sets state.page from a parameter' ] };
	},
	read( exp ) {
		const routes = new Map();
		const gaps = [];
		const links = [];
		for ( const { d, e } of entryEvidence( exp ).filter( ( x ) => x.e.go || x.e.setters.length ) ) {
			const names = new Set( [ ...( e.go ? [ 'go' ] : [] ), ...e.setters.map( ( s ) => fnBinding( d.idx, s )?.member ).filter( Boolean ) ] );
			defaultPage( d ) && routes.set( defaultPage( d ), `${ d.file } state.page default` );
			for ( const c of d.idx.all.filter( ( n ) => 'CallExpression' === n.type && isThisMember( n.callee ) && names.has( n.callee.property.name ) ) ) {
				const r = evalStr( d.idx, c.arguments[ 0 ] );
				r.values.forEach( ( v ) => routes.has( v ) || routes.set( v, `${ logicId( d, c ) } ${ snippet( d.idx, c, 60 ) }` ) );
				r.unresolved.forEach( ( u ) => gaps.push( gap( 'route', `${ logicId( d, c ) } ${ snippet( d.idx, c, 80 ) }`, `go() argument ${ snippet( d.idx, u ) } is not a static string` ) ) );
			}
			for ( const t of d.tags ) {
				const handlers = t.attrs.filter( ( x ) => /^on[A-Z]/.test( x.name ) );
				let reached = false;
				for ( const a of handlers ) {
					let b = null;
					try {
						b = readBinding( a.value );
					} catch ( err ) {
						gaps.push( gap( 'link', tagId( d, t ), `handler ${ a.value } does not parse: ${ err.message }` ) );
					}
					const key = b?.expr && bindingKey( b.expr );
					const vals = key ? d.idx.all.filter( ( n ) => /^Object(Property|Method)$/.test( n.type ) && keyName( n ) === key ) : [];
					const r = vals.map( ( n ) => routesReached( d.idx, n.value || n, names ) );
					for ( const route of new Set( r.flatMap( ( x ) => x.values ) ) ) {
						reached = true;
						links.push( { from: tagId( d, t ), call: `${ a.name }="${ a.value }"`, route: routes.has( route ) ? route : null } );
					}
					r.flatMap( ( x ) => x.unresolved ).forEach( ( u ) => gaps.push( gap( 'link', tagId( d, t ), `${ a.name }="${ a.value }" calls go() with ${ u }, not a static string` ) ) );
				}
				const href = 'a' === t.name ? attrOf( t, 'href' ) : undefined;
				if ( undefined === href || reached || ! ( '' === href || href.startsWith( '#' ) ) ) {
					continue;
				}
				if ( handlers.length ) {
					// A `#` anchor whose handlers never reach the page setter is an in-page control (menu, modal), not a route link.
					links.push( { from: tagId( d, t ), call: handlers.map( ( x ) => `${ x.name }="${ x.value }"` ).join( ' ' ), route: null, control: true } );
				} else {
					gaps.push( gap( 'link', tagId( d, t ), `href="${ href }" has no handler and no route; its target is unknown` ) );
				}
			}
		}
		const classify = ( href, d, how ) => ( EXTERNAL.test( href ) ? { external: true }
			: ( '' === href || href.startsWith( '#' ) ) && ! how.boundBy && ! how.call && ! how.partial ? { skip: true }
				: { error: 'not a route in a state.page export; routes change only through the page setter' } );
		const r = collectLinks( exp, classify );
		return { routes: [ ...routes ].map( ( [ key, source ] ) => ( { key, source } ) ), links: [ ...links, ...r.links ], gaps: [ ...gaps, ...r.gaps ] };
	},
};

// Adapter 3: one file per page; routes are the page files (entries and href-linked drafts, FR-48A-3), links are
// values ending in .dc.html, with query and fragment kept as `detail`.
const files = {
	name: 'files',
	matches( exp ) {
		const routers = entryEvidence( exp ).filter( ( { e } ) => e.getter || e.hashchange || e.go || e.setters.length );
		const ok = exp.pages.length >= 2 && ! routers.length;
		return { match: ok, evidence: ok ? [ `${ exp.pages.length } page files: ${ exp.pages.join( ', ' ) }` ]
			: [ `${ exp.pages.length } page file(s)`, ...routers.flatMap( ( { d, e } ) => describe( d, e ) ) ] };
	},
	read( exp ) {
		const classify = ( href, d, how ) => {
			if ( EXTERNAL.test( href ) ) {
				return { external: true };
			}
			const cut = href.search( /[?#]/ );
			const detail = cut >= 0 ? href.slice( cut ) : undefined;
			if ( how.partial && cut < 0 ) {
				return { error: 'the file path is built at run time (static prefix only)' };
			}
			if ( href.startsWith( '#' ) ) {
				return exp.pages.includes( d.file ) ? { route: d.file, detail } : { error: `an in-page fragment in ${ d.file }, which is not a page, so its page is not fixed` };
			}
			const p = resolveRef( href, d.file );
			return ! p?.endsWith( '.dc.html' ) ? { error: 'not a .dc.html link' } : exp.pages.includes( p ) ? { route: p, detail } : { error: `${ p } is not a page file of the export` };
		};
		const r = collectLinks( exp, classify );
		return { routes: exp.pages.map( ( key ) => ( { key, source: exp.entries.includes( key ) ? 'MANIFEST.json entry_drafts' : 'linked by href or src' } ) ), links: r.links, gaps: r.gaps };
	},
};

export const ADAPTERS = [ hash, statePage, files ];

// FR-48-26 precedence over a loaded export (loadExport): the one matching adapter. A `pages` getter + hashchange
// listener + a go() that only writes location.hash is the hash adapter (go() is a link helper, its arguments are
// #<key> links); no match, or any other double match, throws naming the adapters and their evidence.
export function pickAdapter( exp ) {
	const results = ADAPTERS.map( ( a ) => ( { a, ...a.matches( exp ) } ) );
	const hits = results.filter( ( r ) => r.match );
	if ( 2 === hits.length && 'hash' === hits[ 0 ].a.name && 'state-page' === hits[ 1 ].a.name ) {
		const ev = entryEvidence( exp );
		if ( ev.some( ( { e } ) => e.getter && e.hashchange && e.goHashOnly ) && ev.every( ( { e } ) => e.setters.every( ( s ) => s === e.go ) ) ) {
			return hits[ 0 ].a;
		}
	}
	if ( 1 === hits.length ) {
		return hits[ 0 ].a;
	}
	const said = results.map( ( r ) => `${ r.a.name }: ${ r.evidence.join( '; ' ) }` ).join( ' | ' );
	throw new Error( hits.length
		? `FR-48-26 routing is ambiguous: ${ hits.map( ( h ) => h.a.name ).join( ' and ' ) } both match (${ said })`
		: `FR-48-26 no routing adapter matches; looked for a pages getter with a hashchange listener, a go()/state.page setter, and several page files with no in-file router (${ said })` );
}

// Routes, links and gap rows for one export folder. A routing that no adapter, or more than one, recognises throws
// with `error.gap` set to its gap row (R-48-3).
export function readRouting( { folder } ) {
	const exp = loadExport( folder );
	let adapter;
	try {
		adapter = pickAdapter( exp );
	} catch ( e ) {
		e.gap = gap( 'routing', exp.entries.join( ', ' ), e.message );
		throw e;
	}
	return { adapter: adapter.name, ...adapter.read( exp ) };
}

// The draft's embedded `<script type="application/json" data-sgs-manifest>` block (FR-48-30): { manifest (parsed, or
// null when absent), gaps }; a malformed block, or more than one, is a gap row.
export function embeddedManifest( draftText, draftId = 'draft' ) {
	const blocks = scanTags( draftText ).filter( ( t ) => 'script' === t.name && t.attrs.some( ( a ) => 'data-sgs-manifest' === a.name.toLowerCase() ) );
	if ( 1 !== blocks.length ) {
		return { manifest: null, gaps: blocks.length ? [ gap( 'embedded-manifest', draftId, `${ blocks.length } data-sgs-manifest blocks; expected one` ) ] : [] };
	}
	const end = draftText.toLowerCase().indexOf( '</script', blocks[ 0 ].end );
	try {
		return { manifest: JSON.parse( draftText.slice( blocks[ 0 ].end, end < 0 ? draftText.length : end ) ), gaps: [] };
	} catch ( e ) {
		return { manifest: null, gaps: [ gap( 'embedded-manifest', draftId, e.message ) ] };
	}
}
