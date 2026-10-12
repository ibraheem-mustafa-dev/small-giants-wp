// The detector for site references in calibration-fixtures.json (Spec 48 §3.2; the migration method's survey, fix,
// check and self-test). Every value that names a WordPress object is one of:
//   token           a "{{role}}" token (lib/calibration-refs.mjs), resolved per calibration target;
//   url-backed      an attachment id beside the URL the render paints when the id is absent on the site (the renders'
//                   "id wins, URL falls back" rule), so the element renders on every site;
//   not-a-reference a number under a reference-like key that names no database object (listed in NOT_REFS, with why);
//   bare            an id with no fallback: the block renders empty on a site without that object. --check fails on it.
// A bare reference --fix cannot map to a role (its value is none of the home refs' ids) is `unrecognised`.
import { ROLES, TOKEN } from './calibration-refs.mjs';

// Keys whose value is a site object id: id, ref, a camelCase name ending in Id, Ids or Ref, and WooCommerce's
// hand-picked product list.
export const REF_KEY = /^(?:id|ref)$|[a-z](?:Id|Ids|Ref)$|HandPickedProducts$/;
// A menu item named by id ("id:195"), as a value or an object key.
export const ITEM_STRING = /\bid:(\d+)\b/;
// Reference-like keys that name no database object.
export const NOT_REFS = {
	queryId: 'a query loop block\'s own instance number (woocommerce/product-collection keeps paging apart with it), not a database id',
	nextStepId: 'a choice-flow option\'s target step, stored as the step\'s position in the flow (choice-flow/edit.js), not a database id',
};
// The dumb wide enumeration (the corpus control): every positive whole number, or string of digits, under a key whose
// name contains id, ref or product in any case. WIDE_OK lists the keys it catches that hold no reference.
export const WIDE_KEY = /id|ref|product/i;
export const WIDE_OK = {
	drawingImageWidth: 'the drawing\'s width in pixels',
	freeDeliveryThresholdOverride: 'a money amount',
};

const isNum = ( v ) => ( Number.isInteger( v ) && v > 0 ) || ( 'string' === typeof v && /^\d+$/.test( v ) && Number( v ) > 0 );
const hasToken = ( s ) => 'string' === typeof s && /\{\{[A-Za-z]+(\.url)?(:text)?\}\}/.test( s );
const url = ( v ) => 'string' === typeof v && '' !== v.trim();

// The URL an attachment id falls back to in its own object: `url` beside `id`, or `<stem>Url` beside `<stem>Id`.
function fallbackUrlKey( key, parent ) {
	if ( ! parent || Array.isArray( parent ) ) {
		return null;
	}
	if ( 'id' === key && url( parent.url ) ) {
		return 'url';
	}
	const stem = key.match( /^(.*)Id$/ )?.[ 1 ];
	return stem && url( parent[ `${ stem }Url` ] ) ? `${ stem }Url` : null;
}

// Every reference-shaped value in the fixtures: [ { block, path, key, value, category, reason } ]. `path` is a list of
// keys from the block's fixture; `key` is the object key holding the value (an array element's key is its array's).
export function survey( fixtures ) {
	const out = [];
	for ( const [ block, fixture ] of Object.entries( fixtures ) ) {
		const go = ( v, p, key, parent ) => {
			if ( Array.isArray( v ) ) {
				v.forEach( ( x, i ) => go( x, [ ...p, i ], key, v ) );
				return;
			}
			if ( v && 'object' === typeof v ) {
				for ( const [ k, x ] of Object.entries( v ) ) {
					if ( hasToken( k ) ) {
						out.push( { block, path: [ ...p, k ], key: k, value: k, category: 'token', where: 'key' } );
					} else if ( ITEM_STRING.test( k ) ) {
						out.push( { block, path: [ ...p, k ], key: k, value: k, category: 'bare', where: 'key', reason: 'a menu item named by id in an object key' } );
					}
					go( x, [ ...p, k ], k, v );
				}
				return;
			}
			if ( hasToken( v ) ) {
				out.push( { block, path: p, key, value: v, category: 'token' } );
			} else if ( 'string' === typeof v && ITEM_STRING.test( v ) ) {
				out.push( { block, path: p, key, value: v, category: 'bare', reason: 'a menu item named by id' } );
			} else if ( key && REF_KEY.test( key ) && isNum( v ) ) {
				const fb = Array.isArray( parent ) ? null : fallbackUrlKey( key, parent );
				if ( NOT_REFS[ key ] ) {
					out.push( { block, path: p, key, value: v, category: 'not-a-reference', reason: NOT_REFS[ key ] } );
				} else if ( fb ) {
					out.push( { block, path: p, key, value: v, category: 'url-backed', reason: `the render paints ${ fb } when the id is absent on the site` } );
				} else {
					out.push( { block, path: p, key, value: v, category: 'bare', reason: 'an id with no URL fallback' } );
				}
			}
		};
		go( fixture, [], null, null );
	}
	return out;
}

// The corpus control: the wide enumeration's hits that the survey did not classify and WIDE_OK does not explain.
export function unexplainedWide( fixtures, found = survey( fixtures ) ) {
	const seen = new Set( found.map( ( f ) => `${ f.block }|${ JSON.stringify( f.path ) }` ) );
	const out = [];
	for ( const [ block, fixture ] of Object.entries( fixtures ) ) {
		const go = ( v, p, key ) => {
			if ( Array.isArray( v ) ) {
				return v.forEach( ( x, i ) => go( x, [ ...p, i ], key ) );
			}
			if ( v && 'object' === typeof v ) {
				return Object.entries( v ).forEach( ( [ k, x ] ) => go( x, [ ...p, k ], k ) );
			}
			if ( key && WIDE_KEY.test( key ) && isNum( v ) && ! WIDE_OK[ key ] && ! seen.has( `${ block }|${ JSON.stringify( p ) }` ) ) {
				out.push( { block, path: p, key, value: v } );
			}
		};
		go( fixture, [], null );
	}
	return out;
}

// Counts per category.
export const tally = ( found ) => found.reduce( ( a, f ) => ( { ...a, [ f.category ]: ( a[ f.category ] || 0 ) + 1 } ), {} );

// The role whose id is `value` in the home refs (the target the literal ids were written for), or null.
function roleOfId( value, refs ) {
	const hits = Object.keys( ROLES ).filter( ( r ) => Number( value ) === ( refs[ r ] && 'object' === typeof refs[ r ] ? refs[ r ].id : refs[ r ] ) );
	return 1 === hits.length ? hits[ 0 ] : null;
}

// Shape-to-shape transform: every bare reference whose value is a home-refs id becomes that role's token, keeping the
// value's own shape ("id:195" -> "id:{{menuItem}}", 71 -> "{{product}}", "71" -> "{{product:text}}"); a url-backed id
// that is a home-refs role with a URL becomes the token, and its fallback URL becomes "{{role.url}}" when it is the
// role's URL. Returns { fixtures, changes: [ { block, path, from, to } ], unrecognised: [ survey rows ] }.
export function transform( fixtures, homeRefs ) {
	const next = structuredClone( fixtures );
	const changes = [];
	const unrecognised = [];
	const at = ( block, p ) => p.slice( 0, -1 ).reduce( ( o, k ) => o[ k ], next[ block ] );
	const set = ( block, p, to ) => {
		const holder = at( block, p );
		changes.push( { block, path: p, from: holder[ p.at( -1 ) ], to } );
		holder[ p.at( -1 ) ] = to;
	};
	const renameKey = ( block, p, to ) => {
		const holder = at( block, p );
		const old = p.at( -1 );
		const entries = Object.entries( holder ).map( ( [ k, v ] ) => [ k === old ? to : k, v ] );
		Object.keys( holder ).forEach( ( k ) => delete holder[ k ] );
		entries.forEach( ( [ k, v ] ) => ( holder[ k ] = v ) );
		changes.push( { block, path: p, from: old, to, key: true } );
	};
	// Keys are renamed last and deepest first, so earlier paths stay valid.
	const rows = survey( fixtures ).filter( ( f ) => 'bare' === f.category || 'url-backed' === f.category );
	for ( const f of rows.filter( ( r ) => 'key' !== r.where ) ) {
		const item = 'string' === typeof f.value ? f.value.match( ITEM_STRING ) : null;
		if ( item ) {
			const role = roleOfId( item[ 1 ], homeRefs );
			role ? set( f.block, f.path, f.value.replace( ITEM_STRING, `id:{{${ role }}}` ) ) : unrecognised.push( f );
			continue;
		}
		const role = roleOfId( f.value, homeRefs );
		if ( ! role ) {
			'bare' === f.category && unrecognised.push( f );
			continue;
		}
		if ( 'url-backed' === f.category && ! ROLES[ role ].url ) {
			continue;
		}
		set( f.block, f.path, 'string' === typeof f.value ? `{{${ role }:text}}` : `{{${ role }}}` );
		const parentPath = f.path.slice( 0, -1 );
		const fb = fallbackUrlKey( f.key, parentPath.reduce( ( o, k ) => o[ k ], fixtures[ f.block ] ) );
		if ( fb && homeRefs[ role ]?.url === parentPath.reduce( ( o, k ) => o[ k ], fixtures[ f.block ] )[ fb ] ) {
			set( f.block, [ ...parentPath, fb ], `{{${ role }.url}}` );
		}
	}
	for ( const f of rows.filter( ( r ) => 'key' === r.where ).sort( ( a, b ) => b.path.length - a.path.length ) ) {
		const role = roleOfId( f.value.match( ITEM_STRING )[ 1 ], homeRefs );
		role ? renameKey( f.block, f.path, f.value.replace( ITEM_STRING, `id:{{${ role }}}` ) ) : unrecognised.push( f );
	}
	return { fixtures: next, changes, unrecognised };
}

// Why the fixtures fail the check: a bare reference, a token naming a role outside the vocabulary, or a wide-enumeration
// hit nothing explains. Empty when clean.
export function checkFixtureRefs( fixtures ) {
	const found = survey( fixtures );
	const problems = found.filter( ( f ) => 'bare' === f.category ).map( ( f ) => `calibration-fixtures.json ${ f.block } ${ f.path.join( '.' ) } = ${ JSON.stringify( f.value ) }: ${ f.reason } (name it with a token, lib/calibration-refs.mjs)` );
	for ( const f of found.filter( ( x ) => 'token' === x.category ) ) {
		for ( const m of String( f.value ).matchAll( TOKEN ) ) {
			ROLES[ m[ 1 ] ] || problems.push( `calibration-fixtures.json ${ f.block } ${ f.path.join( '.' ) } names role ${ m[ 1 ] }, which lib/calibration-refs.mjs::ROLES does not define` );
			m[ 2 ] && ! ROLES[ m[ 1 ] ]?.url && problems.push( `calibration-fixtures.json ${ f.block } ${ f.path.join( '.' ) } asks for ${ m[ 1 ] }.url, a role with no URL` );
		}
	}
	unexplainedWide( fixtures, found ).forEach( ( w ) => problems.push( `calibration-fixtures.json ${ w.block } ${ w.path.join( '.' ) } = ${ JSON.stringify( w.value ) }: a number under a reference-like key that the detector does not classify (add the key to NOT_REFS or WIDE_OK with the reason, or treat it as a reference)` ) );
	return problems;
}
