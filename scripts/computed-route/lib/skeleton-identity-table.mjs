// The block side of identification by elimination (Spec 48 §3.4, FR-48-6; plan F1): every block's identification facts from
// the framework database, read once per connection, read-only. Sources, all DB rows (FP-1):
//   - `block_identity_facts` (fact, value, state, source): a block's state for a fact and value is `yes` when any row says
//     yes, `no` only when every row says no, and `unknown` with no row at all, so a missing row never rules a block out;
//   - `block_composition`: what a block can hold. With no `accepts_allowed_blocks` list, a wrapper shell, a section root, a
//     block whose children are free content or a section (`container_kind` `content` or `section`), or any block that prints
//     its inner blocks (`printsInner`, whatever its container kind) holds any block, as WordPress lets any block in where no
//     allowed list is set (Bean 2026-10-30: an unrestricted container); a block listing `accepts_allowed_blocks` holds those, followed through every
//     block they hold; any other block holds none and draws everything it shows;
//   - `block_attributes`: the values a block's text and glyph settings hold (`enum_values` of a `text-content` or `glyph` setting, such as the
//     breadcrumbs' separator glyphs), read as the `accepts-value` fact;
//   - `motion_targets`: the parts a block draws (its `target` names), read as the `has-part` fact.
// Roles are meanings (lib/skeleton-identity-roles.mjs): a block's state for a role joins its `renders-role` row with the
// `renders-tag` rows of every tag that carries that role (a block that can print `h3` can show `heading`): yes when any is
// yes, no only when every row present says no, unknown with none.
// `yesShare( fact, value )` is the share of the blocks with rows for the fact that show the value: a fact most blocks show
// (an `aria-label` every shared helper prints) names no block.
import fs from 'fs';
import path from 'path';
import { roleTags } from './skeleton-identity-roles.mjs';

const cache = new WeakMap();
const K = ( fact, value ) => `${ fact }\u0000${ value }`;

// `query( sql )` → rows: the read-only connection's query (lib/skeleton-facts.mjs::loadFacts `q`). A database without the
// identity table (an older copy) gives an empty table, so every fact is unknown and nothing is ruled out.
// Whether a block prints its inner blocks, read from its own folder the way the identity extractor reads it
// (plugins/sgs-blocks/scripts/lib/identity_markup.py::inner_blocks): its editor offers InnerBlocks (or its save keeps them) and
// its render reads `$content` or `$block->inner_blocks`, comments set aside. A block outside the repository reads false.
function printsInner( codeRepo, block ) {
	const dir = codeRepo && /^sgs\//.test( block ) ? path.join( codeRepo, 'plugins/sgs-blocks/src/blocks', block.slice( 4 ) ) : null;
	if ( ! dir || ! fs.existsSync( dir ) ) {
		return false;
	}
	const files = fs.readdirSync( dir );
	const read = ( list ) => list.map( ( f ) => fs.readFileSync( path.join( dir, f ), 'utf8' ) ).join( '\n' );
	const code = read( files.filter( ( f ) => f.endsWith( '.php' ) ) ).replace( /\/\*[\s\S]*?\*\//g, '' ).replace( /(^|[^:'"])(\/\/|#)[^\n]*/g, '$1' );
	const save = files.includes( 'save.js' ) ? read( [ 'save.js' ] ) : '';
	const edit = read( files.filter( ( f ) => /\.jsx?$/.test( f ) && ! /^(save|view)/.test( f ) ) );
	const offers = /InnerBlocks\.Content|useInnerBlocksProps\.save/.test( save ) || /\bInnerBlocks\b|useInnerBlocksProps/.test( edit );
	return offers && /\$content\b|->\s*inner_blocks\b/.test( code );
}

export function identityTable( query, codeRepo = null ) {
	if ( cache.has( query ) ) {
		return cache.get( query );
	}
	const q = ( sql ) => {
		try {
			return query( sql );
		} catch {
			return [];
		}
	};
	const rows = new Map();
	const known = new Set();
	const factBlocks = new Map();
	const yesBlocks = new Map();
	for ( const r of q( 'SELECT block_slug, fact, value, state FROM block_identity_facts' ) ) {
		known.add( r.block_slug );
		const own = rows.get( r.block_slug ) ?? rows.set( r.block_slug, new Map() ).get( r.block_slug );
		const k = K( r.fact, r.value );
		const was = own.get( k );
		own.set( k, 'yes' === r.state || 'yes' === was ? 'yes' : ( undefined === was || 'no' === was ) && 'no' === r.state ? 'no' : 'unknown' );
		( factBlocks.get( r.fact ) ?? factBlocks.set( r.fact, new Set() ).get( r.fact ) ).add( r.block_slug );
	}
	for ( const [ block, own ] of rows ) {
		for ( const [ k, state ] of own ) {
			'yes' === state && ( yesBlocks.get( k ) ?? yesBlocks.set( k, new Set() ).get( k ) ).add( block );
		}
	}
	const composition = new Map( q( 'SELECT block_slug, composition_role, accepts_allowed_blocks, container_kind FROM block_composition' ).map( ( r ) => [ r.block_slug, r ] ) );
	const valueBlocks = new Map();
	for ( const r of q( "SELECT block_slug, enum_values FROM block_attributes WHERE role IN ( 'text-content', 'glyph' ) AND css_property IS NULL AND enum_values LIKE '[%'" ) ) {
		let list = [];
		try {
			list = JSON.parse( r.enum_values );
		} catch {
			list = [];
		}
		list.filter( ( v ) => 'string' === typeof v ).forEach( ( v ) => ( valueBlocks.get( v ) ?? valueBlocks.set( v, new Set() ).get( v ) ).add( r.block_slug ) );
	}
	const partBlocks = new Map();
	for ( const r of q( "SELECT block_slug, target FROM motion_targets WHERE kind = 'part'" ) ) {
		( partBlocks.get( r.target ) ?? partBlocks.set( r.target, new Set() ).get( r.target ) ).add( r.block_slug );
	}
	const platforms = [ ...new Set( q( "SELECT DISTINCT value FROM block_identity_facts WHERE fact = 'platform'" ).map( ( r ) => r.value ) ) ];

	// The state of one fact and value for a block. `accepts-value` and `has-part` are yes for a block whose settings or parts
	// hold the value, and unknown otherwise (never a ruling-out).
	const state = ( block, fact, value ) => {
		if ( 'accepts-value' === fact ) {
			return valueBlocks.get( value )?.has( block ) ? 'yes' : 'unknown';
		}
		if ( 'has-part' === fact || 'shows-part' === fact ) {
			return partBlocks.get( value )?.has( block ) ? 'yes' : 'unknown';
		}
		if ( 'accepts-kind' === fact && value.startsWith( '[]=' ) ) {
			const kind = value.slice( 3 );
			// Some item field (a field of a repeating list, `items.iconName`) of the block takes the kind.
			return [ ...( rows.get( block ) || new Map() ) ].some( ( [ k, st ] ) => 'yes' === st && k.startsWith( K( 'accepts-kind', '' ) ) && k.endsWith( `=${ kind }` ) && k.slice( K( 'accepts-kind', '' ).length ).split( '=' )[ 0 ].includes( '.' ) ) ? 'yes' : 'unknown';
		}
		if ( 'renders-role' === fact || 'implied-role' === fact ) {
			fact = 'renders-role';
			const own = rows.get( block );
			const states = [ own?.get( K( fact, value ) ), ...[ ...( roleTags.get( value ) || [] ) ].map( ( t ) => own?.get( K( 'renders-tag', t ) ) ) ].filter( Boolean );
			return states.includes( 'yes' ) ? 'yes' : states.length && states.every( ( x ) => 'no' === x ) ? 'no' : 'unknown';
		}
		return rows.get( block )?.get( K( fact, value ) ) ?? 'unknown';
	};
	// The blocks a block can hold, followed through every block they hold: 'any', or a Set (empty: it holds none).
	const heldCache = new Map();
	const holds = ( block ) => {
		if ( heldCache.has( block ) ) {
			return heldCache.get( block );
		}
		heldCache.set( block, new Set() );
		const c = composition.get( block );
		let out = new Set();
		if ( ! c?.accepts_allowed_blocks && ( 'wrapper-shell' === c?.composition_role || 'section-root' === c?.composition_role || [ 'content', 'section' ].includes( c?.container_kind ) || printsInner( codeRepo, block ) ) ) {
			out = 'any';
		} else if ( c?.accepts_allowed_blocks ) {
			let list = [];
			try {
				list = JSON.parse( c.accepts_allowed_blocks );
			} catch {
				list = [];
			}
			for ( const b of list ) {
				const sub = holds( b );
				if ( 'any' === sub ) {
					out = 'any';
					break;
				}
				out.add( b );
				sub.forEach( ( x ) => out.add( x ) );
			}
		}
		heldCache.set( block, out );
		return out;
	};
	// Whether a block can show a fact: it, or a block it can hold, does not say `no`. A block holding any block can show
	// anything its children show.
	const canShow = ( block, fact, value ) => {
		if ( 'no' !== state( block, fact, value ) ) {
			return true;
		}
		const held = holds( block );
		return 'any' === held || [ ...held ].some( ( b ) => 'no' !== state( b, fact, value ) );
	};
	const roleShare = new Map();
	// The share of the blocks with rows for a fact that show the value.
	const yesShare = ( fact, value ) => {
		if ( 'accepts-value' === fact ) {
			return ( valueBlocks.get( value )?.size ?? 0 ) / Math.max( 1, known.size );
		}
		if ( 'has-part' === fact || 'shows-part' === fact ) {
			return ( partBlocks.get( value )?.size ?? 0 ) / Math.max( 1, known.size );
		}
		if ( ( 'accepts-kind' === fact && value.startsWith( '[]=' ) ) || 'renders-role' === fact || 'implied-role' === fact ) {
			const f = 'accepts-kind' === fact ? fact : 'renders-role';
			const k = K( f, value );
			roleShare.has( k ) || roleShare.set( k, [ ...known ].filter( ( b ) => 'yes' === state( b, f, value ) ).length / Math.max( 1, known.size ) );
			return roleShare.get( k );
		}
		return ( yesBlocks.get( K( fact, value ) )?.size ?? 0 ) / Math.max( 1, factBlocks.get( fact )?.size ?? 0 );
	};
	// The platforms a block belongs to (its `platform` rows at yes).
	const platformsOf = ( block ) => platforms.filter( ( p ) => 'yes' === state( block, 'platform', p ) );
	// The kinds of value the DB records per block (`accepts-kind` `*=<kind>` rows), and the blocks with a text setting (a
	// glyph is text such a block can print, so an emoji never rules it out).
	const kinds = new Set( q( "SELECT DISTINCT value FROM block_identity_facts WHERE fact = 'accepts-kind' AND value LIKE '*=%'" ).map( ( r ) => r.value ) );
	const texty = new Set( [ ...q( "SELECT DISTINCT block_slug FROM block_attributes WHERE role = 'text-content' AND css_property IS NULL" ), ...q( "SELECT DISTINCT block_slug FROM array_item_schema WHERE role = 'text-content'" ) ].map( ( r ) => r.block_slug ) );
	const out = { kinds, hasText: ( b ) => texty.has( b ), blocks: [ ...known ].sort(), state, holds, canShow, yesShare, platforms, platformsOf, composition };
	cache.set( query, out );
	return out;
}
