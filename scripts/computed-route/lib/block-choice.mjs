// Which block the route chose for each draft section, against the block a person chose when building the same page by
// hand (tools/block-choice.mjs). Pure functions: the tool reads the files and the framework database and passes in
// `facts`, an object with three lookups:
//   category( name )      the block's category in the framework database (`blocks.category`), or null
//   contentAttrs( name )  the attribute names the database classes as content-bearing (`roles.classification`), or null
//   modeAttrs( name )     a Map of the block's mode attributes (role enum-mode, or the block's `variant_attr`) to their defaults
//
// Both sides become the same node shape: { side, name, attrs, own (the words the block itself prints, a Set of tokens),
// kids, key (route: `<surface>:<draft key>`), rule and reason (route: the proposal row's), ref (hand-built: its
// `cr-ref-…` class, meaning the route wrote the block and the person kept it) }.
//
// Alignment is by words, never by position: a token is a lower-cased run of letters or digits of two or more characters,
// less a short list of function words. Two token sets ALIGN when they share at least ALIGN.minShared tokens and the shared
// tokens are at least ALIGN.overlap of the smaller set, or when both sets hold one or two tokens and are equal.
//
// A surface is compared in four steps:
//   1. sections: the children of the first node, from the top, with more than one child (sectionsOf);
//   2. units: on each side the highest blocks that are not wrappers (a wrapper is a block of the layout category that
//      prints no words of its own and holds blocks, isWrapper), each with the words of its whole subtree;
//   3. components: units linked when their words align and their sections' words align, joined into connected
//      groups; a unit left over joins the group most of its wrapper siblings are in; units still left over and with
//      the same block name on both sides in linked sections pair in order (wordless pictures, a menu whose items live
//      elsewhere);
//   4. classes (classify): see CLASSES.
export const ALIGN = { overlap: 0.5, minShared: 2 };

export const CLASSES = {
	same: 'the same block on both sides',
	'route-written': 'the same block, and the hand-built one carries the route reference class (the route wrote it and it was kept)',
	mode: 'the same block in another mode (an enum-mode or variant setting differs)',
	container: 'the same block, with a wrapper of its own on one side only',
	'other-block': 'a different block for the same draft content, one against one',
	'several-to-one': 'more route blocks than hand-built blocks for the same content (eight texts against one trust bar)',
	'one-to-several': 'fewer route blocks than hand-built blocks for the same content (one flow against a heading, a text and a buy box)',
	'owner-addition': 'a hand-built block whose words the draft does not hold',
	'route-unaligned': 'a route block no hand-built block aligns with',
	'owner-unaligned': 'a hand-built block no route block aligns with, whose words the draft holds or which prints none',
};

// The classes that are a different block choice, ranked by the draft looks under the route's blocks.
export const WRONG_CHOICE = new Set( [ 'other-block', 'several-to-one', 'one-to-several' ] );

const STOP = new Set( [ 'the', 'and', 'of', 'to', 'in', 'for', 'on', 'at', 'by', 'or', 'is', 'it', 'an', 'as', 'be', 'we', 'you', 'your', 'our', 'my', 'me', 'with', 'from', 'this', 'that', 'are', 'all' ] );

// The token set of a text.
export function tokens( text ) {
	const out = new Set();
	for ( const m of String( text ?? '' ).toLowerCase().matchAll( /[\p{L}\p{N}]+/gu ) ) {
		if ( m[ 0 ].length >= 2 && ! STOP.has( m[ 0 ] ) ) {
			out.add( m[ 0 ] );
		}
	}
	return out;
}

// Whether two token sets align (see ALIGN), and how strongly: { shared, score }.
export function alignScore( a, b ) {
	let shared = 0;
	for ( const t of a ) {
		if ( b.has( t ) ) {
			shared++;
		}
	}
	const small = Math.min( a.size, b.size );
	const score = small ? shared / small : 0;
	const tiny = a.size <= 2 && b.size <= 2 && a.size === b.size && shared === a.size && shared > 0;
	return { shared, score, aligned: tiny || ( shared >= ALIGN.minShared && score >= ALIGN.overlap ) };
}

// A key whose string value is markup, style, an address or an identifier, never printed words.
const NOT_WORDS_KEY = /svg|css|class|anchor|colou?r|url|href|src|link|^id$|Id$|key|slug|icon|preset|easing|font|unit|token|meta$|date$|alt$/i;
// A string that is a CSS value, a number or an address, never printed words.
const NOT_WORDS_VALUE = /^\s*$|^[\d.\s/-]+(px|em|rem|%|vh|vw|fr|s|ms)?\s*$|var\(|calc\(|minmax|repeat\(|^#[0-9a-f]{3,8}$|rgba?\(|^https?:|^\//;
// Inside an item (an array or object value) a single lower-case word or a hyphenated slug is a setting value
// (`filled`, `icon-bare`); an attribute the database classes as content keeps it (a heading of `shop`).
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Every printed string under an attribute value (arrays and objects walked, keys of markup and style skipped).
function wordsIn( value, key = '', out = [], nested = false ) {
	if ( 'string' === typeof value ) {
		if ( ! NOT_WORDS_KEY.test( key ) && ! NOT_WORDS_VALUE.test( value ) && ! ( nested && SLUG.test( value ) ) ) {
			out.push( value.replace( /<[^>]+>/g, ' ' ) );
		}
	} else if ( Array.isArray( value ) ) {
		value.forEach( ( v ) => wordsIn( v, key, out, true ) );
	} else if ( value && 'object' === typeof value ) {
		for ( const [ k, v ] of Object.entries( value ) ) {
			wordsIn( v, k, out, true );
		}
	}
	return out;
}

// The printed strings of a block's attributes: its content-bearing attributes when the database lists them, else every
// attribute with a slug value read as a setting. Alternative text is never printed, so it is never words.
export function attributeWords( name, attrs, facts ) {
	const content = facts.contentAttrs( name );
	const out = [];
	for ( const [ k, v ] of Object.entries( attrs ?? {} ) ) {
		if ( ( ! content || content.has( k ) ) && ! /alt$/i.test( k ) ) {
			wordsIn( v, k, out, ! content );
		}
	}
	return out;
}

// Block markup (`<!-- wp:ns/name {json} -->` … `<!-- /wp:ns/name -->`, or self-closing `/-->`) as a block tree:
// [ { name, attrs, html, innerBlocks } ], `html` the markup's text directly inside the block (not inside its children).
export function parseBlockMarkup( text ) {
	const roots = [];
	const stack = [];
	const re = /<!--\s+(\/)?wp:([a-z0-9-]+(?:\/[a-z0-9-]+)?)\s*(\{[\s\S]*?\})?\s*(\/)?-->/g;
	let last = 0;
	let m;
	const addText = ( s ) => {
		if ( stack.length ) {
			stack[ stack.length - 1 ].html += s;
		}
	};
	while ( ( m = re.exec( text ) ) ) {
		addText( text.slice( last, m.index ) );
		last = re.lastIndex;
		const name = m[ 2 ].includes( '/' ) ? m[ 2 ] : `core/${ m[ 2 ] }`;
		if ( m[ 1 ] ) {
			stack.pop();
			continue;
		}
		let attrs = {};
		try {
			attrs = m[ 3 ] ? JSON.parse( m[ 3 ] ) : {};
		} catch {
			attrs = {};
		}
		const node = { name, attrs, html: '', innerBlocks: [] };
		( stack.length ? stack[ stack.length - 1 ].innerBlocks : roots ).push( node );
		if ( ! m[ 4 ] ) {
			stack.push( node );
		}
	}
	return roots;
}

// A saved-blocks file's sections: each starts with a line `@@@ <what>`; [ { head, blocks } ].
export function parseSavedSections( text ) {
	return String( text ).split( /^@@@ /m ).filter( ( p ) => p.trim() ).map( ( p ) => {
		const nl = p.indexOf( '\n' );
		return { head: p.slice( 0, nl < 0 ? p.length : nl ).trim(), blocks: parseBlockMarkup( nl < 0 ? '' : p.slice( nl + 1 ) ) };
	} );
}

// The hand-built side as nodes.
export function ownerTree( blocks, facts ) {
	const conv = ( b ) => {
		const own = tokens( [ ...attributeWords( b.name, b.attrs, facts ), b.html.replace( /<[^>]+>/g, ' ' ) ].join( ' ' ) );
		const ref = /cr-ref-[\w-]+/.exec( String( b.attrs?.className ?? '' ) )?.[ 0 ] ?? null;
		return { side: 'owner', name: b.name, attrs: b.attrs ?? {}, own, ref, kids: ( b.innerBlocks ?? [] ).map( conv ) };
	};
	return blocks.map( conv );
}

// The route side as nodes: a skeleton tree with its surface's inventory elements and proposal rows. A node's own words
// are its draft element's text less the text of its child nodes' draft elements, plus its attributes' printed words.
// `linked( attrs )` may return another surface's nodes to hold as the node's children (a flow linked by id).
export function routeTree( skeleton, inventory, proposal, facts, surface, linked = () => null ) {
	const el = new Map( ( inventory?.elements ?? [] ).map( ( e ) => [ e.key, e ] ) );
	const rows = new Map( ( proposal?.rows ?? [] ).map( ( r ) => [ r.key, r ] ) );
	const conv = ( n ) => {
		const tpl = n.draftRef?.tpl ?? null;
		const kids = linked( n.attributes ?? {} ) ?? ( n.innerBlocks ?? [] ).map( conv );
		const mine = tokens( el.get( tpl )?.allText ?? '' );
		for ( const k of kids ) {
			subtreeTokens( k ).forEach( ( t ) => mine.delete( t ) );
		}
		for ( const t of tokens( attributeWords( n.name, n.attributes, facts ).join( ' ' ) ) ) {
			mine.add( t );
		}
		const row = rows.get( tpl );
		return { side: 'route', name: n.name, attrs: n.attributes ?? {}, own: mine, kids, key: tpl ? `${ surface }:${ tpl }` : null, rule: row?.rule ?? null, reason: row?.reason ?? null };
	};
	return ( skeleton ?? [] ).map( conv );
}

// Every node of a subtree, the node first.
export function nodesOf( node, out = [] ) {
	out.push( node );
	node.kids.forEach( ( k ) => nodesOf( k, out ) );
	return out;
}

// The tokens of a whole subtree.
export function subtreeTokens( node ) {
	const out = new Set();
	for ( const n of nodesOf( node ) ) {
		n.own.forEach( ( t ) => out.add( t ) );
	}
	return out;
}

// A wrapper: a layout-category block that holds blocks (its own words, if any, still count in its section's words).
export function isWrapper( node, facts ) {
	return node.kids.length > 0 && 'sgs-layout' === facts.category( node.name );
}

// The layout frame of a unit: the names of its wrapper ancestors other than the generic container, outermost first.
const LAYOUT_GENERIC = 'sgs/container';
const frameOf = ( ancestors ) => ancestors.map( ( a ) => a.name ).filter( ( n ) => n !== LAYOUT_GENERIC );

// The sections of a tree: the children of the first node from the top with more than one child.
export function sectionsOf( roots ) {
	let list = roots;
	while ( 1 === list.length && list[ 0 ].kids.length ) {
		list = list[ 0 ].kids;
	}
	return list;
}

// The units of a section: the highest non-wrapper blocks, each { node, section, ancestors (its wrappers, outermost
// first), solo (its nearest wrapper holds it alone), frame (frameOf), tokens }.
export function unitsOf( section, sectionIndex, facts ) {
	const out = [];
	const walk = ( n, ancestors ) => {
		if ( isWrapper( n, facts ) ) {
			n.kids.forEach( ( k ) => walk( k, [ ...ancestors, n ] ) );
			return;
		}
		const parent = ancestors.at( -1 );
		out.push( { node: n, section: sectionIndex, ancestors, solo: !! parent && 1 === parent.kids.length, frame: frameOf( ancestors ), tokens: subtreeTokens( n ) } );
	};
	walk( section, [] );
	return out;
}

const countNames = ( units ) => {
	const c = {};
	for ( const u of units ) {
		c[ u.node.name ] = ( c[ u.node.name ] ?? 0 ) + 1;
	}
	return c;
};
const sameCounts = ( a, b ) => JSON.stringify( Object.entries( a ).sort() ) === JSON.stringify( Object.entries( b ).sort() );

// The mode settings two same-named blocks set differently: [ { attr, route, owner } ] (an unset value is the default).
export function modeDifferences( r, o, facts ) {
	const out = [];
	for ( const [ attr, def ] of facts.modeAttrs( r.name ) ?? new Map() ) {
		const rv = r.attrs[ attr ] ?? def ?? null;
		const ov = o.attrs[ attr ] ?? def ?? null;
		if ( JSON.stringify( rv ) !== JSON.stringify( ov ) ) {
			out.push( { attr, route: rv, owner: ov } );
		}
	}
	return out;
}

// The class of an aligned group of route and hand-built units, with the mode differences when there are any.
export function classify( routeUnits, ownerUnits, facts, draftTokens = null ) {
	if ( ! routeUnits.length ) {
		const words = new Set( ownerUnits.flatMap( ( u ) => [ ...u.tokens ] ) );
		if ( draftTokens && words.size ) {
			let held = 0;
			words.forEach( ( t ) => draftTokens.has( t ) && held++ );
			if ( held / words.size < ALIGN.overlap ) {
				return { cls: 'owner-addition' };
			}
		}
		return { cls: 'owner-unaligned' };
	}
	if ( ! ownerUnits.length ) {
		return { cls: 'route-unaligned' };
	}
	const rc = countNames( routeUnits );
	const oc = countNames( ownerUnits );
	if ( sameCounts( rc, oc ) ) {
		const modes = [];
		let container = false;
		let written = true;
		for ( const name of Object.keys( rc ) ) {
			const rs = routeUnits.filter( ( u ) => u.node.name === name );
			const os = ownerUnits.filter( ( u ) => u.node.name === name );
			rs.forEach( ( u, i ) => {
				modes.push( ...modeDifferences( u.node, os[ i ].node, facts ) );
				container ||= u.solo !== os[ i ].solo || u.frame.join( '>' ) !== os[ i ].frame.join( '>' );
				written &&= !! os[ i ].node.ref;
			} );
		}
		if ( modes.length ) {
			return { cls: 'mode', modes };
		}
		if ( container ) {
			return { cls: 'container' };
		}
		return { cls: written ? 'route-written' : 'same' };
	}
	if ( routeUnits.length > ownerUnits.length ) {
		return { cls: 'several-to-one' };
	}
	if ( routeUnits.length < ownerUnits.length ) {
		return { cls: 'one-to-several' };
	}
	return { cls: 'other-block' };
}

// Aligns one surface. `route` and `owner` are node lists (routeTree, ownerTree); `draftTokens` the tokens of the whole
// draft surface (for owner additions). Returns { sections: { route, owner, links }, groups: [ { cls, modes, route,
// owner, how } ] } where route and owner are unit lists and `how` is words, siblings or name.
export function alignSurface( route, owner, facts, draftTokens = null ) {
	const rs = sectionsOf( route );
	const os = sectionsOf( owner );
	const ru = rs.flatMap( ( s, i ) => unitsOf( s, i, facts ) );
	const ou = os.flatMap( ( s, j ) => unitsOf( s, j, facts ) );
	const all = [ ...ru, ...ou ];
	const parent = all.map( ( _, i ) => i );
	const find = ( i ) => {
		while ( parent[ i ] !== i ) {
			i = parent[ i ];
		}
		return i;
	};
	const join = ( a, b ) => {
		parent[ find( a ) ] = find( b );
	};
	const how = new Map();
	const linkSet = new Set();
	const link = ( i, j ) => {
		join( i, ru.length + j );
		how.set( i, 'words' ).set( ru.length + j, 'words' );
		linkSet.add( `${ ru[ i ].section }:${ ou[ j ].section }` );
	};
	// The words two sections share: the tie-break between equally good unit links (a caption repeated in two sections).
	const rt = rs.map( subtreeTokens );
	const ot = os.map( subtreeTokens );
	const near = rt.map( ( t ) => ot.map( ( u ) => alignScore( t, u ).shared ) );
	const better = ( a, b ) => ! b || a.score > b.score || ( a.score === b.score && ( a.shared > b.shared || ( a.shared === b.shared && a.near > b.near ) ) );
	// Sections are linked when each is the other's best by shared words, and later by every unit link.
	// A tie goes to the section at the nearer place in its page.
	const bestOf = ( a, at, from, list ) => {
		let b = -1;
		let top = 0;
		const place = ( k, n ) => k / Math.max( 1, n - 1 );
		list.forEach( ( t, k ) => {
			const s = alignScore( a, t ).shared;
			const closer = b >= 0 && Math.abs( place( k, list.length ) - place( at, from ) ) < Math.abs( place( b, list.length ) - place( at, from ) );
			if ( s > top || ( s === top && s > 0 && closer ) ) {
				top = s;
				b = k;
			}
		} );
		return b;
	};
	rt.forEach( ( t, i ) => {
		const j = bestOf( t, i, rt.length, ot );
		if ( j >= 0 && bestOf( ot[ j ], j, ot.length, rt ) === i ) {
			linkSet.add( `${ i }:${ j }` );
		}
	} );
	const mutual = new Set( linkSet );
	// Each route unit links to the hand-built unit its words align with best.
	// Candidates in a linked section only; every section when the unit's own section has no link.
	ru.forEach( ( r, i ) => {
		let best = null;
		for ( const sameSection of [ true, false ] ) {
			ou.forEach( ( o, j ) => {
				const s = { j, ...alignScore( r.tokens, o.tokens ), near: near[ r.section ][ o.section ] };
				if ( s.aligned && sameSection === mutual.has( `${ r.section }:${ o.section }` ) && better( s, best ) ) {
					best = s;
				}
			} );
			if ( best || [ ...mutual ].some( ( m ) => m.startsWith( `${ r.section }:` ) ) ) {
				break;
			}
		}
		if ( best ) {
			link( i, best.j );
		}
	} );
	// A hand-built unit no route unit chose links to the route unit holding most of its own words (one route block
	// printing what several hand-built blocks print), under the same section rule.
	const ownerLinked = ( j ) => [ ...mutual ].some( ( m ) => m.endsWith( `:${ j }` ) );
	ou.forEach( ( o, j ) => {
		if ( how.has( ru.length + j ) || ! o.tokens.size ) {
			return;
		}
		let best = null;
		ru.forEach( ( r, i ) => {
			const s = alignScore( o.tokens, r.tokens );
			const c = { i, score: s.shared / o.tokens.size, shared: s.shared, near: near[ r.section ][ o.section ] };
			const inSection = ! ownerLinked( o.section ) || mutual.has( `${ r.section }:${ o.section }` );
			if ( s.aligned && inSection && c.score >= ALIGN.overlap && better( c, best ) ) {
				best = c;
			}
		} );
		if ( best ) {
			link( best.i, j );
		}
	} );
	const linked = ( i, j ) => linkSet.has( `${ i }:${ j }` );
	const links = [ ...linkSet ].map( ( s ) => s.split( ':' ).map( Number ) );
	// Units left over pair in order by block name, in linked sections, when both print no words or they share one.
	ru.forEach( ( r, i ) => {
		if ( how.has( i ) ) {
			return;
		}
		const j = ou.findIndex( ( o, k ) => ! how.has( ru.length + k ) && o.node.name === r.node.name && linked( r.section, o.section ) && ( ( ! r.tokens.size && ! o.tokens.size ) || alignScore( r.tokens, o.tokens ).shared > 0 ) );
		if ( j >= 0 ) {
			join( i, ru.length + j );
			how.set( i, 'name' ).set( ru.length + j, 'name' );
		}
	} );
	// A unit still left over joins a group when, at its nearest wrapper holding any paired unit, every such unit is in
	// that one group (the brand tag and price of a tile whose picture caption aligned). A hand-built unit of more than
	// ALIGN.minShared words, most of which the draft does not hold, is an addition and joins nothing; a shorter label
	// (a buy box's "Add to basket") is the block's own wording, not evidence.
	const words = new Set( how.keys() );
	const added = ( u ) => draftTokens && u.tokens.size > ALIGN.minShared && [ ...u.tokens ].filter( ( t ) => draftTokens.has( t ) ).length / u.tokens.size < ALIGN.overlap;
	for ( let i = 0; i < all.length; i++ ) {
		if ( how.has( i ) || ( i >= ru.length && added( all[ i ] ) ) ) {
			continue;
		}
		for ( const a of [ ...all[ i ].ancestors ].reverse() ) {
			const roots = new Set();
			all.forEach( ( u, k ) => words.has( k ) && u.ancestors.includes( a ) && roots.add( find( k ) ) );
			if ( roots.size ) {
				if ( 1 === roots.size ) {
					join( i, [ ...roots ][ 0 ] );
					how.set( i, 'siblings' );
				}
				break;
			}
		}
	}
	const byRoot = new Map();
	all.forEach( ( u, i ) => {
		const k = find( i );
		if ( ! byRoot.has( k ) ) {
			byRoot.set( k, { route: [], owner: [], how: new Set() } );
		}
		const g = byRoot.get( k );
		( i < ru.length ? g.route : g.owner ).push( u );
		if ( how.has( i ) ) {
			g.how.add( how.get( i ) );
		}
	} );
	// A group whose word- or name-paired units are the same blocks on both sides is classed on those alone: the units
	// that joined it as siblings are listed as `extra` (a form's unlabelled fields beside its one labelled select).
	const groups = [];
	for ( const g of byRoot.values() ) {
		const paired = ( list, offset ) => list.filter( ( u ) => [ 'words', 'name' ].includes( how.get( all.indexOf( u, offset ) ) ) );
		const pr = paired( g.route, 0 );
		const po = paired( g.owner, ru.length );
		const core = pr.length && po.length && sameCounts( countNames( pr ), countNames( po ) ) && ( pr.length < g.route.length || po.length < g.owner.length );
		const c = core ? classify( pr, po, facts, draftTokens ) : classify( g.route, g.owner, facts, draftTokens );
		const extra = core ? [ ...g.route.filter( ( u ) => ! pr.includes( u ) ), ...g.owner.filter( ( u ) => ! po.includes( u ) ) ].map( ( u ) => u.node.name ) : [];
		groups.push( { ...c, route: g.route, owner: g.owner, extra, how: [ ...g.how ].sort().join( '+' ) || 'none' } );
	}
	return { sections: { route: rs.length, owner: os.length, links }, groups };
}

// The draft keys under a group's route units (each node of each unit's subtree).
export function routeKeys( group ) {
	const out = new Set();
	for ( const u of group.route ) {
		for ( const n of nodesOf( u.node ) ) {
			if ( n.key ) {
				out.add( n.key );
			}
		}
	}
	return out;
}

// The draft looks the three lists hold under a group's route blocks: `index` maps a `<surface>:<draft key>` to
// { gaps, conserve, motion } counts; returns the summed counts and their total.
export function looksUnder( group, index ) {
	const sum = { gaps: 0, conserve: 0, motion: 0 };
	for ( const k of routeKeys( group ) ) {
		const c = index.get( k );
		if ( c ) {
			sum.gaps += c.gaps ?? 0;
			sum.conserve += c.conserve ?? 0;
			sum.motion += c.motion ?? 0;
		}
	}
	return { ...sum, total: sum.gaps + sum.conserve + sum.motion };
}

const preorder = ( roots ) => {
	const flat = [];
	const walk = ( n ) => {
		flat.push( n );
		( n.innerBlocks ?? [] ).forEach( walk );
	};
	( Array.isArray( roots ) ? roots : [ roots ] ).forEach( walk );
	return flat;
};

// The cr-ref index → draft key map of one Fill run (cr-ref-<surface>-<i> is the i-th node of the run's tree in
// pre-order): { keys, how }. `how` is exact when a candidate skeleton's pre-order block names are the run's, else
// sequence: the longest common subsequence of the names against the first candidate, unmatched indexes null.
export function refMap( filledTree, candidates ) {
	const names = preorder( filledTree ).map( ( n ) => n.name );
	for ( const sk of candidates ) {
		const flat = preorder( sk ?? [] );
		if ( flat.length === names.length && flat.every( ( n, i ) => n.name === names[ i ] ) ) {
			return { keys: flat.map( ( n ) => n.draftRef?.tpl ?? null ), how: 'exact' };
		}
	}
	if ( ! candidates.length ) {
		return null;
	}
	const flat = preorder( candidates[ 0 ] );
	const n = names.length;
	const m = flat.length;
	const dp = Array.from( { length: n + 1 }, () => new Uint16Array( m + 1 ) );
	for ( let i = n - 1; i >= 0; i-- ) {
		for ( let j = m - 1; j >= 0; j-- ) {
			dp[ i ][ j ] = names[ i ] === flat[ j ].name ? dp[ i + 1 ][ j + 1 ] + 1 : Math.max( dp[ i + 1 ][ j ], dp[ i ][ j + 1 ] );
		}
	}
	const keys = new Array( n ).fill( null );
	for ( let i = 0, j = 0; i < n && j < m; ) {
		if ( names[ i ] === flat[ j ].name ) {
			keys[ i++ ] = flat[ j++ ].draftRef?.tpl ?? null;
		} else if ( dp[ i + 1 ][ j ] >= dp[ i ][ j + 1 ] ) {
			i++;
		} else {
			j++;
		}
	}
	return { keys, how: 'sequence' };
}
