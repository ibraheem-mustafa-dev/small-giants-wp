// The settings one element's block takes from the draft element (Spec 48 §3.4, split out of
// lib/skeleton-propose.mjs::proposeSkeleton): `contentAttrs` the content, identity and structure settings (a skeleton holds
// no style value, R-47-10) with the handover notes for what no setting can hold, and `carriedAttrs` the ids the build holds
// for the element's block (a logo block's Source, a menu block's `ref`).
// The factory takes the writer's shared context (`ctx`).
import { blockMediaSlots } from './media/slots.mjs';
import { itemSource } from './media/write.mjs';
import { LOGO_HANDOVER } from './skeleton-write-units.mjs';
import { elementHandler, handlerOf, linkWrite } from './draft-link.mjs';
import fs from 'fs';
import path from 'path';
import { decodeEntities, loadDraft } from './intake-ast.mjs';
import { declared } from './skeleton-rules.mjs';

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
// target, and the ids the build carries (a logo block's Source, any block's menu `ref`). contentAttrs and carriedAttrs
// write through this; lib/content-coverage.mjs asks it which settings a re-clone writes.
// A logo block's Source setting: its one content media slot that takes an image (lib/media/slots.mjs), as a list.
const logoSource = ( block ) => blockMediaSlots( block ).filter( ( m ) => 'content' === m.context && m.kinds.includes( 'image' ) ).slice( 0, 1 ).map( ( m ) => m.source );

// Whether a block's text setting prints words of its own when it holds none: a setting whose framework-database
// default is not empty (`sgs/button` `label` prints "Click Here", `sgs/form` `submitLabel` "Submit"). Such a setting left
// unwritten on a wordless draft element (a slider dot, a swatch) puts the default on the page (FR-48-97).
export function printsDefaultText( facts, block, attr ) {
	let value = attr ? facts.attr( block, attr )?.default_value : undefined;
	try {
		value = JSON.parse( value );
	} catch {
		// A default that is no JSON is the literal string.
	}
	return 'string' === typeof value && '' !== value.trim();
}

export function skeletonSettings( facts, block ) {
	const has = ( name ) => !! facts.attr( block, name );
	const out = { text: null, link: null, others: [] };
	if ( facts.wrapperShells.includes( block ) ) {
		out.others.push( 'tagName', ...( has( 'layout' ) ? [ 'layout' ] : [] ) );
	} else if ( 'section-root' === facts.composition[ block ]?.composition_role ) {
		out.others.push( ...( has( 'layout' ) ? [ 'layout' ] : [] ) );
	} else if ( facts.logoBlocks.includes( block ) ) {
		out.others.push( ...logoSource( block ) );
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

	// The rich text of a heading whose children are all inline (lib/skeleton-classify.mjs, structural.inlineHeading), read in
	// document order from the heading's own source in the draft file (the fact record's template number is its start tag's
	// place among the template's tags, lib/intake-ast.mjs::loadDraft; the inventory's snippet is cut short): its words; an
	// <img> as the Inline photo format with the media-map attachment of the file it draws (lib/skeleton-carried.mjs, as a
	// logo's Source is carried); a word whose only children are bare positioned layers as the Highlight format; a bare layer
	// holding no words is the format's own drawing and goes. Each child element in the source is the inventory's child in
	// the same place. A photo the build cannot carry is a handover row and leaves the words. When the source cannot be read
	// in order (no record entry, a binding or loop in it, a child that does not line up) the words are the element's rendered
	// words in order and every photo is a handover row. Returns { html, handover }.
	const VOID = new Set( [ 'img', 'br', 'wbr', 'hr', 'input', 'source' ] );
	const TAG = /<\/?([a-zA-Z][\w-]*)\b[^>]*>/g;
	const esc = ( x ) => String( x ).replace( /&/g, '&amp;' ).replace( /</g, '&lt;' ).replace( />/g, '&gt;' ).replace( /"/g, '&quot;' );
	// Words as a text setting holds them elsewhere in the skeleton: only the angle brackets escaped.
	const escText = ( x ) => String( x ).replace( /</g, '&lt;' ).replace( />/g, '&gt;' );
	const drafts = new Map();
	// An element's outer source in its draft file, or null.
	const sourceOf = ( e ) => {
		const t = view?.entry( e )?.template;
		const folder = facts.repo && facts.client ? path.join( facts.repo, 'sites', facts.client, 'handoff' ) : null;
		const file = t && folder ? `${ t.component }.dc.html` : null;
		if ( ! file || ! fs.existsSync( path.join( folder, file ) ) ) {
			return null;
		}
		drafts.has( file ) || drafts.set( file, loadDraft( folder, file ) );
		const d = drafts.get( file );
		const start = d.tags?.[ Number( t.n ) ];
		if ( ! start || start.name.toLowerCase() !== String( t.tag || t.realTag ).toLowerCase() ) {
			return null;
		}
		const re = new RegExp( TAG.source, 'g' );
		re.lastIndex = start.index;
		let depth = 0;
		for ( let hit = re.exec( d.text ); hit; hit = re.exec( d.text ) ) {
			const name = hit[ 1 ].toLowerCase();
			if ( hit[ 0 ].startsWith( '</' ) ) {
				depth--;
			} else if ( ! VOID.has( name ) && ! hit[ 0 ].endsWith( '/>' ) ) {
				depth++;
			}
			if ( depth <= 0 ) {
				return d.text.slice( start.index, re.lastIndex );
			}
		}
		return null;
	};
	// The parts directly inside an element's outer source: [{ text } | { tag, html }].
	const topLevel = ( outer ) => {
		const inner = String( outer || '' ).replace( /^<[^>]*>/, '' ).replace( /<\/[a-z0-9-]+>\s*$/i, '' );
		const out = [];
		const re = new RegExp( TAG.source, 'g' );
		let depth = 0;
		let last = 0;
		let from = 0;
		for ( let hit = re.exec( inner ); hit; hit = re.exec( inner ) ) {
			0 === depth && hit.index > last && out.push( { text: inner.slice( last, hit.index ) } );
			const name = hit[ 1 ].toLowerCase();
			if ( hit[ 0 ].startsWith( '</' ) ) {
				depth--;
				0 === depth && out.push( { tag: out.pop().tag, html: inner.slice( from, re.lastIndex ) } );
			} else if ( VOID.has( name ) || hit[ 0 ].endsWith( '/>' ) ) {
				0 === depth && out.push( { tag: name, html: hit[ 0 ] } );
			} else {
				if ( 0 === depth ) {
					from = hit.index;
					out.push( { tag: name } );
				}
				depth++;
			}
			last = re.lastIndex;
		}
		last < inner.length && out.push( { text: inner.slice( last ) } );
		return out;
	};
	const wordless = ( k ) => ! String( k.allText ?? m.words( k ) ).trim() && 'img' !== k.tag && ! m.kids( k ).some( ( x ) => 'img' === x.tag || ! wordless( x ) );
	const positioned = ( k ) => /(?:^|;)\s*position\s*:\s*(?:absolute|fixed)/i.test( k.attrs?.style || '' );
	// A worded child set apart from the words beside it (its own margin or padding, a box of its own, or a flex or grid
	// parent's gap, the box read from the inventory's computed display): a space keeps the two apart in the rich text, where its box
	// is gone, so an element boundary between words never joins them.
	const boxDisplays = () => facts.decisions.structural?.inlineHeading?.boxDisplays || [];
	const ownBox = ( k ) => boxDisplays().includes( k.display );
	const apart = ( k, parent ) => /(?:^|;)\s*(?:margin|padding)[\w-]*\s*:\s*(?!0(?:px)?\s*(?:;|$))/i.test( k.attrs?.style || '' ) || ownBox( k ) || /^(?:inline-)?(?:flex|grid)$/.test( parent.display || '' ) || /(?:^|;)\s*display\s*:\s*(?:inline-)?(?:flex|grid)/i.test( parent.attrs?.style || '' );
	const join = ( a, b ) => ( a && b && ! /\s$/.test( a ) && ! /^\s/.test( b ) ? `${ a } ${ b }` : a + b );
	// The worded pieces of an inline heading its rich text cannot carry: a descendant that renders as a box of its own (the
	// inventory's computed display is one of IH.boxDisplays) or declares its own font size, weight or colour (IH.ownTypeProps)
	// other than the heading's, such as an eyebrow inside the heading. Each is a handover row naming what it loses (the heading
	// keeps its words; the piece is split off or restyled by hand). An inherited value is the heading's.
	const ownValue = ( v ) => null != v && ! /^(?:inherit|unset|currentcolor)$/i.test( v );
	const pieceRows = ( e, IH, words ) => {
		const out = [];
		const visit = ( x ) => m.kids( x ).forEach( ( k ) => {
			const text = String( k.allText ?? m.words( k ) ).replace( /\s+/g, ' ' ).trim();
			const own = ( IH.ownTypeProps || [] ).filter( ( p ) => ownValue( declared( k )[ p ] ) && declared( k )[ p ] !== declared( e )[ p ] ).map( ( p ) => `${ p } ${ declared( k )[ p ] }` );
			const lost = [ ...( ( IH.boxDisplays || [] ).includes( k.display ) ? [ `its own ${ k.display } line` ] : [] ), ...own ];
			if ( text && lost.length ) {
				out.push( { owner: 'content-page', kind: 'text', detail: `the heading "${ words }" holds "${ text }" as a piece of its own (${ lost.join( ', ' ) }), which the heading's rich text cannot carry: split it into its own block or restyle it` } );
				return;
			}
			visit( k );
		} );
		visit( e );
		return out;
	};
	function inlineContent( e ) {
		const IH = facts.decisions.structural?.inlineHeading || {};
		const words = String( e.allText ?? m.words( e ) ).replace( /\s+/g, ' ' ).trim();
		const handover = [];
		const filled = [];
		const photoOf = ( img ) => {
			const hit = carried?.logo( img, view ) ?? null;
			if ( hit?.id && hit.url ) {
				return `<img class="${ esc( IH.photoClass ) } wp-image-${ hit.id }" src="${ esc( hit.url ) }" alt="${ esc( img.attrs?.alt || '' ) }"/>`;
			}
			handover.push( { owner: 'content-page', kind: 'presence', detail: `the inline photo ${ img.attrs?.srcBasename || img.attrs?.src || '' } in the heading "${ words }": ${ hit?.reason || 'no media map is read for this run' }; insert it with the Inline photo format` } );
			return '';
		};
		const render = ( x, outer ) => {
			const parts = topLevel( outer );
			const kids = m.kids( x );
			if ( parts.filter( ( q ) => q.tag ).length !== kids.length ) {
				return null;
			}
			let out = '';
			let at = 0;
			let gap = false;
			// Text the draft's code fills (`{{ s.h }}`) is the element's rendered words when it is the element's only text.
			const texts = parts.filter( ( q ) => undefined !== q.text && q.text.trim() );
			for ( const part of parts ) {
				if ( undefined !== part.text ) {
					let text = decodeEntities( part.text );
					if ( /\{\{|\}\}/.test( part.text ) ) {
						if ( 1 !== texts.length ) {
							return null;
						}
						text = ( /^\s/.test( part.text ) ? ' ' : '' ) + m.words( x ) + ( /\s$/.test( part.text ) ? ' ' : '' );
						filled.push( part.text.replace( /\s+/g, ' ' ).trim() );
					}
					out = gap ? join( out, escText( text ) ) : out + escText( text );
					gap = false;
					continue;
				}
				const kid = kids[ at++ ];
				if ( kid.tag !== part.tag ) {
					return null;
				}
				if ( 'br' === kid.tag ) {
					out += '<br>';
				} else if ( 'img' === kid.tag ) {
					out += photoOf( kid );
				} else if ( ! wordless( kid ) ) {
					const inner = render( kid, part.html );
					if ( null === inner ) {
						return null;
					}
					const marked = IH.highlightClass && m.words( kid ) && m.kids( kid ).length && m.kids( kid ).every( ( k ) => wordless( k ) && positioned( k ) );
					const piece = marked ? `<span class="${ esc( IH.highlightClass ) }">${ inner }</span>` : inner;
					out = apart( kid, x ) ? join( out, piece ) : out + piece;
					gap = apart( kid, x );
				}
			}
			return out;
		};
		const outer = sourceOf( e );
		const html = outer ? render( e, outer ) : null;
		const plain = ( h ) => decodeEntities( String( h ).replace( /<br>/g, ' ' ).replace( /<[^>]+>/g, '' ) ).replace( /\s+/g, ' ' ).trim();
		if ( null !== html && plain( html ).replace( /\s/g, '' ) === words.replace( /\s/g, '' ) ) {
			filled.length && handover.unshift( { owner: 'content-page', kind: 'text', detail: `the heading "${ words }" holds words the draft's code fills (${ filled.join( ', ' ) }): its rendered words are written` } );
			return { html: html.replace( /\s+/g, ' ' ).trim(), handover: [ ...pieceRows( e, IH, plain( html ) ), ...handover ] };
		}
		const imgs = [];
		const walk = ( x ) => m.kids( x ).forEach( ( k ) => ( 'img' === k.tag ? imgs.push( k ) : walk( k ) ) );
		walk( e );
		// The words the draft's code fills: the fact record's text holes of the heading and everything in it.
		const holes = ( x ) => [ ...( view?.entry( x )?.template.holes || [] ).filter( ( h ) => 'text' === h.where ).map( ( h ) => `{{ ${ h.expr } }}` ), ...m.kids( x ).flatMap( holes ) ];
		const bound = [ ...new Set( holes( e ) ) ];
		const said = bound.length ? [ { owner: 'content-page', kind: 'text', detail: `the heading "${ words }" holds words the draft's code fills (${ bound.join( ', ' ) }): its rendered words are written` } ] : [];
		return { html: escText( words ), handover: [ ...pieceRows( e, IH, words ), ...said, ...imgs.map( ( img ) => ( { owner: 'content-page', kind: 'presence', detail: `the inline photo ${ img.attrs?.srcBasename || img.attrs?.src || '' } in the heading "${ words }": its place among the words is not readable from the draft's source; insert it with the Inline photo format` } ) ) ] };
	}

	// The content settings of one element's block. Returns { a (attributes), handover }.
	function contentAttrs( block, e, top ) {
		const a = {};
		const handover = [];
		const t = m.words( e );
		if ( top.inline && m.kids( e ).length ) {
			const { text: textAttr } = skeletonSettings( facts, block );
			const r = inlineContent( e );
			textAttr && ( a[ textAttr ] = r.html );
			return { a: { ...a, ...( top.attributes || {} ) }, handover: r.handover };
		}
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
		// A wordless element with no block inside it writes its text setting empty, so the block's default words never print. Only
		// a leaf block (the element is its text: button, heading, label) is that element's words: a composite block's first text
		// setting is another part's (sgs/cart's `panelHeading`), which a wordless trigger says nothing about.
		textAttr && ! t && ! m.blockKids( e ).length && 'leaf' === composition[ block ]?.composition_role && printsDefaultText( facts, block, textAttr ) && ( a[ textAttr ] = '' );
		top.linkSource && ( a.linkSource = top.linkSource );
		const href = e.attrs?.href;
		if ( linkAttr && href ) {
			// The draft's destination as a site address (lib/draft-link.mjs): a draft route is never written as it stands.
			const r = siteLink( href, e );
			if ( 'none' === r.kind ) {
				const onClick = handlerOf( elementHandler( e ) );
				handover.push( { owner: 'behaviour', kind: 'link', detail: `draft link is "#"${ onClick ? ` and navigates by script ${ onClick }` : '' }${ r.routes ? ` to one of ${ r.routes.map( ( x ) => `"${ x }"` ).join( ', ' ) } by the item it is clicked on` : '' }: destination not in the draft, url left empty` } );
			} else if ( ! top.linkSource ) {
				const out = linkWrite( r, href );
				null !== out.value && ( a[ linkAttr ] = out.value );
				out.handover && handover.push( out.handover );
			}
			e.attrs?.target && attrExists( block, 'linkTarget' ) && ( a.linkTarget = e.attrs.target );
		}
		return { a: { ...a, ...Object.fromEntries( Object.entries( top.attributes || {} ) ) }, handover };
	}

	// The ids the build holds for this element's block: a logo block's Source (the attachment of the file the element
	// draws) and a menu block's `ref` (the menu site-build made for this surface). { attrs, said: { attr: where from } }.
	function carriedAttrs( block, e ) {
		const out = { attrs: {}, said: {}, missing: [] };
		if ( ! carried ) {
			return out;
		}
		const [ logoAttr ] = facts.logoBlocks.includes( block ) ? logoSource( block ) : [];
		if ( logoAttr ) {
			const hit = carried.logo( e, view );
			hit?.id && hit.url && Object.assign( out.attrs, { [ logoAttr ]: itemSource( hit ) } ) && ( out.said[ logoAttr ] = `media-map.json: ${ hit.asset }` );
			hit?.reason && out.missing.push( `${ e.key }: no ${ logoAttr } is carried: ${ hit.reason }` );
		}
		if ( 'nav' === e.tag && attrExists( block, 'ref' ) && surfaceKind ) {
			const id = carried.menu( surfaceKind );
			id && Object.assign( out.attrs, { ref: id } ) && ( out.said.ref = `menu-map.json: the ${ surfaceKind } menu` );
		}
		return out;
	}
	return { contentAttrs, carriedAttrs };
}
