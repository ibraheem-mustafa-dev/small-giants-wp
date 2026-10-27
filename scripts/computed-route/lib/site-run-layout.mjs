// The active-layout pointer a site run sets after it builds a header, footer or drawer surface (Spec 48 FR-48-55;
// the pointers are Spec 37's `sgs_active_<area>_cpt_id` options): the area's pointer goes to the post the run built,
// whichever post it named before, since the clone owns every site-wide setting it builds. It is written through
// `wp sgs <area> set-active` (the command the site build uses) and read back.
import { LAYOUT_TYPES } from './site-build-map.mjs';

const AREAS = Object.values( LAYOUT_TYPES );

// The layout area ('header', 'footer', 'drawer') of a surface whose built post is a page-map layout row, else null.
export function layoutAreaOf( entry, rows ) {
	const id = entry?.target?.postId;
	if ( ! Number.isInteger( id ) ) {
		return null;
	}
	return LAYOUT_TYPES[ rows.find( ( r ) => r.id === id )?.postType ] ?? null;
}

// Points `area` at post `id` through `wp` (lib/calibration-refs.mjs::wpCommand) and returns the line that says what
// changed; throws when the pointer does not read back as `id`.
export function pointLayout( { area, id, wp } ) {
	if ( ! AREAS.includes( area ) ) {
		throw new Error( `${ area } is not a layout area (${ AREAS.join( ', ' ) })` );
	}
	const read = () => Number( String( wp( [ 'eval', `echo (int) get_option( 'sgs_active_${ area }_cpt_id', 0 );` ] ) ).trim().split( /\r?\n/ ).pop() ) || 0;
	const before = read();
	if ( before === id ) {
		return `active ${ area }: ${ id } (already)`;
	}
	wp( [ 'sgs', area, 'set-active', String( id ) ] );
	const after = read();
	if ( after !== id ) {
		throw new Error( `active ${ area }: set to ${ id }, but it reads back ${ after }` );
	}
	return `active ${ area }: ${ before || 'none' } -> ${ id }`;
}

// After a surface's build: its area's pointer set to the built post when the surface is a layout row, else nothing
// (null, and no wp-cli call).
export function pointAfterBuild( { entry, rows, wp } ) {
	const area = layoutAreaOf( entry, rows );
	return area ? pointLayout( { area, id: entry.target.postId, wp } ) : null;
}
