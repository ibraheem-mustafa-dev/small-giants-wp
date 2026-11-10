/**
 * The entrance start floor (Spec 38A section 9): the JS twin of `Sgs_Motion_Emitter::clamp_hidden_starts`.
 *
 * Above the fold, the start values that would hide a load or scroll entrance completely become the nearest visible
 * ones: opacity 0 starts at 0.01, a full clip (100) at 99 and a scale of 0 at 0.01. It applies to the from end and to
 * the keyframe with the lowest offset at every device tier; every other value passes through.
 */

const FLOOR = {
	opacity: [ 0, 0.01 ],
	clip: [ 100, 99 ],
	scale: [ 0, 0.01 ],
};

const isNumeric = ( value ) =>
	value !== null &&
	value !== undefined &&
	typeof value !== 'boolean' &&
	value !== '' &&
	! Number.isNaN( Number( value ) );

const isRow = ( value ) =>
	value !== null && typeof value === 'object' && ! Array.isArray( value );

const floorRow = ( row ) => {
	const out = { ...row };
	Object.entries( FLOOR ).forEach( ( [ key, [ hidden, visible ] ] ) => {
		if ( isNumeric( out[ key ] ) && Number( out[ key ] ) === hidden ) {
			out[ key ] = visible;
		}
	} );
	return out;
};

/**
 * Raise the hidden start values of every tier.
 *
 * @param {Object} tiers Per-tier values (`tierValues()` output).
 * @return {Object} New per-tier values.
 */
export function clampHiddenStarts( tiers ) {
	const out = {};
	Object.entries( tiers ).forEach( ( [ tier, values ] ) => {
		const next = { ...values };
		if ( isRow( values.from ) ) {
			next.from = floorRow( values.from );
		}
		if ( values.keyframes && typeof values.keyframes === 'object' ) {
			const frames = Object.values( values.keyframes );
			let start = 0;
			frames.forEach( ( frame, index ) => {
				const offset = isRow( frame ) ? frame.offset : null;
				const least = isRow( frames[ start ] ) ? frames[ start ].offset : null;
				if ( isNumeric( offset ) && isNumeric( least ) && offset < least ) {
					start = index;
				}
			} );
			if ( isRow( frames[ start ] ) ) {
				frames[ start ] = floorRow( frames[ start ] );
			}
			next.keyframes = frames;
		}
		out[ tier ] = next;
	} );
	return out;
}
