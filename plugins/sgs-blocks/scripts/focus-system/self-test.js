'use strict';

/**
 * Self-test for check-focus-system.js: the six migration-method fixtures.
 *
 * 1. positive      a bespoke :focus-visible outline (and suppress, radius, glow) is removed.
 * 2. definition    retired tokens are flagged legacy-token; the fixer leaves the file alone.
 * 3. edge          an SCSS `&:focus-visible` and nested `@media` are classified and fixed.
 * 4. negative      a `:hover`-only rule and a `:focus-within` container are byte-identical after --fix.
 * 5. idempotence   --fix on its own output changes nothing.
 * 6. corpus        on a temp copy of the real corpus the dumb `:focus` count reconciles with the
 *                  classifier, a planted `.x:focus-visible{outline:2px solid red}` turns --check red,
 *                  and removing it turns --check green again.
 *
 * @package SGS\Blocks
 */

const fs = require( 'fs' );
const os = require( 'os' );
const path = require( 'path' );

const { analyseCss } = require( './classify-css.js' );
const { fixText } = require( './fixer.js' );
const { buildCensus } = require( './census.js' );
const { runCheck, baselineFromCensus } = require( './check.js' );
const { listCorpus } = require( './corpus.js' );

const FIXTURES = path.join( __dirname, 'fixtures' );

function read( name ) {
	return fs.readFileSync( path.join( FIXTURES, name ), 'utf8' );
}

function categories( findings ) {
	const out = {};
	for ( const f of findings ) {
		out[ f.category ] = ( out[ f.category ] || 0 ) + 1;
	}
	return out;
}

function expectEqual( label, actual, expected, errors ) {
	if ( actual !== expected ) {
		errors.push( `${ label }: expected ${ JSON.stringify( expected ) }, got ${ JSON.stringify( actual ) }` );
	}
}

function casePositive() {
	const errors = [];
	const src = read( 'positive.css' );
	const { findings } = analyseCss( src, 'fixtures/positive.css', {} );
	const cats = categories( findings );
	expectEqual( 'bespoke findings', cats.bespoke || 0, 4, errors );
	expectEqual( 'suppress findings', cats.suppress || 0, 1, errors );
	expectEqual( 'radius-on-focus findings', cats[ 'radius-on-focus' ] || 0, 1, errors );
	const fixed = fixText( src, 'fixtures/positive.css', {} );
	expectEqual( 'fixed text', fixed.text, read( 'positive.fixed.css' ), errors );
	expectEqual( 'orphan comments reported', fixed.orphanComments.length, 1, errors );
	return errors;
}

function caseDefinition() {
	const errors = [];
	const src = read( 'definition.css' );
	const { findings } = analyseCss( src, 'fixtures/definition.css', {} );
	const cats = categories( findings );
	expectEqual( 'legacy-token findings', cats[ 'legacy-token' ] || 0, 3, errors );
	expectEqual( 'no other target findings', Object.keys( cats ).filter( ( c ) => 'legacy-token' !== c ).length, 0, errors );
	expectEqual( 'fixer leaves definitions alone', fixText( src, 'fixtures/definition.css', {} ).text, src, errors );
	return errors;
}

function caseEdge() {
	const errors = [];
	const scss = read( 'edge.scss' );
	const scssFindings = categories( analyseCss( scss, 'fixtures/edge.scss', {} ).findings );
	expectEqual( 'scss bespoke findings', scssFindings.bespoke || 0, 3, errors );
	expectEqual( 'scss fixed text', fixText( scss, 'fixtures/edge.scss', {} ).text, read( 'edge.fixed.scss' ), errors );
	const media = read( 'edge-media.css' );
	const { items } = analyseCss( media, 'fixtures/edge-media.css', {} );
	const forced = items.filter( ( i ) => 'forced-resting' === i.category ).length;
	expectEqual( 'forced-colours resting rule kept as forced-resting', forced, 1, errors );
	expectEqual( 'media fixed text', fixText( media, 'fixtures/edge-media.css', {} ).text, read( 'edge-media.fixed.css' ), errors );
	return errors;
}

function caseNegative() {
	const errors = [];
	const src = read( 'negative.css' );
	const { items, findings } = analyseCss( src, 'fixtures/negative.css', {} );
	expectEqual( 'no target findings', findings.length, 0, errors );
	const cats = items.map( ( i ) => i.category ).sort().join( ',' );
	expectEqual( 'item categories', cats, 'container,resting-outline', errors );
	expectEqual( 'byte-identical after --fix', fixText( src, 'fixtures/negative.css', {} ).text, src, errors );
	return errors;
}

function caseIdempotence() {
	const errors = [];
	for ( const name of [ 'positive.css', 'edge.scss', 'edge-media.css', 'negative.css', 'definition.css' ] ) {
		const once = fixText( read( name ), `fixtures/${ name }`, {} ).text;
		const twice = fixText( once, `fixtures/${ name }`, {} ).text;
		expectEqual( `${ name } fix twice`, twice, once, errors );
	}
	return errors;
}

function caseCorpus( repoRoot, allow ) {
	const errors = [];
	const files = listCorpus( repoRoot );
	const tmp = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-focus-system-' ) );
	try {
		for ( const rel of files ) {
			const dest = path.join( tmp, rel );
			fs.mkdirSync( path.dirname( dest ), { recursive: true } );
			fs.copyFileSync( path.join( repoRoot, rel ), dest );
		}
		const before = buildCensus( { root: tmp, files, allow } );
		if ( before.control.failures.length ) {
			errors.push( `corpus control on the copy: ${ before.control.failures.slice( 0, 3 ).join( '; ' ) }` );
		}
		expectEqual( 'unrecognised on the copy', before.counts.items.unrecognised || 0, 0, errors );
		const baseline = baselineFromCensus( before );
		expectEqual( 'clean copy --check', runCheck( before, baseline, { allow } ).failures.length, 0, errors );

		const target = 'plugins/sgs-blocks/src/blocks/button/style.css';
		const abs = path.join( tmp, target );
		const original = fs.readFileSync( abs, 'utf8' );
		fs.writeFileSync( abs, original + '\n.x:focus-visible{outline:2px solid red}\n' );
		const planted = buildCensus( { root: tmp, files, allow } );
		expectEqual( 'dumb count rises by one', planted.control.dumbTotal, before.control.dumbTotal + 1, errors );
		expectEqual( 'planted copy control still reconciles', planted.control.failures.length, 0, errors );
		const red = runCheck( planted, baseline, { allow } );
		expectEqual( 'planted rule turns --check red', red.failures.length > 0, true, errors );

		fs.writeFileSync( abs, original );
		const restored = buildCensus( { root: tmp, files, allow } );
		expectEqual( 'restored copy --check', runCheck( restored, baseline, { allow } ).failures.length, 0, errors );
	} finally {
		fs.rmSync( tmp, { recursive: true, force: true } );
	}
	return errors;
}

/**
 * @param {string} repoRoot
 * @param {Array<{path:string,selector:string,reason:string}>} allow
 * @returns {number} exit code
 */
function runSelfTest( repoRoot, allow ) {
	const cases = [
		[ 'positive', () => casePositive() ],
		[ 'definition', () => caseDefinition() ],
		[ 'edge', () => caseEdge() ],
		[ 'negative-control', () => caseNegative() ],
		[ 'idempotence', () => caseIdempotence() ],
		[ 'corpus-control-and-plant', () => caseCorpus( repoRoot, allow ) ],
	];
	let passed = 0;
	let failed = 0;
	for ( const [ name, fn ] of cases ) {
		let errors;
		try {
			errors = fn();
		} catch ( err ) {
			errors = [ `threw: ${ err && err.stack ? err.stack.split( '\n' ).slice( 0, 3 ).join( ' | ' ) : err }` ];
		}
		if ( errors.length ) {
			failed++;
			console.log( `FAIL ${ name }` );
			for ( const e of errors ) {
				console.log( `  - ${ e }` );
			}
		} else {
			passed++;
			console.log( `ok   ${ name }` );
		}
	}
	console.log( `self-test: ${ passed } passed, ${ failed } failed` );
	return failed ? 1 : 0;
}

module.exports = { runSelfTest };
