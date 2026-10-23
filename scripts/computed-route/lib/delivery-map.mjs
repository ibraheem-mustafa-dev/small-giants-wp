// A client's delivery map (sites/<client>/build/qa/delivery-map.json): one key for every coverage id the client's
// intake review names, every active record of its handoff animations.json and every state of its surfaces.json, each
// owned by a unit of the plan the map names, or marked done or accepted. `mapProblems` is the check: a missing,
// duplicated or unknown key, a unit the plan does not hold, a done commit that does not exist, a coverage key whose
// mark disagrees with the coverage map (an open key whose entry is covered or excluded, a done or accepted key still a
// gap), a done animation key with no live evidence (`animationEvidence`: one built block's enabled layers or a walker
// effect record, never an effect row that reports the effect missing) and a done state key with no walker run of its
// state free of open rows (`stateEvidence`).
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { REPO } from './capabilities.mjs';
import { reviewCoverageIds } from './coverage-register.mjs';
import { statusOf } from './clone-coverage.mjs';
import { recogniseBehaviour } from './motion-behaviours.mjs';
import { classify } from './motion-layers.mjs';
import { walk as walkTree } from './tree.mjs';
import { openRows } from './solve-rows.mjs';
import { boundNodes, nodeElementKeys } from './delivery-bind.mjs';

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

// Whether a value holds anything: a leaf that is set, or a container with such a leaf in it (`{}` and `{ base: {} }` hold nothing).
const hasContent = ( v ) => ( Array.isArray( v ) ? v.some( hasContent ) : v && 'object' === typeof v ? Object.values( v ).some( hasContent ) : null != v && '' !== v );

// What a client's built trees (sites/<client>/build/trees/**, the block trees written to the live posts) say about motion:
// { effects: the names of every enabled effect layer, flags: 'entrance' and 'hover-state' when a layer of that kind holds
// settings, nodes: [{ name, attributes, keys, effects, flags }] for every block, each with its own layers and the draft
// elements it renders (lib/delivery-bind.mjs::nodeElementKeys) }. A layer with `enabled: false`, an empty entrance and an
// empty hover state are not layers.
export function treeFacts( trees, rootComponent = null ) {
	const facts = { effects: new Set(), flags: new Set(), nodes: [] };
	for ( const tree of trees ) {
		walkTree( tree, ( n ) => {
			const node = { name: n.name, attributes: n.attributes || {}, keys: nodeElementKeys( n, rootComponent ), effects: new Set(), flags: new Set() };
			const scan = ( v, key = '' ) => {
				if ( Array.isArray( v ) ) {
					v.forEach( ( x ) => scan( x, key ) );
				} else if ( v && 'object' === typeof v ) {
					'string' === typeof v.effect && false !== v.enabled && node.effects.add( v.effect );
					'entrance' === key && hasContent( v ) && node.flags.add( 'entrance' );
					'hover' === key && hasContent( v.state ) && node.flags.add( 'hover-state' );
					Object.entries( v ).forEach( ( [ k, x ] ) => scan( x, k ) );
				}
			};
			scan( n.attributes?.sgsMotion );
			node.effects.forEach( ( e ) => facts.effects.add( e ) );
			node.flags.forEach( ( f ) => facts.flags.add( f ) );
			facts.nodes.push( node );
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

// The layer shape each SGS pointer effect paints, as the walker names effect layers (data/effect-layers.json).
const EFFECT_SHAPES = JSON.parse( fs.readFileSync( new URL( '../data/effect-layers.json', import.meta.url ), 'utf8' ) ).shapes;

// A pair's `effects` record on the walker report ({ draft: { <part>: { hover: [layer], press: [layer] } }, live: { ... } },
// scripts/parity/GAP-CHECKLIST.md section 29) as one row per part and state: { kind: 'effects', part, state, draft, live },
// each side the list of layers that part showed in that state (an empty list where it showed none).
function pairEffectRows( effects ) {
	const out = [];
	const parts = new Set( [ ...Object.keys( effects.draft || {} ), ...Object.keys( effects.live || {} ) ] );
	for ( const part of parts ) {
		for ( const state of [ 'hover', 'press' ] ) {
			const draft = effects.draft?.[ part ]?.[ state ] || [];
			const live = effects.live?.[ part ]?.[ state ] || [];
			if ( draft.length || live.length ) {
				out.push( { kind: 'effects', part, state, draft, live } );
			}
		}
	}
	return out;
}

// Every effect row (an object with kind `effect`) and per-part effect record (kind `effects`, read from each pair's
// `effects`) anywhere in a walker report's runs.
export function walkerEffectRows( report ) {
	const out = [];
	const scan = ( v ) => {
		if ( Array.isArray( v ) ) {
			v.forEach( scan );
		} else if ( v && 'object' === typeof v ) {
			if ( 'effect' === v.kind || 'effects' === v.kind ) {
				out.push( v );
				return;
			}
			for ( const [ k, x ] of Object.entries( v ) ) {
				'effects' === k && x && 'object' === typeof x && ( 'draft' in x || 'live' in x ) ? out.push( ...pairEffectRows( x ) ) : scan( x );
			}
		}
	};
	scan( report?.runs );
	return out;
}

const lower = ( v ) => String( v ).toLowerCase();
const noEffect = ( v ) => null == v || 'none' === lower( v ) || ( Array.isArray( v ) && ! v.length );
const names = ( list ) => ( list || [] ).map( lower );
// What a walker side lists, as words to match an effect against: each layer's shape (`added band` gives `band`) and the
// layer text itself, so a side naming an effect directly also matches.
const layerWords = ( side ) => ( Array.isArray( side ) ? side : String( side ?? '' ).split( /\s*,\s*/ ) ).flatMap( ( l ) => [ lower( l ), lower( l ).split( /\s+/ ).pop() ] );
// The words that show an effect: its name and the layer shape it paints.
const effectWords = ( e ) => [ lower( e ), EFFECT_SHAPES[ lower( e ) ] ].filter( Boolean );
const shows = ( side, e ) => effectWords( e ).some( ( w ) => layerWords( side ).includes( w ) );

// The walker's effect rows ({ kind: 'effect', key: '<part> hover|press', part, draft, live }) are written when one side
// has an effect layer and the other none, the empty side the string 'none' and the other the comma-joined effect names.
// A row whose live side is 'none' and that names an effect the record needs (or carries the record's id in `animation`)
// is counter-evidence: the live page lacks the effect, whatever the trees hold.
function walkerMiss( record, needs, rows ) {
	const want = names( needs.effects );
	return rows.find( ( r ) => 'effect' === r.kind && noEffect( r.live ) && ( r.animation === record.id || ( ! r.animation && want.some( ( e ) => shows( r.draft, e ) ) ) ) );
}

// Positive walker evidence is a per-part effect record { kind: 'effects', part, state, draft: [layers], live: [layers] }
// (pairEffectRows): the live part shows every effect the record needs (its name or the layer shape it paints).
function walkerHit( record, needs, rows ) {
	const want = names( needs.effects );
	return rows.find( ( r ) => 'effects' === r.kind && Array.isArray( r.live ) && r.live.length && ( r.animation === record.id || ( ! r.animation && want.length && want.every( ( e ) => shows( r.live, e ) ) ) ) );
}

const holds = ( node, list ) => list.every( ( s ) => JSON.stringify( node.attributes[ s.attr ] ) === JSON.stringify( s.value ) );

// { ok, why } for one animation record's done mark: a walker effect row reporting the effect missing fails it; otherwise a
// walker effect record shows it played, or the built block that renders the record's own draft element carries every
// effect layer and flag the record needs (each enabled and holding settings), or the alternative settings the recogniser
// names are on that block (lib/delivery-bind.mjs::boundNodes); a layer on a sibling or ancestor block is not evidence. A record that needs
// nothing a tree can hold has no tree evidence. `needsOf` reads a record's needs (a test seam).
export function animationEvidence( record, facts, walkerRows = [], needsOf = animationNeeds ) {
	const needs = needsOf( record );
	if ( needs.native ) {
		return { ok: true, why: 'the SGS page or its motion model does it natively (a page load, a reduced-motion rule)' };
	}
	const miss = walkerMiss( record, needs, walkerRows );
	if ( miss ) {
		return { ok: false, why: `walker effect row "${ miss.key }" shows the live page lacks ${ miss.draft } (draft ${ JSON.stringify( miss.draft ) }, live ${ JSON.stringify( miss.live ) })` };
	}
	const hit = walkerHit( record, needs, walkerRows );
	if ( hit ) {
		return { ok: true, why: `walker effect record for ${ hit.part ?? 'a part' } plays ${ JSON.stringify( hit.live ) } live` };
	}
	if ( needs.walkerOnly ) {
		return { ok: false, why: `${ needs.walkerOnly }, and no walker effect record shows it` };
	}
	const [ effects, flags, blocks ] = [ needs.effects || [], needs.flags || [], Object.entries( needs.blocks || {} ) ];
	if ( ! effects.length && ! flags.length && ! blocks.length ) {
		return { ok: false, why: 'the record names no effect layer, flag or block setting a tree could hold, and no walker effect record shows it' };
	}
	const missing = [];
	const own = effects.length || flags.length || needs.alt ? boundNodes( record, facts ) : { nodes: [] };
	if ( ( effects.length || flags.length ) && ! own.nodes.some( ( n ) => effects.every( ( e ) => n.effects.has( e ) ) && flags.every( ( f ) => n.flags.has( f ) ) ) ) {
		const absent = [ ...effects.map( ( e ) => `${ e } effect layer` ), ...flags.map( ( f ) => `${ f } layer` ) ];
		missing.push( own.why || `the block rendering the record's draft element carries no ${ absent.join( ' and ' ) } together` );
	}
	missing.push( ...blocks.filter( ( [ name, list ] ) => ! facts.nodes.some( ( n ) => n.name === name && holds( n, list ) ) ).map( ( [ name ] ) => `no ${ name } block with the settings it needs` ) );
	if ( missing.length && needs.alt && own.nodes.some( ( n ) => holds( n, needs.alt ) ) ) {
		return { ok: true, why: `the alternative settings ${ needs.alt.map( ( s ) => s.attr ).join( ', ' ) } are on the block rendering the record's draft element` };
	}
	return missing.length ? { ok: false, why: `${ missing.join( ', ' ) } in the built trees, and no walker effect record shows it` } : { ok: true, why: blocks.length && ! own.nodes.length ? 'the built blocks carry the settings it needs' : `the block rendering ${ own.nodes[ 0 ].keys.join( ', ' ) } carries its effect layers` };
}

// { ok, why } for one `state:<surface>:<name>` key's done mark, from the walker reports given: a run of that state exists
// and no open row is left in any run of it.
export function stateEvidence( key ) {
	const name = lower( String( key ).replace( /^state:[^:]*:/, '' ).replace( / #\d+$/, '' ) );
	return ( reports ) => {
		const runs = ( reports || [] ).flatMap( ( r ) => ( r.runs || [] ).filter( ( run ) => lower( run.state ?? '' ) === name ).map( ( run ) => ( { runs: [ run ] } ) ) );
		if ( ! runs.length ) {
			return { ok: false, why: `no walker run of the ${ name } state was given (--walk <report.json>)` };
		}
		const open = runs.flatMap( ( r ) => openRows( r ) );
		return open.length ? { ok: false, why: `the walker still has ${ open.length } open row(s) in the ${ name } state (first: ${ open[ 0 ].key })` } : { ok: true, why: `${ runs.length } walker run(s) of the ${ name } state with no open row` };
	};
}

// Whether a commit exists in the repo.
export function commitExists( hash, root = REPO ) {
	return 0 === spawnSync( 'git', [ 'cat-file', '-e', `${ hash }^{commit}` ], { cwd: root } ).status;
}

// Every reason the map is wrong, as sentences; empty when it is right. A value is a unit id ("U14"), { done: <commit or
// "prior">, unit } or { accepted: <reason>, unit }; "prior" is allowed only for a coverage key whose entry is covered. A
// done animation or state key needs evidenceFor(key) -> { ok, why } (`animationEvidence`, `stateEvidence`); with no reader it fails.
// A done state key's commit must change that surface's files: touches(key, commit) -> { ok, why }
// (lib/delivery-state-files.mjs::stateCommitEvidence); with no reader it fails. A coverage key's evidence is the coverage map's own status.
export function mapProblems( { raw, expected, units, coverage, hasCommit, evidenceFor, touches } ) {
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
			} else if ( k.startsWith( 'state:' ) ) {
				const t = 'function' === typeof touches ? touches( k, v.done ) : { ok: false, why: 'no surface file reader was supplied' };
				t?.ok || problems.push( `${ k }: done commit ${ v.done } does not change the surface: ${ t?.why ?? 'no reason given' }` );
			}
			if ( 'gap' === status ) {
				problems.push( `${ k }: marked done but the coverage map still has it as a gap` );
			}
			if ( k.startsWith( 'animation:' ) || k.startsWith( 'state:' ) ) {
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
