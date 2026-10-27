// The draft elements a choice flow's nodes read (Spec 48 FR-48-6, rules.choiceFlow.slots; Spec 43). Fill reads each node's
// look from its draft element (`draftRef`) and the elements of the block's own parts (`draftSlots`, at the part's
// calibrated slot), so every node the flow makes from a rendered draft element carries that element, as the regular writer's
// nodes do (lib/skeleton-propose.mjs::base):
//   flow root   its container; its own pieces are its draftSlots: the header's logo and eyebrow, the Back button, the box
//               holding Continue and Add to bag, the summary's stage note and its copy where the summary collapses, and the
//               first question's help toggle.
//   step        the element the draft draws for the step itself: a panel's element, a result part's root. A question's step
//               has none of its own (the draft draws the step and its question as one element, which the question takes).
//   question    its container; its heading, intro, first option's description and badge are its draftSlots.
//   field       its control, which is also the field's input part (lib/skeleton-form-slots.mjs::fieldInputSlot).
// A piece's slot is the calibrated slot of the setting `rules.choiceFlow.slots` names for it (the drawsChildren childSlots
// precedent, lib/skeleton-child-slots.mjs): a piece whose setting the calibration does not hold gets no slot and a note.
// Only an element the inventory rendered is given: a step the opened page never showed (a later question behind its own
// condition) has no element to read, and its nodes stay without one.
const BOUND = /\{\{/;
const flat = ( s ) => String( s ?? '' ).replace( /\s+/g, '' );

// The record keys of the flow's own pieces. x: the model's reading context (lib/skeleton-choice-flow.mjs); o: { pieces (the
// controls by role: close, skip, add, next, back), head (the bar holding Close), aside, note (the stage note's element),
// copies (the model's copies: the note's words shown again) }. Returns { logo, eyebrow, back, actions, note, noteCopy }.
export function flowPieces( x, { pieces = {}, head = null, aside = null, note = null, copies = [] } ) {
	const { t, rec, real, literal, rootKey } = x;
	const within = ( k ) => ( k ? new Set( [ k, ...t.desc( k ) ] ) : new Set() );
	const close = within( pieces.close );
	const inHead = head ? [ head, ...t.desc( head ) ].filter( ( k ) => real( k ) && ! close.has( k ) ) : [];
	const logo = inHead.find( ( k ) => 'img' === rec( k ).realTag ) ?? null;
	const eyebrow = inHead.find( ( k ) => 'img' !== rec( k ).realTag && ( literal( k ) || BOUND.test( rec( k ).words || '' ) ) ) ?? null;
	// The box holding both Continue and Add to bag: their nearest common real ancestor below the root.
	const up = ( k ) => {
		const out = [];
		for ( let p = t.parent( k ); p && p !== rootKey; p = t.parent( p ) ) {
			real( p ) && out.push( p );
		}
		return out;
	};
	const actions = pieces.next && pieces.add ? up( pieces.next ).find( ( p ) => up( pieces.add ).includes( p ) ) ?? null : null;
	// The note's words shown again outside the summary: the highest element whose words are the copy's.
	const words = ( k ) => flat( [ k, ...t.desc( k ) ].map( literal ).join( '' ) );
	const inAside = within( aside );
	const copy = note ? copies.find( ( c ) => c.words ) : null;
	const matches = copy ? t.desc( rootKey ).filter( ( k ) => real( k ) && ! inAside.has( k ) && k !== note && words( k ) === copy.words ) : [];
	const noteCopy = matches.find( ( k ) => ! matches.some( ( o ) => o !== k && t.desc( o ).includes( k ) ) ) ?? null;
	return { logo, eyebrow, back: pieces.back ?? null, actions, note, noteCopy };
}

// The draftSlots of one node from its pieces. roles: { <role>: record key | null }; map: { <role>: <setting> } (rules.choiceFlow.slots
// for the node's block); settings: the block's calibration settings; at( key ): the rendered inventory element of a record key,
// or undefined; finder( e ): the element's finder. Returns { slots: { <calibrated slot>: finder }, notes: [text] }.
export function pieceSlots( { roles, map = {}, settings = {}, at, finder, block } ) {
	const out = { slots: {}, notes: [] };
	for ( const [ role, setting ] of Object.entries( map ) ) {
		const e = roles[ role ] ? at( roles[ role ] ) : undefined;
		if ( ! e ) {
			continue;
		}
		const slot = settings[ setting ]?.slot;
		if ( 'string' !== typeof slot || ! slot ) {
			out.notes.push( `the calibration of ${ block } has no slot for ${ setting }, so the draft's ${ role } (${ e.key }) is not read` );
			continue;
		}
		out.slots[ slot ] ??= finder( e );
	}
	return out;
}
