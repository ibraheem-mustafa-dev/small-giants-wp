// Entrance start (Spec 38, sgsAnimationStart): a block with an entrance that the draft shows at rest while live still
// holds it hidden is one whose draft plays its entrance on page load, where live waits for the block to scroll into
// view (About, 2026-10-04: the credential column at 375 sat below the fold, opacity 1 on the draft and 0 live).

// The rest values a played entrance leaves, per property.
const SHOWN = {
	opacity: ( v ) => 1 === Number( v ),
	translate: ( v ) => 'none' === v || /^0px( 0px)?$/.test( String( v ) ),
	transform: ( v ) => 'none' === v,
};
// The live values a waiting entrance holds.
const HIDDEN = {
	opacity: ( v ) => 0 === Number( v ),
	translate: ( v ) => ! SHOWN.translate( v ),
	transform: ( v ) => ! SHOWN.transform( v ),
};

// g: a writable group (lib/solve-rows.mjs::writableGroups); node: its tree node; perWidth: the draft values. Returns
// the resolver's shape ({ writes }) when the group is an entrance waiting to be scrolled to, else null.
export function entranceStart( g, node, perWidth ) {
	const a = node.attributes || {};
	if ( g.state || '' !== g.path || ! SHOWN[ g.prop ] || ! a.sgsAnimation || 'load' === a.sgsAnimationStart ) {
		return null;
	}
	const draft = Object.values( perWidth || {} ).filter( ( v ) => undefined !== v );
	const live = ( g.rows || [] ).map( ( r ) => r.live );
	if ( ! draft.length || ! live.length || ! draft.every( SHOWN[ g.prop ] ) || ! live.every( HIDDEN[ g.prop ] ) ) {
		return null;
	}
	return { writes: [ { attr: 'sgsAnimationStart', value: 'load', merge: 'replace' } ] };
}
