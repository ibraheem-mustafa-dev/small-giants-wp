/**
 * Probe: a one-edge clip wipe closes only its own edge (Spec 38A §10 clip-path row, the `open` trigger's close values).
 *
 * Loads the real `assets/css/motion.css` and `assets/css/motion-triggers.css` into a local page, no site involved, and
 * reads the four clip edges of a closing `open` entrance (`data-sgs-me="open clip-path"`, `data-sgs-motion-state="close"`)
 * in two places:
 *   - reduced motion: the close rule's held values `--sgs-mt-op-clip-t/r/b/l`;
 *   - full motion: the close keyframe `sgs-me-close-clip-path` paused at its end, `--sgs-me-clip-t/r/b/l`.
 * Each case sets its holders in a stylesheet rule (no `style` attribute), as the PHP emitter prints them.
 *
 * CHECKS
 *   edge:<mode>      only `--sgs-me-close-to-clip-b:100%` (what `Sgs_Motion_Clip_Edge::close` writes for a bottom wipe)
 *                    reads ["0%","0%","100%","0%"]
 *   edge-over-from:<mode>  `--sgs-me-from-clip-b:100%` with `--sgs-me-close-to-clip-b:60%` reads ["0%","0%","60%","0%"]:
 *                    the edge close holder beats the edge from-value
 *   uniform:<mode>   only `--sgs-me-close-to-clip:100%` (clipEdge all) reads four 100%
 *   from-only:<mode> only `--sgs-me-from-clip-b:100%` (no close value) closes back the way it opened: ["0%","0%","100%","0%"]
 *   control:<mode>   negative control: the edge judge on the uniform case's reading must come out red
 *   recorded:<mode>  information only: `--sgs-me-from-clip-b:100%` with the uniform `--sgs-me-close-to-clip:100%` (the
 *                    shape the emitter wrote for a one-edge wipe before the per-edge close holders) reads four 100%
 *
 * Usage:
 *   node plugins/sgs-blocks/scripts/motion-qa/probe-close-clip-edges.mjs
 *   node plugins/sgs-blocks/scripts/motion-qa/probe-close-clip-edges.mjs --self-test   (offline: the judge only)
 * MOTION_CSS_FILE / MOTION_TRIGGERS_CSS_FILE override the stylesheet paths, for a negative control on a planted copy.
 * Output: one line per check, then a summary. Exit: 0 all pass; 1 any FAIL or a control that did not go red; 2 the
 * browser could not run (UNANSWERED).
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname( fileURLToPath( import.meta.url ) );
const PLUGIN = resolve( HERE, '..', '..' );

/** The cases: id => the holders the case's rule declares, and the four edges (t, r, b, l) it must read. */
export const CASES = {
	edge: { decls: { '--sgs-me-close-to-clip-b': '100%' }, want: [ '0%', '0%', '100%', '0%' ] },
	'edge-over-from': {
		decls: { '--sgs-me-from-clip-b': '100%', '--sgs-me-close-to-clip-b': '60%' },
		want: [ '0%', '0%', '60%', '0%' ],
	},
	uniform: { decls: { '--sgs-me-close-to-clip': '100%' }, want: [ '100%', '100%', '100%', '100%' ] },
	'from-only': { decls: { '--sgs-me-from-clip-b': '100%' }, want: [ '0%', '0%', '100%', '0%' ] },
	recorded: { decls: { '--sgs-me-from-clip-b': '100%', '--sgs-me-close-to-clip': '100%' }, want: null },
};

/**
 * The judge: the four edges read exactly the wanted values, in inset() order.
 *
 * @param {unknown}  got  Four computed values.
 * @param {string[]} want Four wanted values.
 * @return {boolean} Pass.
 */
export function judge( got, want ) {
	return (
		Array.isArray( got ) &&
		Array.isArray( want ) &&
		got.length === 4 &&
		want.length === 4 &&
		got.every( ( value, i ) => String( value ).trim() === want[ i ] )
	);
}

function selfTest() {
	const rows = [
		[ judge( [ '0%', '0%', '100%', '0%' ], CASES.edge.want ), 'the judge passes the wanted one-edge reading' ],
		[ ! judge( [ '100%', '100%', '100%', '100%' ], CASES.edge.want ), 'the judge rejects four uniform edges' ],
		[ ! judge( [ '0%', '0%', '0%', '0%' ], CASES.edge.want ), 'the judge rejects an unread edge holder' ],
		[ ! judge( [ '0%', '0%', '100%' ], CASES.edge.want ), 'the judge rejects a short reading' ],
		[ ! judge( null, CASES.edge.want ), 'the judge rejects a missing reading' ],
		[ judge( [ ' 100%', '100%', '100%', '100% ' ], CASES.uniform.want ), 'the judge trims computed whitespace' ],
	];
	let failed = 0;
	rows.forEach( ( [ ok, label ] ) => {
		failed += ok ? 0 : 1;
		console.log( `${ ok ? 'ok  ' : 'FAIL' } self-test: ${ label }` );
	} );
	console.log( `${ failed ? 'FAIL' : 'PASS' }: ${ rows.length } self-test checks, ${ failed } failed` );
	return failed ? 1 : 0;
}

function page() {
	const css = [
		process.env.MOTION_CSS_FILE || resolve( PLUGIN, 'assets', 'css', 'motion.css' ),
		process.env.MOTION_TRIGGERS_CSS_FILE || resolve( PLUGIN, 'assets', 'css', 'motion-triggers.css' ),
	].map( ( file ) => readFileSync( file, 'utf8' ) );
	const rules = Object.entries( CASES )
		.map( ( [ id, { decls } ] ) => `#${ id } { ${ Object.entries( decls ).map( ( [ k, v ] ) => `${ k }: ${ v };` ).join( ' ' ) } }` )
		.join( '\n' );
	const els = Object.keys( CASES )
		.map( ( id ) => `<div id="${ id }" data-sgs-me="open clip-path" data-sgs-motion-state="close">${ id }</div>` )
		.join( '\n' );
	return `<!doctype html><html><head>${ css.map( ( t ) => `<style>${ t }</style>` ).join( '\n' ) }<style>${ rules }</style></head><body>${ els }</body></html>`;
}

async function read( browser, reducedMotion ) {
	const tab = await browser.newPage( { reducedMotion } );
	await tab.setContent( page() );
	const prefix = 'reduce' === reducedMotion ? '--sgs-mt-op-clip-' : '--sgs-me-clip-';
	return tab.evaluate(
		( { ids, pre } ) => {
			document.getAnimations().forEach( ( animation ) => {
				animation.pause();
				animation.currentTime = animation.effect.getComputedTiming().endTime;
			} );
			const out = {};
			ids.forEach( ( id ) => {
				const cs = getComputedStyle( document.getElementById( id ) );
				out[ id ] = [ 't', 'r', 'b', 'l' ].map( ( e ) => cs.getPropertyValue( pre + e ).trim() );
			} );
			out.running = document.getAnimations().length;
			return out;
		},
		{ ids: Object.keys( CASES ), pre: prefix }
	);
}

async function main() {
	let chromium;
	let browser;
	try {
		( { chromium } = await import( 'playwright' ) );
		browser = await chromium.launch();
	} catch ( error ) {
		console.log( `UNANSWERED: the browser could not start (${ error.message })` );
		return 2;
	}
	let failed = 0;
	const check = ( ok, label, value ) => {
		failed += ok ? 0 : 1;
		console.log( `${ ok ? 'ok  ' : 'FAIL' } ${ label }: ${ JSON.stringify( value ) }` );
	};
	try {
		for ( const mode of [ 'reduce', 'no-preference' ] ) {
			const got = await read( browser, mode );
			const tag = 'reduce' === mode ? 'reduced' : 'keyframe';
			if ( 'no-preference' === mode ) {
				check( got.running >= Object.keys( CASES ).length, `animations:${ tag } every case plays the close keyframe`, got.running );
			}
			for ( const [ id, { want } ] of Object.entries( CASES ) ) {
				if ( null === want ) {
					console.log( `info ${ id }:${ tag }: ${ JSON.stringify( got[ id ] ) }` );
					continue;
				}
				check( judge( got[ id ], want ), `${ id }:${ tag } reads ${ JSON.stringify( want ) }`, got[ id ] );
			}
			check( ! judge( got.uniform, CASES.edge.want ), `control:${ tag } the edge judge is red on the uniform reading`, got.uniform );
		}
	} finally {
		await browser.close();
	}
	console.log( `${ failed ? 'FAIL' : 'PASS' }: ${ failed } failed` );
	return failed ? 1 : 0;
}

process.exit( process.argv.includes( '--self-test' ) ? selfTest() : await main() );
