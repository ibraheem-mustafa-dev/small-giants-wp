/**
 * Single source of truth for the media attribute TYPE map, JS -> PHP.
 *
 * `MEDIA_ATTR_TYPES` and `MEDIA_BASES` live in
 * `src/components/MediaElementControls.js`. The server needs the same
 * information to register the attributes on `register_block_type_args`, so this
 * script imports the REAL module and emits
 * `includes/media-element-attributes.generated.php`.
 *
 * ⛔ WHY GENERATE RATHER THAN HAND-MAINTAIN. WordPress coerces a value that does
 * not match its declared type back to the attribute's default, SILENTLY. If the
 * two type maps drift, the client's stored media does not error - it vanishes on
 * load (STOP-D328-SHAPE-NOT-JUST-VALUE). A hand-kept copy is a slow leak with no
 * failure signal.
 *
 * Imports the module rather than parsing it, for the same reason
 * `generate-svg-allowlist.js` executes its PHP: a parser would reimplement the
 * thing it mirrors and could then disagree with it.
 *
 * It also writes the atoms' attributes into each adopting block's committed
 * `block.json` (marked `"_generated": "media-atoms"`) and the matching entries
 * of `scripts/attr-classification-overrides.json`, through
 * `scripts/lib/media-block-json.mjs`. `--check` fails when the PHP mirror, any
 * block.json or the override file differs from what a run would write.
 *
 * USAGE
 *   node scripts/generate-media-attributes.mjs                    # write
 *   node scripts/generate-media-attributes.mjs --block sgs/hero   # one block's block.json and overrides
 *   node scripts/generate-media-attributes.mjs --check            # gate: fail if stale
 *   node scripts/generate-media-attributes.mjs --self-test
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
	findBlockJsons,
	generatedAttributes,
	applyGeneratedAttributes,
	overrideEntry,
	applyOverrideEntries,
	handWrittenOverrideKeys,
} from './lib/media-block-json.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const PLUGIN_DIR = path.resolve( HERE, '..' );
const OUT_FILE = path.join(
	PLUGIN_DIR,
	'includes',
	'media-element-attributes.generated.php'
);

const toUrl = ( ...seg ) =>
	'file:///' +
	path
		.join( PLUGIN_DIR, ...seg )
		.split( String.fromCharCode( 92 ) )
		.join( '/' );

const { MEDIA_ATTR_TYPES, MEDIA_BASES, MEDIA_TIERED_BASES, mediaAttrName } = await import(
	toUrl( 'src', 'components', 'MediaElementControls.js' )
);

// The atom registry is imported, never re-declared: the atom -> bases map is
// what drives selective injection on BOTH sides, and two copies of it would be
// two chances to disagree about which attributes a surface receives.
const { MEDIA_ATOMS } = await import( toUrl( 'src', 'components', 'media', 'atoms', 'registry.js' ) );

// An adopted slot reads Spec 49 §8's rows, not the legacy bases above.
const { adoptedAtomsForElement, adoptedSettingsForAtoms } = await import(
	toUrl( 'src', 'components', 'media', 'emit', 'adopted-settings.js' )
);

function phpValue( value ) {
	if ( Array.isArray( value ) ) {
		return (
			'array( ' + value.map( ( v ) => JSON.stringify( v ) ).join( ', ' ) + ' )'
		);
	}
	return JSON.stringify( value );
}

function render() {
	const bases = Object.keys( MEDIA_ATTR_TYPES )
		.sort()
		.map(
			( b ) =>
				`\t\t${ JSON.stringify( b ).padEnd( 26 ) } => ${ phpValue(
					MEDIA_ATTR_TYPES[ b ]
				) },`
		);

	const groups = Object.keys( MEDIA_BASES )
		.sort()
		.map( ( g ) => {
			const list = MEDIA_BASES[ g ]
				.map( ( b ) => `\n\t\t\t${ JSON.stringify( b ) },` )
				.join( '' );
			return `\t\t${ JSON.stringify( g ).padEnd( 14 ) } => array(${ list }\n\t\t),`;
		} );

	const tiered = MEDIA_TIERED_BASES.slice()
		.sort()
		.map( ( b ) => `
		${ JSON.stringify( b ) },` )
		.join( '' );

	const atoms = Object.keys( MEDIA_ATOMS )
		.sort()
		.map( ( id ) => {
			const list = MEDIA_ATOMS[ id ].bases
				.map( ( b ) => `
			${ JSON.stringify( b ) },` )
				.join( '' );
			return `		${ JSON.stringify( id ).padEnd( 20 ) } => array(${ list }
		),`;
		} );

	return `<?php
/**
 * GENERATED FILE - DO NOT EDIT.
 *
 * Source: src/components/MediaElementControls.js
 *         ( MEDIA_ATTR_TYPES + MEDIA_BASES )
 * Regenerate: node scripts/generate-media-attributes.mjs
 * Gate:       node scripts/generate-media-attributes.mjs --check
 *
 * Four maps, mirrored for the server so register_block_type_args() registers
 * exactly the schema the editor injects:
 *
 *   bases   base -> declared type
 *   groups  vocabulary group -> its bases
 *   tiered  the bases that carry Tablet/Mobile siblings
 *   atoms   atom id -> its bases (this is what drives SELECTIVE injection)
 *
 * Editing this by hand makes the two sides disagree - and a type mismatch does
 * not error, it makes WordPress silently coerce the stored value back to its
 * default, deleting the client's media on load.
 *
 * @package SGS\\Blocks
 */

return array(
	'bases'  => array(
${ bases.join( '\n' ) }
	),
	'groups' => array(
${ groups.join( '\n' ) }
	),
	'tiered' => array(${ tiered }
	),
	'atoms'  => array(
${ atoms.join( '\n' ) }
	),
);
`;
}

const BLOCKS_DIR = path.join( PLUGIN_DIR, 'src', 'blocks' );
const OVERRIDES_FILE = path.join( HERE, 'attr-classification-overrides.json' );

const ENV = {
	attrName: mediaAttrName,
	adoptedSettings: ( element ) => adoptedSettingsForAtoms( adoptedAtomsForElement( element ), element ),
};

const KNOWN_FLAGS = [ '--block', '--check', '--self-test' ];
const blockFlagAt = process.argv.indexOf( '--block' );
const unknownArgs = process.argv.slice( 2 ).filter( ( arg, i ) => ! KNOWN_FLAGS.includes( arg ) && process.argv[ i + 1 ] !== '--block' );
if ( unknownArgs.length || ( blockFlagAt !== -1 && ! process.argv[ blockFlagAt + 1 ] ) ) {
	process.stderr.write( `[generate-media-attributes] unknown argument(s): ${ unknownArgs.join( ' ' ) || '--block needs a slug' }. Flags: ${ KNOWN_FLAGS.join( ', ' ) }
` );
	process.exit( 2 );
}
// A block is named by its short slug (`gallery`) or its full name (`sgs/gallery`); both mean the same block.
const argBlock = blockFlagAt !== -1
	? ( process.argv[ blockFlagAt + 1 ].includes( '/' ) ? process.argv[ blockFlagAt + 1 ] : `sgs/${ process.argv[ blockFlagAt + 1 ] }` )
	: null;
const rel = ( f ) => path.relative( PLUGIN_DIR, f ).split( path.sep ).join( '/' );

/**
 * One block.json's new text and the override entries its generated attributes need.
 *
 * @param {string}      text        Current block.json source.
 * @param {Set<string>} handWritten `slug|attr` keys that already have a hand-written override entry.
 * @return {{next: string, entries: Object[], skipped: string[], kept: string[]}} New source, entries, keys left to a hand-written entry, and own attributes kept for a matching type.
 */
function planBlock( text, handWritten ) {
	const block = JSON.parse( text );
	const own = Object.fromEntries(
		Object.entries( block.attributes || {} ).filter( ( [ , def ] ) => def?._generated !== 'media-atoms' )
	);
	const report = { kept: [] };
	const attrs = generatedAttributes( block, ENV, own, report );
	const next = applyGeneratedAttributes( text, attrs );
	JSON.parse( next ); // refuse to hand back a file that no longer parses
	const entries = [];
	const skipped = [];
	for ( const a of attrs ) {
		if ( handWritten.has( `${ block.name }|${ a.name }` ) ) {
			skipped.push( `${ block.name } ${ a.name }` );
			continue;
		}
		entries.push( overrideEntry( block.name, a, a.setting, '', a.setting.responsive ) );
	}
	return { next, entries, skipped, kept: report.kept };
}

/**
 * What a run would write, without writing it.
 *
 * @return {{files: Map<string,string>, entries: Object[], skipped: string[], kept: string[], overridesText: string}} New block.json texts (changed ones only), override entries, override keys left to a hand-written entry, own attributes kept for a matching type, and the current override file.
 */
function plan() {
	const overridesText = fs.readFileSync( OVERRIDES_FILE, 'utf8' );
	const handWritten = handWrittenOverrideKeys( overridesText );
	const files = new Map();
	const entries = [];
	const skipped = [];
	const kept = [];
	for ( const file of findBlockJsons( BLOCKS_DIR ) ) {
		const text = fs.readFileSync( file, 'utf8' );
		const name = JSON.parse( text ).name;
		if ( argBlock && name !== argBlock ) {
			continue;
		}
		const done = planBlock( text, handWritten );
		if ( done.next !== text ) {
			files.set( file, done.next );
		}
		entries.push( ...done.entries );
		skipped.push( ...done.skipped );
		kept.push( ...done.kept );
	}
	return { files, entries, skipped, kept, overridesText };
}

function selfTest() {
	const fails = [];
	// `ran` counts real invocations. The total was a hardcoded 6, which silently
	// under-reported the moment an assertion was added - a counter that cannot
	// track its own subject is an instrument that lies.
	let ran = 0;
	const ck = ( n, c ) => {
		ran += 1;
		if ( ! c ) {
			fails.push( n );
		}
	};

	ck( 'MEDIA_ATTR_TYPES is populated', Object.keys( MEDIA_ATTR_TYPES ).length > 20 );
	ck( 'MEDIA_BASES has source + behaviour', !! MEDIA_BASES.source && !! MEDIA_BASES.behaviour );
	ck( 'MEDIA_BASES has the presentation groups', !! MEDIA_BASES.fit && !! MEDIA_BASES.overlay );
	ck( 'MEDIA_TIERED_BASES is populated', MEDIA_TIERED_BASES.length > 10 );
	// Exact-count assertions go stale every time a wave adds an atom (10 -> 16
	// across Waves 5a-5c alone) with no behavioural signal that anything is
	// actually wrong - a self-test failure that fires on every legitimate
	// addition trains people to ignore it. Threshold like the other
	// cardinality checks in this file instead.
	ck( 'MEDIA_ATOMS is populated', Object.keys( MEDIA_ATOMS ).length > 10 );

	// Every base must belong to exactly ONE atom. Two atoms claiming a base
	// would make selective injection ambiguous; zero would make the base
	// unreachable by any surface, which is a silently missing control.
	const owner = {};
	const dupes = [];
	Object.keys( MEDIA_ATOMS ).forEach( ( id ) =>
		MEDIA_ATOMS[ id ].bases.forEach( ( b ) => {
			if ( owner[ b ] ) {
				dupes.push( `${ b }: ${ owner[ b ] } + ${ id }` );
			}
			owner[ b ] = id;
		} )
	);
	ck( `no base claimed by two atoms (${ dupes.join( '; ' ) })`, dupes.length === 0 );

	const orphans = Object.keys( MEDIA_BASES )
		.flatMap( ( g ) => MEDIA_BASES[ g ] )
		.filter( ( b ) => ! owner[ b ] );
	ck( `every base belongs to an atom (${ orphans.join( ', ' ) })`, orphans.length === 0 );

	// A tiered base nothing owns would inject Tablet/Mobile siblings for an
	// attribute no atom can request.
	const strayTiers = MEDIA_TIERED_BASES.filter( ( b ) => ! owner[ b ] );
	ck( `every tiered base belongs to an atom (${ strayTiers.join( ', ' ) })`, strayTiers.length === 0 );

	// Every base named in MEDIA_BASES must carry a declared type, or the server
	// falls back to 'string' and an object-shaped value is coerced to default.
	const missing = [];
	Object.keys( MEDIA_BASES ).forEach( ( g ) =>
		MEDIA_BASES[ g ].forEach( ( b ) => {
			if ( ! MEDIA_ATTR_TYPES[ b ] ) {
				missing.push( `${ g }.${ b }` );
			}
		} )
	);
	ck( `every base has a declared type (missing: ${ missing.join( ', ' ) || 'none' })`, ! missing.length );

	// WRITE PATH AND DRIFT CHECK, on a fixture: a copy of sgs/decorative-image's block.json whose
	// entry declares `kinds` (the adoption marker). Its expected attributes are Spec 49 §8's names
	// for the atoms the entry declares, written out by hand in the fixture, not by this generator.
	const fixDir = path.join( PLUGIN_DIR, 'tests', 'fixtures', 'media' );
	const readFix = ( f ) => fs.readFileSync( path.join( fixDir, f ), 'utf8' );
	const fixText = readFix( 'adopted-block.json' );
	const fixOver = readFix( 'adopted-overrides.json' );
	const expectedAttrs = JSON.parse( readFix( 'adopted-block.expected-attrs.json' ) );
	const done = planBlock( fixText, handWrittenOverrideKeys( fixOver ) );
	const written = Object.entries( JSON.parse( done.next ).attributes ).filter(
		( [ , def ] ) => def._generated === 'media-atoms'
	);
	const stripMark = ( def ) => {
		const { _generated, ...rest } = def;
		return rest;
	};
	const writtenMap = Object.fromEntries( written.map( ( [ n, d ] ) => [ n, stripMark( d ) ] ) );
	ck(
		`adopted fixture: writes exactly the ${ Object.keys( expectedAttrs ).length } Spec 49 §8 media attributes (names and types)`,
		JSON.stringify( Object.keys( writtenMap ).sort() ) === JSON.stringify( Object.keys( expectedAttrs ).sort() ) &&
			Object.keys( expectedAttrs ).every( ( n ) => JSON.stringify( writtenMap[ n ] ) === JSON.stringify( expectedAttrs[ n ] ) )
	);
	ck(
		'adopted fixture: one override entry per generated attribute, each with a role and no css_property',
		done.entries.length === written.length &&
			done.entries.every( ( e ) => e.fields.role && ! ( 'css_property' in e.fields ) )
	);
	const overridden = applyOverrideEntries( fixOver, done.entries );
	ck(
		'adopted fixture: the override file keeps its hand-written entry and gains the generated ones',
		JSON.parse( overridden ).entries.length === 1 + done.entries.length
	);
	ck(
		'adopted fixture: a second run changes nothing',
		planBlock( done.next, new Set() ).next === done.next && applyOverrideEntries( overridden, done.entries ) === overridden
	);
	const tampered = done.next.replace( /("fit": \{"type":)"object"/, '$1"integer"' );
	ck(
		'drift check: an edited generated attribute differs from what a run writes',
		tampered !== done.next && planBlock( tampered, new Set() ).next !== tampered
	);
	ck( 'drift check: reverting the edit makes it match again', planBlock( done.next, new Set() ).next === done.next );
	// A block that already declares an attribute the generator would write, with another type, fails naming it.
	const clash = JSON.parse( fixText );
	clash.attributes.overlayOpacity = { type: 'number' };
	let clashMessage = '';
	try {
		generatedAttributes( clash, ENV, clash.attributes );
	} catch ( e ) {
		clashMessage = e.message;
	}
	ck( 'type clash: an own `overlayOpacity` of type number against the object setting fails naming the attribute', clashMessage.includes( '"overlayOpacity"' ) && clashMessage.includes( 'object' ) );
	const agree = JSON.parse( fixText );
	agree.attributes.overlayOpacity = { type: 'object' };
	ck( 'type clash: an own `overlayOpacity` of type object is kept without error', ( () => { try { return ! generatedAttributes( agree, ENV, agree.attributes ).some( ( a ) => 'overlayOpacity' === a.name ); } catch ( e ) { return false; } } )() );
	// Slot context and kinds: only the rows a slot's context and kinds allow are written (Spec 49 §9.3, Appendix C).
	const withEntry = ( entry ) => {
		const b = JSON.parse( fixText );
		b.supports.sgs.mediaElements = [ entry ];
		return Object.entries( JSON.parse( planBlock( JSON.stringify( b, null, '	' ), new Set() ).next ).attributes )
			.filter( ( [ , def ] ) => def._generated === 'media-atoms' )
			.map( ( [ n ] ) => n );
	};
	const bg = withEntry( { prefix: 'background', context: 'background', kinds: [ 'image' ] } );
	ck( `background image slot writes the 16 background rows, none of caption, link, shape, border, shadow, padding or sizing (got ${ bg.length })`,
		bg.length === 16 && ! bg.some( ( n ) => /Caption|Link|Shape|Radius|Border|BoxShadow|Padding|Alignment|Order|Width|Height|Ratio|Greyscale|Svg|Playback/.test( n ) ) );
	const imageOnly = withEntry( { prefix: 'item', context: 'item', kinds: [ 'image' ] } );
	ck( 'image-only slot writes no Playback, Captions or SVG row', ! imageOnly.some( ( n ) => /Playback|Captions|Svg/.test( n ) ) && imageOnly.length > 30 );
	const svgOnly = withEntry( { prefix: 'logo', context: 'element', kinds: [ 'svg' ] } );
	ck( 'svg slot writes the four SVG rows and no Playback or Link', svgOnly.filter( ( n ) => /Svg/.test( n ) ).length === 4 && ! svgOnly.some( ( n ) => /Playback|Link/.test( n ) ) );

	// A short and a full block slug name the same block: the override entries do not double on a second run.
	const twice = applyOverrideEntries( applyOverrideEntries( fixOver, done.entries, done.entries[ 0 ].slug ), done.entries, done.entries[ 0 ].slug );
	ck( 'override entries are replaced, not doubled, by a second run for the same block', JSON.parse( twice ).entries.length === 1 + done.entries.length );

	// Every clash is reported in one run.
	const twoClash = JSON.parse( fixText );
	twoClash.attributes.overlayOpacity = { type: 'number' };
	twoClash.attributes.fit = { type: 'string' };
	let twoMessage = '';
	try {
		generatedAttributes( twoClash, ENV, twoClash.attributes );
	} catch ( e ) {
		twoMessage = e.message;
	}
	ck( 'two type clashes are both reported in one run', twoMessage.includes( '"overlayOpacity"' ) && twoMessage.includes( '"fit"' ) );
	const sameType = { kept: [] };
	generatedAttributes( agree, ENV, agree.attributes, sameType );
	ck( 'a same-type own attribute is listed as kept', sameType.kept.some( ( k ) => k.endsWith( 'overlayOpacity' ) ) );

	const unadopted = fixText.replace( '"kinds": [ "image" ], ', '' );
	const none = planBlock( unadopted, new Set() );
	ck(
		'an entry without `kinds` has not adopted: nothing is written for it',
		unadopted !== fixText && none.next === unadopted && none.entries.length === 0
	);

	const php = render();
	ck( 'render emits a php open tag', php.startsWith( '<?php' ) );
	ck( 'render emits the object shapes', php.includes( '"Thumbnail"' ) && php.includes( '"object"' ) );
	ck( 'render emits the groups', php.includes( '"behaviour"' ) );

	fails.forEach( ( f ) => process.stdout.write( `  FAIL ${ f }\n` ) );
	// NEGATIVE CONTROL - prove the harness can register a failure at all.
	// A self-test never seen to go red is a decoration.
	const before = fails.length;
	ck( 'NEGATIVE CONTROL (expected to fail)', false );
	const controlWorks = fails.length === before + 1;
	fails.pop();
	ran -= 1;
	if ( ! controlWorks ) {
		process.stdout.write( 'FAIL - the harness cannot detect a failure' );
		return 1;
	}
	const total = ran;
	process.stdout.write(
		`\n${ fails.length ? 'FAIL' : 'PASS' } - ${ total - fails.length }/${ total } assertions (negative control verified)\n`
	);
	return fails.length ? 1 : 0;
}

if ( process.argv.includes( '--self-test' ) ) {
	process.exit( selfTest() );
}

const out = render();

if ( process.argv.includes( '--check' ) ) {
	const stale = [];
	const current = fs.existsSync( OUT_FILE ) ? fs.readFileSync( OUT_FILE, 'utf8' ) : '';
	if ( current !== out ) {
		stale.push( 'includes/media-element-attributes.generated.php (PHP mirror differs from MediaElementControls.js)' );
	}
	const { files, entries, overridesText } = plan();
	files.forEach( ( _text, file ) => stale.push( `${ rel( file ) } (generated media attributes differ from the registry)` ) );
	if ( applyOverrideEntries( overridesText, entries, argBlock ) !== overridesText ) {
		stale.push( 'scripts/attr-classification-overrides.json (generated entries differ from the registry)' );
	}
	if ( stale.length ) {
		process.stderr.write(
			'[generate-media-attributes] STALE:\n  ' +
				stale.join( '\n  ' ) +
				'\nRun: node scripts/generate-media-attributes.mjs\n'
		);
		process.exit( 1 );
	}
	process.stdout.write( '[generate-media-attributes] OK - PHP mirror, every block.json and the override entries match the registry.\n' );
	process.exit( 0 );
}

if ( ! argBlock ) {
	fs.writeFileSync( OUT_FILE, out, 'utf8' );
}
const { files, entries, skipped, kept, overridesText } = plan();
files.forEach( ( text, file ) => fs.writeFileSync( file, text, 'utf8' ) );
const nextOverrides = applyOverrideEntries( overridesText, entries, argBlock );
if ( nextOverrides !== overridesText ) {
	fs.writeFileSync( OVERRIDES_FILE, nextOverrides, 'utf8' );
}
if ( kept.length ) {
	process.stdout.write(
		`[generate-media-attributes] ${ kept.length } attribute(s) the block already declares with the same type are kept as the block's own (compare their default and enum by hand): ${ kept.join( ', ' ) }
`
	);
}
if ( skipped.length ) {
	process.stdout.write(
		`[generate-media-attributes] ${ skipped.length } attribute(s) keep their hand-written override entry (merge by hand): ${ skipped.join( ', ' ) }\n`
	);
}
process.stdout.write(
	`[generate-media-attributes] wrote ${ argBlock ? '' : 'the PHP mirror, ' }${ files.size } changed block.json file(s) and ${ entries.length } override entries\n`
);
