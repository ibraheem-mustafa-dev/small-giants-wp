/**
 * Writes the carousel dots kit's attributes into each declaring block's committed `block.json` (marked
 * `"_generated": "carousel-dots"`) and the matching entries of `scripts/attr-classification-overrides.json`, through
 * `scripts/lib/carousel-dots-block-json.mjs`, from `src/components/carousel-dots/registry.json` and each block's
 * `supports.sgs.carouselDots` ({ prefix, part, label }). WordPress coerces a value that does not match its declared type back
 * to the attribute's default, silently, so the block.json types come from the one registry. It is the sibling of
 * `generate-button-attributes.mjs`: the same line-level writers, its own marker, so the generators leave the same bytes
 * whichever runs first. `--check` fails when any block.json or the override file differs from what a run would write.
 *
 * USAGE
 *   node scripts/generate-carousel-dots-attributes.mjs                      # write
 *   node scripts/generate-carousel-dots-attributes.mjs --block sgs/gallery  # one block's block.json and overrides
 *   node scripts/generate-carousel-dots-attributes.mjs --check              # gate: fail if stale
 *   node scripts/generate-carousel-dots-attributes.mjs --self-test
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
	GENERATED_MARK,
	OVERRIDE_REASON,
	findBlockJsons,
	loadRegistry,
	declaredDots,
	generatedAttributes,
	applyGeneratedAttributes,
	overrideEntry,
	applyOverrideEntries,
	handWrittenOverrideKeys,
} from './lib/carousel-dots-block-json.mjs';
import { applyGeneratedAttributes as applyMediaAttributes, applyOverrideEntries as applyMediaOverrides, OVERRIDE_REASON as MEDIA_REASON } from './lib/media-block-json.mjs';
import {
	applyGeneratedAttributes as applyButtonAttributes,
	applyOverrideEntries as applyButtonOverrides,
	OVERRIDE_REASON as BUTTON_REASON,
} from './lib/button-block-json.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const PLUGIN_DIR = path.resolve( HERE, '..' );
const BLOCKS_DIR = path.join( PLUGIN_DIR, 'src', 'blocks' );
const REGISTRY_FILE = path.join( PLUGIN_DIR, 'src', 'components', 'carousel-dots', 'registry.json' );
const OVERRIDES_FILE = path.join( HERE, 'attr-classification-overrides.json' );

const KNOWN_FLAGS = [ '--block', '--check', '--self-test' ];
const blockFlagAt = process.argv.indexOf( '--block' );
const unknownArgs = process.argv.slice( 2 ).filter( ( arg, i ) => ! KNOWN_FLAGS.includes( arg ) && process.argv[ i + 1 ] !== '--block' );
if ( unknownArgs.length || ( blockFlagAt !== -1 && ! process.argv[ blockFlagAt + 1 ] ) ) {
	process.stderr.write( `[generate-carousel-dots-attributes] unknown argument(s): ${ unknownArgs.join( ' ' ) || '--block needs a slug' }. Flags: ${ KNOWN_FLAGS.join( ', ' ) }\n` );
	process.exit( 2 );
}
// A block is named by its short slug (`gallery`) or its full name (`sgs/gallery`); both mean the same block.
const argBlock = blockFlagAt !== -1
	? ( process.argv[ blockFlagAt + 1 ].includes( '/' ) ? process.argv[ blockFlagAt + 1 ] : `sgs/${ process.argv[ blockFlagAt + 1 ] }` )
	: null;
const rel = ( f ) => path.relative( PLUGIN_DIR, f ).split( path.sep ).join( '/' );

const registry = loadRegistry( REGISTRY_FILE );

/**
 * One block.json's new text and the override entries its dots attributes need.
 *
 * @param {string}      text        Current block.json source.
 * @param {Object}      reg         Validated registry.
 * @param {Set<string>} handWritten `slug|attr` keys that already have an override entry the kit does not own.
 * @return {{next: string, entries: Object[], skipped: string[], kept: string[]}} New source, entries, keys left to a hand-written entry, and own attributes kept for a matching type.
 */
function planBlock( text, reg, handWritten ) {
	const block = JSON.parse( text );
	const own = Object.fromEntries(
		Object.entries( block.attributes || {} ).filter( ( [ , def ] ) => def?._generated !== GENERATED_MARK )
	);
	const report = { kept: [] };
	const attrs = generatedAttributes( block, reg, own, report );
	const next = applyGeneratedAttributes( text, attrs );
	JSON.parse( next ); // refuse to hand back a file that no longer parses
	const entries = [];
	const skipped = [];
	for ( const a of attrs ) {
		if ( handWritten.has( `${ block.name }|${ a.name }` ) ) {
			skipped.push( `${ block.name } ${ a.name }` );
			continue;
		}
		entries.push( overrideEntry( block.name, a ) );
	}
	return { next, entries, skipped, kept: report.kept };
}

/**
 * What a run would write, without writing it.
 *
 * @return {{files: Map<string,string>, entries: Object[], skipped: string[], kept: string[], overridesText: string}} Changed block.json texts, override entries, keys left to a hand-written entry, own attributes kept, and the current override file.
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
		const done = planBlock( text, registry, handWritten );
		if ( done.next !== text ) {
			files.set( file, done.next );
		}
		entries.push( ...done.entries );
		skipped.push( ...done.skipped );
		kept.push( ...done.kept );
	}
	return { files, entries, skipped, kept, overridesText };
}

const FIXTURE_BLOCK = JSON.stringify(
	{
		$schema: 'https://schemas.wp.org/trunk/block.json',
		apiVersion: 3,
		name: 'sgs/dots-fixture',
		title: 'Dots fixture',
		category: 'sgs',
		supports: { html: false, sgs: { carouselDots: { prefix: 'dot', part: 'dot', label: 'Navigation dots' } } },
		attributes: {
			heading: { type: 'string', default: '' },
			dotColour: { type: 'string' },
		},
		render: 'file:./render.php',
	},
	null,
	'\t'
);
const FIXTURE_OVERRIDES = JSON.stringify(
	{ _doc: 'fixture', entries: [ { slug: 'sgs/dots-fixture', attr: 'heading', fields: { role: 'content' }, _reason: 'fixture: a hand-written entry' } ] },
	null,
	'\t'
).replace( /\n\t\t\{/, '\n\t\t{' );

function selfTest() {
	const fails = [];
	// `ran` counts real invocations, so the total tracks its own subject.
	let ran = 0;
	const ck = ( n, c ) => {
		ran += 1;
		if ( ! c ) {
			fails.push( n );
		}
	};
	const throws = ( fn ) => {
		try {
			fn();
		} catch ( e ) {
			return e.message;
		}
		return '';
	};
	const generatedOf = ( text ) =>
		Object.entries( JSON.parse( text ).attributes ).filter( ( [ , def ] ) => def._generated === GENERATED_MARK );
	const namesOf = ( text ) => generatedOf( text ).map( ( [ n ] ) => n );

	// The registry: typed, roled, every row names a property, no base twice; an object row is a tier object.
	ck( 'the registry has the nine dot settings', registry.rows.length === 9 );
	ck( 'registry: the size, gap and active width rows are {desktop,tablet,mobile} objects', [ 'Size', 'ActiveWidth', 'Gap' ].every( ( b ) => registry.rows.find( ( r ) => r.base === b )?.tier_shape === 'tier_object' ) );
	ck( 'registry: a row with no property fails validation naming it', throws( () => loadRegistryFrom( { rows: [ { base: 'Size', type: 'object', role: 'layout', tier_shape: 'tier_object' } ] } ) ).includes( '"Size"' ) );
	ck( 'registry: a repeated base fails validation', throws( () => loadRegistryFrom( { rows: [ ...registry.rows, registry.rows[ 0 ] ] } ) ).includes( 'twice' ) );
	ck( 'registry: an object row that is not a tier object fails validation', throws( () => loadRegistryFrom( { rows: [ { ...registry.rows[ 0 ], tier_shape: 'box_only' } ] } ) ).includes( 'tier_object' ) );

	// 1. A declaration generates the set: exactly the names and types of the registry.
	const done = planBlock( FIXTURE_BLOCK, registry, handWrittenOverrideKeys( FIXTURE_OVERRIDES ) );
	const written = Object.fromEntries( generatedOf( done.next ) );
	const expected = {
		dotSize: 'object',
		dotActiveWidth: 'object',
		dotGap: 'object',
		dotColourActive: 'string',
		dotColourHover: 'string',
		dotBorderWidth: 'string',
		dotBorderColour: 'string',
		dotRadius: 'string',
	};
	ck(
		'declaration: writes the eight settings the block does not hold itself, with their types',
		JSON.stringify( Object.keys( written ).sort() ) === JSON.stringify( Object.keys( expected ).sort() ) && Object.entries( expected ).every( ( [ n, t ] ) => written[ n ]?.type === t )
	);
	ck( 'declaration: a generated attribute carries no default', Object.values( written ).every( ( d ) => ! ( 'default' in d ) ) );
	ck( 'kept: the block\'s own dotColour (string) stays one line with no generated mark', ! ( 'dotColour' in written ) && done.next.split( '\n' ).filter( ( l ) => l.includes( '"dotColour"' ) ).length === 1 && done.kept.includes( 'sgs/dots-fixture dotColour' ) );
	ck( 'kept: the kept attribute still gets its override entry', done.entries.some( ( e ) => e.attr === 'dotColour' && e.fields.css_property === 'background-color' ) );

	// 2. A type clash throws naming it.
	const clash = JSON.parse( FIXTURE_BLOCK );
	clash.attributes.dotSize = { type: 'string' };
	clash.attributes.dotGap = { type: 'string' };
	const clashMessage = throws( () => planBlock( JSON.stringify( clash, null, '\t' ), registry, new Set() ) );
	ck( 'type clash: both clashing own attributes are named, with the type the kit needs', clashMessage.includes( '"dotSize"' ) && clashMessage.includes( '"dotGap"' ) && clashMessage.includes( 'needs "object"' ) );

	// 3. The declaration is validated.
	const noPrefix = JSON.parse( FIXTURE_BLOCK );
	noPrefix.supports.sgs.carouselDots = { part: 'Dot' };
	const declMessage = throws( () => declaredDots( noPrefix ) );
	ck( 'declaration: a missing prefix and label and a bad part are all named', declMessage.includes( '"prefix"' ) && declMessage.includes( '"part"' ) && declMessage.includes( '"label"' ) );
	noPrefix.supports.sgs.carouselDots = [ { prefix: 'dot' } ];
	ck( 'declaration: a list instead of an object fails', throws( () => declaredDots( noPrefix ) ).includes( 'must be an object' ) );

	const withWhen = JSON.parse( FIXTURE_BLOCK );
	withWhen.attributes = { ...( withWhen.attributes || {} ), showDots: { type: 'boolean' } };
	withWhen.supports.sgs.carouselDots = { prefix: 'dot', part: 'dot', label: 'Dots', showWhen: [ { attr: 'showDots', op: 'on', default: true } ] };
	ck( 'declaration: a valid showWhen is accepted', declaredDots( withWhen ).prefix === 'dot' );
	withWhen.supports.sgs.carouselDots.showWhen = [ { attr: 'noSuchAttr', op: 'on' } ];
	ck( 'declaration: a showWhen naming an undeclared attribute fails', throws( () => declaredDots( withWhen ) ).includes( 'does not declare' ) );
	withWhen.supports.sgs.carouselDots.showWhen = [ { attr: 'showDots', op: 'sometimes' } ];
	ck( 'declaration: a showWhen with an unknown op fails', throws( () => declaredDots( withWhen ) ).includes( 'op "sometimes"' ) );

	// 4. Idempotence and drift.
	const overridden = applyOverrideEntries( FIXTURE_OVERRIDES, done.entries );
	ck( 'idempotence: a second block.json run changes nothing', planBlock( done.next, registry, new Set() ).next === done.next );
	ck( 'idempotence: a second override run changes nothing', applyOverrideEntries( overridden, done.entries ) === overridden );
	ck( 'override file: keeps the hand-written entry and gains one per setting', JSON.parse( overridden ).entries.length === 1 + done.entries.length && done.entries.length === 9 );
	const tampered = done.next.replace( /("dotSize": \{"type":)"object"/, '$1"string"' );
	ck( 'drift check: an edited generated attribute differs from what a run writes', tampered !== done.next && planBlock( tampered, registry, new Set() ).next !== tampered );
	ck(
		'drift check: removing the declaration removes the generated lines',
		( () => {
			const gone = done.next.replace( '"carouselDots"', '"carouselDotsRemoved"' );
			const next = planBlock( gone, registry, new Set() ).next;
			return gone !== done.next && namesOf( next ).length === 0 && ! next.includes( GENERATED_MARK );
		} )()
	);

	// 5. A block with no declaration is left byte-identical.
	const plain = JSON.stringify( { name: 'sgs/dots-plain', supports: { html: false }, attributes: { heading: { type: 'string' } } }, null, '\t' );
	const plainPlan = planBlock( plain, registry, new Set() );
	ck( 'no declaration: block.json is byte-identical and nothing is written', plainPlan.next === plain && plainPlan.entries.length === 0 );

	// 6. The override entries.
	const byAttr = Object.fromEntries( done.entries.map( ( e ) => [ e.attr, e ] ) );
	ck( 'override entries: size is a tier-object width in the dot part', JSON.stringify( byAttr.dotSize.fields ) === JSON.stringify( { role: 'layout', css_property: 'width', css_layer: null, css_element: 'dot', tier_shape: 'tier_object' } ) );
	ck( 'override entries: the current dot rows carry css_state current, the hover row hover', byAttr.dotColourActive.fields.css_state === 'current' && byAttr.dotActiveWidth.fields.css_state === 'current' && byAttr.dotColourHover.fields.css_state === 'hover' );
	ck( 'override entries: every entry carries the kit\'s reason and a role', done.entries.every( ( e ) => e._reason === OVERRIDE_REASON && e.fields.role ) );
	ck(
		'override entries: no two settings claim one (property, element, state)',
		new Set( done.entries.map( ( e ) => [ e.fields.css_property, e.fields.css_element, e.fields.css_state || '' ].join( '|' ) ) ).size === done.entries.length
	);

	// 7. The three generators leave the same bytes whichever runs first, and none touches another's lines.
	const withOthers = FIXTURE_BLOCK.replace(
		/("attributes": \{)/,
		`$1\n\t\t"mediaThing": {"type":"string","_generated":"media-atoms"},\n\t\t"arrowColourText": {"type":"string","_generated":"button-kit"},`
	);
	const mediaAttrs = [ { name: 'mediaThing', def: { type: 'string', _generated: 'media-atoms' } } ];
	const buttonAttrs = [ { name: 'arrowColourText', def: { type: 'string', _generated: 'button-kit' }, kept: false } ];
	const dotsFirst = applyMediaAttributes( applyButtonAttributes( planBlock( withOthers, registry, new Set() ).next, buttonAttrs ), mediaAttrs );
	const dotsLast = planBlock( applyButtonAttributes( applyMediaAttributes( withOthers, mediaAttrs ), buttonAttrs ), registry, new Set() ).next;
	ck( 'three generators: dots-then-others and others-then-dots leave the same block.json', dotsFirst === dotsLast && namesOf( dotsLast ).length === Object.keys( expected ).length );
	ck(
		'three generators: the media line, then the button kit line, then the dots lines',
		( () => {
			const lines = dotsLast.split( '\n' );
			const at = ( mark ) => lines.findIndex( ( l ) => l.includes( `"_generated":"${ mark }"` ) );
			return at( 'media-atoms' ) !== -1 && at( 'media-atoms' ) < at( 'button-kit' ) && at( 'button-kit' ) < at( 'carousel-dots' );
		} )()
	);
	const ovMedia = { slug: 'sgs/dots-fixture', attr: 'mediaThing', fields: { role: 'content' }, _reason: MEDIA_REASON };
	const ovButton = { slug: 'sgs/dots-fixture', attr: 'arrowColourText', fields: { role: 'color' }, _reason: BUTTON_REASON };
	const ovA = applyMediaOverrides( applyButtonOverrides( applyOverrideEntries( FIXTURE_OVERRIDES, done.entries ), [ ovButton ] ), [ ovMedia ] );
	const ovB = applyOverrideEntries( applyButtonOverrides( applyMediaOverrides( FIXTURE_OVERRIDES, [ ovMedia ] ), [ ovButton ] ), done.entries );
	ck( 'three generators: the override file is the same whichever generator writes first', ovA === ovB && JSON.parse( ovA ).entries.length === 1 + done.entries.length + 2 );
	ck( 'three generators: the dots kit does not own another generator\'s entry', handWrittenOverrideKeys( ovA ).has( 'sgs/dots-fixture|arrowColourText' ) && handWrittenOverrideKeys( ovA ).has( 'sgs/dots-fixture|mediaThing' ) && ! handWrittenOverrideKeys( ovA ).has( 'sgs/dots-fixture|dotSize' ) );

	fails.forEach( ( f ) => process.stdout.write( `  FAIL ${ f }\n` ) );
	// NEGATIVE CONTROL - prove the harness can register a failure at all.
	const before = fails.length;
	ck( 'NEGATIVE CONTROL (expected to fail)', false );
	const controlWorks = fails.length === before + 1;
	fails.pop();
	ran -= 1;
	if ( ! controlWorks ) {
		process.stdout.write( 'FAIL - the harness cannot detect a failure' );
		return 1;
	}
	process.stdout.write( `\n${ fails.length ? 'FAIL' : 'PASS' } - ${ ran - fails.length }/${ ran } assertions (negative control verified)\n` );
	return fails.length ? 1 : 0;
}

/**
 * Validate a registry object (the self-test's broken copies).
 *
 * @param {Object} reg Registry object.
 * @return {Object} The registry.
 */
function loadRegistryFrom( reg ) {
	const tmp = path.join( fs.mkdtempSync( path.join( process.env.TEMP || process.env.TMPDIR || '.', 'dots-reg-' ) ), 'registry.json' );
	try {
		fs.writeFileSync( tmp, JSON.stringify( reg ) );
		return loadRegistry( tmp );
	} finally {
		fs.rmSync( path.dirname( tmp ), { recursive: true, force: true } );
	}
}

if ( process.argv.includes( '--self-test' ) ) {
	process.exit( selfTest() );
}

if ( process.argv.includes( '--check' ) ) {
	const stale = [];
	try {
		const { files, entries, overridesText } = plan();
		files.forEach( ( _text, file ) => stale.push( `${ rel( file ) } (generated carousel dots attributes differ from the registry)` ) );
		if ( applyOverrideEntries( overridesText, entries, argBlock ) !== overridesText ) {
			stale.push( 'scripts/attr-classification-overrides.json (generated entries differ from the registry)' );
		}
	} catch ( e ) {
		process.stderr.write( `[generate-carousel-dots-attributes] ${ e.message }\n` );
		process.exit( 1 );
	}
	if ( stale.length ) {
		process.stderr.write( '[generate-carousel-dots-attributes] STALE:\n  ' + stale.join( '\n  ' ) + '\nRun: node scripts/generate-carousel-dots-attributes.mjs\n' );
		process.exit( 1 );
	}
	process.stdout.write( '[generate-carousel-dots-attributes] OK - every block.json and the override entries match the registry.\n' );
	process.exit( 0 );
}

let result;
try {
	result = plan();
} catch ( e ) {
	process.stderr.write( `[generate-carousel-dots-attributes] ${ e.message }\n` );
	process.exit( 1 );
}
const { files, entries, skipped, kept, overridesText } = result;
files.forEach( ( text, file ) => fs.writeFileSync( file, text, 'utf8' ) );
const nextOverrides = applyOverrideEntries( overridesText, entries, argBlock );
if ( nextOverrides !== overridesText ) {
	fs.writeFileSync( OVERRIDES_FILE, nextOverrides, 'utf8' );
}
if ( kept.length ) {
	process.stdout.write( `[generate-carousel-dots-attributes] ${ kept.length } attribute(s) the block already declares with the same type are kept as the block's own (compare their default and enum by hand): ${ kept.join( ', ' ) }\n` );
}
if ( skipped.length ) {
	process.stdout.write( `[generate-carousel-dots-attributes] ${ skipped.length } attribute(s) keep their hand-written override entry: ${ skipped.join( ', ' ) }\n` );
}
process.stdout.write( `[generate-carousel-dots-attributes] wrote ${ files.size } changed block.json file(s) and ${ entries.length } override entries\n` );
