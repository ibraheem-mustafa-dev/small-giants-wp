// The content and mode settings of a block that choose what a part shows (template-rework Task 4, product page and shop listing): whether a
// card draws option pickers, what its button says, whether the add button shows its price. They have no CSS property, so the look pairing
// cannot place them; `data/part-look-modes.json` bridges each to what the draft draws, as rules over the located parts:
//   whenFound / whenAbsent  a part (named in the block's locators) the draft draws, or does not draw, at any width (whenAbsent may
//                           list several parts, all of which must be absent)
//   neighbours              parts that must be found, so an absence is never read from a failed read
//   whenStyle               { part, style, equals }: every copy of the part the draft draws reads `equals` for that page reading
//                           (`label:above`: the label's words sit above its field)
//   from.text               the part's own words (all instances must agree), from.look the part's computed value of a property
//   from.differs            parts whose words differ from one copy to the next (a per-product badge, note or button), or that
//                           some cards draw and others do not (`from.cards`: the part every card has once): `value` is written
//                           when any of them does, nothing when every copy says the same
//   from.aspect             a part's width to height at the widest width, every copy agreeing (a picture's shape: `W / H`,
//                           a near-simple ratio as itself), written as the desktop tier of a tier object
//   from.pricePrefix        a price part whose words put a word before the amount on some copy ("from £9.50"): true, else false
//   from.minus              with from.text: a part inside it whose words are cut from the end (the count after a heading's words)
//   from.amount             with from.text: true takes only words holding an amount and writes the amount as `%s` ("Add %s more
//                           for free delivery"), false only words holding none; a part whose words do not fit is not written
//   from.ratio              [ total part, share part ]: the whole number of shares the total is, within 2% (the number of payments
//                           an instalments line splits the subtotal into), from their amounts
//   value                   the literal to write when the condition holds
// A rule whose setting the framework database does not hold for the block, whose instances disagree, or whose evidence is missing
// is a gap row with the draft's evidence, never a guess. Pure: reads and database rows in, writes and gaps out.
import { WIDTHS, primitive } from './fill-part-look.mjs';

const AMOUNT = /\s*[·•|–-]?\s*[£$€]\s?\d[\d.,]*|\s*\d[\d.,]*\s?[£$€]/;
const has = ( reads, part ) => WIDTHS.some( ( w ) => ( reads[ part ]?.[ w ] || [] ).length );
const AMOUNT_IN = /[£$€]\s?\d[\d,]*(?:\.\d+)?|\d[\d,]*(?:\.\d+)?\s?[£$€]/;
const amountOf = ( text ) => {
	const m = AMOUNT_IN.exec( String( text || '' ) );
	return m ? parseFloat( m[ 0 ].replace( /[^\d.]/g, '' ) ) : null;
};
const instances = ( reads, part ) => reads[ part ]?.[ 1440 ] || WIDTHS.map( ( w ) => reads[ part ]?.[ w ] ).find( ( l ) => l?.length ) || [];

const PREFIXED = /^[^£$€\d]*[A-Za-z][^£$€\d]*[£$€]\s?\d/;
const SIMPLE = [ [ 1, 1 ], [ 4, 3 ], [ 3, 4 ], [ 3, 2 ], [ 2, 3 ], [ 16, 9 ], [ 9, 16 ], [ 4, 5 ], [ 5, 4 ], [ 2, 1 ], [ 1, 2 ] ];
// The shape the copies of a part share (`W / H`), or null when they differ by more than 2% or have no size.
export function aspectOf( list ) {
	const rs = ( list || [] ).map( ( i ) => ( i.box?.w > 0 && i.box?.h > 0 ? i.box.w / i.box.h : null ) );
	if ( ! rs.length || rs.some( ( r ) => null === r ) || Math.max( ...rs ) / Math.min( ...rs ) > 1.02 ) {
		return null;
	}
	const r = rs[ 0 ];
	const near = SIMPLE.find( ( [ w, h ] ) => Math.abs( r / ( w / h ) - 1 ) <= 0.02 );
	return near ? `${ near[ 0 ] } / ${ near[ 1 ] }` : `${ Math.round( list[ 0 ].box.w ) } / ${ Math.round( list[ 0 ].box.h ) }`;
}

// The label of a button without the amount it carries ("Add to basket · £21.50" is "Add to basket").
export const labelOf = ( text ) => String( text ).replace( AMOUNT, '' ).replace( /[\s·•|–-]+$/, '' ).trim();

export function evaluateModes( { block, rules, rows, reads } ) {
	const out = { writes: [], gaps: [], settings: {} };
	const known = new Set( rows.map( ( r ) => r.attr_name ) );
	for ( const rule of rules || [] ) {
		const gap = ( what, evidence ) => out.gaps.push( { block, setting: rule.setting, what, evidence } );
		if ( ! known.has( rule.setting ) ) {
			gap( 'the framework database holds no such setting for this block', rule.note || null );
			continue;
		}
		if ( rule.gap ) {
			const list = instances( reads, rule.evidencePart || rule.whenFound || '' ).map( ( i ) => i.text );
			gap( rule.gap, list.length ? `the draft's ${ rule.evidencePart || rule.whenFound } texts: ${ JSON.stringify( list ) }` : 'the draft draws no such part' );
			continue;
		}
		const neighbours = rule.neighbours || [];
		if ( neighbours.some( ( n ) => ! has( reads, n ) ) ) {
			out.settings[ rule.setting ] = { code: 'neighboursNotFound' };
			continue;
		}
		if ( rule.whenFound && ! has( reads, rule.whenFound ) ) {
			out.settings[ rule.setting ] = { code: 'notDrawn' };
			continue;
		}
		if ( rule.whenStyle ) {
			const vals = WIDTHS.flatMap( ( w ) => ( reads[ rule.whenStyle.part ]?.[ w ] || [] ).map( ( i ) => String( i.styles?.[ rule.whenStyle.style ] ?? '' ) ) );
			if ( ! vals.length || vals.some( ( v ) => v !== rule.whenStyle.equals ) ) {
				out.settings[ rule.setting ] = { code: vals.length ? 'styleDiffers' : 'notDrawn' };
				continue;
			}
		}
		if ( rule.whenAbsent && [].concat( rule.whenAbsent ).some( ( part ) => has( reads, part ) ) ) {
			out.settings[ rule.setting ] = { code: 'drawn' };
			continue;
		}
		let value = rule.value;
		let evidence = rule.whenStyle ? `every ${ rule.whenStyle.part } of the draft reads ${ rule.whenStyle.style } ${ rule.whenStyle.equals }` : rule.whenAbsent ? `the draft draws no ${ [].concat( rule.whenAbsent ).join( ' or ' ) } at any width` : ( rule.whenFound ? `the draft draws ${ rule.whenFound }` : '' );
		if ( rule.from?.text ) {
			const cut = ( t ) => {
				const tail = rule.from.minus ? instances( reads, rule.from.minus ).map( ( i ) => String( i.text || '' ) ).find( ( x ) => x && String( t ).endsWith( x ) ) : null;
				return tail ? String( t ).slice( 0, -tail.length ).trim() : t;
			};
			let texts = [ ...new Set( instances( reads, rule.from.text ).map( ( i ) => cut( rule.from.label ? labelOf( i.text ) : i.text ) ) ) ];
			if ( undefined !== rule.from.amount ) {
				texts = texts.filter( ( t ) => AMOUNT_IN.test( t ) === rule.from.amount ).map( ( t ) => ( rule.from.amount ? t.replace( AMOUNT_IN, '%s' ) : t ) );
				if ( ! texts.length ) {
					out.settings[ rule.setting ] = { code: rule.from.amount ? 'noAmount' : 'amount' };
					continue;
				}
			}
			if ( 1 !== texts.length ) {
				gap( 'the instances of the part say different things and the block holds one value for all of them', `${ rule.from.text }: ${ JSON.stringify( texts ) }` );
				continue;
			}
			[ value ] = texts;
			evidence = `the draft's ${ rule.from.text } says ${ JSON.stringify( value ) }`;
			if ( '' === value ) {
				gap( 'the draft part has no words to write', evidence );
				continue;
			}
		} else if ( rule.from?.hasAmount ) {
			value = instances( reads, rule.from.hasAmount ).every( ( i ) => /[£$€]\s?\d|\d\s?[£$€]/.test( i.text ) );
			evidence = `the draft's ${ rule.from.hasAmount } ${ value ? 'carries' : 'carries no' } amount`;
		} else if ( rule.from?.look ) {
			const vals = instances( reads, rule.from.look.part ).map( ( i ) => primitive( rule.from.look.property, i.styles, { css_property: rule.from.look.property } ) );
			if ( vals.some( ( v ) => undefined === v ) || ! vals.length ) {
				gap( 'the draft value could not be read', rule.from.look.part );
				continue;
			}
			value = vals.every( ( v ) => null !== v );
			if ( ! vals.every( ( v ) => ( null !== v ) === value ) ) {
				gap( 'the instances differ', `${ rule.from.look.part } ${ rule.from.look.property }: ${ JSON.stringify( vals ) }` );
				continue;
			}
			evidence = `the draft's ${ rule.from.look.part } ${ value ? 'has' : 'has no' } ${ rule.from.look.property }`;
		}
		if ( rule.from?.differs ) {
			// A part some cards draw and others do not (one badged card) differs too: `from.cards` names the part each card has once.
			const cards = rule.from.cards ? instances( reads, rule.from.cards ).length : 0;
			const varied = rule.from.differs.map( ( part ) => {
				const said = instances( reads, part ).map( ( i ) => labelOf( i.text ) ).filter( Boolean );
				return { part, texts: [ ...new Set( said ) ], some: said.length > 0 && said.length < cards };
			} ).filter( ( x ) => x.texts.length > 1 || x.some );
			if ( ! varied.length ) {
				out.settings[ rule.setting ] = { code: 'same' };
				continue;
			}
			evidence = `the draft's cards differ per copy: ${ varied.map( ( x ) => `${ x.part } ${ JSON.stringify( x.texts.slice( 0, 4 ) ) }${ x.some ? ` on ${ x.texts.length ? 'some' : 'no' } of ${ cards } cards` : '' }` ).join( '; ' ) }`;
		} else if ( rule.from?.aspect ) {
			const ratio = aspectOf( instances( reads, rule.from.aspect ) );
			if ( ! ratio ) {
				gap( 'the copies of the part differ in shape or have no size', rule.from.aspect );
				continue;
			}
			value = { desktop: ratio };
			evidence = `the draft's ${ rule.from.aspect } is ${ ratio } (width to height at the widest width)`;
		} else if ( rule.from?.ratio ) {
			const [ total, share ] = rule.from.ratio.map( ( part ) => amountOf( instances( reads, part )[ 0 ]?.text ) );
			const n = total && share ? Math.round( total / share ) : 0;
			if ( ! n || Math.abs( ( n * share ) / total - 1 ) > 0.02 ) {
				gap( 'the total is no whole number of the share', `${ rule.from.ratio.join( ' / ' ) }: ${ total } / ${ share }` );
				continue;
			}
			value = n;
			evidence = `the draft's ${ rule.from.ratio[ 0 ] } ${ total } is ${ n } times its ${ rule.from.ratio[ 1 ] } ${ share }`;
		} else if ( rule.from?.pricePrefix ) {
			const texts = instances( reads, rule.from.pricePrefix ).map( ( i ) => String( i.text || '' ) );
			value = texts.some( ( t ) => PREFIXED.test( t ) );
			evidence = value ? `the draft's ${ rule.from.pricePrefix } reads ${ JSON.stringify( texts.find( ( t ) => PREFIXED.test( t ) ) ) }` : `no copy of the draft's ${ rule.from.pricePrefix } puts a word before its amount`;
		}
		out.writes.push( { attr: rule.setting, value, part: rule.part || null, property: '(content)', mode: true, evidence, draft: { 1440: value } } );
		out.settings[ rule.setting ] = { code: 'written' };
	}
	return out;
}
