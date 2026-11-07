// Chrome rule: a hover ground the draft does not have. When the draft element's background is the same hovered as at rest and the
// live block holds a backgroundColourHover (and, if it has a resting ground, a different one) that paints on hover, the setting is
// cleared. The cloner copied a hover tint from a child (the back-to-top ring) onto the control that hosts it.
import { colourValue } from './apply-probe-items.mjs';
import { settle } from './apply-chrome-records.mjs';

const TOP = 1440;

export function groundRule( ctx ) {
	const { saved, target, draft, live, snapshot } = ctx;
	if ( target.slot || ! saved.backgroundColourHover ) {
		return [];
	}
	const d = draft[ TOP ];
	const l = live[ TOP ];
	if ( ! d?.hover || ! d.styles || ! l?.hover || d.hover.unreached || l.hover.unreached ) {
		return [];
	}
	const want = colourValue( d.hover[ 'background-color' ], snapshot );
	const rest = colourValue( d.styles[ 'background-color' ], snapshot );
	const have = colourValue( l.hover[ 'background-color' ], snapshot );
	if ( ! want || ! rest || ! have || want !== rest || have === want ) {
		return [];
	}
	return [ settle( { prop: 'backgroundColourHover', why: `${ target.tpl } the draft keeps ${ rest } on hover; the live block paints ${ have } (backgroundColourHover ${ saved.backgroundColourHover })`, saved, writes: [ { attr: 'backgroundColourHover', unset: true } ], state: 'hover' } ) ];
}
