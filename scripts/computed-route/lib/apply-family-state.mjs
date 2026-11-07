// Applier family: states. A draft element's real-pointer hover look (lib/apply-hover.mjs) against the live block's: each
// property that differs is written through the setting the DB holds for it in the hover state (block_attributes.css_state).
// Scale, translate and rotate belong to the block's sgsMotion hover layer and are left to the motion family. A press (:active)
// look on a button lives in the theme snapshot (lib/snapshot-tokens.mjs::pressTokens): the item is a no-setting row carrying
// `snapshot: press look` and the token values in `tokens`, for the caller to merge.
import { MOTION_LOOKS } from './apply-hover.mjs';
import { recordsFor, stateLook } from './apply-records.mjs';
import { cardCarriesColour } from './apply-card-group.mjs';
import { differs, stateItem } from './apply-state-resolve.mjs';
import { timingItems } from './apply-state-timing.mjs';
import { pressVariant } from './fill-state-tokens.mjs';
import { pressTokens } from './snapshot-tokens.mjs';

const RECORD_PROP = { 'border-top-color': /^border(-top)?-color$/, 'border-top-width': /^border(-top)?-width$/ };
const named = ( look, prop ) => look.property === prop || RECORD_PROP[ prop ]?.test( look.property );

// True when the element's hover value for prop equals its own resting value. An unread resting value is never taken as equal.
const restsAs = ( read, hover, prop ) => undefined !== read?.styles?.[ prop ] && ! differs( hover[ prop ], read.styles[ prop ] );

export const state = {
	name: 'state',
	props: [],
	decide( ctx ) {
		const { target, draft, live, recordsIndex, block, saved } = ctx;
		const items = [];
		const records = recordsFor( recordsIndex, target.tpl );
		const dHover = draft[ 1440 ]?.hover;
		const lHover = live[ 1440 ]?.hover;
		if ( dHover && lHover && ! dHover.unreached && ! lHover.unreached ) {
			for ( const prop of Object.keys( dHover ).filter( ( p ) => ! MOTION_LOOKS.includes( p ) && 'icon' !== p ) ) {
				if ( ! differs( dHover[ prop ], lHover[ prop ] ) ) {
					continue;
				}
				// A card's hover colour reaches no child that keeps its own colour: the children's group hover (lib/apply-card-group.mjs) holds it.
				if ( 'color' === prop && cardCarriesColour( draft[ 1440 ] ) ) {
					continue;
				}
				// An element with no border still reports a border colour: its text colour, which paints nothing.
				if ( 'border-top-color' === prop && ! ( parseFloat( dHover[ 'border-top-width' ] ) > 0 ) ) {
					continue;
				}
				// A property the hover changes on neither side is a resting difference, reported as one so the gate judges it against the
				// block's resting settings and no family's silence hides it.
				if ( restsAs( draft[ 1440 ], dHover, prop ) && restsAs( live[ 1440 ], lHover, prop ) ) {
					items.push( { status: 'no-setting', prop, why: `resting difference the hover holds on both sides: draft ${ draft[ 1440 ].styles[ prop ] }, live ${ live[ 1440 ].styles[ prop ] }; no applier family writes a resting ${ prop }` } );
					continue;
				}
				// A gradient ground stays through the hover: the flat colour of a hover setting would paint over it.
				if ( 'background-color' === prop && saved.backgroundColourGradient && saved.backgroundColourGradient !== 'none' ) {
					items.push( saved.backgroundColourHoverGradient
						? { status: 'equal', prop, state: 'hover', why: 'the gradient ground holds through the hover' }
						: { status: 'op', prop, state: 'hover', why: 'the draft keeps its gradient ground on hover', writes: [ { attr: 'backgroundColourHoverGradient', value: saved.backgroundColourGradient } ], checks: [] } );
					continue;
				}
				const record = records.find( ( r ) => stateLook( r )?.looks.some( ( l ) => named( l, prop ) ) )?.id ?? null;
				items.push( stateItem( { ctx, prop, value: dHover[ prop ], state: 'hover', slot: '', record } ) );
			}
		} else if ( dHover?.unreached || lHover?.unreached ) {
			items.push( { status: 'no-setting', prop: 'hover', state: 'hover', why: `no pointer can reach the ${ dHover?.unreached ? 'draft' : 'live' } element` } );
		}
		const press = records.map( stateLook ).filter( ( l ) => 'active' === l?.state );
		const variant = pressVariant( block, { attributes: saved } );
		if ( press.length && null !== variant ) {
			const declared = Object.fromEntries( press.flatMap( ( l ) => l.looks.map( ( x ) => [ x.property, x.to ] ) ) );
			const { tokens, gaps } = pressTokens( { declared }, variant );
			items.push( { status: 'no-setting', prop: 'active', state: 'active', snapshot: 'press look', tokens, why: `snapshot: press look (${ variant })${ gaps.length ? `; ${ gaps.join( '; ' ) }` : '' }` } );
		}
		items.push( ...timingItems( ctx ) );
		return items;
	},
};
