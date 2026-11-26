/**
 * Writes the built-in button kit's attributes into each declaring block's committed `block.json` (marked
 * `"_generated": "button-kit"`) and the matching entries of `scripts/attr-classification-overrides.json`, through
 * `scripts/lib/button-block-json.mjs`, from `src/components/button-kit/registry.json` and each block's
 * `supports.sgs.builtinButtons`. WordPress coerces a value that does not match its declared type back to the
 * attribute's default, silently, so the block.json types come from the one registry. The same run writes the
 * `button-preset` role onto the preset choices that exist before the kit (the registry's `existingPresetAttrs`).
 * `--check` fails when any block.json or the override file differs from what a run would write.
 *
 * USAGE
 *   node scripts/generate-button-attributes.mjs                      # write
 *   node scripts/generate-button-attributes.mjs --block sgs/buybox   # one block's block.json and overrides
 *   node scripts/generate-button-attributes.mjs --check              # gate: fail if stale
 *   node scripts/generate-button-attributes.mjs --self-test
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
	GENERATED_MARK,
	PRESET_ROLE,
	OVERRIDE_REASON,
	findBlockJsons,
	loadRegistry,
	validateRegistry,
	declaredButtons,
	generatedAttributes,
	ownBoxShape,
	applyGeneratedAttributes,
	overrideEntry,
	presetEntries,
	applyOverrideEntries,
	handWrittenOverrideKeys,
} from './lib/button-block-json.mjs';
import {
	applyGeneratedAttributes as applyMediaAttributes,
	applyOverrideEntries as applyMediaOverrides,
	OVERRIDE_REASON as MEDIA_REASON,
} from './lib/media-block-json.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const PLUGIN_DIR = path.resolve( HERE, '..' );
const BLOCKS_DIR = path.join( PLUGIN_DIR, 'src', 'blocks' );
const REGISTRY_FILE = path.join( PLUGIN_DIR, 'src', 'components', 'button-kit', 'registry.json' );
const OVERRIDES_FILE = path.join( HERE, 'attr-classification-overrides.json' );
const FIXTURE_DIR = path.join( PLUGIN_DIR, 'tests', 'fixtures', 'button-kit' );

const KNOWN_FLAGS = [ '--block', '--check', '--self-test' ];
const blockFlagAt = process.argv.indexOf( '--block' );
const unknownArgs = process.argv.slice( 2 ).filter( ( arg, i ) => ! KNOWN_FLAGS.includes( arg ) && process.argv[ i + 1 ] !== '--block' );
if ( unknownArgs.length || ( blockFlagAt !== -1 && ! process.argv[ blockFlagAt + 1 ] ) ) {
	process.stderr.write( `[generate-button-attributes] unknown argument(s): ${ unknownArgs.join( ' ' ) || '--block needs a slug' }. Flags: ${ KNOWN_FLAGS.join( ', ' ) }
` );
	process.exit( 2 );
}
// A block is named by its short slug (`buybox`) or its full name (`sgs/buybox`); both mean the same block.
const argBlock = blockFlagAt !== -1
	? ( process.argv[ blockFlagAt + 1 ].includes( '/' ) ? process.argv[ blockFlagAt + 1 ] : `sgs/${ process.argv[ blockFlagAt + 1 ] }` )
	: null;
const rel = ( f ) => path.relative( PLUGIN_DIR, f ).split( path.sep ).join( '/' );

const registry = loadRegistry( REGISTRY_FILE );
const loadRegistryFrom = validateRegistry;

/**
 * One block.json's new text and the override entries its kit attributes need.
 *
 * @param {string}      text        Current block.json source.
 * @param {Object}      reg         Validated registry.
 * @param {Set<string>} handWritten `slug|attr` keys that already have an override entry the kit does not own.
 * @return {{next: string, entries: Object[], skipped: string[], kept: string[], unproven: string[]}} New source, entries, keys left to a hand-written entry, own attributes kept for a matching type, and kept boxes whose shape the block does not state.
 */
function planBlock( text, reg, handWritten ) {
	const block = JSON.parse( text );
	const own = Object.fromEntries(
		Object.entries( block.attributes || {} ).filter( ( [ , def ] ) => def?._generated !== GENERATED_MARK )
	);
	const report = { kept: [], unproven: [] };
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
	return { next, entries, skipped, kept: report.kept, unproven: report.unproven };
}

/**
 * What a run would write, without writing it.
 *
 * @return {{files: Map<string,string>, entries: Object[], skipped: string[], kept: string[], unproven: string[], overridesText: string}} New block.json texts (changed ones only), override entries, override keys left to a hand-written entry, own attributes kept for a matching type, kept boxes whose shape the block does not state, and the current override file.
 */
function plan() {
	const overridesText = fs.readFileSync( OVERRIDES_FILE, 'utf8' );
	const handWritten = handWrittenOverrideKeys( overridesText );
	const files = new Map();
	const entries = [];
	const skipped = [];
	const kept = [];
	const unproven = [];
	const blocks = new Map();
	for ( const file of findBlockJsons( BLOCKS_DIR ) ) {
		const text = fs.readFileSync( file, 'utf8' );
		const name = JSON.parse( text ).name;
		blocks.set( name, JSON.parse( text ) );
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
		unproven.push( ...done.unproven );
	}
	const presets = presetEntries( registry, blocks, JSON.parse( overridesText ).entries );
	entries.push( ...presets.entries.filter( ( e ) => ! argBlock || e.slug === argBlock ) );
	skipped.push( ...presets.skipped.filter( ( s ) => ! argBlock || s.startsWith( `${ argBlock } ` ) ) );
	return { files, entries, skipped, kept, unproven, overridesText };
}

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

	const readFix = ( f ) => fs.readFileSync( path.join( FIXTURE_DIR, f ), 'utf8' );
	const fixText = readFix( 'kit-block.json' );
	const fixOver = readFix( 'kit-overrides.json' );
	const expectedAttrs = JSON.parse( readFix( 'kit-block.expected-attrs.json' ) );
	const expectedRows = JSON.parse( readFix( 'kit-block.expected-overrides.json' ) );
	const strip = ( def ) => {
		const { _generated, ...rest } = def;
		return rest;
	};
	const generatedOf = ( text ) =>
		Object.entries( JSON.parse( text ).attributes ).filter( ( [ , def ] ) => def._generated === GENERATED_MARK );
	const namesOf = ( text ) => generatedOf( text ).map( ( [ n ] ) => n );

	// The registry itself: every row is typed and carries a role; no base is claimed twice.
	const rows = Object.values( registry.groups ).flat();
	ck( 'the registry has rows in every group', Object.keys( registry.groups ).length >= 9 && rows.length > 30 );
	ck( 'every default group exists and gradient is not one of them', registry.defaultGroups.every( ( g ) => registry.groups[ g ] ) && ! registry.defaultGroups.includes( 'gradient' ) );

	// 1. A declaration generates the set: exactly the names and types written out by hand in the fixture.
	const done = planBlock( fixText, registry, handWrittenOverrideKeys( fixOver ) );
	const written = generatedOf( done.next );
	const writtenMap = Object.fromEntries( written.map( ( [ n, d ] ) => [ n, strip( d ) ] ) );
	const expectedNames = Object.keys( expectedAttrs ).sort();
	ck(
		`declaration: writes exactly the ${ expectedNames.length } expected attributes (names and types) for the two declared buttons`,
		JSON.stringify( Object.keys( writtenMap ).sort() ) === JSON.stringify( expectedNames ) &&
			expectedNames.every( ( n ) => JSON.stringify( writtenMap[ n ] ) === JSON.stringify( expectedAttrs[ n ] ) )
	);
	ck( 'declaration: a generated attribute carries no default', written.every( ( [ , d ] ) => ! ( 'default' in d ) ) );
	ck( 'declaration: the default groups write no gradient attribute', ! namesOf( done.next ).some( ( n ) => /Gradient$/.test( n ) ) );

	// 2. `groups` narrows the set; the `gradient` group adds the six gradient colours.
	const narrow = JSON.parse( fixText );
	narrow.supports.sgs.builtinButtons = [ { prefix: 'only', part: 'only-part', label: 'Only', groups: [ 'preset', 'colour' ] } ];
	const narrowNames = namesOf( planBlock( JSON.stringify( narrow, null, '\t' ), registry, new Set() ).next );
	ck(
		'groups: preset and colour write 7 attributes and nothing else',
		narrowNames.length === 7 && narrowNames.every( ( n ) => /^only(Style|Colour)/.test( n ) )
	);
	const grad = JSON.parse( fixText );
	grad.supports.sgs.builtinButtons = [ { prefix: 'g', part: 'g', label: 'G', groups: [ 'gradient' ] } ];
	const gradNames = namesOf( planBlock( JSON.stringify( grad, null, '\t' ), registry, new Set() ).next );
	ck(
		'groups: gradient writes the six gradient colours',
		JSON.stringify( gradNames.sort() ) ===
			JSON.stringify( [ 'gColourBackgroundGradient', 'gColourBackgroundHoverGradient', 'gColourBorderGradient', 'gColourBorderHoverGradient', 'gColourTextGradient', 'gColourTextHoverGradient' ] )
	);
	// The size group is a square control's one {desktop,tablet,mobile} length (a carousel arrow, a pause button).
	const sized = JSON.parse( fixText );
	sized.supports.sgs.builtinButtons = [ { prefix: 'arrow', part: 'arrow', label: 'Arrow', groups: [ 'colour', 'border', 'size', 'shadow' ] } ];
	const sizedPlan = planBlock( JSON.stringify( sized, null, '\t' ), registry, new Set() );
	const sizedAttr = generatedOf( sizedPlan.next ).find( ( [ n ] ) => 'arrowSize' === n );
	ck( 'groups: size writes arrowSize as an object', sizedAttr && 'object' === sizedAttr[ 1 ].type );
	const sizedEntry = sizedPlan.entries.find( ( e ) => 'arrowSize' === e.attr );
	ck(
		'groups: arrowSize is described as a tier object on width, in the arrow part',
		sizedEntry?.fields.css_property === 'width' && sizedEntry.fields.tier_shape === 'tier_object' && sizedEntry.fields.css_element === 'arrow' && sizedEntry.fields.role === 'layout'
	);
	ck( 'groups: size is opt-in, so the default groups write no Size', ! registry.defaultGroups.includes( 'size' ) && ! namesOf( done.next ).some( ( n ) => /(?:flowOpener|back)Size$/.test( n ) ) );
	// The contentAlign group is opt-in (one tier object of justify-content values); hoverLift is a default group (one px length, named so it cannot meet a block's boolean `{prefix}HoverLift`).
	const aligned = JSON.parse( fixText );
	aligned.supports.sgs.builtinButtons = [ { prefix: 'btn', part: 'btn', label: 'Btn', groups: [ 'contentAlign', 'hoverLift' ] } ];
	const alignedPlan = planBlock( JSON.stringify( aligned, null, '	' ), registry, new Set() );
	const alignedAttrs = Object.fromEntries( generatedOf( alignedPlan.next ).map( ( [ n, d ] ) => [ n, strip( d ) ] ) );
	ck(
		'groups: contentAlign writes btnContentAlign as an object and hoverLift writes btnHoverLiftDistance as a string, nothing else',
		JSON.stringify( alignedAttrs ) === JSON.stringify( { btnContentAlign: { type: 'object' }, btnHoverLiftDistance: { type: 'string' } } )
	);
	const alignEntry = alignedPlan.entries.find( ( e ) => 'btnContentAlign' === e.attr );
	const liftEntry = alignedPlan.entries.find( ( e ) => 'btnHoverLiftDistance' === e.attr );
	ck(
		'groups: the override rows name justify-content (tier object) and a hover-state transform',
		alignEntry?.fields.css_property === 'justify-content' && alignEntry.fields.tier_shape === 'tier_object' && liftEntry?.fields.css_property === 'transform' && liftEntry.fields.css_state === 'hover'
	);
	ck(
		'groups: contentAlign is opt-in and hoverLift is a default group',
		! registry.defaultGroups.includes( 'contentAlign' ) && registry.defaultGroups.includes( 'hoverLift' ) && ! namesOf( done.next ).some( ( n ) => /ContentAlign$/.test( n ) ) && namesOf( done.next ).includes( 'flowOpenerHoverLiftDistance' ) && ! namesOf( done.next ).includes( 'backHoverLiftDistance' )
	);
	ck(
		'registry: a row whose values are not a non-empty list of strings is refused',
		throws( () => validateRegistry( { ...registry, groups: { ...registry.groups, contentAlign: [ { ...registry.groups.contentAlign[ 0 ], values: [] } ] } } ) ).includes( 'values must be a non-empty list' )
	);
	ck(
		'groups: an unknown group fails naming it and the known ones',
		( () => {
			const bad = JSON.parse( fixText );
			bad.supports.sgs.builtinButtons[ 0 ].groups = [ 'colour', 'glow' ];
			const m = throws( () => planBlock( JSON.stringify( bad, null, '\t' ), registry, new Set() ) );
			return m.includes( 'glow' ) && m.includes( 'known:' ) && m.includes( 'gradient' );
		} )()
	);
	ck(
		'declaration: a missing prefix, part and label are all named in one failure',
		( () => {
			const bad = JSON.parse( fixText );
			bad.supports.sgs.builtinButtons = [ { groups: [ 'colour' ] } ];
			const m = throws( () => declaredButtons( bad, registry ) );
			return m.includes( '"prefix"' ) && m.includes( '"part"' ) && m.includes( '"label"' );
		} )()
	);
	ck(
		'declaration: `elements` is optional and must be kebab-case class elements',
		( () => {
			const ok = JSON.parse( fixText );
			ok.supports.sgs.builtinButtons = [ { prefix: 'arrow', part: 'arrow', label: 'Arrow', elements: [ 'carousel-prev', 'carousel-next' ] } ];
			const bad = JSON.parse( fixText );
			bad.supports.sgs.builtinButtons = [ { prefix: 'arrow', part: 'arrow', label: 'Arrow', elements: [ 'Carousel Prev' ] } ];
			return declaredButtons( ok, registry )[ 0 ].elements.length === 2 && declaredButtons( JSON.parse( fixText ), registry )[ 0 ].elements.length === 0 && throws( () => declaredButtons( bad, registry ) ).includes( '"elements"' );
		} )()
	);
	ck(
		'declaration: showWhen takes known ops and declared attributes, an empty list is allowed, and each fault is named',
		( () => {
			const withWhen = ( when ) => {
				const b = JSON.parse( fixText );
				b.attributes.showArrows = { type: 'boolean' };
				b.supports.sgs.builtinButtons = [ { prefix: 'arrow', part: 'arrow', label: 'Arrow', showWhen: when } ];
				return b;
			};
			const good = declaredButtons( withWhen( [ { attr: 'showArrows', op: 'on', default: true }, { any: [ { attr: 'showArrows', op: 'equals', value: true } ] } ] ), registry ).length === 1 && declaredButtons( withWhen( [] ), registry ).length === 1;
			const badOp = throws( () => declaredButtons( withWhen( [ { attr: 'showArrows', op: 'sometimes' } ] ), registry ) ).includes( 'op "sometimes"' );
			const badAttr = throws( () => declaredButtons( withWhen( [ { attr: 'noSuchAttr', op: 'on' } ] ), registry ) ).includes( 'does not declare' );
			const noValue = throws( () => declaredButtons( withWhen( [ { attr: 'showArrows', op: 'equals' } ] ), registry ) ).includes( 'needs "value"' );
			const notList = throws( () => declaredButtons( withWhen( { attr: 'showArrows', op: 'on' } ), registry ) ).includes( 'must be a list' );
			return good && badOp && badAttr && noValue && notList;
		} )()
	);
	ck(
		'declaration: a repeated prefix fails',
		( () => {
			const bad = JSON.parse( fixText );
			bad.supports.sgs.builtinButtons = [ ...bad.supports.sgs.builtinButtons, bad.supports.sgs.builtinButtons[ 0 ] ];
			return throws( () => declaredButtons( bad, registry ) ).includes( 'repeats the prefix' );
		} )()
	);

	// 3. A same-type own attribute is kept (not rewritten), listed, and still described by an override entry.
	ck( 'kept: the fixture\'s own flowOpenerStyle (string) is not among the generated attributes', ! ( 'flowOpenerStyle' in writtenMap ) );
	const ownStyleLines = done.next.split( '\n' ).filter( ( l ) => l.includes( '"flowOpenerStyle"' ) );
	ck( 'kept: the own attribute stays one line with no generated mark', ownStyleLines.length === 1 && ! ownStyleLines[ 0 ].includes( GENERATED_MARK ) );
	ck( 'kept: it is listed as kept', done.kept.includes( 'sgs/kit-fixture flowOpenerStyle' ) );
	ck(
		'kept: it still gets its override entry',
		done.entries.some( ( e ) => e.attr === 'flowOpenerStyle' && e.fields.role === PRESET_ROLE )
	);

	// 4. A type clash throws, naming every clash.
	const clash = JSON.parse( fixText );
	clash.attributes.flowOpenerColourText = { type: 'object' };
	clash.attributes.flowOpenerMinHeight = { type: 'string' };
	const clashMessage = throws( () => planBlock( JSON.stringify( clash, null, '\t' ), registry, new Set() ) );
	ck(
		'type clash: two clashing own attributes are both named, with the type the kit needs',
		clashMessage.includes( '"flowOpenerColourText"' ) && clashMessage.includes( '"flowOpenerMinHeight"' ) && clashMessage.includes( 'needs "string"' ) && clashMessage.includes( 'needs "object"' )
	);
	const nameClash = JSON.parse( fixText );
	nameClash.supports.sgs.builtinButtons = [
		{ prefix: 'x', part: 'x', label: 'X', groups: [ 'border' ] },
		{ prefix: 'xBorder', part: 'x-border', label: 'X border', groups: [ 'preset' ] },
	];
	ck(
		'name clash: two buttons producing one attribute name (xBorderStyle) fail naming it',
		( () => {
			const m = throws( () => planBlock( JSON.stringify( nameClash, null, '\t' ), registry, new Set() ) );
			return m.includes( '"xBorderStyle"' ) && m.includes( 'produced by both' );
		} )()
	);

	// 4b. A box the block stores in another shape than the panel writes is refused, named, with the way out. The database labels
	// every box box_only, so the registry's value_shape is the comparison.
	const boxOwn = ( name, def ) => {
		const b = JSON.parse( fixText );
		b.attributes[ name ] = def;
		return JSON.stringify( b, null, '\t' );
	};
	const flatSides = { top: '1px', right: '1px', bottom: '1px', left: '1px' };
	const flatCorners = { topLeft: '8px', topRight: '8px', bottomLeft: '8px', bottomRight: '8px' };
	const deviceSides = { desktop: flatSides };
	const deviceCorners = { desktop: flatCorners };
	const shapeMessage = ( name, def ) => throws( () => planBlock( boxOwn( name, def ), registry, new Set() ) );
	ck(
		'box shape: a flat padding default is refused, naming the attribute, both shapes and the renames file',
		( () => {
			const m = shapeMessage( 'flowOpenerPadding', { type: 'object', default: flatSides } );
			return m.includes( '"flowOpenerPadding"' ) && m.includes( 'stores a sides box' ) && m.includes( 'device_sides' ) && m.includes( 'builtin-button-renames.json' );
		} )()
	);
	ck( 'box shape: a flat radius default is refused', shapeMessage( 'flowOpenerBorderRadius', { type: 'object', default: flatCorners } ).includes( 'stores a corners box' ) );
	ck( 'box shape: a per-device border width default is refused (the panel writes one box of sides)', shapeMessage( 'flowOpenerBorderWidth', { type: 'object', default: deviceSides } ).includes( 'stores a device_sides box' ) );
	ck( 'box shape: a per-device padding default and a per-device radius default are kept', ! shapeMessage( 'flowOpenerPadding', { type: 'object', default: deviceSides } ) && ! shapeMessage( 'flowOpenerBorderRadius', { type: 'object', default: deviceCorners } ) );
	ck( 'box shape: a flat width default is kept', ! shapeMessage( 'flowOpenerBorderWidth', { type: 'object', default: flatSides } ) );
	ck(
		'box shape: an empty default falls to the description',
		shapeMessage( 'flowOpenerPadding', { type: 'object', default: {}, description: 'Padding, a { top, right, bottom, left } box.' } ).includes( 'stores a sides box' ) &&
			! shapeMessage( 'flowOpenerPadding', { type: 'object', default: {}, description: 'Padding per device, { desktop, tablet, mobile } of sides.' } )
	);
	ck(
		'box shape: a box that states no shape is kept and reported as unproven',
		( () => {
			const rep = { kept: [], unproven: [] };
			const b = JSON.parse( boxOwn( 'flowOpenerPadding', { type: 'object' } ) );
			generatedAttributes( b, registry, { flowOpenerPadding: { type: 'object' } }, rep );
			return rep.unproven.includes( 'sgs/kit-fixture flowOpenerPadding' ) && ownBoxShape( { type: 'object' } ) === 'unknown';
		} )()
	);
	ck(
		'box shape: every box row of the registry names its shape, and no other row does',
		rows.filter( ( r ) => 'box_only' === r.tier_shape ).every( ( r ) => [ 'sides', 'device_sides', 'device_corners' ].includes( r.value_shape ) ) && rows.filter( ( r ) => r.value_shape ).every( ( r ) => 'box_only' === r.tier_shape )
	);
	ck(
		'box shape: the registry check refuses a box_only row with no value_shape',
		throws( () => loadRegistryFrom( { defaultGroups: [ 'g' ], groups: { g: [ { base: 'Padding', type: 'object', role: 'layout', tier_shape: 'box_only' } ] } } ) ).includes( 'value_shape' )
	);

	// 5. Idempotence: a second run changes nothing, in the block.json and in the override file.
	const overridden = applyOverrideEntries( fixOver, done.entries );
	ck( 'idempotence: a second block.json run changes nothing', planBlock( done.next, registry, new Set() ).next === done.next );
	ck( 'idempotence: a second override run changes nothing', applyOverrideEntries( overridden, done.entries ) === overridden );
	ck(
		'override file: keeps the hand-written entry and gains one entry per member attribute',
		JSON.parse( overridden ).entries.length === JSON.parse( fixOver ).entries.length + done.entries.length
	);
	ck( 'override file: still parses', ( () => { try { JSON.parse( overridden ); return true; } catch ( e ) { return false; } } )() );
	ck(
		'override entries are replaced, not doubled, by a second run for the same block',
		JSON.parse( applyOverrideEntries( applyOverrideEntries( fixOver, done.entries, 'sgs/kit-fixture' ), done.entries, 'sgs/kit-fixture' ) ).entries.length === JSON.parse( fixOver ).entries.length + done.entries.length
	);
	const tampered = done.next.replace( /("flowOpenerBorderWidth": \{"type":)"object"/, '$1"string"' );
	ck( 'drift check: an edited generated attribute differs from what a run writes', tampered !== done.next && planBlock( tampered, registry, new Set() ).next !== tampered );
	ck( 'drift check: reverting the edit makes it match again', planBlock( done.next, registry, new Set() ).next === done.next );
	ck(
		'drift check: removing the declaration removes the generated lines',
		( () => {
			const gone = done.next.replace( '"builtinButtons"', '"builtinButtonsRemoved"' );
			const next = planBlock( gone, registry, new Set() ).next;
			return gone !== done.next && namesOf( next ).length === 0 && ! next.includes( GENERATED_MARK );
		} )()
	);

	// 6. A block with no declaration is left byte-identical.
	const plainText = readFix( 'plain-block.json' );
	const plain = planBlock( plainText, registry, new Set() );
	ck( 'no declaration: block.json is byte-identical and nothing is written', plain.next === plainText && plain.entries.length === 0 );
	ck( 'no declaration: an empty builtinButtons list writes nothing', ( () => { const b = JSON.parse( plainText ); b.supports.sgs = { builtinButtons: [] }; const t = JSON.stringify( b, null, '\t' ); return planBlock( t, registry, new Set() ).next === t; } )() );

	// 7. The override entries: role, css_element = part, and the property fields where a row names one.
	const byAttr = Object.fromEntries( done.entries.map( ( e ) => [ e.attr, e ] ) );
	ck(
		`override entries: the ${ Object.keys( expectedRows ).length } hand-written fixture rows match field for field`,
		Object.entries( expectedRows ).every( ( [ attr, fields ] ) => JSON.stringify( byAttr[ attr ]?.fields ) === JSON.stringify( fields ) )
	);
	ck( 'override entries: every entry carries the kit\'s reason, a role and its part as css_element', done.entries.every( ( e ) => e._reason === OVERRIDE_REASON && e.fields.role && ( e.attr.startsWith( 'flowOpener' ) ? 'flow-opener' : 'back' ) === e.fields.css_element ) );
	ck( 'override entries: a row with css_property also states css_layer null; one without states neither', done.entries.every( ( e ) => ( 'css_property' in e.fields ) === ( 'css_layer' in e.fields ) && ( ! ( 'css_layer' in e.fields ) || null === e.fields.css_layer ) ) );
	ck( 'override entries: the preset rows have the role button-preset and no css fields', byAttr.flowOpenerStyle.fields.role === PRESET_ROLE && ! ( 'css_property' in byAttr.flowOpenerStyle.fields ) );

	// The role rows for the preset choices that exist before the kit.
	const presetBlocks = new Map( [
		[ 'sgs/p1', { attributes: { aStyle: { type: 'string' } } } ],
		[ 'sgs/p2', { attributes: { bStyle: { type: 'string' } } } ],
	] );
	const presetReg = { existingPresetAttrs: [ { block: 'sgs/p1', attr: 'aStyle' }, { block: 'sgs/p2', attr: 'bStyle' } ] };
	const presets = presetEntries( presetReg, presetBlocks, [] );
	ck(
		'preset rows: one button-preset row per existing preset attribute',
		presets.entries.length === 2 && presets.entries.every( ( e ) => e.fields.role === PRESET_ROLE && Object.keys( e.fields ).length === 1 && e._reason === OVERRIDE_REASON )
	);
	ck(
		'preset rows: a hand-written entry with the role is kept, not duplicated',
		( () => {
			const r = presetEntries( presetReg, presetBlocks, [ { slug: 'sgs/p1', attr: 'aStyle', fields: { role: PRESET_ROLE, css_property: null }, _reason: 'x' } ] );
			return r.entries.length === 1 && r.skipped[ 0 ] === 'sgs/p1 aStyle';
		} )()
	);
	ck(
		'preset rows: a hand-written entry without the role fails naming it',
		throws( () => presetEntries( presetReg, presetBlocks, [ { slug: 'sgs/p1', attr: 'aStyle', fields: { css_property: null }, _reason: 'x' } ] ) ).includes( 'sgs/p1::aStyle' )
	);
	ck(
		'preset rows: an attribute the block no longer declares fails naming it',
		throws( () => presetEntries( { existingPresetAttrs: [ { block: 'sgs/p1', attr: 'gone' } ] }, presetBlocks, [] ) ).includes( 'sgs/p1::gone' )
	);

	// The two generators leave the same bytes whichever runs first, and neither touches the other's lines.
	const withMedia = fixText.replace(
		/("attributes": \{)/,
		`$1\n\t\t"mediaThing": {"type":"string","_generated":"media-atoms"},`
	);
	ck( 'two generators: the media line was inserted into the fixture', withMedia !== fixText && withMedia.includes( 'media-atoms' ) );
	const mediaAttrs = [ { name: 'mediaThing', def: { type: 'string', _generated: 'media-atoms' } } ];
	const kitFirst = applyMediaAttributes( planBlock( withMedia, registry, new Set() ).next, mediaAttrs );
	const mediaFirst = planBlock( applyMediaAttributes( withMedia, mediaAttrs ), registry, new Set() ).next;
	ck( 'two generators: media-then-kit and kit-then-media leave the same block.json', kitFirst === mediaFirst && namesOf( kitFirst ).length === expectedNames.length );
	ck(
		'two generators: the kit run leaves the media attributes where they were and the kit lines last',
		( () => {
			const lines = mediaFirst.split( '\n' );
			const m = lines.findIndex( ( l ) => l.includes( 'media-atoms' ) );
			const kits = lines.map( ( l, i ) => ( l.includes( `"_generated":"${ GENERATED_MARK }"` ) ? i : -1 ) ).filter( ( i ) => i !== -1 );
			return m !== -1 && kits.length === expectedNames.length && Math.min( ...kits ) > m && kits.every( ( i, j ) => j === 0 || i === kits[ j - 1 ] + 1 );
		} )()
	);
	const mediaEntry = { slug: 'sgs/kit-fixture', attr: 'mediaThing', fields: { role: 'content' }, _reason: MEDIA_REASON };
	const ovKit = applyOverrideEntries( fixOver, done.entries );
	const ovMediaAfter = applyMediaOverrides( ovKit, [ mediaEntry ] );
	const ovMediaFirst = applyOverrideEntries( applyMediaOverrides( fixOver, [ mediaEntry ] ), done.entries );
	ck( 'two generators: the override file is the same whichever generator writes first', ovMediaAfter === ovMediaFirst && JSON.parse( ovMediaFirst ).entries.length === JSON.parse( fixOver ).entries.length + done.entries.length + 1 );
	ck( 'two generators: the kit does not treat a media entry as its own to rewrite', ! handWrittenOverrideKeys( ovMediaFirst ).has( 'sgs/kit-fixture|flowOpenerStyle' ) && handWrittenOverrideKeys( ovMediaFirst ).has( 'sgs/kit-fixture|mediaThing' ) );

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

if ( process.argv.includes( '--self-test' ) ) {
	process.exit( selfTest() );
}

if ( process.argv.includes( '--check' ) ) {
	const stale = [];
	try {
		const { files, entries, overridesText } = plan();
		files.forEach( ( _text, file ) => stale.push( `${ rel( file ) } (generated button attributes differ from the registry)` ) );
		if ( applyOverrideEntries( overridesText, entries, argBlock ) !== overridesText ) {
			stale.push( 'scripts/attr-classification-overrides.json (generated entries differ from the registry)' );
		}
	} catch ( e ) {
		process.stderr.write( `[generate-button-attributes] ${ e.message }\n` );
		process.exit( 1 );
	}
	if ( stale.length ) {
		process.stderr.write(
			'[generate-button-attributes] STALE:\n  ' +
				stale.join( '\n  ' ) +
				'\nRun: node scripts/generate-button-attributes.mjs\n'
		);
		process.exit( 1 );
	}
	process.stdout.write( '[generate-button-attributes] OK - every block.json and the override entries match the registry.\n' );
	process.exit( 0 );
}

let result;
try {
	result = plan();
} catch ( e ) {
	process.stderr.write( `[generate-button-attributes] ${ e.message }\n` );
	process.exit( 1 );
}
const { files, entries, skipped, kept, unproven, overridesText } = result;
files.forEach( ( text, file ) => fs.writeFileSync( file, text, 'utf8' ) );
const nextOverrides = applyOverrideEntries( overridesText, entries, argBlock );
if ( nextOverrides !== overridesText ) {
	fs.writeFileSync( OVERRIDES_FILE, nextOverrides, 'utf8' );
}
if ( kept.length ) {
	process.stdout.write(
		`[generate-button-attributes] ${ kept.length } attribute(s) the block already declares with the same type are kept as the block's own (compare their default and enum by hand): ${ kept.join( ', ' ) }\n`
	);
}
if ( unproven.length ) {
	process.stdout.write(
		`[generate-button-attributes] ${ unproven.length } kept box attribute(s) state no shape in their default or description, so the shape the panel writes was not compared: ${ unproven.join( ', ' ) }\n`
	);
}
if ( skipped.length ) {
	process.stdout.write(
		`[generate-button-attributes] ${ skipped.length } attribute(s) keep their hand-written override entry: ${ skipped.join( ', ' ) }\n`
	);
}
process.stdout.write(
	`[generate-button-attributes] wrote ${ files.size } changed block.json file(s) and ${ entries.length } override entries\n`
);
