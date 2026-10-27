// The content band's width (Spec 48 FR-48-8, Spec 02 container `contentWidth`) for Fill. A block built on the shared container
// wrapper renders its children inside a content band (`.sgs-container__inner`) whose width its band setting caps; the draft
// has no such element, so no finder reads it and the band would keep the setting's default (the theme content size), capping
// a full-bleed draft section. The draft's render states the band instead (R-47-4: the render is the source for a value the
// draft's code never states): the draft element is both the block's root and its band, so the band is the element's padding
// box, and its children are laid out in its content box. Only a child that would otherwise stretch to the content box can
// show a cap: a block-level child in block flow, or in a flex column whose cross axis stretches. At each read width (375, 768,
// 1440: the widths every layout property is read at; 1024 and 1920 read lengths only, so they cannot tell a child sized by
// itself from a capped one):
//   - spans  the children's horizontal extent fills the content box, or every child narrower than it is held there by its own
//            declared width or ceiling or does not stretch (its own setting or layout carries that), or the element lays its
//            children out in a flex row, an aligned flex column or a grid (their extent is that layout, not a cap). The band
//            must be at least the element's padding box.
//   - capped the stretching children take a narrower extent centred in the content box: the band is that extent plus the
//            element's horizontal padding (the band is border-box and carries the padding).
// A child that is not drawn, or is out of flow, says nothing. The band setting's value is chosen from what holds every
// width's need: the value the node already holds (its default included) when that holds them all, so nothing is written;
// otherwise `full` where the band spans and the cap where it is capped, a cap equal to the theme's content or wide size
// written as that preset (`normal`, `wide`), any other as its px length; a narrower tier is written only where the wider
// tier's value does not hold it. Which setting is the band's comes from the framework DB (the block's max-width setting on
// its `content` slot) and the block's calibration (the slot it paints); the resolver confirms it holds max-width there.
// The preset names and what each resolves to are the wrapper's contract (Spec 02,
// plugins/sgs-blocks/includes/class-sgs-container-wrapper.php::render): `full` is no cap, `normal` the theme content size,
// `wide` the theme wide size, any other value a CSS length.
import { resolve, blockSchema, LOOSE } from './resolve.mjs';
import { setAttr } from './tree.mjs';

const TOL = 1;
const TIERS = [ [ 'desktop', [ 1440 ] ], [ 'tablet', [ 768 ] ], [ 'mobile', [ 375 ] ] ];
// A child's display that fills its container's inline size in block flow.
const BLOCK_LEVEL = /^(block|flow-root|flex|grid|list-item|table)$/;
const CASCADE = { desktop: [ 'desktop' ], tablet: [ 'tablet', 'desktop' ], mobile: [ 'mobile', 'tablet', 'desktop' ] };
const NO_SIZE = new Set( [ '', 'auto', 'none', 'normal', 'initial', 'unset', 'revert' ] );
const px = ( v ) => {
	const m = /^(-?\d*\.?\d+)px$/.exec( String( v ?? '' ).trim() );
	return m ? Number( m[ 1 ] ) : null;
};
const round = ( n ) => Math.round( n * 100 ) / 100;
const sum = ( styles, props ) => props.reduce( ( s, p ) => s + ( parseFloat( styles?.[ p ] ) || 0 ), 0 );

const lookups = new WeakMap();
// The block's band setting and the slot it paints: its max-width setting on the DB's `content` slot that the block's
// calibration measured painting an element other than the root. Null when the block has none.
export function bandSetting( db, block, cal ) {
	if ( ! db || ! cal?.settings ) {
		return null;
	}
	if ( ! lookups.has( db ) ) {
		lookups.set( db, db.prepare( "SELECT attr_name FROM block_attributes WHERE block_slug = ? AND css_property = 'max-width' AND canonical_slot = 'content' AND css_state IS NULL" ) );
	}
	for ( const { attr_name: attr } of lookups.get( db ).all( block ) ) {
		const slot = cal.settings[ attr ]?.slot;
		if ( 'string' === typeof slot && '' !== slot ) {
			return { attr, slot };
		}
	}
	return null;
}

// What a band value caps at, in px: Infinity for no cap (no value, '' or `full`), null when it cannot be known. sizes:
// { normal, wide } in px.
export function capOf( value, sizes ) {
	const v = String( value ?? '' ).trim();
	if ( '' === v || 'full' === v ) {
		return Infinity;
	}
	if ( 'normal' === v || 'wide' === v ) {
		return sizes?.[ v ] ?? null;
	}
	return px( v );
}

// The value a tier object holds at a tier, the nearest wider tier carried down.
const at = ( obj, tier ) => CASCADE[ tier ].map( ( t ) => obj?.[ t ] ).find( ( v ) => undefined !== v );

// Whether a band value gives one width's need ({ min } or { exact }).
function holds( value, need, sizes ) {
	const cap = capOf( value, sizes );
	if ( null === cap ) {
		return false;
	}
	return undefined !== need.min ? cap >= need.min - TOL : Math.abs( cap - need.exact ) <= TOL;
}

// One width's need from the draft: { min, why } where the band spans, { exact, why } where it is capped, null without
// evidence. own: the draft element's read; kids: its children's reads; declaredOf( kid ): the child's declared values.
export function bandNeed( own, kids, declaredOf = () => ( {} ) ) {
	if ( ! own?.rect ) {
		return null;
	}
	const s = own.styles || {};
	const box = own.rect.w - sum( s, [ 'border-left-width', 'border-right-width' ] );
	const pad = sum( s, [ 'padding-left', 'padding-right' ] );
	const inner = box - pad;
	const left = own.rect.x + sum( s, [ 'border-left-width', 'padding-left' ] );
	const drawn = kids.filter( ( k ) => k?.rect?.w > 0 && false !== k.inFlow );
	if ( ! drawn.length ) {
		return null;
	}
	const display = s.display ?? '';
	if ( /flex/.test( display ) && /^row/.test( s[ 'flex-direction' ] ?? 'row' ) ) {
		return { min: box, why: 'a flex row' };
	}
	if ( /flex/.test( display ) && ! [ 'normal', 'stretch' ].includes( s[ 'align-items' ] ?? 'normal' ) ) {
		return { min: box, why: `a flex column aligned ${ s[ 'align-items' ] }` };
	}
	if ( /grid/.test( display ) ) {
		return { min: box, why: 'a grid' };
	}
	const sizedBySelf = ( k ) => {
		const d = declaredOf( k ) || {};
		const cap = px( k.styles?.[ 'max-width' ] );
		return ! BLOCK_LEVEL.test( k.styles?.display ?? 'block' ) || ( null !== cap && k.rect.w >= cap - TOL ) || [ 'width', 'max-width' ].some( ( p ) => undefined !== d[ p ] && ! NO_SIZE.has( String( d[ p ] ).trim() ) );
	};
	const free = drawn.filter( ( k ) => ! sizedBySelf( k ) );
	if ( ! free.length ) {
		return { min: box, why: 'each child narrower than the content box is sized by itself or does not stretch' };
	}
	const l = Math.min( ...free.map( ( k ) => k.rect.x ) );
	const r = Math.max( ...free.map( ( k ) => k.rect.x + k.rect.w ) );
	if ( r - l >= inner - TOL ) {
		return { min: box, why: 'the children span the content box' };
	}
	if ( Math.abs( ( l - left ) - ( left + inner - r ) ) > 2 * TOL ) {
		return { min: box, why: 'the children sit off-centre (their own layout, not a band cap)' };
	}
	return { exact: round( r - l + pad ), why: `the children take ${ round( r - l ) }px centred in a ${ round( inner ) }px content box` };
}

// The band value for a set of needs ({ width: need }), given the value the node holds now. Returns { held } when the current
// value gives every need, { value } (a tier object) when another does, { conflict } when no value gives a tier's needs.
// format( n ) writes a custom cap as the setting holds it.
export function bandValue( needs, current, sizes, format = ( n ) => `${ round( n ) }px` ) {
	const widths = Object.keys( needs ).map( Number ).filter( ( w ) => needs[ w ] );
	const tierOf = ( w ) => TIERS.find( ( [ , ws ] ) => ws.includes( w ) )?.[ 0 ];
	if ( widths.every( ( w ) => holds( at( current, tierOf( w ) ), needs[ w ], sizes ) ) ) {
		return { held: true };
	}
	const value = {};
	for ( const [ tier, ws ] of TIERS ) {
		const own = ws.filter( ( w ) => needs[ w ] ).map( ( w ) => needs[ w ] );
		if ( ! own.length ) {
			continue;
		}
		const carried = at( { desktop: current?.desktop, ...value }, tier );
		if ( 'desktop' !== tier && own.every( ( n ) => holds( carried, n, sizes ) ) ) {
			continue;
		}
		const exact = own.find( ( n ) => undefined !== n.exact );
		const pick = ! exact ? 'full' : ( [ 'normal', 'wide' ].find( ( p ) => null != sizes?.[ p ] && Math.abs( sizes[ p ] - exact.exact ) <= TOL ) ?? format( exact.exact ) );
		if ( ! own.every( ( n ) => holds( pick, n, sizes ) ) ) {
			return { conflict: `${ tier }: no one value gives ${ own.map( ( n ) => ( undefined !== n.min ? `at least ${ round( n.min ) }px` : `${ n.exact }px` ) ).join( ' and ' ) }` };
		}
		value[ tier ] = pick;
	}
	if ( ! Object.keys( value ).length ) {
		return { held: true };
	}
	if ( undefined === value.desktop ) {
		value.desktop = current?.desktop ?? 'full';
	}
	return { value };
}

// The theme's content and wide sizes in px, from the client's theme snapshot (settings.layout).
export function themeSizes( rawSnapshot ) {
	const layout = rawSnapshot?.settings?.layout || {};
	return { normal: px( layout.contentSize ), wide: px( layout.wideSize ) };
}

// Fill's band pass for one node: decides and writes the band setting from the draft's render. Returns { attr } when the
// setting was judged (written or held), else null. st: Fill's state (lib/fill-resolve-state.mjs::makeState).
export function fillBand( st, rec, ref, cal ) {
	const band = bandSetting( st.db, rec.name, cal );
	const node = st.flat[ rec.index ];
	const root = rec.targets.find( ( t ) => '' === t.slot );
	// A band a finder reads is the generic path's; a band setting the node already holds was decided before Fill.
	if ( ! band || ! root || ! rec.children?.length || rec.targets.some( ( t ) => LOOSE( t.slot ) === LOOSE( band.slot ) ) || undefined !== node.attributes?.[ band.attr ] ) {
		return null;
	}
	const kidTargets = rec.children.map( ( i ) => st.nodes[ i ]?.targets.find( ( t ) => '' === t.slot ) ).filter( Boolean );
	const needs = {};
	for ( const w of Object.keys( st.reads.widths || {} ).map( Number ) ) {
		if ( ! TIERS.some( ( [ , ws ] ) => ws.includes( w ) ) ) {
			continue;
		}
		const read = ( t ) => st.reads.widths[ w ]?.[ t.id ];
		needs[ w ] = bandNeed( read( root ), kidTargets.map( read ).map( ( k, i ) => k && { ...k, id: kidTargets[ i ].id } ), ( k ) => st.reads.declared?.[ w ]?.[ k.id ] );
	}
	if ( ! Object.values( needs ).some( Boolean ) ) {
		return null;
	}
	const sizes = themeSizes( st.rawSnapshot );
	// The node holds no value of its own, so it renders the block's default.
	const current = blockSchema( rec.name )?.[ band.attr ]?.default ?? {};
	// The resolver names the setting that holds max-width on the band and formats a cap as that setting holds it.
	const ask = ( n ) => resolve( { block: rec.name, prop: 'max-width', slot: band.slot, perWidth: { 1440: `${ round( n ) }px` } }, { db: st.db, calibration: cal, snapshot: st.snapshot ?? null, log: [] } );
	const probe = ask( 100 );
	const attr = probe.writes?.[ 0 ]?.attr;
	const evidence = Object.entries( needs ).filter( ( [ , n ] ) => n ).map( ( [ w, n ] ) => `${ w }: ${ n.why }` ).join( '; ' );
	if ( attr !== band.attr ) {
		st.out.notes.push( `${ ref } ${ rec.name }: band ${ band.slot }: the resolver does not hold max-width there with ${ band.attr } (${ probe.gap ?? 'gap' }: ${ probe.detail ?? attr ?? '' }); not written` );
		return null;
	}
	const format = ( n ) => {
		const v = ask( n ).writes?.[ 0 ]?.value;
		return ( v && 'object' === typeof v ? v.desktop : v ) ?? `${ round( n ) }px`;
	};
	const out = bandValue( needs, current, sizes, format );
	if ( out.conflict ) {
		st.out.notes.push( `${ ref } ${ rec.name }: band ${ band.slot } ${ band.attr }: ${ out.conflict } (${ evidence }); not written` );
		return null;
	}
	if ( out.held ) {
		st.out.notes.push( `${ ref } ${ rec.name }: band ${ band.slot } ${ band.attr }: ${ JSON.stringify( current ) } already gives the draft's band (${ evidence })` );
		return { attr: band.attr };
	}
	const { before, after } = setAttr( node, { attr: band.attr, value: out.value, merge: 'replace' } );
	st.out.writes.push( { node: ref, index: rec.index, block: rec.name, slot: band.slot, prop: 'max-width', attr: band.attr, before, after, widths: Object.keys( needs ).filter( ( w ) => needs[ w ] ).map( Number ), how: 'band', note: evidence } );
	st.out.notes.push( `${ ref } ${ rec.name }: band ${ band.slot } ${ band.attr } ${ JSON.stringify( out.value ) } (${ evidence })` );
	return { attr: band.attr };
}
