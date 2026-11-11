// Spec 49 section 11, Stage B: the route's writer. The draft's visible media at 375, 768 and 1440 (lib/fill-read-collect.mjs
// `media`) becomes one Source per slot, written in the slot schema's shape: kind per device from the visible element, a
// Source with its attachment and width, height and mime (FR-49-16), Decorative for `alt=""`, Alt otherwise. Nothing here
// names an attribute: the slot (lib/media/slots.mjs) does, from the block's own declaration.
import { slotFromReads } from './index.mjs';
import { placement } from './absorb.mjs';
import { mimeOf, kindOfTag } from './kind-per-width.mjs';
import { pickSlot } from './slots.mjs';

const WIDTHS = [ 1440, 768, 375 ];
const TIER = { 1440: 'desktop', 768: 'tablet', 375: 'mobile' };
const escapeText = ( s ) => String( s ).replace( /&/g, '&amp;' ).replace( /</g, '&lt;' ).replace( />/g, '&gt;' );
const unset = ( v ) => undefined === v || null === v || '' === v || false === v || 0 === v || ( 'object' === typeof v && 0 === Object.keys( v ).length );

/**
 * One attachment as a Source entry (a list item's picture, section 8.3): the attachment's id and URL with the file's mime.
 *
 * @param {Object} hit Media-map entry { id, url, width?, height? }.
 * @return {Object} { desktop: { kind, id, url, mime, width?, height? } }.
 */
export function itemSource( hit ) {
	const entry = { kind: 'image', id: hit.id, url: hit.url };
	const mime = mimeOf( hit.url );
	mime && ( entry.mime = mime );
	hit.width > 0 && hit.height > 0 && ( entry.width = hit.width, entry.height = hit.height );
	return { desktop: entry };
}

/**
 * @param {Object} o
 * @param {Object[]} o.slots Block media slots (slots.mjs::blockMediaSlots).
 * @param {Object} o.attributes What the node already holds.
 * @param {Object} o.reads { 1440: [media], 768: [media], 375: [media] }: the media showing at each width.
 * @param {Function} o.resolve ( src ) => { hit } | { reason } | { stock... }: the uploaded attachment for a draft address.
 * @param {Object|null} o.fact Fact record { alt, ratio }.
 * @param {string|null} o.caption The figcaption's words.
 * @return {{writes:Object[], unmapped:Object[], notes:string[], checks:Object[]}} Fill's decisions.
 */
export function mediaWrites( { slots, attributes = {}, reads, resolve, fact = null, caption = null } ) {
	const out = { writes: [], unmapped: [], notes: [], checks: [] };
	const gap = ( value, reason ) => out.unmapped.push( { property: 'image', value, slot: '', reason } );
	const put = ( attr, value ) => {
		if ( unset( attributes[ attr ] ) ) {
			out.writes.push( { attr, value, merge: 'replace' } );
		} else if ( JSON.stringify( attributes[ attr ] ) !== JSON.stringify( value ) ) {
			out.notes.push( `${ attr } holds ${ JSON.stringify( attributes[ attr ] ) }; the draft media is ${ JSON.stringify( value ) }` );
		}
	};
	const groups = {};
	for ( const w of WIDTHS ) {
		for ( const m of reads?.[ w ] || [] ) {
			const g = placement( m.element );
			( groups[ g ] ||= { [ 1440 ]: [], [ 768 ]: [], [ 375 ]: [] } )[ w ].push( m );
		}
	}
	for ( const [ group, perWidth ] of Object.entries( groups ) ) {
		const label = perWidth[ 1440 ][ 0 ]?.src || WIDTHS.flatMap( ( w ) => perWidth[ w ] ).find( ( m ) => m.src )?.src || group;
		const crowded = WIDTHS.find( ( w ) => perWidth[ w ].length > 1 );
		const all = WIDTHS.flatMap( ( w ) => perWidth[ w ] );
		const { slot, reason } = pickSlot( slots, group, [ ...new Set( all.map( ( m ) => kindOfTag( m.tag ) ).filter( Boolean ) ) ] );
		if ( ! slot ) {
			// Media a descendant block draws is no gap of this one: only the node's own element names it.
			all.some( ( m ) => m.own ) && gap( label, reason );
			continue;
		}
		if ( crowded ) {
			gap( label, `${ perWidth[ crowded ].length } ${ group } elements show at ${ crowded }px and ${ slot.source } holds one` );
			continue;
		}
		const visible = Object.fromEntries( WIDTHS.map( ( w ) => [ w, perWidth[ w ][ 0 ] || null ] ) );
		const composed = slotFromReads( { reads: Object.fromEntries( WIDTHS.map( ( w ) => [ w, { visible: visible[ w ] } ] ) ), schema: null } );
		out.notes.push( ...composed.notes );
		const source = {};
		const tierWidth = Object.fromEntries( WIDTHS.map( ( w ) => [ TIER[ w ], w ] ) );
		for ( const [ tier, entry ] of Object.entries( composed.slot.source || {} ) ) {
			const v = visible[ tierWidth[ tier ] ];
			if ( 'none' === entry.kind || 'embed' === entry.kind ) {
				source[ tier ] = entry;
			} else if ( 'svg' === entry.kind ) {
				v?.markup ? ( source[ tier ] = { kind: 'svg', markup: v.markup } ) : gap( label, `the ${ tier } inline SVG has no readable markup` );
			} else {
				const r = resolve( entry.url );
				if ( ! r.hit ) {
					gap( entry.url, r.reason );
					continue;
				}
				source[ tier ] = { ...entry, id: r.hit.id, url: r.hit.url };
				! source[ tier ].width && r.hit.width > 0 && r.hit.height > 0 && ( source[ tier ].width = r.hit.width, source[ tier ].height = r.hit.height );
				if ( entry.poster ) {
					const p = resolve( entry.poster.url );
					p.hit ? ( source[ tier ].poster = { id: p.hit.id, url: p.hit.url } ) : gap( entry.poster.url, p.reason );
				}
				const seen = out.checks.find( ( c ) => c.attr === slot.source );
				seen || out.checks.push( { slot: '', attr: slot.source, tier, id: r.hit.id, url: r.hit.url, asset: r.hit.asset, ratio: fact?.ratio ?? null, alt: composed.slot.alt ?? fact?.alt ?? null } );
			}
		}
		if ( ! Object.keys( source ).length ) {
			continue;
		}
		put( slot.source, source );
		const alt = composed.slot.alt ?? fact?.alt ?? null;
		if ( composed.slot.decorative && slot.decorative ) {
			put( slot.decorative, true );
		} else if ( alt && slot.alt ) {
			put( slot.alt, alt );
		} else {
			out.notes.push( `the draft media "${ label }" has ${ composed.slot.decorative ? 'an empty alt' : 'no alt' }, so ${ slot.alt ?? slot.source } is left as it is` );
		}
		if ( caption && 'media' === group ) {
			slot.caption ? put( slot.caption, escapeText( caption ) ) : gap( caption, `the draft figure has a figcaption and ${ slot.source }'s slot has no caption setting` );
		}
	}
	return out;
}
