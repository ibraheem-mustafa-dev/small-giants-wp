// Layout trees: read, write, ref classes, setting writes, and the live-site safety guard (R-47-11).
// A tree is wp-build-page.js's input: an array of { name, attributes, innerBlocks } nodes.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

export const REF_PREFIX = 'cr-ref-';

// R-47-11: never written, whatever a manifest says. Canary homepage and posts page, and the motion-QA fixtures.
export const FORBIDDEN_POSTS = [ 2742, 2741, 2103, 2109, 2113, 2603, 2740, 3037 ];

export function readTree( file ) {
	const t = JSON.parse( fs.readFileSync( path.resolve( file ), 'utf8' ) );
	if ( ! Array.isArray( t ) ) {
		throw new Error( `${ file }: a tree is an array of blocks` );
	}
	return t;
}

export function writeTree( file, tree ) {
	fs.writeFileSync( path.resolve( file ), JSON.stringify( tree, null, 2 ) + '\n' );
}

// Depth-first walk: fn( node, index, parent ). The index is the node's depth-first position, the ref number.
export function walk( tree, fn ) {
	let i = 0;
	const go = ( nodes, parent ) => nodes.forEach( ( n ) => {
		fn( n, i++, parent );
		go( n.innerBlocks || [], n );
	} );
	go( tree, null );
}

const classes = ( n ) => String( n.attributes?.className || '' ).split( /\s+/ ).filter( Boolean );
export const refOf = ( n ) => classes( n ).find( ( c ) => c.startsWith( REF_PREFIX ) ) || null;

// Adds cr-ref-<surface>-<n> to every node that lacks a ref, appended to its className. n continues past the
// highest number the surface already uses, so a node added to a numbered tree never takes a number in use (its
// depth-first index can belong to the node it pushed down); on an unnumbered tree that is the depth-first index.
// Returns how many nodes it marked.
export function addRefs( tree, surface ) {
	const prefix = `${ REF_PREFIX }${ surface }-`;
	let next = 0;
	walk( tree, ( n ) => {
		const ref = refOf( n );
		const k = ref && ref.startsWith( prefix ) ? Number( ref.slice( prefix.length ) ) : NaN;
		if ( Number.isInteger( k ) && k >= next ) {
			next = k + 1;
		}
	} );
	let added = 0;
	walk( tree, ( n ) => {
		if ( refOf( n ) ) {
			return;
		}
		n.attributes = n.attributes || {};
		n.attributes.className = [ ...classes( n ), `${ prefix }${ next++ }` ].join( ' ' );
		added++;
	} );
	return added;
}

// Removes every ref class (a site's final build); a className left empty is dropped.
export function stripRefs( tree ) {
	walk( tree, ( n ) => {
		if ( ! n.attributes || undefined === n.attributes.className ) {
			return;
		}
		const rest = classes( n ).filter( ( c ) => ! c.startsWith( REF_PREFIX ) );
		if ( rest.length ) {
			n.attributes.className = rest.join( ' ' );
		} else {
			delete n.attributes.className;
		}
	} );
	return tree;
}

export function nodeByRef( tree, ref ) {
	let hit = null;
	walk( tree, ( n ) => {
		if ( ! hit && refOf( n ) === ref ) {
			hit = n;
		}
	} );
	return hit;
}

const isObj = ( v ) => v && typeof v === 'object' && ! Array.isArray( v );
function deepMerge( base, patch ) {
	const out = isObj( base ) ? { ...base } : {};
	for ( const [ k, v ] of Object.entries( patch ) ) {
		out[ k ] = isObj( v ) && isObj( out[ k ] ) ? deepMerge( out[ k ], v ) : v;
	}
	return out;
}

// Applies one resolver write to a node: 'deep' merges into what is there (other tiers and sides are kept), 'replace'
// sets the value. Returns { before, after } for the report.
export function setAttr( node, write ) {
	node.attributes = node.attributes || {};
	const before = node.attributes[ write.attr ];
	const after = 'deep' === write.merge && isObj( write.value ) ? deepMerge( before, write.value ) : write.value;
	node.attributes[ write.attr ] = after;
	return { before: undefined === before ? null : before, after };
}

// The manifests that name writable targets. calibration-targets.json: { site: { envFile, envKey, postId, posts? } };
// surfaces.json: { surface: { envFile, target: { postId } | { templatePart } | { template } } }.
export function writableTargets( { calibrationTargets = {}, surfaces = {} } ) {
	const posts = new Set();
	const templates = new Set();
	for ( const c of Object.values( calibrationTargets ) ) {
		[ c.postId, ...Object.values( c.posts || {} ) ].filter( Boolean ).forEach( ( p ) => posts.add( Number( p ) ) );
	}
	for ( const s of Object.values( surfaces ) ) {
		if ( s.target?.postId ) {
			posts.add( Number( s.target.postId ) );
		}
		const slug = s.target?.templatePart || s.target?.template;
		if ( slug ) {
			templates.add( slug );
		}
	}
	return { posts, templates };
}

// R-47-11: throws unless the target is in a manifest and never a forbidden post. target: { postId } | { templatePart } | { template }.
export function assertWritable( target, manifests ) {
	const { posts, templates } = writableTargets( manifests );
	if ( target.postId ) {
		const id = Number( target.postId );
		if ( FORBIDDEN_POSTS.includes( id ) ) {
			throw new Error( `R-47-11: post ${ id } is the canary homepage, posts page or a motion-QA fixture; never written` );
		}
		if ( ! posts.has( id ) ) {
			throw new Error( `R-47-11: post ${ id } is in neither calibration-targets.json nor surfaces.json` );
		}
		return true;
	}
	const slug = target.templatePart || target.template;
	if ( slug && templates.has( slug ) ) {
		return true;
	}
	throw new Error( `R-47-11: target ${ JSON.stringify( target ) } is in neither manifest` );
}

// R-47-11: no deploy or reseed running on the host. build-deploy.py keeps no lock file, so this reads the host's
// process list for its tar/rsync/wp steps and the local one for a running build-deploy.py or framework reseed.
export function assertQuiet( sshArgs = [ '-i', path.join( process.env.HOME || process.env.USERPROFILE, '.ssh', 'id_ed25519' ), '-p', '65002', '-o', 'ConnectTimeout=20', 'u945238940@141.136.39.73' ] ) {
	// sshArgs null: a local mirror, no remote host to check.
	const remote = null === sshArgs ? '' : execFileSync( 'ssh', [ ...sshArgs, "ps -eo args | grep -E '^(tar|rsync) ' | grep -v grep || true" ], { encoding: 'utf8', timeout: 60000 } ).trim();
	if ( remote ) {
		throw new Error( `R-47-11: the host is busy (a deploy is unpacking):\n${ remote }` );
	}
	const local = process.platform === 'win32'
		// Full path: a Git Bash parent leaves PowerShell off PATH.
		? execFileSync( path.join( process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe' ), [ '-NoProfile', '-Command', "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match '^\"?[^ ]*python[^ ]*\"? .*(build-deploy\\.py|sgs-update|seed-)' } | ForEach-Object { $_.CommandLine }" ], { encoding: 'utf8', timeout: 60000 } ).trim()
		: execFileSync( 'sh', [ '-c', "ps -eo args | grep -E 'build-deploy\\.py|sgs-update|seed-' | grep -v grep || true" ], { encoding: 'utf8' } ).trim();
	if ( local ) {
		throw new Error( `R-47-11: a deploy or reseed is running on this machine:\n${ local }` );
	}
	return true;
}


// Every ref with the refs of its ancestors (not itself), nearest last: the regression guard explains a row by a
// pinned write on an ancestor before blaming the row's own node.
export function refAncestors( tree ) {
	const out = new Map();
	const go = ( nodes, chain ) => nodes.forEach( ( n ) => {
		const r = refOf( n );
		if ( r ) {
			out.set( r, chain );
		}
		go( n.innerBlocks || [], r ? [ ...chain, r ] : chain );
	} );
	go( tree, [] );
	return out;
}
