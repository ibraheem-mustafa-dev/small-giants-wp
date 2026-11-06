// Chrome rules, logo: the animated SVG logo. The client's `logo-svgparts.json` holds the attributes (inlineSvg, svgParts, trigger,
// hover cooldown) of the logo's per-part animation; sgs/responsive-logo takes them as they are, sgs/nav-drawer takes the same
// four under its `chromeLogo` names. The drawer's logo replays on every open (the draft replays its entrance each time the
// drawer opens), so its trigger is every-visible.
import { settle } from './apply-chrome-records.mjs';

const DRAWER = { inlineSvg: 'chromeLogoInlineSvg', svgParts: 'chromeLogoSvgParts', svgPartsTrigger: 'chromeLogoSvgPartsTrigger', svgPartsHoverCooldown: 'chromeLogoSvgPartsHoverCooldown' };

export function logoRule( { block, target, saved, clientData } ) {
	if ( target.slot || ! [ 'sgs/responsive-logo', 'sgs/nav-drawer' ].includes( block ) ) {
		return [];
	}
	const data = clientData?.logo;
	if ( ! data ) {
		return [ { status: 'no-setting', prop: 'svgParts', why: 'the client has no build/logo-svgparts.json, so no part animation value to write' } ];
	}
	const drawer = 'sgs/nav-drawer' === block;
	const writes = Object.entries( data ).map( ( [ attr, value ] ) => ( {
		attr: drawer ? DRAWER[ attr ] : attr,
		value: drawer && 'svgPartsTrigger' === attr ? 'every-visible' : value,
	} ) ).filter( ( w ) => w.attr );
	return [ settle( { prop: 'svgParts', why: `${ target.tpl } draws the animated logo`, saved, writes } ) ];
}
