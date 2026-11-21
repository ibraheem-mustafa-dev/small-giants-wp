// The look of a built-in button, read from the draft (template-rework, the button kit: plugins/sgs-blocks/src/components/button-kit).
// A block that draws a button itself (a buy box's flow opener) declares it in block.json `supports.sgs.builtinButtons` as
// { prefix, part }. The framework database then holds a preset choice `<prefix>Style` (role `button-preset`, `css_element` = the part)
// and a prefixed look set whose rows carry `css_element` = the part with their `css_property` and `css_state`. lib/fill-part-look.mjs
// pairs the part's resting look with the rest-state rows by itself; this module adds what it leaves:
//   - the preset: when the draft's button, resting and hovered, equals one variant of the site's buttonPresets that the choice
//     allows (lib/fill-preset.mjs::matchPreset, the same rule a `sgs/button` follows), `<prefix>Style` is written as that variant
//     and the look writes the preset already gives are dropped. A variant that differs in any value it holds matches nothing, so a
//     dark outlined draft button never takes a preset drawn for a dark page;
//   - the hover look: when no preset matches, the draft's hovered colours go to the part's hover rows (css_state `hover`), the ones equal to the resting colour too;
//   - the content alignment: `<prefix>ContentAlign` from the button's computed justify-content (a label at one end and a price or note at
//     the other is space-between), per device, nothing where it is the block's own centre (the draft's `normal` or `center`);
//   - the hover lift: `<prefix>HoverLiftDistance` from how far the hovered button moves up (the Y translation of its hovered transform
//     against its resting one), whole px; `0px` for a draft button whose hover was read and does not move up (it stays still where the
//     site's preset or `default` button token lifts); nothing where the resting or hovered transform is not a pure translation (a scale,
//     rotation or skew: the lift rule prints `transform:none` on hover and would drop it), or where no hover was read at 1440. A preset
//     carries no per-button distance, so both are written whether or not a preset matched. Each is written only where the block declares
//     the attribute (`names`).
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

const REGISTRY = path.resolve( BLOCKS_DIR, '..', 'components', 'button-kit', 'registry.json' );

// The value shape the button kit's registry gives each of a button's attributes that has one: { <prefix><Base>: 'sides' | 'device_sides' |
// 'device_corners' }. The framework database labels every box `box_only`, a flat box and a per-device one alike, so the shape the editor
// stores and the PHP reads is the registry's `value_shape`, never the database's tier_shape. `registry` is the parsed file (a test passes its own).
export function kitValueShapes( prefix, registry = JSON.parse( fs.readFileSync( REGISTRY, 'utf8' ) ) ) {
	return Object.fromEntries( Object.values( registry.groups || {} ).flat().filter( ( a ) => a.value_shape ).map( ( a ) => [ `${ prefix }${ a.base }`, a.value_shape ] ) );
}

// A part-look write of a box setting that the registry stores per device, as { desktop, tablet?, mobile? }: the draft's 1440 value, a
// narrower one only where it differs from the width above it (part-look's own rule for a per-device setting). The write is returned
// as it was when the draft holds no 1440 value or a value has no setting shape.
function perDeviceWrite( write, row, ctx ) {
	const [ d, t, m ] = [ write.draft?.[ 1440 ], write.draft?.[ 768 ], write.draft?.[ 375 ] ];
	if ( undefined === d || null === d || ! row ) {
		return write;
	}
	const tiers = { desktop: d };
	undefined !== t && null !== t && ! samePrimitive( t, d ) && ( tiers.tablet = t );
	undefined !== m && null !== m && ! samePrimitive( m, tiers.tablet ?? d ) && ( tiers.mobile = m );
	const shaped = Object.entries( tiers ).map( ( [ k, v ] ) => [ k, toSetting( row, v, ctx ) ] );
	if ( shaped.some( ( [ , x ] ) => x.why ) ) {
		return write;
	}
	return { ...write, value: Object.fromEntries( shaped.map( ( [ k, x ] ) => [ k, x.value ] ) ), widthVaries: undefined };
}

// The `justify-content` values `<prefix>ContentAlign` takes, by the computed value that names each (the block's own centre is no write).
const ALIGN_VALUES = { 'flex-start': 'flex-start', start: 'flex-start', 'flex-end': 'flex-end', end: 'flex-end', 'space-between': 'space-between' };
const ALIGN_OWN = [ 'center', 'normal', '' ];
// The Y translation of a computed `transform` (px, up is negative): 'none' is 0, a matrix reads its ty, anything else is unreadable (null).
export function translateY( transform ) {
	return transformShape( transform )?.ty ?? null;
}

// A computed `transform` as { ty, pure }: its Y translation and whether it is a pure translation (the matrix's other cells are the identity's:
// no scale, rotation, skew or perspective). 'none' is { 0, true }; anything the route cannot read is null.
export function transformShape( transform ) {
	const text = String( transform ?? '' ).trim();
	if ( '' === text || 'none' === text ) {
		return { ty: 0, pure: true };
	}
	const m = /^matrix(3d)?\(([^)]*)\)$/.exec( text );
	const n = m ? m[ 2 ].split( ',' ).map( ( v ) => Number.parseFloat( v ) ) : [];
	const ty = n[ m?.[ 1 ] ? 13 : 5 ];
	if ( ! m || n.length !== ( m[ 1 ] ? 16 : 6 ) || ! n.every( Number.isFinite ) ) {
		return null;
	}
	// The cells that are not a translation, by their identity value: 2D a b c d; 3D the whole upper 3x3 and the bottom row's w.
	const fixed = m[ 1 ] ? { 0: 1, 1: 0, 2: 0, 3: 0, 4: 0, 5: 1, 6: 0, 7: 0, 8: 0, 9: 0, 10: 1, 11: 0, 15: 1 } : { 0: 1, 1: 0, 2: 0, 3: 1 };
	return { ty, pure: Object.entries( fixed ).every( ( [ i, v ] ) => Math.abs( n[ i ] - v ) < 0.001 ) };
}

// The `<prefix>ContentAlign` write of a part: the draft's computed justify-content at each width, as { desktop, tablet?, mobile? } where a
// narrower width differs from the one above it (part-look's rule for a per-device setting), the block's own centre dropped. { write } or { skip }.
export function contentAlignWrite( { attr, part, instances, explicit = false } ) {
	const draft = {};
	for ( const width of WIDTHS ) {
		const seen = [ ...new Set( ( instances[ width ] || [] ).map( ( i ) => String( i.styles?.[ 'justify-content' ] ?? '' ).trim() ) ) ];
		if ( seen.length > 1 ) {
			return { skip: `the draft's instances of the button differ in justify-content at ${ width }px` };
		}
		draft[ width ] = seen[ 0 ];
	}
	if ( undefined === draft[ 1440 ] ) {
		return { skip: `the draft's justify-content was not read at 1440` };
	}
	const effective = ( v ) => ALIGN_VALUES[ v ] ?? ( ALIGN_OWN.includes( v ) ? 'center' : null );
	const tiers = {};
	let above = 'center';
	for ( const [ tier, width ] of [ [ 'desktop', 1440 ], [ 'tablet', 768 ], [ 'mobile', 375 ] ] ) {
		const v = undefined === draft[ width ] ? above : effective( draft[ width ] );
		if ( null === v ) {
			return { skip: `the draft's justify-content (${ draft[ width ] }) has no content alignment setting value` };
		}
		v !== above && ( tiers[ tier ] = v );
		above = v;
	}
	// `explicit`: the button follows another whose alignment is written, so its own centre is written too (it would follow the other's).
	if ( ! Object.keys( tiers ).length && explicit ) {
		tiers.desktop = 'center';
	}
	return Object.keys( tiers ).length ? { write: { attr, value: tiers, part, property: 'justify-content', draft, defaultNotRead: true } } : { skip: `the draft centres the button's content, which is the block's own` };
}

// The `<prefix>HoverLiftDistance` write of a part: whole px the hovered button moves up from its resting place at 1440. { write } or { skip }.
export function hoverLiftWrite( { attr, part, instance } ) {
	if ( ! instance?.hover ) {
		return { skip: `the draft's hovered look was not read at 1440` };
	}
	const [ rest, hover ] = [ transformShape( instance.styles?.transform ), transformShape( instance.hover.transform ) ];
	if ( ! rest || ! hover ) {
		return { skip: 'the hovered transform is not a translation the route reads' };
	}
	// The lift rule prints `transform:none` on hover (cancelling the site token's own hover transform), which would drop a scale, rotation or skew.
	if ( ! rest.pure || ! hover.pure ) {
		return { skip: `a lift distance cannot hold the draft's scaling hover (resting transform ${ instance.styles?.transform || 'none' }, hovered ${ instance.hover.transform })` };
	}
	// A button that does not move up writes 0px: it stays still where the site's preset or `default` token lifts.
	const up = Math.round( rest.ty - hover.ty );
	return { write: { attr, value: up >= 1 ? `${ Math.min( up, 24 ) }px` : '0px', part, property: 'transform (hover)', draft: { 1440: `${ Math.max( up, 0 ) }px` }, defaultNotRead: true } };
}

let declaredIndex = null;
// The built-in buttons a block declares in its block.json: [ { prefix, part, label } ], empty for a block that declares none.
export function declaredButtons( block ) {
	if ( ! declaredIndex ) {
		declaredIndex = {};
		for ( const dir of fs.readdirSync( BLOCKS_DIR ) ) {
			const file = path.join( BLOCKS_DIR, dir, 'block.json' );
			if ( fs.existsSync( file ) ) {
				const json = JSON.parse( fs.readFileSync( file, 'utf8' ) );
				declaredIndex[ json.name ] = ( json.supports?.sgs?.builtinButtons || [] ).map( ( b ) => ( { prefix: b.prefix, part: b.part, label: b.label ?? null, follows: b.follows ?? null } ) );
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

// The hover write of one hover row from the part's first instance at 1440: { write } or { skip: reason }. A hovered colour that paints
// nothing is not written; one equal to the resting colour IS: an unset hover row follows the block's own hover look (a secondary
// button's dark text), so a draft that keeps its text colour on hover still has to say so (measured on a flow opener: the hovered
// background alone left its cream text dark).
function hoverWrite( { row, instance, snapshot, names, log } ) {
	const value = primitive( row.css_property, instance.hover, row );
	if ( undefined === value || null === value ) {
		return { skip: 'the hovered look paints no value' };
	}
	const set = toSetting( row, value, { names, snapshot, log } );
	return set.why ? { skip: set.why } : { write: { attr: row.attr_name, value: set.value, part: row.css_element, property: `${ row.css_property } (hover)`, draft: { 1440: value }, defaultNotRead: true } };
}

// Adjusts a part-look build (lib/fill-part-look.mjs::buildLook's result, changed in place) for the built-in buttons of `block`.
//   rows: the block's framework-database rows (part-look-run.mjs::blockRows); names: its attribute names; db: the framework database;
//   reads: { part: { width: [ { styles, hover } ] } } (the part-look reads, each instance carrying `hover` when hovered);
//   presets: settings.custom.buttonPresets of the client's raw snapshot; snapshot: the normalised snapshot;
//   buttons: the declared buttons (declaredButtons; a test passes its own); schemaOf: block.json attributes (lib/fill-preset.mjs).
// Returns { notes, buttons: [ { prefix, part, preset: variant|null, dropped: [ attr ], hover: [ attr ], misses, contentAlign: value|null, lift: '<n>px'|null } ] }.
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
		const entry = { prefix, part, preset: null, dropped: [], hover: [], misses: {}, contentAlign: null, lift: null };
		out.buttons.push( entry );
		// A box the registry stores per device is written per device (a flat box prints nothing there).
		const shapes = kitValueShapes( prefix );
		build.writes = build.writes.map( ( w ) => ( w.part === part && ! w.mode && ! w.companionOf && /^device_/.test( shapes[ w.attr ] || '' ) ? perDeviceWrite( w, rows.find( ( r ) => r.attr_name === w.attr ), { names, snapshot, log: [] } ) : w ) );
		// The content alignment and the hover lift: one owner here, whether or not a preset matches and whether or not the part-look pass
		// wrote the setting from its own row (the hover row is a state setting it does not read).
		for ( const [ base, made ] of [ [ 'ContentAlign', contentAlignWrite( { attr: `${ prefix }ContentAlign`, part, instances } ) ], [ 'HoverLiftDistance', hoverLiftWrite( { attr: `${ prefix }HoverLiftDistance`, part, instance: ( instances[ 1440 ] || [] )[ 0 ] } ) ] ] ) {
			const attr = `${ prefix }${ base }`;
			if ( ! names.has( attr ) ) {
				continue;
			}
			build.writes = build.writes.filter( ( w ) => w.attr !== attr );
			if ( made.write ) {
				build.writes.push( made.write );
				build.settings[ attr ] = { status: 'written', reason: null, part, code: 'ContentAlign' === base ? 'contentAlign' : 'hoverLift' };
				entry[ 'ContentAlign' === base ? 'contentAlign' : 'lift' ] = made.write.value;
			} else {
				build.settings[ attr ] = { status: 'not-written', reason: made.skip, part, code: 'noDifference' };
			}
		}
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
	// A button that follows another (`follows` in its block.json declaration: every setting it leaves unset takes the other's, as the
	// buy box's flow opener takes Add to Cart's through the class it wears) gets its own content alignment written where the
	// followed button got one and this button's draft does not match it: its centre, or it would show the other's. Its lift needs no pass of
	// its own: the main pass above writes 0px for a still button, so a follower never takes the followed button's lift.
	for ( const { prefix, part, follows } of buttons.filter( ( b ) => b.follows ) ) {
		const instances = reads[ part ] || {};
		if ( ! WIDTHS.some( ( w ) => instances[ w ]?.length ) ) {
			continue;
		}
		const attr = `${ prefix }ContentAlign`;
		if ( ! names.has( attr ) || build.writes.some( ( w ) => w.attr === attr ) || ! build.writes.some( ( w ) => w.attr === `${ follows }ContentAlign` ) ) {
			continue;
		}
		const own = contentAlignWrite( { attr, part, instances, explicit: true } );
		if ( own.write ) {
			build.writes.push( own.write );
			build.settings[ attr ] = { status: 'written', reason: `it follows ${ follows }, whose ContentAlign is written`, part, code: 'contentAlign' };
		}
	}
	return out;
}
