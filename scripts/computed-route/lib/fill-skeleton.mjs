// The Fill skeleton (FR-47-4): a normal block tree whose nodes also carry `draftRef` (the walker finder of the draft
// element the block copies) and `draftSlots` ({ "<element path>": finder } for elements inside it).
//
// A finder is the walker's own vocabulary (scripts/parity/lib/collect.mjs::resolveFinder): a CSS selector string,
// { text, tag?, within?, nth?, flags? } (the smallest visible element whose rendered text matches), { textRun: { within,
// direct?, match? } }, { group: { paths } }, { js: '(root) => element', within? }, or { tpl: '<chain>/<n>#<copy>', within? }
// (the element the draft runtime stamped data-dc-tpl="n": the exact draft element, see parseTplKey). `draftRef` is resolved on the
// whole draft page, exactly as a walker pair's finder is. A slot finder is resolved inside its node's `draftRef`
// element (the slot key is the element's path from the block root, the format of calibration's `elements` keys), so
// it needs no knowledge of the page around it.
import { handoverProblems } from './fill-handover.mjs';
import { brandRegistry } from './brand-registry.mjs';

const isStr = ( v ) => 'string' === typeof v && '' !== v.trim();

// A skeleton `sgs/social-icons` node may also carry Fill-only keys that name a row of Site Info-bound brand icons:
//   siteInfoRow:     [ brand slug, ... ] from the brand registry (absent: every registry brand, in registry order)
//   childAttributes: { attr: value } merged into every generated icon's attributes
//   childRefs:       { "<slug>": selector } the draft element each icon copies, resolved inside the row's own draftRef
//                    (a selector string), so the icon can take the draft's typed address as its fallback link
export const ROW_KEYS = [ 'siteInfoRow', 'childAttributes', 'childRefs' ];
export const hasRow = ( node ) => 'sgs/social-icons' === node.name && ROW_KEYS.some( ( k ) => undefined !== node[ k ] );
// A generated icon's glyph: the svg inside its draft link, at sgs/icon's glyph element path. Fill reads the link and
// the glyph against the row's shape and glyph elements (lib/fill-row-lift.mjs).
export const ROW_GLYPH_SLOT = '.sgs-icon__shape > .sgs-icon__svg';

// The attribute Fill puts on a node's draft element while its slots resolve (scopeSelector names it).
export const SCOPE_ATTR = 'data-fill-scope';
export const scopeSelector = ( index ) => `[${ SCOPE_ATTR }="${ index }"]`;

const KEYS = { text: [ 'text', 'tag', 'within', 'nth', 'flags' ], textRun: [ 'textRun' ], group: [ 'group' ], js: [ 'js', 'within' ], tpl: [ 'tpl', 'within' ] };
const KINDS = [ 'text', 'textRun', 'group', 'js', 'tpl' ];

// A tpl key is `<chain>/<n>#<copy>`: the import-host chain from the document root (`Root`, then `<template name>@<host
// stamp>#<host copy>` for each nested import, joined by `>`), the data-dc-tpl number (the runtime restarts it at 0 in
// every template, so a number alone is ambiguous), and the element's position among same-numbered elements of its
// nearest host. { chain, tpl, copy }, or null when the text is not a key.
export function parseTplKey( key ) {
	const m = 'string' === typeof key ? /^(.+)\/(\d+)#(\d+)$/.exec( key ) : null;
	if ( ! m ) {
		return null;
	}
	const chain = m[ 1 ].split( '>' );
	if ( chain.some( ( part, i ) => '' === part || ( i > 0 && ! /^.+#\d+$/.test( part ) ) ) ) {
		return null;
	}
	return { chain, tpl: Number( m[ 2 ] ), copy: Number( m[ 3 ] ) };
}

// The key text of { chain, tpl, copy } (parseTplKey's inverse).
export const tplKey = ( { chain, tpl, copy } ) => `${ chain.join( '>' ) }/${ tpl }#${ copy }`;

// A reason a value is not a walker finder, or null when it is one.
export function finderProblem( f ) {
	if ( isStr( f ) ) {
		return null;
	}
	if ( ! f || 'object' !== typeof f || Array.isArray( f ) ) {
		return 'a finder is a selector string or a walker finder object';
	}
	const kind = KINDS.find( ( k ) => k in f );
	if ( ! kind ) {
		return `finder object has none of ${ Object.keys( KEYS ).join( ', ' ) }`;
	}
	const extra = Object.keys( f ).filter( ( k ) => ! KEYS[ kind ].includes( k ) );
	if ( extra.length ) {
		return `finder ${ kind } carries ${ extra.join( ', ' ) }, which the walker does not read`;
	}
	if ( 'text' === kind && ! isStr( f.text ) ) {
		return 'finder text is a regex source string';
	}
	if ( 'text' === kind && ( ( undefined !== f.nth && ! Number.isInteger( f.nth ) ) || ( undefined !== f.tag && ! isStr( f.tag ) ) || ( undefined !== f.within && ! isStr( f.within ) ) ) ) {
		return 'finder text takes tag and within as selectors and nth as an integer';
	}
	if ( 'textRun' === kind && ! isStr( f.textRun?.within ) ) {
		return 'finder textRun needs a within selector';
	}
	if ( 'group' === kind && ( ! Array.isArray( f.group?.paths ) || ! f.group.paths.length || ! f.group.paths.every( isStr ) ) ) {
		return 'finder group needs a list of selector paths';
	}
	if ( 'tpl' === kind && ( ! parseTplKey( f.tpl ) || ( undefined !== f.within && ! isStr( f.within ) ) ) ) {
		return 'finder tpl is "<import chain>/<number>#<copy>", with an optional within selector';
	}
	if ( 'js' === kind && ( ! isStr( f.js ) || ( undefined !== f.within && ! isStr( f.within ) ) ) ) {
		return 'finder js is a function source, with an optional within selector';
	}
	return null;
}

// 'selector' | 'text' | 'textRun' | 'group' | 'js' | 'tpl', or null for a value that is not a finder.
export function finderKind( f ) {
	if ( finderProblem( f ) ) {
		return null;
	}
	return 'string' === typeof f ? 'selector' : KINDS.find( ( k ) => k in f );
}

const within = ( scope, sel ) => ( sel ? `${ scope } :is(${ sel })` : scope );

// The finder rewritten to resolve inside the element carrying `scope` (a scopeSelector). The input is not changed.
export function scopeFinder( f, scope ) {
	switch ( finderKind( f ) ) {
		case 'selector':
			return within( scope, f );
		case 'text':
			return { ...f, within: within( scope, f.within ) };
		case 'textRun':
			return { textRun: { ...f.textRun, within: within( scope, f.textRun.within ) } };
		case 'group':
			return { group: { ...f.group, paths: f.group.paths.map( ( p ) => within( scope, p ) ) } };
		case 'js':
		case 'tpl':
			return { ...f, within: within( scope, f.within ) };
		default:
			throw new Error( `not a finder: ${ JSON.stringify( f ) }` );
	}
}

// Every node of a skeleton, depth-first (the index addRefs gives each ref), with its parent, its children's indices and
// its measuring targets: the draftRef (slot '') then each draftSlots entry. A target is { id, index, slot, finder,
// scoped }. A node with no draftRef has no targets: Fill reads nothing for it, and its children inherit past it.
export function skeletonNodes( tree ) {
	const nodes = [];
	const go = ( list, parent ) => list.forEach( ( node ) => {
		const index = nodes.length;
		const rec = { index, name: node.name, node, parent, children: [], targets: [] };
		nodes.push( rec );
		if ( null !== parent ) {
			nodes[ parent ].children.push( index );
		}
		if ( undefined !== node.draftRef ) {
			rec.targets.push( { id: `${ index }:`, index, slot: '', finder: node.draftRef, scoped: false } );
			for ( const [ slot, finder ] of Object.entries( node.draftSlots || {} ) ) {
				rec.targets.push( { id: `${ index }:${ slot }`, index, slot, finder, scoped: true } );
			}
		}
		go( node.innerBlocks || [], index );
	} );
	go( tree, null );
	return nodes;
}

// What is wrong with a node's Site Info row keys, as readable lines.
function rowProblems( node, label ) {
	const given = ROW_KEYS.filter( ( k ) => undefined !== node[ k ] );
	if ( ! given.length ) {
		return [];
	}
	if ( 'sgs/social-icons' !== node.name ) {
		return [ `${ label } ${ given.join( ', ' ) } belongs to sgs/social-icons only` ];
	}
	const problems = [];
	const known = brandRegistry().map( ( b ) => b.slug );
	const row = node.siteInfoRow;
	if ( undefined !== row && ( ! Array.isArray( row ) || ! row.every( isStr ) ) ) {
		problems.push( `${ label } siteInfoRow must be a list of brand slugs` );
	} else {
		( row || [] ).forEach( ( slug, i ) => {
			if ( ! known.includes( slug ) ) {
				problems.push( `${ label } siteInfoRow brand "${ slug }" is not in the brand registry (${ known.join( ', ' ) })` );
			} else if ( row.indexOf( slug ) !== i ) {
				problems.push( `${ label } siteInfoRow lists "${ slug }" twice` );
			}
		} );
	}
	const plain = ( v ) => v && 'object' === typeof v && ! Array.isArray( v );
	if ( undefined !== node.childAttributes && ! plain( node.childAttributes ) ) {
		problems.push( `${ label } childAttributes must be an object of attribute to value` );
	}
	if ( ( node.innerBlocks || [] ).length ) {
		problems.push( `${ label } has siteInfoRow and its own innerBlocks: the row generates its icons` );
	}
	if ( undefined !== node.childRefs ) {
		if ( ! plain( node.childRefs ) || ! Object.values( node.childRefs ).every( isStr ) ) {
			problems.push( `${ label } childRefs must be an object of brand slug to selector` );
		} else {
			Object.keys( node.childRefs ).filter( ( k ) => ! ( Array.isArray( row ) ? row : known ).includes( k ) ).forEach( ( k ) => problems.push( `${ label } childRefs names "${ k }", which siteInfoRow does not list` ) );
			if ( ! isStr( node.draftRef ) ) {
				problems.push( `${ label } childRefs needs the row draftRef as a selector string, which each icon finder is resolved inside` );
			}
		}
	}
	return problems;
}

// What is wrong with a skeleton's draft keys, as readable lines (empty when sound). The style lint (R-47-10) is
// lint.mjs::lintSkeleton; this checks only what Fill itself reads.
export function skeletonProblems( tree ) {
	const problems = [];
	for ( const n of skeletonNodes( tree ) ) {
		const label = `node ${ n.index } (${ n.name })`;
		const node = n.node;
		if ( undefined !== node.draftRef && finderProblem( node.draftRef ) ) {
			problems.push( `${ label } draftRef: ${ finderProblem( node.draftRef ) }` );
		}
		if ( undefined !== node.draftSlots && ( ! node.draftSlots || 'object' !== typeof node.draftSlots || Array.isArray( node.draftSlots ) ) ) {
			problems.push( `${ label } draftSlots must be an object of slot path to finder` );
			continue;
		}
		if ( node.draftSlots && Object.keys( node.draftSlots ).length && undefined === node.draftRef ) {
			problems.push( `${ label } has draftSlots but no draftRef` );
		}
		for ( const [ slot, finder ] of Object.entries( node.draftSlots || {} ) ) {
			if ( '' === slot ) {
				problems.push( `${ label } draftSlots has an empty slot key (the block root is the draftRef)` );
			} else if ( /::(before|after)$/.test( slot ) ) {
				problems.push( `${ label } slot "${ slot }" names a pseudo layer: a layer is read from its element, name the element` );
			} else if ( finderProblem( finder ) ) {
				problems.push( `${ label } slot "${ slot }": ${ finderProblem( finder ) }` );
			}
		}
		if ( undefined !== node.draftFingerprint && ! ( node.draftFingerprint && 'object' === typeof node.draftFingerprint && isStr( node.draftFingerprint.tag ) ) ) {
			problems.push( `${ label } draftFingerprint must be { tag, cls, styleHash }` );
		}
		problems.push( ...handoverProblems( node.handover, label ), ...rowProblems( node, label ) );
	}
	return problems;
}

// `draftFingerprint` ({ tag, cls, styleHash }) is the skeleton writer's record of the draft element a tpl finder names;
// Fill moves it into the surface's origin map (originMap) and strips it with the other draft keys.
const DRAFT_KEYS = [ 'draftRef', 'draftSlots', 'draftFingerprint', 'handover', ...ROW_KEYS ];

// The origin map of a skeleton: for every node whose draftRef is a tpl finder, { [cr-ref]: { tpl, fingerprint, slots } }
// (slots: the slot path to the tpl key of each tpl slot finder). `refs[i]` is the cr-ref of node i (tree.mjs::refOf).
// A node with a selector or other finder is not in the map: only a tpl finder names one draft element for good.
export function originMap( nodes, refs ) {
	const out = {};
	for ( const n of nodes ) {
		const f = n.node.draftRef;
		if ( 'tpl' !== finderKind( f ) || ! refs[ n.index ] ) {
			continue;
		}
		const slots = Object.fromEntries( Object.entries( n.node.draftSlots || {} ).filter( ( [ , sf ] ) => 'tpl' === finderKind( sf ) ).map( ( [ k, sf ] ) => [ k, sf.tpl ] ) );
		out[ refs[ n.index ] ] = { tpl: f.tpl, fingerprint: n.node.draftFingerprint || null, ...( Object.keys( slots ).length ? { slots } : {} ) };
	}
	return out;
}

// The skeleton with each Site Info row node expanded into its `sgs/icon` innerBlocks: `{ iconSource: 'brand', brandName,
// metadata.bindings.linkUrl -> sgs/site-info <registry siteInfoKey>, ...childAttributes }`. The Fill-only keys stay on the
// node (cleanTree strips them). Run skeletonProblems first: an unknown slug is a problem there. The input is not changed.
export function expandSiteInfoRows( tree ) {
	const brands = brandRegistry();
	const go = ( list ) => list.map( ( node ) => {
		const out = { ...node };
		if ( node.innerBlocks ) {
			out.innerBlocks = go( node.innerBlocks );
		}
		if ( hasRow( node ) ) {
			const slugs = node.siteInfoRow ?? brands.map( ( b ) => b.slug );
			out.innerBlocks = slugs.map( ( slug ) => {
				const brand = brands.find( ( b ) => b.slug === slug );
				const child = {
					name: 'sgs/icon',
					attributes: structuredClone( { iconSource: 'brand', brandName: slug, metadata: { bindings: { linkUrl: { source: 'sgs/site-info', args: { key: brand?.siteInfoKey } } } }, ...( node.childAttributes || {} ) } ),
				};
				if ( node.childRefs?.[ slug ] && isStr( node.draftRef ) ) {
					child.draftRef = `${ node.draftRef } ${ node.childRefs[ slug ] }`;
					child.draftSlots = { [ ROW_GLYPH_SLOT ]: 'svg' };
				}
				return child;
			} );
		}
		return structuredClone( out );
	} );
	return go( tree );
}

// A copy of the tree without the draft keys: what Fill writes, and what wp-build-page.js receives.
export function cleanTree( tree ) {
	const go = ( list ) => list.map( ( n ) => {
		const out = Object.fromEntries( Object.entries( structuredClone( n ) ).filter( ( [ k ] ) => ! DRAFT_KEYS.includes( k ) ) );
		out.innerBlocks = go( n.innerBlocks || [] );
		return out;
	} );
	return go( tree );
}
