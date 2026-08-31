#!/usr/bin/env node
/**
 * Gate: a media atom's LOGIC module must be importable by plain Node.
 *
 * WHY THIS EXISTS
 * ---------------
 * The atom contract originally put `control()` (JSX, `@wordpress/*` imports) in
 * the same module as `css()` / `validate()` / `disclosure()` (pure functions).
 * That made the whole module unimportable outside webpack, for two independent
 * reasons — and BOTH had to be found before the cause was clear:
 *
 *   1. Plain Node ESM cannot parse JSX. `SyntaxError: Unexpected token '<'`.
 *   2. `@wordpress/components` and friends are webpack EXTERNALS. They are not
 *      in node_modules at all, so even transformed JSX would fail to resolve.
 *
 * The consequence was worse than a red gate. `test-media-atom-parity.mjs`
 * crashed on the first atom in registry order and verified NOTHING — while its
 * ratchet sat at 7, asserting seven atoms had proven JS/PHP parity. A number
 * claiming verification that no run could have produced.
 *
 * ⛔ SO THE SPLIT IS A CONTRACT, NOT A TIDY-UP:
 *
 *     src/components/media/atoms/<id>.js          pure — css/validate/disclosure
 *     src/components/media/atoms/<id>.control.js  the JSX control()
 *
 * The pure half is what the parity gate imports, what the renderer's logic
 * mirrors, and what can be reasoned about without a build step. Keeping it pure
 * is also a real architectural property: a value-setter that needs a UI library
 * to compute a CSS value has the wrong dependencies.
 *
 * Run:
 *   node scripts/check-media-atom-purity.js
 *   node scripts/check-media-atom-purity.js --self-test
 */
const fs = require( 'fs' );
const path = require( 'path' );

const PLUGIN = path.resolve( __dirname, '..' );
const ATOM_DIR = path.join( PLUGIN, 'src', 'components', 'media', 'atoms' );

/** Files in the atom directory that are LOGIC modules, not controls. */
function logicModules() {
	if ( ! fs.existsSync( ATOM_DIR ) ) {
		return [];
	}
	return fs
		.readdirSync( ATOM_DIR )
		.filter(
			( f ) =>
				f.endsWith( '.js' ) &&
				! f.endsWith( '.control.js' ) &&
				f !== 'registry.js' &&
				f !== 'index.js'
		)
		.sort();
}

/** Files in the atom directory that are CONTROL modules (the JSX half). */
function controlModules() {
	if ( ! fs.existsSync( ATOM_DIR ) ) {
		return [];
	}
	return fs
		.readdirSync( ATOM_DIR )
		.filter( ( f ) => f.endsWith( '.control.js' ) )
		.sort();
}

/**
 * The CONSUMER half of the closed disclosure vocabulary.
 *
 * `problemsFor()` checks the words a logic module PRODUCES. This checks the
 * words a control module COMPARES AGAINST — and that gap shipped a real defect:
 * five control modules tested `'visible' !== disc.state` while every
 * `disclosure()` returns `shown | disabled | omitted`. The comparison was
 * therefore always true, so four controls rendered permanently greyed out and
 * `focal-point` never rendered its row at all. Every gate stayed green, because
 * this file deliberately excluded `.control.js` from its scan.
 *
 * ⛔ Matches `.state` ONLY. `box-shape` legitimately carries `heightState` and
 * `ratioState` on a SEPARATE two-value `visible | hidden` vocabulary for its
 * mutually-exclusive sizing fields; `\.state` cannot match `.heightState`,
 * so that atom is untouched by construction rather than by an exception list.
 *
 * @param {string} name Module filename, for the message.
 * @param {string} raw  Module source.
 * @return {string[]} Problems found.
 */
function controlStateProblems( name, raw ) {
	const STATES = [ 'shown', 'disabled', 'omitted' ];
	const out = [];
	const seen = new Set();

	const flag = ( word ) => {
		if ( STATES.includes( word ) || seen.has( word ) ) {
			return;
		}
		seen.add( word );
		out.push(
			`compares against '${ word }', which no disclosure() ever returns. ` +
				`The vocabulary is ${ STATES.join( ' | ' ) }. A comparison against a ` +
				'word outside it is always-true or always-false, so the control ' +
				'silently renders disabled, or never renders at all.'
		);
	};

	[ ...raw.matchAll( /'([a-z-]+)'\s*(?:===|!==)\s*[\w$.]*\.state/g ) ].forEach(
		( m ) => flag( m[ 1 ] )
	);
	[ ...raw.matchAll( /[\w$.]*\.state\s*(?:===|!==)\s*'([a-z-]+)'/g ) ].forEach(
		( m ) => flag( m[ 1 ] )
	);

	return out;
}

/**
 * Is a package actually present in node_modules?
 *
 * Measured, not assumed. The first version of this gate banned every
 * `@wordpress/*` import on the belief they were all webpack externals. Two of
 * the four in use here are installed and importable, so that rule rejected
 * correct code - and `__()` in a logic module IS correct, because
 * `hiddenReason` is text a client reads.
 */
function isResolvable( pkg ) {
	return fs.existsSync( path.join( PLUGIN, 'node_modules', pkg, 'package.json' ) );
}

/** Strip comments and strings so a mention is never mistaken for a use. */
function code( text ) {
	return text
		.replace( /\/\*[\s\S]*?\*\//g, ' ' )
		.replace( /^\s*\/\/.*$/gm, ' ' )
		.replace( /'(?:[^'\\]|\\.)*'/g, "''" )
		.replace( /"(?:[^"\\]|\\.)*"/g, '""' )
		.replace( /`(?:[^`\\]|\\.)*`/g, '``' );
}

/**
 * Strip COMMENTS only, keeping string literals intact.
 *
 * `code()` above also blanks strings, which is right when asking whether an
 * identifier is USED but wrong when reading a string's VALUE. The disclosure
 * check needs the value, and running it against the fully-stripped source made
 * both its controls pass for the same wrong reason - the negative control
 * caught it, which is the entire argument for having one.
 */
function withoutComments( text ) {
	return text
		.replace( /\/\*[\s\S]*?\*\//g, ' ' )
		.replace( /^\s*\/\/.*$/gm, ' ' );
}

function problemsFor( name, raw ) {
	const src = code( raw );
	const withStrings = withoutComments( raw );
	const out = [];

	// 1. No UNRESOLVABLE import. Which packages those are is DERIVED from
	//    node_modules, never hardcoded: @wordpress/i18n and @wordpress/element
	//    ARE installed and are fine in a logic module (__() for a user-facing
	//    hiddenReason is correct), while @wordpress/components and
	//    @wordpress/block-editor are webpack externals that are genuinely
	//    absent. Banning the whole namespace would reject correct code, and
	//    would go stale the moment a package is installed.
	const unresolvable = [
		...raw.matchAll( /from\s+['"](@wordpress\/[^'"]+)['"]/g ),
	]
		.map( ( m ) => m[ 1 ] )
		.filter( ( pkg ) => ! isResolvable( pkg ) );
	if ( unresolvable.length ) {
		out.push(
			`imports ${ [ ...new Set( unresolvable ) ].join( ', ' ) } - not in ` +
				`node_modules (webpack external), so plain Node cannot load this ` +
				`module. Move it to ${ name.replace( /\.js$/, '.control.js' ) }`
		);
	}

	// 2. No JSX. Plain Node cannot parse it, whatever the imports say.
	//    A return of `<Tag` or a `<Tag ... />` element is the giveaway.
	if ( /<[A-Z][A-Za-z0-9]*[\s/>]/.test( src ) ) {
		out.push(
			'contains JSX — plain Node ESM cannot parse it; move the markup to ' +
				name.replace( /\.js$/, '.control.js' )
		);
	}

	// 3. No control() export. Its presence is what drags the UI deps in.
	if ( /export\s+function\s+control\b/.test( src ) ) {
		out.push(
			'exports control() — that belongs in ' +
				name.replace( /\.js$/, '.control.js' )
		);
	}

	// 4. Disclosure states come from a CLOSED vocabulary.
	//
	//    Four branches produced FIVE words for three states: 'visible' beside
	//    'shown', and 'hidden' beside both 'disabled' and 'omitted'. Two names
	//    for one concept is the exact divergence this whole layer exists to
	//    remove, reintroduced inside it - and the parity gate could never catch
	//    it, because it only compares css().
	//
	//    'hidden' is worse than a synonym. The contract deliberately separates
	//    OMITTED (structurally cannot apply - the control genuinely does not
	//    exist here) from DISABLED (does not apply YET, and carries a reason).
	//    A third word that could mean either is the ambiguity hiddenReason was
	//    designed to prevent: a silently absent control is the 'where did my
	//    setting go?' support call.
	const STATES = [ 'shown', 'disabled', 'omitted' ];
	[ ...withStrings.matchAll( /state:\s*'([a-z]+)'/g ) ].forEach( ( m ) => {
		if ( ! STATES.includes( m[ 1 ] ) ) {
			out.push(
				`disclosure state '${ m[ 1 ] }' is not in the contract vocabulary ` +
					`(${ STATES.join( ' | ' ) }). Use 'omitted' when the control ` +
					`structurally cannot apply, 'disabled' with a hiddenReason when it ` +
					`does not apply yet.`
			);
		}
	} );

	// 4. It must still export the pure trio, or it is not an atom.
	[ 'css', 'validate', 'disclosure' ].forEach( ( fn ) => {
		if ( ! new RegExp( `export\\s+function\\s+${ fn }\\b` ).test( src ) ) {
			out.push( `does not export ${ fn }() — the atom contract requires it` );
		}
	} );

	return out;
}

/**
 * A shared CSS fallback must not silently override a surface's own default.
 *
 * The atom rules sit at (0,1,0) on `.sgs-media-el` and fire UNCONDITIONALLY,
 * so a `var( --x, initial )` fallback beats a block's own `:where()` default at
 * (0,0,0). `sgs/media` defaults object-fit to `cover` that way; an `initial`
 * fallback in the shared layer would have flipped every existing block from
 * cover to fill, with no attribute changed and nothing to grep for.
 *
 * ⛔ `initial` / `unset` / `revert` are therefore BANNED as fallbacks here. The
 * fallback must be the value the surfaces actually default to — measured from
 * the census, not chosen. A rule that loses is indistinguishable from one that
 * is absent; a rule that silently wins is worse.
 */
function stylesheetFallbackProblems() {
	const dir = path.join( PLUGIN, 'assets', 'css', 'media-atoms' );
	if ( ! fs.existsSync( dir ) ) {
		return [ 'assets/css/media-atoms/ is missing' ];
	}
	const out = [];
	fs.readdirSync( dir )
		.filter( ( f ) => f.endsWith( '.css' ) )
		.forEach( ( f ) => {
			const body = withoutComments(
				fs.readFileSync( path.join( dir, f ), 'utf8' )
			);
			[ ...body.matchAll( /var\(\s*--sgs-media-[a-z0-9-]+\s*,\s*(initial|unset|revert)\s*\)/g ) ].forEach(
				( m ) =>
					out.push(
						`${ f }: var() fallback '${ m[ 1 ] }' silently overrides a ` +
							`surface's own default - use the value the census measured`
					)
			);
		} );
	return out;
}

function run() {
	const files = logicModules();

	// FAIL CLOSED on an empty roster. "0 impure modules" and "no modules at all"
	// are the same green, and only one of them means anything.
	if ( ! files.length ) {
		process.stderr.write(
			'[media-atom-purity] REFUSING to pass: no atom logic modules found in ' +
				'src/components/media/atoms/. A gate with nothing to check is not a pass.\n'
		);
		return 1;
	}

	const fallbackProblems = stylesheetFallbackProblems();
	fallbackProblems.forEach( ( p ) => process.stderr.write( `  ⛔ ${ p }
` ) );

	let bad = fallbackProblems.length;

	// The CONSUMER half of the vocabulary — see controlStateProblems().
	const controls = controlModules();
	if ( ! controls.length ) {
		process.stderr.write(
			'[media-atom-purity] REFUSING to pass: no .control.js modules found. ' +
				'A gate with nothing to check is not a pass.\n'
		);
		return 1;
	}
	controls.forEach( ( f ) => {
		const problems = controlStateProblems(
			f,
			fs.readFileSync( path.join( ATOM_DIR, f ), 'utf8' )
		);
		if ( problems.length ) {
			bad++;
			process.stderr.write( `  ⛔ ${ f }\n` );
			problems.forEach( ( p ) => process.stderr.write( `       ${ p }\n` ) );
		}
	} );

	files.forEach( ( f ) => {
		const problems = problemsFor(
			f,
			fs.readFileSync( path.join( ATOM_DIR, f ), 'utf8' )
		);
		if ( problems.length ) {
			bad++;
			process.stderr.write( `  ⛔ ${ f }\n` );
			problems.forEach( ( p ) => process.stderr.write( `       ${ p }\n` ) );
		}
	} );

	process.stdout.write(
		`[media-atom-purity] ${ files.length - bad }/${ files.length } atom logic ` +
			'modules are import-clean\n'
	);
	if ( bad ) {
		process.stderr.write(
			'\n[media-atom-purity] FAIL — the parity gate cannot import these, so its ' +
				'ratchet would assert a verification no run produced.\n'
		);
		return 1;
	}
	return 0;
}

function selfTest() {
	const cases = [];
	const ck = ( n, c ) => cases.push( [ n, c ] );

	const pure =
		"import { mediaStoredAttrName } from '../../MediaElementControls.js';\n" +
		'export function css() { return []; }\n' +
		'export function validate( v ) { return v; }\n' +
		'export function disclosure() { return { state: 1 }; }\n';
	ck( 'a pure logic module passes', problemsFor( 'x.js', pure ).length === 0 );

	// NEGATIVE CONTROLS — each of the three real failure modes, separately.
	// The resolvable/unresolvable split needs BOTH controls, or a rule that
	// passed everything and one that rejected everything would look the same.
	const withI18n = "import { __ } from '@wordpress/i18n';\n" + pure;
	ck(
		'POSITIVE CONTROL: an INSTALLED @wordpress package is allowed',
		problemsFor( 'x.js', withI18n ).length === 0
	);
	const withComponents =
		"import { TextareaControl } from '@wordpress/components';\n" + pure;
	ck(
		'NEGATIVE CONTROL: an ABSENT @wordpress package is REJECTED',
		problemsFor( 'x.js', withComponents ).some( ( p ) =>
			p.includes( '@wordpress/components' )
		)
	);
	ck(
		'the two are DISTINGUISHED (not both-pass or both-fail)',
		problemsFor( 'x.js', withI18n ).length !==
			problemsFor( 'x.js', withComponents ).length
	);

	const withJsx = pure + 'export function q() { return <SelectControl a={1} />; }\n';
	ck(
		'NEGATIVE CONTROL: JSX is REJECTED',
		problemsFor( 'x.js', withJsx ).some( ( p ) => p.includes( 'JSX' ) )
	);

	const withControl = pure + 'export function control() { return null; }\n';
	ck(
		'NEGATIVE CONTROL: an exported control() is REJECTED',
		problemsFor( 'x.js', withControl ).some( ( p ) => p.includes( 'control()' ) )
	);

	const missing = 'export function css() { return []; }\n';
	ck(
		'a module missing validate()/disclosure() is REJECTED',
		problemsFor( 'x.js', missing ).length === 2
	);

	// The stripper must not manufacture a finding from prose. This file's own
	// docblock names @wordpress/components as the thing it forbids.
	const commented =
		'/* never import @wordpress/components here, and no <SelectControl /> */\n' +
		pure;
	ck(
		'a violation named in a COMMENT is ignored',
		problemsFor( 'x.js', commented ).length === 0
	);

	// NEGATIVE CONTROL: an off-vocabulary disclosure state is rejected.
	const badState =
		pure + "export function d() { return { state: 'visible' }; }\n";
	ck(
		'NEGATIVE CONTROL: an off-vocabulary disclosure state is REJECTED',
		problemsFor( 'x.js', badState ).some( ( p ) => p.includes( "'visible'" ) )
	);
	// POSITIVE CONTROL: each contract state is accepted.
	const goodStates =
		pure +
		"export function d() { return [ { state: 'shown' }, " +
		"{ state: 'disabled' }, { state: 'omitted' } ]; }\n";
	ck(
		'POSITIVE CONTROL: shown / disabled / omitted are all accepted',
		problemsFor( 'x.js', goodStates ).length === 0
	);

	// ---- the CONSUMER half of the vocabulary -------------------------------
	//
	// These exist because the check they guard was INERT when first written: a
	// word-boundary escape had been mangled into a control character, so the
	// pattern matched nothing and the gate stayed green against four real
	// defects. Only a negative control that went red exposed it. A check with
	// no failing control is indistinguishable from a check that cannot run.
	const badConsumer =
		"paintDisabled={ 'visible' !== disc.state }\n";
	ck(
		'NEGATIVE CONTROL: a control module comparing against a non-vocabulary word is REJECTED',
		controlStateProblems( 'x.control.js', badConsumer ).some( ( p ) =>
			p.includes( "'visible'" )
		)
	);
	const goodConsumer =
		"disabled={ 'disabled' === disc.state }\n" +
		"if ( 'omitted' !== disc.state ) { render(); }\n";
	ck(
		'POSITIVE CONTROL: a control module comparing against the real vocabulary passes',
		controlStateProblems( 'x.control.js', goodConsumer ).length === 0
	);
	// box-shape carries heightState/ratioState on a SEPARATE visible|hidden
	// vocabulary. `.state` cannot match `.heightState`, so it is excluded by
	// construction rather than by an exception list — assert that stays true.
	const boxShapeShape =
		"heightDisabled={ 'visible' !== disc.heightState }\n" +
		"ratioDisabled={ 'visible' !== disc.ratioState }\n";
	ck(
		'the box-shape visible|hidden field vocabulary is NOT flagged',
		controlStateProblems( 'box-shape.control.js', boxShapeShape ).length === 0
	);
	// The real tree must be clean, or the gate is asserting against nothing.
	ck(
		'every REAL control module uses the contract vocabulary',
		controlModules().every(
			( f ) =>
				controlStateProblems(
					f,
					fs.readFileSync( path.join( ATOM_DIR, f ), 'utf8' )
				).length === 0
		)
	);

	// The stylesheet fallback rule needs both controls: it must reject a silent
	// override AND accept a real measured default, or a rule that flagged
	// everything would look identical here.
	const fallbackNow = stylesheetFallbackProblems();
	ck(
		'the REAL atom stylesheets carry no initial/unset/revert fallback',
		fallbackNow.length === 0,
		fallbackNow.join( '; ' )
	);
	ck(
		'a measured default IS present in the generated stylesheet',
		fs
			.readFileSync(
				path.join( PLUGIN, 'assets', 'css', 'media-element.css' ),
				'utf8'
			)
			.includes( '--sgs-media-object-fit, cover' )
	);

	// A generic-looking `<` that is not JSX must not trip it.
	const compare = pure + 'export function n( a, b ) { return a < b; }\n';
	ck( 'a less-than comparison is not read as JSX', problemsFor( 'x.js', compare ).length === 0 );

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
