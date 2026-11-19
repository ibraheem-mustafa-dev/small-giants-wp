// The foundation command's preflight (build-foundation.mjs): every check that, failing, would waste an hour of the run, made before the first
// step and each reported in one line. The guard comes first (a protected site is refused before any slow or networked check), then the local
// files, then the machine (free space, WSL), then the one check that contacts the site (its own working application password).
//   - target: the site is a known target, is not protected, and a scratch copy runs from a worktree (lib/site-targets.mjs).
//   - handoff: sites/<client>/handoff/MANIFEST.json exists.
//   - divergences: sites/<client>/build/qa/divergences.json, when there is one, names only the rules lib/ledger.mjs::RULES holds.
//   - disk: the drive the checkout sits on, and any named in SGS_FREE_SPACE_PATHS, holds at least MIN_FREE_GB free (a scratch copy, a plugin build
//     and a calibration each grow the WSL disk and the worktree; the drive filled on 2026-11-19).
//   - wsl: a WSL site's distribution answers a trivial command within the probe's time.
//   - password: the site's secrets file names a user and an application password and the site's REST API accepts them.
// `probes` are the injected readers (`freeBytes( dir )`, `wslAnswers( distro )`, `credentials( site )`, `restCheck( creds )`); `deep: false` (the
// plan) makes no machine or site probe. Each check resolves { id, ok, detail, next?, skipped? }; runPreflight resolves the list and stops at the first
// failure of the guard.
import fs from 'fs';
import path from 'path';
import { validate } from './ledger.mjs';
import { assertScratchRunPlace, assertUnprotected, targetOf } from './site-targets.mjs';

export const MIN_FREE_GB = 20;
const GB = 1024 ** 3;

// The WSL distribution a target's plugin folder sits in (`//wsl.localhost/<distro>/...`), or null for a hosted site.
export const distroOf = ( target ) => /^\/\/wsl\.localhost\/([^/]+)\//.exec( String( target?.pluginDir ?? '' ) )?.[ 1 ] ?? null;

const pass = ( id, detail ) => ( { id, ok: true, detail } );
const fail = ( id, detail, next ) => ( { id, ok: false, detail, next } );
const skipped = ( id, detail ) => ( { id, ok: true, skipped: true, detail } );

export async function runPreflight( { client, site, repo, targets, probes, deep = true, env = process.env, minFreeGb = MIN_FREE_GB } ) {
	const out = [];
	const add = ( c ) => {
		out.push( c );
		return c.ok;
	};
	let target;
	try {
		target = targetOf( site, targets );
		assertUnprotected( site, targets );
		assertScratchRunPlace( site, repo );
		add( pass( 'target', `${ site } is a known, unprotected site${ distroOf( target ) ? ' (a WSL copy)' : ' (hosted)' }` ) );
	} catch ( e ) {
		add( fail( 'target', e.message, 'name a site in calibration-targets.json that is not protected (a scratch copy: node scripts/computed-route/tools/scratch-target.mjs add <name> --source <mirror> --url http://localhost:<port>)' ) );
		return out;
	}
	const manifest = path.join( repo, 'sites', client, 'handoff', 'MANIFEST.json' );
	add( fs.existsSync( manifest ) ? pass( 'handoff', `sites/${ client }/handoff/MANIFEST.json is there` ) : fail( 'handoff', `sites/${ client }/handoff/MANIFEST.json is missing`, `put the Claude Design export in sites/${ client }/handoff/ unchanged` ) );
	const ledger = path.join( repo, 'sites', client, 'build', 'qa', 'divergences.json' );
	if ( fs.existsSync( ledger ) ) {
		try {
			validate( JSON.parse( fs.readFileSync( ledger, 'utf8' ) ) );
			add( pass( 'divergences', 'every entry names a rule the route holds' ) );
		} catch ( e ) {
			add( fail( 'divergences', String( e.message ).replace( /\s+/g, ' ' ).slice( 0, 500 ), `fix sites/${ client }/build/qa/divergences.json: an \`expected.rule\` must be a key of lib/ledger.mjs RULES` ) );
		}
	} else {
		add( skipped( 'divergences', 'the client has no divergence list' ) );
	}
	if ( ! deep ) {
		[ 'disk', 'wsl', 'password' ].forEach( ( id ) => add( skipped( id, 'not checked in --plan' ) ) );
		return out;
	}
	const dirs = [ repo, ...String( env.SGS_FREE_SPACE_PATHS ?? '' ).split( path.delimiter ).filter( Boolean ) ];
	const free = dirs.map( ( d ) => ( { d, bytes: probes.freeBytes( d ) } ) );
	const low = free.filter( ( f ) => f.bytes < minFreeGb * GB );
	add( low.length
		? fail( 'disk', `${ low.map( ( f ) => `${ ( f.bytes / GB ).toFixed( 1 ) } GB free on ${ f.d }` ).join( ', ' ) } (at least ${ minFreeGb } GB is needed)`, 'free space: drop finished scratch copies (scripts/local-wp/scratch-mirror.sh drop <name>) and finished worktrees' )
		: pass( 'disk', free.map( ( f ) => `${ ( f.bytes / GB ).toFixed( 0 ) } GB free on ${ f.d }` ).join( ', ' ) ) );
	const distro = distroOf( target );
	if ( distro ) {
		add( await probes.wslAnswers( distro ) ? pass( 'wsl', `${ distro } answers` ) : fail( 'wsl', `${ distro } did not answer a trivial command`, `restart WSL with wsl --shutdown, then start its services: wsl -d ${ distro } -u root -- bash -lc "service mariadb start; service apache2 start"` ) );
	} else {
		add( skipped( 'wsl', 'a hosted site' ) );
	}
	try {
		const creds = probes.credentials( site );
		const r = await probes.restCheck( creds );
		add( r.ok ? pass( 'password', `${ site }'s application password is accepted (${ r.detail })` ) : fail( 'password', `${ site }'s REST API refused its application password (${ r.detail })`, /^local-mediatest/.test( site ) ? `give the copy its own: wsl -d Ubuntu -u root -- bash <worktree>/scripts/local-wp/scratch-mirror.sh secrets ${ site }` : `make a new application password for the user in .claude/secrets/${ site }.env` ) );
	} catch ( e ) {
		add( fail( 'password', e.message, `check .claude/secrets/${ site }.env (WP_URL_, WP_USER_ and WP_APP_PWD_ for ${ site })` ) );
	}
	return out;
}
