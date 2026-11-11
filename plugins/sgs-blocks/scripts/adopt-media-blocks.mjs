/**
 * Stage B adoption script (Spec 49 §8.3, §14.1, §14.4).
 *
 * Reads `scripts/data/media-adoption.json` (every Stage B block, its slots, each slot's kinds and the attributes the
 * generator's type-clash rule needs replaced) and, for the named wave or block:
 *   1. declares `kinds` (and `context`) on each listed `supports.sgs.mediaElements` entry, renaming a legacy entry
 *      (`from`) or adding one (`add`) where the block has none under the slot's prefix;
 *   2. deletes the entry's `atoms` (a slot may keep a narrowed list when the data gives one) and any `drop` entries;
 *   3. removes the `replace` attributes, so the generator can write them in the media setting's shape;
 *   4. runs `node scripts/generate-media-attributes.mjs --block <slug>` for the block, then one whole generator run so
 *      the override entries sit in the order its `--check` expects.
 * It is re-runnable against fresh `main` and idempotent: a second run changes nothing. A block whose generator run
 * refuses is restored to its text from before the run and reported with the generator's reason.
 *
 * USAGE (from plugins/sgs-blocks)
 *   node scripts/adopt-media-blocks.mjs --wave wave-1[,wp-8]      adopt one or more waves
 *   node scripts/adopt-media-blocks.mjs --block sgs/gallery       adopt one block (every wave that lists it)
 *   node scripts/adopt-media-blocks.mjs --all                     adopt every wave
 *   node scripts/adopt-media-blocks.mjs --check                   which listed blocks are adopted; fails on a half-adopted one
 *   node scripts/adopt-media-blocks.mjs --self-test               whole map on a temp copy of the tree, with negative controls
 *   --root DIR   run against another plugin tree (the self-test does this on a temp copy; default: this plugin)
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

import { findBlockJsons } from './lib/media-block-json.mjs';
import {
	member,
	members,
	removeMember,
	insertFirstMember,
	replaceValue,
	lineIndent,
	serialise,
} from './lib/block-json-edit.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const OWN_PLUGIN_DIR = path.resolve( HERE, '..' );
export const WAVE_ORDER = [ 'wave-1', 'wp-8', 'wp-9', 'wp-10b', 'wave-3', 'wave-4' ];
const DATA_REL = path.join( 'scripts', 'data', 'media-adoption.json' );

/** A refusal that names what it refused. */
export class Refusal extends Error {}

const toUrl = ( root, ...seg ) => pathToFileURL( path.join( root, ...seg ) ).href;

/**
 * Block name to block.json path for every block under a plugin directory.
 *
 * @param {string} root Plugin directory.
 * @return {Map<string,string>} Name to path.
 */
function blockFilesByName( root ) {
	return new Map( findBlockJsons( path.join( root, 'src', 'blocks' ) ).map( ( f ) => [ JSON.parse( fs.readFileSync( f, 'utf8' ) ).name, f ] ) );
}

/** Files the generator writes besides block.json files: its override list and the PHP type mirror. */
const GENERATED_SHARED = [ path.join( 'scripts', 'attr-classification-overrides.json' ), path.join( 'includes', 'media-element-attributes.generated.php' ) ];

/**
 * Every file one adoption run may write, by absolute path, as its text now (a missing file is recorded as null).
 *
 * @param {string}   root  Plugin directory.
 * @param {string[]} extra Further absolute paths to record.
 * @return {Map<string,string|null>} Path to text.
 */
function captureFiles( root, extra = [] ) {
	const paths = [ ...extra, ...GENERATED_SHARED.map( ( rel ) => path.join( root, rel ) ) ];
	return new Map( paths.map( ( f ) => [ f, fs.existsSync( f ) ? fs.readFileSync( f, 'utf8' ) : null ] ) );
}

/**
 * Put every captured file back as it was.
 *
 * @param {Map<string,string|null>} captured From captureFiles.
 */
function restoreFiles( captured ) {
	for ( const [ f, text ] of captured ) {
		if ( text === null ) {
			fs.rmSync( f, { force: true } );
		} else if ( fs.readFileSync( f, 'utf8' ) !== text ) {
			fs.writeFileSync( f, text, 'utf8' );
		}
	}
}

/**
 * The slot vocabulary the generator accepts.
 *
 * @param {string} root Plugin directory.
 * @return {Promise<{kinds: string[], contexts: string[]}>} Allowed kinds and contexts.
 */
async function vocabulary( root ) {
	const mod = await import( toUrl( root, 'src', 'components', 'media', 'emit', 'kinds-settings.js' ) );
	return { kinds: mod.ALL_KINDS, contexts: mod.ALL_CONTEXTS };
}

function loadData( root, file ) {
	return JSON.parse( fs.readFileSync( file || path.join( root, DATA_REL ), 'utf8' ) );
}

/**
 * Problems with the data file itself.
 *
 * @param {Object} data  Parsed data file.
 * @param {Object} vocab Allowed kinds and contexts.
 * @param {Map<string,string>} files Block name to block.json path.
 * @return {string[]} Problems, empty when the file is sound.
 */
export function validateData( data, vocab, files ) {
	const bad = [];
	const waves = Array.isArray( data.waves ) ? data.waves : [];
	const ids = waves.map( ( w ) => w.id );
	if ( data.branch !== 'feature/media-stage-b' ) {
		bad.push( `branch must be "feature/media-stage-b" (got ${ JSON.stringify( data.branch ) })` );
	}
	if ( JSON.stringify( ids ) !== JSON.stringify( WAVE_ORDER.filter( ( id ) => ids.includes( id ) ) ) || new Set( ids ).size !== ids.length ) {
		bad.push( `wave ids must be unique and in the order ${ WAVE_ORDER.join( ', ' ) } (got ${ ids.join( ', ' ) })` );
	}
	const listed = new Set();
	for ( const wave of waves ) {
		for ( const [ name, spec ] of Object.entries( wave.blocks || {} ) ) {
			listed.add( name );
			const at = `${ wave.id } ${ name }`;
			if ( ! files.has( name ) ) {
				bad.push( `${ at }: no block.json under src/blocks/ has this name` );
			}
			if ( ! spec.slots || ! Object.keys( spec.slots ).length ) {
				bad.push( `${ at }: no slots` );
			}
			for ( const key of [ 'replace', 'drop' ] ) {
				if ( key in spec && ! ( Array.isArray( spec[ key ] ) && spec[ key ].every( ( v ) => typeof v === 'string' ) ) ) {
					bad.push( `${ at }: "${ key }" must be an array of strings` );
				}
			}
			for ( const [ prefix, slot ] of Object.entries( spec.slots || {} ) ) {
				const s = `${ at } slot "${ prefix }"`;
				if ( ! Array.isArray( slot.kinds ) || ! slot.kinds.length || ! slot.kinds.every( ( k ) => vocab.kinds.includes( k ) ) ) {
					bad.push( `${ s }: kinds must be a non-empty subset of ${ vocab.kinds.join( ', ' ) }` );
				}
				if ( slot.context && ! vocab.contexts.includes( slot.context ) ) {
					bad.push( `${ s }: context "${ slot.context }" is not one of ${ vocab.contexts.join( ', ' ) }` );
				}
				if ( ! slot.context ) {
					bad.push( `${ s }: no context` );
				}
				if ( 'from' in slot && slot.add ) {
					bad.push( `${ s }: "from" and "add" are exclusive` );
				}
			}
		}
	}
	for ( const ex of data.excluded || [] ) {
		if ( listed.has( ex.block ) ) {
			bad.push( `${ ex.block } is both excluded and listed in a wave` );
		}
	}
	return bad;
}

const entryPrefix = ( e ) => ( e && e.prefix ? String( e.prefix ) : '' );

/**
 * One block's new text for the selected slots.
 *
 * @param {string} text  Current block.json text.
 * @param {Object} spec  { slots, drop, replace } merged for the selected waves.
 * @return {{text: string, adopted: string[], removed: string[]}} New text, the slots written, the attributes removed.
 */
export function editBlockText( text, spec ) {
	const block = JSON.parse( text );
	const name = block.name;
	const before = block.supports?.sgs?.mediaElements;
	const next = Array.isArray( before ) ? before.map( ( e ) => ( { ...e } ) ) : [];
	const adopted = [];

	for ( const [ prefix, slot ] of Object.entries( spec.slots ) ) {
		let at = next.findIndex( ( e ) => entryPrefix( e ) === prefix );
		if ( at === -1 && 'from' in slot ) {
			const from = next.findIndex( ( e ) => entryPrefix( e ) === slot.from );
			if ( from === -1 ) {
				throw new Refusal( `${ name }: slot prefix "${ prefix }" (renamed from "${ slot.from }") is not in supports.sgs.mediaElements: it has ${ next.map( ( e ) => JSON.stringify( entryPrefix( e ) ) ).join( ', ' ) || 'no entries' }` );
			}
			at = from;
		} else if ( at === -1 && slot.add ) {
			next.push( { prefix } );
			at = next.length - 1;
		} else if ( at === -1 ) {
			throw new Refusal( `${ name }: slot prefix "${ prefix }" is not in supports.sgs.mediaElements, and the data neither renames an entry ("from") nor adds one ("add")` );
		}
		const old = next[ at ];
		const { prefix: _p, context: _c, kinds: _k, atoms: _a, ...rest } = old;
		next[ at ] = {
			prefix,
			context: slot.context,
			kinds: slot.kinds,
			...( slot.atoms ? { atoms: slot.atoms } : {} ),
			...rest,
		};
		adopted.push( prefix );
	}
	for ( const dropPrefix of spec.drop || [] ) {
		const at = next.findIndex( ( e ) => entryPrefix( e ) === dropPrefix );
		if ( at !== -1 && ! ( dropPrefix in spec.slots ) ) {
			next.splice( at, 1 );
		}
	}

	let out = text;
	if ( JSON.stringify( next ) !== JSON.stringify( before || [] ) || ! Array.isArray( before ) ) {
		const eol = text.includes( '\r\n' ) ? '\r\n' : '\n';
		const supports = member( out, 0, 'supports' );
		if ( ! supports ) {
			throw new Refusal( `${ name }: block.json has no "supports" object` );
		}
		let sgs = member( out, supports.valStart, 'sgs' );
		if ( ! sgs ) {
			out = insertFirstMember( out, supports.valStart, 'sgs', '{}' );
			sgs = member( out, member( out, 0, 'supports' ).valStart, 'sgs' );
		}
		const media = member( out, sgs.valStart, 'mediaElements' );
		if ( media ) {
			out = replaceValue( out, media, serialise( next, lineIndent( out, media.keyStart ), eol ) );
		} else {
			const sgsOpen = sgs.valStart;
			const inner = members( out, sgsOpen ).members[ 0 ];
			const indent = inner ? lineIndent( out, inner.keyStart ) : lineIndent( out, sgs.keyStart ) + '\t';
			out = insertFirstMember( out, sgsOpen, 'mediaElements', serialise( next, indent, eol ) );
		}
	}

	const removed = [];
	for ( const attr of spec.replace || [] ) {
		const attrs = member( out, 0, 'attributes' );
		const m = attrs && member( out, attrs.valStart, attr );
		if ( m && JSON.parse( out.slice( m.valStart, m.valEnd ) )._generated !== 'media-atoms' ) {
			out = removeMember( out, attrs.valStart, attr );
			removed.push( attr );
		}
	}
	JSON.parse( out ); // never hand back a file that no longer parses
	return { text: out, adopted, removed };
}

/** The adoption spec of one block across the selected waves (slots, drop and replace merged). */
function specFor( data, name, waveIds ) {
	const spec = { slots: {}, drop: [], replace: [] };
	let found = false;
	for ( const wave of data.waves ) {
		const entry = wave.blocks?.[ name ];
		if ( ! entry || ( waveIds && ! waveIds.includes( wave.id ) ) ) {
			continue;
		}
		found = true;
		Object.assign( spec.slots, entry.slots );
		spec.drop.push( ...( entry.drop || [] ) );
		spec.replace.push( ...( entry.replace || [] ) );
	}
	return found ? spec : null;
}

export function runGenerator( root, name ) {
	const gen = path.join( root, 'scripts', 'generate-media-attributes.mjs' );
	const run = spawnSync( process.execPath, name ? [ gen, '--block', name ] : [ gen ], { cwd: root, encoding: 'utf8' } );
	const text = ( run.stderr || run.stdout || '' ).trim();
	// Node prints the source line and a stack above the message: keep the message.
	const line = text.split( String.fromCharCode( 10 ) ).find( ( l ) => l.startsWith( 'Error: ' ) || l.startsWith( '[generate-media-attributes]' ) );
	const notes = ( run.stdout || '' ).split( String.fromCharCode( 10 ) ).filter( ( l ) => /already declares|hand-written override/.test( l ) ).map( ( l ) => l.replace( /^\[generate-media-attributes\] /, '' ) );
	return { ok: run.status === 0, message: line ? line.replace( /^Error: /, '' ) : text.slice( -400 ), notes };
}

/**
 * Adopt the selected blocks.
 *
 * @param {string}   root     Plugin directory.
 * @param {Object}   data     Parsed data file.
 * @param {string[]} names    Block names to adopt, in order.
 * @param {string[]|null} waveIds Waves to take slots from (null for every wave that lists the block).
 * @param {Function} generate Runs the generator for one block name, or whole for null (a test seam; default `runGenerator`).
 * @return {{done: Object[], refused: Object[]}} One row per block. When the final whole run refuses, every file the run
 *   wrote is restored and every block of the run is reported refused.
 */
export function adopt( root, data, names, waveIds, generate = ( name ) => runGenerator( root, name ) ) {
	const files = blockFilesByName( root );
	const startOfRun = captureFiles( root, [ ...files.values() ] );
	const done = [];
	const refused = [];
	for ( const name of names ) {
		const file = files.get( name );
		const spec = specFor( data, name, waveIds );
		if ( ! file || ! spec ) {
			refused.push( { name, reason: ! file ? 'no block.json has this name' : 'not listed in the selected waves' } );
			continue;
		}
		const original = fs.readFileSync( file, 'utf8' );
		const beforeBlock = captureFiles( root, [ file ] );
		try {
			const edit = editBlockText( original, spec );
			if ( edit.text !== original ) {
				fs.writeFileSync( file, edit.text, 'utf8' );
			}
			const gen = generate( name );
			if ( ! gen.ok ) {
				restoreFiles( beforeBlock );
				refused.push( { name, reason: `the generator refused: ${ gen.message }` } );
				continue;
			}
			done.push( { name, slots: edit.adopted, removed: edit.removed, changed: edit.text !== original, notes: gen.notes } );
		} catch ( e ) {
			restoreFiles( beforeBlock );
			if ( ! ( e instanceof Refusal || e instanceof SyntaxError ) ) {
				throw e;
			}
			refused.push( { name, reason: e.message } );
		}
	}
	// A per-block run appends that block's override entries after those already there, so their order follows the order
	// of adoption. One whole run puts them in the generator's own order, which is the order its `--check` expects.
	if ( done.length ) {
		const whole = generate( null );
		if ( ! whole.ok ) {
			restoreFiles( startOfRun );
			const reason = `the whole generator run refused: ${ whole.message } (every file this run wrote was restored)`;
			refused.push( ...done.splice( 0 ).map( ( d ) => ( { name: d.name, reason } ) ), { name: '(whole generator run)', reason: whole.message } );
		}
	}
	return { done, refused };
}

/**
 * Which listed blocks are adopted.
 *
 * @param {string} root Plugin directory.
 * @param {Object} data Parsed data file.
 * @return {{rows: Object[], problems: string[]}} One row per wave and block (`adopted`, `pending` or `half`), and what fails the check.
 */
export function checkAdoption( root, data ) {
	const rows = [];
	const problems = [];
	const listedSlots = new Map();
	const byName = new Map();
	for ( const f of findBlockJsons( path.join( root, 'src', 'blocks' ) ) ) {
		const b = JSON.parse( fs.readFileSync( f, 'utf8' ) );
		byName.set( b.name, b );
	}
	for ( const wave of data.waves ) {
		for ( const [ name, spec ] of Object.entries( wave.blocks ) ) {
			const block = byName.get( name );
			const entries = block?.supports?.sgs?.mediaElements || [];
			const slotKeys = Object.keys( spec.slots );
			listedSlots.set( name, [ ...( listedSlots.get( name ) || [] ), ...slotKeys ] );
			const slotDone = slotKeys.map( ( prefix ) => {
				const e = entries.find( ( x ) => entryPrefix( x ) === prefix );
				const want = spec.slots[ prefix ];
				return !! e && JSON.stringify( [ ...( e.kinds || [] ) ].sort() ) === JSON.stringify( [ ...want.kinds ].sort() ) && e.context === want.context &&
					JSON.stringify( e.atoms || null ) === JSON.stringify( want.atoms || null );
			} );
			const dropGone = ( spec.drop || [] ).map( ( d ) => ! entries.some( ( x ) => entryPrefix( x ) === d ) );
			const attrs = block?.attributes || {};
			const replaceGone = ( spec.replace || [] ).map( ( a ) => ! ( a in attrs ) || attrs[ a ]._generated === 'media-atoms' );
			const parts = [ ...slotDone, ...dropGone, ...replaceGone ];
			let state = 'half';
			if ( parts.every( Boolean ) ) {
				state = 'adopted';
			} else if ( slotDone.every( ( v ) => ! v ) && dropGone.every( ( v ) => ! v ) && replaceGone.every( ( v ) => ! v ) ) {
				state = 'pending';
			}
			rows.push( { wave: wave.id, name, state } );
			if ( state === 'half' ) {
				const missing = [
					...slotKeys.filter( ( _p, i ) => ! slotDone[ i ] ).map( ( p ) => `slot "${ p }" not declared as listed` ),
					...( spec.drop || [] ).filter( ( _d, i ) => ! dropGone[ i ] ).map( ( d ) => `entry "${ d }" still present` ),
					...( spec.replace || [] ).filter( ( _a, i ) => ! replaceGone[ i ] ).map( ( a ) => `attribute "${ a }" still its own` ),
				];
				problems.push( `${ wave.id } ${ name } is half-adopted: ${ missing.join( '; ' ) }` );
			}
		}
	}
	for ( const [ name, block ] of byName ) {
		for ( const e of block.supports?.sgs?.mediaElements || [] ) {
			if ( Array.isArray( e.kinds ) && ! ( listedSlots.get( name ) || [] ).includes( entryPrefix( e ) ) ) {
				problems.push( `${ name } declares kinds on slot "${ entryPrefix( e ) }", which media-adoption.json does not list` );
			}
		}
	}
	for ( const ex of data.excluded || [] ) {
		const b = byName.get( ex.block );
		if ( ( b?.supports?.sgs?.mediaElements || [] ).some( ( e ) => Array.isArray( e.kinds ) ) ) {
			problems.push( `${ ex.block } is excluded (${ ex.reason }) but declares kinds` );
		}
	}
	return { rows, problems };
}

function allNames( data, waveIds ) {
	const names = [];
	for ( const wave of data.waves ) {
		if ( waveIds && ! waveIds.includes( wave.id ) ) {
			continue;
		}
		for ( const name of Object.keys( wave.blocks ) ) {
			if ( ! names.includes( name ) ) {
				names.push( name );
			}
		}
	}
	return names;
}

function printAdopt( result ) {
	for ( const r of result.done ) {
		process.stdout.write( `  ${ r.changed ? 'adopted ' : 'no change' } ${ r.name } [${ r.slots.map( ( s ) => s || '(none)' ).join( ', ' ) }]${ r.removed.length ? ` removed ${ r.removed.join( ', ' ) }` : '' }\n` );
	}
	for ( const r of result.done.filter( ( d ) => d.notes.length ) ) {
		process.stdout.write( r.notes.map( ( n ) => `    note ${ r.name }: ${ n }
` ).join( '' ) );
	}
	for ( const r of result.refused ) {
		process.stdout.write( `  REFUSED  ${ r.name }: ${ r.reason }\n` );
	}
}

// --- self-test -------------------------------------------------------------------------------------------------

function copyTree( root, dest ) {
	const take = [
		'package.json',
		'src',
		path.join( 'scripts', 'generate-media-attributes.mjs' ),
		path.join( 'scripts', 'attr-classification-overrides.json' ),
		path.join( 'scripts', 'data', 'media-adoption.json' ),
		path.join( 'scripts', 'lib', 'media-block-json.mjs' ),
		path.join( 'tests', 'fixtures', 'media' ),
		path.join( 'includes', 'media-element-attributes.generated.php' ),
	];
	for ( const rel of take ) {
		const from = path.join( root, rel );
		if ( ! fs.existsSync( from ) ) {
			throw new Error( `self-test: ${ rel } is missing from ${ root }` );
		}
		fs.mkdirSync( path.dirname( path.join( dest, rel ) ), { recursive: true } );
		fs.cpSync( from, path.join( dest, rel ), { recursive: true, filter: ( s ) => ! s.includes( 'node_modules' ) } );
	}
}

function snapshot( root ) {
	const out = {};
	for ( const f of findBlockJsons( path.join( root, 'src', 'blocks' ) ) ) {
		out[ path.relative( root, f ) ] = fs.readFileSync( f, 'utf8' );
	}
	for ( const rel of GENERATED_SHARED ) {
		out[ rel ] = fs.readFileSync( path.join( root, rel ), 'utf8' );
	}
	return out;
}

async function selfTest() {
	const fails = [];
	let ran = 0;
	const ck = ( n, c ) => {
		ran += 1;
		if ( ! c ) {
			fails.push( n );
		}
	};
	const base = fs.existsSync( 'E:/sgs-tmp' ) ? 'E:/sgs-tmp' : os.tmpdir();
	const tmp = fs.mkdtempSync( path.join( base, 'adopt-selftest-' ) );
	try {
		copyTree( OWN_PLUGIN_DIR, tmp );
		const data = loadData( tmp );
		const vocab = await vocabulary( tmp );
		const files = blockFilesByName( tmp );
		ck( 'the data file is sound', validateData( data, vocab, files ).length === 0 );
		const fresh = snapshot( tmp );
		const generatorCheck = () => spawnSync( process.execPath, [ path.join( tmp, 'scripts', 'generate-media-attributes.mjs' ), '--check' ], { cwd: tmp, encoding: 'utf8' } );

		// Fresh tree: nothing adopted, the check passes.
		const first = checkAdoption( tmp, data );
		ck( 'a fresh tree has every listed block pending and the check passes', first.problems.length === 0 && first.rows.every( ( r ) => r.state === 'pending' ) );

		// NEGATIVE CONTROL 0: a failing final whole run leaves no earlier per-block edit on disk.
		const failWhole = ( name ) => ( name ? runGenerator( tmp, name ) : { ok: false, message: 'planted whole-run failure', notes: [] } );
		const wholeRun = adopt( tmp, data, allNames( data, [ 'wave-1' ] ), [ 'wave-1' ], failWhole );
		ck(
			'negative control: a failing whole generator run restores every file the run wrote and refuses the run',
			wholeRun.done.length === 0 && wholeRun.refused.some( ( r ) => r.reason.includes( 'planted whole-run failure' ) ) && JSON.stringify( snapshot( tmp ) ) === JSON.stringify( fresh )
		);
		// NEGATIVE CONTROL 1: a slot prefix the block does not have is refused, naming it, and the block is untouched.
		const bogus = JSON.parse( JSON.stringify( data ) );
		bogus.waves[ 0 ].blocks[ 'sgs/gallery' ].slots = { nope: { kinds: [ 'image' ], context: 'item' } };
		const gallerySlot = adopt( tmp, bogus, [ 'sgs/gallery' ], [ 'wave-1' ] );
		ck(
			'negative control: an unknown slot prefix is refused naming it',
			gallerySlot.refused.length === 1 && gallerySlot.refused[ 0 ].reason.includes( '"nope"' ) && JSON.stringify( snapshot( tmp ) ) === JSON.stringify( fresh )
		);
		// NEGATIVE CONTROL 2: a rename from a prefix the block does not have is refused, naming it.
		const bogusFrom = JSON.parse( JSON.stringify( data ) );
		bogusFrom.waves[ 0 ].blocks[ 'sgs/gallery' ].slots = { item: { kinds: [ 'image' ], context: 'item', from: 'ghost' } };
		const ghost = adopt( tmp, bogusFrom, [ 'sgs/gallery' ], [ 'wave-1' ] );
		ck( 'negative control: a rename from a missing prefix is refused naming it', ghost.refused.length === 1 && ghost.refused[ 0 ].reason.includes( '"ghost"' ) );
		// NEGATIVE CONTROL 3: a kind the generator does not know fails validation.
		const badKind = JSON.parse( JSON.stringify( data ) );
		badKind.waves[ 0 ].blocks[ 'sgs/gallery' ].slots.item.kinds = [ 'gif' ];
		ck( 'negative control: an unknown kind fails the data check', validateData( badKind, vocab, files ).some( ( p ) => p.includes( 'gif' ) || p.includes( 'kinds' ) ) );

		// The whole map, wave by wave.
		const refusedBlocks = [];
		for ( const wave of data.waves ) {
			const result = adopt( tmp, data, allNames( data, [ wave.id ] ), [ wave.id ] );
			refusedBlocks.push( ...result.refused.map( ( r ) => `${ wave.id } ${ r.name }: ${ r.reason }` ) );
		}
		ck( `every wave adopts with no refusal (${ refusedBlocks.join( ' | ' ) || 'none' })`, refusedBlocks.length === 0 );
		const after = checkAdoption( tmp, data );
		ck( `every listed block is adopted (${ after.problems.join( ' | ' ) || after.rows.filter( ( r ) => r.state !== 'adopted' ).map( ( r ) => r.name ).join( ', ' ) || 'ok' })`, after.problems.length === 0 && after.rows.every( ( r ) => r.state === 'adopted' ) );
		const gen = generatorCheck();
		ck( `the generator's --check is clean on the adopted tree (${ ( gen.stderr || gen.stdout ).trim().slice( 0, 200 ) })`, gen.status === 0 );

		// Idempotent: a second run over every wave changes no byte.
		const adoptedSnap = snapshot( tmp );
		adopt( tmp, data, allNames( data, null ), null );
		ck( 'a second run changes nothing', JSON.stringify( snapshot( tmp ) ) === JSON.stringify( adoptedSnap ) );

		// NEGATIVE CONTROL 4: a half-adopted block fails the check.
		const opacityBlock = files.get( 'sgs/media' );
		const mediaText = fs.readFileSync( opacityBlock, 'utf8' );
		const mediaJson = JSON.parse( mediaText );
		mediaJson.supports.sgs.mediaElements[ 0 ].kinds = [ 'image' ];
		fs.writeFileSync( opacityBlock, JSON.stringify( mediaJson, null, '\t' ), 'utf8' );
		ck( 'negative control: a slot declaring other kinds than the data lists fails the check as half-adopted', checkAdoption( tmp, data ).problems.some( ( p ) => p.includes( 'sgs/media' ) && p.includes( 'half-adopted' ) ) );
		fs.writeFileSync( opacityBlock, mediaText, 'utf8' );
		// NEGATIVE CONTROL 5: a block outside the data that declares kinds fails the check.
		const cartFile = files.get( 'sgs/cart' );
		const cartText = fs.readFileSync( cartFile, 'utf8' );
		const cart = JSON.parse( cartText );
		cart.supports.sgs.mediaElements[ 0 ].kinds = [ 'image' ];
		fs.writeFileSync( cartFile, JSON.stringify( cart, null, '\t' ), 'utf8' );
		ck( 'negative control: an excluded or unlisted block declaring kinds fails the check', checkAdoption( tmp, data ).problems.some( ( p ) => p.includes( 'sgs/cart' ) ) );
		fs.writeFileSync( cartFile, cartText, 'utf8' );
		ck( 'the temp copy is restored after the negative controls', JSON.stringify( snapshot( tmp ) ) === JSON.stringify( adoptedSnap ) );
		ck( 'the worktree itself was not written', JSON.stringify( snapshot( OWN_PLUGIN_DIR ) ) === JSON.stringify( ownBefore ) );
	} finally {
		fs.rmSync( tmp, { recursive: true, force: true } );
	}
	fails.forEach( ( f ) => process.stdout.write( `  FAIL ${ f }\n` ) );
	const before = fails.length;
	ck( 'NEGATIVE CONTROL (expected to fail)', false );
	const controlWorks = fails.length === before + 1;
	fails.pop();
	ran -= 1;
	if ( ! controlWorks ) {
		process.stdout.write( 'FAIL - the harness cannot detect a failure\n' );
		return 1;
	}
	process.stdout.write( `\n${ fails.length ? 'FAIL' : 'PASS' } - ${ ran - fails.length }/${ ran } assertions (negative controls verified)\n` );
	return fails.length ? 1 : 0;
}

// --- command line ----------------------------------------------------------------------------------------------

const args = process.argv.slice( 2 );
const flag = ( name ) => args.indexOf( name );
const valueOf = ( name ) => ( flag( name ) !== -1 ? args[ flag( name ) + 1 ] : null );
const KNOWN = [ '--wave', '--block', '--all', '--check', '--self-test', '--root', '--data' ];
const unknown = args.filter( ( a, i ) => a.startsWith( '--' ) && ! KNOWN.includes( a ) );
const usage = `usage: adopt-media-blocks.mjs --wave ID[,ID] | --block SLUG | --all | --check | --self-test  [--root DIR] [--data FILE]\n`;

let ownBefore = null;

async function main() {
	if ( unknown.length ) {
		process.stderr.write( `unknown argument(s): ${ unknown.join( ' ' ) }\n${ usage }` );
		return 2;
	}
	if ( flag( '--self-test' ) !== -1 ) {
		ownBefore = snapshot( OWN_PLUGIN_DIR );
		return selfTest();
	}
	const root = path.resolve( valueOf( '--root' ) || OWN_PLUGIN_DIR );
	const data = loadData( root, valueOf( '--data' ) );
	const vocab = await vocabulary( root );
	const files = blockFilesByName( root );
	const dataProblems = validateData( data, vocab, files );
	if ( dataProblems.length ) {
		process.stderr.write( `media-adoption.json is not sound:\n  ${ dataProblems.join( '\n  ' ) }\n` );
		return 1;
	}
	if ( flag( '--check' ) !== -1 ) {
		const { rows, problems } = checkAdoption( root, data );
		for ( const r of rows ) {
			process.stdout.write( `  ${ r.state.padEnd( 8 ) } ${ r.wave.padEnd( 7 ) } ${ r.name }\n` );
		}
		const counts = [ 'adopted', 'pending', 'half' ].map( ( s ) => `${ rows.filter( ( r ) => r.state === s ).length } ${ s }` ).join( ', ' );
		if ( problems.length ) {
			process.stderr.write( `[adopt-media-blocks] FAIL (${ counts }):\n  ${ problems.join( '\n  ' ) }\n` );
			return 1;
		}
		process.stdout.write( `[adopt-media-blocks] OK (${ counts })\n` );
		return 0;
	}
	let names;
	let waveIds = null;
	if ( valueOf( '--wave' ) ) {
		waveIds = valueOf( '--wave' ).split( ',' );
		const missing = waveIds.filter( ( id ) => ! data.waves.some( ( w ) => w.id === id ) );
		if ( missing.length ) {
			process.stderr.write( `no wave named ${ missing.join( ', ' ) }; waves: ${ data.waves.map( ( w ) => w.id ).join( ', ' ) }\n` );
			return 2;
		}
		names = allNames( data, waveIds );
	} else if ( valueOf( '--block' ) ) {
		const slug = valueOf( '--block' );
		names = [ slug.includes( '/' ) ? slug : `sgs/${ slug }` ];
	} else if ( flag( '--all' ) !== -1 ) {
		names = allNames( data, null );
	} else {
		process.stderr.write( usage );
		return 2;
	}
	const result = adopt( root, data, names, waveIds );
	printAdopt( result );
	process.stdout.write( `[adopt-media-blocks] ${ result.done.length } block(s) processed, ${ result.refused.length } refused\n` );
	return result.refused.length ? 1 : 0;
}

process.exit( await main() );
