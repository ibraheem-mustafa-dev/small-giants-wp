#!/usr/bin/env node
/**
 * Gate: the media-element stylesheet's breakpoints must match the ONE source.
 *
 * WHY THIS EXISTS
 * ---------------
 * CSS cannot read a PHP constant, so `assets/css/media-element.css` restates
 * the two device breakpoints as literals. That restatement is the only place in
 * the media layer where the numbers are typed by hand, and a hand-typed
 * breakpoint drifts: `extensions.css`'s Image Controls block already carries
 * `min-width:769px` / `max-width:768px` against this project's 767/1023
 * standard, off by one, live, through every existing gate.
 *
 * ⛔ AN OFF-BY-ONE BREAKPOINT FAILS SILENTLY AND ASYMMETRICALLY. At exactly
 * 768px a `max-width:768px` mobile rule and a `min-width:769px` tablet rule BOTH
 * miss, or both match, depending on the pair -- so one device width renders with
 * the wrong tier's values and every other width looks perfect. Nothing errors.
 *
 * The sources, both read live rather than restated here:
 *   includes/class-sgs-breakpoints.php   MOBILE_MAX / TABLET_MAX
 *   src/utils/responsive.js              SGS_BREAKPOINTS
 *
 * Run:
 *   node scripts/check-media-breakpoints.js --check
 *   node scripts/check-media-breakpoints.js --self-test
 */
const fs = require( 'fs' );
const path = require( 'path' );

const PLUGIN = path.resolve( __dirname, '..' );
const CSS = path.join( PLUGIN, 'assets', 'css', 'media-element.css' );
const PHP_SRC = path.join( PLUGIN, 'includes', 'class-sgs-breakpoints.php' );
const JS_SRC = path.join( PLUGIN, 'src', 'utils', 'responsive.js' );

/** Pull MOBILE_MAX / TABLET_MAX out of the PHP class. */
function phpBreakpoints( text ) {
	const grab = ( name ) => {
		const m = text.match(
			new RegExp( 'const\\s+' + name + '\\s*=\\s*(\\d+)\\s*;' )
		);
		return m ? Number( m[ 1 ] ) : null;
	};
	return { mobile: grab( 'MOBILE_MAX' ), tablet: grab( 'TABLET_MAX' ) };
}

/** Pull the same pair out of the JS constant, whatever key names it uses. */
function jsBreakpoints( text ) {
	const block = text.match( /SGS_BREAKPOINTS\s*=\s*\{([\s\S]*?)\}/ );
	if ( ! block ) {
		return { mobile: null, tablet: null };
	}
	// The real constant uses MOBILE_MAX / TABLET_MAX, matching the PHP class.
	// Accept a bare `mobile:` too, so a future rename cannot make this half
	// silently unreadable - which would downgrade a real disagreement to a skip.
	const grab = ( key ) => {
		const m = block[ 1 ].match(
			new RegExp( '(?:' + key + '_MAX|' + key + ')\\s*:\\s*(\\d+)', 'i' )
		);
		return m ? Number( m[ 1 ] ) : null;
	};
	return { mobile: grab( 'mobile' ), tablet: grab( 'tablet' ) };
}

/** Every `max-width: Npx` in the stylesheet, deduplicated. */
function cssMaxWidths( raw ) {
	// COMMENTS ARE STRIPPED FIRST. This file's own docblock quotes the buggy
	// 768px pair as a counter-example, and a raw scan reads that as a violation
	// - the gate would fail on its own explanation of what it forbids. Same
	// false positive inspector-scan rule 18 hit with a literal <img in a comment.
	const text = raw.replace( /\/\*[\s\S]*?\*\//g, ' ' );
	const out = [];
	const re = /max-width:\s*(\d+)px/g;
	let m;
	while ( ( m = re.exec( text ) ) !== null ) {
		const n = Number( m[ 1 ] );
		if ( ! out.includes( n ) ) {
			out.push( n );
		}
	}
	return out.sort( ( a, b ) => a - b );
}

function evaluate( cssText, phpText, jsText ) {
	const php = phpBreakpoints( phpText );
	const js = jsBreakpoints( jsText );
	const widths = cssMaxWidths( cssText );
	const problems = [];

	if ( php.mobile === null || php.tablet === null ) {
		problems.push(
			'could not read MOBILE_MAX / TABLET_MAX from class-sgs-breakpoints.php ' +
				'— failing closed rather than assuming 767/1023'
		);
		return { problems, php, js, widths };
	}

	// The JS half is advisory: it may express its breakpoints differently. It is
	// only an error when it reads a DIFFERENT number, never when it is absent.
	if ( js.mobile !== null && js.mobile !== php.mobile ) {
		problems.push(
			`JS SGS_BREAKPOINTS.mobile (${ js.mobile }) disagrees with PHP MOBILE_MAX (${ php.mobile })`
		);
	}
	if ( js.tablet !== null && js.tablet !== php.tablet ) {
		problems.push(
			`JS SGS_BREAKPOINTS.tablet (${ js.tablet }) disagrees with PHP TABLET_MAX (${ php.tablet })`
		);
	}

	const expected = [ php.mobile, php.tablet ].sort( ( a, b ) => a - b );
	const unexpected = widths.filter( ( w ) => ! expected.includes( w ) );
	const absent = expected.filter( ( w ) => ! widths.includes( w ) );

	unexpected.forEach( ( w ) =>
		problems.push(
			`media-element.css uses max-width:${ w }px, which is not a device breakpoint ` +
				`(expected ${ expected.join( ' or ' ) })`
		)
	);
	absent.forEach( ( w ) =>
		problems.push( `media-element.css never uses the ${ w }px breakpoint` )
	);

	return { problems, php, js, widths };
}

function run() {
	const r = evaluate(
		fs.readFileSync( CSS, 'utf8' ),
		fs.readFileSync( PHP_SRC, 'utf8' ),
		fs.readFileSync( JS_SRC, 'utf8' )
	);
	process.stdout.write(
		`[media-breakpoints] source ${ r.php.mobile }/${ r.php.tablet } · ` +
			`stylesheet uses ${ r.widths.join( ', ' ) || '(none)' }\n`
	);
	r.problems.forEach( ( p ) => process.stderr.write( `  ⛔ ${ p }\n` ) );
	if ( r.problems.length ) {
		process.stderr.write(
			'\n[media-breakpoints] FAIL — fix the stylesheet, never the source.\n'
		);
		return 1;
	}
	process.stdout.write( '[media-breakpoints] OK\n' );
	return 0;
}

function selfTest() {
	const PHP = 'const TABLET_MAX = 1023;\nconst MOBILE_MAX = 767;';
	const JS = 'export const SGS_BREAKPOINTS = { TABLET_MAX: 1023, MOBILE_MAX: 767 };';
	const cases = [];
	const ck = ( n, c ) => cases.push( [ n, c ] );

	const good = '@media (max-width: 1023px){} @media (max-width: 767px){}';
	ck( 'a correct stylesheet passes', evaluate( good, PHP, JS ).problems.length === 0 );

	// NEGATIVE CONTROL — the exact live drift in extensions.css.
	const drift = '@media (max-width: 1024px){} @media (max-width: 768px){}';
	const d = evaluate( drift, PHP, JS );
	ck( 'NEGATIVE CONTROL: the 768/1024 pair is REJECTED', d.problems.length >= 2 );
	ck(
		'the rejection names the offending width',
		d.problems.some( ( p ) => p.includes( '768px' ) )
	);

	// A stylesheet missing a breakpoint entirely is also wrong — a tier with no
	// rule silently renders at the tier above.
	const half = '@media (max-width: 767px){}';
	ck( 'a MISSING breakpoint is reported', evaluate( half, PHP, JS ).problems.length === 1 );

	// Fails closed when the source cannot be read, rather than assuming 767/1023.
	const blind = evaluate( good, 'nothing useful here', JS );
	ck( 'FAILS CLOSED when the PHP source is unreadable', blind.problems.length === 1 );

	// A JS/PHP disagreement is caught even when the CSS is right.
	const badJs = 'export const SGS_BREAKPOINTS = { TABLET_MAX: 1024, MOBILE_MAX: 767 };';
	ck(
		'a JS/PHP breakpoint disagreement is caught',
		evaluate( good, PHP, badJs ).problems.some( ( p ) => p.includes( 'disagrees' ) )
	);

	// A breakpoint quoted inside a COMMENT must not be read as a rule.
	const commented =
		'/* never use max-width: 768px here */ @media (max-width: 1023px){} ' +
		'@media (max-width: 767px){}';
	ck(
		'a bad breakpoint inside a COMMENT is ignored',
		evaluate( commented, PHP, JS ).problems.length === 0
	);

	// The real files must pass — otherwise this gate ships already red.
	ck(
		'the REAL stylesheet passes against the REAL source',
		evaluate(
			fs.readFileSync( CSS, 'utf8' ),
			fs.readFileSync( PHP_SRC, 'utf8' ),
			fs.readFileSync( JS_SRC, 'utf8' )
		).problems.length === 0
	);

	let failed = 0;
	cases.forEach( ( [ n, c ] ) => {
		process.stdout.write( `  ${ c ? 'PASS' : 'FAIL' }  ${ n }\n` );
		if ( ! c ) {
			failed++;
		}
	} );
	process.stdout.write(
		`\n${ cases.length - failed }/${ cases.length } passed\n`
	);
	return failed ? 1 : 0;
}

if ( process.argv.includes( '--self-test' ) ) {
	process.exit( selfTest() );
}
process.exit( run() );
