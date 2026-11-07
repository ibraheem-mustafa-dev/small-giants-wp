// One state look through the framework's resolver (lib/fill-prop.mjs::resolveProperty): the setting the DB holds for `prop`
// in `state`, written with the draft's value. Shared by the state and form families. Returns an applier item.
import { resolveProperty } from './fill-prop.mjs';
import { matches } from './apply-ops.mjs';

// A draft colour written as the nearest palette slot paints another colour. A colour with no exact palette entry stays literal.
export function exactColours( writes, value, rawSnapshot ) {
	const rgb = /^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/.exec( String( value ) );
	if ( ! rgb ) {
		return writes;
	}
	const hex = `#${ rgb.slice( 1 ).map( ( n ) => Number( n ).toString( 16 ).padStart( 2, '0' ) ).join( '' ) }`.toUpperCase();
	const palette = rawSnapshot?.settings?.color?.palette ?? [];
	return writes.map( ( w ) => {
		const slot = palette.find( ( p ) => p.slug === w.value );
		return slot && String( slot.color ).toUpperCase() !== hex ? { ...w, value: hex } : w;
	} );
}

export function stateItem( { ctx, prop, value, rest, state, slot, width = 1440, record = null, label, probe = null, extra = null, fontPx = null } ) {
	const { block, saved, calFor, db, snapshot } = ctx;
	const node = { attributes: structuredClone( saved ) };
	const res = resolveProperty( { node, block, prop, draft: { [ width ]: value }, baseline: () => undefined, slots: [ slot ], calibration: calFor( block ), db, snapshot, log: [], state, siblings: {}, rest, ...( fontPx ? { fontPx: { [ width ]: fontPx } } : {} ) } );
	const base = { prop: label ?? prop, state: state ?? undefined, ...( record ? { record } : {} ) };
	if ( 'equal' === res.status ) {
		return { ...base, status: 'equal', why: `${ label ?? prop } already paints ${ value }` };
	}
	if ( 'written' !== res.status ) {
		return { ...base, status: 'no-setting', why: `${ res.gap }${ res.detail ? `: ${ res.detail }` : '' }` };
	}
	return { ...base, status: 'op', why: `${ label ?? prop } ${ state ?? 'rest' } ${ value }`, writes: exactColours( res.writes, value, ctx.rawSnapshot ), checks: [ { width, prop, want: value, ...( state && ! probe ? { state } : {} ), ...( probe ? { probe } : {} ), ...( extra || {} ) } ] };
}

// A draft value against what is live: same after the applier's normalisation.
export const differs = ( draft, live ) => undefined !== draft && ! matches( live, draft );
