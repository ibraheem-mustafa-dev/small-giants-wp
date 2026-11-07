// Chrome rule: the drawer's feature card (the mega panel's aside) is one link with a hover shadow in the draft. The card's address
// and its resting and hover box-shadow are read from the draft card, then written to the aside's own settings: the standard block link
// (sgsBlockLink), the shadow shape and colour for rest and hover (asideShadow, asideShadowColour, asideShadowHover,
// asideShadowColourHover), and `visualOnly` on the aside's own buttons so the card has one link. The card is the n-th feature card of
// the draft's drawer, counted over the panels that draw an aside, the order the panels sit in the drawer.
import { hoverTo, recordsOf, settle } from './apply-chrome-records.mjs';
import { resolveDraftLink } from './draft-link.mjs';
import { singleShadow } from './apply-chrome-cards.mjs';

// A computed shadow leads with its colour, an authored one ends with it.
const LEAD = /^((?:rgba?|hsla?)\([^)]*\)|#[0-9a-f]{3,8})\s+(.*)$/i;
const GLOW = /^(.*?)\s+((?:rgba?|hsla?)\([^)]*\)|#[0-9a-f]{3,8})$/i;

// The drawer skeleton's panel node for a mega surface (`mega-<name>`), or null.
export function ownPanel( nodes, surface ) {
	const name = /^mega-(.+)$/.exec( surface?.name ?? '' )?.[ 1 ];
	return ( name && nodes.find( ( n ) => 'sgs/mega-panel' === n.b && String( n.a?.source ?? '' ).endsWith( `: ${ name }` ) ) ) || null;
}

const inside = ( nodes, panel ) => nodes.slice( panel.index + 1, panel.last + 1 );

// A shadow written as one shape and one colour, or null when it is a list, inset or has two colours; none is an empty shape.
const shadowParts = ( value ) => {
	const v = String( value ?? '' ).trim();
	if ( ! v || 'none' === v ) {
		return { shape: '', colour: '' };
	}
	const lead = singleShadow( v ) ? LEAD.exec( v ) : null;
	const m = lead ? null : singleShadow( v ) ? GLOW.exec( v ) : null;
	return lead ? { shape: lead[ 2 ], colour: lead[ 1 ] } : m ? { shape: m[ 1 ], colour: m[ 2 ] } : null;
};
const restingShadow = ( style ) => /(?:^|[\s;])box-shadow:\s*([^;]+)/.exec( style ?? '' )?.[ 1 ] ?? 'none';

export function asideCard( ctx, nodes ) {
	const { target, all, clientData } = ctx;
	const panel = ownPanel( nodes, ctx.surface );
	const aside = panel && inside( nodes, panel ).find( ( n ) => 'sgs/mega-aside' === n.b );
	const asideRef = Object.entries( all?.blocks ?? {} ).find( ( [ , b ] ) => 'sgs/mega-aside' === b.block )?.[ 0 ];
	if ( ! aside || ! asideRef ) {
		return [];
	}
	const withAside = nodes.filter( ( n ) => 'sgs/mega-panel' === n.b && inside( nodes, n ).some( ( c ) => 'sgs/mega-aside' === c.b && c.lo === aside.lo ) );
	const cards = ( clientData?.inventory ?? [] ).filter( ( e ) => 'a' === e.tag && new RegExp( `^Root/${ aside.lo }#\\d+$` ).test( e.key ) ).sort( ( a, b ) => Number( /#(\d+)$/.exec( a.key )[ 1 ] ) - Number( /#(\d+)$/.exec( b.key )[ 1 ] ) );
	const card = cards[ withAside.indexOf( panel ) ];
	const row = ( o ) => ( { ref: asideRef, block: 'sgs/mega-aside', ...o } );
	if ( ! cards.length ) {
		return [];
	}
	if ( ! card ) {
		return [ row( { status: 'no-setting', prop: 'aside card link', why: `${ target.tpl } the draft's drawer holds no feature card ${ withAside.indexOf( panel ) } of Root/${ aside.lo }` } ) ];
	}
	const out = [];
	const hrefRow = resolveDraftLink( card.attrs?.href, ctx.links );
	const url = [ 'address', 'site', 'external', 'anchor' ].includes( hrefRow.kind ) ? hrefRow.value ?? hrefRow.address : null;
	if ( url ) {
		const link = all.blocks[ asideRef ].attrs;
		const done = link.sgsBlockLink === url && ! link.sgsBlockLinkLabel;
		out.push( row( done ? { status: 'equal', prop: 'aside card link', why: `${ asideRef } is one link to ${ url }: already saved` } : { status: 'op', prop: 'aside card link', why: `${ target.tpl } the draft's feature card ${ card.key } is one link to ${ url }`, writes: [ { attr: 'sgsBlockLink', value: url }, { attr: 'sgsBlockLinkLabel', value: '' } ], checks: [] } ) );
		// The aside's own buttons: the live buttons whose box lies inside the aside's box at 1440.
		const boxOf = ( ref ) => all.lives?.[ 1440 ]?.facts?.[ ref ]?.layout ?? all.lives?.[ 1440 ]?.facts?.[ ref ]?.box;
		const frame = boxOf( asideRef );
		const fits = ( b ) => b && frame && b.x >= frame.x - 1 && b.y >= frame.y - 1 && b.x + b.w <= frame.x + frame.w + 1 && b.y + b.h <= frame.y + frame.h + 1;
		const after = Object.keys( all.blocks ).filter( ( r ) => 'sgs/button' === all.blocks[ r ].block && fits( boxOf( r ) ) );
		for ( const ref of after.filter( ( r ) => ! all.blocks[ r ].attrs.visualOnly ) ) {
			out.push( { status: 'op', prop: 'visualOnly', ref, block: 'sgs/button', why: `${ ref } is the cue of the linked card ${ asideRef }`, writes: [ { attr: 'visualOnly', value: true } ], checks: [] } );
		}
	} else {
		out.push( row( { status: 'no-setting', prop: 'aside card link', why: `${ target.tpl } the draft card's link "${ card.attrs?.href }" has no live address (${ hrefRow.kind })` } ) );
	}
	const hover = hoverTo( recordsOf( { target: { owns: [ aside.lo ], tpl: target.tpl }, recordsIndex: ctx.recordsIndex } ), 'box-shadow' );
	const rest = shadowParts( restingShadow( card.attrs?.style ) );
	const lit = hover && shadowParts( hover.value );
	if ( ! lit || ! rest ) {
		return [ ...out, row( { status: 'no-setting', prop: 'aside card shadow', why: `${ target.tpl } the draft card's shadow is ${ hover ? 'a list, inset or two-colour shadow' : 'not recorded' }, which the aside's one-shape shadow settings do not take` } ) ];
	}
	const writes = [ [ 'asideShadow', rest.shape ], [ 'asideShadowColour', rest.colour ], [ 'asideShadowHover', lit.shape ], [ 'asideShadowColourHover', lit.colour ] ].filter( ( [ attr, value ] ) => '' !== value || all.blocks[ asideRef ].attrs[ attr ] ).map( ( [ attr, value ] ) => ( { attr, value } ) );
	out.push( row( { ...settle( { prop: 'aside card shadow', why: `${ target.tpl } the draft card rests at "${ restingShadow( card.attrs?.style ) }" and takes ${ hover.value } on hover (${ hover.record.id })`, saved: all.blocks[ asideRef ].attrs, writes, record: hover.record.id, state: 'hover' } ) } ) );
	return out;
}
