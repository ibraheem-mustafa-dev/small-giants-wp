/**
 * Shared helpers for probe-motion-model.mjs (Spec 38A unit M2.9): argument parsing, site lookup, fixture schema
 * validation, the result reporter and the pure judges. The judges take a measurement and return pass or fail; the live
 * checks and `--self-test` both run them, so a judge that cannot fail is caught offline.
 *
 * @package SGS\Blocks
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkMotion } from '../../../../scripts/computed-route/lib/motion-schema.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const REPO = path.resolve( HERE, '../../../..' );
export const FIXTURE_DIR = path.join( REPO, 'plugins', 'sgs-blocks', 'tests', 'fixtures', 'motion', 'pages' );
export const ENGINES = [ 'chromium', 'firefox', 'webkit' ];
export const WIDTHS = [ 1440, 768, 375 ];

/** Parse argv: --page (repeatable), --engine (repeatable), --width (repeatable), --site, --self-test, --validate-fixtures. */
export function parseArgs( argv ) {
	const args = { pages: [], engines: [], widths: [], site: 'sandybrown', selfTest: false, validateFixtures: false, scrollDriverUrl: '' };
	for ( let i = 2; i < argv.length; i++ ) {
		const a = argv[ i ];
		if ( a === '--page' ) args.pages.push( argv[ ++i ] );
		else if ( a === '--engine' ) args.engines.push( argv[ ++i ] );
		else if ( a === '--width' ) args.widths.push( Number( argv[ ++i ] ) );
		else if ( a === '--site' ) args.site = argv[ ++i ];
		else if ( a === '--scroll-driver-url' ) args.scrollDriverUrl = argv[ ++i ];
		else if ( a === '--self-test' ) args.selfTest = true;
		else if ( a === '--validate-fixtures' ) args.validateFixtures = true;
		else throw new Error( `Unknown argument ${ a }` );
	}
	if ( ! args.engines.length ) args.engines = [ 'chromium' ];
	if ( ! args.widths.length ) args.widths = [ 1440 ];
	for ( const e of args.engines ) if ( ! ENGINES.includes( e ) ) throw new Error( `--engine must be one of ${ ENGINES.join( ', ' ) }` );
	for ( const w of args.widths ) if ( ! WIDTHS.includes( w ) ) throw new Error( `--width must be one of ${ WIDTHS.join( ', ' ) }` );
	return args;
}

/** The site's public base URL from `.claude/secrets/<site>.env` (the first WP_URL_* line; credentials are never read). */
export function siteBase( site ) {
	const file = path.join( REPO, '.claude', 'secrets', `${ site }.env` );
	const line = fs.readFileSync( file, 'utf8' ).split( /\r?\n/ ).find( ( l ) => /^WP_URL_[A-Z0-9]+=/.test( l ) );
	if ( ! line ) throw new Error( `No WP_URL_* line in ${ file }` );
	return line.slice( line.indexOf( '=' ) + 1 ).trim().replace( /^['"]|['"]$/g, '' ).replace( /\/+$/, '' );
}

/** Every `sgsMotion` value in a block tree, with the block name and className that carries it. */
export function collectMotion( blocks, found = [] ) {
	for ( const b of blocks ) {
		const attrs = b.attributes || {};
		if ( attrs.sgsMotion ) found.push( { block: b.name, className: attrs.className || '', motion: attrs.sgsMotion } );
		collectMotion( b.innerBlocks || [], found );
	}
	return found;
}

/** Validate every fixture's sgsMotion value against the schema and the refusals. Returns { rows, ok }. */
export function validateFixtures() {
	const rows = [];
	for ( const file of fs.readdirSync( FIXTURE_DIR ).filter( ( f ) => f.endsWith( '.json' ) ) ) {
		const tree = JSON.parse( fs.readFileSync( path.join( FIXTURE_DIR, file ), 'utf8' ) );
		for ( const item of collectMotion( tree ) ) {
			const verdict = checkMotion( item.motion );
			rows.push( { file, block: item.block, className: item.className, valid: verdict.valid, errors: [ ...verdict.errors, ...verdict.refusals ] } );
		}
	}
	return { rows, ok: rows.length > 0 && rows.every( ( r ) => r.valid ) };
}

/** Collects result rows; a row is PASS, FAIL, UNANSWERED, CONTROL_RED (good) or CONTROL_PASSED (a failure). */
export class Reporter {
	constructor( context ) {
		this.context = context;
		this.rows = [];
	}

	/** A check row. `pass` null means the check could not be answered; `why` explains. */
	check( id, { selector = '', property = '', measured = null, expected = null, pass, why = '' } ) {
		const verdict = pass === null ? 'UNANSWERED' : pass ? 'PASS' : 'FAIL';
		this.push( { check: id, selector, property, measured, expected, verdict, why } );
	}

	/** A negative-control row: `red` is true when the planted fault turned the check red (as it must). */
	control( id, { selector = '', property = '', measured = null, expected = null, red, why = '' } ) {
		const verdict = red === null ? 'UNANSWERED' : red ? 'CONTROL_RED' : 'CONTROL_PASSED';
		this.push( { check: `${ id }/control`, selector, property, measured, expected, verdict, why } );
	}

	push( row ) {
		const full = { ...this.context, ...row };
		this.rows.push( full );
		console.log( JSON.stringify( full ) );
	}

	/** Print the summary and return the exit code: 1 on any FAIL or CONTROL_PASSED, 2 when only UNANSWERED remain, else 0. */
	summary() {
		const count = ( v ) => this.rows.filter( ( r ) => r.verdict === v ).length;
		const summary = {
			summary: true,
			pass: count( 'PASS' ),
			fail: count( 'FAIL' ),
			unanswered: count( 'UNANSWERED' ),
			controlsRed: count( 'CONTROL_RED' ),
			controlsPassed: count( 'CONTROL_PASSED' ),
		};
		console.log( JSON.stringify( summary ) );
		if ( summary.fail || summary.controlsPassed ) return 1;
		return summary.unanswered ? 2 : 0;
	}
}

// ---- Pure judges -----------------------------------------------------------------------------------------------

const COLOUR_AND_SHADOW = [ 'background-color', 'color', 'border-color', 'box-shadow', 'fill', 'stroke', 'text-decoration-color', 'outline-color' ];

/** A hover target's transition-property list: only registered owners it changes, plus colour and shadow; never `all`. */
export function judgeTransitionProperty( list, changedOwners, forbiddenOwners ) {
	const props = list.map( ( p ) => p.trim() ).filter( Boolean );
	if ( props.includes( 'all' ) ) return false;
	if ( ! changedOwners.every( ( o ) => props.includes( o ) ) ) return false;
	if ( props.some( ( p ) => forbiddenOwners.includes( p ) ) ) return false;
	return props.every( ( p ) => changedOwners.includes( p ) || COLOUR_AND_SHADOW.includes( p ) );
}

/** Split a computed `translate` ("none" or "<x> <y>") into numbers in px. */
export function parseTranslate( value ) {
	if ( ! value || value === 'none' ) return { x: 0, y: 0, none: true };
	const parts = value.split( /\s+/ ).map( parseFloat );
	return { x: parts[ 0 ] || 0, y: parts[ 1 ] || 0, none: false };
}

/** True when a computed `translate` is at rest: `none`, or every component zero (an element holding a persistent hover formula computes `0px`). */
export const isRest = ( value ) => { const t = parseTranslate( value ); return t.none || ( t.x === 0 && t.y === 0 ); };

/** True when two numbers agree within a tolerance. */
export const near = ( a, b, tol ) => Number.isFinite( a ) && Number.isFinite( b ) && Math.abs( a - b ) <= tol;

/** Expected `--sgs-scroll-progress` of an element crossing the viewport: 0 at its top meeting the bottom, 1 at its bottom meeting the top. */
export function viewProgress( top, height, viewport ) {
	return Math.min( 1, Math.max( 0, ( viewport - top ) / ( viewport + height ) ) );
}

/** True when a `style` attribute text writes a transform-family property. */
export const styleWritesTransform = ( style ) => /(^|;|\s)(transform|translate|rotate|scale|opacity)\s*:/i.test( style || '' );

/** The offline self-test: every judge must accept a good measurement and reject a planted bad one. Returns failures. */
export function selfTest() {
	const failures = [];
	const expectTrue = ( name, v ) => { if ( v !== true ) failures.push( `${ name }: expected true` ); };
	const expectFalse = ( name, v ) => { if ( v !== false ) failures.push( `${ name }: expected false` ); };
	const owners = [ '--sgs-mh-ty', '--sgs-mh-s' ];
	const forbidden = [ '--sgs-mh-rot', 'opacity' ];
	expectTrue( 'transition lift only', judgeTransitionProperty( [ '--sgs-mh-ty', '--sgs-mh-s', 'background-color' ], owners, forbidden ) );
	expectFalse( 'transition all', judgeTransitionProperty( [ 'all' ], owners, forbidden ) );
	expectFalse( 'transition unregistered owner', judgeTransitionProperty( [ '--sgs-mh-ty', '--sgs-mh-s', '--sgs-mh-rot' ], owners, forbidden ) );
	expectFalse( 'transition missing owner', judgeTransitionProperty( [ '--sgs-mh-ty' ], owners, forbidden ) );
	expectFalse( 'transition stray property', judgeTransitionProperty( [ '--sgs-mh-ty', '--sgs-mh-s', 'margin-top' ], owners, forbidden ) );
	expectTrue( 'translate parse', near( parseTranslate( '4px -6px' ).y, -6, 0.5 ) && parseTranslate( 'none' ).none );
	expectFalse( 'near rejects a gap', near( -6, -4, 0.5 ) );
	expectTrue( 'view progress mid', near( viewProgress( 300, 200, 800 ), 0.5, 0.0001 ) );
	expectFalse( 'view progress differs', near( viewProgress( 700, 200, 800 ), 0.5, 0.01 ) );
	expectTrue( 'style transform detected', styleWritesTransform( 'color:red; transform: rotate(2deg)' ) );
	expectFalse( 'style without transform', styleWritesTransform( 'color:red; --sgs-mag-x: 4px' ) );
	const fixtures = validateFixtures();
	if ( ! fixtures.ok ) failures.push( `fixtures: ${ JSON.stringify( fixtures.rows.filter( ( r ) => ! r.valid ) ) }` );
	const planted = checkMotion( { v: 1, elements: { root: { hover: { state: { values: { translateY: -6, nonsense: 1 } } } } } } );
	if ( planted.valid ) failures.push( 'schema accepted a planted unknown key' );
	return failures;
}
