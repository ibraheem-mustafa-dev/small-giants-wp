// The motion a draft runs on parts of content its code injects into a stamped element (Spec 48 FR-48-78, RC12): intake
// records such a call against the stamped holder with the part's id as its selector (lib/intake-inventory-part.mjs).
// It is never the holder's own motion. Each part is written as a cloning custom target inside the holder's block (Spec 38A
// FR-38A-5: one scoped selector and a review row naming the draft node and why no declared part fits), with what the
// motion panels hold there: an entrance on load, mount or scroll into view, a hover pose; an endless animation goes to the
// block's Additional CSS box scoped to the part. A motion no panel holds on a part is a named framework-gap row:
//   - a hover that replays a there-and-back keyframe animation (the Hover panel holds a resting and a hovered pose);
//   - anything else elementMotion or the loop CSS cannot hold, with its own reason.
import { idOfSelector } from './intake-inventory-part.mjs';
import { templateKey } from './fact-key.mjs';
import { elementMotion } from './fill-motion-element.mjs';
import { classify } from './motion-layers.mjs';
import { loopKeyframesCss, loopName } from './motion-loop-css.mjs';

// The parts a record's selector names inside its holder: [ { id, children } ] when every comma piece is an id query
// (`#x`, `[id="x"]`, either with ` > *` for each child) and no holder template element carries that id itself; else null.
// A record with no template element, or a holder the template does not hold, is not a part.
export function partsOfRecord( r, template ) {
	const tpls = [ r?.element?.template_tpl_id ].flat().filter( ( v ) => null !== v && undefined !== v );
	const holders = tpls.map( ( tpl ) => template?.elements?.[ templateKey( { dc: r.element.dc, tpl } ) ] );
	if ( ! tpls.length || holders.some( ( e ) => ! e ) ) {
		return null;
	}
	const parts = String( r.element.selector ?? '' ).split( /\s*,\s*/ ).map( ( piece ) => {
		const m = /^(.*?)(\s*>\s*\*)?$/.exec( piece );
		const id = idOfSelector( m[ 1 ] );
		return id ? { id, children: Boolean( m[ 2 ] ) } : null;
	} );
	if ( ! parts.length || parts.some( ( x ) => ! x ) ) {
		return null;
	}
	return holders.some( ( e ) => parts.some( ( x ) => String( e.attrs?.id ?? '' ) === x.id ) ) ? null : parts;
}

// Splits the records into the part records by holder key and the rest. Returns { parts: Map(key → [records]), rest }.
export function splitPartRecords( records, template ) {
	const parts = new Map();
	const rest = [];
	for ( const r of records || [] ) {
		if ( ! partsOfRecord( r, template ) ) {
			rest.push( r );
			continue;
		}
		for ( const tpl of [ r.element.template_tpl_id ].flat() ) {
			const key = templateKey( { dc: r.element.dc, tpl } );
			parts.set( key, [ ...( parts.get( key ) || [] ), r ] );
		}
	}
	return { parts, rest };
}

// Moves the part records of a holder no block draws as its own element (the stamped holder a section's SVG background is
// drawn from) to the nearest template ancestor that is a target, whose block now holds the injected content. Changes `parts`.
export function rehomeParts( parts, { targetKeys, template } ) {
	for ( const [ key, list ] of [ ...parts ] ) {
		if ( targetKeys.has( key ) ) {
			continue;
		}
		let at = template?.elements?.[ key ]?.parent ?? null;
		for ( let guard = 0; at && ! targetKeys.has( at ) && guard < 100; guard++ ) {
			at = template.elements[ at ]?.parent ?? null;
		}
		if ( at ) {
			parts.delete( key );
			parts.set( at, [ ...( parts.get( at ) || [] ), ...list ] );
		}
	}
}

// A hover that replays a keyframe animation there and back: every property ends where it starts and passes through
// another value.
const replays = ( r ) => 'hover' === r.trigger?.type && ( r.properties || [] ).length > 0 && r.properties.every( ( p ) => String( p.from ) === String( p.to ) && ( p.keyframes || [] ).some( ( k ) => String( k.value ) !== String( p.from ) ) );

// An endless animation as the record the loop CSS reads: a two-stop record gains its from and to as keyframes.
const asLoop = ( r ) => ( { ...r, properties: ( r.properties || [] ).map( ( p ) => ( Array.isArray( p.keyframes ) ? p : { ...p, keyframes: [ { offset: 0, value: p.from }, { offset: 1, value: p.to } ] } ) ) } );

// Writes one holder's part records. `n` the node, `doc` its motion document, `pending` its written targets, `where` its
// row location, `holder` the holder's template key; mdb and ctx as lib/fill-motion-element.mjs::elementMotion takes them.
// Returns { used: [record ids], css: [ { record, css } ] } (the css for the block's Additional CSS box).
export function writePartMotion( { n, list, doc, pending, out, where, holder, mdb, ctx } ) {
	const used = [];
	const css = [];
	const bySelector = new Map();
	// One target per part: a record that animates several parts (an array of them) joins each part's group.
	list.forEach( ( r ) => String( r.element.selector ).split( /\s*,\s*/ ).forEach( ( piece ) => bySelector.set( piece, [ ...( bySelector.get( piece ) || [] ), r ] ) ) );
	for ( const [ selector, group ] of bySelector ) {
		const gap = ( r, what ) => out.unmapped.push( { ...where, property: 'motion', value: r.id, reason: `framework gap: ${ what } on the part ${ selector } of the content the draft's code puts into this element` } );
		const loops = group.filter( ( r ) => 'effect' === classify( r, { css: ctx.css, records: ctx.records } ).kind );
		for ( const r of loops ) {
			const box = loopKeyframesCss( asLoop( r ), loopName( r ) );
			if ( box.css ) {
				css.push( { record: r, css: box.css.replace( '& {', `& ${ selector } {` ) } );
				used.push( r.id );
				out.notes.push( { ...where, text: `${ r.id }: an endless animation of the part ${ selector }, written to the Additional CSS box scoped to that part` } );
			} else {
				gap( r, `an endless animation the Additional CSS box cannot hold (${ box.unmapped })` );
			}
		}
		group.filter( replays ).forEach( ( r ) => gap( r, 'a hover that replays a there-and-back keyframe animation (the Hover panel holds a resting and a hovered pose, not a replay)' ) );
		const layered = group.filter( ( r ) => ! loops.includes( r ) && ! replays( r ) );
		if ( ! layered.length ) {
			continue;
		}
		const target = `custom:${ Object.keys( doc.elements ).filter( ( k ) => k.startsWith( 'custom:' ) ).length + 1 }`;
		const m = elementMotion( layered, { mdb, ctx, target } );
		used.push( ...m.used );
		out.notes.push( ...m.notes.map( ( text ) => ( { ...where, text } ) ) );
		m.unmapped.forEach( ( u ) => out.unmapped.push( { ...where, property: 'motion', value: u.record, reason: `framework gap on the part ${ selector }: ${ u.reason }` } ) );
		if ( Object.keys( m.element ).length ) {
			doc.elements[ target ] = { selector, review: { draftNode: `${ holder } ${ selector }`, reason: `the draft's code puts content into this element and animates its part ${ selector }; no declared part of ${ n.name } is that part` }, ...m.element };
			pending.push( target );
		}
	}
	return { used: [ ...new Set( used ) ], css };
}
