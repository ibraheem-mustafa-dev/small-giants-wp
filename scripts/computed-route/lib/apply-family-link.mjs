// Applier family: whole-card links. A draft card that is one anchor (or a div whose click goes somewhere) with a call to
// action inside it as a cue becomes: the link on the card (sgsBlockLink with its label and target) and `visualOnly` on the
// paired button, so the card has one link. A post grid whose draft cards are anchors takes `cardLink`. The address comes from
// lib/draft-link.mjs::resolveDraftLink; a click row with no href takes the address its paired button already reaches (the
// form's in-page anchor the clone resolved). A draft hash is never written.
import { attrRow } from './db.mjs';
import { resolveDraftLink } from './draft-link.mjs';
import { recordsFor } from './apply-records.mjs';

const ADDRESS = [ 'address', 'site', 'external', 'anchor' ];
const inside = ( inner, outer ) => inner && outer && inner.x >= outer.x - 1 && inner.y >= outer.y - 1 && inner.x + inner.w <= outer.x + outer.w + 1 && inner.y + inner.h <= outer.y + outer.h + 1;
const boxOf = ( f ) => f?.layout ?? f?.box;
const clean = ( t ) => String( t ?? '' ).replace( /\s+/g, ' ' ).trim();

// The sgs/button targets of the surface lying inside this card in both the draft and the live page at 1440.
export function buttonsIn( { target, draft, live, all } ) {
	const dBox = boxOf( draft[ 1440 ] );
	const lBox = boxOf( live[ 1440 ] );
	return Object.entries( all?.blocks ?? {} ).filter( ( [ ref, b ] ) => ref !== target.ref && 'sgs/button' === b.block && inside( boxOf( all.drafts[ 1440 ]?.facts[ ref ] ), dBox ) && inside( boxOf( all.lives[ 1440 ]?.facts[ ref ] ), lBox ) )
		.map( ( [ ref, b ] ) => ( { ref, attrs: b.attrs, draft: all.drafts[ 1440 ].facts[ ref ] } ) );
}

// A pointer cursor inherits, so a click row is the outermost paired box that shows one: a cell inside it is not a second row.
// A card that is hovered as one but links nowhere: its own hover record, and hover records on ids its box reaches (its children).
export function hoverCard( { target, recordsIndex, saved, block, db } ) {
	if ( ! recordsIndex || saved.hoverAsCard || saved.sgsBlockLink || ! attrRow( db, block, 'hoverAsCard' ) ) {
		return null;
	}
	const hovers = ( tpl ) => recordsFor( recordsIndex, tpl ).some( ( r ) => 'hover' === r.trigger?.type );
	const own = hovers( target.tpl );
	const prefix = String( target.tpl ).replace( /\/\d+#\d+$/, '' );
	const kids = ( target.reach ?? [] ).map( ( id ) => `${ prefix }/${ id }#0` ).filter( ( tpl ) => tpl !== target.tpl && hovers( tpl ) );
	return own && kids.length ? kids : null;
}

const clickRow = ( f, { target, draft, all } ) => {
	if ( 'a' === f.tag || f.anchor || 'pointer' !== f.styles?.cursor ) {
		return false;
	}
	const box = boxOf( f );
	return ! Object.entries( all?.drafts[ 1440 ]?.facts ?? {} ).some( ( [ ref, o ] ) => ref !== target.ref && 'pointer' === o.styles?.cursor && 'a' !== o.tag && inside( box, boxOf( o ) ) && ! ( boxOf( o ).w === box.w && boxOf( o ).h === box.h && ref > target.ref ) );
};

export const link = {
	name: 'link',
	props: [ 'cursor' ],
	decide( { target, draft, live, saved, block, db, links, all, recordsIndex } ) {
		const d = draft[ 1440 ];
		if ( ! d || ! live[ 1440 ] ) {
			return [];
		}
		if ( 'sgs/post-grid' === block ) {
			if ( ! d.childAnchors ) {
				return [];
			}
			return saved.cardLink ? [ { status: 'equal', prop: 'card-link', why: 'the cards are one link each' } ] : [ { status: 'op', prop: 'card-link', why: `${ target.tpl } cards are anchors in the draft`, writes: [ { attr: 'cardLink', value: true } ] } ];
		}
		if ( ! attrRow( db, block, 'sgsBlockLink' ) ) {
			return [];
		}
		const wholeCard = 'a' === d.tag && null !== d.href;
		if ( ! wholeCard && ! clickRow( d, { target, draft, all } ) ) {
			const kids = hoverCard( { target, recordsIndex, saved, block, db } );
			return kids ? [ { status: 'op', prop: 'hover-group', why: `${ target.tpl } is hovered as one card (${ kids.length } child hover looks) and links nowhere`, writes: [ { attr: 'hoverAsCard', value: true } ] } ] : [];
		}
		const buttons = buttonsIn( { target, draft, live, all } );
		let url = null;
		let why = '';
		if ( wholeCard ) {
			const r = resolveDraftLink( d.href, links );
			if ( ADDRESS.includes( r.kind ) || 'site' === r.kind ) {
				url = r.value ?? r.address;
			} else {
				return [ { status: 'no-setting', prop: 'card-link', why: `draft link "${ d.href }" has no live address (${ r.kind }${ r.why ? `: ${ r.why }` : '' })` } ];
			}
		} else {
			const own = buttons.map( ( b ) => String( b.attrs.url ?? '' ) ).find( ( u ) => /^(#|\/)/.test( u ) );
			if ( ! own ) {
				return [ { status: 'no-setting', prop: 'card-link', why: 'a click row whose address no paired button holds' } ];
			}
			url = own;
		}
		// A card that is one link reads out what it says, as the draft's anchor does, not only its cue.
		const words = clean( d.text || buttons.map( ( b ) => b.draft.text ).find( Boolean ) );
		const label = words.length > 80 ? words.slice( 0, 80 ).replace( /\s+\S*$/, '' ) : words;
		const items = [];
		if ( saved.sgsBlockLink === url && saved.sgsBlockLinkLabel === label ) {
			items.push( { status: 'equal', prop: 'card-link', why: 'the card links' } );
		} else {
			const writes = [ { attr: 'sgsBlockLink', value: url }, { attr: 'sgsBlockLinkLabel', value: label } ];
			if ( '_blank' === d.target && ! saved.sgsBlockLinkTarget ) {
				writes.push( { attr: 'sgsBlockLinkTarget', value: true } );
			}
			items.push( { status: 'op', prop: 'card-link', why: `${ target.tpl } is one link to ${ url }`, writes } );
		}
		for ( const b of buttons.filter( ( x ) => ! x.attrs.visualOnly ) ) {
			items.push( { status: 'op', prop: 'visualOnly', ref: b.ref, block: 'sgs/button', why: `${ b.ref } is the cue of the linked card ${ target.tpl }`, writes: [ { attr: 'visualOnly', value: true } ] } );
		}
		return items;
	},
};
