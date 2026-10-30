// The draft side of identification by elimination (Spec 48 §3.4, FR-48-6; plan F1): the facts a draft element and its
// subtree show, one reader per fact, each fact counted only where its reader proves it, at an element that renders at
// 375, 768 or 1440. Every fact carries the elements that show it (its evidence), so the matcher can name them and find the
// smallest element holding a block's facts. The readers:
//   - `renders-role` and `implied-role`: the meaning it carries (lib/skeleton-identity-roles.mjs), never its literal tag: the
//     `role` the draft wrote (`renders-role`, which also ranks), else its tag's implicit role (`implied-role`, which only
//     rules out, as the tag map's scoring already weighs the tag); a generic element and inline formatting carry none; the
//     drawing inside an inline svg is the svg's;
//   - `renders-aria`: the names of its `aria-*` attributes, rendered or bound in the fact record (lib/element-facts.mjs::attrNames);
//   - `platform`: a platform the database names (`block_identity_facts` platform values) in the element's own words, the host
//     of its link, or the label of its image (alt, aria-label, title, file name), matched by lib/brand-registry.mjs's names;
//   - `self-moving` `timer`: the element is a scroll track the draft's script steps on a timer (lib/skeleton-rerun.mjs::carouselKeys);
//     `self-moving` `controls`: its click handler scrolls an element sideways (a previous or next arrow);
//   - `accepts-value`: a typed divider between items (rules.typedDivider) is a value a block's text setting may hold;
//   - `accepts-kind` and `shows-part`: the kind of value an element shows (an emoji, a stroke-drawn icon) and the named part
//     it is (stars, a score, a count, a platform link, an arrow, a dot), read by lib/skeleton-identity-parts.mjs;
//   - `open-state` `exactly-one` and `has-part` `panel`: a tab set, read from the logic's syntax tree: two or more controls whose
//     handlers write one state key, and conditional panels (`sc-if`) whose conditions each compare that key with a different
//     literal, so exactly one panel shows at a time. The fact sits on the smallest element holding the controls and the
//     panels it rendered.
// Elements a structural reading already owns (`owned`: an accordion's holder and items, a loop's holder and cards) keep their
// facts to themselves: the region of an element outside them never counts them, while an owned element's region holds its own. Pure apart from the logic reader passed in.
import { brandNames, brandDomains } from './brand-registry.mjs';
import { specHit } from './skeleton-facts.mjs';
import { templateKey } from './fact-key.mjs';
import { itemField, mapCallback, itemObject, fieldValue } from './skeleton-accordion.mjs';
import { patchProperties, handlerValue } from './skeleton-handler-opens.mjs';
import { stateReads } from './skeleton-narrowing.mjs';
import { keyName, resolveName, subtree, isThisMember, isFn } from './intake-ast.mjs';
import { roleOf } from './skeleton-identity-roles.mjs';
import { makePartReaders } from './skeleton-identity-parts.mjs';

export const RANKING_FACTS = new Set( [ 'renders-role', 'renders-aria', 'open-state', 'self-moving', 'accepts-value', 'accepts-kind', 'has-part', 'platform' ] );
const MAX_DEPTH = 4;
const shown = ( e ) => Object.values( e?.visible || {} ).some( Boolean );
const widthsOf = ( e ) => Object.keys( e?.visible || {} ).filter( ( w ) => true === e.visible[ w ] ).map( Number ).sort( ( a, b ) => a - b );
const words = ( s ) => String( s ?? '' ).toLowerCase().split( /[^\p{L}\p{N}]+/u ).filter( Boolean );

// The state keys an expression reads, followed through the names it uses to their declarations (`curTab === 'desc'` with
// `const curTab = S.pdpTab || 'desc'` reads pdpTab).
export function deepReads( d, node, depth = 0, seen = new Set() ) {
	const out = new Set( node ? stateReads( d, node ) : [] );
	if ( ! node || depth > MAX_DEPTH ) {
		return out;
	}
	for ( const n of subtree( d.idx, node ) ) {
		if ( 'Identifier' !== n.type || seen.has( n ) ) {
			continue;
		}
		seen.add( n );
		const decl = resolveName( d.idx, n );
		'var' === decl?.kind && decl.init && deepReads( d, decl.init, depth + 1, seen ).forEach( ( k ) => out.add( k ) );
	}
	return out;
}

// The literal an equality condition compares with (`x === 'desc'`), through a name to its declaration; undefined otherwise.
export function comparedLiteral( d, node, depth = 0 ) {
	if ( ! node || depth > MAX_DEPTH ) {
		return undefined;
	}
	if ( 'Identifier' === node.type ) {
		const decl = resolveName( d.idx, node );
		return 'var' === decl?.kind ? comparedLiteral( d, decl.init, depth + 1 ) : undefined;
	}
	if ( 'BinaryExpression' !== node.type || ! [ '===', '==' ].includes( node.operator ) ) {
		return undefined;
	}
	const lit = [ node.left, node.right ].find( ( x ) => [ 'StringLiteral', 'NumericLiteral' ].includes( x?.type ) );
	return lit ? lit.value : undefined;
}

// The state keys a handler function writes: its own `this.setState(…)` calls and those of the component methods it calls.
function writtenBy( d, fn ) {
	const out = new Set( patchProperties( d, fn ).map( keyName ).filter( Boolean ) );
	for ( const n of subtree( d.idx, fn ) ) {
		if ( 'CallExpression' === n.type && isThisMember( n.callee ) && 'setState' !== n.callee.property.name ) {
			// Every member of that name (a component may declare a method and a function-valued property alike).
			const name = n.callee.property.name;
			d.idx.all.filter( ( x ) => ( 'ClassMethod' === x.type || ( 'ClassProperty' === x.type && isFn( x.value ) ) ) && keyName( x ) === name )
				.forEach( ( x ) => patchProperties( d, x ).map( keyName ).filter( Boolean ).forEach( ( k ) => out.add( k ) ) );
		}
	}
	return out;
}

// o: { m (the inventory model), read (lib/element-facts.mjs), logicOf( component ), brands (lib/brand-registry.mjs::paletteBrands),
// platforms (the database's platform values), divider (rules.typedDivider), carousels (Set of template keys), owned (Set of
// element keys), keepAll( fact, value ) (whether a fact keeps every element showing it) }. Returns { region( e ) → Map( factKey → { fact, value, at: Set( element key ) } ), tabSets, key, parse }.
export function makeDraftFacts( { m, read, logicOf = () => null, brands = [], platforms = [], divider = null, carousels = new Set(), owned = new Set(), keepAll = () => true, kinds = new Set() } ) {
	const entry = ( e ) => read.view.entry( e )?.template ?? null;
	const records = read.view.elements || {};
	const inSvg = ( e ) => {
		for ( let p = m.byKey[ e.parentKey ]; p; p = m.byKey[ p.parentKey ] ) {
			if ( 'svg' === p.tag ) {
				return true;
			}
		}
		return false;
	};
	// The names each platform goes by (its brand's names and domains, three letters or more, and its aliases).
	const named = platforms.map( ( p ) => {
		const b = brands.find( ( x ) => x.slug === p ) ?? { slug: p, label: p };
		return { platform: p, names: new Set( [ ...brandNames( b ), p ].filter( ( n ) => n.length >= 3 ) ), hosts: new Set( [ ...brandDomains( b ), p ].filter( ( n ) => n.length >= 3 ) ) };
	} );
	const platformsIn = ( e ) => {
		const own = new Set( words( m.words( e ) ) );
		const label = new Set( 'img' === e.tag || 'svg' === e.tag || 'img' === read.attr( e, 'role' ) ? words( [ read.attr( e, 'alt' ), read.attr( e, 'aria-label' ), read.attr( e, 'title' ), e.attrs?.srcBasename ].filter( Boolean ).join( ' ' ) ) : [] );
		let hostLabels = new Set();
		try {
			const href = read.attr( e, 'href' );
			hostLabels = href && /^https?:/i.test( href ) ? new Set( new URL( href ).hostname.toLowerCase().split( '.' ) ) : new Set();
		} catch {
			hostLabels = new Set();
		}
		return named.filter( ( n ) => [ ...n.names ].some( ( w ) => own.has( w ) || label.has( w ) ) || [ ...n.hosts ].some( ( h ) => hostLabels.has( h ) ) ).map( ( n ) => n.platform );
	};
	// Whether the element is a control that moves a track: its click handler scrolls an element sideways (`scrollBy`,
	// `scrollTo`, a `scrollLeft` write), read from the logic's syntax tree.
	const scrolls = new Map();
	const scrollsTrack = ( e ) => {
		const t = entry( e );
		const handler = read.handler( e );
		if ( ! t || ! handler || handler.includes( '.' ) ) {
			return false;
		}
		const id = `${ t.component }\u0000${ handler }`;
		if ( ! scrolls.has( id ) ) {
			const d = logicOf( t.component );
			const fn = d ? handlerValue( d, handler ) : null;
			scrolls.set( id, !! fn && subtree( d.idx, fn ).some( ( n ) => ( 'CallExpression' === n.type && 'MemberExpression' === n.callee?.type && [ 'scrollBy', 'scrollTo' ].includes( n.callee.property?.name ) ) || ( 'AssignmentExpression' === n.type && 'MemberExpression' === n.left?.type && 'scrollLeft' === n.left.property?.name ) ) );
		}
		return scrolls.get( id );
	};
	const parts = makePartReaders( { m, read, platformsIn, scrollsTrack, kinds } );
	const ownFacts = ( e ) => {
		const out = [];
		if ( ! shown( e ) || inSvg( e ) ) {
			return out;
		}
		const role = roleOf( e, { attr: ( x, n ) => {
			const v = read.attr( x, n );
			return null != v && String( v ).includes( '{{' ) && 'role' === n ? null : v;
		}, parentTag: () => m.byKey[ e.parentKey ]?.tag ?? null, ancestorTags: () => chain( e ).slice( 1 ).map( ( a ) => a.tag ) } );
		role && out.push( [ role.explicit ? 'renders-role' : 'implied-role', role.role ] );
		read.attrNames( e ).filter( ( n ) => /^aria-/i.test( n ) ).forEach( ( n ) => out.push( [ 'renders-aria', n.toLowerCase() ] ) );
		platformsIn( e ).forEach( ( p ) => out.push( [ 'platform', p ] ) );
		carousels.has( templateKey( { dc: e.template, tpl: e.tpl } ) ) && out.push( [ 'self-moving', 'timer' ] );
		scrollsTrack( e ) && out.push( [ 'self-moving', 'controls' ] );
		const typed = String( m.words( e ) ?? '' ).trim();
		divider && ! m.blockKids( e ).length && specHit( divider, typed ) && out.push( [ 'accepts-value', typed ] );
		parts.kindsOf( e ).forEach( ( k ) => out.push( [ 'accepts-kind', k ] ) );
		parts.partsOf( e ).forEach( ( p ) => out.push( [ 'shows-part', p ] ) );
		return out;
	};

	// An element and its ancestors, nearest first.
	const chain = ( e ) => {
		const list = [];
		for ( let p = e; p; p = m.byKey[ p.parentKey ] ) {
			list.push( p );
		}
		return list;
	};
	// The tab sets of the surface: controls writing one state key and conditional panels comparing it with distinct literals.
	const tabSets = [];
	const controls = m.els.filter( ( e ) => shown( e ) && read.handler( e ) );
	const byKey = new Map();
	for ( const c of controls ) {
		const t = entry( c );
		const d = t ? logicOf( t.component ) : null;
		if ( ! d ) {
			continue;
		}
		const handler = read.handler( c );
		const loop = t.membership?.scFor?.at( -1 ) ?? null;
		const field = loop ? itemField( handler, loop.as ) : null;
		let fn = null;
		if ( field ) {
			const listPath = ( records[ loop.key ]?.template?.holes ?? [] ).find( ( h ) => 'attr:list' === h.where )?.path;
			const obj = listPath ? itemObject( d, mapCallback( d, d.values.get( listPath ) ) ) : null;
			fn = obj ? fieldValue( d, obj, field ) : null;
		} else if ( ! handler.includes( '.' ) ) {
			fn = handlerValue( d, handler );
		}
		for ( const k of fn ? writtenBy( d, fn ) : [] ) {
			const id = `${ t.component }\u0000${ k }`;
			( byKey.get( id ) ?? byKey.set( id, { component: t.component, key: k, d, controls: [] } ).get( id ) ).controls.push( c );
		}
	}
	for ( const g of byKey.values() ) {
		if ( g.controls.length < 2 ) {
			continue;
		}
		const panels = Object.values( records ).filter( ( rec ) => 'sc-if' === rec.template?.tag && rec.template.component === g.component ).map( ( rec ) => {
			const path = ( rec.template.holes || [] ).find( ( h ) => 'attr:value' === h.where )?.path;
			const node = path && ! path.includes( '.' ) ? g.d.values.get( path ) : null;
			const literal = node ? comparedLiteral( g.d, node ) : undefined;
			return undefined !== literal && deepReads( g.d, node ).has( g.key ) ? { rec, literal } : null;
		} ).filter( Boolean );
		if ( new Set( panels.map( ( p ) => p.literal ) ).size < 2 ) {
			continue;
		}
		const panelKeys = new Set( panels.map( ( p ) => p.rec.template.key ) );
		const inPanel = ( e ) => ( entry( e )?.membership?.scIf || [] ).some( ( s ) => panelKeys.has( s.key ) );
		const rendered = m.els.filter( ( e ) => shown( e ) && inPanel( e ) && ! inPanel( m.byKey[ e.parentKey ] ?? {} ) );
		// The controls switch the panels from outside them: a control inside a panel (a "forgot password" link in a sign-in
		// form) is that panel's own content, and two or more must stand outside.
		const inside = ( c ) => rendered.some( ( p ) => chain( c ).includes( p ) );
		const outside = g.controls.filter( ( c ) => ! inside( c ) );
		if ( ! rendered.length || outside.length < 2 ) {
			continue;
		}
		tabSets.push( { key: g.key, component: g.component, controls: outside, panels: rendered, literals: panels.map( ( p ) => p.literal ) } );
	}
	// The smallest element holding a set of elements.
	const holderOf = ( list ) => {
		if ( ! list.length ) {
			return null;
		}
		const [ first, ...rest ] = list.map( chain );
		return first.find( ( a ) => rest.every( ( c ) => c.includes( a ) ) ) ?? null;
	};
	const placed = new Map();
	for ( const s of tabSets ) {
		const at = holderOf( [ ...s.controls, ...s.panels ] );
		s.holder = at;
		at && ( placed.get( at.key ) ?? placed.set( at.key, [] ).get( at.key ) ).push( s );
	}

	const key = ( fact, value ) => `${ fact }\u0000${ value }`;
	const memo = new Map();
	// A fact's evidence is kept in full where the matcher needs it (`keepAll`: the facts that rank and the platform, whose holder
	// it finds); for the others the first few elements are enough to name.
	const add = ( map, fact, value, at ) => {
		const k = key( fact, value );
		const hit = map.get( k ) ?? map.set( k, { fact, value, at: new Set(), all: keepAll( fact, value ) } ).get( k );
		for ( const x of at ) {
			if ( ! hit.all && hit.at.size >= 3 ) {
				break;
			}
			hit.at.add( x );
		}
	};
	const kidsOf = new Map();
	m.els.forEach( ( c ) => ( kidsOf.get( c.parentKey ) ?? kidsOf.set( c.parentKey, [] ).get( c.parentKey ) ).push( c ) );
	// The facts of an element with its subtree (the elements a structural reading owns keep theirs).
	const region = ( e ) => {
		if ( memo.has( e.key ) ) {
			return memo.get( e.key );
		}
		const out = new Map();
		ownFacts( e ).forEach( ( [ f, v ] ) => add( out, f, v, [ e.key ] ) );
		for ( const s of placed.get( e.key ) || [] ) {
			const at = [ ...s.controls, ...s.panels ].map( ( x ) => x.key );
			add( out, 'open-state', 'exactly-one', at );
			add( out, 'has-part', 'panel', s.panels.map( ( x ) => x.key ) );
		}
		for ( const k of kidsOf.get( e.key ) || [] ) {
			if ( owned.has( k.key ) && ! owned.has( e.key ) ) {
				continue;
			}
			for ( const f of region( k ).values() ) {
				add( out, f.fact, f.value, f.at );
			}
		}
		// A kind of value shown once in each of two or more of the element's child rows (a marker per list row) is a value an
		// item field takes (`[]=<kind>`), as a repeating field holds it.
		for ( const f of [ ...out.values() ].filter( ( x ) => 'accepts-kind' === x.fact && /^\*=/.test( x.value ) ) ) {
			const rows = new Set( [ ...f.at ].map( ( k ) => chain( m.byKey[ k ] ).find( ( a ) => a.parentKey === e.key )?.key ).filter( Boolean ) );
			rows.size >= 2 && add( out, 'accepts-kind', f.value.replace( /^\*=/, '[]=' ), f.at );
		}
		memo.set( e.key, out );
		return out;
	};
	return { region, tabSets, key, holderOf, chain, widthsOf };
}
