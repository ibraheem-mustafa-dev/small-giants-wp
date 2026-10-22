// Writes the recognised script-driven effects of one skeleton node (Spec 48 FR-48-77; lib/motion-behaviours.mjs
// recognises them, lib/fill-motion.mjs::motionWrites calls this per target). An effect becomes a layer of the panel's
// list through the one effect writer (lib/motion-effects.mjs::writeEffect, reached by `finish`), a tilt becomes the
// hover state's follow-pointer values, a nav label magnet becomes the nav block's item magnet settings when the block
// declares them (a framework DB query), and a control (the marquee's hover rate) is applied to the layer its record
// controls once every node has been written.
import fs from 'fs';
import path from 'path';
import { openDb } from './db.mjs';
import { setAttr } from './tree.mjs';
import { recogniseBehaviour, hostsFromTemplate } from './motion-behaviours.mjs';
import { validateMotionWrite } from './motion-validate.mjs';

export const COVERAGE_WRITES = [
	'css-function:circle',
	'css-function:skewx',
	'construct:data-hook',
	'construct:handler',
	'construct:observer',
	'construct:timer',
	'html-attr:global.data',
];

let attrDb = null;

// Whether the framework DB declares the attribute on the block (read-only). `db` is the handle the caller already holds
// (the default opens the framework DB once). A DB that cannot be read declares nothing: the write is refused, never assumed.
export function declaredAttr( block, attr, db = null ) {
	try {
		const handle = db || ( attrDb ||= openDb() );
		return !! handle.prepare( 'SELECT 1 FROM block_attributes WHERE block_slug = ? AND attr_name = ?' ).get( block, attr );
	} catch {
		return false;
	}
}

// The attribute check of a framework DB handle, the shape `hasAttr( block, attr )` the writers take.
export const hasAttrOf = ( db ) => ( block, attr ) => declaredAttr( block, attr, db );

// The recognised behaviours of the records, keyed for placement: those a record names by template element are found
// through `recordsByElement`; those a script finds by a `[data-*]` hook (no template element of their own) are held
// by the elements that carry the hook. Returns { hosted: [ { r, b } ], hostsOf(key) } where hostsOf gives the hosted
// ones for a template element key.
export function behaviourIndex( { records, template, css } ) {
	const found = ( records || [] ).map( ( r ) => ( { r, b: recogniseBehaviour( r, { css, template } ) } ) ).filter( ( x ) => x.b );
	const hosted = found.filter( ( x ) => null === ( x.r.element?.template_tpl_id ?? null ) && x.b.host );
	const hosts = hostsFromTemplate( template, hosted.map( ( x ) => x.b.host ) );
	// A control names the record it controls, not an element: it is applied wherever that record's layer was written.
	const controls = found.filter( ( x ) => 'control' === x.b.kind ).map( ( x ) => ( { r: x.r, b: x.b, where: { node: null, block: '', slot: '' } } ) );
	return { found, controls, stripKeys: stripKeysOf( found, template ), hostedFor: ( key ) => hosted.filter( ( x ) => hosts.get( x.b.host )?.has( key ) ) };
}

// The template elements that scroll away above a pinned header: when the draft pins one element (a sticky header that
// also shadows on scroll), its earlier siblings that are not pinned themselves scroll off the page while the bar stays,
// as do their descendants. A Set of template keys.
export function stripKeysOf( found, template ) {
	const keys = new Set();
	const elements = template?.elements || {};
	const pinned = ( e ) => /^(?:sticky|fixed)$/.test( String( ( e?.style?.static || [] ).find( ( [ n ] ) => 'position' === n )?.[ 1 ] ?? '' ).trim() );
	for ( const { b } of found.filter( ( x ) => 'settings' === x.b.kind && x.b.sticky ) ) {
		const header = b.sticky.element;
		const strips = Object.entries( elements ).filter( ( [ key, e ] ) => key !== b.sticky.key && e.realParent && e.realParent === header.realParent && e.srcLine < header.srcLine && ! pinned( e ) ).map( ( [ key ] ) => key );
		strips.forEach( ( key ) => keys.add( key ) );
		for ( const [ key, e ] of Object.entries( elements ) ) {
			if ( ( e.parentChain || [] ).some( ( k ) => strips.includes( k ) ) ) {
				keys.add( key );
			}
		}
	}
	return keys;
}

// Writes a node's block settings from its settings behaviours (the behaviours whose block declares each attribute, a
// framework DB query); `colour` values equal to a palette colour are written by their slug. A behaviour no settings of
// this node's block belong to is reported. Returns the items it wrote or reported.
export function applySettings( { items, n, out, where, flat, hasAttr = declaredAttr, palette = null } ) {
	const seen = ( out.settingsDone ||= new Set() );
	for ( const { r, b } of items ) {
		if ( seen.has( `${ where.node }|${ r.id }` ) ) {
			continue;
		}
		seen.add( `${ where.node }|${ r.id }` );
		const mine = b.blocks[ n.name ];
		if ( ! mine ) {
			out.unmapped.push( { ...where, property: 'motion', value: r.id, reason: `${ r.id } maps onto settings of ${ Object.keys( b.blocks ).join( ' or ' ) }; this element is ${ n.name }` } );
			continue;
		}
		const missing = mine.filter( ( s ) => ! hasAttr( n.name, s.attr ) );
		if ( missing.length ) {
			out.unmapped.push( { ...where, property: 'motion', value: r.id, reason: `${ n.name } declares no ${ missing.map( ( s ) => s.attr ).join( ', ' ) } setting` } );
			continue;
		}
		for ( const s of mine ) {
			const value = s.colour && 'string' === typeof s.value ? ( palette?.get( s.value.toLowerCase() ) ?? s.value ) : s.value;
			const { before, after } = setAttr( flat[ n.index ], { attr: s.attr, value } );
			out.writes.push( { node: where.node, block: n.name, slot: where.slot, prop: `${ r.id } ${ s.attr }`, attr: s.attr, before, after, widths: [], how: 'motion' } );
		}
		out.notes.push( { ...where, text: `${ r.id }: ${ b.notes.join( '; ' ) } (${ mine.map( ( s ) => s.attr ).join( ', ' ) })` } );
		if ( b.accepted ) {
			out.notes.push( { ...where, text: `${ r.id }: accepted difference: ${ b.accepted }` } );
		}
	}
}

// The header row that scrolls away above the pinned header bar: `rowHideOnScroll` on a `sgs/site-header-row` whose
// element is one of the strip keys.
export function applyStrip( { n, target, key, idx, out, where, flat, hasAttr = declaredAttr } ) {
	if ( 'sgs/site-header-row' !== n.name || ! idx.stripKeys.has( key ) || flat[ n.index ].attributes?.rowHideOnScroll?.desktop || ! hasAttr( n.name, 'rowHideOnScroll' ) ) {
		return;
	}
	const { before, after } = setAttr( flat[ n.index ], { attr: 'rowHideOnScroll', value: { desktop: 'on' } } );
	out.writes.push( { node: where.node, block: n.name, slot: where.slot, prop: 'rowHideOnScroll', attr: 'rowHideOnScroll', before, after, widths: [], how: 'motion' } );
	out.notes.push( { ...where, text: 'the draft pins its header bar and lets this strip scroll away: the row hides on scroll' } );
}

const layerCount = ( el, effect, hover ) => ( ( hover ? el?.hover?.effects : el?.effects ) || [] ).filter( ( l ) => l.effect === effect ).length;

// Puts a finished layer into the document where writeEffect placed it.
function place( doc, at, w ) {
	const el = ( doc.elements[ at ] ||= {} );
	if ( 'hover.effects' === w.list ) {
		el.hover = { ...( el.hover || {} ), effects: [ ...( el.hover?.effects || [] ), w.layer ] };
	} else {
		el.effects = [ ...( el.effects || [] ), w.layer ];
	}
}

// One node target's behaviours. `items`: [ { r, b } ]; `finish( effect, id )` writes and checks one effect (writeEffect,
// preset, token snapping); `written` maps a record id to where its layer went (a control's target); `controls` collects
// the controls for the second pass. Pushes to out.writes, out.unmapped, out.notes and out.site.
export function applyBehaviours( { items, n, target, doc, pending, written, controls, out, where, flat, finish, mdb, hasAttr = declaredAttr } ) {
	const note = ( id, text ) => out.notes.push( { ...where, text: `${ id }: ${ text }` } );
	const refuse = ( id, reason ) => out.unmapped.push( { ...where, property: 'motion', value: id, reason } );
	for ( const { r, b } of items ) {
		if ( 'unmapped' === b.kind ) {
			refuse( r.id, b.reason );
		} else if ( 'native' === b.kind || 'covered' === b.kind ) {
			note( r.id, b.reason );
		} else if ( 'site' === b.kind ) {
			out.site.push( { record: r.id, option: b.option, ...b.value } );
			b.notes.forEach( ( t ) => note( r.id, t ) );
		} else if ( 'control' === b.kind || 'settings' === b.kind ) {
			continue; // a control is applied by applyControls once every node is written; settings by applySettings
		} else if ( 'close' === b.kind ) {
			const base = doc.elements[ target ]?.entrance?.base;
			if ( ! base || ! [ 'open', 'state' ].includes( base.trigger ) ) {
				refuse( r.id, 'the exit of an open entrance, but this element has no open entrance to close' );
				continue;
			}
			base.close = Object.fromEntries( Object.entries( { to: b.to, closeDuration: b.duration, closeEasing: b.easing, closeDelay: b.delay } ).filter( ( [ , v ] ) => null !== v && undefined !== v ) );
			pending.push( target );
			note( r.id, `the exit of the open entrance: ${ JSON.stringify( base.close ) }` );
		} else if ( b.alt?.settings.every( ( s ) => hasAttr( n.name, s.attr ) ) ) {
			for ( const s of b.alt.settings ) {
				const { before, after } = setAttr( flat[ n.index ], { attr: s.attr, value: s.value } );
				out.writes.push( { node: where.node, block: n.name, slot: where.slot, prop: `${ r.id } ${ s.attr }`, attr: s.attr, before, after, widths: [], how: 'motion' } );
			}
			note( r.id, `${ b.effects[ 0 ].effect } is the ${ n.name } setting ${ b.alt.settings.map( ( s ) => `${ s.attr } ${ JSON.stringify( s.value ) }` ).join( ', ' ) }` );
		} else {
			for ( const e of b.effects ) {
				const id = `${ e.effect }-${ layerCount( doc.elements[ target ], e.effect, 'hover' === e.panel ) + 1 }`;
				const w = finish( e, id );
				if ( w.refused ) {
					refuse( r.id, `${ e.effect }: ${ w.refused }` );
					continue;
				}
				place( doc, w.target, w );
				pending.push( w.target );
				written.set( r.id, { at: w.target, layer: w.layer, list: w.list, where } );
				note( r.id, `${ e.effect } is written from the draft's script${ w.dropped.length ? `; no ${ e.effect } field for ${ w.dropped.join( ', ' ) }` : '' }` );
			}
			if ( b.hoverState ) {
				const at = target;
				const kept = Object.fromEntries( Object.entries( b.hoverState ).filter( ( [ k ] ) => mdb.field( 'hover.state', `values.${ k }` ) ) );
				const el = ( doc.elements[ at ] ||= {} );
				el.hover = { ...( el.hover || {} ), state: { ...( el.hover?.state || {} ), values: { ...( el.hover?.state?.values || {} ), ...kept } } };
				pending.push( at );
				note( r.id, `follow-pointer hover state ${ JSON.stringify( kept ) }` );
			}
		}
	}
}

// The behaviours that belong to no element: the draft's route fade (a site option) and the ones SGS already does (a
// scroll reset on a route change, the page scroll lock of a modal drawer, a back-to-top press). Each is reported once.
export function applyGlobals( { found, out } ) {
	const where = { node: 'site', block: '', slot: '' };
	for ( const { r, b } of found.filter( ( x ) => [ 'site', 'native' ].includes( x.b.kind ) && null === ( x.r.element?.template_tpl_id ?? null ) && ! x.b.host ) ) {
		if ( 'site' === b.kind ) {
			out.site.push( { record: r.id, option: b.option, ...b.value } );
		}
		( 'site' === b.kind ? b.notes : [ b.reason ] ).forEach( ( text ) => out.notes.push( { ...where, text: `${ r.id }: ${ text }` } ) );
	}
}

// The draft's CSS text for the pointer-tracked reveal's consumer check: the draft file(s), which hold their styles inline
// (`style` attributes and `<style>` blocks). [] when the draft is served from a URL.
export function draftCssOf( draftDir, draftIndex = null ) {
	if ( ! draftDir || ! fs.existsSync( draftDir ) ) {
		return [];
	}
	const files = draftIndex ? [ draftIndex ] : fs.readdirSync( draftDir ).filter( ( f ) => /\.html$/.test( f ) );
	return files.map( ( f ) => path.join( draftDir, f ) ).filter( ( f ) => fs.existsSync( f ) ).map( ( f ) => fs.readFileSync( f, 'utf8' ) );
}

// A fact record's template in the shape behaviourIndex reads: { elements: { <key>: { attrs } } }.
export const templateOf = ( facts ) => ( facts ? { elements: Object.fromEntries( Object.entries( facts.elements || {} ).map( ( [ key, e ] ) => [ key, e.template || {} ] ) ) } : null );

// The second pass: each control sets values on the layer of the record it controls (the marquee's hover rate). The merged
// layer is validated on its own before it is kept, so a control value the schema refuses names the control instead of
// failing the whole node's document; the row carries the controlled record's node (where its layer, or its own row, sits).
export function applyControls( { controls, written, out, schema = undefined } ) {
	for ( const { r, b, where } of controls ) {
		const target = written.get( b.of );
		const held = out.unmapped.find( ( u ) => u.value === b.of && u.node );
		const at = target?.where ?? ( held ? { node: held.node, block: held.block, slot: held.slot } : where );
		if ( ! target || target.layer.effect !== b.effect ) {
			out.unmapped.push( { ...at, property: 'motion', value: r.id, reason: `${ b.of } is not written as a ${ b.effect } layer, so its control has nothing to set` } );
			continue;
		}
		const merged = { ...target.layer, values: { ...target.layer.values, ...b.values } };
		const element = 'hover.effects' === target.list ? { hover: { effects: [ merged ] } } : { effects: [ merged ] };
		const verdict = undefined === schema ? { valid: true } : validateMotionWrite( { v: 1, elements: { [ target.at ]: element } }, schema );
		if ( ! verdict.valid ) {
			out.unmapped.push( { ...at, property: 'motion', value: r.id, reason: `${ b.effect } ${ JSON.stringify( b.values ) } on ${ b.of }'s layer is refused: ${ [ ...verdict.errors, ...verdict.refusals ].join( '; ' ) }` } );
			continue;
		}
		target.layer.values = merged.values;
		out.notes.push( { ...at, text: `${ r.id }: ${ b.effect } ${ JSON.stringify( b.values ) } on ${ b.of }'s layer` } );
	}
}
