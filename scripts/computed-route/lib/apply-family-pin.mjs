// Applier family: pins. A draft column with position sticky and a top stays in view while its neighbour scrolls. The live
// block's native pin (sgs/container pinEdge, pinBelowHeader, pinGap) does the same; the top a draft states is the sticky
// header's height plus a gap. A Custom CSS rule that only stands in for the pin is removed with it.
import { TIER_WIDTHS } from './fill-prop.mjs';

const TIER_OF = { [ TIER_WIDTHS[ 0 ] ]: 'desktop', [ TIER_WIDTHS[ 1 ] ]: 'tablet', [ TIER_WIDTHS[ 2 ] ]: 'mobile' };
const POSITION_RULE = /@media[^{]*\{\s*&\s*\{\s*position:\s*(?:static|sticky);?\s*\}\s*\}|&\s*\{\s*position:\s*sticky;?\s*\}/g;

// The Custom CSS left once its position rules are gone; '' when nothing else was in it.
export const withoutPositionRules = ( css ) => String( css ?? '' ).replace( POSITION_RULE, '' ).trim();

export const pinned = ( styles ) => 'sticky' === styles.position && /px$/.test( styles.top ?? '' );

export const pin = {
	name: 'pin',
	props: [ 'position', 'top' ],
	decide( { target, draft, live, saved, block, headers } ) {
		const widths = Object.keys( draft ).filter( ( w ) => draft[ w ] );
		const at = widths.filter( ( w ) => pinned( draft[ w ].styles ) );
		if ( ! at.length ) {
			return [];
		}
		if ( 'sgs/container' !== block ) {
			return [ { status: 'no-setting', prop: 'position', why: `${ block } has no native pin` } ];
		}
		if ( at.every( ( w ) => live[ w ] && pinned( live[ w ].styles ) ) ) {
			return [ { status: 'equal', prop: 'position', why: 'the live block pins' } ];
		}
		const pinEdge = {};
		const pinBelowHeader = {};
		const pinGap = {};
		for ( const w of widths ) {
			const tier = TIER_OF[ w ];
			if ( ! tier ) {
				continue;
			}
			if ( ! at.includes( w ) ) {
				pinEdge[ tier ] = 'none';
				continue;
			}
			const top = parseFloat( draft[ w ].styles.top );
			const gap = top - ( headers[ w ] ?? 0 );
			if ( gap < 0 ) {
				return [ { status: 'no-setting', prop: 'top', why: `top ${ top }px sits under the ${ headers[ w ] }px header at ${ w }` } ];
			}
			pinEdge[ tier ] = 'top';
			pinBelowHeader[ tier ] = headers[ w ] ? 'on' : 'off';
			pinGap[ tier ] = `${ Math.round( gap ) }px`;
		}
		const writes = [ { attr: 'pinEdge', value: pinEdge }, { attr: 'pinBelowHeader', value: pinBelowHeader }, { attr: 'pinGap', value: pinGap } ];
		const css = saved.sgsCustomCss;
		if ( css ) {
			const rest = withoutPositionRules( css );
			if ( ! rest ) {
				writes.push( { attr: 'sgsCustomCss', unset: true }, { attr: 'sgsCustomCssId', unset: true }, { attr: 'sgsCustomCssNote', unset: true } );
			} else if ( rest !== css ) {
				writes.push( { attr: 'sgsCustomCss', value: rest } );
			}
		}
		return [ {
			status: 'op',
			prop: 'position',
			why: `${ target.tpl } pins at top ${ at.map( ( w ) => draft[ w ].styles.top ).join( '/' ) }`,
			writes,
			checks: at.filter( ( w ) => TIER_OF[ w ] ).map( ( w ) => ( { width: Number( w ), prop: 'position', want: 'sticky' } ) ),
		} ];
	},
};
