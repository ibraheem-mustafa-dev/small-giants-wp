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

export const COVERAGE_WRITES = [
	'css-function:circle',
	'css-function:skewx',
];

let attrDb = null;

// Whether the framework DB declares the attribute on the block (read-only).
export function declaredAttr( block, attr ) {
	try {
		attrDb ||= openDb();
		return !! attrDb.prepare( 'SELECT 1 FROM block_attributes WHERE block_slug = ? AND attr_name = ?' ).get( block, attr );
	} catch {
		return false;
	}
}

// The recognised behaviours of the records, keyed for placement: those a record names by template element are found
// through `recordsByElement`; those a script finds by a `[data-*]` hook (no template element of their own) are held
// by the elements that carry the hook. Returns { hosted: [ { r, b } ], hostsOf(key) } where hostsOf gives the hosted
// ones for a template element key.
export function behaviourIndex( { records, template, css } ) {
	const found = ( records || [] ).map( ( r ) => ( { r, b: recogniseBehaviour( r, { css } ) } ) ).filter( ( x ) => x.b );
	const hosted = found.filter( ( x ) => null === ( x.r.element?.template_tpl_id ?? null ) && x.b.host );
	const hosts = hostsFromTemplate( template, hosted.map( ( x ) => x.b.host ) );
	// A control names the record it controls, not an element: it is applied wherever that record's layer was written.
	const controls = found.filter( ( x ) => 'control' === x.b.kind ).map( ( x ) => ( { r: x.r, b: x.b, where: { node: null, block: '', slot: '' } } ) );
	return { found, controls, hostedFor: ( key ) => hosted.filter( ( x ) => hosts.get( x.b.host )?.has( key ) ) };
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
		} else if ( 'control' === b.kind ) {
			continue; // applied by applyControls once every node has been written
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
				written.set( r.id, { at: w.target, layer: w.layer } );
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

// The second pass: each control sets values on the layer of the record it controls (the marquee's hover rate).
export function applyControls( { controls, written, out } ) {
	for ( const { r, b, where } of controls ) {
		const target = written.get( b.of );
		if ( ! target || target.layer.effect !== b.effect ) {
			out.unmapped.push( { ...where, property: 'motion', value: r.id, reason: `${ b.of } is not written as a ${ b.effect } layer, so its control has nothing to set` } );
		} else {
			target.layer.values = { ...target.layer.values, ...b.values };
			out.notes.push( { ...where, text: `${ r.id }: ${ b.effect } ${ JSON.stringify( b.values ) } on ${ b.of }'s layer` } );
		}
	}
}
