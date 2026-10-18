/**
 * Per-element motion inputs never inherit (Spec 38A §10, FR-38A-18).
 *
 * The renderer writes each element's entrance and hover inputs on that element's own scoped selector: the from, to and
 * close holders (`--sgs-me-from-*`, `--sgs-me-to-*`, `--sgs-me-close-to-*`), the entrance and close timing
 * (`--sgs-me-dur`, `--sgs-me-delay`, `--sgs-me-ease`, `--sgs-me-start`, `--sgs-me-close-dur|delay|ease`), the hover
 * to-values (`--sgs-mh-to-*`), the resting indent padding (`--sgs-pad-start-rest`) and the named-state flag and held
 * values (`--sgs-mt-on`, `--sgs-mt-op-*`). As plain custom properties they inherited, so a nested element took its
 * ancestor's value for any input it did not set (an X-only item entrance inside a grid entrance drifted 28px in Y).
 * Each is registered in the sheet that reads it with the universal syntax, `inherits: false` and no initial value: an
 * unset input is then the guaranteed-invalid value, so every `var()` reading it still falls back to the stylesheet's own
 * default (a registered initial value would replace that fallback, and the clip edges' fallback to the uniform clip and
 * the duration's token fallbacks cannot be an initial value).
 *
 * A loop item's stagger delay is the one input meant to reach the entrances inside the item (a post template's `<li>`
 * holds no entrance of its own), so the loop rules also write the inheriting carriers `--sgs-me-loop-delay` and
 * `--sgs-me-loop-close-delay`, read as the delay's fallback: an entrance's own delay wins, else its loop item's. The
 * entrance owns all eight animation longhands through its `--sgs-me-a-*` custom properties (FR-38A-52): the winning delay
 * is `--sgs-me-a-delay`, which `--sgs-me-a-list-delay` repeats once per channel and `animation-delay` reads, so the
 * carriers are asserted on `--sgs-me-a-delay` and the chain from there to `animation-delay` is asserted too.
 *
 * The browser proof (computed values) is `scripts/motion-qa/probe-entrance-input-scope.mjs`.
 */

const fs = require( 'fs' );
const path = require( 'path' );
const postcss = require( 'postcss' );

const PLUGIN = path.resolve( __dirname, '..', '..' );
const SHEETS = {
	'motion.css': path.join( PLUGIN, 'assets', 'css', 'motion.css' ),
	'motion-triggers.css': path.join( PLUGIN, 'assets', 'css', 'motion-triggers.css' ),
};
const SCHEMA = JSON.parse( fs.readFileSync( path.join( PLUGIN, 'schemas', 'motion.schema.json' ), 'utf8' ) );

const INPUT =
	/^--sgs-(?:me-(?:from|to|close-to)-[a-z-]+|me-(?:close-)?(?:dur|delay|ease)|me-start|mh-to-[a-z-]+|pad-start-rest|mt-on|mt-op-[a-z-]+)$/;
// Inputs a script reads from the computed style rather than a sheet through var(): the reveal start line
// (`assets/js/motion-reveal.js`).
const SCRIPT_READS = [ '--sgs-me-start' ];
// Inputs the renderer's per-instance rules read (`Sgs_Motion_Trigger_Open_State` and its canvas twin, which paint the
// colour to-values into background-color, color and border-color while a state is on): a sheet cannot read them because
// the rule is keyed to a state name only the instance knows. They are still registered in the sheet.
const INSTANCE_RULE_READS = [ '--sgs-me-to-bg', '--sgs-me-to-fg', '--sgs-me-to-bd' ];
const CARRIERS = {
	'--sgs-me-loop-delay': [ '--sgs-me-a-delay', 'var(--sgs-me-delay, var(--sgs-me-loop-delay, 0ms))' ],
	'--sgs-me-loop-close-delay': [
		'--sgs-me-a-delay',
		'var(--sgs-me-close-delay, var(--sgs-me-loop-close-delay, 0ms))',
	],
};

// The chain that turns the winning delay into the element's animation-delay: the declaration, then the per-channel list it reads.
const DELAY_CHAIN = [
	[ 'motion.css', 'animation-delay', 'var(--sgs-me-a-list-delay)' ],
	[ 'motion-triggers.css', 'animation-delay', 'var(--sgs-me-a-list-delay)' ],
	[ 'motion.css', '--sgs-me-a-list-delay', /var\(--sgs-me-a-delay\)/ ],
];

const norm = ( value ) => value.replace( /\s+/g, ' ' ).trim();
const stripComments = ( css ) => css.replace( /\/\*[\s\S]*?\*\//g, '' );

/** Every `var(--sgs-*` name a sheet reads. */
function reads( css ) {
	return new Set( [ ...stripComments( css ).matchAll( /var\((--sgs-[a-z0-9-]+)/g ) ].map( ( m ) => m[ 1 ] ) );
}

/** The @property registrations in a sheet: name => { syntax, inherits, initial-value }. */
function registrations( css ) {
	const out = {};
	postcss.parse( css ).walkAtRules( 'property', ( at ) => {
		const d = {};
		at.walkDecls( ( x ) => {
			d[ x.prop ] = x.value.replace( /^['"]|['"]$/g, '' ).trim();
		} );
		out[ at.params.trim() ] = d;
	} );
	return out;
}

/** The from, to and hover to-value inputs the renderer can write, from the schema's field owners. */
function emittedInputs() {
	const out = new Set();
	const ownerOf = ( def ) =>
		Object.values( SCHEMA.$defs[ def ].properties )
			.map( ( field ) => field[ 'x-sgs-field' ]?.cssProperty )
			.filter( ( prop ) => typeof prop === 'string' && prop.startsWith( '--sgs-me-' ) );
	for ( const [ def, end ] of [ [ 'EntranceFrom', 'from' ], [ 'EntranceTo', 'to' ] ] ) {
		ownerOf( def ).forEach( ( prop ) => out.add( `--sgs-me-${ end }-${ prop.slice( '--sgs-me-'.length ) }` ) );
	}
	for ( const [ key, field ] of Object.entries( SCHEMA.$defs.HoverStateValues.properties ) ) {
		const meta = field[ 'x-sgs-field' ];
		const prop = meta?.cssProperty;
		if ( ! prop || prop.startsWith( 'transition-' ) || [ 'rest', 'active' ].includes( meta.state ) ) {
			continue;
		}
		out.add( prop.startsWith( '--sgs-mh-' ) ? `--sgs-mh-to-${ prop.slice( '--sgs-mh-'.length ) }` : `--sgs-mh-to-${ key }` );
	}
	return out;
}

/** Every breach of the rule across the sheets (empty when every input is registered non-inheriting). */
function scopeErrors( sheets ) {
	const errors = [];
	const registered = Object.assign( {}, ...Object.values( sheets ).map( registrations ) );
	const read = new Set();
	for ( const [ name, css ] of Object.entries( sheets ) ) {
		const own = registrations( css );
		for ( const prop of reads( css ) ) {
			read.add( prop );
			if ( ! INPUT.test( prop ) ) {
				continue;
			}
			// Registered in this sheet or in motion.css, which every page with motion loads first.
			const r = own[ prop ] || registrations( sheets[ 'motion.css' ] )[ prop ];
			if ( ! r ) {
				errors.push( `${ name } reads ${ prop }, which is not registered` );
			} else if ( r.syntax !== '*' || r.inherits !== 'false' || 'initial-value' in r ) {
				errors.push( `${ prop } is not registered as syntax '*', inherits false, no initial value` );
			}
		}
	}
	for ( const prop of SCRIPT_READS ) {
		const r = registered[ prop ];
		if ( ! r || r.syntax !== '*' || r.inherits !== 'false' || 'initial-value' in r ) {
			errors.push( `${ prop } (read by a script) is not registered as syntax '*', inherits false, no initial value` );
		}
	}
	for ( const prop of emittedInputs() ) {
		if ( ! ( read.has( prop ) || INSTANCE_RULE_READS.includes( prop ) ) || ! registered[ prop ] ) {
			errors.push( `the renderer writes ${ prop }, which the sheets do not read and register` );
		}
	}
	for ( const [ carrier, [ prop, value ] ] of Object.entries( CARRIERS ) ) {
		if ( registered[ carrier ] ) {
			errors.push( `${ carrier } is registered, so it no longer reaches the entrances inside a loop item` );
		}
		let found = false;
		Object.values( sheets ).forEach( ( css ) =>
			postcss.parse( css ).walkDecls( prop, ( d ) => {
				found = found || norm( d.value ) === value;
			} )
		);
		if ( ! found ) {
			errors.push( `no ${ prop } reads ${ value }` );
		}
	}
	for ( const [ name, prop, expected ] of DELAY_CHAIN ) {
		let found = false;
		postcss.parse( sheets[ name ] ).walkDecls( prop, ( d ) => {
			const value = norm( d.value );
			found = found || ( expected instanceof RegExp ? expected.test( value ) : value === expected );
		} );
		if ( ! found ) {
			errors.push( `${ name } has no ${ prop } reading ${ expected }` );
		}
	}
	return errors;
}

const SOURCES = Object.fromEntries( Object.entries( SHEETS ).map( ( [ name, file ] ) => [ name, fs.readFileSync( file, 'utf8' ) ] ) );

describe( 'per-element motion inputs never inherit', () => {
	test( 'every input the sheets read is registered universal, non-inheriting, with no initial value', () => {
		expect( emittedInputs().size ).toBeGreaterThanOrEqual( 30 );
		expect( scopeErrors( SOURCES ) ).toEqual( [] );
	} );

	const plant = ( sheet, find, replace ) => {
		expect( SOURCES[ sheet ] ).toMatch( find );
		return { ...SOURCES, [ sheet ]: SOURCES[ sheet ].replace( find, replace ) };
	};
	const plants = {
		'a from holder left unregistered': [ 'motion.css', /@property --sgs-me-from-ty \{[^}]*\}/, '' ],
		'a hover to-value that inherits': [ 'motion.css', /(@property --sgs-mh-to-ty \{[^}]*inherits: )false/, '$1true' ],
		'a duration with an initial value that hides the token fallback': [
			'motion.css',
			/(@property --sgs-me-dur \{[^}]*inherits: false;)/,
			'$1 initial-value: 750ms;',
		],
		'a reveal start line left unregistered': [ 'motion.css', /@property --sgs-me-start \{[^}]*\}/, '' ],
		'a close holder left unregistered': [ 'motion-triggers.css', /@property --sgs-me-close-to-ty \{[^}]*\}/, '' ],
		'a held state value left unregistered': [ 'motion-triggers.css', /@property --sgs-mt-op-ty \{[^}]*\}/, '' ],
		'a delay that ignores the loop item': [
			'motion.css',
			/var\(--sgs-me-delay, var\(--sgs-me-loop-delay, 0ms\)\)/,
			'var(--sgs-me-delay, 0ms)',
		],
		'a close delay that ignores the loop item': [
			'motion-triggers.css',
			/var\(--sgs-me-close-delay, var\(--sgs-me-loop-close-delay, 0ms\)\)/,
			'var(--sgs-me-close-delay, 0ms)',
		],
		'an animation-delay that stops reading the entrance delay list': [
			'motion.css',
			/animation-delay: var\(--sgs-me-a-list-delay\)/g,
			'animation-delay: 0s',
		],
		'a delay list that stops repeating the entrance delay': [
			'motion.css',
			/var\(--sgs-me-a-delay\)/g,
			'0s',
		],
	};
	test.each( Object.entries( plants ) )( 'negative control: %s is caught', ( _label, [ sheet, find, replace ] ) => {
		expect( scopeErrors( plant( sheet, find, replace ) ).length ).toBeGreaterThan( 0 );
	} );
} );
