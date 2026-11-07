// Chrome rule: a mega panel's link rows hover twice in the drawer. The row container's own hover (sgsMotion, an indent that moves
// the whole row, number included) is the desktop dropdown's; the drawer has its own text shift (the panel's drawerLinkTextShiftHover)
// that moves the label and description and leaves the number put. When the panel sets that shift, each row's own hover indent is
// switched off for the tablet tier (1023px and below, where the burger drawer is the menu) and keeps its desktop value.
const hoverState = ( attrs ) => attrs?.sgsMotion?.elements?.root?.hover?.state ?? null;

export function rowIndentOff( { all, shift, record } ) {
	const out = [];
	for ( const [ ref, block ] of Object.entries( all?.blocks ?? {} ) ) {
		const state = hoverState( block.attrs );
		if ( 'sgs/container' !== block.block || ! ( Number( state?.values?.indent ) > 0 ) ) {
			continue;
		}
		if ( 0 === state.devices?.tablet?.indent ) {
			out.push( { status: 'equal', prop: 'row hover indent (drawer)', ref, why: `${ ref } row indent is off for the tablet tier: already saved` } );
			continue;
		}
		out.push( {
			status: 'op',
			prop: 'row hover indent (drawer)',
			ref,
			block: block.block,
			state: 'hover',
			why: `${ ref } row indent moves the number with the text; the drawer's own ${ shift }px text shift (${ record }) replaces it, so the tablet tier takes no row indent`,
			writes: [ { attr: 'sgsMotion', value: { v: 1, elements: { root: { hover: { state: { devices: { tablet: { indent: 0 } } } } } } }, merge: 'deep' } ],
			checks: [],
			record,
		} );
	}
	return out;
}
