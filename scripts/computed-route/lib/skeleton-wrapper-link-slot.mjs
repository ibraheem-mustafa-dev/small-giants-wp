// The element a rule unwraps around a block that draws that element itself: a link round a logo is the logo block's own link
// part, so the link's declared width, centring and ceiling are read there (data/skeleton-decisions.json `rules.<rule>.linkSlots`).
// The draft sizes the logo by its link (`<a style="width:240px; max-width:100%">` round an image of `width:100%`); with the link
// dissolved and no slot, Fill read the image's `100%` (which no setting holds) and the logo filled its column.
// The slot path is one of the setting's own calibrated slots, never a path the calibration did not measure.

// rule: the unwrapping rule's decisions ({ linkSlots: [ { block, setting, slot } ] }); e: the unwrapped element; built: the nodes
// the unwrapped element's children became; calSettings( block ): the block's calibrated settings; finder( e ): the walker finder.
// Gives the one node of a listed block its `draftSlots` entry (and the row's) and returns { notes }.
export function wrapperLinkSlot( { rule, e, built, calSettings, finder } ) {
	const out = { notes: [] };
	for ( const entry of rule?.linkSlots || [] ) {
		const nodes = ( built || [] ).filter( ( n ) => n?.name === entry.block );
		if ( ! nodes.length ) {
			continue;
		}
		const calibrated = calSettings( entry.block )?.[ entry.setting ];
		if ( 1 !== nodes.length ) {
			out.notes.push( `the link holds ${ nodes.length } ${ entry.block } blocks, so its look is read for none of them` );
		} else if ( ! [ calibrated?.slot, ...( calibrated?.slots || [] ) ].includes( entry.slot ) ) {
			out.notes.push( `the calibration has no ${ entry.slot } slot for ${ entry.setting }, so the unwrapped link's look is not read` );
		} else {
			nodes[ 0 ].draftSlots = { ...nodes[ 0 ].draftSlots, [ entry.slot ]: finder( e ) };
		}
	}
	return out;
}
