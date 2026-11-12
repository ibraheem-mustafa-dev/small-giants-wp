// Spec 49 §11: the media route's pure core. One slot from the draft's reads at 375, 768 and 1440, written in the slot
// schema's shape (`plugins/sgs-blocks/schemas/media-slot.schema.json`), tiers only where a device differs from what it would
// inherit. The live route's media writer is `lib/fill-media.mjs::mediaDecisions`, over `lib/media/slots.mjs` and
// `lib/media/write.mjs`, which calls this per media element:
//   `import { slotFromReads } from './media/index.mjs';` then `slotFromReads( { reads, wrapper, schema } )`.
//
// `reads`: { 375: { visible, element }, 768: ..., 1440: ... } where `visible` is kind-per-width.mjs's visible read and `element`
// is style-rows.mjs's element read for that width. `wrapper` (optional): absorb.mjs's wrapper read; a wrapper that does not
// absorb is reported. `schema`: the parsed media-slot schema (which keys are per device).
import { heightFill } from './fill-height.mjs';
import { absorbs, placement } from './absorb.mjs';
import { kindPerWidth, WIDTH_TIER } from './kind-per-width.mjs';
import { styleRows } from './style-rows.mjs';

const TIERS = [ [ 1440, 'desktop', null ], [ 768, 'tablet', 'desktop' ], [ 375, 'mobile', 'tablet' ] ];
const same = ( a, b ) => JSON.stringify( a ) === JSON.stringify( b );

/**
 * @param {Object} o { reads, wrapper, schema, shapes }.
 * @return {{target:string, slot:Object, reported:Object[], notes:string[]}} The slot document.
 */
export function slotFromReads( { reads, wrapper = null, schema, shapes = null } ) {
	const reported = [];
	const notes = [];
	const first = TIERS.map( ( [ w ] ) => reads?.[ w ]?.element ).find( Boolean );
	const target = first ? placement( first ) : 'media';
	const kinds = kindPerWidth( Object.fromEntries( TIERS.map( ( [ w ] ) => [ w, reads?.[ w ]?.visible || null ] ) ) );
	notes.push( ...kinds.notes );
	const slot = {};
	if ( Object.keys( kinds.source ).length ) {
		slot.source = kinds.source;
	}
	kinds.alt && ( slot.alt = kinds.alt );
	kinds.decorative && ( slot.decorative = true );
	if ( wrapper ) {
		const verdict = absorbs( wrapper );
		verdict.absorb || notes.push( `wrapper not merged: ${ verdict.reason }` );
	}
	const perTier = {};
	for ( const [ w, tier ] of TIERS ) {
		const element = reads?.[ w ]?.element;
		if ( ! element ) {
			continue;
		}
		const fill = heightFill( element );
		const rows = styleRows( element, fill, shapes );
		perTier[ tier ] = rows.writes;
		reported.push( ...rows.reported.map( ( r ) => ( { ...r, width: w } ) ) );
	}
	const keys = new Set( Object.values( perTier ).flatMap( ( t ) => Object.keys( t ) ) );
	for ( const key of keys ) {
		const def = schema?.$defs?.[ key.charAt( 0 ).toUpperCase() + key.slice( 1 ) ];
		if ( def?.[ 'x-sgs-responsive' ] ) {
			const out = {};
			let inherited;
			for ( const [ , tier, from ] of TIERS ) {
				const v = perTier[ tier ]?.[ key ];
				const prev = from ? ( out[ from ] ?? inherited ) : undefined;
				if ( v !== undefined && ! same( v, prev ) ) {
					out[ tier ] = v;
				}
				if ( out[ tier ] !== undefined ) {
					inherited = out[ tier ];
				}
			}
			Object.keys( out ).length && ( slot[ key ] = out );
		} else {
			const v = perTier.desktop?.[ key ] ?? perTier.tablet?.[ key ] ?? perTier.mobile?.[ key ];
			v !== undefined && ( slot[ key ] = v );
		}
	}
	return { target, slot, reported, notes };
}

export { heightFill, absorbs, placement, kindPerWidth, styleRows, WIDTH_TIER };
export { mediaParity } from './parity.mjs';
