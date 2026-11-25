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

// In page (it holds everything it uses, so a page.evaluate can carry its source): where the element's line-height computes to
// normal, the px height of one line box of its font at normal, else null. Fill's draft read (lib/fill-read-collect.mjs) and the
// applier's probes (lib/apply-probes.mjs) both read it, so the two stages write the same value for the same `normal`.
export function normalLineBox( el ) {
	const cs = getComputedStyle( el );
	if ( 'normal' !== cs.lineHeight ) {
		return null;
	}
	const probe = document.createElement( 'div' );
	probe.style.cssText = 'position:absolute;visibility:hidden;left:-99999px;top:0;margin:0;padding:0;border:0;white-space:nowrap;line-height:normal';
	for ( const p of [ 'font-family', 'font-size', 'font-weight', 'font-style', 'font-stretch', 'font-variant', 'font-feature-settings', 'font-variation-settings', 'font-optical-sizing' ] ) {
		probe.style.setProperty( p, cs.getPropertyValue( p ) );
	}
	probe.textContent = 'Hg';
	document.body.appendChild( probe );
	const lh = probe.getBoundingClientRect().height;
	probe.remove();
	return lh > 0 ? Math.round( lh * 1000 ) / 1000 : null;
}

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
