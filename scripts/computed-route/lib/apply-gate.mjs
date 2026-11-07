// The applier's closing gate. A no-setting row is a claim that the block cannot do something, so it is checked against the block's
// own settings: a row whose attribute exists, or whose property a setting of that block paints, is `unresolved`: the applier gave
// up on something the framework can do. A row the block has no setting for stays `no-setting`; a row that names no property the
// DB can judge (a pointer that could not land, a motion part) is `unjudged` and listed. Unresolved rows fail the run: a clean
// run means every difference was written or really has no setting, not only that nothing is left to write.

// `hover border-top-color` and `tile hover color` name their property last.
const propOf = ( prop ) => String( prop ?? '' ).trim().split( /\s+/ ).pop();

// box longhands are stored under their shorthand: border-top-color is painted by a border-color setting.
const shorthandOf = ( prop ) => prop.replace( /^(border|padding|margin)-(top|right|bottom|left)-?/, ( m, a ) => `${ a }-` ).replace( /-$/, '' );

// Hover and focus timing on a block is a recorded framework gap: no block has a per-property setting for it.
const TIMING = /^transition-(duration|timing-function)$/;

export function judgeRow( row, settingsOf ) {
	const settings = settingsOf( row.block );
	if ( ! settings.length ) {
		return 'unjudged';
	}
	if ( settings.some( ( s ) => s.attr_name === row.prop ) ) {
		return 'unresolved';
	}
	const prop = propOf( row.prop );
	if ( TIMING.test( prop ) ) {
		return 'no-setting';
	}
	if ( ! /^[a-z]+(-[a-z]+)*$/.test( prop ) || ! /-|^(color|gap|overflow|top|opacity|transform|background|border|padding|margin)$/.test( prop ) ) {
		return 'unjudged';
	}
	const painted = settings.some( ( s ) => [ prop, shorthandOf( prop ) ].some( ( p ) => String( s.css_property ?? '' ).split( ',' ).map( ( c ) => c.trim() ).includes( p ) ) );
	return painted ? 'unresolved' : 'no-setting';
}

// rows: every row of a run. Returns the no-setting rows judged, with counts.
export function gateRows( rows, settingsOf ) {
	const judged = rows.filter( ( r ) => 'no-setting' === r.status ).map( ( r ) => ( { ...r, verdict: judgeRow( r, settingsOf ) } ) );
	const count = ( v ) => judged.filter( ( r ) => v === r.verdict ).length;
	return { judged, unresolved: count( 'unresolved' ), unjudged: count( 'unjudged' ), confirmed: count( 'no-setting' ) };
}
