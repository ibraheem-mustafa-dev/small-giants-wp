// The all-client regression sweep's library (tools/route-sweep.mjs): the saved records every client's surfaces are proposed
// from, the summary and node fingerprint one proposed surface leaves, and the comparison of two sweeps that fails a landing
// when any surface gets worse. Nothing here launches a browser or contacts a site; the command does the running.
//
// A records folder holds one folder per client: `<records>/<client>/build/` (a copy of the client's `sites/<client>/build/`
// inputs: surfaces.json, the page map, the media and menu maps, the catalogue, `intake/` (intake.json, facts.json,
// inventories/, replay/ ...) and `skeleton/` (each surface's inventory, decisions.json)), with a MANIFEST.json beside it
// naming each file's source and date. Each block's default look is not frozen: the sweep builds it from the checkout under
// test the first time a worker reads it (probeSweepLooks, sweepWorkerEnv), so a landing that changes a block's look is swept with that look. A sweep never reads the live `sites/<client>/build/`: `buildWork` lays the records
// and the committed draft (`sites/<client>/handoff/`) out as a scratch repository, which is what the propose and Fill read.
import fs from 'node:fs';
import path from 'node:path';

// Surfaces the route work never reads (the held-out pages): named exactly, never matched by part of a name, because a
// surface such as a mega menu may carry the same word without being the page.
export const HELD_OUT = [ 'about', 'food-service', 'contact' ];

// The top-level files of a client's build folder a propose or Fill does not read (the saved page trees, the origin and pairs
// files, generator scripts, notes).
const SKIP_TOP = /\.(origin|tree|pairs)\.json$|\.(py|php|md)$/;

const readJson = ( file, fallback = null ) => {
	try {
		return JSON.parse( fs.readFileSync( file, 'utf8' ) );
	} catch {
		return fallback;
	}
};

const copyFile = ( from, to ) => {
	fs.mkdirSync( path.dirname( to ), { recursive: true } );
	fs.copyFileSync( from, to );
};

// Every file under `dir` as paths relative to it.
export function filesUnder( dir ) {
	const out = [];
	const walk = ( d ) => {
		for ( const e of fs.existsSync( d ) ? fs.readdirSync( d, { withFileTypes: true } ) : [] ) {
			const p = path.join( d, e.name );
			e.isDirectory() ? walk( p ) : out.push( path.relative( dir, p ).split( path.sep ).join( '/' ) );
		}
	};
	walk( dir );
	return out.sort();
}

// Whether a file named `name` in a build folder belongs to a held-out surface: the skeleton files `<surface>.<kind>.json`
// and the intake inventory `page-<surface>.json` of a held-out page.
export function heldOutFile( name, heldOut = HELD_OUT ) {
	const base = path.posix.basename( name );
	return heldOut.some( ( s ) => base.startsWith( `${ s }.` ) || base === `page-${ s }.json` || base === `page-${ s }-dc-html.json` );
}

// The files of one source build folder a frozen copy holds, as paths relative to the build folder: the small records at the
// top, intake (without the held-out pages' inventories), and the skeleton folder's inventories and saved decisions.
export function freezeFiles( buildDir, heldOut = HELD_OUT ) {
	return filesUnder( buildDir ).filter( ( f ) => {
		const [ top, second ] = f.split( '/' );
		if ( f.includes( '/' ) ) {
			if ( 'intake' === top ) {
				return ! ( 'inventories' === second && heldOutFile( f, heldOut ) ) && ! /\.prev\.json$/.test( f );
			}
			if ( 'skeleton' === top ) {
				return ( /\.inventory\.json$/.test( f ) || /^skeleton\/(decisions|picks|built-surfaces)\.json$/.test( f ) || /\.picks\.json$/.test( f ) ) && ! heldOutFile( f, heldOut );
			}
			return false;
		}
		return ! SKIP_TOP.test( f ) && ! f.startsWith( '.' );
	} );
}

const mtimeOf = ( file ) => fs.statSync( file ).mtime.toISOString();

// Copies one client's records into `<dest>/<client>`: the files of `sources` (a list of { dir, label, only }, copied in order,
// a later source replacing an earlier file of the same name). Returns the client's manifest: every file with its source and
// the source file's date.
export function freezeClient( { dest, client, sources, heldOut = HELD_OUT, now = new Date() } ) {
	const root = path.join( dest, client );
	const files = {};
	for ( const s of sources ) {
		for ( const f of freezeFiles( s.dir, heldOut ).filter( ( x ) => ! s.only || s.only.test( x ) ) ) {
			const to = path.join( root, 'build', f );
			copyFile( path.join( s.dir, f ), to );
			files[ `build/${ f }` ] = { source: s.label, date: mtimeOf( path.join( s.dir, f ) ) };
		}
	}
	const manifest = { client, frozenAt: now.toISOString(), heldOut, files };
	fs.writeFileSync( path.join( root, 'MANIFEST.json' ), `${ JSON.stringify( manifest, null, 1 ) }\n` );
	return manifest;
}

// The clients a records folder holds: its subfolders that carry build/surfaces.json.
export function recordClients( records ) {
	return fs.existsSync( records ) ? fs.readdirSync( records ).filter( ( c ) => fs.existsSync( path.join( records, c, 'build', 'surfaces.json' ) ) ).sort() : [];
}

// The surfaces of one client to propose: every inventory in the frozen skeleton folder, less the held-out ones, sorted.
export function surfaceList( records, client, heldOut = HELD_OUT ) {
	const dir = path.join( records, client, 'build', 'skeleton' );
	return ( fs.existsSync( dir ) ? fs.readdirSync( dir ) : [] ).filter( ( f ) => f.endsWith( '.inventory.json' ) ).map( ( f ) => f.replace( /\.inventory\.json$/, '' ) ).filter( ( s ) => ! heldOut.includes( s ) ).sort();
}

// The scratch repository one client's surfaces are proposed in: `<work>/sites/<client>/build` (a copy of the records),
// `<work>/sites/<client>/handoff` and `theme-snapshot.json` (copied from `repo`, the checkout under test: the committed draft
// is the draft). Replaces any earlier copy. Returns the work folder (the `repo` of proposeSurface and fillSurface).
export function buildWork( { records, client, repo, work } ) {
	const site = path.join( work, 'sites', client );
	fs.rmSync( site, { recursive: true, force: true } );
	fs.cpSync( path.join( records, client, 'build' ), path.join( site, 'build' ), { recursive: true } );
	const handoff = path.join( repo, 'sites', client, 'handoff' );
	fs.existsSync( handoff ) && fs.cpSync( handoff, path.join( site, 'handoff' ), { recursive: true } );
	const snapshot = path.join( repo, 'sites', client, 'theme-snapshot.json' );
	fs.existsSync( snapshot ) && copyFile( snapshot, path.join( site, 'theme-snapshot.json' ) );
	copyCheckoutFiles( { repo, work } );
	return work;
}

// The checkout's files the propose reads by their place under the repository: every block.json (`plugins/sgs-blocks/src/blocks/<block>/block.json`:
// lib/skeleton-facts.mjs::loadFacts reads the list block's item properties from it) and the plugin's PHP includes (the account
// block's wording class, data/account-parts.json `stringsSource`), laid out in the work folder.
export function copyCheckoutFiles( { repo, work } ) {
	const includes = path.join( repo, 'plugins', 'sgs-blocks', 'includes' );
	fs.existsSync( includes ) && fs.cpSync( includes, path.join( work, 'plugins', 'sgs-blocks', 'includes' ), { recursive: true } );
	const blocks = path.join( repo, 'plugins', 'sgs-blocks', 'src', 'blocks' );
	for ( const e of fs.existsSync( blocks ) ? fs.readdirSync( blocks, { withFileTypes: true } ) : [] ) {
		const f = path.join( blocks, e.name, 'block.json' );
		e.isDirectory() && fs.existsSync( f ) && copyFile( f, path.join( work, 'plugins', 'sgs-blocks', 'src', 'blocks', e.name, 'block.json' ) );
	}
}

// The kind of a problem line: the message with its draft key (`Root/12#0: `) cut off and every number and quoted value
// replaced, cut to its first four words, so the lines of one cause group together.
export function problemKind( line ) {
	const text = String( typeof line === 'string' ? line : JSON.stringify( line ) ).replace( /^\S+#\d+(?:\/\S+)?:\s+/, '' ).replace( /"[^"]*"|'[^']*'|\d+(?:\.\d+)?/g, '#' );
	return text.split( /\s+/ ).slice( 0, 4 ).join( ' ' );
}

const lineOf = ( p ) => ( typeof p === 'string' ? p : JSON.stringify( p ) );

// Splits a propose's problem lines into real route faults and hand-overs. A hand-over is a line the carried-ids machinery wrote
// (lib/skeleton-write-content.mjs::carriedAttrs and the filter rail's attribute ids, both through lib/skeleton-carried.mjs::carriedIds):
// an id only a live run can make (a menu item, a logo attachment, a product) that the saved records do not hold yet. `real` is the
// same surface proposed with the carried ids switched off, which removes exactly those lines; a line the carry-less run also writes
// is a real fault, and every other line of `all` is a hand-over. Each line counts once (a repeated line is matched one for one).
export function splitProblems( all, real ) {
	const left = new Map();
	( real || [] ).map( lineOf ).forEach( ( l ) => left.set( l, ( left.get( l ) || 0 ) + 1 ) );
	const out = { real: [], handovers: [] };
	for ( const l of ( all || [] ).map( lineOf ) ) {
		if ( left.get( l ) > 0 ) {
			left.set( l, left.get( l ) - 1 );
			out.real.push( l );
		} else {
			out.handovers.push( l );
		}
	}
	return out;
}

// Wraps the carried-ids reader a propose gets so the sweep learns whether any lookup could have produced a hand-over line: a lookup
// that answered with a reason (a logo or product the media map or catalogue lacks, an attribute the catalogue lacks), a menu the map
// lacks, or any item lookup (an item a label has no id for is not told apart from outside). `probe.touched` is set, and the reason
// of each empty logo, product or attribute lookup is added to `probe.reasons`; a surface that never touches the probe has no
// hand-over line and is not proposed a second time.
export function instrumentCarried( carried, probe ) {
	if ( ! carried ) {
		return carried;
	}
	probe.reasons ||= [];
	const wrap = ( fn, miss ) => ( ...a ) => {
		const r = fn.apply( carried, a );
		miss( r ) && ( probe.touched = true );
		r?.reason && probe.reasons.push( r.reason );
		return r;
	};
	return {
		...carried,
		...( carried.logo ? { logo: wrap( carried.logo, ( r ) => r?.reason ) } : {} ),
		...( carried.product ? { product: wrap( carried.product, ( r ) => r?.reason ) } : {} ),
		...( carried.attribute ? { attribute: wrap( carried.attribute, ( r ) => r?.reason ) } : {} ),
		...( carried.menu ? { menu: wrap( carried.menu, ( r ) => null == r ) } : {} ),
		...( carried.items ? { items: wrap( carried.items, () => true ) } : {} ),
	};
}

// The real route faults among a propose's problem lines. `carryless`: the lines of the same surface proposed with no carried ids
// (the lines it also writes are real; an array, or null when that run could not be made); `reasons`: what the empty lookups said
// (`probe.reasons`). With the carry-less lines the class is exactly what the carried ids write. Without them the lines that
// end in an empty lookup's own reason (a logo, product or attribute the saved maps lack) are hand-overs and the rest stay real, so
// a surface whose carry-less run fails never reports a hand-over as a fault because of that. Returns { lines, by }.
export function realFaultLines( { problems, carryless, reasons = [] } ) {
	if ( Array.isArray( carryless ) ) {
		return { lines: carryless, by: 'carry-less run' };
	}
	return { lines: ( problems || [] ).filter( ( l ) => ! reasons.some( ( r ) => lineOf( l ).endsWith( r ) ) ), by: 'recorded lookup reasons' };
}

// The summary of one proposed surface: its node count and its problem lines in the two classes. `problems` is every line the
// propose wrote; `realProblems` the lines of it that are real route faults (splitProblems; omitted, every line is one).
// `problemCount`, `byKind` and `problems` are the real faults, which a comparison fails on; `handoverCount` and `handovers` are
// the hand-overs, which it lists.
export function summariseSurface( { client, surface, proposal, problems, realProblems = null, classifiedBy = null, skeleton, withoutLook = [] } ) {
	const { real, handovers } = splitProblems( problems, null === realProblems ? problems : realProblems );
	const byKind = {};
	for ( const l of real ) {
		const k = problemKind( l );
		byKind[ k ] = ( byKind[ k ] || 0 ) + 1;
	}
	const c = proposal?.counts || {};
	return { client, surface, ok: true, nodes: fingerprintNodes( skeleton, proposal ).length, rows: c.rows ?? null, low: c.low ?? null, unresolved: c.unresolved ?? null, problemCount: real.length, byKind, problems: real, handoverCount: handovers.length, handovers, withoutLook: [ ...new Set( withoutLook ) ].sort(), ...( classifiedBy ? { classifiedBy } : {} ) };
}

// The block every surface's tree holds, built for each client before the propose as the probe of the look builder.
export const PROBE_BLOCK = 'sgs/container';

// Builds one block's default look (`probe`) for each client (lib/setting-record.mjs::prepareLooks, passed as `prepare`) before
// the propose, with the build on. Every other look is built the first time a stage reads it (lib/setting-record.mjs::siteLook,
// on in the workers by sweepWorkerEnv), so a sweep builds only the blocks its surfaces read. When the probe fails the
// builder itself is broken (no postcss: the checkout lacks plugins/sgs-blocks/node_modules and SGS_NODE_PATH is unset), so it
// throws at once instead of running a sweep whose every Fill fails and whose comparison then proves nothing. The builder's
// words about the probe are told to `log`.
export function probeSweepLooks( { clients, prepare, probe = PROBE_BLOCK, log = () => {} } ) {
	for ( const c of clients ) {
		if ( prepare( [ probe ], c, { build: true, log } ).length ) {
			throw new Error( `no default look could be built for ${ c }: the look builder itself fails (site_look.py; a checkout without plugins/sgs-blocks/node_modules needs SGS_NODE_PATH set to one that has it)` );
		}
	}
}

// The environment of a sweep's propose and Fill workers: no site (SGS_NO_SITE), and each look built offline the first time
// a stage reads it (SGS_LOOK_BUILD, lib/setting-record.mjs::lookBuildOn), so a block with no look is built, not judged
// against nothing; one that cannot be built stops its surface at the paint gate (lib/paint-gate.mjs::assertPaints).
export const sweepWorkerEnv = ( env = process.env, tmp = env.TMP ) => ( { ...env, SGS_NO_SITE: '1', SGS_LOOK_BUILD: '1', TMP: env.TMP ?? tmp, TEMP: env.TEMP ?? tmp } );

// A surface that could not be proposed: it counts as a failure when the baseline proposed it.
export const failedSummary = ( { client, surface, error } ) => ( { client, surface, ok: false, error: String( error ).split( '\n' )[ 0 ].slice( 0, 240 ), nodes: 0, problemCount: 0, byKind: {}, problems: [], handoverCount: 0, handovers: [] } );

// The skeleton's nodes, flat, each as { id, block, rule, settings }: the id is the node's draft element (draftRef.tpl; a
// second node with the same one, or none, gets its tree path), the rule the proposal row of that element names.
export function fingerprintNodes( skeleton, proposal ) {
	const tree = Array.isArray( skeleton ) ? skeleton : skeleton?.skeleton || [];
	const rules = new Map( ( proposal?.rows || [] ).map( ( r ) => [ r.key, r.rule ?? null ] ) );
	const seen = new Set();
	const out = [];
	const walk = ( list, at ) => ( list || [] ).forEach( ( n, i ) => {
		const here = `${ at }${ i }`;
		const tpl = n.draftRef?.tpl ?? null;
		let id = tpl ?? `@${ here }`;
		if ( seen.has( id ) ) {
			id = `${ id }@${ here }`;
		}
		seen.add( id );
		out.push( { id, block: n.name, rule: tpl ? rules.get( tpl ) ?? null : null, settings: n.attributes ?? {} } );
		walk( n.innerBlocks, `${ here }.` );
	} );
	walk( tree, '' );
	return out;
}

const sameJson = ( a, b ) => JSON.stringify( a ) === JSON.stringify( b );

// The nodes that changed between two fingerprints: { added, removed, changed } (a changed node names what differs).
export function diffNodes( before, after ) {
	const b = new Map( ( before || [] ).map( ( n ) => [ n.id, n ] ) );
	const a = new Map( ( after || [] ).map( ( n ) => [ n.id, n ] ) );
	const added = [ ...a.values() ].filter( ( n ) => ! b.has( n.id ) );
	const removed = [ ...b.values() ].filter( ( n ) => ! a.has( n.id ) );
	const changed = [];
	for ( const n of a.values() ) {
		const o = b.get( n.id );
		if ( ! o ) {
			continue;
		}
		const what = [ o.block !== n.block && 'block', o.rule !== n.rule && 'rule', ! sameJson( o.settings, n.settings ) && 'settings' ].filter( Boolean );
		what.length && changed.push( { id: n.id, what, before: { block: o.block, rule: o.rule, settings: o.settings }, after: { block: n.block, rule: n.rule, settings: n.settings } } );
	}
	return { added, removed, changed };
}

// Compares two sweeps. `before` and `after`: { surfaces: { '<client>/<surface>': summary }, nodes: { key: fingerprint } } as
// `readSweep` returns them. A surface FAILS when it gains a real route fault (its count rises, or a problem line appears that the
// baseline did not have, even when another went away; hand-over lines are listed and never fail), or proposed in the baseline and does not now (an error, or missing).
// Changed nodes are listed for a person to judge and never fail. Returns { rows, failures, ok }.
export function compareSweeps( before, after ) {
	const keys = [ ...new Set( [ ...Object.keys( before.surfaces ), ...Object.keys( after.surfaces ) ] ) ].sort();
	const rows = [];
	const failures = [];
	for ( const key of keys ) {
		const b = before.surfaces[ key ];
		const a = after.surfaces[ key ];
		const row = { key, before: b ? b.problemCount : null, after: a ? a.problemCount : null, handoversBefore: b ? b.handoverCount ?? 0 : null, handoversAfter: a ? a.handoverCount ?? 0 : null, newHandovers: [], goneHandovers: [], newProblems: [], goneProblems: [], nodes: { added: [], removed: [], changed: [] }, status: 'same' };
		if ( b?.ok && ! a?.ok ) {
			row.status = 'LOST';
			failures.push( `${ key }: proposed in the baseline, ${ a ? `fails now (${ a.error })` : 'missing now' }` );
		} else if ( a && ! a.ok ) {
			row.status = 'still fails';
		} else if ( a ) {
			const was = new Set( b?.problems || [] );
			const is = new Set( a.problems );
			row.newProblems = a.problems.filter( ( l ) => ! was.has( l ) );
			row.goneProblems = ( b?.problems || [] ).filter( ( l ) => ! is.has( l ) );
			const hadOver = new Set( b?.handovers || [] );
			const hasOver = new Set( a.handovers || [] );
			row.newHandovers = ( a.handovers || [] ).filter( ( l ) => ! hadOver.has( l ) );
			row.goneHandovers = ( b?.handovers || [] ).filter( ( l ) => ! hasOver.has( l ) );
			row.nodes = b ? diffNodes( before.nodes?.[ key ], after.nodes?.[ key ] ) : { added: [], removed: [], changed: [] };
			const moved = row.nodes.added.length + row.nodes.removed.length + row.nodes.changed.length;
			if ( ! b ) {
				row.status = 'NEW';
			} else if ( b.ok && ( a.problemCount > b.problemCount || row.newProblems.length ) ) {
				row.status = 'WORSE';
			} else if ( row.goneProblems.length ) {
				row.status = 'better';
			} else if ( moved || row.newHandovers.length || row.goneHandovers.length ) {
				row.status = 'changed';
			}
			if ( 'WORSE' === row.status || ( 'NEW' === row.status && row.newProblems.length ) ) {
				failures.push( `${ key }: real faults ${ row.before ?? 0 } -> ${ row.after }, ${ row.newProblems.length } new line(s)` );
			}
			// A block proposed without its default look reads no default paint, so its settings are guessed: one the baseline had a
			// look for fails the landing. A baseline written before the count was kept (no `withoutLook`) says nothing either way.
			const hadLook = new Set( b?.withoutLook ?? [] );
			row.newWithoutLook = b && Array.isArray( b.withoutLook ) ? ( a.withoutLook ?? [] ).filter( ( x ) => ! hadLook.has( x ) ) : [];
			if ( row.newWithoutLook.length ) {
				row.status = 'WORSE';
				failures.push( `${ key }: proposed without the default look of ${ row.newWithoutLook.join( ', ' ) }` );
			}
		}
		rows.push( row );
	}
	return { rows, failures, ok: ! failures.length };
}

const clip = ( s, n = 200 ) => ( String( s ).length > n ? `${ String( s ).slice( 0, n - 1 ) }…` : String( s ) );

// Per-client totals of a sweep's summaries: { client: { surfaces, proposed, failed, nodes, problems (real faults), handovers } }.
export function clientTotals( surfaces ) {
	const t = {};
	for ( const s of Object.values( surfaces ) ) {
		const c = ( t[ s.client ] ||= { surfaces: 0, proposed: 0, failed: 0, nodes: 0, problems: 0, handovers: 0 } );
		c.surfaces++;
		s.ok ? c.proposed++ : c.failed++;
		c.nodes += s.nodes;
		c.problems += s.problemCount;
		c.handovers += s.handoverCount ?? 0;
	}
	return t;
}

// The sweep as text: the per-client totals, one line per surface, and each failed surface's reason.
export function formatSweep( { surfaces, mainSha = null } ) {
	const out = [ `Route sweep${ mainSha ? ` on ${ mainSha }` : '' }`, '' ];
	const totals = clientTotals( surfaces );
	out.push( 'client | surfaces | proposed | failed | nodes | real faults | hand-overs' );
	for ( const [ c, t ] of Object.entries( totals ) ) {
		out.push( `${ c } | ${ t.surfaces } | ${ t.proposed } | ${ t.failed } | ${ t.nodes } | ${ t.problems } | ${ t.handovers }` );
	}
	out.push( '', 'surface | nodes | real faults | hand-overs | unresolved | blocks with no default look' );
	for ( const [ k, s ] of Object.entries( surfaces ).sort( ( x, y ) => x[ 0 ].localeCompare( y[ 0 ] ) ) ) {
		out.push( s.ok ? `${ k } | ${ s.nodes } | ${ s.problemCount } | ${ s.handoverCount ?? 0 } | ${ s.unresolved ?? '-' } | ${ ( s.withoutLook ?? [] ).length }` : `${ k } | CANNOT PROPOSE: ${ s.error }` );
	}
	return `${ out.join( '\n' ) }\n`;
}

// The comparison as text: per surface the problem count before and after, the new and gone problem lines and the changed
// nodes (only surfaces that differ), then the verdict.
export function formatComparison( cmp ) {
	const out = [];
	for ( const r of cmp.rows ) {
		if ( 'same' === r.status ) {
			continue;
		}
		out.push( `${ r.status.padEnd( 8 ) } ${ r.key }: real faults ${ r.before ?? '-' } -> ${ r.after ?? '-' }, hand-overs ${ r.handoversBefore ?? '-' } -> ${ r.handoversAfter ?? '-' }` );
		r.newProblems.forEach( ( l ) => out.push( `    real fault NEW: ${ clip( l ) }` ) );
		r.goneProblems.forEach( ( l ) => out.push( `    real fault gone: ${ clip( l ) }` ) );
		( r.newWithoutLook ?? [] ).forEach( ( b ) => out.push( `    no default look NEW: ${ b }` ) );
		r.newHandovers.forEach( ( l ) => out.push( `    hand-over new: ${ clip( l ) }` ) );
		r.goneHandovers.forEach( ( l ) => out.push( `    hand-over gone: ${ clip( l ) }` ) );
		r.nodes.added.forEach( ( n ) => out.push( `    node + ${ n.id } ${ n.block } ${ clip( JSON.stringify( n.settings ), 120 ) }` ) );
		r.nodes.removed.forEach( ( n ) => out.push( `    node - ${ n.id } ${ n.block }` ) );
		r.nodes.changed.forEach( ( n ) => out.push( `    node ~ ${ n.id } ${ n.before.block } (${ n.what.join( ', ' ) })` ) );
	}
	const moved = cmp.rows.reduce( ( n, r ) => n + r.nodes.added.length + r.nodes.removed.length + r.nodes.changed.length, 0 );
	out.push( '', `${ cmp.rows.length } surfaces compared, ${ moved } changed node(s) for a person to judge, ${ cmp.failures.length } failure(s)` );
	cmp.failures.forEach( ( f ) => out.push( `FAIL ${ f }` ) );
	out.push( cmp.ok ? 'PASS: no surface gained a real fault or lost a default look' : 'FAIL: a surface gained a real fault or lost a default look' );
	return `${ out.join( '\n' ) }\n`;
}

// Writes a sweep's summaries and fingerprints under `out`: sweep.json (every summary), and per surface the nodes file.
export function writeSweep( { out, surfaces, nodes, meta = {} } ) {
	fs.mkdirSync( out, { recursive: true } );
	fs.writeFileSync( path.join( out, 'sweep.json' ), `${ JSON.stringify( { ...meta, surfaces }, null, 1 ) }\n` );
	for ( const [ key, fp ] of Object.entries( nodes ) ) {
		const f = path.join( out, `${ key }.nodes.json` );
		fs.mkdirSync( path.dirname( f ), { recursive: true } );
		fs.writeFileSync( f, JSON.stringify( fp ) );
	}
	fs.writeFileSync( path.join( out, 'SUMMARY.txt' ), formatSweep( { surfaces, mainSha: meta.mainSha ?? null } ) );
}

// Reads a sweep written by writeSweep: { surfaces, nodes, meta }.
export function readSweep( dir ) {
	const sweep = readJson( path.join( dir, 'sweep.json' ) );
	if ( ! sweep ) {
		throw new Error( `${ dir } holds no sweep.json: it is not a route-sweep output folder` );
	}
	const { surfaces, ...meta } = sweep;
	const nodes = {};
	for ( const key of Object.keys( surfaces ) ) {
		const fp = readJson( path.join( dir, `${ key }.nodes.json` ) );
		fp && ( nodes[ key ] = fp );
	}
	return { surfaces, nodes, meta };
}

// Splits `items` into `n` shards, round robin, so the large surfaces of one client do not all land in one process.
export function shardItems( items, n ) {
	const shards = Array.from( { length: Math.max( 1, Math.min( n, items.length ) ) }, () => [] );
	items.forEach( ( x, i ) => shards[ i % shards.length ].push( x ) );
	return shards;
}

// The summary of one Fill: writes, unmapped rows by reason and the refusals, from fillSurface's report and the opener record.
export function summariseFill( { client, surface, report, opener } ) {
	const unmapped = report.unmapped || [];
	const byReason = {};
	for ( const u of unmapped ) {
		const k = problemKind( u.reason || u.property || 'unmapped' );
		byReason[ k ] = ( byReason[ k ] || 0 ) + 1;
	}
	const refusals = [ ...( opener?.refused || [] ).map( ( r ) => lineOf( r ) ), ...( report.residualCss?.refused || [] ).map( ( r ) => lineOf( r ) ) ];
	return { client, surface, ok: true, writes: report.counts?.writes ?? ( report.writes || [] ).length, unmapped: unmapped.length, unmappedByReason: byReason, handover: report.counts?.handover ?? null, refusals: refusals.length, refusalLines: refusals.map( ( l ) => clip( l, 240 ) ) };
}

export const failedFill = ( { client, surface, error } ) => ( { client, surface, ok: false, error: String( error ).split( '\n' )[ 0 ].slice( 0, 240 ), writes: 0, unmapped: 0, unmappedByReason: {}, refusals: 0, refusalLines: [] } );
