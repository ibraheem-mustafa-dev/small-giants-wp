// A hover (or state) transform read from the draft's state looks, as the hover record the motion writer takes
// (lib/fill-motion.mjs::motionWrites). A block whose motion support is declared (`supports.motion`) holds a hover
// transform as its sgsMotion hover layer, never as a per-property setting, so one path writes it for every such block
// whether the draft's animation inventory names the element or only the state read finds it (a generated Site Info icon
// has no template identity of its own, so no inventory record reaches it).
import { READ_WIDTHS } from './fill-read.mjs';

export const MOTION_STATE_PROPS = [ 'transform' ];

// A comma list split outside parentheses ("cubic-bezier(.34, 1.56, .64, 1), ease" is two entries).
export function splitList( text ) {
	const out = [];
	let depth = 0;
	let cur = '';
	for ( const ch of String( text ?? '' ) ) {
		if ( '(' === ch ) {
			depth++;
		} else if ( ')' === ch ) {
			depth--;
		}
		if ( ',' === ch && 0 === depth ) {
			out.push( cur.trim() );
			cur = '';
		} else {
			cur += ch;
		}
	}
	cur.trim() && out.push( cur.trim() );
	return out;
}

const ms = ( t ) => ( /ms$/.test( t ) ? parseFloat( t ) : /s$/.test( t ) ? Math.round( parseFloat( t ) * 1000 ) : NaN );

// The entry of a transition list that times `prop`: the one at the property's place in transition-property, else the
// first (a list of one is every property's). The list wraps when shorter than the property list, as CSS does.
function timed( list, props, prop ) {
	const at = props.findIndex( ( p ) => p === prop || 'all' === p );
	const i = at < 0 ? 0 : at;
	return list.length ? list[ i % list.length ] : undefined;
}

// The hover records a target's state looks make: [ record ] with one transform property, or [].
// reads: readDraft's result; target: { id }.
export function stateMotionRecords( reads, target ) {
	const records = [];
	for ( const w of READ_WIDTHS ) {
		for ( const look of reads.states?.[ w ]?.looks?.[ target.id ] || [] ) {
			const states = [ ...look.states ].sort().join( '+' );
			const declared = look.declared?.transform;
			if ( 'hover' !== states || look.pseudo || ! declared || /var\(|calc\(/.test( declared ) || records.length ) {
				continue;
			}
			const rest = reads.declared?.[ w ]?.[ target.id ] || {};
			const rendered = reads.widths?.[ w ]?.[ target.id ]?.styles || {};
			const props = splitList( rest[ 'transition-property' ] ?? rendered[ 'transition-property' ] ?? '' );
			const dur = ms( timed( splitList( rest[ 'transition-duration' ] ?? rendered[ 'transition-duration' ] ), props, 'transform' ) );
			const del = ms( timed( splitList( rest[ 'transition-delay' ] ?? rendered[ 'transition-delay' ] ?? '0s' ), props, 'transform' ) );
			const ease = timed( splitList( rest[ 'transition-timing-function' ] ?? rendered[ 'transition-timing-function' ] ), props, 'transform' );
			records.push( {
				id: `STATE-${ target.id }`,
				name: `Hover transform read from the state look of ${ target.id }`,
				mechanism: 'css-transition',
				status: 'active',
				group: 'hover',
				trigger: { type: 'hover', detail: 'the draft\'s :hover look (state read)' },
				element: { template_tpl_id: null },
				properties: [ { property: 'transform', from: null, to: declared, duration_ms: Number.isNaN( dur ) ? 0 : dur, delay_ms: Number.isNaN( del ) ? 0 : del, easing: ease || 'ease' } ],
			} );
		}
	}
	return records;
}
