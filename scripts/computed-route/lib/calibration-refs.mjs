// Site references in calibration fixtures (Spec 48 §3.2). A fixture names a WordPress object it needs (a menu, a menu
// item, a drawer post, an attachment, a product) by a token such as "{{menu}}"; each calibration target maps the token to
// its own object in calibration-targets.json `refs`, so one fixture renders on every site that supplies its references.
//   "{{role}}"        the whole string becomes the role's id as a number
//   "{{role:text}}"   the whole string becomes the role's id as text (an attribute that stores ids as strings)
//   "{{role.url}}"    the role's URL (a media role written as { "id", "url" })
//   "id:{{role}}"     a token inside a longer string, or inside an object key, is replaced by the id's text
// A block whose fixture names a role its target does not supply, or whose object no longer exists on the site, is not
// calibrated: it is reported with the reason, and never rendered with an unresolved token.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { SSH, hostedRoot } from './deploy-hash.mjs';

export { hostedRoot };

// The token vocabulary: each role and the object kind its id must name on the site.
export const ROLES = {
	menu: { kind: 'term', taxonomy: 'nav_menu', what: 'a navigation menu (nav_menu term)' },
	menuItem: { kind: 'post', postType: 'nav_menu_item', inMenu: 'menu', what: 'a top-level menu item of the menu role, with no children' },
	drawer: { kind: 'post', postType: 'sgs_drawer', what: 'an sgs_drawer post' },
	image: { kind: 'post', postType: 'attachment', url: true, what: 'an image attachment, with its URL' },
	logo: { kind: 'post', postType: 'attachment', what: 'an image attachment used as a logo' },
	product: { kind: 'post', postType: 'product', what: 'a published WooCommerce product' },
};

export const TOKEN = /\{\{([A-Za-z]+)(\.url)?(:text)?\}\}/g;
const WHOLE = /^\{\{([A-Za-z]+)(\.url)?(:text)?\}\}$/;
const HAS_TOKEN = /\{\{[A-Za-z]+(\.url)?(:text)?\}\}/;

// A target's refs: its own, over the refs of the test site it mirrors (a refreshed mirror holds the same IDs).
export function refsFor( targets, site ) {
	const t = targets[ site ] || {};
	const inherited = t.mirrorOf ? targets[ t.mirrorOf ]?.refs || {} : {};
	return { ...inherited, ...( t.refs || {} ) };
}

const idOf = ( v ) => ( v && 'object' === typeof v ? v.id : v );
// The value one token stands for, or undefined when the target does not supply it.
function valueFor( refs, role, url ) {
	const v = refs[ role ];
	if ( url ) {
		return v && 'object' === typeof v && 'string' === typeof v.url && v.url ? v.url : undefined;
	}
	const id = idOf( v );
	return Number.isInteger( id ) && id > 0 ? id : undefined;
}

// Every token a value carries, in its strings and its object keys, as "role" or "role.url".
export function tokensIn( value ) {
	const out = new Set();
	const scan = ( s ) => {
		for ( const m of String( s ).matchAll( TOKEN ) ) {
			out.add( m[ 1 ] + ( m[ 2 ] || '' ) );
		}
	};
	const go = ( v ) => {
		if ( Array.isArray( v ) ) {
			v.forEach( go );
		} else if ( v && 'object' === typeof v ) {
			Object.entries( v ).forEach( ( [ k, x ] ) => {
				scan( k );
				go( x );
			} );
		} else if ( 'string' === typeof v ) {
			scan( v );
		}
	};
	go( value );
	return [ ...out ].sort();
}

// The roles a fixture needs (without the ".url" field).
export const fixtureRoles = ( fixture ) => [ ...new Set( tokensIn( fixture ).map( ( t ) => t.replace( /\.url$/, '' ) ) ) ].sort();

// The fixture with every token replaced from refs: { fixture, missing }. `missing` lists each token the refs do not
// supply (or a role outside the vocabulary); when it is not empty, `fixture` is null.
export function resolveFixture( fixture, refs ) {
	const missing = new Set();
	const sub = ( s ) => {
		const whole = s.match( WHOLE );
		if ( whole ) {
			const [ , role, url, text ] = whole;
			const v = ROLES[ role ] ? valueFor( refs, role, url ) : undefined;
			if ( undefined === v ) {
				missing.add( role + ( url || '' ) );
				return s;
			}
			return text ? String( v ) : v;
		}
		return s.replace( TOKEN, ( all, role, url ) => {
			const v = ROLES[ role ] ? valueFor( refs, role, url ) : undefined;
			if ( undefined === v ) {
				missing.add( role + ( url || '' ) );
				return all;
			}
			return String( v );
		} );
	};
	const go = ( v ) => {
		if ( Array.isArray( v ) ) {
			return v.map( go );
		}
		if ( v && 'object' === typeof v ) {
			return Object.fromEntries( Object.entries( v ).map( ( [ k, x ] ) => [ HAS_TOKEN.test( k ) ? String( sub( k ) ) : k, go( x ) ] ) );
		}
		return 'string' === typeof v ? sub( v ) : v;
	};
	const out = go( fixture );
	return missing.size ? { fixture: null, missing: [ ...missing ].sort() } : { fixture: out, missing: [] };
}

// PHP that reports, for each { role: { id, kind, taxonomy, postType, menu } }, true when the object exists on the site
// with the right kind, else the reason. Read-only.
export function existencePhp( checks ) {
	const data = Buffer.from( JSON.stringify( checks ) ).toString( 'base64' );
	return `$c = json_decode( base64_decode( '${ data }' ), true ); $o = array();
foreach ( $c as $role => $r ) {
	$id = (int) $r['id'];
	if ( 'term' === $r['kind'] ) {
		$t = get_term( $id, $r['taxonomy'] );
		$o[ $role ] = ( $t && ! is_wp_error( $t ) ) ? true : "no {$r['taxonomy']} term {$id}";
		continue;
	}
	$p = get_post( $id );
	if ( ! $p ) { $o[ $role ] = "no post {$id}"; continue; }
	if ( $p->post_type !== $r['postType'] ) { $o[ $role ] = "post {$id} has post type {$p->post_type}, not {$r['postType']}"; continue; }
	if ( 'trash' === $p->post_status ) { $o[ $role ] = "post {$id} is in the trash"; continue; }
	if ( ! empty( $r['menu'] ) && ! is_object_in_term( $id, 'nav_menu', (int) $r['menu'] ) ) { $o[ $role ] = "menu item {$id} is not in menu {$r['menu']}"; continue; }
	$o[ $role ] = true;
}
echo wp_json_encode( $o );`;
}

// The existence check of each role: { role: true | reason }. `runPhp(code)` runs read-only PHP on the target and returns
// its output (wpEvalRunner on a real site; a fake in the tests). A role the refs do not supply is not checked here.
export function checkRefsExist( refs, roles, runPhp ) {
	const checks = {};
	for ( const role of roles ) {
		const def = ROLES[ role ];
		const id = idOf( refs[ role ] );
		if ( def && Number.isInteger( id ) ) {
			checks[ role ] = { id, kind: def.kind, taxonomy: def.taxonomy || null, postType: def.postType || null, menu: def.inMenu ? idOf( refs[ def.inMenu ] ) ?? null : null };
		}
	}
	if ( ! Object.keys( checks ).length ) {
		return {};
	}
	let out;
	try {
		const text = String( runPhp( existencePhp( checks ) ) );
		out = JSON.parse( text.slice( text.indexOf( '{' ) ) );
	} catch ( e ) {
		const why = `the existence check could not run (${ String( e.message || e ).split( /\r?\n/ )[ 0 ] })`;
		return Object.fromEntries( Object.keys( checks ).map( ( r ) => [ r, why ] ) );
	}
	return Object.fromEntries( Object.keys( checks ).map( ( r ) => [ r, true === out[ r ] ? true : String( out[ r ] ?? 'not reported by the site' ) ] ) );
}

// Why a block's fixture cannot be calibrated on this target ('' when it can): a token the refs do not supply, or a
// referenced object the site does not hold. `exists` is checkRefsExist's result.
export function refsProblem( fixture, refs, exists = {}, site = 'this target' ) {
	const { missing } = resolveFixture( fixture, refs );
	if ( missing.length ) {
		return `the fixture needs references ${ site } does not supply: ${ missing.join( ', ' ) } (calibration-targets.json refs; provision-calibration-refs.mjs creates them)`;
	}
	const gone = fixtureRoles( fixture ).filter( ( r ) => true !== exists[ r ] ).map( ( r ) => `${ r } ${ JSON.stringify( idOf( refs[ r ] ) ) }: ${ exists[ r ] ?? 'not checked' }` );
	return gone.length ? `referenced objects missing on ${ site }: ${ gone.join( '; ' ) }` : '';
}

// Splits the blocks of a run: { ready: { block: resolved fixture }, blocked: [ { block, error } ] }. A block with no
// fixture is left to the caller's own no-fixture report.
export function refGate( blocks, fixtures, refs, exists, site ) {
	const ready = {};
	const blocked = [];
	for ( const b of blocks ) {
		if ( ! fixtures[ b ] ) {
			continue;
		}
		const why = refsProblem( fixtures[ b ], refs, exists, site );
		why ? blocked.push( { block: b, error: why } ) : ( ready[ b ] = resolveFixture( fixtures[ b ], refs ).fixture );
	}
	return { ready, blocked };
}

// How to run `wp` on a target: a WSL mirror (its pluginDir names the distro and root) or a hosted site over SSH.
export function wpCommand( target, site, repo ) {
	const wsl = String( target.pluginDir || '' ).match( /^\/\/wsl\.localhost\/([^/]+)(\/.+)\/wp-content\/plugins\/sgs-blocks\/?$/ );
	if ( wsl ) {
		return ( args, input ) => execFileSync( 'wsl', [ '-d', wsl[ 1 ], '-u', 'root', '--', 'wp', `--path=${ wsl[ 2 ] }`, '--allow-root', ...args ], { encoding: 'utf8', timeout: 120000, input } );
	}
	const root = hostedRoot( site, repo );
	const quote = ( a ) => `'${ String( a ).replace( /'/g, `'\\''` ) }'`;
	return ( args, input ) => execFileSync( 'ssh', [ ...SSH, `cd ${ quote( root ) } && wp ${ args.map( quote ).join( ' ' ) } --user=Claude` ], { encoding: 'utf8', timeout: 120000, input } );
}

// runPhp for checkRefsExist: the PHP goes in on stdin to `wp eval-file -`, so no shell quoting touches it.
export const wpEvalRunner = ( target, site, repo ) => {
	const wp = wpCommand( target, site, repo );
	return ( php ) => wp( [ 'eval-file', '-' ], `<?php\n${ php }\n` );
};
