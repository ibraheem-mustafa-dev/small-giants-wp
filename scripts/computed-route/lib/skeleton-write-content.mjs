// The settings one element's block takes from the draft element (Spec 48 §3.4, split out of
// lib/skeleton-propose.mjs::proposeSkeleton): `contentAttrs` the content, identity and structure settings (a skeleton holds
// no style value, R-47-10) with the handover notes for what no setting can hold, and `carriedAttrs` the ids the build holds
// for the element's block (a logo block's `logoId`, a menu block's `ref`).
// The factory takes the writer's shared context (`ctx`).
import { LOGO_HANDOVER } from './skeleton-write-units.mjs';
import { linkWrite } from './draft-link.mjs';
import { makeClock, timeTextRanges } from './skeleton-clock.mjs';
import { inlineText } from './inline-text.mjs';

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

// The setting that holds the heading level of a text block (the tag-identity setting whose values are heading tags), or null.
export function levelSetting( facts, block ) {
	return facts.attrsByRole( block, 'tag-identity' ).map( ( r ) => r.attr_name ).find( ( n ) => ( facts.enumOf( block, n ) || [] ).includes( 'h1' ) ) ?? null;
}

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
		out.text && levelSetting( facts, block ) && out.others.push( levelSetting( facts, block ) );
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
	const clock = makeClock( { facts, view, read: m.read } );
	// The time-based text option of a text block whose words the draft's code picks by the hour of the clock
	// (lib/skeleton-clock.mjs, rules.timeText): the hour ranges with their words, and the time zone when the code names one.
	// {} when the element's words are no such value or the block does not take the option (the framework DB).
	const timeTextAttrs = ( block, e ) => {
		const T = facts.decisions.rules?.timeText;
		const c = T?.attribute && attrExists( block, T.attribute ) ? clock( e ) : null;
		const ranges = c && ! c.openStatus ? timeTextRanges( c ) : null;
		return ranges ? { [ T.attribute ]: ranges, ...( c.zone && T.zoneAttribute && attrExists( block, T.zoneAttribute ) ? { [ T.zoneAttribute ]: c.zone } : {} ) } : {};
	};
	const layoutOf = ( slug, e ) => {
		const opts = attrExists( slug, 'layout' ) ? enumOf( slug, 'layout' ) || [] : [];
		const want = 'flex' === e.display && 'column' === e.flexDirection && opts.includes( 'stack' ) ? 'stack' : e.display;
		return opts.includes( want ) ? { layout: want } : {};
	};

	// The link setting of one element: its href, or for a button with no href its click handler (the fact record's `onClick`
	// binding, read through m.read, lib/element-facts.mjs; FR-48-30), as a site address (lib/draft-link.mjs: a draft route is never written as
	// it stands). Writes into `a` and `handover`. A handler the routing read recorded as a control (an opener, a toggle) is
	// no link and says nothing.
	function linkSettings( block, e, top, linkAttr, a, handover ) {
		const href = e.attrs?.href;
		const handler = m.read.handler( e );
		const byHandler = ! href && !! handler;
		if ( ! href && ! byHandler ) {
			return;
		}
		const r = siteLink( href || '', e );
		if ( 'none' === r.kind ) {
			const onClick = handler;
			const subject = byHandler ? 'draft button' : 'draft link is "#"';
			const how = onClick ? `${ byHandler ? ' navigates' : ' and navigates' } by script ${ onClick }` : '';
			const items = r.routes ? ` to one of ${ r.routes.map( ( x ) => `"${ x }"` ).join( ', ' ) } by the item it is clicked on` : '';
			( ! byHandler || r.navigates ) && handover.push( { owner: 'behaviour', kind: 'link', detail: `${ subject }${ how }${ items }: destination not in the draft, url left empty` } );
		} else if ( ! top.linkSource ) {
			const out = linkWrite( r, href || handler );
			null !== out.value && ( a[ linkAttr ] = out.value );
			out.handover && handover.push( out.handover );
		}
		e.attrs?.target && attrExists( block, 'linkTarget' ) && ( a.linkTarget = e.attrs.target );
	}

	// The cite (or footer) a blockquote ends with, the element holding its attribution, or null.
	const citeOf = ( e ) => m.kids( e ).find( ( k ) => [ 'cite', 'footer', 'figcaption' ].includes( k.tag ) && m.isPart( k ) && m.words( k ) ) ?? null;

	// A container's own words (the text printed straight inside it, beside its child elements) as a text child, the generic
	// text block of the tag map's `p` (facts.tagMap), placed in DOM order: before the children when the text opens the
	// element's markup, after them otherwise. Only a block with no text setting of its own takes this (a wrapper shell, a
	// section root, a block that draws children); one that reads words into its own setting has them already.
	// Returns { node, leading } or null. The node has no draftRef: Fill reads the container, whose type style the text inherits.
	function ownWordsNode( e, block ) {
		const words = m.words( e );
		const textBlock = facts.tagMap.p?.core_block_slug;
		const textAttr = textBlock ? facts.firstAttrByRole( textBlock, 'text-content' ) : null;
		if ( ! words || ! textAttr || ( skeletonSettings( facts, block ).text && 'blockquote' !== e.tag ) ) {
			return null;
		}
		const leading = m.read.textLeads( e );
		const rich = inlineText( { m, e, block: textBlock, attr: textAttr, codeRepo: facts.codeRepo, siteLink } );
		return { node: { name: textBlock, attributes: { [ textAttr ]: rich ? rich.value : words, ...timeTextAttrs( textBlock, e ) }, innerBlocks: [], ...( rich?.handover.length ? { handover: rich.handover } : {} ) }, leading };
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
		// A quote's first text setting is its attribution: the blockquote's own words are its body (ownWordsNode), the
		// attribution is its cite.
		const quoteBody = 'blockquote' === e.tag;
		const cite = quoteBody ? citeOf( e ) : null;
		// A text element holding inline parts writes them as the markup the receiving setting holds (lib/inline-text.mjs).
		const rich = textAttr && t && ! quoteBody ? inlineText( { m, e, block, attr: textAttr, codeRepo: facts.codeRepo, siteLink } ) : null;
		rich && handover.push( ...rich.handover );
		const plain = m.textWithBreaks( e ).includes( '<br>' ) ? m.textWithBreaks( e ) : t;
		textAttr && t && ! quoteBody && ( a[ textAttr ] = rich ? rich.value : plain );
		textAttr && t && ! quoteBody && Object.assign( a, timeTextAttrs( block, e ) );
		// A control with no words (a swatch, a dot) must not print the block's default label: the label is written empty and
		// the draft's aria-label names the control. A block a rule configured (`top.attributes`) takes its settings from the
		// rule, so its text setting is not this element's label.
		const defaultText = textAttr && ! t && ! Object.keys( top.attributes || {} ).length ? JSON.parse( facts.attr( block, textAttr )?.default_value ?? 'null' ) : null;
		if ( 'string' === typeof defaultText && '' !== defaultText ) {
			a[ textAttr ] = '';
			const aria = facts.firstAttrByRole( block, 'a11y-text' );
			aria && e.attrs?.[ 'aria-label' ] && ( a[ aria ] = e.attrs[ 'aria-label' ] );
		}
		const levelAttr = textAttr ? levelSetting( facts, block ) : null;
		levelAttr && enumOf( block, levelAttr ).includes( e.tag ) && ( a[ levelAttr ] = e.tag );
		textAttr && cite && ( a[ textAttr ] = m.words( cite ) );
		top.linkSource && ( a.linkSource = top.linkSource );
		linkAttr && linkSettings( block, e, top, linkAttr, a, handover );
		return { a: { ...a, ...Object.fromEntries( Object.entries( top.attributes || {} ) ) }, handover };
	}

	// The link setting alone of an element whose rule gives the block its words and draws its children (a pill button holding a
	// label and a glyph): the element's own href is still its destination. Nothing when the block has no link setting or the
	// rule's own attributes already set a link of the block (a link source, a whole-block link). Returns { a, handover }.
	function linkAttrs( block, e, top ) {
		const a = {};
		const handover = [];
		const { link: linkAttr } = skeletonSettings( facts, block );
		const ruled = Object.keys( top.attributes || {} ).some( ( k ) => k === linkAttr || /link/i.test( k ) );
		linkAttr && ! ruled && ! top.linkSource && linkSettings( block, e, top, linkAttr, a, handover );
		return { a, handover };
	}

	// Which navigation group of the surface an element is (0 for the first): a drawer binds the menu the page map made for the
	// same group, in document order (lib/site-build-map.mjs::boundMenu). Navigation inside another navigation is no group.
	const navAbove = ( n ) => {
		for ( let p = m.byKey[ n.parentKey ]; p; p = m.byKey[ p.parentKey ] ) {
			if ( 'nav' === p.tag ) {
				return true;
			}
		}
		return false;
	};
	const navOrdinal = ( e ) => Math.max( 0, m.els.filter( ( n ) => 'nav' === n.tag && ! navAbove( n ) ).indexOf( e ) );

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
			const id = carried.menu( surfaceKind, navOrdinal( e ) );
			id && Object.assign( out.attrs, { ref: id } ) && ( out.said.ref = `menu-map.json: the ${ surfaceKind } menu` );
		}
		return out;
	}
	return { contentAttrs, linkAttrs, carriedAttrs, ownWordsNode };
}
