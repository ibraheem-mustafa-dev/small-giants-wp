// The settings one element's block takes from the draft element (Spec 48 §3.4, split out of
// lib/skeleton-propose.mjs::proposeSkeleton): `contentAttrs` the content, identity and structure settings (a skeleton holds
// no style value, R-47-10) with the handover notes for what no setting can hold, and `carriedAttrs` the ids the build holds
// for the element's block (a logo block's Source, a menu block's `ref`).
// The factory takes the writer's shared context (`ctx`).
import { blockMediaSlots } from './media/slots.mjs';
import { itemSource } from './media/write.mjs';
import { LOGO_HANDOVER } from './skeleton-write-units.mjs';
import { elementHandler, handlerOf, linkWrite } from './draft-link.mjs';
import { makeClock, timeTextRanges } from './skeleton-clock.mjs';
import fs from 'fs';
import path from 'path';
import { decodeEntities, loadDraft } from './intake-ast.mjs';
import { declared as declaredRaw } from './skeleton-rules.mjs';
import { draftTokenLookup, handoffOf } from './draft-tokens.mjs';
import { ALL_TEXT_CAP } from './skeleton-model.mjs';
import { disabledLabels, surfaceMenus } from './site-build-menus.mjs';

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
	has( 'disabledItemIds' ) && out.others.push( 'disabledItemIds' );
	return out;
}

export function makeContent( ctx ) {
	const { m, facts, view, carried, draftLinks, surfaceKind, surfaceId, siteLink } = ctx;
	const { composition, enumOf } = facts;
	const tokens = draftTokenLookup( handoffOf( facts ) );
	const declared = ( e ) => declaredRaw( e, tokens );
	const attrExists = ( slug, name ) => !! facts.attr( slug, name );
	const clock = makeClock( { facts, view, read: { textHoles: ( e ) => ( view.entry( e )?.template?.holes ?? [] ).filter( ( h ) => 'text' === h.where ) } } );
	// The time-based text option of a text block whose words the draft's code picks by the hour of the clock
	// (lib/skeleton-clock.mjs, rules.timeText): the hour ranges with their words, and the time zone when the code names one.
	// {} when the element's words are no such value or the block does not take the option (the framework DB).
	// An element whose own words sit beside inline children (a glyph before the greeting) passes its rich text as `inlineHtml`:
	// each range's words replace the element's own rendered words inside it, so the children stay in every range.
	const timeTextAttrs = ( block, e, inlineHtml = null ) => {
		const T = facts.decisions.rules?.timeText;
		const c = T?.attribute && attrExists( block, T.attribute ) ? clock( e ) : null;
		const own = String( m.words( e ) ).trim();
		// inlineHtml holds the words as a text setting does (angle brackets escaped), so both the words searched for and each range's words are put in that form.
		const ownHtml = escText( own );
		const around = ( x ) => ( inlineHtml && own && 2 === inlineHtml.split( ownHtml ).length ? inlineHtml.split( ownHtml ).join( escText( x ) ) : null );
		const bare = c && ! c.openStatus ? timeTextRanges( c ) : null;
		const ranges = inlineHtml ? ( bare?.every( ( r ) => null !== around( r.text ) ) ? bare.map( ( r ) => ( { ...r, text: around( r.text ) } ) ) : null ) : bare;
		return ranges ? { [ T.attribute ]: ranges, ...( c.zone && T.zoneAttribute && attrExists( block, T.zoneAttribute ) ? { [ T.zoneAttribute ]: c.zone } : {} ) } : {};
	};
	const layoutOf = ( slug, e ) => {
		const opts = attrExists( slug, 'layout' ) ? enumOf( slug, 'layout' ) || [] : [];
		const want = 'flex' === e.display && 'column' === e.flexDirection && opts.includes( 'stack' ) ? 'stack' : e.display;
		return opts.includes( want ) ? { layout: want } : {};
	};

	// The rich text of a heading whose children are all inline, or of an element whose own words sit beside inline children
	// (lib/skeleton-classify.mjs, structural.inlineHeading and structural.inlineText), read in
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
	// What the handover rows call the element: a heading, or the text an element of words is (structural.inlineText).
	const noun = ( e ) => ( /^h[1-6]$/.test( e.tag ) ? 'heading' : 'text' );
	// The rich-text format a phrasing child keeps (the body formats every SGS text and heading offers: bold, italic,
	// strikethrough, link); any other phrasing child is its words alone.
	const FORMAT = { b: 'strong', strong: 'strong', i: 'em', em: 'em', s: 's', del: 's' };
	// The format a phrasing child's declared style draws where its tag names none (never a link's, whose address it keeps): a
	// line through its words is strikethrough.
	const styleFormat = ( kid ) => ( 'a' !== kid.tag && /\bline-through\b/i.test( String( declared( kid )[ 'text-decoration-line' ] ?? declared( kid )[ 'text-decoration' ] ?? '' ) ) ? 's' : null );
	const insideControl = ( k ) => {
		for ( let p = m.byKey[ k.parentKey ]; p; p = m.byKey[ p.parentKey ] ) {
			if ( 'a' === p.tag || 'button' === p.tag ) {
				return true;
			}
		}
		return false;
	};
	const pieceRows = ( e, IH, words ) => {
		const out = [];
		const visit = ( x ) => m.kids( x ).forEach( ( k ) => {
			const text = String( k.allText ?? m.words( k ) ).replace( /\s+/g, ' ' ).trim();
			const own = ( IH.ownTypeProps || [] ).filter( ( p ) => ownValue( declared( k )[ p ] ) && declared( k )[ p ] !== declared( e )[ p ] ).map( ( p ) => `${ p } ${ declared( k )[ p ] }` );
			const lost = [ ...( ( IH.boxDisplays || [] ).includes( k.display ) ? [ `its own ${ k.display } line` ] : [] ), ...own ];
			if ( text && lost.length ) {
				out.push( { owner: 'content-page', kind: 'text', detail: `the ${ noun( e ) } "${ words }" holds "${ text }" as a piece of its own (${ lost.join( ', ' ) }), which the ${ noun( e ) }'s rich text cannot carry: split it into its own block or restyle it` } );
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
		// The phrasing children written in a format their style draws: [ { key, format } ] (the row records it, kind `format`).
		const formats = [];
		const photoOf = ( img ) => {
			const hit = carried?.logo( img, view ) ?? null;
			if ( hit?.id && hit.url ) {
				return `<img class="${ esc( IH.photoClass ) } wp-image-${ hit.id }" src="${ esc( hit.url ) }" alt="${ esc( img.attrs?.alt || '' ) }"/>`;
			}
			handover.push( { owner: 'content-page', kind: 'presence', detail: `the inline photo ${ img.attrs?.srcBasename || img.attrs?.src || '' } in the ${ noun( e ) } "${ words }": ${ hit?.reason || 'no media map is read for this run' }; insert it with the Inline photo format` } );
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
					const piece = format( kid, marked ? `<span class="${ esc( IH.highlightClass ) }">${ inner }</span>` : inner );
					out = apart( kid, x ) ? join( out, piece ) : out + piece;
					gap = apart( kid, x );
				}
			}
			return out;
		};
		// A bold, italic or struck child keeps its format; a link child its site address (lib/draft-link.mjs), unless it sits
		// inside a link or button already (a link in a link is invalid) or its address does not resolve (a handover row).
		function format( kid, inner ) {
			const tag = FORMAT[ kid.tag ] ?? styleFormat( kid );
			if ( tag ) {
				FORMAT[ kid.tag ] || formats.push( { key: kid.key, format: tag } );
				return `<${ tag }>${ inner }</${ tag }>`;
			}
			const href = 'a' === kid.tag ? kid.attrs?.href : null;
			if ( ! href || ! siteLink || insideControl( kid ) ) {
				return inner;
			}
			const r = siteLink( href, kid );
			const out = 'none' === r.kind ? { value: null, handover: { owner: 'behaviour', kind: 'link', detail: `the link "${ m.words( kid ) }" in the ${ noun( e ) } "${ words }": draft link "${ href }" has no destination in the draft; its words are kept without a link` } } : linkWrite( r, href );
			out.handover && handover.push( out.handover );
			return null === out.value ? inner : `<a href="${ esc( out.value ) }">${ inner }</a>`;
		}
		const outer = sourceOf( e );
		const html = outer ? render( e, outer ) : null;
		const plain = ( h ) => decodeEntities( String( h ).replace( /<br>/g, ' ' ).replace( /<[^>]+>/g, '' ) ).replace( /\s+/g, ' ' ).trim();
		// The rendered text is kept to ALL_TEXT_CAP characters: a longer element's source matches it as far as it goes.
		const bare = ( x ) => x.replace( /\s/g, '' );
		const capped = words.length >= ALL_TEXT_CAP;
		if ( null !== html && ( capped ? bare( plain( html ) ).startsWith( bare( words ) ) : bare( plain( html ) ) === bare( words ) ) ) {
			filled.length && handover.unshift( { owner: 'content-page', kind: 'text', detail: `the ${ noun( e ) } "${ words }" holds words the draft's code fills (${ filled.join( ', ' ) }): its rendered words are written` } );
			return { html: html.replace( /\s+/g, ' ' ).trim(), handover: [ ...pieceRows( e, IH, plain( html ) ), ...handover ], formats };
		}
		const imgs = [];
		const walk = ( x ) => m.kids( x ).forEach( ( k ) => ( 'img' === k.tag ? imgs.push( k ) : walk( k ) ) );
		walk( e );
		// The words the draft's code fills: the fact record's text holes of the heading and everything in it.
		const holes = ( x ) => [ ...( view?.entry( x )?.template.holes || [] ).filter( ( h ) => 'text' === h.where ).map( ( h ) => `{{ ${ h.expr } }}` ), ...m.kids( x ).flatMap( holes ) ];
		const bound = [ ...new Set( holes( e ) ) ];
		const said = bound.length ? [ { owner: 'content-page', kind: 'text', detail: `the ${ noun( e ) } "${ words }" holds words the draft's code fills (${ bound.join( ', ' ) }): its rendered words are written` } ] : [];
		const cut = capped ? [ { owner: 'content-page', kind: 'text', detail: `the ${ noun( e ) } "${ words }" is longer than the ${ ALL_TEXT_CAP } characters of rendered text the inventory keeps and its source cannot be read in order: type the rest of its words` } ] : [];
		return { html: escText( words ), handover: [ ...cut, ...pieceRows( e, IH, words ), ...said, ...imgs.map( ( img ) => ( { owner: 'content-page', kind: 'presence', detail: `the inline photo ${ img.attrs?.srcBasename || img.attrs?.src || '' } in the ${ noun( e ) } "${ words }": its place among the words is not readable from the draft's source; insert it with the Inline photo format` } ) ) ] };
	}

	// Whether an element's own words go to a body child of `block` (rules.wrappedWords): the block wraps a container and the
	// element has words and no block inside it.
	function wrappedBody( block, e ) {
		return !! facts.decisions.rules?.wrappedWords?.block && !! composition[ block ]?.wraps_block && !! m.words( e ) && ! m.blockKids( e ).length;
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
			textAttr && Object.assign( a, timeTextAttrs( block, e, r.html ) );
			return { a: { ...a, ...( top.attributes || {} ) }, handover: r.handover, formats: r.formats ?? [] };
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
		// A block that holds its body as inner blocks (it wraps a container: sgs/quote) keeps an element's own words in a body
		// child (lib/skeleton-propose.mjs, rules.wrappedWords), never in its first text setting, which names another part (the
		// quote's attribution).
		if ( wrappedBody( block, e ) ) {
			return { a: { ...a, ...( top.attributes || {} ) }, handover };
		}
		textAttr && t && ( a[ textAttr ] = m.textWithBreaks( e ).includes( '<br>' ) ? m.textWithBreaks( e ) : t );
		textAttr && t && Object.assign( a, timeTextAttrs( block, e ) );
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

	// Which navigation group of the surface an element is (0 for the first). Only a drawer has groups: it binds the menu the page
	// map made for the same group, in document order (lib/site-build-map.mjs::boundMenu), so every other surface is group 0.
	// A drawer's navigation inside another navigation is no group (null), and the page map makes a menu only for a navigation
	// scope whose items it reads, and none at all for a drawer that holds no link (lib/intake-pagemap-surfaces.mjs, readItems):
	// a navigation that draws no link and no plain label, or any navigation of a drawer with no link, is no group, so the later
	// groups keep their own menus (a drawer the page map made no menu for shares the header menu: every navigation is a group
	// there). The inventory carries a template-relative line and no column, so the page map's per-menu
	// draft id cannot be matched to an element; the page map's own rule is read from the elements instead (`drawsItems`).
	const ancestorsOf = ( n ) => {
		const up = [];
		for ( let p = m.byKey[ n.parentKey ]; p; p = m.byKey[ p.parentKey ] ) {
			up.push( p );
		}
		return up;
	};
	const navAbove = ( n ) => ancestorsOf( n ).some( ( p ) => 'nav' === p.tag );
	// What readItems reads inside a navigation: a link, or (a drawer reads labels) an element that is no link and no control and
	// holds words of its own, with none of the elements it sits in a link, a control or a heading.
	const NOT_A_LABEL = new Set( [ 'a', 'button', 'input', 'select', 'textarea', 'img', 'svg', 'picture', 'video', 'audio', 'canvas', 'nav', 'ul', 'ol', 'dl', 'form', 'label', 'script', 'style', 'template', 'iframe', 'br', 'hr' ] );
	const isLabel = ( x ) => ! NOT_A_LABEL.has( x.tag ) && ! /^h[1-6]$/.test( x.tag ) && '' !== String( x.words ?? '' ).trim();
	const between = ( x, n ) => {
		const up = [];
		let p = m.byKey[ x.parentKey ];
		for ( ; p && p !== n; p = m.byKey[ p.parentKey ] ) {
			up.push( p );
		}
		return p === n ? up : null;
	};
	const drawsItems = ( n ) => m.els.some( ( x ) => {
		const up = x === n ? null : between( x, n );
		return !! up && ( 'a' === x.tag || ( isLabel( x ) && ! up.some( ( p ) => NOT_A_LABEL.has( p.tag ) || /^h[1-6]$/.test( p.tag ) ) ) );
	} );
	let groups = null;
	const navOrdinal = ( e ) => {
		if ( 'drawer' !== surfaceKind ) {
			return 0;
		}
		// Membership matters where the page map made menus for this drawer; a drawer it made none for shares the header menu.
		const anyLink = m.els.some( ( n ) => 'a' === n.tag );
		groups ||= m.els.filter( ( n ) => 'nav' === n.tag && ! navAbove( n ) && ( ! ownMenus || ( anyLink && drawsItems( n ) ) ) );
		const at = groups.indexOf( e );
		return at < 0 ? null : at;
	};
	// The drawer's own menus in the draft's document order, for navOrdinal to index (lib/site-build-menus.mjs::surfaceMenus).
	const ownMenus = surfaceMenus( draftLinks?.menuItems, surfaceKind, surfaceId );

	// The ids the build holds for this element's block: a logo block's Source (the attachment of the file the element
	// draws) and a menu block's `ref` (the menu site-build made for this surface). { attrs, said: { attr: where from } }.
	function carriedAttrs( block, e, top = null ) {
		const out = { attrs: {}, said: {}, missing: [] };
		if ( ! carried ) {
			return out;
		}
		// The menu's link-less labels (a nav item drawn as plain words) are the block's disabled items: the site build made
		// each a custom item, whose identifier the site recorded in menu-map.json (lib/site-build-map.mjs::itemIdentifier). A
		// label the site holds no item for writes nothing and is reported.
		const group = 'nav' === e.tag ? navOrdinal( e ) : null;
		const labels = null !== group && attrExists( block, 'disabledItemIds' ) && surfaceKind && draftLinks?.menuItems ? disabledLabels( draftLinks.menuItems, surfaceKind, group, surfaceId ) : [];
		if ( labels.length ) {
			const known = carried.items?.( surfaceKind, group, ownMenus ) || {};
			const ids = labels.filter( ( l ) => known[ l ] ).map( ( l ) => known[ l ] );
			ids.length && Object.assign( out.attrs, { disabledItemIds: ids } ) && ( out.said.disabledItemIds = `the draft's ${ surfaceKind } nav draws ${ ids.length } item(s) as plain words; menu-map.json: their item identifiers` );
			labels.filter( ( l ) => ! known[ l ] ).forEach( ( l ) => out.missing.push( `${ e.key }: no item identifier is carried for "${ l }": menu-map.json records no such item of the ${ surfaceKind } menu for this site (run site-build.mjs --menus --apply)` ) );
		}
		const [ logoAttr ] = facts.logoBlocks.includes( block ) ? logoSource( block ) : [];
		if ( logoAttr ) {
			const hit = carried.logo( e, view );
			hit?.id && hit.url && Object.assign( out.attrs, { [ logoAttr ]: itemSource( hit ) } ) && ( out.said[ logoAttr ] = `media-map.json: ${ hit.asset }` );
			hit?.reason && out.missing.push( `${ e.key }: no ${ logoAttr } is carried: ${ hit.reason }` );
		}
		if ( null !== group && attrExists( block, 'ref' ) && surfaceKind ) {
			const id = carried.menu( surfaceKind, group, ownMenus );
			id ? Object.assign( out.attrs, { ref: id } ) && ( out.said.ref = `menu-map.json: the ${ surfaceKind } menu` ) : 'drawer' === surfaceKind && false !== carried.menuRecord && out.missing.push( `${ e.key }: no menu ref is carried for navigation group ${ group + 1 } of the drawer: menu-map.json holds no menu for it on this site (run site-build.mjs --menus --apply)` );
		}
		// A header control that opens a mega panel is a menu bar bound to the second header menu its page-map item sits in
		// (rules.megaOpenerMenu), and the far side's links of a split header menu a bar bound to the header menu
		// (rules.splitMenu). A menu the map lacks would draw an unbound, empty bar, so it is reported.
		if ( top?.menu && attrExists( block, 'ref' ) ) {
			const id = carried.menu( top.menu );
			id ? Object.assign( out.attrs, { ref: id } ) && ( out.said.ref = `menu-map.json: the ${ top.menu } menu` ) : out.missing.push( `${ e.key }: no menu ref is carried: menu-map.json holds no ${ top.menu } menu for this site (run site-build.mjs --menus --apply)` );
		}
		// A product tile's card shows the product the site build made for the draft product it names (rules.productTile).
		// Without it the card would show no product, so a missing one is reported.
		if ( top?.product && attrExists( block, 'productId' ) && carried.product ) {
			const hit = carried.product( top.product );
			hit?.id && Object.assign( out.attrs, { productId: hit.id } ) && ( out.said.productId = `catalogue.json: the product made for draft product ${ top.product }` );
			hit?.reason && out.missing.push( `${ e.key }: no productId is carried: ${ hit.reason }` );
		}
		// Each half of a split header menu names the item the split falls after by the identifier the site recorded for it
		// (lib/site-build-map.mjs::itemIdentifier). Without it the block draws every item in both halves, so a missing one is
		// reported, never left out in silence.
		if ( top?.split?.after && attrExists( block, 'splitAfterItemId' ) && surfaceKind ) {
			const id = ( carried.items?.( surfaceKind, group ?? 0, ownMenus ) || {} )[ top.split.after ];
			id ? Object.assign( out.attrs, { splitAfterItemId: id } ) && ( out.said.splitAfterItemId = `menu-map.json: the ${ surfaceKind } menu's item "${ top.split.after }"` ) : out.missing.push( `${ e.key }: no splitAfterItemId is carried: menu-map.json records no item "${ top.split.after }" of the ${ surfaceKind } menu for this site (run site-build.mjs --menus --apply)` );
		}
		return out;
	}
	return { contentAttrs, carriedAttrs, wrappedBody, timeTextAttrs };
}
