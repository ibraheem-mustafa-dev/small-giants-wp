// Applier family: states. A draft element's real-pointer hover look (lib/apply-hover.mjs) against the live block's: each
// property that differs is written through the setting the DB holds for it in the hover state (block_attributes.css_state).
// Scale, translate and rotate belong to the block's sgsMotion hover layer and are left to the motion family. A press (:active)
// look on a button lives in the theme snapshot (lib/snapshot-tokens.mjs::pressTokens): the item is a no-setting row carrying
// `snapshot: press look` and the token values in `tokens`, for the caller to merge.
import { MOTION_LOOKS } from './apply-hover.mjs';
import { recordsFor, stateLook } from './apply-records.mjs';
import { differs, stateItem } from './apply-state-resolve.mjs';
import { timingItems } from './apply-state-timing.mjs';
import { pressVariant } from './fill-state-tokens.mjs';
import { pressTokens } from './snapshot-tokens.mjs';

const RECORD_PROP = { 'border-top-color': /^border(-top)?-color$/, 'border-top-width': /^border(-top)?-width$/ };
const named = ( look, prop ) => look.property === prop || RECORD_PROP[ prop ]?.test( look.property );

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
				// An element with no border still reports a border colour: its text colour, which paints nothing.
				if ( 'border-top-color' === prop && ! ( parseFloat( dHover[ 'border-top-width' ] ) > 0 ) ) {
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
