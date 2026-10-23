// A client's delivery map (sites/<client>/build/qa/delivery-map.json): one key for every coverage id the client's
// intake review names, every active record of its handoff animations.json and every state of its surfaces.json, each
// owned by a unit of the plan the map names, or marked done or accepted. `mapProblems` is the check: a missing,
// duplicated or unknown key, a unit the plan does not hold, a done commit that does not exist, a coverage key whose
// mark disagrees with the coverage map (an open key whose entry is covered or excluded, a done or accepted key still a
// gap), and a done animation key with no live evidence (`animationEvidence`: the built trees' settings or a walker
// effect row).
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { REPO } from './capabilities.mjs';
import { reviewCoverageIds } from './coverage-register.mjs';
import { statusOf } from './clone-coverage.mjs';
import { recogniseBehaviour } from './motion-behaviours.mjs';
import { classify } from './motion-layers.mjs';
import { walk as walkTree } from './tree.mjs';

export const PRIOR = 'prior';

// The map file's path for a client.
export function mapPath( client, root = REPO ) {
	return path.join( root, 'sites', client, 'build', 'qa', 'delivery-map.json' );
}

function readJson( file ) {
	return JSON.parse( fs.readFileSync( file, 'utf8' ) );
}

// Every key the map must hold for a client, as a sorted list: `coverage:<id>`, `animation:<id>`, `state:<surface>:<name>`.
export function expectedKeys( client, root = REPO ) {
	const site = path.join( root, 'sites', client );
	const keys = new Set();
	const review = path.join( site, 'build', 'intake', 'review.md' );
	if ( fs.existsSync( review ) ) {
		for ( const id of reviewCoverageIds( fs.readFileSync( review, 'utf8' ) ) ) {
			keys.add( `coverage:${ id }` );
		}
	}
	const anim = path.join( site, 'handoff', 'animations.json' );
	if ( fs.existsSync( anim ) ) {
		for ( const r of readJson( anim ).records || [] ) {
			if ( 'active' === r.status ) {
				keys.add( `animation:${ r.id }` );
			}
		}
	}
	const surf = path.join( site, 'handoff', 'surfaces.json' );
	if ( fs.existsSync( surf ) ) {
		for ( const s of readJson( surf ).records || [] ) {
			for ( const st of s.states || [] ) {
				let key = `state:${ s.id }:${ st.name }`;
				for ( let n = 2; keys.has( key ); n++ ) {
					key = `state:${ s.id }:${ st.name } #${ n }`;
				}
				keys.add( key );
			}
		}
	}
	return [ ...keys ].sort();
}

// The unit ids of a plan: the first cell of each row of its work table, the table whose header row starts `| Unit |`.
export function planUnits( markdown ) {
	const units = new Set();
	let inTable = false;
	for ( const line of String( markdown ).split( /\r?\n/ ) ) {
		if ( /^\| Unit \|/.test( line ) ) {
			inTable = true;
		} else if ( inTable && ! line.startsWith( '|' ) ) {
			inTable = false;
		} else if ( inTable ) {
			const m = line.match( /^\| (U\d+[a-z]?) / );
			m && units.add( m[ 1 ] );
		}
	}
	return units;
}

// The member names of the map's top-level `keys` object that occur more than once in its raw text (JSON.parse keeps
// only the last). A character scan that tracks strings and nesting, so names inside values never count.
export function duplicateKeys( raw ) {
	const counts = new Map();
	let depth = 0;
	let inKeys = false;
	let keysDepth = -1;
	let lastName = null;
	for ( let i = 0; i < raw.length; i++ ) {
		const c = raw[ i ];
		if ( '"' === c ) {
			let j = i + 1;
			while ( j < raw.length && '"' !== raw[ j ] ) {
				j += '\\' === raw[ j ] ? 2 : 1;
			}
			const str = JSON.parse( raw.slice( i, j + 1 ) );
			let k = j + 1;
			while ( /\s/.test( raw[ k ] || '' ) ) {
				k++;
			}
			if ( ':' === raw[ k ] ) {
				if ( 1 === depth ) {
					lastName = str;
				} else if ( inKeys && depth === keysDepth ) {
					counts.set( str, ( counts.get( str ) || 0 ) + 1 );
				}
			}
			i = j;
		} else if ( '{' === c || '[' === c ) {
			depth++;
			if ( '{' === c && 2 === depth && 'keys' === lastName ) {
				inKeys = true;
				keysDepth = 2;
			}
		} else if ( '}' === c || ']' === c ) {
			if ( inKeys && depth === keysDepth ) {
				inKeys = false;
			}
			depth--;
		}
	}
	return [ ...counts ].filter( ( [ , n ] ) => n > 1 ).map( ( [ k ] ) => k );
}

// What a client's built trees (sites/<client>/build/trees/**, the block trees written to the live posts) say about motion:
// { effects: the names of every effect layer, flags: 'entrance' and 'hover-state' when a layer of that kind exists,
// nodes: [{ name, attributes }] for every block }.
export function treeFacts( trees ) {
	const facts = { effects: new Set(), flags: new Set(), nodes: [] };
	const scan = ( v, key = '' ) => {
		if ( Array.isArray( v ) ) {
			v.forEach( ( x ) => scan( x, key ) );
		} else if ( v && 'object' === typeof v ) {
			'string' === typeof v.effect && facts.effects.add( v.effect );
			'entrance' === key && facts.flags.add( 'entrance' );
			'hover' === key && v.state && facts.flags.add( 'hover-state' );
			Object.entries( v ).forEach( ( [ k, x ] ) => scan( x, k ) );
		}
	};
	for ( const tree of trees ) {
		walkTree( tree, ( n ) => {
			facts.nodes.push( { name: n.name, attributes: n.attributes || {} } );
			scan( n.attributes?.sgsMotion );
		} );
	}
	return facts;
}

// The trees under sites/<client>/build/trees, read.
export function clientTrees( client, root = REPO ) {
	const out = [];
	const visit = ( d ) => {
		for ( const e of fs.existsSync( d ) ? fs.readdirSync( d, { withFileTypes: true } ) : [] ) {
			const f = path.join( d, e.name );
			e.isDirectory() ? visit( f ) : e.name.endsWith( '.json' ) && out.push( readJson( f ) );
		}
	};
	visit( path.join( root, 'sites', client, 'build', 'trees' ) );
	return out;
}

// What a record needs on the page for its done mark to hold, from the recognisers the route writes with: { effects:
// [names, each a layer], flags, alt: [{ attr, value }] settings that stand in for the effect, blocks: { name: [{ attr,
// value }] } settings a block carries, native: true (the page does it on its own), walkerOnly: reason (nothing a tree can
// hold) }.
export function animationNeeds( record ) {
	const b = recogniseBehaviour( record, {} );
	if ( b ) {
		switch ( b.kind ) {
			case 'effect':
				return { effects: b.effects.map( ( e ) => e.effect ), flags: b.hoverState ? [ 'hover-state' ] : [], alt: b.alt?.settings || null };
			case 'control':
				return { effects: [ b.effect ], flags: [] };
			case 'covered':
				return { effects: [ b.by ], flags: [] };
			case 'native':
				return { native: true };
			case 'close':
				return { effects: [], flags: [ 'entrance' ] };
			case 'settings':
				return { effects: [], flags: [], blocks: b.blocks };
			case 'site':
				return { walkerOnly: `a site option (${ b.option }) lives in no block tree` };
			default:
				return { walkerOnly: `the record is ${ b.kind }: no SGS effect holds it` };
		}
	}
	const c = classify( record, {} );
	if ( 'css-media' === record.mechanism ) {
		return { native: true };
	}
	return 'entrance' === c.kind ? { effects: [], flags: [ 'entrance' ] }
		: 'hover' === c.kind ? { effects: [], flags: [ 'hover-state' ] }
			: { walkerOnly: c.reason || `the record is an endless loop or an unnamed effect (${ c.kind }): no setting name in a tree identifies it` };
}

// Every effect row (an object with kind `effect`) anywhere in a walker report's runs.
export function walkerEffectRows( report ) {
	const out = [];
	const scan = ( v ) => {
		if ( Array.isArray( v ) ) {
			v.forEach( scan );
		} else if ( v && 'object' === typeof v ) {
			'effect' === v.kind ? out.push( v ) : Object.values( v ).forEach( scan );
		}
	};
	scan( report?.runs );
	return out;
}

// The walker row that evidences a record: a row of kind `effect` (the walker's effect-layer rows: { kind: 'effect',
// effect, animation?, live }) with its live side read that names the record, or an effect the record needs.
function walkerHit( record, needs, rows ) {
	return rows.find( ( r ) => 'effect' === r.kind && null != r.live && ( r.animation === record.id || ( ! r.animation && ( needs.effects || [] ).includes( r.effect ) ) ) );
}

const holds = ( node, list ) => list.every( ( s ) => JSON.stringify( node.attributes[ s.attr ] ) === JSON.stringify( s.value ) );

// { ok, why } for one animation record's done mark: every effect and flag it needs is in the built trees (or the
// alternative settings the recogniser names are on a block), or a walker effect row shows it played.
export function animationEvidence( record, facts, walkerRows = [] ) {
	const needs = animationNeeds( record );
	if ( needs.native ) {
		return { ok: true, why: 'the SGS page or its motion model does it natively (a page load, a reduced-motion rule)' };
	}
	const hit = walkerHit( record, needs, walkerRows );
	if ( hit ) {
		return { ok: true, why: `walker effect row ${ hit.effect } (live ${ JSON.stringify( hit.live ) })` };
	}
	if ( needs.walkerOnly ) {
		return { ok: false, why: `${ needs.walkerOnly }, and no walker effect row shows it` };
	}
	const missing = [
		...( needs.effects || [] ).filter( ( e ) => ! facts.effects.has( e ) ).map( ( e ) => `no ${ e } effect layer` ),
		...( needs.flags || [] ).filter( ( f ) => ! facts.flags.has( f ) ).map( ( f ) => `no ${ f } layer` ),
		...Object.entries( needs.blocks || {} ).filter( ( [ name, list ] ) => ! facts.nodes.some( ( n ) => n.name === name && holds( n, list ) ) ).map( ( [ name ] ) => `no ${ name } block with the settings it needs` ),
	];
	if ( missing.length && needs.alt && facts.nodes.some( ( n ) => holds( n, needs.alt ) ) ) {
		return { ok: true, why: `the alternative settings ${ needs.alt.map( ( s ) => s.attr ).join( ', ' ) } are on a block` };
	}
	return missing.length ? { ok: false, why: `${ missing.join( ', ' ) } in the built trees, and no walker effect row shows it` } : { ok: true, why: 'its effect layers are in the built trees' };
}

// Whether a commit exists in the repo.
export function commitExists( hash, root = REPO ) {
	return 0 === spawnSync( 'git', [ 'cat-file', '-e', `${ hash }^{commit}` ], { cwd: root } ).status;
}

// Every reason the map is wrong, as sentences; empty when it is right. A value is a unit id ("U14"), { done: <commit or
// "prior">, unit } or { accepted: <reason>, unit }; "prior" is allowed only for a coverage key whose entry is covered. A
// done animation key needs evidenceFor(key) -> { ok, why } (`animationEvidence`); with no reader it fails.
export function mapProblems( { raw, expected, units, coverage, hasCommit, evidenceFor } ) {
	const problems = [];
	let map;
	try {
		map = JSON.parse( raw );
	} catch ( e ) {
		return [ `the map is not valid JSON: ${ e.message }` ];
	}
	const keys = map.keys || {};
	for ( const k of duplicateKeys( raw ) ) {
		problems.push( `${ k }: listed more than once` );
	}
	const want = new Set( expected );
	for ( const k of expected ) {
		if ( ! ( k in keys ) ) {
			problems.push( `${ k }: missing (name the unit that owns it)` );
		}
	}
	const entries = coverage.entries || {};
	for ( const [ k, v ] of Object.entries( keys ) ) {
		if ( ! want.has( k ) ) {
			problems.push( `${ k }: not a coverage id the review names, an active animation record or a surface state` );
			continue;
		}
		const unit = 'string' === typeof v ? v : v?.unit;
		if ( ! units.has( unit ) ) {
			problems.push( `${ k }: unit ${ JSON.stringify( unit ) } is not in the plan's work table` );
		}
		const status = k.startsWith( 'coverage:' ) ? statusOf( entries[ k.slice( 'coverage:'.length ) ] ) : null;
		if ( 'string' === typeof v ) {
			if ( status && 'gap' !== status ) {
				problems.push( `${ k }: the coverage map has it ${ status }; mark it done or accepted` );
			}
			continue;
		}
		if ( ! v || 'object' !== typeof v || Array.isArray( v ) ) {
			problems.push( `${ k }: a value is a unit id, { done, unit } or { accepted, unit }` );
		} else if ( 'done' in v && 'accepted' in v ) {
			problems.push( `${ k }: a value is done or accepted, never both` );
		} else if ( 'done' in v ) {
			if ( 'string' !== typeof v.done || ! v.done.trim() ) {
				problems.push( `${ k }: done names a commit hash or "prior"` );
			} else if ( PRIOR === v.done ) {
				if ( 'covered' !== status ) {
					problems.push( `${ k }: "prior" is only for a coverage id already covered` );
				}
			} else if ( ! hasCommit( v.done ) ) {
				problems.push( `${ k }: done commit ${ v.done } does not exist` );
			}
			if ( 'gap' === status ) {
				problems.push( `${ k }: marked done but the coverage map still has it as a gap` );
			}
			if ( k.startsWith( 'animation:' ) ) {
				const e = 'function' === typeof evidenceFor ? evidenceFor( k ) : { ok: false, why: 'no evidence reader was supplied' };
				e?.ok || problems.push( `${ k }: marked done but ${ e?.why ?? 'there is no evidence' }` );
			}
		} else if ( 'accepted' in v ) {
			if ( ! String( v.accepted ).trim() ) {
				problems.push( `${ k }: an accepted key needs its reason` );
			}
			if ( 'gap' === status ) {
				problems.push( `${ k }: accepted but the coverage map still has it as a gap (record Bean's exclusion there)` );
			}
		} else {
			problems.push( `${ k }: a value is a unit id, { done, unit } or { accepted, unit }` );
		}
	}
	return problems;
}
