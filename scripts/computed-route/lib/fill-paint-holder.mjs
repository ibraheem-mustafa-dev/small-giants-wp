// The element that paints a state surface's panel (FR-48-36, register C2 PI-6). A surface that exists only while a draft
// state holds (a mega-menu panel, a drawer, a modal) names as its root the element holding its content; the draft often
// paints the panel's border, radius, ground and shadow on a wrapper just outside that element (a mega panel's 1px border,
// 12px radius and white ground sit on the div that holds the panel's content). Reading only the root says the panel
// paints nothing there, and Fill would write that as the panel's own look. The wrapper counts as the surface's own
// paint element when it holds only the element below it, is no other node's element and the chain from the root to it
// holds only such single-child wrappers; the first wrapper in the chain that paints a group (border, radius, ground,
// shadow) the root does not paint gives that group's values to the root's read.

// The properties of each paint group, as Fill reads them (lib/fill-read.mjs::PROPS).
export const PAINT_GROUPS = {
	border: [ 'border-top-width', 'border-top-style', 'border-top-color', 'border-right-width', 'border-right-style', 'border-right-color', 'border-bottom-width', 'border-bottom-style', 'border-bottom-color', 'border-left-width', 'border-left-style', 'border-left-color' ],
	radius: [ 'border-radius' ],
	ground: [ 'background-color', 'background-image' ],
	shadow: [ 'box-shadow' ],
};

// The attribute that stamps a painting wrapper for the declared read.
// The declared longhands of each group (a radius is declared as its four corners).
export const GROUP_DECLARED = {
	border: /^border-(top|right|bottom|left)-(width|style|color)$/,
	radius: /^border-((top|bottom)-(left|right)-)?radius$/,
	ground: /^background-(color|image)$/,
	shadow: /^box-shadow$/,
};

export const PAINT_ATTR = 'data-fill-paint';

// In-page. For each surface-root job, the groups its wrapper chain paints that the root does not: { [job id]: { depth
// (wrappers climbed), groups: [name], stamps: { [group]: selector }, styles: { [prop]: computed value } } }. A job whose element is not found, or whose
// chain paints nothing more, is left out. Each painting wrapper is stamped once with PAINT_ATTR (`<node index>-<wrappers climbed>`),
// and `stamps` names the selector of each group's wrapper for the declared read.
export function paintHoldersInPage( [ jobs, resolveSrc, groups, attr ] ) {
	// eslint-disable-next-line no-new-func
	const resolve = new Function( `return (${ resolveSrc });` )();
	const SIDES = [ 'top', 'right', 'bottom', 'left' ];
	const painted = {
		border: ( cs ) => SIDES.some( ( s ) => parseFloat( cs.getPropertyValue( `border-${ s }-width` ) ) > 0 && 'none' !== cs.getPropertyValue( `border-${ s }-style` ) && 'hidden' !== cs.getPropertyValue( `border-${ s }-style` ) ),
		radius: ( cs ) => [ 'top-left', 'top-right', 'bottom-right', 'bottom-left' ].some( ( c ) => parseFloat( cs.getPropertyValue( `border-${ c }-radius` ) ) > 0 ),
		ground: ( cs ) => ( ! /^(rgba\(.*,\s*0\)|transparent)$/.test( cs.backgroundColor ) ) || 'none' !== cs.backgroundImage,
		shadow: ( cs ) => 'none' !== cs.boxShadow,
	};
	const out = {};
	for ( const j of jobs.filter( ( x ) => x.surfaceRoot ) ) {
		const el = resolve( j.finder );
		if ( ! el ) {
			continue;
		}
		const own = getComputedStyle( el );
		const found = {};
		const open = Object.keys( groups ).filter( ( g ) => ! painted[ g ]( own ) );
		let node = el;
		let depth = 0;
		while ( open.some( ( g ) => ! ( g in found ) ) && node.parentElement && ! [ document.body, document.documentElement ].includes( node.parentElement ) ) {
			const up = node.parentElement;
			const owner = up.getAttribute( 'data-fill-owner' );
			if ( 1 !== up.children.length || ( null !== owner && owner !== String( j.owner ) ) ) {
				break;
			}
			node = up;
			depth++;
			const cs = getComputedStyle( node );
			for ( const g of open.filter( ( x ) => ! ( x in found ) && painted[ x ]( cs ) ) ) {
				found[ g ] = { depth, el: node, styles: Object.fromEntries( groups[ g ].map( ( p ) => [ p, cs.getPropertyValue( p ) ] ) ) };
			}
		}
		const names = Object.keys( found );
		if ( ! names.length ) {
			continue;
		}
		names.forEach( ( g ) => found[ g ].el.setAttribute( attr, `${ j.owner }-${ found[ g ].depth }` ) );
		out[ j.id ] = { groups: names, stamps: Object.fromEntries( names.map( ( g ) => [ g, `[${ attr }="${ j.owner }-${ found[ g ].depth }"]` ] ) ), depth: Math.max( ...names.map( ( g ) => found[ g ].depth ) ), styles: Object.assign( {}, ...names.map( ( g ) => found[ g ].styles ) ) };
	}
	return out;
}

// A root target holds its wrapper's values for the groups the wrapper paints, in place of its element's own: the
// rendered value in the snapshot and the declared value (read from the stamped wrapper) in the declared read. Declared
// values the root itself states are kept. snap: widths[w]; declared: declared[w]; held: paintHoldersInPage's result at
// this width; wrapperDeclared: { [job id]: { [group]: the stamped wrapper's declared longhands | null } }.
export function applyPaintHolders( widths, declared, held, wrapperDeclared = {} ) {
	for ( const [ id, h ] of Object.entries( held || {} ) ) {
		const snap = widths?.[ id ];
		if ( ! snap || snap.missing || ! snap.styles ) {
			continue;
		}
		Object.assign( snap.styles, h.styles );
		snap.paintHolder = { depth: h.depth, groups: h.groups };
		const byGroup = wrapperDeclared[ id ];
		if ( byGroup && declared ) {
			const own = ( declared[ id ] ??= {} );
			for ( const g of h.groups ) {
				const wrap = byGroup[ g ] || {};
				Object.keys( wrap ).filter( ( p ) => GROUP_DECLARED[ g ].test( p ) ).forEach( ( p ) => ( own[ p ] = wrap[ p ] ) );
			}
		}
	}
}
