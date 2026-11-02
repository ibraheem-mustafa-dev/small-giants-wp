/**
 * The gallery's layout at each device tier, after the carousel rewrite (the editor twin of
 * `sgs_gallery_layout_tiers()` in includes/helpers-gallery-grid-css.php).
 *
 * `layout` is a `{desktop, tablet, mobile}` object; an empty tier inherits the tier above and an empty object is a grid.
 * A carousel is one piece of markup and script for the whole block, so it is honoured only when all three tiers resolve
 * to it; otherwise every carousel tier is a swipe row (`scroll`).
 *
 * @package SGS\Blocks
 */

const LAYOUTS = [ 'grid', 'masonry', 'scroll', 'carousel' ];

/**
 * @param {Object} layout The stored `layout` tier object.
 * @return {{desktop:string,tablet:string,mobile:string,carousel:boolean,rewritten:boolean,scroll:boolean}} The tiers.
 */
export function galleryLayoutTiers( layout ) {
	const stored = layout && typeof layout === 'object' ? layout : {};
	const own = ( tier ) =>
		LAYOUTS.includes( stored[ tier ] ) ? stored[ tier ] : null;
	const desktop = own( 'desktop' ) ?? 'grid';
	const tablet = own( 'tablet' ) ?? desktop;
	const mobile = own( 'mobile' ) ?? tablet;
	const tiers = { desktop, tablet, mobile };
	const count = Object.values( tiers ).filter( ( v ) => v === 'carousel' ).length;
	const carousel = count === 3;
	const rewritten = count > 0 && ! carousel;
	if ( rewritten ) {
		Object.keys( tiers ).forEach( ( tier ) => {
			if ( tiers[ tier ] === 'carousel' ) {
				tiers[ tier ] = 'scroll';
			}
		} );
	}
	return {
		...tiers,
		carousel,
		rewritten,
		scroll: Object.values( tiers ).includes( 'scroll' ),
	};
}
