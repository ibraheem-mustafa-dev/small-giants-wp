// The buy box's instalments note (Bean's D-8: the twin of the basket drawer's note; sgs/buybox `instalmentsNote`,
// `instalmentsCount`): where the draft's buy box draws a line whose amount is the product's price shared over a number of
// payments ("Or 3 payments of £46.33 with Klarna · Apple Pay · Google Pay · PayPal"), the placed buy box gets that line as
// its note, the amount as `%s` (the block fills it with the chosen variation's price over the count), and the count.
//
// Found from the draft's logic, never from the line's words:
//   - an element of the buy box's run (the page shows one product record) whose own text holds a hole whose value divides a
//     member named as the record's price field by a whole number of 2 or more (`klarna: this.gbp( p.price / 3 )`): that
//     number is the count;
//   - the line is that element, widened through its parents while a parent holds only text (spans, strong, em and the like,
//     no control or picture), so the payment names drawn beside it join the note;
//   - the note is the line's shown words with the hole's shown amount replaced by `%s`.
// Two such lines, a count below 2, or an amount the shown words do not hold give no note, with the reason. The settings are
// written only where the block holds them (`attrExists`), so a buy box without the feature keeps its own default.
import { holesOf } from './template-piece-draft.mjs';
import { valuesOf } from './shop-parts-logic.mjs';

const TEXT_TAGS = [ 'span', 'strong', 'b', 'em', 'i', 'small', 's', 'u', 'mark', 'sup', 'sub', 'br' ];
const squash = ( s ) => String( s ?? '' ).replace( /\s+/g, ' ' ).trim();
const escape = ( s ) => s.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );

// The count a value divides a price by: the whole number N >= 2 of a `<…price…> / N` inside it (the left side reads a member
// named as one of the record's price fields, `p.price`), or null.
export function priceShare( L, value, priceFields ) {
	const within = ( node ) => L.all.filter( ( n ) => n.start >= node.start && n.end <= node.end );
	for ( const n of within( value ) ) {
		if ( 'BinaryExpression' === n.type && '/' === n.operator && 'NumericLiteral' === n.right?.type && Number.isInteger( n.right.value ) && n.right.value >= 2 &&
			within( n.left ).some( ( m ) => 'MemberExpression' === m.type && ! m.computed && priceFields.includes( m.property?.name ) ) ) {
			return n.right.value;
		}
	}
	return null;
}

// The amount a hole shows in an element's words: its own source text with each literal run kept and the hole read, or null.
export function shownAmount( srcOwnText, words, hole ) {
	const parts = String( srcOwnText ).split( /\{\{\s*([^}]+?)\s*\}\}/ );
	let rx = '';
	let at = -1;
	parts.forEach( ( p, i ) => {
		if ( 0 === i % 2 ) {
			rx += escape( squash( p ) ).replace( /\\? /g, '\\s*' );
		} else {
			rx += '\\s*(.+?)\\s*';
			p === hole && ( at = ( i + 1 ) / 2 );
		}
	} );
	const m = new RegExp( `^${ rx }$` ).exec( squash( words ) );
	return m && at > 0 ? m[ at ] : null;
}

// The note for a placed buy box: { attrs, notes } (attrs empty when there is none). `found`: the run
// (lib/template-piece-buybox.mjs::locateRun: { index, inRun }); `priceFields`: the draft's product records' price field names
// (lib/template-pieces-context.mjs::productFieldsOf); `attrExists( attr )`: whether sgs/buybox holds the setting.
export function instalmentsNote( { L, found, priceFields, attrExists } ) {
	const notes = [];
	if ( ! L || ! priceFields?.length ) {
		return { attrs: {}, notes };
	}
	const { index, inRun } = found;
	const hits = [];
	for ( const e of index.elements.filter( ( x ) => inRun( x.key ) ) ) {
		for ( const hole of holesOf( e.srcOwnText ) ) {
			const count = valuesOf( L, hole ).map( ( v ) => priceShare( L, v, priceFields ) ).find( ( c ) => null !== c );
			count && hits.push( { e, hole, count } );
		}
	}
	if ( ! hits.length ) {
		return { attrs: {}, notes };
	}
	if ( hits.length > 1 ) {
		return { attrs: {}, notes: [ `the buy box draws ${ hits.length } lines sharing the price over payments (${ hits.map( ( h ) => h.e.key ).join( ', ' ) }), so its one instalments note is not written` ] };
	}
	const { e, hole, count } = hits[ 0 ];
	const amount = shownAmount( e.srcOwnText, e.words, hole );
	if ( ! amount ) {
		return { attrs: {}, notes: [ `the instalments line ${ e.key } does not show its amount in its words ("${ squash( e.words ) }"), so its note is not written` ] };
	}
	let line = e;
	for ( let up = index.byKey.get( line.parentKey ); up && inRun( up.key ) && index.children( up.key ).every( ( k ) => TEXT_TAGS.includes( index.byKey.get( k )?.tag ) && ! index.elements.some( ( d ) => index.within( d.key, k ) && ! TEXT_TAGS.includes( d.tag ) ) ); up = index.byKey.get( up.parentKey ) ) {
		line = up;
	}
	// A flex or grid row draws its children apart (its gap stands for the space the words do not hold), so their words are joined by one.
	const textOf = ( el ) => ( /flex|grid/.test( String( el.display || '' ) ) && index.children( el.key ).length ? index.children( el.key ).map( ( k ) => textOf( index.byKey.get( k ) ) ).join( ' ' ) : String( el.allText ?? el.words ?? '' ) );
	const text = squash( textOf( line ) );
	if ( ! text.includes( amount ) ) {
		return { attrs: {}, notes: [ `the instalments line ${ line.key } does not show the amount ${ amount }, so its note is not written` ] };
	}
	const note = text.replace( amount, '%s' );
	const held = [ 'instalmentsNote', 'instalmentsCount' ].filter( ( a ) => ! attrExists( a ) );
	if ( held.length ) {
		return { attrs: {}, notes: [ `the buy box draws an instalments line ${ line.key } ("${ note }", ${ count } payments), and sgs/buybox does not hold ${ held.join( ' or ' ) } yet, so it is not written` ] };
	}
	return { attrs: { instalmentsNote: note, instalmentsCount: count }, notes: [ `the buy box's instalments note is the draft's line ${ line.key }: "${ note }", ${ count } payments (the hole ${ hole } divides the product's price by ${ count })` ] };
}
