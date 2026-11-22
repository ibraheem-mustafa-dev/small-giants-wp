// The content and mode settings of a block that choose what a part shows (template-rework Task 4, product page and shop listing): whether a
// card draws option pickers, what its button says, whether the add button shows its price. They have no CSS property, so the look pairing
// cannot place them; `data/part-look-modes.json` bridges each to what the draft draws, as rules over the located parts:
//   whenFound / whenAbsent  a part (named in the block's locators) the draft draws, or does not draw, at any width
//   neighbours              parts that must be found, so an absence is never read from a failed read
//   from.text               the part's own words (all instances must agree), from.look the part's computed value of a property
//   from.differs            parts whose words differ from one copy to the next (a per-product badge, note or button): `value`
//                           is written when any of them does, nothing when every copy says the same
//   from.aspect             a part's width to height at the widest width, every copy agreeing (a picture's shape: `W / H`,
//                           a near-simple ratio as itself), written as the desktop tier of a tier object
//   from.pricePrefix        a price part whose words put a word before the amount on some copy ("from £9.50"): true, else false
//   value                   the literal to write when the condition holds
// A rule whose setting the framework database does not hold for the block, whose instances disagree, or whose evidence is missing
// is a gap row with the draft's evidence, never a guess. Pure: reads and database rows in, writes and gaps out.
import { WIDTHS, primitive } from './fill-part-look.mjs';

const AMOUNT = /\s*[·•|–-]?\s*[£$€]\s?\d[\d.,]*|\s*\d[\d.,]*\s?[£$€]/;
const has = ( reads, part ) => WIDTHS.some( ( w ) => ( reads[ part ]?.[ w ] || [] ).length );
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
		if ( rule.whenAbsent && has( reads, rule.whenAbsent ) ) {
			out.settings[ rule.setting ] = { code: 'drawn' };
			continue;
		}
		let value = rule.value;
		let evidence = rule.whenAbsent ? `the draft draws no ${ rule.whenAbsent } at any width` : ( rule.whenFound ? `the draft draws ${ rule.whenFound }` : '' );
		if ( rule.from?.text ) {
			const texts = [ ...new Set( instances( reads, rule.from.text ).map( ( i ) => ( rule.from.label ? labelOf( i.text ) : i.text ) ) ) ];
			if ( 1 !== texts.length ) {
				gap( 'the instances of the part say different things and the block holds one value for all of them', `${ rule.from.text }: ${ JSON.stringify( texts ) }` );
				continue;
			}
			[ value ] = texts;
			evidence = `the draft's ${ rule.from.text } says ${ JSON.stringify( value ) }`;
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
			const varied = rule.from.differs.map( ( part ) => ( { part, texts: [ ...new Set( instances( reads, part ).map( ( i ) => labelOf( i.text ) ).filter( Boolean ) ) ] } ) ).filter( ( x ) => x.texts.length > 1 );
			if ( ! varied.length ) {
				out.settings[ rule.setting ] = { code: 'same' };
				continue;
			}
			evidence = `the draft's cards differ per copy: ${ varied.map( ( x ) => `${ x.part } ${ JSON.stringify( x.texts.slice( 0, 4 ) ) }` ).join( '; ' ) }`;
		} else if ( rule.from?.aspect ) {
			const ratio = aspectOf( instances( reads, rule.from.aspect ) );
			if ( ! ratio ) {
				gap( 'the copies of the part differ in shape or have no size', rule.from.aspect );
				continue;
			}
			value = { desktop: ratio };
			evidence = `the draft's ${ rule.from.aspect } is ${ ratio } (width to height at the widest width)`;
		} else if ( rule.from?.pricePrefix ) {
			const texts = instances( reads, rule.from.pricePrefix ).map( ( i ) => String( i.text || '' ) );
			value = texts.some( ( t ) => PREFIXED.test( t ) );
			evidence = value ? `the draft's ${ rule.from.pricePrefix } reads ${ JSON.stringify( texts.find( ( t ) => PREFIXED.test( t ) ) ) }` : `no copy of the draft's ${ rule.from.pricePrefix } puts a word before its amount`;
		}
		if ( '' === value ) {
			gap( 'the draft part has no words to write', evidence );
			continue;
		}
		out.writes.push( { attr: rule.setting, value, part: rule.part || null, property: '(content)', mode: true, evidence, draft: { 1440: value } } );
		out.settings[ rule.setting ] = { code: 'written' };
	}
	return out;
}
