// What a choice flow holds outside its option loops (Spec 48 FR-48-6, rules.choiceFlow; Spec 43; Spec 48 R-47-12), read
// from the fact record by lib/skeleton-choice-flow.mjs::choiceFlowModel, in this order, before anything is a gap row:
//   toggles   two or more pressable buttons (`aria-pressed`, outside every loop and every question) under one parent are
//             one question, an option per button (its first text the label, its second the description, the button the
//             record shows pressed the default); a condition beside them testing one button's pressed state is what that
//             option reveals: the step it opens underneath.
//   summary   with no aside, a live line (a bound text, no control) whose recorded value names the options of two or more
//             questions is the flow summary (FR-43-19), drawn with the panel that holds it: the climb from the line while
//             the ancestor holds no control, no question and no other words.
//   note      with the summary shown and no stage note yet, the one text element after the flow's last control is its
//             stage note, shown in the summary panel.
//   canvas    every other element with words and no control, outside every covered piece, is an ordinary block of the
//             flow post beside the `sgs/choice-flow` block (the flow post renders every top-level block, FR-43-6): the
//             highest such element, unless its group holds a control nothing holds (it stays with that gap). One heading
//             on its own is the flow title. A group before the first step goes before the flow, any other after it.
// Nothing is read from a name or a literal text: only tags, bindings, recorded values and document order.

const HEADING = /^h[1-6]$/;
const BOUND = /\{\{/;
const squash = ( s ) => String( s ?? '' ).replace( /\s+/g, ' ' ).trim();
const escape = ( s ) => s.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );

// x: the model's reading context { els, t, rec, real, literal, control, textHoles, firstValue, price, all, rootKey, loops,
// inQuestion }. Returns [{ parent, buttons, reveal (the condition one option reveals, or null), revealer (its
// button), options [{ label, description?, isDefault? }], prices }].
export function toggleGroups( x ) {
	const { els, t, rec, real, literal, control, textHoles, firstValue, price, all, rootKey, inQuestion } = x;
	const pressed = ( k ) => squash( rec( k ).attrs?.[ 'aria-pressed' ] );
	const inLoop = ( k ) => {
		for ( let p = t.parent( k ); p && p !== rootKey; p = t.parent( p ) ) {
			if ( 'sc-for' === rec( p ).realTag ) {
				return true;
			}
		}
		return false;
	};
	const shownPressed = ( k ) => {
		const hole = rec( k ).holes.find( ( h ) => 'attr:aria-pressed' === h.where );
		const at = hole ? els[ k ].logic?.holes?.[ hole.id ] : null;
		return true === ( at?.[ 1440 ] ?? Object.values( at || {} )[ 0 ] )?.v?.[ 0 ]?.v;
	};
	const byParent = new Map();
	all.filter( ( k ) => ! inQuestion.has( k ) && control( k ) && pressed( k ) && ! inLoop( k ) ).forEach( ( k ) => {
		const p = t.parent( k );
		( byParent.get( p ) ?? byParent.set( p, [] ).get( p ) ).push( k );
	} );
	return [ ...byParent ].filter( ( [ , buttons ] ) => buttons.length >= 2 ).map( ( [ parent, buttons ] ) => {
		const reveals = t.kids( parent ).filter( ( s ) => 'sc-if' === rec( s ).realTag && buttons.some( ( b ) => squash( rec( s ).attrs?.value ) === pressed( b ) ) );
		const reveal = 1 === reveals.length ? reveals[ 0 ] : null;
		const revealer = reveal ? buttons.find( ( b ) => pressed( b ) === squash( rec( reveal ).attrs.value ) ) : null;
		const defaults = buttons.filter( shownPressed );
		const prices = [];
		const options = buttons.map( ( b ) => {
			const texts = [ b, ...t.desc( b ) ].filter( ( k ) => real( k ) && literal( k ) ).map( literal );
			const plain = texts.filter( ( w ) => ! price( w ) );
			prices.push( ...texts.filter( price ), ...textHoles( [ b, ...t.desc( b ) ] ).flatMap( ( h ) => h.vals?.v || [] ).filter( price ) );
			return { label: plain[ 0 ] || firstValue( b ), ...( plain[ 1 ] ? { description: plain[ 1 ] } : {} ), ...( 1 === defaults.length && defaults[ 0 ] === b ? { isDefault: true } : {} ) };
		} );
		return { parent, buttons, reveal, revealer, options, prices: [ ...new Set( prices ) ] };
	} );
}

// The flow summary's live line and the element that draws it, or null. x as above plus covered (record key -> what draws
// it) and steps (the model's steps so far).
export function summaryOf( x, { covered, steps } ) {
	const { t, rec, real, literal, control, textHoles, all, rootKey, loops, inQuestion } = x;
	const sets = steps.filter( ( s ) => s.question ).map( ( s ) => ( s.question.options || [] ).map( ( o ) => o.label ).filter( ( l ) => /\p{L}/u.test( l ) ) ).filter( ( l ) => l.length );
	const names = ( v ) => sets.filter( ( labels ) => labels.some( ( l ) => new RegExp( `(^|[^\\p{L}\\p{N}])${ escape( l ) }($|[^\\p{L}\\p{N}])`, 'iu' ).test( v ) ) ).length;
	const line = all.find( ( k ) => ! covered.has( k ) && ! inQuestion.has( k ) && real( k ) && ! control( k ) && BOUND.test( rec( k ).words || '' ) && textHoles( [ k ] ).some( ( h ) => ( h.vals?.v || [] ).some( ( v ) => names( v ) >= 2 ) ) );
	if ( ! line ) {
		return null;
	}
	const mine = ( s ) => new Set( [ s, ...t.desc( s ) ] );
	let panel = line;
	for ( let p = t.parent( panel ); p && p !== rootKey; p = t.parent( p ) ) {
		const own = mine( panel );
		const others = t.desc( p ).filter( ( d ) => ! own.has( d ) );
		if ( others.some( ( d ) => control( d ) || covered.has( d ) || inQuestion.has( d ) || loops.some( ( o ) => o.k === d ) || literal( d ) || BOUND.test( rec( d ).words || '' ) ) ) {
			break;
		}
		real( p ) && ( panel = p );
	}
	return { line, panel };
}

// The one text element after the flow's last control, or null.
export function stageNoteOf( x, { covered } ) {
	const { t, rec, real, literal, control, all } = x;
	const last = Math.max( -1, ...all.filter( control ).map( t.num ) );
	const text = ( k ) => real( k ) && ! covered.has( k ) && ! HEADING.test( rec( k ).realTag ) && t.num( k ) > last && [ k, ...t.desc( k ) ].some( literal ) && ! [ k, ...t.desc( k ) ].some( ( d ) => control( d ) || BOUND.test( rec( d ).words || '' ) );
	const found = all.filter( ( k ) => text( k ) && ! ( ( p ) => p && p !== x.rootKey && text( p ) )( t.parent( k ) ) );
	return 1 === found.length ? found[ 0 ] : null;
}

// The canvas groups: [{ key, at: 'before' | 'after' }], and the flow title's heading when one stands alone. firstStep is
// the document number of the first step's element.
export function canvasOf( x, { covered, firstStep } ) {
	const { t, rec, real, literal, control, all, rootKey, loops } = x;
	const worded = ( d ) => real( d ) && ( literal( d ) || BOUND.test( rec( d ).words || '' ) );
	const loose = ( d ) => ( control( d ) && ! covered.has( d ) ) || ( loops.some( ( o ) => o.k === d ) && ! covered.has( d ) );
	const free = ( k ) => real( k ) && [ k, ...t.desc( k ) ].some( worded ) && ! [ k, ...t.desc( k ) ].some( ( d ) => covered.has( d ) || control( d ) || loops.some( ( o ) => o.k === d ) );
	const freeAbove = ( k ) => {
		for ( let p = t.parent( k ); p && p !== rootKey; p = t.parent( p ) ) {
			if ( free( p ) ) {
				return true;
			}
		}
		return false;
	};
	// The group's own holder: the nearest real ancestor below the root. A holder that is a control nothing holds, or a
	// control nothing holds beside the group in it, keeps the words with that gap.
	const holder = ( k ) => {
		let p = t.parent( k );
		while ( p && p !== rootKey && ! real( p ) ) {
			p = t.parent( p );
		}
		return p && p !== rootKey ? p : null;
	};
	const beside = ( h ) => t.kids( h ).flatMap( ( c ) => ( real( c ) ? [ c ] : beside( c ) ) );
	const tied = ( k ) => ( ( h ) => !! h && ( loose( h ) || beside( h ).some( loose ) ) )( holder( k ) );
	const groups = all.filter( ( k ) => free( k ) && ! freeAbove( k ) && ! tied( k ) );
	const alone = ( k ) => ( ( w ) => 1 === w.length && HEADING.test( rec( w[ 0 ] ).realTag ) && literal( w[ 0 ] ) )( [ k, ...t.desc( k ) ].filter( worded ) );
	const title = groups.find( alone ) ?? null;
	const heading = title ? [ title, ...t.desc( title ) ].find( worded ) : null;
	return { title: heading, titleGroup: title, canvas: groups.filter( ( k ) => k !== title ).map( ( key ) => ( { key, at: t.num( key ) < firstStep ? 'before' : 'after' } ) ) };
}
