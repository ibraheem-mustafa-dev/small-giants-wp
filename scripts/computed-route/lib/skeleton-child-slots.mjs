// What a block that draws the draft's children itself still needs from them (Spec 48 FR-48-6): the draft elements its
// recorded child slots are read on, and the width its navigation collapses at. Both are read from the draft's code
// (the handoff record's states and the inventory's sc-if membership), never from a name.
const wordsOf = ( s ) => String( s ?? '' ).toLowerCase().split( /[^a-z0-9]+/ ).filter( Boolean );
const scIfIds = ( e ) => ( e.membership || [] ).filter( ( x ) => 'sc-if' === x.kind ).map( ( x ) => String( x.tpl ) );

// The element and every element below it.
const withinTree = ( m, e ) => [ e, ...m.kids( e ).flatMap( ( k ) => withinTree( m, k ) ) ];

// draftSlots for a drawing block's repeated child. `cfg` is the block's `rules.drawsChildren` entry `childSlots`
// ({ resting: <setting>, current: <setting> }: the calibration settings measured on a resting and on the current child).
// The slot path is the setting's own `slot` in the block's calibration; the resting child is the first child no current-state
// `sc-if` renders in, the current child the one a current-state `sc-if` renders in (the handoff state whose name says the
// calibrated state). Returns { slots: { <path>: finder }, notes: [text] }.
export function childSlots( { cfg, items, m, finder, settings = {}, states = [] } ) {
	const out = { slots: {}, notes: [] };
	if ( ! cfg ) {
		return out;
	}
	const slotOf = ( name ) => settings[ name ]?.slot || null;
	const rest = slotOf( cfg.resting );
	const cur = slotOf( cfg.current );
	! rest && out.notes.push( `the calibration has no slot for ${ cfg.resting }, so no resting child slot` );
	! cur && out.notes.push( `the calibration has no slot for ${ cfg.current }, so no current child slot` );
	const stateWord = settings[ cfg.current ]?.state;
	const state = stateWord ? states.find( ( s ) => wordsOf( s.name ).includes( stateWord ) ) : null;
	const marks = new Set( ( state?.sc_if_tpl_ids || [] ).map( String ) );
	const isCurrent = ( it ) => marks.size > 0 && withinTree( m, it ).some( ( x ) => scIfIds( x ).some( ( id ) => marks.has( id ) ) );
	const resting = items.find( ( it ) => ! isCurrent( it ) );
	const current = items.find( isCurrent );
	rest && ( resting ? out.slots[ rest ] = finder( resting ) : out.notes.push( 'every draft child is marked current, so no resting child' ) );
	cur && ( current ? out.slots[ cur ] = finder( current ) : out.notes.push( `no draft child is rendered by a "${ stateWord }" sc-if, so no current child slot` ) );
	// The glyph a child draws beside its label (a navigation item's caret): the calibration setting measured on it (`glyph`,
	// the setting that sizes it) is read from the draft's own glyph element, the first child that holds one.
	const glyphPath = cfg.glyph ? slotOf( cfg.glyph ) : null;
	if ( cfg.glyph && ! glyphPath ) {
		out.notes.push( `the calibration has no slot for ${ cfg.glyph }, so no glyph slot` );
	} else if ( glyphPath ) {
		const found = items.map( ( it ) => withinTree( m, it ).slice( 1 ).find( isGlyph ) ).find( Boolean );
		found ? out.slots[ glyphPath ] = finder( found ) : out.notes.push( 'no draft child holds a glyph element, so no glyph slot' );
	}
	return out;
}

// The first step of a calibrated path (the fixture child it sits under), and the path's other steps.
const stepsOf = ( p ) => String( p ?? '' ).split( /\s*>\s*/ ).filter( Boolean );

// A unit's part as a draft element: the row is the unit, the header its control, the icon the ring its control draws (a
// wordless square inside it), the answer its one rendered panel, the title and category the control's title and category
// texts (lib/skeleton-widgets.mjs::wordParts). Null when the unit has no such element.
const PARTS = {
	row: ( u ) => u.el,
	header: ( u ) => u.control,
	icon: ( u, m ) => withinTree( m, u.control ).slice( 1 ).find( isRing ) ?? null,
	answer: ( u ) => ( 1 === ( u.rendered || [] ).length ? u.rendered[ 0 ] : null ),
	title: ( u ) => u.title ?? null,
	category: ( u ) => u.category ?? null,
};
// The parts a widget rule's `childSlots` may name (checked by lib/skeleton-facts.mjs::decisionsProblems).
export const UNIT_PARTS = Object.keys( PARTS );

// draftSlots for a block whose children are the draft's repeated units and which keeps their parts' look as its own
// settings (an accordion's header padding, icon ring and answer padding: Spec 48 FR-48-6). `cfg` is the widget rule's
// `childSlots`: { resting: <setting>, current: <setting>, parts: [ { part, child, setting } ] }. The fixture's resting
// child is the first step of the `resting` setting's calibrated slot (a setting calibration measured on a closed child
// only), its current child that of `current` (measured on the open child only). A part's path is the entry of its
// setting's calibrated slots under that child; its draft element is that part of the first unit the draft shows closed
// (`resting`) or of the unit it shows open (`current`). Resting parts are listed first: a setting calibrated on both
// children is then written from the closed unit's read, and an open unit's other value is a conflict row
// (lib/fill-resolve-element.mjs::ownerKeeps keeps the first), never a mix of the two. The current child renders a state at
// rest (`currentState`, the fixture's item saved open): each current path is that state's (`states`), so a setting of that
// state calibrated there takes the open unit's read ahead of the resting setting (lib/fill-resolve-element.mjs::fillElement).
// A draft that shows no unit open at load opens one in a state the inventory read (`revealed`, lib/skeleton-inventory.mjs:
// each record an element only that state shows, with the `reveal` { component, keys } that shows it): the open unit is then
// the first unit holding exactly one revealed panel (shownOpen), and each current path is read in that state (`reveals`: the
// path's { component, keys }, which Fill sets before reading it: lib/fill-read.mjs::readRevealed).
// Which child is which is a fact of the block's render where the look records its elements' attributes (`attrs`, the
// look's pathAttrs: the item the fixture saves open carries `open`): the current child is the first child the settings
// reach whose element is in `currentState` (inState), the resting child the first that is not. A setting placed on every
// child says nothing about which is open, so the settings' own slots decide only when the look records no attributes (no
// `pathAttrs`, or an empty one: a look built before it recorded them, or with SITE_LOOK_MUTATE=path-attrs).
// units: [{ el, control, rendered, title, category, key }]; open: the indices of the units shown open. Returns { slots,
// states, reveals, notes }.
export function unitSlots( { cfg, units = [], open = [], m, finder, settings = {}, revealed = [], attrs = null } ) {
	const out = { slots: {}, states: {}, reveals: {}, notes: [] };
	if ( ! cfg ) {
		return out;
	}
	const stepOf = ( name ) => stepsOf( settings[ name ]?.slot )[ 0 ] ?? null;
	const child = attrs && Object.keys( attrs ).length && cfg.currentState ? childrenByState( cfg, settings, attrs ) : { resting: stepOf( cfg.resting ), current: stepOf( cfg.current ) };
	const shown = units.find( ( u, i ) => open.includes( i ) ) ?? null;
	const opened = shown ? null : units.map( ( u ) => shownOpen( u, revealed, m ) ).find( Boolean ) ?? null;
	const unit = { resting: units.find( ( u, i ) => ! open.includes( i ) ) ?? null, current: shown ?? opened?.unit ?? null };
	const said = new Set();
	const say = ( text ) => said.has( text ) || ( said.add( text ), out.notes.push( text ) );
	for ( const which of [ 'resting', 'current' ] ) {
		for ( const p of ( cfg.parts || [] ).filter( ( x ) => x.child === which ) ) {
			if ( ! child[ which ] ) {
				say( `the calibration has no slot for ${ cfg[ which ] }, so no ${ which } child's parts` );
				continue;
			}
			if ( ! unit[ which ] ) {
				say( `the draft shows no ${ 'resting' === which ? 'closed' : 'open' } unit, so no ${ which } child's parts` );
				continue;
			}
			const path = ( settings[ p.setting ]?.slots || [ settings[ p.setting ]?.slot ] ).find( ( s ) => undefined !== s && stepsOf( s )[ 0 ] === child[ which ] );
			const el = PARTS[ p.part ]?.( unit[ which ], m ) ?? null;
			if ( undefined === path ) {
				say( `the calibration measured ${ p.setting } on no ${ which } child, so no ${ which } ${ p.part } slot` );
			} else if ( ! el ) {
				say( `the ${ 'resting' === which ? 'closed' : 'open' } unit holds no ${ p.part } element, so no ${ which } ${ p.part } slot` );
			} else {
				out.slots[ path ] = finder( el );
				'current' === which && cfg.currentState && ( out.states[ path ] = cfg.currentState );
				'current' === which && opened && ( out.reveals[ path ] = opened.reveal );
			}
		}
	}
	return out;
}

// The attributes that put an element in a state as the record names it (setting-record/instances.py::STATE_TRIGGERS and
// its aria- names): an open disclosure, the current page's link.
// `null` is any value but `false` (ARIA's aria-current="false" is not current; an `open` attribute has no value).
const STATE_ATTRS = { open: [ [ 'open', null ], [ 'aria-expanded', 'true' ] ], current: [ [ 'aria-current', null ] ] };

// Whether an element carrying `own` ({ attribute: value }) is in `state`.
export const inState = ( own, state ) => ( STATE_ATTRS[ state ] || [] ).some( ( [ a, v ] ) => undefined !== own?.[ a ] && ( null === v ? 'false' !== own[ a ] : own[ a ] === v ) );

// { resting, current }: the first steps of the slots the two child-naming settings (cfg.resting, cfg.current) reach, the
// current child the first whose element is in cfg.currentState, the resting child the first that is not (null where none
// is). A part's setting can reach elements that are no child (a filter row), so it never names a child.
function childrenByState( cfg, settings, attrs ) {
	const names = [ cfg.resting, cfg.current ];
	const steps = [ ...new Set( names.flatMap( ( n ) => [ settings[ n ]?.slot, ...( settings[ n ]?.slots || [] ) ] ).map( ( s ) => stepsOf( s )[ 0 ] ).filter( Boolean ) ) ];
	return { resting: steps.find( ( c ) => ! inState( attrs[ c ], cfg.currentState ) ) ?? null, current: steps.find( ( c ) => inState( attrs[ c ], cfg.currentState ) ) ?? null };
}

// A unit as the state that opens it shows it: { unit (its panel the one revealed panel), reveal }, or null. A revealed panel
// is a record the inventory read in a state that sets the unit's own toggle key and nothing else, the topmost revealed
// element on its way up to the unit (its parent is an element shown at load).
function shownOpen( u, revealed, m ) {
	const own = ( r ) => {
		const keys = Object.keys( r.reveal?.keys || {} );
		return 1 === keys.length && keys[ 0 ] === u.key && 'string' === typeof r.reveal?.component;
	};
	// Inside the unit through elements shown at load: a revealed element under another revealed one finds no parent there.
	const inUnit = ( r ) => {
		for ( let x = m.byKey[ r.parentKey ]; x; x = m.byKey[ x.parentKey ] ) {
			if ( x === u.el ) {
				return true;
			}
		}
		return false;
	};
	const panels = revealed.filter( ( r ) => own( r ) && inUnit( r ) );
	return 1 === panels.length ? { unit: { ...u, rendered: panels }, reveal: { component: panels[ 0 ].reveal.component, keys: panels[ 0 ].reveal.keys } } : null;
}

// An icon ring: an element drawn at the widest read width as a square, holding no letter or digit (a typed `+`, an icon
// hole or an svg).
export const isRing = ( x ) => {
	const b = x.box?.[ 1440 ];
	const words = `${ x.words ?? '' }${ String( x.srcOwnText ?? '' ).replace( /\{\{[^}]*\}\}/g, '' ) }`;
	return !! b && b.w > 0 && Math.abs( b.w - b.h ) <= 1 && false !== x.visible?.[ 1440 ] && ! /[\p{L}\p{N}]/u.test( words );
};

// A glyph: an element drawn at the widest read width as a small square (at most 48px), with no words of its own (an icon
// placeholder hole or an svg), or an svg.
const isGlyph = ( x ) => {
	const b = x.box?.[ 1440 ];
	const square = !! b && b.w > 0 && b.w <= 48 && Math.abs( b.w - b.h ) <= 1 && false !== x.visible?.[ 1440 ];
	const wordless = 'svg' === x.tag || '' === String( x.srcOwnText ?? '' ).replace( /\{\{[^}]*\}\}/g, '' ).trim() && '' !== String( x.srcOwnText ?? '' ).trim();
	return square && wordless;
};

// The width a navigation element collapses at: the one `>= N` width threshold, N a threshold the draft's code uses, of the
// handoff states whose sc-if shows the element. Returns { value } or { note }.
export function collapsePoint( { e, states = [], thresholds = [] } ) {
	const ids = new Set( scIfIds( e ) );
	const found = new Set();
	for ( const s of states.filter( ( x ) => ( x.sc_if_tpl_ids || [] ).some( ( id ) => ids.has( String( id ) ) ) ) ) {
		// The structured threshold ({ basis: 'state.w', op: '>=', value }) is read before the prose.
		const t = s.breakpoint;
		const n = t && 'state.w' === t.basis && '>=' === t.op ? Number( t.value ) : Number( /(?:≥|>=)\s*(\d+)/.exec( s.how_to_reach || '' )?.[ 1 ] );
		thresholds.includes( n ) && found.add( n );
	}
	return 1 === found.size ? { value: [ ...found ][ 0 ] } : { note: `${ found.size } width thresholds show this navigation, so no collapse point` };
}

// draftSlots for one slide of a slider: the slide block's parts read at the elements that print the loop's fields in this slide's
// own copy (a review's quote and reviewer name), so each part's look (size, colour) is the draft's, never the block's default.
// cfg: the slider rule's `slideSlots`, { <content setting the slide block holds>: <a setting calibrated on that part> }; fields:
// [ { key: the content setting a loop field fills, element: the fact record's template key of the element printing it } ];
// settings: the slide block's calibrated settings with their slots; entry( e ): the fact record's entry of an inventory element.
// Returns { slots: { <path>: finder }, notes }.
export function slideSlots( { cfg, fields = [], slide, m, entry, finder, settings = {} } ) {
	const out = { slots: {}, notes: [] };
	for ( const f of fields ) {
		const setting = cfg?.[ f.key ];
		const slot = setting ? settings[ setting ]?.slot : null;
		if ( ! setting ) {
			continue;
		}
		if ( 'string' !== typeof slot || '' === slot || slot.includes( '::' ) ) {
			out.notes.push( `the calibration has no element slot for ${ setting }, so the slide's ${ f.key } is not read` );
			continue;
		}
		const el = withinTree( m, slide ).find( ( e ) => entry( e )?.template?.key === f.element );
		el ? out.slots[ slot ] = finder( el ) : out.notes.push( `the slide holds no element printing ${ f.key }, so its look is not read` );
	}
	return out;
}
