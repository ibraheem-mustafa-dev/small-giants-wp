// The look of a built-in button, read from the draft (template-rework, the button kit: plugins/sgs-blocks/src/components/button-kit).
// A block that draws a button itself (a buy box's flow opener) declares it in block.json `supports.sgs.builtinButtons` as
// { prefix, part }. The framework database then holds a preset choice `<prefix>Style` (role `button-preset`, `css_element` = the part)
// and a prefixed look set whose rows carry `css_element` = the part with their `css_property` and `css_state`. lib/fill-part-look.mjs
// pairs the part's resting look with the rest-state rows by itself; this module adds what it leaves:
//   - the preset: when the draft's button, resting and hovered, equals one variant of the site's buttonPresets that the choice
//     allows (lib/fill-preset.mjs::matchPreset, the same rule a `sgs/button` follows), `<prefix>Style` is written as that variant
//     and the look writes the preset already gives are dropped. A variant that differs in any value it holds matches nothing, so a
//     dark outlined draft button never takes a preset drawn for a dark page;
//   - the hover look: when no preset matches, the draft's hovered colours go to the part's hover rows (css_state `hover`).
// A part the draft does not draw, a preset choice the database does not hold for the part, or draft instances that disagree
// write nothing here. Pure: the block's rows, the part-look build and the reads in, the build adjusted and notes out.
import fs from 'node:fs';
import path from 'node:path';
import { BLOCKS_DIR } from './resolve.mjs';
import { PRESET_KEYS, matchPreset, presetChoices, presetMisses } from './fill-preset.mjs';
import { READ_WIDTHS } from './fill-read.mjs';
import { WIDTHS, primitive, samePrimitive, toSetting } from './fill-part-look.mjs';

// The computed properties read from the hovered element: every one a preset's hover keys read (hover-background, hover-text,
// hover-border, hover-transform) and what `primitive` needs to name a border colour. Hovering waits for the element's transition.
export const HOVER_PROPS = [ 'background-color', 'color', 'border-top-color', 'border-top-width', 'border-top-style', 'box-shadow', 'transform' ];

// The part-look settings (`css_property`) a preset's computed property paints: a matched preset drops the writes of these.
const PAINTS = {
	'background-color': [ 'background-color' ], color: [ 'color' ], 'border-top-color': [ 'border-color' ], 'border-top-width': [ 'border-width' ],
	'border-top-left-radius': [ 'border-radius' ], 'padding-top': [ 'padding' ], 'padding-right': [ 'padding' ], 'padding-bottom': [ 'padding' ], 'padding-left': [ 'padding' ],
	'font-size': [ 'font-size' ], 'font-weight': [ 'font-weight' ], 'min-height': [ 'min-height' ],
};
// The hover colours a part's hover rows can hold, by the property they paint.
const HOVER_COLOUR = [ 'background-color', 'color', 'border-color' ];
const PRESET_PROPS = [ ...new Set( PRESET_KEYS.filter( ( [ , , state ] ) => ! state ).flatMap( ( [ , props ] ) => props ) ) ];

let declaredIndex = null;
// The built-in buttons a block declares in its block.json: [ { prefix, part, label } ], empty for a block that declares none.
export function declaredButtons( block ) {
	if ( ! declaredIndex ) {
		declaredIndex = {};
		for ( const dir of fs.readdirSync( BLOCKS_DIR ) ) {
			const file = path.join( BLOCKS_DIR, dir, 'block.json' );
			if ( fs.existsSync( file ) ) {
				const json = JSON.parse( fs.readFileSync( file, 'utf8' ) );
				declaredIndex[ json.name ] = ( json.supports?.sgs?.builtinButtons || [] ).map( ( b ) => ( { prefix: b.prefix, part: b.part, label: b.label ?? null } ) );
			}
		}
	}
	return declaredIndex[ block ] || [];
}

// The instances of a part at each width as the preset matcher's reads: the first instance stands for the part, and `agree` is
// false where the instances of a width differ in a value a preset compares (the part-look reader refuses to average them).
export function presetReads( instances, id ) {
	const out = { widths: {}, states: {}, agree: true, hovered: true };
	for ( const width of READ_WIDTHS ) {
		const list = instances?.[ width ] || [];
		if ( ! list.length ) {
			out.widths[ width ] = {};
			out.states[ width ] = { looks: {} };
			out.hovered = false;
			continue;
		}
		const sig = ( i ) => JSON.stringify( [ PRESET_PROPS.map( ( p ) => i.styles?.[ p ] ), i.hover ? HOVER_PROPS.map( ( p ) => i.hover[ p ] ) : null ] );
		out.agree = out.agree && list.every( ( i ) => sig( i ) === sig( list[ 0 ] ) );
		const [ first ] = list;
		out.widths[ width ] = { [ id ]: { styles: first.styles } };
		const changed = first.hover && HOVER_PROPS.some( ( p ) => first.hover[ p ] !== first.styles?.[ p ] );
		out.states[ width ] = { looks: { [ id ]: changed ? [ { states: [ 'hover' ], declared: {}, rendered: first.hover } ] : [] } };
		first.hover || ( out.hovered = false );
	}
	return out;
}

// The hover write of one hover row from the part's first instance at 1440: { write } or { skip: reason }. A colour that equals
// the resting one, or paints nothing, is not written.
function hoverWrite( { row, instance, snapshot, names, log } ) {
	const value = primitive( row.css_property, instance.hover, row );
	if ( undefined === value || null === value ) {
		return { skip: 'the hovered look paints no value' };
	}
	const rest = primitive( row.css_property, instance.styles, row );
	if ( samePrimitive( value, rest ) ) {
		return { skip: 'the hovered look equals the resting one' };
	}
	const set = toSetting( row, value, { names, snapshot, log } );
	return set.why ? { skip: set.why } : { write: { attr: row.attr_name, value: set.value, part: row.css_element, property: `${ row.css_property } (hover)`, draft: { 1440: value }, defaultNotRead: true } };
}

// Adjusts a part-look build (lib/fill-part-look.mjs::buildLook's result, changed in place) for the built-in buttons of `block`.
//   rows: the block's framework-database rows (part-look-run.mjs::blockRows); names: its attribute names; db: the framework database;
//   reads: { part: { width: [ { styles, hover } ] } } (the part-look reads, each instance carrying `hover` when hovered);
//   presets: settings.custom.buttonPresets of the client's raw snapshot; snapshot: the normalised snapshot;
//   buttons: the declared buttons (declaredButtons; a test passes its own); schemaOf: block.json attributes (lib/fill-preset.mjs).
// Returns { notes, buttons: [ { prefix, part, preset: variant|null, dropped: [ attr ], hover: [ attr ], misses } ] }.
export function applyBuiltinButtons( { block, build, rows, names, db, reads, presets, snapshot, buttons = declaredButtons( block ), schemaOf } ) {
	const out = { notes: [], buttons: [] };
	const choices = buttons.length ? ( presetChoices( db, presets || {}, schemaOf )[ block ] || [] ) : [];
	for ( const { prefix, part } of buttons ) {
		const label = `${ block } ${ prefix } (${ part })`;
		const instances = reads[ part ] || {};
		if ( ! WIDTHS.some( ( w ) => ( instances[ w ] || [] ).length ) ) {
			out.notes.push( `${ label }: the draft draws no such button, so no preset or hover look is written` );
			continue;
		}
		const choice = choices.find( ( c ) => c.attr === `${ prefix }Style` && c.part === part );
		const entry = { prefix, part, preset: null, dropped: [], hover: [], misses: {} };
		out.buttons.push( entry );
		const id = part;
		const pr = presetReads( instances, id );
		const held = Object.fromEntries( Object.entries( presets || {} ).filter( ( [ v ] ) => choice?.variants.includes( v ) ) );
		let matched = null;
		if ( ! choice ) {
			out.notes.push( `${ label }: the framework database holds no preset choice ${ prefix }Style for the part, so only the look is written` );
		} else if ( ! Object.keys( held ).length ) {
			out.notes.push( `${ label }: the site's buttonPresets holds no variant ${ choice.attr } allows, so the draft's own look is written` );
		} else if ( ! pr.agree ) {
			out.notes.push( `${ label }: the draft's instances of the button differ, so no preset is matched` );
		} else if ( ! pr.hovered ) {
			out.notes.push( `${ label }: the draft's hovered look was not read at every width, so no preset is matched` );
		} else {
			matched = matchPreset( { presets: held, reads: pr, id, snapshot } );
			if ( ! matched ) {
				entry.misses = presetMisses( { presets: held, reads: pr, id, snapshot } );
				out.notes.push( `${ label }: no site preset equals the draft's button, so its own look is written (${ Object.entries( entry.misses ).map( ( [ v, l ] ) => `${ v }: ${ l[ 0 ] }` ).join( '; ' ) })` );
			}
		}
		if ( matched ) {
			const covered = new Set( [ ...matched.props ].flatMap( ( p ) => PAINTS[ p ] || [] ) );
			const dropped = build.writes.filter( ( w ) => w.part === part && ! w.mode && rows.some( ( r ) => r.attr_name === w.attr && r.css_element === part && covered.has( r.css_property ) ) );
			const gone = new Set( [ ...dropped.map( ( w ) => w.attr ) ] );
			build.writes = build.writes.filter( ( w ) => ! gone.has( w.attr ) && ! gone.has( w.companionOf ) );
			dropped.forEach( ( w ) => {
				build.settings[ w.attr ] = { status: 'not-written', reason: `the ${ matched.variant } preset of ${ choice.attr } gives it`, part, code: 'preset' };
			} );
			build.writes.push( { attr: choice.attr, value: matched.variant, part, property: '(preset)', draft: { 1440: matched.variant }, preset: true, mode: true, evidence: `the draft's ${ part } equals the site preset ${ matched.variant }, resting and hovered` } );
			build.settings[ choice.attr ] = { status: 'written', reason: null, part, code: 'preset' };
			entry.preset = matched.variant;
			entry.dropped = [ ...gone ];
			out.notes.push( `${ label }: its resting and hover looks equal the ${ matched.variant } preset, so ${ choice.attr } is ${ matched.variant } and ${ gone.size } look write${ 1 === gone.size ? '' : 's' } the preset gives are not written` );
			continue;
		}
		// No preset: the hovered colours go to the part's hover rows (the resting look is part-look's own write).
		const first = ( instances[ 1440 ] || [] )[ 0 ];
		if ( ! first?.hover ) {
			out.notes.push( `${ label }: the draft's hovered look was not read at 1440, so no hover colour is written` );
			continue;
		}
		const log = [];
		for ( const row of rows.filter( ( r ) => r.css_element === part && 'hover' === r.css_state && HOVER_COLOUR.includes( r.css_property ) ) ) {
			const got = hoverWrite( { row, instance: first, snapshot, names, log } );
			if ( got.write ) {
				build.writes.push( got.write );
				build.settings[ row.attr_name ] = { status: 'written', reason: null, part, code: 'hover' };
				entry.hover.push( row.attr_name );
			} else {
				build.settings[ row.attr_name ] = { status: 'not-written', reason: got.skip, part, code: 'noDifference' };
			}
		}
	}
	build.counts && Object.assign( build.counts, {
		written: build.writes.filter( ( w ) => ! w.companionOf ).length,
		companions: build.writes.filter( ( w ) => w.companionOf ).length,
	} );
	return out;
}
