// The setting-level predictor (Spec 48 FR-48-76, the part Fill can run before any build): what a written setting's value
// will paint on its calibrated element at each read width, from the write and the block's calibration alone. The confirm
// record compares that paint with what the draft renders (lib/fill-confirm.mjs::confirmRecords), so a value whose
// predicted paint is not the draft's is not confirmed: D–R agreeing proves the draft's code and render match, not that
// the setting emits it (a tier that stays on the block's own fallback, a palette slug the site resolves to another colour,
// a side of an edge box the setting never prints).
import { paintedAt, slugColour } from './fill-held.mjs';
import { defaultPaint } from './fill-prop.mjs';
import { familyOf, partKey } from './css-families.mjs';
import { samePaint } from './css-equivalence/tolerance.mjs';
import { parseColour, deltaE, COLOUR_DE } from './normalise.mjs';

// A value the browser resolves against something this predictor does not hold (a relative unit, a percentage, a viewport
// unit, a run-time function) is not predicted: the render alone says what it paints.
const UNPREDICTED = /(?:var|calc|clamp|min|max|env|attr)\(|%|\d(?:r?em|ch|ex|lh|rlh|vw|vh|vmin|vmax|dvh|svh|lvh|cq[whib])/i;
// The properties whose bare number is the CSS value itself (a unitless number), not a design token's name.
// The properties whose value may be a palette slug (a colour token's name).
const COLOUR_PROP = /(?:^|-)colou?r$/;
const UNITLESS = /^(?:font-weight|line-height|opacity|z-index|flex-grow|flex-shrink|order)$/;

// Whether a written value is a form this predictor reads as the CSS value it paints: a colour (a hex or rgb colour, or a
// palette slug resolved before this), a px length or zero, a unitless number on a unitless property, or a keyword the
// attribute's own enum lists. Any other bare word is a design token's name (a font family slug, a spacing step), which the
// site resolves and the predictor does not.
function readable( prop, value, schemaAttr ) {
	const v = value.trim();
	return !! parseColour( v ) || /^-?\d*\.?\d+px$/.test( v ) || '0' === v || ( UNITLESS.test( prop ) && /^-?\d*\.?\d+$/.test( v ) ) || ( Array.isArray( schemaAttr?.enum ) && schemaAttr.enum.includes( v ) );
}

// The paint a write gives its property at one width: { value } (a string), or null where it cannot be predicted (no
// calibration, a number or token, a run-time value, a shape the property's family does not name). w: a Fill write ({ prop,
// slot, attr, after, how, widths }); cal: the block's calibration; palette: the site's tokens (lib/normalise.mjs::loadSnapshot);
// schema: the block's attribute schema (lib/resolve.mjs::blockSchema).
export function predictedPaint( w, x, cal, palette = [], schema = null ) {
	if ( ! cal || ! w.prop || w.from || /::(?:before|after)$/.test( String( w.slot ?? '' ) ) ) {
		return null;
	}
	const own = ( n ) => defaultPaint( cal, w.slot ?? '', n, w.prop );
	const painted = paintedAt( w, x, w.prop, own );
	// A tier the write leaves to the block shows the block's own paint there.
	let value = null === painted ? own( x ) : COLOUR_PROP.test( w.prop ) ? slugColour( painted.value, palette ) : painted.value;
	if ( value && 'object' === typeof value ) {
		const fam = familyOf( w.prop );
		if ( ! fam || 'mixed' === fam.kind ) {
			return null;
		}
		const side = value[ 'corner' === fam.kind ? partKey( fam.part ) : fam.part ];
		// An edge box prints only the sides it states: an unstated side shows the block's own paint.
		value = undefined === side ? own( x ) : side;
	}
	if ( 'string' !== typeof value || UNPREDICTED.test( value ) || ! readable( w.prop, value, schema?.[ w.attr ] ) ) {
		return null;
	}
	return { value: value.trim() };
}

// The comparison of one write's predicted paint with the draft's render at a width: { predicted, ep } where ep is 'agree',
// 'differs' or null (not predicted, or the render unread). ctx: the element's context for the comparison (canon()).
export function emitterCheck( w, x, rendered, cal, palette = [], schema = null, ctx = {} ) {
	const p = predictedPaint( w, x, cal, palette, schema );
	if ( ! p || null == rendered || '' === String( rendered ).trim() ) {
		return { predicted: p?.value ?? null, ep: null };
	}
	const seen = String( rendered ).trim();
	// Two colours compare as colours (a hex written value against the browser's rgb()); anything else by the shared rule.
	const [ a, b ] = [ parseColour( p.value ), parseColour( seen ) ];
	const ok = a && b ? deltaE( a, b ) <= COLOUR_DE && Math.abs( a.a - b.a ) <= 0.02 : samePaint( w.prop, p.value, seen, ctx );
	return { predicted: p.value, ep: ok ? 'agree' : 'differs' };
}
