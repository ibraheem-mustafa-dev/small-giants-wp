// The one rule two computed values compare by (Spec 48 FR-48-86), shared by the equivalence engine (./values.mjs), Fill's
// tier comparison (lib/fill-prop.mjs::tiersDiffering) and the live judge of UNMAPPED rows
// (lib/confirm-live.mjs::judgeUnmapped), so no layer holds a value another would write. A keyword is first read as the
// value the browser paints for it where the element's context decides that (paintCanon), then two lengths agree within
// half a pixel, except a letter or word spacing (a tracking value is a fraction of a pixel, so it compares exactly) and a
// keyword that became 0px against a stated length (the walker, parity/lib/compare.mjs::sameValue, compares the keyword as
// text, so -0.17px against normal is a difference there; only an exact 0px matches it here).
import { createRequire } from 'module';
import { sameValue } from '../../../parity/lib/compare.mjs';
import { longhandsOf } from '../css-families.mjs';

const MDN = createRequire( import.meta.url )( 'mdn-data/css/properties.json' );

// The tolerance two MEASURED renders compare within (Spec 48 FR-48-36, R-47-5; Bean 2026-11-24). It never decides whether
// a stated value is written: that is exactPaint, which holds a draft value equal to the default only when it is exactly it.
// Every px or fractional tolerance in the route's lib comes from here (tests/tolerance-literals.test.mjs refuses a literal).
export const PX_TOL = 0.5;
// The tolerance for the sub-pixel difference between two measured boxes (their position and size), and for a transform pose.
export const BOX_TOL = PX_TOL;
export const SCALE_TOL = 0.011;
export const ROTATE_TOL = 1;
// A value that equals another at this precision is the same value: a computed length is read at 1/64px, so two reads of
// one stated length never differ by more than this.
export const READ_EPSILON = 0.001;
// The properties whose lengths compare exactly.
export const EXACT = [ 'letter-spacing', 'word-spacing' ];

// The properties whose `normal` paints as a 0 length: mdn-data's `normal | <length>` and `normal | <length-percentage>`
// properties (letter-spacing, word-spacing, row-gap, column-gap), and every shorthand all of whose longhands are one.
const NORMAL_ZERO_LONGHANDS = Object.keys( MDN ).filter( ( p ) => /^normal \| <length(?:-percentage)?>$/.test( MDN[ p ].syntax ) );
export const NORMAL_ZERO = [ ...NORMAL_ZERO_LONGHANDS, ...Object.keys( MDN ).filter( ( p ) => ! NORMAL_ZERO_LONGHANDS.includes( p ) && Array.isArray( MDN[ p ].computed ) && longhandsOf( p ).length > 1 && longhandsOf( p ).every( ( l ) => NORMAL_ZERO_LONGHANDS.includes( l ) ) ) ];

const FLEX_OR_GRID = /(?:^|[-\s])(?:flex|grid)$|^-webkit-(?:inline-)?box$/;
const OUT_OF_FLOW = /^(?:absolute|fixed)$/;
// CSS Display 3 §2.7: an inline-level display computes as its block-level twin on a box that is blockified.
const BLOCKIFIED = { inline: 'block', 'inline-block': 'block', 'inline-flex': 'flex', 'inline-grid': 'grid', 'inline-table': 'table', '-webkit-inline-box': '-webkit-box' };
const known = ( v ) => undefined !== v && null !== v && '' !== v;

// A value as the browser paints it, for comparing. ctx: { parentDisplay, position, direction } of the element at the
// width, each optional. An inline-level display is its block-level twin on a flex or grid item and on an out-of-flow box
// (CSS Display 3 §2.7, blockification; an unknown parent leaves it as it is). A `normal` spacing or gap is 0px; an `auto` minimum height is 0px only on a box that is no flex or
// grid item (CSS Sizing 3 §5.2: on an item it is content-based), so an unknown parent leaves it as `auto`; text-align
// start and end are their physical sides only where the direction is read (CSS Text 3 §6.1), else left as they are.
export function paintCanon( prop, v, ctx = {} ) {
	if ( undefined === v || null === v ) {
		return v;
	}
	const s = String( v ).trim();
	if ( 'normal' === s && NORMAL_ZERO.includes( prop ) ) {
		return '0px';
	}
	if ( 'display' === prop && BLOCKIFIED[ s ] ) {
		const blockified = known( ctx.position ) && OUT_OF_FLOW.test( ctx.position ) ? true : ( known( ctx.parentDisplay ) && 'contents' !== ctx.parentDisplay ? FLEX_OR_GRID.test( ctx.parentDisplay ) : false );
		return blockified ? BLOCKIFIED[ s ] : v;
	}
	if ( 'auto' === s && 'min-height' === prop ) {
		const item = known( ctx.position ) && OUT_OF_FLOW.test( ctx.position ) ? false : ( known( ctx.parentDisplay ) && 'contents' !== ctx.parentDisplay ? FLEX_OR_GRID.test( ctx.parentDisplay ) : null );
		return false === item ? '0px' : v;
	}
	if ( 'text-align' === prop && /^(?:start|end)$/.test( s ) && /^(?:ltr|rtl)$/.test( ctx.direction ?? '' ) ) {
		return ( 'start' === s ) === ( 'ltr' === ctx.direction ) ? 'left' : 'right';
	}
	return v;
}

// The px tolerance two values of `prop` compare within (see the header).
export function toleranceFor( prop, a, b, ctx = {} ) {
	if ( EXACT.includes( prop ) ) {
		return 0;
	}
	return ( paintCanon( prop, a, ctx ) !== a ) === ( paintCanon( prop, b, ctx ) !== b ) ? PX_TOL : 0;
}

// Whether two computed values of `prop` paint the same under the shared rule.
export function samePaint( prop, a, b, ctx = {} ) {
	if ( undefined === a || undefined === b || null === a || null === b ) {
		return false;
	}
	return sameValue( prop, String( paintCanon( prop, a, ctx ) ).trim(), String( paintCanon( prop, b, ctx ) ).trim(), toleranceFor( prop, a, b, ctx ) );
}

// Whether a STATED value (the draft's) equals the default exactly, for the decision to write it (Spec 48 R-47-5, FR-48-36):
// the paint canon applies, a colour matches within its ΔE rule, and a length matches only when equal (READ_EPSILON is the
// serialisation noise of one computed length, not a design tolerance), so a 1.5px bar is not the 2px default.
export function exactPaint( prop, a, b, ctx = {} ) {
	if ( undefined === a || undefined === b || null === a || null === b ) {
		return false;
	}
	return sameValue( prop, String( paintCanon( prop, a, ctx ) ).trim(), String( paintCanon( prop, b, ctx ) ).trim(), READ_EPSILON );
}
