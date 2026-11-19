// The working piece of each template (Spec 48 FR-48-56, FR-48-87, FR-48-96, FR-48-99): data/template-pieces.json names,
// per template slug and per commerce page role, the block that must really work in the built tree (the page's own Cart
// block, the product collection, the buy box, the order's items). This file loads that map, hands each piece that has a
// builder to it, and checks the result: a required piece that is absent, or a piece placed more than once, is a problem
// naming the template and the piece, so a static imitation never passes as built.
//
// A piece of kind `rule` (an existing skeleton rule places it) or `theme` (it comes with the theme template's own
// content) is only checked. Any other kind names a builder module beside this file, `template-piece-<kind>.mjs`, whose
// `place( ctx, piece )` returns, at once, `{ tree, placed, problems, notes }` (each optional): the tree with the piece in it, one
// `placed` row per piece put in (`{ id, block, at }`), and what it could not do. A builder never changes a tree it was
// not handed: `placePieces` gives each one a copy. The caller hands the builders in (lib/template-pieces-context.mjs::BUILDERS).
//
// A piece names its block, a binding (`binds: { source, key }`: a block whose `metadata.bindings` binds an attribute to
// that source and key, since a bound text has no block name of its own), or both; a node is the piece when it matches
// every one it names.
//
// A template may opt in to the data branch reader (`dataBranches: true`, lib/skeleton-data-branches.mjs::inventoryBranches):
// its surface's inventory also reads the branches the draft shows only for some data. Only a template whose working pieces
// need those branches in the skeleton opts in (the order confirmation's gift note and signed-in link); a state a working
// block draws itself (a signed-in account, an empty basket, a product type) is never read in.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const PIECES_FILE = path.resolve( HERE, '..', 'data', 'template-pieces.json' );

// Kinds no builder places.
export const CHECKED_ONLY = [ 'rule', 'theme' ];
const KIND = /^[a-z][a-z0-9-]*$/;
const BLOCK = /^[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*$/;

// What is wrong with the map itself: one line per fault, none when it is sound.
export function pieceMapProblems( data ) {
	const out = [];
	for ( const group of [ 'templates', 'pages' ] ) {
		for ( const [ key, entry ] of Object.entries( data?.[ group ] || {} ) ) {
			const seen = new Set();
			if ( undefined !== entry?.dataBranches && 'boolean' !== typeof entry.dataBranches ) {
				out.push( `${ group }.${ key }: dataBranches must be true or false` );
			}
			if ( ! Array.isArray( entry?.pieces ) ) {
				out.push( `${ group }.${ key }: no pieces list` );
				continue;
			}
			for ( const p of entry.pieces ) {
				const where = `${ group }.${ key } piece "${ p?.id ?? '' }"`;
				if ( ! p?.id || seen.has( p.id ) ) {
					out.push( `${ where }: an id is missing or repeated` );
				}
				seen.add( p?.id );
				if ( ( p?.block || ! p?.binds ) && ! BLOCK.test( String( p?.block || '' ) ) ) {
					out.push( `${ where }: block "${ p?.block ?? '' }" is not a block name` );
				}
				if ( p?.binds && ( ! BLOCK.test( String( p.binds.source || '' ) ) || ! p.binds.key || 'string' !== typeof p.binds.key ) ) {
					out.push( `${ where }: binds needs a source (a block binding source name) and a key` );
				}
				if ( ! KIND.test( String( p?.kind || '' ) ) ) {
					out.push( `${ where }: kind "${ p?.kind ?? '' }" is not a kind` );
				}
				if ( 'boolean' !== typeof p?.required ) {
					out.push( `${ where }: required must be true or false` );
				}
			}
		}
	}
	return out;
}

// The map, refused when its shape is wrong.
export function loadPieces( file = PIECES_FILE ) {
	const data = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	const problems = pieceMapProblems( data );
	if ( problems.length ) {
		throw new Error( `${ path.basename( file ) }: ${ problems.join( '; ' ) }` );
	}
	return data;
}

// Whether a template's surface reads its data branches (see the header).
export const readsDataBranches = ( key, data ) => true === data?.templates?.[ key ]?.dataBranches;

// The pieces of one template slug, or of one commerce page role when no template has that name.
export const piecesFor = ( key, data ) => data?.templates?.[ key ]?.pieces || data?.pages?.[ key ]?.pieces || [];

// How many blocks of `name` a tree holds, at any depth.
export function countBlocks( tree, name ) {
	return ( tree || [] ).reduce( ( n, node ) => n + ( node?.name === name ? 1 : 0 ) + countBlocks( node?.innerBlocks, name ), 0 );
}

// Whether a node binds an attribute to `binds.source` with the key `binds.key`.
export const bindsTo = ( node, binds ) => Object.values( node?.attributes?.metadata?.bindings || {} ).some( ( b ) => b?.source === binds.source && b?.args?.key === binds.key );

// How many nodes of a tree, at any depth, are the piece: its block, bound as it names, or both.
export function countPiece( tree, piece ) {
	const is = ( node ) => ( ! piece.block || node?.name === piece.block ) && ( ! piece.binds || bindsTo( node, piece.binds ) );
	return ( tree || [] ).reduce( ( n, node ) => n + ( is( node ) ? 1 : 0 ) + countPiece( node?.innerBlocks, piece ), 0 );
}

// The words naming what a piece is: its block, its binding, or a block with that binding.
const pieceText = ( p ) => [ p.block, p.binds && `${ p.block ? 'bound' : 'block bound' } to ${ p.binds.source } ${ p.binds.key }` ].filter( Boolean ).join( ' ' );

// What the built tree lacks: a required piece that is absent, and a piece that may stand once and stands more often.
export function checkPieces( { key, tree, data } ) {
	const out = [];
	for ( const p of piecesFor( key, data ) ) {
		const n = countPiece( tree, p );
		if ( p.required && 0 === n ) {
			out.push( `${ key }: the working piece "${ p.id }" is missing: no ${ pieceText( p ) } in the tree (${ CHECKED_ONLY.includes( p.kind ) ? `placed by ${ p.by || `the ${ p.kind }` }` : `builder template-piece-${ p.kind }.mjs` })` );
		}
		if ( false !== p.once && n > 1 ) {
			out.push( `${ key }: the working piece "${ p.id }" stands ${ n } times: ${ pieceText( p ) } may stand once` );
		}
	}
	return out;
}

// Places every piece of `key` that has a builder, in the map's order, then checks the tree. `ctx` is handed to each
// builder with the tree so far (the surface's inventory, fact record, shop parts, catalogue: whatever the caller read).
// `builders` maps a kind to its module, whose `place` returns its result at once; a kind absent from it is a problem,
// never a silent skip.
export function placePieces( { key, tree, data = loadPieces(), ctx = {}, builders = {} } ) {
	let out = tree || [];
	const placed = [];
	const problems = [];
	const notes = [];
	for ( const piece of piecesFor( key, data ) ) {
		if ( CHECKED_ONLY.includes( piece.kind ) ) {
			continue;
		}
		const builder = builders[ piece.kind ];
		if ( ! builder ) {
			problems.push( `${ key }: piece "${ piece.id }" names kind "${ piece.kind }", which has no builder (template-piece-${ piece.kind }.mjs is not among the builders handed in)` );
			continue;
		}
		const got = builder.place( { ...ctx, key, tree: structuredClone( out ) }, piece ) || {};
		out = got.tree || out;
		placed.push( ...( got.placed || [] ) );
		problems.push( ...( got.problems || [] ) );
		notes.push( ...( got.notes || [] ) );
	}
	problems.push( ...checkPieces( { key, tree: out, data } ) );
	return { tree: out, placed, problems, notes };
}
