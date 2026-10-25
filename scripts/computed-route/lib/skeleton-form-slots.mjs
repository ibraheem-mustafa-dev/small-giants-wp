// The input part of a form field in the skeleton (Spec 48 FR-48-6). The form block's settings paint every field's input part
// (framework DB: `sgs/form` settings with the css_element `rules.formControl.inputPart`), and a field block's calibration names
// that part by its own path. A field node's draft control is therefore the node's `draftSlots` entry at that path, so Fill reads
// the control's look on the element that paints it. The path is the longest tail of the form block's calibrated home slot for the
// part that is also an element of the field block's own calibration, so a field whose calibration does not hold the part (the
// file zone, the consent tick) gets no slot.
import { partHome } from './fill-part-pairing.mjs';
import { LOOSE } from './resolve.mjs';

// db: the framework DB; rules: skeleton-decisions `rules.formControl`; block: the field block; calSettings( slug ) and
// calKeys( slug ): the calibration's settings and element keys. Returns the slot path, or null.
export function fieldInputSlot( { db, rules, block, calSettings, calKeys } ) {
	if ( ! db || ! rules?.inputPart || ! rules?.inputPartHost ) {
		return null;
	}
	const home = partHome( db, rules.inputPartHost, { settings: calSettings( rules.inputPartHost ) }, rules.inputPart, null );
	if ( ! home ) {
		return null;
	}
	const steps = home.split( ' > ' );
	const own = new Map( calKeys( block ).map( ( k ) => [ LOOSE( k ), k ] ) );
	for ( let i = 0; i < steps.length; i++ ) {
		const hit = own.get( steps.slice( i ).join( ' > ' ) );
		if ( hit ) {
			return hit;
		}
	}
	return null;
}
