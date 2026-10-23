// The CPT surfaces and menus of one Claude Design export for the page map (Spec 48 FR-48-30, §2 Surface manifest):
// header, footer, drawers, mega-menu panels, modals and forms found from the draft code (template element tree plus
// the logic through lib/intake-ast-eval.mjs), and every menu (header, drawer and footer navigation) with each item's
// label, link values, position and parent item. Claude Design's handoff/surfaces.json is a cross-check only
// (FR-48A-7): a surface found by one source alone is still proposed, with a `surfaces-disagree` gap row naming the
// side that lacks it.
import { attrOf, readBinding, classMethod, isFn, propName, subtree, keyName, decodeEntities } from './intake-ast.mjs';
import { ref, resolveRefs, propRefs, elementsOf, evalDeep, oneString, returnsOf } from './intake-ast-eval.mjs';
import { megaPanelTitle } from './page-map-names.mjs';

const VOID = new Set( [ 'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr' ] );

// The template's element tree from a loaded draft (lib/intake-ast.mjs::loadDraft): each start tag of `d.tags` gains
// `parent`, `children` and `close` (the index of its end tag, or its parent's when it has none). End tags inside
// comments are ignored; void and self-closing elements have no children.
export function elementTree( d ) {
	const { text } = d;
	const from = d.cut.templateStart;
	const to = d.cut.templateEnd;
	const comments = [ ...text.slice( from, to ).matchAll( /<!--[\s\S]*?-->/g ) ].map( ( m ) => [ from + m.index, from + m.index + m[ 0 ].length ] );
	const ends = [ ...text.slice( from, to ).matchAll( /<\/([A-Za-z][A-Za-z0-9_:.-]*)\s*>/g ) ]
		.map( ( m ) => ( { isEnd: true, name: m[ 1 ].toLowerCase(), index: from + m.index } ) )
		.filter( ( e ) => ! comments.some( ( [ a, b ] ) => e.index >= a && e.index < b ) );
	const root = { name: '#root', attrs: [], children: [], index: from, end: from, close: to, parent: null };
	const nodes = d.tags.map( ( t ) => ( { ...t, children: [], parent: null, close: null } ) );
	const events = [ ...nodes, ...ends ].sort( ( a, b ) => a.index - b.index );
	const stack = [ root ];
	for ( const e of events ) {
		const top = stack[ stack.length - 1 ];
		if ( ! e.isEnd ) {
			e.parent = top;
			top.children.push( e );
			if ( ! VOID.has( e.name ) && '/' !== text[ e.end - 2 ] ) {
				stack.push( e );
			} else {
				e.close = e.end;
			}
			continue;
		}
		const at = stack.map( ( s ) => s.name ).lastIndexOf( e.name );
		if ( at > 0 ) {
			for ( const open of stack.splice( at ) ) {
				open.close = e.index;
			}
		}
	}
	for ( const open of stack.splice( 1 ) ) {
		open.close = to;
	}
	return { root, nodes, text };
}

// The visible text inside an element (tags and `{{ }}` holes removed, entities decoded, whitespace collapsed).
export function innerText( text, node ) {
	return decodeEntities( text.slice( node.end, node.close ?? node.end ).replace( /<[^>]*>/g, ' ' ).replace( /\{\{[\s\S]*?\}\}/g, ' ' ) ).replace( /\s+/g, ' ' ).trim();
}

// Every descendant of a tree node, in document order.
export const descendants = ( node ) => node.children.flatMap( ( c ) => [ c, ...descendants( c ) ] );

// The ancestors of a tree node, nearest first (the root excluded).
export function ancestors( node ) {
	const out = [];
	for ( let up = node.parent; up && '#root' !== up.name; up = up.parent ) {
		out.push( up );
	}
	return out;
}

export const KIND_POST_TYPE = { header: 'sgs_header', footer: 'sgs_footer', drawer: 'sgs_drawer', menu: 'sgs_mega_menu', modal: 'sgs_modal', form: 'sgs_form', 'choice-flow': 'sgs_choice_flow', 'choice flow': 'sgs_choice_flow', quiz: 'sgs_choice_flow' };
const LABEL_KEYS = [ 'label', 'title', 'name', 'text' ];
const TARGET_KEYS = [ 'href', 'link', 'url', 'to' ];
const FIELDS = new Set( [ 'input', 'select', 'textarea' ] );
const SECTIONING = new Set( [ 'main', 'article', 'section', 'aside', 'dialog', 'header', 'footer' ] );

export const stem = ( file ) => file.split( '/' ).pop().replace( /\.dc\.html$/, '' );
export const kebab = ( s ) => String( s ).replace( /\.dc\.html$/, '' ).replace( /([a-z0-9])([A-Z])/g, '$1-$2' ).toLowerCase().replace( /[^a-z0-9]+/g, '-' ).replace( /^-+|-+$/g, '' );
const tagId = ( d, t ) => `${ d.file }:${ t.line }:${ t.col } <${ t.name }${ attrOf( t, 'aria-label' ) ? ` aria-label="${ attrOf( t, 'aria-label' ) }"` : '' }>`;
const style = ( t ) => ( attrOf( t, 'style' ) || '' ).replace( /\s+/g, '' ).toLowerCase();
const bindingOf = ( value ) => {
	try {
		return value ? readBinding( value ) : null;
	} catch {
		return null;
	}
};

// The refs a template binding expression holds: a name bound by an enclosing sc-for (`scope`), else a key of the
// object renderVals returns; dotted paths follow propRefs.
function bindingRefs( d, expr, scope, roots ) {
	if ( 'Identifier' === expr?.type ) {
		return scope.has( expr.name ) ? [ scope.get( expr.name ) ] : propRefs( d.idx, roots, expr.name );
	}
	if ( 'MemberExpression' === expr?.type && ! expr.computed ) {
		return propRefs( d.idx, bindingRefs( d, expr.object, scope, roots ), expr.property.name );
	}
	return [];
}

// What renderVals returns (the template's root data); empty when the draft has no renderVals.
function rootRefs( d ) {
	const m = d.idx && classMethod( d.idx, 'renderVals' );
	const fn = m && ( isFn( m ) ? m : m.value );
	return fn ? returnsOf( d.idx, fn ).flatMap( ( e ) => resolveRefs( d.idx, ref( e ) ) ) : [];
}

// The link values an element reaches: a static or bound href, else the string arguments of the calls its onClick
// handler makes (go(href), location.assign(href), …).
function targetsOf( d, t, scope, roots ) {
	const href = attrOf( t, 'href' );
	const handler = attrOf( t, 'onClick' );
	if ( undefined !== href && ! ( handler && ( '' === href || '#' === href ) ) ) {
		const b = bindingOf( href );
		if ( ! b ) {
			return [ href ];
		}
		return b.expr ? bindingRefs( d, b.expr, scope, roots ).flatMap( ( r ) => evalDeep( d.idx, r.node, r.env ).values ) : [];
	}
	const click = bindingOf( handler );
	if ( ! click?.expr || ! d.idx ) {
		return [];
	}
	return bindingRefs( d, click.expr, scope, roots ).filter( ( r ) => isFn( r.node ) ).flatMap( ( r ) => subtree( d.idx, r.node.body )
		.filter( ( n ) => 'CallExpression' === n.type && n.arguments[ 0 ] && 'setState' !== propName( n.callee ) )
		.flatMap( ( n ) => evalDeep( d.idx, n.arguments[ 0 ], r.env ).values ) );
}

// One item's label: the element data's label/title/name/text, else the anchor's aria-label or text.
function labelOf( d, el, anchor, text ) {
	for ( const k of LABEL_KEYS ) {
		const v = el && propRefs( d.idx, [ el ], k ).map( ( r ) => oneString( d.idx, r.node, r.env ) ).find( Boolean );
		if ( v ) {
			return v;
		}
	}
	return anchor ? attrOf( anchor, 'aria-label' ) || innerText( text, anchor ) : '';
}

// The items of a menu scope in document order: each sc-for's elements, with nested sc-for lists over the item
// (`item.links`) as children, and, inside a <nav> (`mode` 'nav'), its static anchors. `mode` 'list' reads one
// nested list.
function readItems( d, tree, node, scope, roots, mode ) {
	const inList = 'list' === mode;
	const items = [];
	for ( const c of node.children ) {
		if ( 'sc-for' === c.name ) {
			const b = bindingOf( attrOf( c, 'list' ) );
			const as = attrOf( c, 'as' ) || 'item';
			const els = b?.expr ? bindingRefs( d, b.expr, scope, roots ).flatMap( ( r ) => elementsOf( d.idx, r ) ) : [];
			for ( const el of els ) {
				const inner = new Map( scope ).set( as, el );
				const anchor = descendants( c ).find( ( x ) => 'a' === x.name || attrOf( x, 'onClick' ) );
				const nested = descendants( c ).filter( ( x ) => 'sc-for' === x.name && attrOf( x, 'list' )?.replace( /\s/g, '' ).startsWith( `{{${ as }.` )
					&& ! ancestors( x ).some( ( up ) => 'sc-for' === up.name && up !== c && descendants( c ).includes( up ) ) );
				const children = nested.flatMap( ( n ) => readItems( d, tree, { children: [ n ] }, inner, roots, 'list' ) );
				const targets = anchor ? targetsOf( d, anchor, inner, roots ) : [];
				const label = labelOf( d, el, anchor, tree.text );
				if ( label && ( targets.length || children.length ) ) {
					items.push( { label, targets: [ ...new Set( targets ) ], children } );
				}
			}
		} else if ( 'a' === c.name && 'nav' === mode ) {
			const targets = targetsOf( d, c, scope, roots );
			if ( targets.length ) {
				items.push( { label: attrOf( c, 'aria-label' ) || innerText( tree.text, c ), targets, children: [] } );
			}
		} else if ( 'a' !== c.name ) {
			items.push( ...readItems( d, tree, c, scope, roots, mode ) );
		}
	}
	return items;
}

const numbered = ( items, parentItem = null ) => items.map( ( it, i ) => ( { ...it, position: i + 1, parentItem, children: numbered( it.children, it.label ) } ) );

// Is this element an overlay (dialog, aria-modal, or a fixed panel holding a nav), and which kind: a drawer is a
// full-height side panel or holds a nav; any other overlay is a modal.
function overlayKind( t ) {
	const s = style( t );
	const dialog = 'dialog' === t.name || 'dialog' === attrOf( t, 'role' ) || 'true' === attrOf( t, 'aria-modal' );
	const hasNav = descendants( t ).some( ( x ) => 'nav' === x.name );
	if ( ! dialog && ! ( s.includes( 'position:fixed' ) && ( hasNav || 'aside' === t.name ) ) ) {
		return null;
	}
	const side = /height:100(%|vh|dvh)/.test( s ) || ( s.includes( 'top:0' ) && s.includes( 'bottom:0' ) && /(left|right):0/.test( s ) );
	return hasNav || side ? 'drawer' : 'modal';
}

// The regions of one draft: site headers and footers (not inside a sectioning element) and outermost overlays.
function regions( tree ) {
	const out = [];
	for ( const t of tree.nodes ) {
		const ups = ancestors( t );
		if ( ups.some( ( u ) => out.some( ( r ) => r.node === u && 'header' !== r.kind ) ) ) {
			continue;
		}
		if ( ( 'header' === t.name || 'footer' === t.name ) && ! ups.some( ( u ) => SECTIONING.has( u.name ) || overlayKind( u ) ) ) {
			out.push( { kind: t.name, node: t } );
		} else if ( overlayKind( t ) ) {
			out.push( { kind: overlayKind( t ), node: t } );
		}
	}
	return out;
}

// Forms in one draft: an inline <form> inside an sc-for whose field list is a key of the loop item is one form per
// item that holds that key (read through the data, so items a filter drops are not forms); any other <form> is one
// form named by its submit handler or label.
function inlineForms( d, tree, roots, routeOf, pageFile ) {
	const out = [];
	for ( const f of tree.nodes.filter( ( t ) => 'form' === t.name ) ) {
		const loop = ancestors( f ).find( ( u ) => 'sc-for' === u.name );
		const as = loop && ( attrOf( loop, 'as' ) || 'item' );
		const list = as && descendants( f ).map( ( x ) => attrOf( x, 'list' ) ).find( ( v ) => v?.replace( /\s/g, '' ).startsWith( `{{${ as }.` ) );
		const key = list && /\{\{\s*[\w$]+\.([\w$]+)/.exec( list )?.[ 1 ];
		const loopList = key && bindingOf( attrOf( loop, 'list' ) );
		const arrays = new Set( loopList?.expr ? bindingRefs( d, loopList.expr, new Map(), roots ).flatMap( ( r ) => elementsOf( d.idx, r ) )
			.flatMap( ( el ) => propRefs( d.idx, [ el ], key ) ).map( ( r ) => r.node ).filter( ( n ) => 'ArrayExpression' === n?.type ) : [] );
		for ( const arr of arrays ) {
			const h = d.idx.parent.get( d.idx.parent.get( arr ) );
			const route = routeOf( d, h );
			const title = [ 'formTitle', 'title', 'name' ].map( ( k ) => propRefs( d.idx, [ ref( h ) ], k ).map( ( r ) => oneString( d.idx, r.node, r.env ) ).find( Boolean ) ).find( Boolean );
			out.push( { kind: 'form', label: route || title || 'form', title: title || route, route, dc: stem( d.file ), draftId: `${ d.file }:${ d.idx.line( h ) } (logic) ${ key }`, node: f } );
		}
		if ( ! arrays.size ) {
			const submit = bindingOf( attrOf( f, 'onSubmit' ) );
			const label = attrOf( f, 'aria-label' ) || ( submit?.expr && ( submit.expr.property?.name || submit.expr.name ) ) || stem( d.file );
			out.push( { kind: 'form', label, title: label, route: pageFile, dc: stem( d.file ), draftId: tagId( d, f ), node: f } );
		}
	}
	return out;
}

// The route key whose page holds a template node: the draft's own file when that file is a route, else the first route
// key named in the logic of an sc-if gate above the node's <main> (isPage('checkout'), S.page === 'signin'), read from
// every object property the gate's name binds; null for a node outside every page (site-wide chrome and overlays).
function pageOf( d, node, roots, routeKeys ) {
	if ( routeKeys.has( d.file ) ) {
		return d.file;
	}
	const main = [ node, ...ancestors( node ) ].find( ( u ) => 'main' === u.name );
	for ( const gate of main && d.idx ? ancestors( main ).filter( ( u ) => 'sc-if' === u.name ) : [] ) {
		const name = bindingOf( attrOf( gate, 'value' ) )?.expr?.name;
		const props = name ? d.idx.all.filter( ( n ) => 'ObjectProperty' === n.type && keyName( n ) === name ) : [];
		const hit = props.flatMap( ( n ) => subtree( d.idx, n.value ) ).find( ( n ) => 'StringLiteral' === n.type && routeKeys.has( n.value ) );
		if ( hit ) {
			return hit.value;
		}
	}
	return null;
}

// The pick lists inside an element: each sc-for whose items hold a control whose click handler is the loop item's own
// member (`onClick="{{ o.pick }}"`), so a click chooses that item.
function pickLists( node ) {
	return descendants( node ).filter( ( c ) => 'sc-for' === c.name && descendants( c ).some( ( x ) => new RegExp( `^\\{\\{\\s*${ attrOf( c, 'as' ) || 'item' }\\.[\\w$]+\\s*\\}\\}$` ).test( attrOf( x, 'onClick' ) || '' ) ) );
}

// A choice flow (Spec 48 FR-48-30): choices that build one selection, shown as two or more pick lists in an element
// that holds no <form>. A form submits typed answers and stays a form, whatever pick lists it shows.
export const isChoiceFlow = ( node ) => 'form' !== node.name && pickLists( node ).length >= 2 && ! descendants( node ).some( ( x ) => 'form' === x.name );

// The mega-menu panels of a panel element that drops below the header: one per outermost sc-if gate it holds (each
// item opens its own panel), named in order by the header controls that open a panel on focus; one panel when it
// gates fewer than two.
function megaPanels( d, header, panel ) {
	const inside = descendants( panel );
	const inner = inside.filter( ( x ) => 'sc-if' === x.name && ! ancestors( x ).some( ( u ) => 'sc-if' === u.name && inside.includes( u ) ) );
	const openers = descendants( header ).filter( ( x ) => attrOf( x, 'onFocus' ) && x !== panel && ! inside.includes( x ) );
	if ( inner.length < 2 ) {
		return [ { label: attrOf( panel, 'aria-label' ) || 'Mega menu', node: panel } ];
	}
	return inner.map( ( g, i ) => ( { label: inner.length === openers.length ? attrOf( openers[ i ], 'aria-label' ) || innerText( d.text, openers[ i ] ) : `Mega menu ${ i + 1 }`, node: g } ) );
}

// Every surface and menu the draft code shows. `routeOf( draft, node )` names the route whose page data holds a
// logic node (or null); `routeKeys` are the routing's route keys. Each surface carries `page` (the route key whose page
// holds it, null when site-wide); a page section holding a choice flow is a `choice-flow` surface, and so is a modal
// overlay that is one. `accountPages` are the route keys whose pages hold a password field.
export function codeSurfaces( exp, routeOf = () => null, routeKeys = new Set() ) {
	const accountPages = new Set();
	const surfaces = [];
	const menus = [];
	const ok = exp.drafts.filter( ( d ) => ! d.error );
	const formComponents = new Set();
	const pageAt = new Map();
	for ( const d of ok ) {
		const tree = elementTree( d );
		const component = exp.mounted.has( d.file );
		const roots = d.idx ? rootRefs( d ) : [];
		const chrome = tree.nodes.some( ( t ) => /^(nav|header|footer)$/.test( t.name ) );
		const page = ( node ) => pageOf( d, node, roots, routeKeys );
		tree.nodes.forEach( ( t ) => pageAt.set( `${ d.file }:${ t.line }:${ t.col }`, () => page( t ) ) );
		tree.nodes.filter( ( t ) => 'input' === t.name && 'password' === attrOf( t, 'type' ) ).forEach( ( t ) => accountPages.add( page( t ) ) );
		if ( component && ( tree.nodes.some( ( t ) => 'form' === t.name ) || ( ! chrome && tree.nodes.filter( ( t ) => FIELDS.has( t.name ) ).length >= 2 ) ) ) {
			formComponents.add( d.file );
			surfaces.push( { kind: 'form', page: null, label: stem( d.file ), title: stem( d.file ).replace( /([a-z])([A-Z])/g, '$1 $2' ), route: null, dc: stem( d.file ), draftId: `${ d.file } (dc-import)` } );
		} else {
			surfaces.push( ...inlineForms( d, tree, roots, routeOf, exp.pages.length > 1 && exp.pages.includes( d.file ) ? d.file : null ).map( ( f ) => ( { ...f, page: page( f.node ) } ) ) );
		}
		const found = regions( tree );
		const flows = tree.nodes.filter( ( t ) => 'section' === t.name && isChoiceFlow( t ) && ! [ t, ...ancestors( t ) ].some( ( u ) => found.some( ( r ) => r.node === u ) )
			&& ! ancestors( t ).some( ( u ) => 'section' === u.name && isChoiceFlow( u ) ) );
		for ( const t of flows ) {
			const label = attrOf( t, 'aria-label' ) || innerText( d.text, descendants( t ).find( ( x ) => /^h[1-6]$/.test( x.name ) ) || t ).slice( 0, 60 );
			surfaces.push( { kind: 'choice-flow', label, title: label, route: null, page: page( t ), dc: stem( d.file ), draftId: tagId( d, t ), node: t } );
		}
		const named = ( kind ) => found.filter( ( r ) => r.kind === kind );
		for ( const r of found ) {
			const label = attrOf( r.node, 'aria-label' ) || `${ r.kind[ 0 ].toUpperCase() }${ r.kind.slice( 1 ) }`;
			const kind = 'modal' === r.kind && isChoiceFlow( r.node ) ? 'choice-flow' : r.kind;
			surfaces.push( { kind, label, title: label, route: null, page: page( r.node ), nav: descendants( r.node ).some( ( x ) => 'nav' === x.name ), dc: stem( d.file ), draftId: tagId( d, r.node ), node: r.node } );
			if ( 'modal' === r.kind || ! d.idx && ! descendants( r.node ).some( ( x ) => 'a' === x.name ) ) {
				continue;
			}
			const navs = descendants( r.node ).filter( ( x ) => 'nav' === x.name && ! ancestors( x ).some( ( u ) => 'nav' === u.name ) );
			const scopes = navs.length ? navs : [ r.node ];
			scopes.forEach( ( s, i ) => {
				const items = numbered( readItems( d, tree, s, new Map(), roots, 'nav' === s.name ? 'nav' : 'region' ) );
				const many = scopes.length > 1 || named( r.kind ).length > 1;
				const name = many ? `${ r.kind }-${ kebab( attrOf( s, 'aria-label' ) || '' ) || i + 1 }` : r.kind;
				if ( items.length ) {
					menus.push( { menu: menus.some( ( m ) => m.menu === name ) ? `${ name }-${ i + 1 }` : name, region: r.kind, draftId: tagId( d, s ), items } );
				}
			} );
		}
		// Mega-menu panels: header items whose children show in a header or drawer menu; else a panel element that
		// drops below the header (absolute, top:100%).
		const headerMenus = menus.filter( ( m ) => 'header' === m.region && m.draftId.startsWith( `${ d.file }:` ) );
		const withKids = ( label ) => menus.some( ( m ) => ( 'drawer' === m.region || 'header' === m.region ) && m.items.some( ( it ) => it.label === label && it.children.length ) );
		const panels = headerMenus.flatMap( ( m ) => m.items.filter( ( it ) => withKids( it.label ) ).map( ( it ) => ( { it, m } ) ) );
		for ( const { it, m } of panels ) {
			surfaces.push( { kind: 'menu', label: it.label, title: megaPanelTitle( it.label ), route: null, dc: stem( d.file ), draftId: `${ m.draftId } item ${ it.position }`, menuItem: { menu: m.menu, position: it.position } } );
		}
		if ( ! panels.length ) {
			for ( const h of named( 'header' ) ) {
				for ( const p of descendants( h.node ).filter( ( x ) => /position:absolute/.test( style( x ) ) && /top:100%/.test( style( x ) ) ) ) {
					for ( const m of megaPanels( d, h.node, p ) ) {
						surfaces.push( { kind: 'menu', label: m.label, title: megaPanelTitle( m.label ), route: null, page: null, dc: stem( d.file ), draftId: tagId( d, m.node ) } );
					}
				}
			}
		}
	}
	// A form inside a choice flow is a step of that flow.
	const flowNodes = surfaces.filter( ( x ) => 'choice-flow' === x.kind && x.node ).map( ( x ) => x.node );
	const kept = surfaces.filter( ( x ) => ! ( 'form' === x.kind && x.node && ancestors( x.node ).some( ( u ) => flowNodes.includes( u ) ) ) );
	// `pageOfTag( draftId )`: the page holding the element a `file:line:col` id names (a logic id: its file when a route).
	const pageOfTag = ( id ) => pageAt.get( /^(.+?:\d+:\d+)/.exec( id )?.[ 1 ] )?.() ?? ( routeKeys.has( id.split( ':' )[ 0 ] ) ? id.split( ':' )[ 0 ] : null );
	return { surfaces: kept.map( ( { node, ...s } ) => s ), menus, formComponents, accountPages, pageOfTag };
}

const WORDS = ( s ) => new Set( kebab( s ).split( /[^a-z0-9]+/ ).filter( ( w ) => w.length > 2 && ! [ 'menu', 'mega', 'form', 'drawer', 'modal', 'the', 'and', 'inline', 'site' ].includes( w ) ) );
const normRoute = ( r ) => ( r ? String( r ).replace( /^\/+/, '' ).replace( /\.dc\.html.*$/, '' ).toLowerCase() : null );

// Cross-checks the code's surfaces with handoff/surfaces.json records (FR-48A-7): { surfaces (code surfaces, then
// hint-only ones), gaps (one `surfaces-disagree` row per surface one side lacks) }. Only the kinds that become CPT
// posts take part; a hint record names its kind, `name`, `dc` and `route`.
export function crossCheck( code, hint ) {
	const records = ( hint?.records || [] ).filter( ( h ) => KIND_POST_TYPE[ String( h.kind ).toLowerCase() ] )
		.map( ( h ) => ( { ...h, kind: [ 'choice flow', 'quiz' ].includes( String( h.kind ).toLowerCase() ) ? 'choice-flow' : String( h.kind ).toLowerCase() } ) );
	if ( ! hint ) {
		return { surfaces: code, gaps: [] };
	}
	const used = new Set();
	const gaps = [];
	const out = [];
	for ( const c of code ) {
		const same = records.filter( ( h ) => ! used.has( h ) && h.kind === c.kind && ( ! h.dc || h.dc === c.dc ) );
		const peers = code.filter( ( x ) => x.kind === c.kind && x.dc === c.dc );
		const score = ( h ) => ( normRoute( h.route ) && normRoute( h.route ) === normRoute( c.route ) ? 3 : 0 )
			+ ( [ ...WORDS( c.label ) ].some( ( w ) => WORDS( h.name ).has( w ) ) ? 2 : 0 ) + ( h.dc === c.dc ? 1 : 0 );
		const best = same.map( ( h ) => ( { h, s: score( h ) } ) ).sort( ( a, b ) => b.s - a.s )[ 0 ];
		const match = best && ( best.s >= 2 || ( 1 === same.length && 1 === peers.length ) ) ? best.h : null;
		if ( match ) {
			used.add( match );
		}
		out.push( match ? { ...c, hint: match.id } : c );
	}
	// Leftovers of one kind in one draft pair in document order when both sides have the same number.
	for ( const c of out.filter( ( x ) => ! x.hint ) ) {
		const mine = out.filter( ( x ) => ! x.hint && x.kind === c.kind && x.dc === c.dc );
		const theirs = records.filter( ( h ) => ! used.has( h ) && h.kind === c.kind && h.dc === c.dc );
		if ( mine.length === theirs.length && mine.length ) {
			mine.forEach( ( x, i ) => {
				x.hint = theirs[ i ].id;
				used.add( theirs[ i ] );
			} );
		}
	}
	for ( const c of out.filter( ( x ) => ! x.hint ) ) {
		gaps.push( { construct: 'surfaces-disagree', draftId: c.draftId, error: `${ KIND_POST_TYPE[ c.kind ] } "${ c.label }" is in the draft code; handoff/surfaces.json has no ${ c.kind } record for it` } );
	}
	for ( const h of records.filter( ( r ) => ! used.has( r ) ) ) {
		out.push( { kind: h.kind, label: h.name, title: h.name, route: normRoute( h.route ) && '*' !== h.route ? normRoute( h.route ) : null, dc: h.dc || null, draftId: `surfaces.json ${ h.id }`, hint: h.id } );
		gaps.push( { construct: 'surfaces-disagree', draftId: `surfaces.json ${ h.id }`, error: `surfaces.json ${ h.id } ${ h.kind } "${ h.name }" (${ h.dc || 'no dc' }) has no matching surface in the draft code` } );
	}
	return { surfaces: out, gaps };
}
