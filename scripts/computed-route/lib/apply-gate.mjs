// The applier's closing gate. A no-setting row is a claim that the block cannot do something, so it is checked against the block's
// own settings: a row whose attribute exists, or whose property a setting of that block paints, is `unresolved`: the applier gave
// up on something the framework can do. A row the block has no setting for stays `no-setting`; a row that names no property the
// DB can judge (a pointer that could not land, a motion part) is `unjudged` and listed. Unresolved rows are listed in the run
// report and never fail a run (a look the clone cannot place is listed loudly, never a stop): the list is where each one is read.

// `hover border-top-color` and `tile hover color` name their property last.
const propOf = ( prop ) => String( prop ?? '' ).trim().split( /\s+/ ).pop();

// box longhands are stored under their shorthand: border-top-color is painted by a border-color setting.
const shorthandOf = ( prop ) => prop.replace( /^(border|padding|margin)-(top|right|bottom|left)-?/, ( m, a ) => `${ a }-` ).replace( /-$/, '' );

// A box offset: the edge a positioned element sits from its container's.
const OFFSET = /^(top|right|bottom|left)$/;

// Hover and focus timing on a block is a recorded framework gap: no block has a per-property setting for it.
const TIMING = /^transition-(duration|timing-function)$/;

// The state a row is about: its own field, else a state word before the property (`tile hover border-top-color`). Empty is the
// resting look.
const STATES = /^(hover|focus|active|open|checked|current)$/;
const stateOf = ( row ) => row.state ?? String( row.prop ?? '' ).trim().split( /\s+/ ).slice( 0, -1 ).find( ( w ) => STATES.test( w ) ) ?? '';

// The part a row names before its property (`consent-text color` -> `consent`, `tile hover box-shadow` -> `tile`), or ''.
const partOf = ( row ) => String( row.prop ?? '' ).trim().split( /\s+/ ).slice( 0, -1 ).find( ( w ) => ! STATES.test( w ) && /^[a-z]+(-[a-z]+)*$/.test( w ) )?.split( '-' )[ 0 ] ?? '';

// A setting holds a state when the DB records it (block_attributes.css_state), or, unrecorded, when its name ends in the state.
const holds = ( s, state ) => ( s.css_state ?? /(Hover|Focus|Active|Open|Checked|Current)$/.exec( s.attr_name )?.[ 1 ].toLowerCase() ?? '' ) === state;

export function judgeRow( row, settingsOf ) {
	const all = settingsOf( row.block );
	if ( ! all.length ) {
		return 'unjudged';
	}
	// A row naming a setting by its attribute is about that setting, whatever its state.
	if ( all.some( ( s ) => s.attr_name === row.prop && /[A-Z]/.test( s.attr_name ) ) ) {
		return 'unresolved';
	}
	// A resting setting cannot hold a hover value, nor a hover setting a resting one; a row about a part (`consent-text color`)
	// counts only the settings whose element or name names that part.
	const part = partOf( row );
	const settings = all.filter( ( s ) => holds( s, stateOf( row ) ) && ( ! part || `${ s.css_element ?? '' } ${ s.attr_name }`.toLowerCase().includes( part ) ) );
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
	// A row about the block's own offset (`top`, no part named) is painted by a setting of the block's own element: a setting on a
	// part (the arrow's `arrowInsetTop`, a badge's corner offset) places that part, never the block.
	const counted = ! part && OFFSET.test( prop ) ? settings.filter( ( s ) => ! s.css_element || 'wrapper' === s.css_element ) : settings;
	const painted = counted.some( ( s ) => [ prop, shorthandOf( prop ) ].some( ( p ) => String( s.css_property ?? '' ).split( ',' ).map( ( c ) => c.trim() ).includes( p ) ) );
	return painted ? 'unresolved' : 'no-setting';
}

// The block's settings as the gate reads them: the attribute, the property it paints, the element it paints and its state. The
// element is what lets a row about a part, or about the block's own offset, count only the settings of that element.
export const gateSettingsOf = ( db ) => ( block ) => ( block ? db.prepare( 'SELECT attr_name, css_property, css_element, css_state FROM block_attributes WHERE block_slug = ?' ).all( block ) : [] );

// rows: every row of a run. Returns the no-setting rows judged, with counts.
export function gateRows( rows, settingsOf ) {
	const judged = rows.filter( ( r ) => 'no-setting' === r.status ).map( ( r ) => ( { ...r, verdict: judgeRow( r, settingsOf ) } ) );
	const count = ( v ) => judged.filter( ( r ) => v === r.verdict ).length;
	return { judged, unresolved: count( 'unresolved' ), unjudged: count( 'unjudged' ), confirmed: count( 'no-setting' ) };
}
