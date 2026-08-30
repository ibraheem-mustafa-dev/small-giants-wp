#!/usr/bin/env node
/**
 * Concatenate the media-atom CSS partials into the one enqueued stylesheet.
 *
 * WHY THIS EXISTS
 * ---------------
 * L4 says the media layer has ONE stylesheet loaded in both realms. But the ten
 * atoms are built by separate agents in parallel, and four writers appending to
 * one file clobber each other - the recorded failure this repo already carries
 * a rule about. So each atom owns `assets/css/media-atoms/<atom>.css` outright
 * and this generator assembles them.
 *
 * The output is still ONE file and ONE enqueue. The split is an authoring
 * concern, not a delivery one.
 *
 * ORDER IS ALPHABETICAL AFTER `_base.css`, and that is deliberate: CSS cascade
 * means a later rule of equal specificity wins, so a stable, mechanical order is
 * the only way two atoms touching the same property produce the same result on
 * every machine. `_base.css` is always first because it establishes the scope
 * class and the tier variables everything else reads.
 *
 * ⛔ NEVER EDIT `assets/css/media-element.css` BY HAND. It is generated, and
 * `--check` fails the build when it drifts from the partials.
 *
 * Run:
 *   node scripts/generate-media-stylesheet.mjs           # write
 *   node scripts/generate-media-stylesheet.mjs --check   # gate
 *   node scripts/generate-media-stylesheet.mjs --self-test
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const PLUGIN = path.resolve( HERE, '..' );
const SRC_DIR = path.join( PLUGIN, 'assets', 'css', 'media-atoms' );
const OUT = path.join( PLUGIN, 'assets', 'css', 'media-element.css' );

const HEADER = `/*
 * GENERATED FILE - DO NOT EDIT.
 *
 * Source:     assets/css/media-atoms/*.css
 * Regenerate: node scripts/generate-media-stylesheet.mjs
 * Gate:       node scripts/generate-media-stylesheet.mjs --check
 *
 * Edit the partial that owns the rule, never this file. A hand edit here is
 * silently discarded by the next build.
 */
`;

/** Partials in cascade order: _base.css first, then alphabetical. */
function partials() {
	if ( ! fs.existsSync( SRC_DIR ) ) {
		return [];
	}
	const all = fs
		.readdirSync( SRC_DIR )
		.filter( ( f ) => f.endsWith( '.css' ) )
		.sort();
	const base = all.filter( ( f ) => f === '_base.css' );
	const rest = all.filter( ( f ) => f !== '_base.css' );
	return [ ...base, ...rest ];
}

function build() {
	const files = partials();
	const bodies = files.map( ( f ) => {
		const body = fs.readFileSync( path.join( SRC_DIR, f ), 'utf8' ).trimEnd();
		return `/* ── ${ f } ${ '─'.repeat( Math.max( 0, 66 - f.length ) ) } */\n${ body }\n`;
	} );
	return { text: HEADER + '\n' + bodies.join( '\n' ), files };
}

function run() {
	const { text, files } = build();

	// FAIL CLOSED on an empty source directory. Writing an empty stylesheet
	// would silently strip every rule the layer has, and the enqueue would keep
	// succeeding - a green build with no styling at all.
	if ( ! files.length ) {
		process.stderr.write(
			'[media-stylesheet] REFUSING to write: no partials found in ' +
				'assets/css/media-atoms/. Expected at least _base.css.\n'
		);
		return 1;
	}
	if ( ! files.includes( '_base.css' ) ) {
		process.stderr.write(
			'[media-stylesheet] REFUSING to write: _base.css is missing. It ' +
				'establishes the scope class and tier variables every atom reads.\n'
		);
		return 1;
	}

	if ( process.argv.includes( '--check' ) ) {
		const current = fs.existsSync( OUT ) ? fs.readFileSync( OUT, 'utf8' ) : '';
		if ( current !== text ) {
			process.stderr.write(
				'[media-stylesheet] STALE: assets/css/media-element.css does not ' +
					'match the partials it is generated from.\n' +
					'Run: node scripts/generate-media-stylesheet.mjs\n'
			);
			return 1;
		}
		process.stdout.write(
			`[media-stylesheet] OK - ${ files.length } partial(s) in sync.\n`
		);
		return 0;
	}

	fs.writeFileSync( OUT, text );
	process.stdout.write(
		`[media-stylesheet] wrote assets/css/media-element.css from ` +
			`${ files.length } partial(s): ${ files.join( ', ' ) }\n`
	);
	return 0;
}

function selfTest() {
	const cases = [];
	const ck = ( n, c ) => cases.push( [ n, c ] );

	const files = partials();
	ck( '_base.css exists', files.includes( '_base.css' ) );
	ck( '_base.css sorts FIRST', files[ 0 ] === '_base.css' );

	const { text } = build();
	ck( 'output carries the DO-NOT-EDIT header', text.includes( 'GENERATED FILE' ) );
	ck( 'output carries the base scope class', text.includes( '.sgs-media-el' ) );
	ck(
		'every partial appears in the output',
		files.every( ( f ) => text.includes( f ) )
	);

	// Cascade order must be stable, not filesystem-dependent.
	const fake = [ 'overlay.css', '_base.css', 'box-shape.css' ].sort();
	const ordered = [
		...fake.filter( ( f ) => f === '_base.css' ),
		...fake.filter( ( f ) => f !== '_base.css' ),
	];
	ck(
		'ordering puts _base first then alphabetical',
		JSON.stringify( ordered ) ===
			JSON.stringify( [ '_base.css', 'box-shape.css', 'overlay.css' ] )
	);

	// NEGATIVE CONTROL - the generated output must actually DIFFER from a
	// partial, or "in sync" would be trivially true and the gate decorative.
	const basePath = path.join( SRC_DIR, '_base.css' );
	ck(
		'NEGATIVE CONTROL: output differs from the raw partial',
		text !== fs.readFileSync( basePath, 'utf8' )
	);

	// And the real generated file must be in sync right now.
	const current = fs.existsSync( OUT ) ? fs.readFileSync( OUT, 'utf8' ) : '';
	ck( 'the committed stylesheet is IN SYNC with its partials', current === text );

	let failed = 0;
	cases.forEach( ( [ n, c ] ) => {
		process.stdout.write( `  ${ c ? 'PASS' : 'FAIL' }  ${ n }\n` );
		if ( ! c ) {
			failed++;
		}
	} );
	process.stdout.write( `\n${ cases.length - failed }/${ cases.length } passed\n` );
	return failed ? 1 : 0;
}

process.exit( process.argv.includes( '--self-test' ) ? selfTest() : run() );
