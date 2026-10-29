// The settings one element's block takes from the draft element (Spec 48 §3.4, split out of
// lib/skeleton-propose.mjs::proposeSkeleton): `contentAttrs` the content, identity and structure settings (a skeleton holds
// no style value, R-47-10) with the handover notes for what no setting can hold, and `carriedAttrs` the ids the build holds
// for the element's block (a logo block's `logoId`, a menu block's `ref`).
// The factory takes the writer's shared context (`ctx`).
import { LOGO_HANDOVER } from './skeleton-write-units.mjs';
import { elementHandler, handlerOf, linkWrite } from './draft-link.mjs';

// The words a draft's copyright line prints before its © mark (sgs/business-info prints `{copyrightPrefix} © {year} {line}`):
// "Copyright © 2026 Acme" gives "Copyright", "© 2026 Acme" gives "" (the block then omits the word). A line with no mark
// ("(c)" counts as one) reads its year as the mark, and a line with neither gives "". The words are a prefix only when
// they are a short run of words (PREFIX_WORDS at most, letters only) that does not hold the site name, the name the Site
// Info line prints after the year; anything else ("Acme Foods 1998 - 2026", "Acme Ltd, est. 2005. © 2026") gives "" and
// the words as `leftover`, so the name is never printed twice. Returns { prefix, leftover }.
export const PREFIX_WORDS = 3;
export function copyrightPrefixParts( text, siteName = null ) {
	const t = String( text ?? '' ).replace( /\s+/g, ' ' ).trim();
	const mark = /©|&copy;|\(c\)/i.exec( t ) ?? /\b(?:19|20)\d{2}\b/.exec( t );
	const words = mark ? t.slice( 0, mark.index ).trim() : '';
	const name = String( siteName ?? '' ).replace( /\s+/g, ' ' ).trim().toLowerCase();
	const short = /^\p{L}[\p{L}'’-]*(?: \p{L}[\p{L}'’-]*)*$/u.test( words ) && words.split( ' ' ).length <= PREFIX_WORDS;
	return short && ! ( name && words.toLowerCase().includes( name ) ) ? { prefix: words, leftover: '' } : { prefix: '', leftover: words };
}
export const copyrightPrefixOf = ( text, siteName = null ) => copyrightPrefixParts( text, siteName ).prefix;

// The settings the skeleton writer can give one block, from the facts alone (lib/skeleton-facts.mjs::loadFacts):
// { text, link, others }. `text` and `link` are the block's first text-content and link-href settings (firstAttrByRole), the
// ones a draft element's words and address go to; `others` are the identity and structure settings it writes by name: a
// wrapper shell's tag and layout, a section root's layout, the Site Info display type with its copyright prefix, a link's
// target, and the ids the build carries (a logo block's `logoId`, any block's menu `ref`). contentAttrs and carriedAttrs
// write through this; lib/content-coverage.mjs asks it which settings a re-clone writes.
export function skeletonSettings( facts, block ) {
	const has = ( name ) => !! facts.attr( block, name );
	const out = { text: null, link: null, others: [] };
	if ( facts.wrapperShells.includes( block ) ) {
		out.others.push( 'tagName', ...( has( 'layout' ) ? [ 'layout' ] : [] ) );
	} else if ( 'section-root' === facts.composition[ block ]?.composition_role ) {
		out.others.push( ...( has( 'layout' ) ? [ 'layout' ] : [] ) );
	} else if ( facts.logoBlocks.includes( block ) ) {
		out.others.push( ...( has( 'logoId' ) ? [ 'logoId' ] : [] ) );
	} else {
		out.text = facts.firstAttrByRole( block, 'text-content' );
		out.link = facts.firstAttrByRole( block, 'link-href' );
		const kinds = ( facts.enumOf( block, 'displayType' ) || [] ).filter( ( k ) => facts.displayTypes.includes( k ) );
		kinds.length && out.others.push( 'displayType', ...( kinds.includes( 'copyright' ) && has( 'copyrightPrefix' ) ? [ 'copyrightPrefix' ] : [] ) );
		has( 'linkTarget' ) && out.others.push( 'linkTarget' );
	}
	has( 'ref' ) && out.others.push( 'ref' );
	return out;
}

export function makeContent( ctx ) {
	const { m, facts, view, carried, surfaceKind, siteLink } = ctx;
	const { composition, enumOf } = facts;
	const attrExists = ( slug, name ) => !! facts.attr( slug, name );
	const layoutOf = ( slug, e ) => {
		const opts = attrExists( slug, 'layout' ) ? enumOf( slug, 'layout' ) || [] : [];
		const want = 'flex' === e.display && 'column' === e.flexDirection && opts.includes( 'stack' ) ? 'stack' : e.display;
		return opts.includes( want ) ? { layout: want } : {};
	};

	// The link setting of one element: its href, or for a button with no href its click handler (`<button
	// sc-camel-on-click="{{ goShop }}">`, FR-48-30), as a site address (lib/draft-link.mjs: a draft route is never written as
	// it stands). Writes into `a` and `handover`. A handler the routing read recorded as a control (an opener, a toggle) is
	// no link and says nothing.
	function linkSettings( block, e, top, linkAttr, a, handover ) {
		const href = e.attrs?.href;
		const handler = elementHandler( e );
		const byHandler = ! href && null !== handler;
		if ( ! href && ! byHandler ) {
			return;
		}
		const r = siteLink( href || '', e );
		if ( 'none' === r.kind ) {
			const onClick = handlerOf( handler );
			const subject = byHandler ? 'draft button' : 'draft link is "#"';
			const how = onClick ? `${ byHandler ? ' navigates' : ' and navigates' } by script ${ onClick }` : '';
			const items = r.routes ? ` to one of ${ r.routes.map( ( x ) => `"${ x }"` ).join( ', ' ) } by the item it is clicked on` : '';
			( ! byHandler || r.navigates ) && handover.push( { owner: 'behaviour', kind: 'link', detail: `${ subject }${ how }${ items }: destination not in the draft, url left empty` } );
		} else if ( ! top.linkSource ) {
			const out = linkWrite( r, href || handlerOf( handler ) );
			null !== out.value && ( a[ linkAttr ] = out.value );
			out.handover && handover.push( out.handover );
		}
		e.attrs?.target && attrExists( block, 'linkTarget' ) && ( a.linkTarget = e.attrs.target );
	}

	// The content settings of one element's block. Returns { a (attributes), handover }.
	function contentAttrs( block, e, top ) {
		const a = {};
		const handover = [];
		const t = m.words( e );
		if ( facts.wrapperShells.includes( block ) ) {
			a.tagName = ( enumOf( block, 'tagName' ) || [] ).includes( e.tag ) ? e.tag : 'div';
			return { a: { ...a, ...layoutOf( block, e ) }, handover };
		}
		if ( 'section-root' === composition[ block ]?.composition_role || ( composition[ block ]?.wraps_block && m.blockKids( e ).length ) ) {
			return { a: layoutOf( block, e ), handover };
		}
		if ( top.siteInfoKind && facts.displayTypes.includes( top.siteInfoKind ) && enumOf( block, 'displayType' ) ) {
			a.displayType = top.siteInfoKind;
			if ( 'copyright' === top.siteInfoKind && attrExists( block, 'copyrightPrefix' ) ) {
				const { prefix, leftover } = copyrightPrefixParts( t, facts.siteName );
				a.copyrightPrefix = prefix;
				leftover && handover.push( { owner: 'site-info', kind: 'text', detail: `the copyright line's words before its mark, "${ leftover }", are no prefix (not a short run of words, or they hold the site name): the Site Info copyright line holds them` } );
			}
			handover.push( { owner: 'site-info', kind: 'text', detail: `Site Info "${ top.siteInfoKind }" must read: ${ m.textWithBreaks( e ) }` } );
			return { a, handover };
		}
		if ( top.brand ) {
			Object.assign( a, { iconSource: 'brand', brandName: top.brand.slug, metadata: { bindings: { linkUrl: { source: 'sgs/site-info', args: { key: top.brand.siteInfoKey } } } } } );
			e.attrs?.target && attrExists( block, 'linkTarget' ) && ( a.linkTarget = e.attrs.target );
			return { a, handover };
		}
		if ( facts.logoBlocks.includes( block ) ) {
			handover.push( LOGO_HANDOVER );
			return { a, handover };
		}
		const { text: textAttr, link: linkAttr } = skeletonSettings( facts, block );
		textAttr && t && ( a[ textAttr ] = m.textWithBreaks( e ).includes( '<br>' ) ? m.textWithBreaks( e ) : t );
		top.linkSource && ( a.linkSource = top.linkSource );
		linkAttr && linkSettings( block, e, top, linkAttr, a, handover );
		return { a: { ...a, ...Object.fromEntries( Object.entries( top.attributes || {} ) ) }, handover };
	}

	// The ids the build holds for this element's block: a logo block's `logoId` (the attachment of the file the element
	// draws) and a menu block's `ref` (the menu site-build made for this surface). { attrs, said: { attr: where from } }.
	function carriedAttrs( block, e ) {
		const out = { attrs: {}, said: {}, missing: [] };
		if ( ! carried ) {
			return out;
		}
		if ( facts.logoBlocks.includes( block ) && attrExists( block, 'logoId' ) ) {
			const hit = carried.logo( e, view );
			hit?.id && Object.assign( out.attrs, { logoId: hit.id } ) && ( out.said.logoId = `media-map.json: ${ hit.asset }` );
			hit?.reason && out.missing.push( `${ e.key }: no logoId is carried: ${ hit.reason }` );
		}
		if ( 'nav' === e.tag && attrExists( block, 'ref' ) && surfaceKind ) {
			const id = carried.menu( surfaceKind );
			id && Object.assign( out.attrs, { ref: id } ) && ( out.said.ref = `menu-map.json: the ${ surfaceKind } menu` );
		}
		return out;
	}
	return { contentAttrs, carriedAttrs };
}
