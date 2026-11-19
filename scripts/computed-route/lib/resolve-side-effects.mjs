// The tie rule for settings that all paint one property on one element, by what else each one paints there
// (lib/resolve.mjs::resolve). Calibration records, for every setting, the other properties its marker changed and on which
// element (`effects`, each "<element path>|<property>"). A tied setting with an effect on the read element, where the draft
// shows that property at the element's calibrated default paint at every width both state, would move the property off the
// draft, so it cannot give the draft: a text gradient clips the background to the text, so a draft whose background-clip is
// the default border-box is painted by the background gradient beside it. Only that direction decides: a draft that does
// move such a property may have done it for another reason, so it convicts no setting. A length never decides: a length
// effect can be a layout consequence of the marker's own value (a wider box wraps to another height), which another value
// would not make. Never a block, setting or property name: the effects, the paint and the draft's reads decide.

// The tied rows a side effect does not rule out, or `rows` unchanged when none would remain (so one row stays one row).
// rows: the tied rows (attr_name); effectsOf: row -> calibration's effects list; slot: the read element's path;
// same( path, slot ): whether an effect's path is the read element; siblings: the element's draft reads,
// { property: { width: value } }; paintOf( property ): the element's calibrated default paint, { width: value };
// equal( property, a, b ): whether two values of the property are one value; isLength( value ): whether a value is a length.
export function sideEffectFree( rows, { effectsOf, slot, same, siblings = {}, paintOf, equal, isLength } ) {
	const atDefault = ( prop ) => {
		const draft = siblings[ prop ] || {};
		const paint = paintOf( prop );
		const widths = Object.keys( draft ).filter( ( w ) => undefined !== paint[ w ] );
		return widths.length > 0 && widths.every( ( w ) => ! isLength( draft[ w ] ) && ! isLength( paint[ w ] ) && equal( prop, draft[ w ], paint[ w ] ) );
	};
	const ownEffects = ( r ) => ( effectsOf( r ) || [] ).map( String ).filter( ( e ) => e.includes( '|' ) && same( e.slice( 0, e.lastIndexOf( '|' ) ), slot ) ).map( ( e ) => e.slice( e.lastIndexOf( '|' ) + 1 ) );
	const free = rows.filter( ( r ) => ! ownEffects( r ).some( atDefault ) );
	return free.length ? free : rows;
}

// The tied rows that can paint a background the draft draws behind its box. A setting that clips the background to the text (a
// text gradient: calibration lists the read element's `background-clip` among its effects) paints the gradient into the letters
// and clears the text colour, so it cannot give a gradient the draft paints behind the box and clips to the box. The draft's own
// background-clip decides: `text` (at any width) keeps every row; a clip the draft states as anything else drops the rows that
// clip to text; an unread clip keeps every row. A gradient sized and placed as an underline is such a background. Returns
// { rows, dropped }: `rows` are the rows that remain (empty when every row clips to text), `dropped` the rows removed.
// rows: the tied rows (attr_name); effectsOf, slot, same, siblings: as sideEffectFree.
export function backgroundBehindBox( rows, { effectsOf, slot, same, siblings = {} } ) {
	const clips = Object.values( siblings[ 'background-clip' ] || {} ).map( ( v ) => String( v ).trim() ).filter( Boolean );
	if ( ! clips.length || clips.includes( 'text' ) ) {
		return { rows, dropped: [] };
	}
	const toText = ( r ) => ( effectsOf( r ) || [] ).map( String ).some( ( e ) => e.includes( '|' ) && 'background-clip' === e.slice( e.lastIndexOf( '|' ) + 1 ) && same( e.slice( 0, e.lastIndexOf( '|' ) ), slot ) );
	return { rows: rows.filter( ( r ) => ! toText( r ) ), dropped: rows.filter( toText ) };
}
