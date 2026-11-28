// The content and mode settings of a block that choose what a part shows (template-rework Task 4, product page and shop listing): whether a
// card draws option pickers, what its button says, whether the add button shows its price. They have no CSS property, so the look pairing
// cannot place them; `data/part-look-modes.json` bridges each to what the draft draws, as rules over the located parts:
//   whenFound / whenAbsent  a part (named in the block's locators) the draft draws, or does not draw, at any width (whenAbsent may
//                           list several parts, all of which must be absent)
//   neighbours              parts that must be found, so an absence is never read from a failed read
//   unsure                  with whenAbsent: looser parts that find an element of the same kind the strict locator cannot place (a
//                           view link drawn as a button, a quantity select); one found leaves the setting unwritten as a gap row
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
//   from.prefix             a part whose every copy reads the same characters before a number ("MM-1031", "MM-1012"): those characters
//   from.words              { part, tokens }: the part's first words, each token part's words found in them put back as {token}
//                           ("Order MM-1031" with { order: "order-number" } is "Order {order}"); words still holding a number or an
//                           amount are a gap
//   from.sameRow            parts that share a row (their tops within 2px) at the widest width: `value`, else nothing
//   from.line               a part marked by a line on one edge (an inset box-shadow offset on one axis): `value`, else nothing
//   from.fills              { part, against }: the part as wide (within 1px) as the widest of `against`: `value`, else nothing
//   from.sameLook           { part, other: { surface, part }, props }: the part shares those computed values with a part another surface
//                           of the same run read (`others`, the surface's reads): `value`, else nothing; that surface unread is a gap
//   from.paint              { part, box, bare }: the part's own paint. A border on any side or a fill makes it a box (`box`), the
//                           bare word is `bare`; every copy must agree, an unreadable fill writes nothing (an underlined link with a
//                           border is a box)
//   from.arranged           { parts: [a, b], row, column }: where two parts sit at each width they are both drawn: side by side (their
//                           boxes share a row, no overlap across) is `row`, one below the other is `column`; boxes that cross, or a
//                           width that disagrees with another, write nothing
//   from.placed             { part, of: [parts], within, right, below }: where each copy of `part` sits against the first of `of` that is
//                           drawn, inside the same `within` box (the line): at the right of it on its own row is `right`, beneath it is
//                           `below`; a copy whose line draws none of `of` is no evidence; anything else writes nothing
//   from.tiers              a part the draft draws at some widths and not at others (a description shown on desktop and tablet, hidden on a
//                           phone): the per-device { desktop, tablet, mobile } of 'on' and 'off', each tier written only where it differs
//                           from the tier above (the first always), each width read with the rule's neighbours found at that width; every
//                           width alike writes nothing (the plain show switch says it)
//   whenLargest             { part, over }: the number the first copy of `part` holds is larger than every number the copies of `over` hold
//                           (the "all" chip's count against the other chips'); no number on either side writes nothing
//   value                   the literal to write when the condition holds
//   reason                  a rule with no condition above writes `value` on every surface of the block; `reason` is its evidence
//                           (a clone never offers a feature its shop lacks)
// A rule whose setting the framework database does not hold for the block, whose instances disagree, or whose evidence is missing
// is a gap row with the draft's evidence, never a guess. Pure: reads and database rows in, writes and gaps out.
import { WIDTHS, primitive } from './fill-part-look.mjs';
import { parseColour } from './normalise.mjs';

const AMOUNT = /\s*[·•|–-]?\s*[£$€]\s?\d[\d.,]*|\s*\d[\d.,]*\s?[£$€]/;
const has = ( reads, part ) => WIDTHS.some( ( w ) => ( reads[ part ]?.[ w ] || [] ).length );
const AMOUNT_IN = /[£$€]\s?\d[\d,]*(?:\.\d+)?|\d[\d,]*(?:\.\d+)?\s?[£$€]/;
const amountOf = ( text ) => {
	const m = AMOUNT_IN.exec( String( text || '' ) );
	return m ? parseFloat( m[ 0 ].replace( /[^\d.]/g, '' ) ) : null;
};
const instances = ( reads, part ) => reads[ part ]?.[ 1440 ] || WIDTHS.map( ( w ) => reads[ part ]?.[ w ] ).find( ( l ) => l?.length ) || [];

// Words without the glyphs that open or close them ("View order →" is "View order"): `from.text` with `bare`, for a setting whose
// glyph is a setting of its own.
export const bareOf = ( text ) => String( text ?? '' ).replace( /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '' );
const AMOUNT_ANY =/[£$€]\s?\d|\d\s?[£$€]/;
// Whether a computed box-shadow is one line on one edge: inset, no blur or spread, offset on one axis only.
export function isLine( shadow ) {
	const s = String( shadow || '' );
	if ( ! /\binset\b/.test( s ) || s.includes( '),' ) ) {
		return false;
	}
	const n = ( s.replace( /rgba?\([^)]*\)/g, '' ).match( /-?[\d.]+px/g ) || [] ).map( parseFloat );
	return n.length >= 2 && ( 0 === n[ 0 ] ) !== ( 0 === n[ 1 ] ) && ! n.slice( 2 ).some( ( v ) => v !== 0 );
}

const PREFIXED =/^[^£$€\d]*[A-Za-z][^£$€\d]*[£$€]\s?\d/;
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

// Whether a read's styles draw a box (a visible border on any side, or a fill) or a bare word; null when the fill cannot be read.
export function paintOf( styles ) {
	const sides = [ 'top', 'right', 'bottom', 'left' ];
	if ( sides.some( ( s ) => parseFloat( styles?.[ `border-${ s }-width` ] ) > 0 && ! /^(none|hidden)$/.test( String( styles?.[ `border-${ s }-style` ] ?? 'none' ) ) ) ) {
		return 'box';
	}
	const fill = String( styles?.[ 'background-color' ] ?? '' ).trim();
	if ( ! fill || 'transparent' === fill ) {
		return fill ? 'bare' : null;
	}
	const c = parseColour( fill );
	return c ? ( c.a > 0 ? 'box' : 'bare' ) : null;
}

// The boxes this reads place by: drawn (a size) and with a position (a read from before the position was kept has none).
const drawn = ( i ) => i?.box && i.box.w > 0 && i.box.h > 0 && Number.isFinite( i.box.x ) && Number.isFinite( i.box.y );
// Where box b sits against box a: 'right' or 'left' (they share a row, overlapping by half the smaller height or more, with b clear of a
// across), 'below' (b starts where a ends), or null (they cross, or b is above a).
export function placeOf( a, b ) {
	const overlap = Math.min( a.y + a.h, b.y + b.h ) - Math.max( a.y, b.y );
	if ( overlap >= Math.min( a.h, b.h ) / 2 ) {
		if ( b.x >= a.x + a.w - 1 ) {
			return 'right';
		}
		return a.x >= b.x + b.w - 1 ? 'left' : null;
	}
	return b.y >= a.y + a.h - 1 ? 'below' : null;
}

// The label of a button without the amount it carries ("Add to basket · £21.50" is "Add to basket").
export const labelOf = ( text ) => String( text ).replace( AMOUNT, '' ).replace( /[\s·•|–-]+$/, '' ).trim();

export function evaluateModes( { block, rules, rows, reads, others = null, written = null } ) {
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
		if ( rule.whenLargest ) {
			const numberOf = ( i ) => {
				const m = /\d+/.exec( String( i?.text || '' ) );
				return m ? Number( m[ 0 ] ) : null;
			};
			const mine = numberOf( instances( reads, rule.whenLargest.part )[ 0 ] );
			const theirs = instances( reads, rule.whenLargest.over ).map( numberOf ).filter( ( n ) => null !== n );
			if ( null === mine || ! theirs.length || theirs.some( ( n ) => n >= mine ) ) {
				out.settings[ rule.setting ] = { code: 'notLargest' };
				continue;
			}
		}
		if ( rule.whenFound && ! has( reads, rule.whenFound ) ) {
			out.settings[ rule.setting ] = { code: 'notDrawn' };
			continue;
		}
		// A switch that makes other settings paint (the chips' sgsChipPaintButtons for WooCommerce's chip colours) is on where the
		// look pairing writes one of them (`written`: the attribute names the pairing wrote).
		if ( rule.whenWritten && ! [].concat( rule.whenWritten ).some( ( a ) => written?.has( a ) ) ) {
			out.settings[ rule.setting ] = { code: 'notWritten' };
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
		const unsure = rule.whenAbsent ? [].concat( rule.unsure || [] ).filter( ( part ) => has( reads, part ) ) : [];
		if ( unsure.length ) {
			const list = unsure.flatMap( ( part ) => instances( reads, part ).map( ( i ) => `${ part } ${ JSON.stringify( i.text ?? '' ) }` ) );
			gap( `the draft draws no ${ [].concat( rule.whenAbsent ).join( ' or ' ) } the locator places, but it draws an element of that kind, so the switch is left unwritten`, list.join( '; ' ) );
			out.settings[ rule.setting ] = { code: 'unsure' };
			continue;
		}
		let value = rule.value;
		let evidence = rule.whenStyle ? `every ${ rule.whenStyle.part } of the draft reads ${ rule.whenStyle.style } ${ rule.whenStyle.equals }` : rule.whenAbsent ? `the draft draws no ${ [].concat( rule.whenAbsent ).join( ' or ' ) } at any width` : ( rule.whenFound ? `the draft draws ${ rule.whenFound }` : ( rule.reason || '' ) );
		if ( rule.from?.text ) {
			const cut = ( t ) => {
				const tail = rule.from.minus ? instances( reads, rule.from.minus ).map( ( i ) => String( i.text || '' ) ).find( ( x ) => x && String( t ).endsWith( x ) ) : null;
				return tail ? String( t ).slice( 0, -tail.length ).trim() : t;
			};
			let texts = [ ...new Set( instances( reads, rule.from.text ).map( ( i ) => cut( rule.from.label ? labelOf( i.text ) : i.text ) ).map( ( t ) => ( rule.from.bare ? bareOf( t ) : t ) ) ) ];
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
		} else if ( rule.from?.prefix ) {
			const texts = instances( reads, rule.from.prefix ).map( ( i ) => String( i.text || '' ).trim() );
			const heads = [ ...new Set( texts.map( ( t ) => /^(\D*?)\d+$/.exec( t )?.[ 1 ] ?? null ) ) ];
			if ( ! texts.length || 1 !== heads.length || null === heads[ 0 ] ) {
				gap( 'the copies of the part do not all read one prefix followed by a number', `${ rule.from.prefix }: ${ JSON.stringify( texts ) }` );
				continue;
			}
			if ( '' === heads[ 0 ] ) {
				out.settings[ rule.setting ] = { code: 'noPrefix' };
				continue;
			}
			[ value ] = heads;
			evidence = `the draft's ${ rule.from.prefix } reads ${ JSON.stringify( texts.slice( 0, 3 ) ) }`;
		} else if ( rule.from?.words ) {
			const { part, tokens = {} } = rule.from.words;
			let text = String( instances( reads, part )[ 0 ]?.text ?? '' ).replace( /\s+/g, ' ' ).trim();
			for ( const [ token, from ] of Object.entries( tokens ) ) {
				const live = instances( reads, from ).map( ( i ) => String( i.text || '' ).trim() ).filter( Boolean ).find( ( t ) => text.includes( t ) );
				live && ( text = text.replace( live, `{${ token }}` ) );
			}
			if ( AMOUNT_ANY.test( text ) || /\d/.test( text.replace( /\{[a-z]+\}/g, '' ) ) ) {
				gap( 'the draft\'s words carry a live value (a number or an amount) no token of the setting holds', `${ part }: ${ JSON.stringify( text ) }` );
				continue;
			}
			value = text;
			evidence = `the draft's ${ part } says ${ JSON.stringify( text ) }`;
		} else if ( rule.from?.sameRow ) {
			const tops = rule.from.sameRow.map( ( part ) => instances( reads, part )[ 0 ]?.box?.y );
			if ( tops.some( ( t ) => undefined === t ) ) {
				out.settings[ rule.setting ] = { code: 'notDrawn' };
				continue;
			}
			if ( Math.max( ...tops ) - Math.min( ...tops ) > 2 ) {
				out.settings[ rule.setting ] = { code: 'notSameRow' };
				continue;
			}
			evidence = `the draft's ${ rule.from.sameRow.join( ' and ' ) } share a row at the widest width`;
		} else if ( rule.from?.line ) {
			const shadow = String( instances( reads, rule.from.line )[ 0 ]?.styles?.[ 'box-shadow' ] ?? '' );
			if ( ! isLine( shadow ) ) {
				out.settings[ rule.setting ] = { code: 'noLine' };
				continue;
			}
			evidence = `the draft's ${ rule.from.line } is marked by a line on one edge (${ shadow })`;
		} else if ( rule.from?.fills ) {
			const own = instances( reads, rule.from.fills.part )[ 0 ]?.box?.w;
			const widths = instances( reads, rule.from.fills.against ).map( ( i ) => i.box?.w ).filter( ( w ) => w > 0 );
			if ( ! ( own > 0 ) || ! widths.length || Math.abs( own - Math.max( ...widths ) ) > 1 ) {
				out.settings[ rule.setting ] = { code: 'notFull' };
				continue;
			}
			evidence = `the draft's ${ rule.from.fills.part } is as wide as its ${ rule.from.fills.against } (${ Math.round( own ) }px)`;
		} else if ( rule.from?.sameLook ) {
			const { part, other, props } = rule.from.sameLook;
			const theirs = others?.[ other.surface ];
			if ( ! theirs ) {
				gap( `the ${ other.surface } surface was not read in this run, so the look the two buttons share is unknown`, null );
				continue;
			}
			const a = instances( reads, part )[ 0 ]?.styles;
			const b = instances( theirs, other.part )[ 0 ]?.styles;
			if ( ! a || ! b ) {
				out.settings[ rule.setting ] = { code: 'notDrawn' };
				continue;
			}
			const differ = props.filter( ( p ) => String( a[ p ] ?? '' ) !== String( b[ p ] ?? '' ) );
			if ( differ.length ) {
				out.settings[ rule.setting ] = { code: 'lookDiffers' };
				continue;
			}
			evidence = `the draft's ${ part } shares the ${ other.surface } ${ other.part }'s ${ props.join( ', ' ) }`;
		} else if ( rule.from?.paint ) {
			const { part, box, bare } = rule.from.paint;
			const seen = WIDTHS.flatMap( ( w ) => ( reads[ part ]?.[ w ] || [] ).filter( drawn ).map( ( i ) => paintOf( i.styles ) ) );
			if ( ! seen.length || seen.includes( null ) ) {
				out.settings[ rule.setting ] = { code: seen.length ? 'unreadable' : 'notDrawn' };
				continue;
			}
			if ( new Set( seen ).size > 1 ) {
				gap( 'the copies of the part are painted differently and the block holds one value for all of them', `${ part }: ${ JSON.stringify( [ ...new Set( seen ) ] ) }` );
				continue;
			}
			value = 'box' === seen[ 0 ] ? box : bare;
			evidence = `the draft's ${ part } is ${ 'box' === seen[ 0 ] ? 'drawn as a box (a border or a fill)' : 'a bare word (no border, no fill)' }`;
		} else if ( rule.from?.arranged ) {
			const { parts: [ a, b ], row, column } = rule.from.arranged;
			const at = WIDTHS.map( ( w ) => [ w, ( reads[ a ]?.[ w ] || [] ).find( drawn ), ( reads[ b ]?.[ w ] || [] ).find( drawn ) ] ).filter( ( [ , x, y ] ) => x && y );
			if ( ! at.length ) {
				out.settings[ rule.setting ] = { code: 'notDrawn' };
				continue;
			}
			const kinds = at.map( ( [ w, x, y ] ) => {
				const p = placeOf( x.box, y.box );
				return [ w, 'right' === p || 'left' === p ? row : ( 'below' === p || 'below' === placeOf( y.box, x.box ) ? column : null ) ];
			} );
			if ( kinds.some( ( [ , k ] ) => null === k ) ) {
				out.settings[ rule.setting ] = { code: 'notPlaced' };
				continue;
			}
			if ( new Set( kinds.map( ( [ , k ] ) => k ) ).size > 1 ) {
				gap( 'the two parts sit differently at different widths and the block holds one value for all of them', `${ a } and ${ b }: ${ JSON.stringify( Object.fromEntries( kinds ) ) }` );
				continue;
			}
			[ [ , value ] ] = kinds;
			evidence = `the draft's ${ a } and ${ b } sit ${ value === row ? 'side by side' : 'one below the other' } at ${ kinds.map( ( [ w ] ) => w ).join( ', ' ) }`;
		} else if ( rule.from?.placed ) {
			const { part, of, within, right, below } = rule.from.placed;
			const lines = ( p ) => WIDTHS.map( ( w ) => [ w, ( reads[ p ]?.[ w ] || [] ).filter( drawn ) ] ).filter( ( [ , l ] ) => l.length );
			const refPart = [].concat( of ).find( ( p ) => lines( p ).length );
			const own = lines( part );
			if ( ! refPart || ! own.length || ! lines( within ).length ) {
				out.settings[ rule.setting ] = { code: 'notDrawn' };
				continue;
			}
			// Each copy is set against the reference inside the same line (the innermost `within` box holding it), by the elements' paths.
			const inside = ( outer, el ) => String( el.key ).startsWith( `${ outer.key }>` );
			const kinds = own.flatMap( ( [ w, list ] ) => list.map( ( i ) => {
				const box = ( reads[ within ]?.[ w ] || [] ).filter( ( l ) => inside( l, i ) ).sort( ( x, y ) => String( y.key ).length - String( x.key ).length )[ 0 ];
				const ref = box && ( reads[ refPart ]?.[ w ] || [] ).filter( drawn ).find( ( r ) => inside( box, r ) );
				return ref ? placeOf( ref.box, i.box ) : undefined;
			} ) ).filter( ( k ) => undefined !== k );
			if ( ! kinds.length ) {
				out.settings[ rule.setting ] = { code: 'notDrawn' };
				continue;
			}
			if ( kinds.includes( null ) || ! ( 'right' === kinds[ 0 ] || 'below' === kinds[ 0 ] ) ) {
				out.settings[ rule.setting ] = { code: 'notPlaced' };
				continue;
			}
			if ( kinds.some( ( k ) => k !== kinds[ 0 ] ) ) {
				gap( 'the copies of the part sit differently and the block holds one value for all of them', `${ part } against ${ refPart }: ${ JSON.stringify( [ ...new Set( kinds ) ] ) }` );
				continue;
			}
			value = 'right' === kinds[ 0 ] ? right : below;
			evidence = `the draft's ${ part } sits ${ 'right' === kinds[ 0 ] ? 'at the right of' : 'beneath' } its line's ${ refPart } on every line (${ kinds.length } read)`;
		} else if ( rule.from?.tiers ) {
			const tiers = [ [ 'desktop', 1440 ], [ 'tablet', 768 ], [ 'mobile', 375 ] ];
			const states = tiers.map( ( [ , w ] ) => ( neighbours.every( ( n ) => ( reads[ n ]?.[ w ] || [] ).length ) ? ( ( reads[ rule.from.tiers ]?.[ w ] || [] ).length ? 'on' : 'off' ) : null ) );
			if ( states.includes( null ) ) {
				out.settings[ rule.setting ] = { code: 'neighboursNotFound' };
				continue;
			}
			if ( states.every( ( st ) => st === states[ 0 ] ) ) {
				out.settings[ rule.setting ] = { code: 'same' };
				continue;
			}
			value = {};
			states.forEach( ( st, i ) => ( 0 === i || st !== states[ i - 1 ] ) && ( value[ tiers[ i ][ 0 ] ] = st ) );
			evidence = `the draft draws ${ rule.from.tiers } ${ tiers.map( ( [ name ], i ) => `${ states[ i ] } at ${ name }` ).join( ', ' ) }`;
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
