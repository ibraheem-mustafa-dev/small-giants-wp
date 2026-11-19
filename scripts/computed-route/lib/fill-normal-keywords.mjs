// A `normal` keyword a numeric setting cannot hold, written as the value it renders (the class (b) `shape: normal cannot be
// held` rows of the residual classifier, lib/fill-residual-css.mjs):
//   - letter-spacing: normal is no added spacing (CSS Text 3 §8.2: its used value is 0), so it is 0px;
//   - line-height: normal is the font's own line height, which the draft read measures where it computes to normal
//     (lib/fill-read-collect.mjs `normalLineHeight`, px: one line box of the element's font), written as that length (the
//     resolver formats it) together with its declared form, the unitless ratio of that height to the element's font size:
//     `normal` inherits as a keyword each descendant resolves in its own font, and a unitless number is the length form
//     that inherits as a ratio too, where an em or px length would hand every descendant the parent's fixed height.
// A width is left as read where the block already paints `normal` there (`base(w)`: nothing differs, so nothing is written)
// or where the read has no measurement. Returns { draft, declared ({ width: ratio } for line-height), changed: [ { width,
// from, to } ] }.
export const NORMAL_KEYWORD_PROPS = [ 'letter-spacing', 'line-height' ];

export function normalKeywords( prop, draft, { snaps = {}, base = () => undefined } = {} ) {
	if ( ! NORMAL_KEYWORD_PROPS.includes( prop ) ) {
		return { draft, declared: {}, changed: [] };
	}
	const out = { ...draft };
	const changed = [];
	const declared = {};
	for ( const [ w, v ] of Object.entries( draft ) ) {
		if ( 'normal' !== String( v ).trim() || 'normal' === String( base( Number( w ) ) ?? '' ).trim() ) {
			continue;
		}
		const px = 'letter-spacing' === prop ? 0 : Number( snaps[ w ]?.normalLineHeight );
		if ( ! Number.isFinite( px ) || ( 'line-height' === prop && px <= 0 ) ) {
			continue;
		}
		out[ w ] = `${ Math.round( px * 1000 ) / 1000 }px`;
		const font = parseFloat( snaps[ w ]?.styles?.[ 'font-size' ] );
		'line-height' === prop && font > 0 && ( declared[ w ] = String( Math.round( ( px / font ) * 1000 ) / 1000 ) );
		changed.push( { width: Number( w ), from: v, to: out[ w ] } );
	}
	return { draft: out, declared, changed };
}
