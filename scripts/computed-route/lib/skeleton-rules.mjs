// Skeleton writer step 2a, the standing rules (Spec 48 FR-48-6, the rules from Bean's review of 2026-10-13): framework-wide
// verdicts that settle an element before any scoring, so a row settled here is settled the same way for every client.
// Each rule has an id, its patterns and its reason in data/skeleton-decisions.json `rules`; this file holds only the
// mechanisms. A verdict is { rule, reason, ... } with one of:
//   action 'remove'  the element and everything in it go (a decoration layer, a typed divider, a site setting);
//   action 'unwrap'  the element goes and its children take its place (a width wrapper, the link around a logo);
//   block            the element becomes that block; `absorb` true when the block draws the element's children itself.
// Precedence (lib/skeleton-classify.mjs::makeClassifier): a client decision, then these rules, then a finaliser pick or a
// standing element decision, then the database scoring.
import path from 'path';
import { narrowedLists, narrowsRenderedList } from './skeleton-narrowing.mjs';
import { specHit } from './skeleton-facts.mjs';
import { deliveredKind } from './decoration-layers.mjs';
import { templateKey } from './fact-key.mjs';
import { recordView } from './skeleton-record.mjs';
import { pxOf, everyWidth, someWidth } from './element-facts.mjs';
import { paintsBox, lookOfProperty, BAND_LOOKS, INHERITED_LOOKS } from './skeleton-paint-conservation.mjs';
import { positioned, clash } from './skeleton-absorb-wrapper.mjs';
import { makePanelRules } from './skeleton-panel-rules.mjs';
import { commerceRegion, ownerBlockOf } from './skeleton-commerce-region.mjs';
import { productTiles } from './skeleton-product-tile.mjs';
import { reviewPlatformRegions } from './skeleton-review-platform.mjs';
import { pictureTileGrids, textTileGrids } from './skeleton-picture-tiles.mjs';
import { numberedSteps } from './skeleton-numbered-steps.mjs';
import { messagingLink } from './skeleton-messaging-link.mjs';
import { handlerScrollsTop } from './skeleton-scroll-top.mjs';
import { filterRail } from './skeleton-filter-rail.mjs';
import { linkWrite, siteLinkResolver } from './draft-link.mjs';
import { choiceFlowModel } from './skeleton-choice-flow.mjs';
import { blockPartSurfaces } from './skeleton-surface-role.mjs';
import { handlerOpens, handlerCloses, opensOn } from './skeleton-handler-opens.mjs';
import { makeFieldGroups } from './skeleton-field-groups.mjs';
import { widgetModel } from './skeleton-widgets.mjs';
import { makeClock } from './skeleton-clock.mjs';
import { keptSvg, lucideNearest, statedSvgSize } from './fill-icon.mjs';
import { draftTokenLookup, handoffOf, resolvedOrRaw } from './draft-tokens.mjs';
import { heroSplitOrder, heroMediaAlignment } from './skeleton-hero-order.mjs';
import { behindContent, contentAnchor } from './skeleton-hero-background.mjs';
import { heroCollage } from './skeleton-hero-collage.mjs';
import { tileCount, stripGap, squareTile, boxWidths } from './skeleton-tile-count.mjs';
import { menuOfOpener } from './skeleton-mega-opener.mjs';
import { splitLinkOf, sidesOf } from './skeleton-split-menu.mjs';
import { openerTargets, controlWrites, openedBy, openerAttributes } from './skeleton-openers.mjs';
import { PX_TOL } from './css-equivalence/tolerance.mjs';

// Whether words are the Site Info value of a kind itself (a typed phone number or email address), so a label showing
// them reads Site Info too.
export function isSiteInfoValue( text, kind ) {
	const VALUE = { phone: /^[+\d][\d\s()-]{6,20}$/, email: /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i };
	return !! VALUE[ kind ]?.test( String( text ?? '' ) );
}

// The element's declared inline style as { property: value } (lower-case property names; values as written, which may
// hold a draft binding such as {{ R.px }}). With a token lookup (lib/draft-tokens.mjs::draftTokenLookup) a value written
// with the draft's tokens (`var(--radius-pill)`) is that token's value; one the lookup cannot resolve stays as written.
export function declared( e, lookup = null ) {
	const out = {};
	for ( const part of String( e.attrs?.style || '' ).split( ';' ) ) {
		const at = part.indexOf( ':' );
		if ( at > 0 ) {
			const value = part.slice( at + 1 ).trim();
			out[ part.slice( 0, at ).trim().toLowerCase() ] = lookup ? resolvedOrRaw( value, lookup ) : value;
		}
	}
	return out;
}

const px = ( v ) => {
	const n = /^(-?[\d.]+)px$/.exec( String( v ?? '' ).trim() );
	return n ? Number( n[ 1 ] ) : null;
};
// A letter-spacing in em (a px value over a 16px base).
const em = ( v ) => {
	const n = /^(-?[\d.]+)(em|px)$/.exec( String( v ?? '' ).trim() );
	if ( ! n ) {
		return null;
	}
	return 'em' === n[ 2 ] ? Number( n[ 1 ] ) : Number( n[ 1 ] ) / 16;
};
// The largest padding a declared style puts above or below the content, in px (a shorthand of one to four values, the
// block shorthand or the top and bottom longhands; a value that is not a plain length counts as 0).
export function blockPadding( st ) {
	const sides = String( st.padding ?? '' ).trim().split( /\s+/ ).filter( Boolean );
	const block = String( st[ 'padding-block' ] ?? '' ).trim().split( /\s+/ ).filter( Boolean );
	const vals = [ sides[ 0 ], sides[ 2 ] ?? sides[ 0 ], block[ 0 ], block[ 1 ] ?? block[ 0 ], st[ 'padding-top' ], st[ 'padding-bottom' ] ];
	return Math.max( 0, ...vals.map( ( x ) => ( '0' === String( x ?? '' ).trim() ? 0 : px( x ) ?? 0 ) ) );
}
const DECORATION_TAGS = new Set( [ 'img', 'iframe', 'video', 'input', 'textarea', 'select', 'hr' ] );

// A small marker that holds nothing, in the flow of the text beside it: a dot (both sides at most D.maxDotPx) or a short
// bar (at most D.maxBarHeightPx tall and D.maxBarWidthPx wide). D is the decisions entry rules.dotMarker; none, never.
export function isMarker( e, m, D, view = recordView( null ) ) {
	const st = declared( e );
	if ( ! D || m.words( e ) || m.blockKids( e ).length || m.kids( e ).some( ( k ) => 'svg' === k.tag ) || DECORATION_TAGS.has( e.tag ) || [ 'absolute', 'fixed' ].includes( st.position ) ) {
		return false;
	}
	// A control the visitor operates (a slider's pagination dot, a swatch) is never a marker.
	if ( [ 'a', 'button' ].includes( e.tag ) || null != e.attrs?.[ 'aria-label' ] || null != e.attrs?.role || null != view.attr( e, 'tabindex' ) || /\s(?:sc-camel-on-click|onClick)=/.test( e.snippet || '' ) ) {
		return false;
	}
	// Its size is what the browser resolved at every width it renders (a token or clamp() included); an element read before
	// the values were recorded is judged by the size it declares. A computed `auto` (an inline box) is its declared size.
	const shape = ( w, h ) => null != w && null != h && ( ( w <= D.maxDotPx && h <= D.maxDotPx ) || ( h <= D.maxBarHeightPx && w <= D.maxBarWidthPx ) );
	if ( ! everyWidth( e, ( r ) => shape( pxOf( r.width ) ?? px( st.width ), pxOf( r.height ) ?? px( st.height ) ), () => shape( px( st.width ), px( st.height ) ) ) ) {
		return false;
	}
	// It marks text: its parent holds words of its own or in another child.
	const p = m.byKey[ e.parentKey ];
	return !! p && ( !! m.words( p ) || m.blockKids( p ).some( ( k ) => k !== e && String( k.allText ?? m.words( k ) ).trim() ) );
}
// A length in px, with rem and em read against a 16px root (the draft's declared lengths); null for anything else.
function lengthPx( v ) {
	const n = /^(-?[\d.]+)(px|rem|em)$/.exec( String( v ?? '' ).trim() );
	if ( ! n ) {
		return null;
	}
	return 'px' === n[ 2 ] ? Number( n[ 1 ] ) : Number( n[ 1 ] ) * 16;
}
// A font weight as a number: keywords as CSS maps them (normal 400, bold and bolder 700, lighter 300).
const WEIGHT_WORDS = { normal: 400, bold: 700, bolder: 700, lighter: 300 };
function weightOf( v ) {
	const t = String( v ?? '' ).trim().toLowerCase();
	return WEIGHT_WORDS[ t ] ?? ( Number( t ) || null );
}
// One or more emoji (each optionally followed by a variation selector or a zero-width joiner), spaces removed first.
const EMOJI = /^(?:\p{Extended_Pictographic}[\u{FE0F}\u{200D}]?)+$/u;
const HEADING = /^h[1-6]$/;
// The computed corner radii and padding sides the inventory records per width (lib/skeleton-inventory.mjs::RESOLVED).
const CORNERS = [ 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius' ];
const SIDES = [ 'padding-top', 'padding-right', 'padding-bottom', 'padding-left' ];
// A declared inline style that paints a box: a background, a box shadow or a border (a radius alone paints nothing).
const PAINT_DECL = /(?:^|;)\s*(?:background(?:-color)?|box-shadow|border(?:-width|-color)?)\s*:\s*(?!none\b|transparent\b|0(?:px)?\s*(?:;|$))/;

// o: { m (lib/skeleton-model.mjs), facts (lib/skeleton-facts.mjs), surface: { slug, kind, name }, hooks: { siteInfoKinds,
// isColumnLabel, topBlock, blockOfKey, siteLink } (the classifier's own readings: an element's Site Info kinds, whether it heads a
// column of links, the block its plain scoring proposes, the block already proposed for an ancestor's key; and the draft-link
// resolver, lib/draft-link.mjs::siteLinkResolver), motion (a Set
// of template keys, `<component>/<tpl>`, whose own animation loops a translate for ever: lib/skeleton-rerun.mjs::loopingKeys),
// view (lib/skeleton-record.mjs::recordView: the fact record's reading of each element's attributes and declarations; an
// empty view reads the rendered attributes), scope (lib/skeleton-record.mjs::surfaceContext: the surface's parent, kind and
// opener, or null) }. `surface.role` is the page map's role for the surface (lib/skeleton-surface-role.mjs::surfaceRole);
// `surface.pageMap` the page-map rows (which drawer another row's block draws, for the control that opens it).
// A list a looping strip renders twice so its scroll joins up (the second half repeats the first) read once; any other list
// as it is.
export function onceOfLoop( list ) {
	const half = list.length / 2;
	return list.length >= 2 && Number.isInteger( half ) && list.slice( 0, half ).every( ( x, i ) => x === list[ half + i ] ) ? list.slice( 0, half ) : list;
}

// Where the looks of the elements a rule drops go when no node reads them (lib/skeleton-paint-conservation.mjs::RECORD_KINDS):
// the propose-time check records it on each row the rule dropped (lib/skeleton-propose.mjs). A linked form's fields and a
// commerce region's pieces are built and read on surfaces of their own; a surface the client built as a post follows that post.
export const DISSOLVED_LOOKS = {
	formLink: { kind: 'own-surface' },
	commerceRegion: { kind: 'own-surface' },
	filterRail: { kind: 'own-surface' },
	clientBuiltSurface: { kind: 'site-decision' },
};

export function makeRules( { m, facts, surface = {}, hooks, motion = new Set(), view = recordView( null ), scope = null } ) {
	// The draft's own tokens, so a value the draft writes as a token (`var(--radius-pill)`) is read as its value.
	const tokens = draftTokenLookup( handoffOf( facts ) );
	const R = facts.decisions.rules || {};
	const panel = makePanelRules( { m, view, scope, R, facts, surface, declared: ( e ) => declared( e, tokens ) } );
	// A block holds its items in an attribute when one array attribute has a field that is content; an array whose fields are
	// all behaviour or technical (a motion-parts list such as sgs/hero's backgroundSvgParts) holds no items, so the block still holds inner blocks.
	const arrayBlocks = new Set( facts.q( "SELECT block_slug FROM array_item_schema GROUP BY block_slug, array_attr HAVING SUM( role IS NULL OR role NOT IN ( 'behaviour', 'technical' ) ) > 0" ).map( ( r ) => r.block_slug ) );
	const drawsListed = Object.fromEntries( ( R.drawsChildren?.blocks || [] ).map( ( d ) => [ d.block, d.reason ] ) );

	// Why a block draws the draft children of the element it replaces (so they are absorbed, not built), or null: a leaf
	// holds no inner blocks, a block with an array item schema holds its items in an attribute, and the named blocks read
	// their items from elsewhere (Site Info, a WordPress menu).
	const drawsChildren = ( block ) => {
		if ( ! block ) {
			return null;
		}
		if ( 'leaf' === facts.composition[ block ]?.composition_role ) {
			return `block_composition: ${ block } is a leaf (no inner blocks)`;
		}
		if ( arrayBlocks.has( block ) ) {
			return `array_item_schema: ${ block } holds its items in an attribute`;
		}
		return drawsListed[ block ] ? `decisions rules.drawsChildren: ${ block } ${ drawsListed[ block ] }` : null;
	};

	// All the words of an element: its own, then each block child's, joined by spaces (the inventory's allText runs the
	// children together, "SundayClosed").
	// The element's own words come after its first block child's text when the draft's own text runs that way (a row of stars
	// before the words that follow them): the inventory's allText holds the document order.
	const all = ( e ) => {
		const kids = m.blockKids( e );
		const own = m.words( e );
		const first = kids.length && own ? all( kids[ 0 ] ) : '';
		const strip = ( x ) => String( x ).replace( /\s+/g, '' );
		const kidFirst = !! first && !! e.allText && strip( e.allText ).startsWith( strip( first ) ) && ! strip( e.allText ).startsWith( strip( own ) );
		const parts = kidFirst ? [ ...kids.map( all ), own ] : [ own, ...kids.map( all ) ];
		const text = kids.length ? parts.filter( Boolean ).join( ' ' ) : String( e.allText ?? own );
		return text.replace( /\s+/g, ' ' ).trim();
	};
	const hasSvg = ( e ) => m.kids( e ).some( ( k ) => 'svg' === k.tag );
	const bare = ( e ) => ! m.words( e ) && ! m.blockKids( e ).length;
	// A fill bar: an element in the flow with no children, alone in a parent that declares its own height in px, filling that
	// height (100%) and a percentage of the width with a fill of its own (a rating breakdown's bar, a progress meter). Placed
	// at its parent's start corner it draws the same as a layer there, and the parent's size never depended on it.
	const FILL = /^(?:background|background-color|background-image)$/;
	const OWN_HEIGHT = /^\d+(?:\.\d+)?(?:px|r?em)$/;
	const fillBar = ( e, st ) => {
		const p = m.byKey[ e.parentKey ];
		const paints = Object.entries( st ).some( ( [ k, val ] ) => FILL.test( k ) && ! /^(?:none|transparent|rgba\(0,\s*0,\s*0,\s*0\))$/.test( String( val ).trim() ) );
		return !! R.decorationLayer?.fillBar && !! p && ! [ 'absolute', 'fixed' ].includes( st.position ) && ! m.kids( e ).length && 1 === m.kids( p ).length && OWN_HEIGHT.test( String( declared( p, tokens ).height ?? '' ).trim() ) && '100%' === String( st.height ?? '' ).trim() && /^\d+(?:\.\d+)?%$/.test( String( st.width ?? '' ).trim() ) && paints;
	};
	// An element that paints a picture: an <img>, or one whose own style paints a url() as its background (a tile photo, a role="img" div).
	const paintsPicture = ( k ) => 'img' === k.tag || /background(?:-image)?\s*:[^;]*url\(/i.test( String( k.attrs?.style ?? '' ) );
	// A mount's host (the element the runtime stamps for a `dc-import`) or a mounted component's root (the host's child)
	// that is layout-neutral: no words, one child, no declared style beyond R.mountWrapper.properties, and at every read
	// width where both are drawn the same box as that child (so it paints, sizes and places nothing of its own).
	// Only a mount of one control is unwrapped: following single children down from the wrapper, through the other mount
	// wrapper, reaches a tag of R.mountWrapper.controls (a link, button or field), so a mounted form, card or section keeps
	// its wrappers as before.
	const isMountHost = ( e ) => 'dc-import' === e?.srcTag;
	const inMountChain = ( e ) => isMountHost( e ) || isMountHost( m.byKey[ e.parentKey ] );
	const sameBox = ( a, b ) => [ 'x', 'y', 'w', 'h' ].every( ( k ) => Math.abs( a[ k ] - b[ k ] ) <= 1 );
	const mountsControl = ( e ) => {
		let x = m.blockKids( e )[ 0 ];
		while ( x && inMountChain( x ) && ! m.words( x ) && 1 === m.blockKids( x ).length ) {
			x = m.blockKids( x )[ 0 ];
		}
		return !! x && ( R.mountWrapper.controls || [] ).includes( view.realTag( x ) || x.tag );
	};
	const mountWrapper = ( e, st, kidsB ) => {
		if ( ! R.mountWrapper || ! inMountChain( e ) || m.words( e ) || 1 !== kidsB.length || 1 !== m.kids( e ).length || ! mountsControl( e ) ) {
			return false;
		}
		const allowed = new Set( R.mountWrapper.properties || [] );
		if ( ! Object.keys( st ).every( ( p ) => allowed.has( p ) ) ) {
			return false;
		}
		const widths = Object.keys( e.box || {} ).filter( ( w ) => e.box[ w ] && kidsB[ 0 ].box?.[ w ] );
		return widths.length > 0 && widths.every( ( w ) => sameBox( e.box[ w ], kidsB[ 0 ].box[ w ] ) );
	};
	const iconOnly = ( e ) => bare( e ) && hasSvg( e );
	const emojiOnly = ( e ) => ! m.blockKids( e ).length && EMOJI.test( m.words( e ).replace( /\s+/g, '' ) );
	// A typed glyph (a tick, a star, an arrow, a currency sign) alone in a painted round box of equal width and height, outside
	// any link or button but a whole-card link (rules.solitaryIcon.glyphDisc): a disc the draft draws, so it is an icon, never
	// text. A sign that means a control (`notIcons`: plus, minus, cross) or opens a quotation is no disc, and an emoji has its own
	// test (emojiOnly). The box is judged at the widest width it renders: a draft that lets a flex row squeeze it at a narrow
	// width draws the same disc there. A link is a whole card, so a disc inside it is part of the card, when it holds at least
	// `cardLink.minOtherTexts` other pieces of text or a heading; a glyph that is a link's only content (an arrow link) is no disc.
	const inCardLink = ( e, a ) => {
		const G = R.solitaryIcon?.glyphDisc?.cardLink;
		return !! G && 'a' === view.realTag( a ) && ! interactive( a ) && ( textLeaves( a ).filter( ( k ) => k !== e ).length >= ( G.minOtherTexts ?? 2 ) || desc( a ).some( ( k ) => HEADING.test( k.tag ) ) );
	};
	const glyphDisc = ( e, st ) => {
		const G = R.solitaryIcon?.glyphDisc;
		const w = m.words( e ).trim();
		if ( ! G || m.blockKids( e ).length || [ ...w ].length !== 1 || ! /^[^\p{L}\p{N}\s]$/u.test( w ) || EMOJI.test( w ) || ( G.notIcons || [] ).includes( w ) || interactive( e ) || ancestors( e ).some( ( a ) => 'button' === view.realTag( a ) || ( 'a' === view.realTag( a ) ? ! inCardLink( e, a ) : interactive( a ) ) ) || ! ( view.ownPaint( e ) || [ st.background, st[ 'background-color' ], st.border, st[ 'border-width' ] ].some( ( x ) => x && ! /^(?:none|transparent|initial|unset|0)/.test( String( x ).trim() ) ) ) ) {
			return false;
		}
		const shown = Object.entries( e.box || {} ).filter( ( [ , b ] ) => b && b.w > 0 && b.h > 0 ).sort( ( x, y ) => Number( y[ 0 ] ) - Number( x[ 0 ] ) );
		const b = shown[ 0 ]?.[ 1 ];
		const radius = String( st[ 'border-radius' ] ?? '' ).trim();
		return !! b && Math.abs( b.w - b.h ) <= 1.5 && b.w >= ( G.minPx ?? 0 ) && ( '50%' === radius || ( px( radius ) ?? 0 ) >= Math.min( b.w, b.h ) / 2 - 1 );
	};
	// The icon block's emoji settings for one typed glyph or emoji: its source and the character, both from the database.
	const emojiAttrs = ( block, glyph ) => {
		const E = R.solitaryIcon?.emoji;
		const char = block ? facts.firstAttrByRole( block, 'icon-emoji' ) : null;
		return E && char && ( facts.enumOf?.( block, E.sourceSetting ) || [] ).includes( E.source ) ? { [ E.sourceSetting ]: E.source, [ char ]: glyph } : {};
	};
	const desc = ( e ) => m.blockKids( e ).flatMap( ( k ) => [ k, ...desc( k ) ] );
	// A live open or closed line, read from the draft's code (lib/skeleton-clock.mjs), never from the words a read showed: the
	// element's own text is a value the clock decides by the opening hours the code holds, or it has no words of its own and
	// every worded piece inside it is such a line.
	const clock = makeClock( { facts, view, read: { textHoles: ( e ) => ( view.entry( e )?.template?.holes ?? [] ).filter( ( h ) => 'text' === h.where ) } } );
	const openLine = ( x ) => {
		if ( ! R.openStatus ) {
			return false;
		}
		if ( clock( x )?.openStatus ) {
			return true;
		}
		const worded = desc( x ).filter( ( y ) => m.words( y ) );
		return ! m.words( x ) && worded.length > 0 && worded.every( ( y ) => clock( y )?.openStatus );
	};
	const handlerOf = ( e ) => /sc-camel-on-click="\{\{\s*([^}\s]+)\s*\}\}"/.exec( e.snippet || '' )?.[ 1 ] || '';
	// A control the visitor operates: a button, anything with a click handler, a pressed or expanded state. It is never
	// static text (a label, a heading, a card title).
	const interactive = ( e ) => 'button' === e.tag || !! handlerOf( e ) || null != view.attr( e, 'aria-pressed' ) || null != view.attr( e, 'aria-expanded' );
	// A disclosure or slider control (it opens, closes or steps something): never a pill button.
	const disclosure = ( e ) => null != view.attr( e, 'aria-expanded' ) || null != view.attr( e, 'aria-pressed' ) || /toggle|prev|next|open|close|expand|collapse/i.test( handlerOf( e ) );
	// Words that are only a number (a count, an index "01"): never a label or a title.
	const numberOnly = ( e ) => /^\d+$/.test( m.words( e ).trim() );
	const textLeaves = ( e ) => desc( e ).filter( ( k ) => m.words( k ) && ! m.blockKids( k ).length );
	const logoish = ( k ) => k.tag.endsWith( '-logo' ) || facts.logoBlocks.includes( hooks.topBlock( k ) );
	// The element a child stands for once the build dissolves it, and each lone child below it that it dissolves too (a div that
	// only centres a logo inside a home link): the first element on the way down that stays, at most four levels.
	const dissolvedTo = ( k, parentBlock ) => {
		let x = k;
		for ( let depth = 0; depth < 4 && 1 === m.blockKids( x ).length && 'unwrap' === ruleFor( x, parentBlock )?.action; depth++ ) {
			x = m.blockKids( x )[ 0 ];
		}
		return x;
	};
	// An element the draft fills from one script value (`{{ arrowIcon }}`) that renders no words: the value is a glyph,
	// injected unstamped, so the inventory holds no child for it.
	const bindingGlyph = ( e ) => bare( e ) && /^<[^>]+>\s*\{\{\s*[\w.$]+\s*\}\}\s*<\/[a-z0-9-]+>$/i.test( e.snippet || '' ) && Object.values( e.box || {} ).some( ( b ) => b?.w > 0 );
	const srcOf = ( e ) => e.attrs?.src || /\ssrc="([^"]+)"/.exec( e.snippet || '' )?.[ 1 ] || '';
	// The first block child of a column that sits directly in a header or footer row: the column's heading.
	const headsRowColumn = ( e ) => {
		const col = m.byKey[ e.parentKey ];
		const sibs = col ? m.blockKids( col ) : [];
		return !! col && sibs[ 0 ] === e && sibs.length > 1 && ( R.columnHeading?.rowBlocks || [] ).includes( hooks.blockOfKey?.( col.parentKey ) );
	};
	// Links each to a different brand of the registry (hooks.brandOf), with brandImageLink on.
	const brandIconRun = ( ks ) => {
		const brands = ks.map( ( k ) => hooks.brandOf?.( k ) ?? null );
		return !! facts.decisions.structural?.brandImageLink && brands.every( Boolean ) && new Set( brands ).size === brands.length;
	};
	// A link holding nothing but one image (an <img> or an image placeholder element).
	const imageLink = ( k ) => {
		const inner = m.blockKids( k );
		return 'a' === k.tag && ! String( k.allText ?? '' ).trim() && 1 === inner.length && ! m.blockKids( inner[ 0 ] ).length && ( 'img' === inner[ 0 ].tag || !! specHit( R.mediaElement, inner[ 0 ].tag ) );
	};
	// The nearest ancestor link (three levels up at most) that is a whole card: two or more pieces of text.
	const cardOf = ( e ) => {
		let p = m.byKey[ e.parentKey ];
		for ( let i = 0; p && i < 3; i++, p = m.byKey[ p.parentKey ] ) {
			if ( 'a' === p.tag ) {
				return desc( p ).filter( ( k ) => m.words( k ) && ! m.blockKids( k ).length ).length >= 2 ? p : null;
			}
		}
		return null;
	};
	// The setting a typed arrow leaf ("→" in a filled circle after the words of a call to action) names, from
	// rules.cardAction.typedArrows, or null: a leaf whose only words are one such arrow.
	const typedArrowOf = ( k ) => ( ! m.blockKids( k ).length ? R.cardAction?.typedArrows?.[ m.words( k ).trim() ] ?? null : null );
	// An element that holds words of its own and, besides them, only typed arrows and bare decorations: the call to action
	// the arrow ends. It is no card link itself.
	const ownsWordsBesideArrow = ( h, card ) => !! h && h !== card && 'a' !== h.tag && !! m.words( h ).trim() && m.blockKids( h ).every( ( k ) => !! typedArrowOf( k ) || bare( k ) );
	// The first piece of text in a whole-card link titles it.
	const titlesCard = ( e ) => {
		const card = cardOf( e );
		return !! card && desc( card ).find( ( k ) => m.words( k ) && ! m.blockKids( k ).length ) === e;
	};
	// The call to action that ends a card link: its last piece of text, short, after the title, either with a glyph beside
	// it or below at least two other pieces of text. Returns that element, or null.
	const cardAction = ( card ) => {
		// A typed arrow (rules.cardAction.typedArrows) is the glyph of the element holding the words beside it: that element is
		// the call to action, not the arrow.
		const texts = textLeaves( card ).map( ( k ) => typedArrowOf( k ) && ownsWordsBesideArrow( m.byKey[ k.parentKey ], card ) ? m.byKey[ k.parentKey ] : k );
		const last = texts.at( -1 );
		if ( ! last || texts.length < 2 || m.words( last ).split( ' ' ).length > ( R.cardAction?.maxWords ?? 4 ) || numberOnly( last ) ) {
			return null;
		}
		const holder = m.byKey[ last.parentKey ];
		const glyph = [ ...m.kids( last ), ...( holder && holder !== card ? m.kids( holder ) : [] ) ].some( ( k ) => 'svg' === k.tag || iconOnly( k ) || bindingGlyph( k ) || !! typedArrowOf( k ) );
		return glyph || texts.length >= 3 ? last : null;
	};
	// The card link an element is the call to action of in this copy, or null.
	const copyActionOf = ( e ) => {
		for ( let p = m.byKey[ e.parentKey ], i = 0; p && i < 3; p = m.byKey[ p.parentKey ], i++ ) {
			if ( 'a' === p.tag ) {
				return cardAction( p ) === e ? p : null;
			}
		}
		return null;
	};
	// Every copy of one template element takes one verdict: it is a card's call to action only when every copy of it is.
	const verdicts = new Map();
	const actionOf = ( e ) => {
		const card = copyActionOf( e );
		if ( ! card ) {
			return null;
		}
		const tk = templateKey( { dc: e.template, tpl: e.tpl } );		if ( ! verdicts.has( tk ) ) {
			verdicts.set( tk, m.els.filter( ( k ) => k.template === e.template && k.tpl === e.tpl ).every( ( k ) => copyActionOf( k ) ) );
		}
		return verdicts.get( tk ) ? card : null;
	};
	// Whether a control's click handler scrolls the page to its top and writes no state (lib/skeleton-scroll-top.mjs).
	const scrollsTop = ( e ) => !! handlerOf( e ) && !! view.entry?.( e ) && handlerScrollsTop( { folder: path.join( facts.repo, 'sites', facts.client, 'handoff' ), record: { sources: view.sources }, component: view.entry( e ).template.component, handler: handlerOf( e ) } );
	// A link whose address the draft takes from one script value of its own state (`href="{{ orderHref }}"`, a bare name, never a member of
	// a loop's item), read from the markup: the inventory's `href` holds the value the draft rendered with.
	const scriptHref = ( e ) => /^<a\b[^>]*\shref="\{\{\s*[A-Za-z_$][\w$]*\s*\}\}"/.test( e.snippet ?? '' );
	const realHref = ( e ) => ( e.attrs?.href && '#' !== e.attrs.href && ! /\{\{/.test( e.attrs.href ) ? e.attrs.href : null );
	// A form control (an <input>, <select>, the draft's <sc-raw-select> or a <textarea>) and the field block it becomes,
	// by its rendered input type; null for anything else.
	const controlBlock = ( e ) => {
		const F = R.formControl;
		const tag = view.realTag( e );
		if ( ! F || ! ( F.tags || [] ).includes( tag ) ) {
			return null;
		}
		if ( 'input' !== tag ) {
			return F.byTag?.[ tag ] || null;
		}
		const type = String( e.attrs?.type || 'text' ).toLowerCase();
		// A submit, reset or image input is a button, never a field.
		if ( ( F.notFields || [] ).includes( type ) ) {
			return null;
		}
		// A lone required checkbox (a consent tick) is the consent field; a checkbox among others is a checkbox group.
		if ( 'checkbox' === type && required( e ) && ! otherCheckbox( e ) ) {
			return F.consent || null;
		}
		// A type with no field of its own (password, url, search) or a type the render left bound is a text field.
		return F.byType?.[ type ] || F.fallback || null;
	};
	// Another checkbox in the same group (the control's parent or grandparent).
	const otherCheckbox = ( e ) => {
		const scope = m.byKey[ m.byKey[ e.parentKey ]?.parentKey ] || m.byKey[ e.parentKey ];
		return !! scope && desc( scope ).some( ( k ) => k !== e && 'input' === k.tag && 'checkbox' === String( k.attrs?.type || '' ).toLowerCase() );
	};
	// Whether a control is required: its rendered attribute, else the template's own in the fact record (a literal or
	// `{{ true }}`, never a binding that may be false).
	const required = ( e ) => {
		if ( null != e.attrs?.required ) {
			return 'false' !== String( e.attrs.required );
		}
		return /^(?:|required|true|\{\{\s*true\s*\}\})$/.test( String( view.attr( e, 'required' ) ?? 'unset' ).trim() );
	};
	// A hidden input is no visible field, so the text beside it is never that field's text.
	const visibleControl = ( k ) => !! controlBlock( k ) && 'hidden' !== String( k.attrs?.type || '' ).toLowerCase();
	// A group of chips that each carry a pressed or checked state (a loop of chips, or two or more): its chips, or null.
	const chipGroup = ( e ) => {
		const chips = R.optionSet ? m.blockKids( e ) : [];
		const chosen = ( k ) => 'button' === view.realTag( k ) && ( null != view.attr( k, 'aria-pressed' ) || null != view.attr( k, 'aria-checked' ) );
		return chips.length && chips.every( chosen ) && ( chips.length >= 2 || view.repeated( chips[ 0 ] ) ) ? chips : null;
	};
	// A chip group the form submits (rule optionSetForm): inside a form element, or on a form surface when it filters no list.
	// Its chips, or null.
	const tilesMemo = new Map();
	const tilesField = ( e ) => {
		if ( ! tilesMemo.has( e.key ) ) {
			const chips = R.optionSetForm ? chipGroup( e ) : null;
			tilesMemo.set( e.key, chips && ( inFormElement( e ) || ( 'form' === surface.kind && ! ( R.optionSetFilter && narrowsList( chips[ 0 ] ) ) ) ) ? chips : null );
		}
		return tilesMemo.get( e.key );
	};
	// Whether the element sits in a form: on a form surface, or under a form element (its template chain or its rendered parents).
	const inAnyForm = ( e ) => {
		for ( let p = m.byKey[ e.parentKey ]; p; p = m.byKey[ p.parentKey ] ) {
			if ( 'form' === view.realTag( p ) ) {
				return true;
			}
		}
		return 'form' === surface.kind || inFormElement( e );
	};
	// The form's fields: a control, or a field group (a tiles field, a radio or checkbox group) that is one field of several
	// controls (lib/skeleton-field-groups.mjs). A field's own wrapper holds exactly one field, that field a child of it; an
	// element holding two or more fields (a row of fields, the form itself) is no field's wrapper, so its text is no field's text.
	const groups = makeFieldGroups( { m, view, controlBlock, visibleControl, tilesField, inForm: inAnyForm, F: R.formControl || {} } );
	const holdsControl = groups.holdsField;
	// Whether an element is or holds something a visitor fills in (FR-48-57): a visible control, a field group, or a pressed-state
	// option or radio, checkbox or option role. A button, a link or a hidden input is nothing to fill in.
	const answered = ( k ) => visibleControl( k ) || !! groups.groupAt( k ) || null != view.attr( k, 'aria-pressed' ) || [ 'radio', 'checkbox', 'option' ].includes( String( view.attr( k, 'role' ) ?? '' ).toLowerCase() );
	const holdsEntry = ( e ) => answered( e ) || desc( e ).some( answered );
	// The mark a text field draws inside its own box (a magnifier at the start of a search field): a bare element that is or holds
	// one <svg>, sits beside exactly one control in its parent, lies inside that control's box at every width both render, and is
	// drawn after a Lucide icon (lucide-icons.php, a hand-drawn copy within rules.formControl.fieldIcon.tolerance). The field block
	// draws it as `leadingIcon`, so the mark itself goes. { control, slug } for the mark, or null; the control's block must declare
	// `leadingIcon`.
	const iconMemo = new Map();
	const fieldIconOf = ( e ) => {
		const I = R.formControl?.fieldIcon;
		if ( ! I || ! bare( e ) || ! ( 'svg' === e.tag || hasSvg( e ) ) ) {
			return null;
		}
		if ( ! iconMemo.has( e.key ) ) {
			const controls = m.blockKids( m.byKey[ e.parentKey ] || { key: null } ).filter( ( k ) => k !== e && visibleControl( k ) );
			const control = 1 === controls.length ? controls[ 0 ] : null;
			const inside = ( a, b ) => a.x >= b.x - 1 && a.y >= b.y - 1 && a.x + a.w <= b.x + b.w + 1 && a.y + a.h <= b.y + b.h + 1;
			const widths = control ? Object.keys( e.box || {} ).filter( ( w ) => e.box[ w ]?.w > 0 && control.box?.[ w ]?.w > 0 ) : [];
			const mark = 'svg' === e.tag ? e : m.kids( e ).find( ( k ) => 'svg' === k.tag );
			const slug = control && widths.length && widths.every( ( w ) => inside( e.box[ w ], control.box[ w ] ) ) && facts.attr?.( controlBlock( control ), 'leadingIcon' ) ? lucideNearest( mark.snippet, I.tolerance ) : null;
			iconMemo.set( e.key, slug ? { control, slug } : null );
		}
		return iconMemo.get( e.key );
	};
	// The cap the draft puts on the field itself: a <label> round the control that holds no words and renders as the control's own
	// box (the control fills it at every width both render) is the field, so its declared max-width is the field block's cap
	// (rules.formControl.wrapperCap), carried as the verdict's `decided` setting for the desktop tier (a style value cannot sit
	// among the skeleton's attributes, R-47-10; Fill writes it). A label that names the field, or a box wider than the control
	// (a gap below an inline control), is a wrapper that paints nothing the block caps.
	const wrapperCapOf = ( e, block ) => {
		const C = R.formControl?.wrapperCap;
		const p = m.byKey[ e.parentKey ];
		if ( ! C || ! p || 'label' !== p.tag || all( p ) || ! facts.attr?.( block, C.setting ) ) {
			return null;
		}
		const widths = Object.keys( p.box || {} ).filter( ( w ) => p.box[ w ]?.w > 0 && e.box?.[ w ]?.w > 0 );
		const length = declared( p, tokens )[ C.property ];
		return widths.length && widths.every( ( w ) => Math.abs( p.box[ w ].x - e.box[ w ].x ) <= 1 && Math.abs( p.box[ w ].w - e.box[ w ].w ) <= 1 && Math.abs( p.box[ w ].h - e.box[ w ].h ) <= 1 ) && null !== lengthPx( length ) ? { [ C.setting ]: { desktop: length } } : null;
	};
	// A piece of text that belongs to a form field (its label, required marker, hint or character count): it sits in the
	// field's wrapper beside the control, or in a <label> there (two levels up at most).
	const fieldText = ( e ) => {
		if ( ! R.formControl || controlBlock( e ) || ! all( e ) || 'button' === e.tag || HEADING.test( e.tag ) || m.blockKids( e ).some( ( k ) => controlBlock( k ) ) ) {
			return false;
		}
		return !! fieldScope( e );
	};
	// The field wrapper a piece of field text sits in (fieldText), or null.
	const fieldScope = ( e ) => {
		const p = m.byKey[ e.parentKey ];
		const up = p ? m.byKey[ p.parentKey ] : null;
		const scope = holdsControl( p ) ? p : p && 'label' === p.tag && holdsControl( up ) ? up : null;
		return scope && ( ownsText( scope ) || labelsField( e, scope ) ) ? scope : null;
	};
	// Whether an element is a label of the field the wrapper holds: a <label> (or text inside one), or the target of the control's
	// aria-labelledby.
	const labelsField = ( k, scope ) => {
		const p = m.byKey[ k.parentKey ];
		const control = fieldIn( scope );
		const named = String( control?.attrs?.[ 'aria-labelledby' ] ?? ( control ? view.attr( control, 'aria-labelledby' ) : '' ) ?? '' ).split( /\s+/ ).filter( Boolean );
		return 'label' === k.tag || ( p && 'label' === p.tag ) || ( !! k.attrs?.id && named.includes( k.attrs.id ) );
	};
	// A wrapper whose texts are its field's own: holding its field (whatever its options) and texts only. A wrapper that also holds a
	// button or a link, whatever widths it shows at (a results count and a filter button beside a sort select), holds texts of its own
	// row, not words of the field, so only a label of the field is the field's text there (labelsField).
	const ownsText = ( scope ) => 'label' === scope.tag || [ ...m.blockKids( scope ), ...m.widthKids( scope ) ].every( ( k ) => 'label' === k.tag || groups.isField( k ) || [ k, ...desc( k ) ].every( ( x ) => ! [ 'button', 'a' ].includes( view.realTag( x ) ) ) );
	// The element inside a field wrapper that becomes the field block's node: the first control or field group in document order.
	const fieldIn = ( scope ) => ( scope ? desc( scope ).find( ( k ) => controlBlock( k ) || groups.groupAt( k ) ) ?? null : null );
	// The words a field's removed texts carried, as the field block's own settings: the label (the <label> naming the field, else
	// the first text in its wrapper: a group's <legend>), whether it is required (a control marked required, or a required marker
	// "*" beside the label), and the remaining hint. The marker and a character count ("0 / 800") are drawn by the field block
	// itself. e is the control, or a field group's element (a tiles field, a radio or checkbox group), whose options' words are
	// never the field's.
	// The texts are read in the field's own wrapper (holdsControl): the element around the field's <label> when it holds no
	// other field, else the field's parent, else (a group) the group's own element. A label's own words are its text too, and
	// so are the words of a group element that is its own wrapper.
	const fieldContent = ( e, block ) => {
		const group = groups.groupAt( e );
		const skip = new Set( group ? group.options.map( ( o ) => o.el ) : [ e ] );
		const p = m.byKey[ e.parentKey ];
		const up = p && 'label' === p.tag ? m.byKey[ p.parentKey ] : null;
		const scope = [ up, p, ...( group ? [ e ] : [] ) ].find( holdsControl ) || null;
		const drawn = ( t ) => /^\*$/.test( t ) || /^\d+\s*\/\s*\d+$/.test( t );
		const plain = ! scope || ownsText( scope );
		const texts = [];
		const visit = ( k ) => {
			if ( skip.has( k ) ) {
				return;
			}
			if ( ( k !== scope || 'label' === k.tag || k === e ) && m.words( k ) && ! controlBlock( k ) && ( plain || labelsField( k, scope ) ) ) {
				texts.push( { el: k, raw: m.words( k ).trim(), text: m.words( k ).replace( /\s*\*$/, '' ).trim() } );
			}
			m.blockKids( k ).forEach( visit );
		};
		if ( scope ) {
			visit( scope );
		}
		const named = texts.find( ( t ) => 'label' === t.el.tag || 'label' === m.byKey[ t.el.parentKey ]?.tag );
		const label = ( named || texts.find( ( t ) => t.text && ! drawn( t.text ) ) )?.text || '';
		const help = texts.filter( ( t ) => t.text && t.text !== label && ! drawn( t.text ) ).map( ( t ) => t.text ).join( ' ' );
		const marked = texts.some( ( t ) => /\*$/.test( t.raw ) );
		const out = {};
		const has = ( n ) => !! facts.attr?.( block, n );
		const icon = m.blockKids( m.byKey[ e.parentKey ] || { key: null } ).map( fieldIconOf ).find( ( i ) => i?.control === e );
		icon && has( 'leadingIcon' ) && ( out.leadingIcon = icon.slug );
		if ( label && has( 'label' ) ) {
			out.label = label;
		}
		if ( has( 'required' ) && ( marked || ( group ? group.members : [ e ] ).some( required ) ) ) {
			out.required = true;
		}
		if ( group?.block && has( 'options' ) ) {
			out.options = group.options.map( ( o ) => ( { value: o.value, label: o.label } ) );
		}
		if ( help && has( 'helpText' ) ) {
			out.helpText = help;
		}
		return out;
	};
	// A bar at most R.readingProgress.maxHeightPx tall at every width it renders (the browser's resolved height, a token
	// included; the declared height for an element read before the values were recorded).
	const thin = ( e, st ) => everyWidth( e, ( r ) => ( pxOf( r.height ) ?? 99 ) <= ( R.readingProgress?.maxHeightPx ?? 6 ), () => ( px( st.height ) ?? 99 ) <= ( R.readingProgress?.maxHeightPx ?? 6 ) );
	const markerShape = ( e ) => isMarker( e, m, R.dotMarker, view );
	// A dot that leads a line of words: the element's only child, a marker (rules.dotMarker) as wide as it is tall at every width
	// it renders, painting a fill of its own, written before the element's words in the draft's code (its markup opens the
	// element's content). The words are the element's own.
	const leadingDot = ( e ) => {
		const kids = m.kids( e );
		const k = kids[ 0 ];
		if ( 1 !== kids.length || ! m.words( e ) || ! markerShape( k ) ) {
			return false;
		}
		const both = Object.keys( k.visible || {} ).filter( ( w ) => k.visible[ w ] && e.visible?.[ w ] && k.box?.[ w ] && e.box?.[ w ] );
		const fill = Object.entries( declared( k, tokens ) ).some( ( [ p, val ] ) => FILL.test( p ) && ! /^(?:none|transparent|rgba\(0,\s*0,\s*0,\s*0\))$/.test( String( val ).trim() ) );
		const first = /^\s*</.test( String( e.snippet ?? '' ).replace( /^<[^>]*>/, '' ) );
		return fill && first && both.length > 0 && both.every( ( w ) => Math.abs( k.box[ w ].w - k.box[ w ].h ) <= PX_TOL );
	};
	// A line of words led by a dot, on one line at every width it renders (shorter than two lines of its type). Rows of a dot and
	// words stacked or set in a grid's columns are one list (Bean, 2026-10-19): the list writer takes them before any rule
	// (lib/skeleton-write-units.mjs), so a dot line the rules see stands alone.
	const dotLine = ( e ) => leadingDot( e ) && everyWidth( e, ( r ) => null != pxOf( r.height ) && null != pxOf( r[ 'font-size' ] ) && pxOf( r.height ) < 2 * pxOf( r[ 'font-size' ] ), () => false );
	// The first piece of text in a card that is not a bare number, set bold and larger than the next piece of text: the
	// card's title. The card is the nearest ancestor (two levels up at most) holding two or more pieces of text.
	const headsCard = ( e, st ) => {
		const C = R.cardHeading;
		if ( ! C || ! /\p{L}/u.test( m.words( e ) ) || m.blockKids( e ).length || HEADING.test( e.tag ) || 'a' === e.tag || 'label' === e.tag || interactive( e ) || numberOnly( e ) || hooks.siteInfoKinds( e ).size ) {
			return false;
		}
		// Bold and large enough at every width it renders (the browser's resolved size and weight, a clamp() or an inherited
		// value included); an element read before the values were recorded is judged by what it declares.
		const big = ( weight, size ) => ( weight || 0 ) >= C.minWeight && null != size && size >= C.minSizePx;
		if ( ! everyWidth( e, ( r ) => big( weightOf( r[ 'font-weight' ] ), pxOf( r[ 'font-size' ] ) ), () => big( weightOf( st[ 'font-weight' ] ), lengthPx( st[ 'font-size' ] ) ) ) || m.words( e ).split( ' ' ).length > C.maxWords ) {
			return false;
		}
		let card = m.byKey[ e.parentKey ];
		for ( let i = 0; card && i < 2 && textLeaves( card ).length < 2; i++ ) {
			card = m.byKey[ card.parentKey ];
		}
		const texts = card ? textLeaves( card ).filter( ( k ) => ! numberOnly( k ) ) : [];
		const next = texts[ texts.indexOf( e ) + 1 ];
		if ( texts[ 0 ] !== e || ! next ) {
			return false;
		}
		const ns = declared( next, tokens );
		// The next text is smaller (or, with no size to compare, lighter) at every width the title renders.
		return everyWidth( e, ( r, w ) => {
			const nr = next.resolved?.[ w ];
			const nextSize = nr ? pxOf( nr[ 'font-size' ] ) : lengthPx( ns[ 'font-size' ] );
			return null != nextSize ? nextSize < pxOf( r[ 'font-size' ] ) : ( weightOf( nr ? nr[ 'font-weight' ] : ns[ 'font-weight' ] ) || 400 ) < C.minWeight;
		}, () => {
			const size = lengthPx( st[ 'font-size' ] );
			const nextSize = lengthPx( ns[ 'font-size' ] );
			return null != nextSize ? nextSize < size : ( weightOf( ns[ 'font-weight' ] ) || 400 ) < C.minWeight;
		} );
	};

	// The link source a Site Info kind becomes on a link (tel: is phone, a maps host is directions), or null.
	const linkKindOf = ( e ) => {
		const kinds = [ ...hooks.siteInfoKinds( e ) ].map( ( [ k ] ) => k );
		const map = R.linkSourceForKind?.map || {};
		const k = kinds.find( ( x ) => map[ x ] );
		return k ? { kind: k, source: map[ k ] } : null;
	};
	// Whether the element's words are the Site Info value itself (a typed phone number or email address), so the label
	// reads Site Info too.
	const wordsAreValue = ( e, kind ) => isSiteInfoValue( all( e ), kind );
	// The attributes a verdict sets because the words are the Site Info value, as { attr: kind }: a copy of the block
	// with other words (a width variant) keeps each only when its own words are that value too.
	const wordBound = ( lk ) => ( lk ? { wordBound: { labelFromSiteInfo: lk.kind } } : {} );
	// A verdict of a rule, or null when the decisions data has no entry for it (each rule is switched on by its entry).
	const v = ( rule, extra ) => ( R[ rule ] ? { rule, reason: R[ rule ].reason || rule, ...extra } : null );
	// A link setting's value as a site address (lib/draft-link.mjs, through hooks.siteLink): { attributes, handover? }, the
	// setting absent when the draft's destination resolves to no address.
	const siteLinkOf = ( attr, e ) => {
		const out = linkWrite( ( hooks.siteLink || siteLinkResolver( null ) )( realHref( e ), e ), realHref( e ) );
		return { attributes: null !== out.value ? { [ attr ]: out.value } : {}, ...( out.handover ? { handover: out.handover } : {} ) };
	};
	const linkAttrs = ( e, lk ) => {
		if ( lk ) {
			return { attributes: { sgsBlockLinkSource: lk.source } };
		}
		return realHref( e ) ? siteLinkOf( 'sgsBlockLink', e ) : { attributes: {} };
	};

	// The rules in precedence order; the first verdict wins. Each takes x: { e, st (declared style), text (all its
	// words), kidsB (block children), parentBlock }.
	const RULES = [
		// The draft's form on a page is the reference block linked to the saved form (lib/skeleton-form-link.mjs); the elements
		// of a form already linked are absorbed into it.
		( { e } ) => {
			const link = hooks.formLinkOf( e );
			if ( ! link ) {
				return null;
			}
			return link.remove ? v( 'formLink', { action: 'remove', reason: R.formLink?.droppedReason } ) : v( 'formLink', { block: link.block, absorb: true, attributes: link.attributes } );
		},
		// A bar above the header (by surface kind and name) is the header's top row.
		( { e } ) => {
			const hit = 0 === e.depth && 'blockPart' !== surface.role?.role && ( R.surfaceRoot?.entries || [] ).find( ( x ) => x.kind === surface.kind && new RegExp( x.namePattern, 'i' ).test( surface.name || '' ) );
			return hit ? v( 'surfaceRoot', { block: hit.block, reason: hit.reason } ) : null;
		},
		// A full-width bar a few pixels tall, fixed to the viewport, drawing only a fill: the Floating UI reading progress
		// setting.
		( { e, st } ) => ( bare( e ) && ! hasSvg( e ) && 'fixed' === st.position && thin( e, st ) && /^100(?:%|vw)$/.test( st.width || '' ) ? v( 'readingProgress', { action: 'remove', handover: { owner: 'behaviour', kind: 'behaviour', detail: R.readingProgress?.handover || 'reading progress bar' } } ) : null ),
		// A picture drawn as a background: an empty role="img" element painting a url() is a media block (its alt is the element's label).
		( { e } ) => ( R.backgroundPicture && bare( e ) && ! hasSvg( e ) && 'img' === e.attrs?.role && paintsPicture( e ) ? v( 'backgroundPicture', { block: R.backgroundPicture.block } ) : null ),
		// A layer that holds nothing: a ring, glow, bar or blob is a decorative image at its own position, size, radius and fill
		// (Bean, 2026-11-07), except a layer something else already delivers: the pointer glare (the motion layer), the hero's
		// animated SVG and a line the owning block draws itself, each removed with a handover naming its owner.
		( { e, st } ) => {
			const bar = fillBar( e, st );
			if ( ! bare( e ) || hasSvg( e ) || DECORATION_TAGS.has( e.tag ) || ! ( 'true' === e.attrs?.[ 'aria-hidden' ] || [ 'absolute', 'fixed' ].includes( st.position ) || bar ) ) {
				return null;
			}
			// A fill bar sits at its track's start corner: the layer's edges there are rules.decorationLayer.fillBar.decided.
			if ( bar ) {
				return v( 'decorationLayer', { block: R.decorationLayer?.block || null, decided: structuredClone( R.decorationLayer.fillBar.decided ) } );
			}
			const ring = /\d/.test( st.border || st[ 'border-width' ] || '' ) && ! /^(?:0|none)/.test( st.border || '' );
			if ( ring ) {
				return v( 'decorativeShape', { block: R.decorativeShape?.block || null } );
			}
			const kind = deliveredKind( R.decorationDelivered?.kinds, e );
			const delivered = kind ? v( 'decorationDelivered', { action: 'remove', reason: kind.reason, handover: { owner: kind.owner, kind: 'behaviour', detail: kind.detail } } ) : null;
			return delivered || v( 'decorationLayer', { block: R.decorationLayer?.block || null } );
		},
		( { e, kidsB } ) => ( ! kidsB.length && specHit( R.typedDivider, m.words( e ) ) ? v( 'typedDivider', { action: 'remove' } ) : null ),
		// A draft <form> element is the form block; its fields sit inside it. The root of a form surface is the saved form's root
		// block whatever its tag (a wizard drawn in a <div>): the saved form's root must be the form block, which the linked embed renders.
		// A form block stands only where there is something to fill in (holdsEntry): a <form> or a form surface's root holding only
		// a button or a link is that control, never a form with nothing to fill in.
		( { e } ) => ( R.formHost && ( view.realTag( e ) === R.formHost.tag || ( 'form' === surface.kind && 0 === e.depth ) ) && holdsEntry( e ) ? v( 'formHost', { block: R.formHost.block } ) : null ),
		// A form control is the field block for its type; the field's label, required marker and hint are that block's own
		// settings, and a <label> wrapped around the control goes so the field takes its place. A radio or checkbox group in a
		// form is one field: its group element is the radio or checkbox field, holding the options, absorbing its controls.
		( { e } ) => {
			if ( fieldIconOf( e ) ) {
				return v( 'formControl', { action: 'remove', reason: R.formControl.fieldIcon.reason } );
			}
			const group = R.formControl ? groups.groupAt( e ) : null;
			if ( 'choice' === group?.kind ) {
				return v( 'formControl', { block: group.block, absorb: true, attributes: fieldContent( e, group.block ) } );
			}
			const block = controlBlock( e );
			if ( block ) {
				const cap = wrapperCapOf( e, block );
				return v( 'formControl', { block, absorb: true, attributes: fieldContent( e, block ), ...( cap ? { decided: cap } : {} ) } );
			}
			if ( R.formControl && 'label' === e.tag && m.blockKids( e ).some( ( k ) => controlBlock( k ) || groups.groupAt( k ) ) ) {
				// The cap the label puts on its lone control is the field's own setting: the label's record names where it goes. The
				// field block lays its label text and its control out itself (`hostLays`), so the label's row and column are no look
				// a wrapper must keep.
				const control = m.blockKids( e ).find( ( k ) => controlBlock( k ) && wrapperCapOf( k, controlBlock( k ) ) );
				const C = R.formControl.wrapperCap;
				const field = fieldIn( e );
				return v( 'formControl', { action: 'unwrap', ...( field ? { hostLays: field.key } : {} ), ...( control ? { conserve: [ { kind: 'setting', node: control.key, setting: C.setting, looks: [ lookOfProperty( C.property ) ] } ] } : {} ) } );
			}
			if ( ! fieldText( e ) ) {
				return null;
			}
			// A removed field text that lays out its own pieces (a label over its hint) is laid out by the field block, which draws
			// its label and help text in that order: its row records the field's node (lib/skeleton-paint-conservation.mjs host-layout).
			const field = fieldIn( fieldScope( e ) );
			const lays = field && Object.keys( paintsBox( e, { declared: declared( e, tokens ), parent: m.byKey[ e.parentKey ] ?? null, children: m.kids( e ).length, uaPadding: m.uaPadding } ) ).includes( 'layout' );
			return v( 'formControl', { action: 'remove', reason: R.formControl.fieldTextReason, ...( lays ? { conserve: [ { kind: 'host-layout', node: field.key, looks: [ 'layout' ] } ] } : {} ) } );
		},
		// The wrappers a mounted component adds (Spec 48A FR-48A-17: a button or field built once and mounted through
		// dc-import): the mount's host element, and the component's own root inside it, go when they are layout-neutral, so
		// a mounted button or field is the block it would be if drawn where it stands.
		( { e, st, kidsB } ) => ( mountWrapper( e, st, kidsB ) ? v( 'mountWrapper', { action: 'unwrap' } ) : null ),
		// A small dot or short bar beside text is the marker of the block that holds the text (a label's dot, a list
		// item's marker, the separator between a row's items): it gets no block of its own.
		( { e } ) => ( markerShape( e ) ? v( 'dotMarker', { action: 'remove' } ) : null ),
		// A custom element named as a logo (<brand-logo>) is the logo block, which reads the site logo.
		( { e } ) => ( e.tag.includes( '-' ) && specHit( facts.decisions.logoImage, e.tag ) && facts.logoBlocks.length ? v( 'logoElement', { block: facts.logoBlocks[ 0 ], absorb: true, handover: { owner: 'site-info', kind: 'presence', detail: 'the logo image: choose the site logo in the editor' } } ) : null ),
		// A custom element the draft uses as an image placeholder (<image-slot>) is the media block.
		( { e } ) => ( e.tag.includes( '-' ) && specHit( R.mediaElement, e.tag ) ? v( 'mediaElement', { block: R.mediaElement?.block } ) : null ),
		// A group of links that each hold only an image is a logo wall: a gallery whose items are the links.
		// A run of image links each to a different brand (Instagram, Google, WhatsApp: social profile icons) is no logo wall but
		// a row of brand icons (decisions structural.brandImageLink); links that all go to one brand (a grid of Instagram posts) stay one.
		( { e, kidsB } ) => ( ! m.words( e ) && kidsB.length >= ( R.logoGrid?.minItems ?? 3 ) && kidsB.every( imageLink ) && ! brandIconRun( kidsB ) ? v( 'logoGrid', { block: R.logoGrid?.block, absorb: true, firstItem: kidsB[ 0 ].key } ) : null ),
		// The link around a logo goes: the logo block links home itself. Its children are one or more logos (a mark and a
		// wordmark side by side); a link around several stays as the container holding them (R.homeLink.groupBlock), so the
		// pair is one item of the row it sits in. A child the build dissolves (a div that only centres the logo) stands for the
		// lone child it holds (dissolvedTo).
		( { e, kidsB, parentBlock } ) => ( 'a' === e.tag && specHit( R.homeLink, e.attrs?.href || '' ) && kidsB.length && kidsB.every( ( k ) => logoish( dissolvedTo( k, parentBlock ) ) ) ? ( R.homeLink.groupBlock && kidsB.length >= ( R.homeLink.groupMinLogos ?? 2 ) ? v( 'homeLink', { block: R.homeLink.groupBlock } ) : v( 'homeLink', { action: 'unwrap' } ) ) : null ),
		// A centring width wrapper inside a block that sets its own width (a header or footer, their rows, a section).
		// Directly under a section root it goes only when it lays nothing out itself: a centred grid or flex there is the
		// row the root accepts.
		( { e, st, kidsB, parentBlock } ) => {
			const role = facts.composition[ parentBlock ]?.composition_role;
			const centred = st[ 'max-width' ] && /\bauto\b/.test( `${ st.margin || '' } ${ st[ 'margin-inline' ] || '' } ${ st[ 'margin-left' ] || '' }` );
			const laysOut = /grid|flex/.test( st.display || e.display || '' );
			return ! m.words( e ) && kidsB.length && parentBlock && 'wrapper-shell' !== role && centred && ! ( 'section-root' === role && laysOut ) ? v( 'widthWrapper', { action: 'unwrap' } ) : null;
		},
		// A back-to-top control is a link whose source is 'top': known by its words, its handler's name or what its handler does
		// (it scrolls the page to its top and writes no state, lib/skeleton-scroll-top.mjs). Fixed to the viewport at every width
		// it shows, it is the Floating UI panel's back to top, a site option that draws its own button: a handover, no block.
		( { e, text, kidsB } ) => {
			const control = [ 'a', 'button' ].includes( e.tag ) || !! handlerOf( e );
			if ( ! control || ! R.backToTop || ! ( specHit( R.backToTop, `${ text } ${ e.attrs?.[ 'aria-label' ] || '' }` ) || specHit( R.backToTop.handlers, handlerOf( e ) ) || scrollsTop( e ) ) ) {
				return null;
			}
			const at = Object.entries( e.visible || {} ).filter( ( [ , on ] ) => on ).map( ( [ w ] ) => w );
			if ( R.backToTop.floating && at.length && at.every( ( w ) => 'fixed' === e.position?.[ w ] ) ) {
				return v( 'backToTop', { action: 'remove', reason: R.backToTop.floating.reason, handover: { owner: 'behaviour', kind: 'behaviour', detail: R.backToTop.floating.handover } } );
			}
			// Words of the control's own beside a glyph (`<button>Back to top <span>↑</span></button>`) are a button's label: a
			// container keeps only its child blocks, so those words would be lost; the button's glyph part takes the glyph.
			const own = m.words( e );
			return kidsB.length && ! own ? v( 'backToTop', { block: R.backToTop?.wholeBlock, attributes: { sgsBlockLinkSource: 'top' } } ) : v( 'backToTop', { block: R.backToTop?.lone, attributes: { linkSource: 'top', label: own || text } } );
		},
		( { e } ) => ( 'iframe' === e.tag && specHit( R.mapEmbed, srcOf( e ) ) ? v( 'mapEmbed', { block: R.mapEmbed?.block, attributes: { displayType: 'map' }, absorb: true, handover: { owner: 'site-info', kind: 'presence', detail: R.mapEmbed.handover } } ) : null ),
		// A live open or closed line; a second line beside the first is part of the same display.
		( { e, text } ) => {
			if ( ! openLine( e ) || desc( e ).length > 2 ) {
				return null;
			}
			// An earlier open-status line within the same block (up to two levels up, as a sibling or a cousin) holds it.
			const scope = m.byKey[ m.byKey[ e.parentKey ]?.parentKey ] || m.byKey[ e.parentKey ];
			const order = m.els.indexOf( e );
			const first = scope ? desc( scope ).find( ( x ) => m.els.indexOf( x ) < order && openLine( x ) && desc( x ).length <= 2 ) : null;
			return first ? v( 'openStatus', { action: 'absorbed', into: first.key } ) : v( 'openStatus', { block: R.openStatus?.block, attributes: { displayType: 'open-status' }, absorb: true } );
		},
		// An hours row: a few pieces of text (a day, its times) and nothing nested, reading as a day and a clock time. The
		// block draws the whole week from Site Info, so the first row of a run of sibling hours rows is the block and every
		// later sibling row is absorbed into it (one table, never one table per row).
		( { e } ) => {
			const isRow = ( x ) => {
				const kids = m.blockKids( x );
				const words = all( x );
				return kids.length && kids.length <= ( R.hoursRows?.maxParts ?? 3 ) && kids.every( ( k ) => ! m.blockKids( k ).length ) && specHit( facts.decisions.siteInfoPatterns?.hours, words ) && words.length <= ( R.hoursRows?.maxChars ?? 80 );
			};
			if ( ! isRow( e ) ) {
				return null;
			}
			const order = m.els.indexOf( e );
			const first = m.els.find( ( x ) => x.parentKey === e.parentKey && m.els.indexOf( x ) < order && isRow( x ) );
			return first ? v( 'hoursRows', { action: 'absorbed', into: first.key } ) : v( 'hoursRows', { block: R.hoursRows?.block, attributes: { displayType: 'hours', hoursLayout: 'rows' }, absorb: true } );
		},
		// A link or button that is one action: a pill (a label and an icon) is one button; a card (two or more pieces of
		// text, or a heading) is a container whose whole box is the link.
		( { e, text, kidsB } ) => {
			if ( ! [ 'a', 'button' ].includes( e.tag ) || ! kidsB.length ) {
				return null;
			}
			const inner = desc( e );
			const texts = textLeaves( e );
			const lk = 'a' === e.tag ? linkKindOf( e ) : null;
			if ( texts.length >= 2 || inner.some( ( k ) => HEADING.test( k.tag ) ) ) {
				if ( 'a' !== e.tag ) {
					return null;
				}
				// The draft draws the card as one link, so the card's box is the link; a call to action that ends it is the card's
				// button, drawn as a cue with no link of its own (rules.cardAction). An address the draft takes from a script value
				// (`href="{{ orderHref }}"`) is decided by a later stage that binds it on the button (rules.cardAction.boundLink), so the
				// button keeps it there and the card is not linked.
				return v( 'wholeCardLink', { block: R.wholeCardLink?.block, ...( R.cardAction?.boundLink && scriptHref( e ) && ( ( a ) => !! a && !! actionOf( a ) )( cardAction( e ) ) ? { attributes: {} } : linkAttrs( e, lk ) ) } );
			}
			// One action with one label (and a glyph): a pill. A toggle or a slider arrow is not; nor is a link with no words.
			if ( 1 !== texts.length || disclosure( e ) ) {
				return null;
			}
			// A link or button that paints a picture, itself or inside it, is a tile, never a pill: absorbing it would drop the
			// picture. A link that paints the picture itself is a picture tile whose whole box is the link, and its one label is a
			// badge laid on the picture, kept as a block of its own.
			if ( 'a' === e.tag && paintsPicture( e ) ) {
				return v( 'wholeCardLink', { block: R.wholeCardLink?.block, ...linkAttrs( e, lk ) } );
			}
			if ( paintsPicture( e ) || inner.some( paintsPicture ) ) {
				return null;
			}
			// The button holds the draft's destination (a draft route as its site address, an in-page `#fragment` as it stands): the
			// pill's glyph is absorbed, so the writer never reads the link from the element itself.
			const link = lk ? { attributes: { linkSource: lk.source } } : realHref( e ) ? siteLinkOf( facts.firstAttrByRole( R.pillButton?.block, 'link-href' ) || 'url', e ) : { attributes: {} };
			return v( 'pillButton', { block: R.pillButton?.block, absorb: true, attributes: { label: text, ...link.attributes, ...( lk && wordsAreValue( e, lk.kind ) ? { labelFromSiteInfo: true } : {} ) }, ...( link.handover ? { handover: link.handover } : {} ), ...wordBound( lk ) } );
		},
		// A lone text link to a Site Info address (a phone number, an email address, a maps host) is a button whose link
		// reads Site Info; credit and copyright lines stay business details.
		( { e, text, kidsB } ) => {
			const lk = 'a' === e.tag && ! kidsB.length && m.words( e ) ? linkKindOf( e ) : null;
			return lk ? v( 'siteInfoLink', { block: R.siteInfoLink?.block, attributes: { label: text, linkSource: lk.source, ...( wordsAreValue( e, lk.kind ) ? { labelFromSiteInfo: true } : {} ) }, ...wordBound( lk ) } ) : null;
		},
		// A header control outside the nav that opens a mega panel is an item of a second header menu: a menu bar bound to that
		// menu (no burger of its own; the main menu owns the drawer's), so the item and its panel are one thing
		// (lib/skeleton-mega-opener.mjs).
		// A navigation link on the logo's far side from the header's nav is an item of the nav's menu drawn as its second half:
		// the far side's first link is a menu bar bound to the same menu, and every later one is absorbed into it
		// (lib/skeleton-split-menu.mjs).
		( { e } ) => {
			const link = R.splitMenu ? splitLinkOf( { e, els: m.els, byKey: m.byKey, split: surface.splitMenu, surfaceKind: surface.kind } ) : null;
			if ( ! link ) {
				return null;
			}
			if ( link.first !== link.key ) {
				return v( 'splitMenu', { action: 'absorbed', into: link.first } );
			}
			return v( 'splitMenu', { block: R.splitMenu.block, absorb: true, menu: surface.splitMenu.menu, split: { after: surface.splitMenu.after, readAt: link.group }, attributes: { ...R.splitMenu.attributes }, decided: { splitSide: sidesOf( surface.splitMenu ).links } } );
		},
		( { e } ) => {
			const menu = R.megaOpenerMenu ? menuOfOpener( { e, byKey: m.byKey, openers: surface.megaOpeners, surfaceKind: surface.kind } ) : null;
			return menu ? v( 'megaOpenerMenu', { block: R.megaOpenerMenu.block, absorb: true, menu, attributes: { ...R.megaOpenerMenu.attributes } } ) : null;
		},
		// The nav of a header whose menu is drawn in two halves is the first half (or the second, after the far side's links).
		( { e } ) => {
			if ( 'nav' !== e.tag || ! R.navigation?.bySurface?.[ surface.kind ] ) {
				return null;
			}
			const split = R.splitMenu && 'header' === surface.kind ? surface.splitMenu : null;
			return v( 'navigation', { block: R.navigation.bySurface[ surface.kind ], absorb: true, ...( split ? { split: { after: split.after, readAt: e.key }, decided: { splitSide: sidesOf( split ).nav } } : {} ) } );
		},
		( { e, st } ) => {
			if ( m.isIconLink( e ) ) {
				return null;
			}
			// A typed emoji or glyph disc is the icon block's emoji: its character, never written as the icon's brand name.
			if ( emojiOnly( e ) || glyphDisc( e, st ) ) {
				// An icon block that cannot hold the character (no emoji settings in the rule, or its source has no emoji) would draw
				// nothing and send the glyph into the icon's name, so the glyph stays the text it is.
				const attributes = emojiAttrs( R.solitaryIcon?.block, m.words( e ).trim() );
				if ( Object.keys( attributes ).length ) {
					return v( 'solitaryIcon', { block: R.solitaryIcon?.block, attributes, drawsWords: true } );
				}
			}
			return iconOnly( e ) || bindingGlyph( e ) ? v( 'solitaryIcon', { block: R.solitaryIcon?.block } ) : null;
		},
		// The call to action that ends a card link is the card's button, drawn as a cue: the link is on the card's box
		// (rules.wholeCardLink), so the button is the block's plain, non-interactive look (`visualOnly`) and holds no link.
		( { e } ) => {
			const card = actionOf( e );
			if ( ! card ) {
				return null;
			}
			// A card whose address is a script value keeps it on the button (rules.cardAction.boundLink).
			const keep = R.cardAction?.boundLink && scriptHref( card );
			const lk = keep ? linkKindOf( card ) : null;
			const link = ! keep ? { attributes: {} } : lk ? { attributes: { linkSource: lk.source } } : realHref( card ) ? siteLinkOf( 'url', card ) : { attributes: {} };
			// A typed arrow after the words is the button's icon (rules.cardAction.typedArrows), the arrow leaf's own look read at the
			// icon part once the leaf is absorbed (lib/skeleton-part-pairing.mjs).
			const arrow = m.blockKids( e ).map( typedArrowOf ).find( Boolean );
			return v( 'cardAction', { block: R.cardAction?.block, ...link, attributes: { label: m.words( e ).trim(), ...( arrow ? { ...arrow } : {} ), ...( keep ? {} : R.cardAction?.cue ?? {} ), ...link.attributes } } );
		},
		// A short run of words: the first in a header or footer row's column heads it; set in capitals, wide tracking or a
		// pill it is a kicker. A control the visitor operates and a bare number are neither.
		( { e, st, kidsB } ) => {
			// Its only children may be bare decorations (a marker dot), which the label, a leaf, absorbs. A line led by a dot
			// (dotLine) is a label whatever its length or case: the dot is the label's own (rules.label.leadingDot).
			const line = !! R.label?.leadingDot && dotLine( e );
			if ( kidsB.some( ( k ) => ! bare( k ) ) || ! m.words( e ) || HEADING.test( e.tag ) || 'a' === e.tag || interactive( e ) || numberOnly( e ) || ( ! line && m.words( e ).split( ' ' ).length > ( R.label?.maxWords ?? 4 ) ) ) {
				return null;
			}
			const heading = headsRowColumn( e ) && v( 'columnHeading', { block: R.columnHeading?.block } );
			if ( heading ) {
				return heading;
			}
			// Capitals or wide tracking, or a padded pill, at every width it renders: the browser's resolved text-transform,
			// letter-spacing (over the resolved size) and corners, so a token, a clamp() or an inherited value counts. An element
			// read before the values were recorded is judged by what it declares.
			const minTrack = R.label?.minTrackingEm ?? 0.06;
			const caps = everyWidth( e, ( r ) => 'uppercase' === r[ 'text-transform' ] || ( pxOf( r[ 'font-size' ] ) ? ( pxOf( r[ 'letter-spacing' ] ) ?? 0 ) / pxOf( r[ 'font-size' ] ) : 0 ) >= minTrack, () => 'uppercase' === st[ 'text-transform' ] || ( em( st[ 'letter-spacing' ] ) ?? 0 ) >= minTrack );
			const pill = everyWidth( e, ( r ) => CORNERS.every( ( c ) => ( pxOf( r[ c ] ) ?? 0 ) >= 99 ) && SIDES.some( ( c ) => ( pxOf( r[ c ] ) ?? 0 ) > 0 ), () => ( px( st[ 'border-radius' ] ) ?? 0 ) >= 99 && !! st.padding );
			// A label whose words a dot leads draws that dot as its own (the dot setting on): the absorbed dot is read at the label's
			// dot layer (lib/skeleton-conserve-slots.mjs::absorbedSlots).
			const dotted = R.label?.leadingDot && leadingDot( e ) ? { attributes: structuredClone( R.label.leadingDot.attributes ), wordsOwn: true } : {};
			const label = ( caps || pill || line ) && ! hooks.isColumnLabel( e ) && v( 'label', { block: R.label?.block, ...dotted } );
			if ( label ) {
				return label;
			}
			return titlesCard( e ) ? v( 'cardTitle', { block: R.cardTitle?.block } ) : null;
		},
		// The bold, larger first text of a card (not a link) titles it.
		( { e, st } ) => ( headsCard( e, st ) ? v( 'cardHeading', { block: R.cardHeading?.block } ) : null ),
	];

	// Whether an ancestor in the element's template parent chain is a form element (a `<form>`, its real tag).
	const inFormElement = ( e ) => ( view.entry( e )?.template.parentChain ?? [] ).some( ( k ) => 'form' === view.elements[ k ]?.template.realTag );
	// Whether the choice a chip makes narrows another list of its component (lib/skeleton-narrowing.mjs): the chip's loop list
	// is a renderVals key and the draft's logic filters a list that an `sc-for` of the same component iterates by a state key
	// the chips' handlers write.
	// `rendered( component )`: the loop lists an sc-for iterates; the component's own by default.
	const narrowsList = ( chip, rendered = ( component ) => Object.values( view.elements ).filter( ( x ) => x.template.component === component ).flatMap( ( x ) => x.template.membership.scFor.map( ( f ) => f.list ) ) ) => {
		const t = view.entry( chip )?.template;
		if ( ! t ) {
			return false;
		}
		const own = /^\{\{\s*([\w$]+)\s*\}\}$/.exec( t?.membership.scFor[ 0 ]?.list ?? '' )?.[ 1 ];
		if ( ! facts.repo || ! facts.client ) {
			return false;
		}
		const lists = narrowedLists( { folder: path.join( facts.repo, 'sites', facts.client, 'handoff' ), record: { sources: view.sources }, component: t.component, listKey: own } );
		return narrowsRenderedList( lists, rendered( t.component ) );
	};
	// Whether the choice a chip makes narrows the loop of the shop's product listing (the commerce region's items).
	const narrowsRegionLoop = ( chip ) => !! region?.item && narrowsList( chip, () => ( view.entry( region.item )?.template.membership.scFor ?? [] ).map( ( f ) => f.list ) );
	// A row of chips that narrows the shop's product listing by the catalogue's categories is the shop template's own category
	// filter (rules.optionSetFilter.categoryFilter): WooCommerce's taxonomy filter for product_cat in the chips' display style, built
	// from rules.filterRail's category group and choice display style. At most one chip is no category (the one that clears the choice);
	// the counts show only when the draft's chips carry a number. Null anywhere else: another surface, a loop that is not the listing's,
	// or chips that are not the catalogue's categories.
	const categoryFilter = ( chips ) => {
		const C = R.optionSetFilter?.categoryFilter;
		const group = R.filterRail?.groups?.category;
		const style = R.filterRail?.displayStyles?.choice;
		if ( ! C || ! group || ! style || 'shop' !== surface.commerce?.role || ! region?.item || ! narrowsRegionLoop( chips[ 0 ] ) ) {
			return null;
		}
		const norm = ( s ) => String( s ?? '' ).replace( /\s+/g, ' ' ).trim().toLowerCase();
		const names = new Set( ( surface.commerce.filters?.categories || [] ).map( norm ) );
		const hits = chips.filter( ( c ) => names.has( norm( m.words( c ) ) ) ).length;
		if ( hits < 2 || chips.length - hits > 1 ) {
			return null;
		}
		const counted = chips.some( ( c ) => m.blockKids( c ).some( ( k ) => /^\d+$/.test( norm( m.words( k ) ) ) ) );
		return { name: group.name, attributes: { taxonomy: group.attributes.taxonomy, displayStyle: style, showCounts: counted }, innerBlocks: [ { name: style, attributes: {}, innerBlocks: [] } ], reason: C.reason };
	};

	// The blocks already proposed for the element's ancestors, nearest first (an unwrapped ancestor has none).
	const ancestorBlocks = ( e ) => {
		const out = [];
		for ( let p = m.byKey[ e.parentKey ]; p; p = m.byKey[ p.parentKey ] ) {
			const b = hooks.blockOfKey?.( p.key );
			b && out.push( { block: b, key: p.key } );
		}
		return out;
	};
	const holdsH1 = ( e ) => desc( e ).some( ( k ) => 'h1' === k.tag );
	// An element that holds the page's sections rather than being one: the `<main>`, or an element holding two or more
	// sections stacked one above the next.
	const pageWrapper = ( e ) => {
		const sections = m.blockKids( e ).filter( ( k ) => 'section' === k.tag );
		return 'main' === e.tag || ( sections.length >= 2 && m.stacked( sections ) );
	};
	// A page wrapper that sits directly under the page's root, or inside another such wrapper.
	const wrapperOfPage = ( e ) => pageWrapper( e ) && ( 1 === e.depth || ( !! m.byKey[ e.parentKey ] && wrapperOfPage( m.byKey[ e.parentKey ] ) ) );
	// A block the database files as a section (`block_composition.container_kind`, as the hero and the trust bar) is only
	// ever a page's own section: an element directly under a page surface's root, or directly inside a page wrapper (never the
	// wrapper itself). Badges inside a section are labels.
	const pageSection = ( e, block ) => 'section' !== facts.composition[ block ]?.container_kind || ( 'page' === surface.kind && ! pageWrapper( e ) && ( 1 === e.depth || ( !! m.byKey[ e.parentKey ] && wrapperOfPage( m.byKey[ e.parentKey ] ) ) ) );
	const isMedia = ( k ) => 'img' === k.tag || ( k.tag.includes( '-' ) && !! specHit( R.mediaElement, k.tag ) );
	// A picture too small to fill a column of the hero (an icon in an advice card, a thumbnail) and one inside a link or button
	// (a control's own mark) are no split media (rules.hero.splitMedia): the hero neither takes them as its picture nor absorbs them.
	const fillsColumn = ( p, hero ) => {
		const SM = R.hero?.splitMedia;
		if ( ! SM ) {
			return true;
		}
		const widest = ( x ) => Math.max( 0, ...Object.values( x.box || {} ).map( ( b ) => b?.w || 0 ) );
		const area = ( x ) => Math.max( 0, ...Object.values( x.box || {} ).map( ( b ) => ( b?.w || 0 ) * ( b?.h || 0 ) ) );
		for ( let up = m.byKey[ p.parentKey ]; up && up !== hero; up = m.byKey[ up.parentKey ] ) {
			// A control holding more than the picture (words, other marks) owns it as its mark; a link that is mostly the picture is
			// the picture's own address and leaves it the hero's media.
			if ( [ 'a', 'button' ].includes( view.realTag( up ) ) && ! ( area( up ) > 0 && area( p ) >= area( up ) * ( SM.minControlShare ?? 1 ) ) ) {
				return false;
			}
		}
		return widest( p ) >= Math.max( SM.minWidthPx ?? 0, widest( hero ) * ( SM.minWidthShare ?? 0 ) );
	};
	// A hero's collage stages and their layers (lib/skeleton-hero-collage.mjs), read once per hero.
	const collages = new Map();
	const collageOf = ( hero ) => {
		if ( ! collages.has( hero.key ) ) {
			collages.set( hero.key, R.heroCollage ? heroCollage( { hero, m, desc, isMedia, minPictureLayers: R.heroCollage.minPictureLayers } ) : { stages: new Map(), layerOf: new Map(), rows: new Set() } );
		}
		return collages.get( hero.key );
	};
	// The element's own animation loops a translate for ever (the inventory's motion record): a marquee track.
	const loops = ( e ) => motion.has( String( e.key ).replace( /#\d+$/, '' ) );

	// Composite structures, before the element rules: a marquee, a trust bar, a page's hero and what its hero provides.
	// The navigation element of the surface whose block draws its own collapsed-navigation opener (the block holds a collapse
	// setting: rules.navigation.collapseAttribute), or null.
	const burgerNav = () => m.els.find( ( n ) => 'nav' === n.tag && ! m.isPart( n ) && R.navigation?.collapseAttribute?.[ hooks.topBlock( n ) ] ) ?? null;
	// The state keys a button or link's click handler (a renderVals key of its component) writes with an opening value, a
	// toggle included (lib/skeleton-handler-opens.mjs); an empty Set for any other element or a client with no draft folder.
	const handlerKeys = ( e ) => ( [ 'a', 'button' ].includes( e.tag ) && facts.repo && facts.client
		? handlerOpens( { folder: path.join( facts.repo, 'sites', facts.client, 'handoff' ), record: { sources: view.sources }, component: view.entry( e )?.template.component, handler: handlerOf( e ) } )
		: new Set() );
	// A glyph-only button (no letter or digit in its words) on a drawer surface whose click handler writes a closing value to a
	// key one of the record's drawer surfaces opens on: the drawer block's own close button (rules.drawerClose).
	const closesDrawer = ( e ) => {
		const h = 'button' === e.tag && facts.repo && facts.client ? handlerOf( e ) : null;
		if ( ! h || /[\p{L}\p{N}]/u.test( m.words( e ) || '' ) ) {
			return false;
		}
		const keys = handlerCloses( { folder: path.join( facts.repo, 'sites', facts.client, 'handoff' ), record: { sources: view.sources }, component: view.entry( e )?.template.component, handler: h } );
		return Object.values( view.surfaces ).some( ( s ) => 'drawer' === s.kind && opensOn( s, keys ) );
	};
	// A button or link that opens a drawer surface: its click handler writes a state key one of the drawer's surfaces.json
	// states holds at true, or the handler is named in the drawer's recorded opener words.
	const opensDrawer = ( e ) => {
		const h = handlerOf( e );
		if ( ! h || ! [ 'a', 'button' ].includes( e.tag ) ) {
			return false;
		}
		const keys = handlerKeys( e );
		return Object.values( view.surfaces ).some( ( s ) => 'drawer' === s.kind && ( opensOn( s, keys ) || String( view.openers[ s.id ] || '' ).split( /[^\w$]+/ ).includes( h ) ) );
	};
	// The drawers the page map hands to another row's block that names its owning block (rules.blockOwnedPart), found once for
	// a header surface (the block's trigger is the site-wide control the header carries; a page's own link to the same drawer,
	// such as a checkout's Edit link, stays a link): [ { surface, row, part, own (the byTemplate entry) } ].
	const ownedDrawers = R.blockOwnedPart && R.blockPartOpener && 'header' === surface.kind && surface.pageMap?.length
		? blockPartSurfaces( { pageMap: surface.pageMap, surfaces: view.surfaces, elements: view.elements, kind: 'drawer' } ).map( ( d ) => ( { ...d, own: R.blockOwnedPart.byTemplate?.[ d.row.template ] } ) ).filter( ( d ) => d.own )
		: [];
	// The block-owned drawer a button or link opens: its click handler (a renderVals key of its component) writes a state key
	// that one of the drawer's surfaces.json states holds at true (lib/skeleton-handler-opens.mjs), or null.
	const opensOwnedDrawer = ( e ) => {
		if ( ! ownedDrawers.length ) {
			return null;
		}
		const keys = handlerKeys( e );
		return ownedDrawers.find( ( d ) => opensOn( d.surface, keys ) ) ?? null;
	};
	// The modal, flow or form row of the page map a button or link opens (lib/skeleton-openers.mjs), or null.
	const openTargets = R.surfaceOpener ? openerTargets( { pageMap: surface.pageMap || [], folder: handoffOf( facts ) } ) : [];
	const opensSurface = ( e ) => ( openTargets.length && [ 'a', 'button' ].includes( e.tag ) && handlerOf( e ) ? openedBy( controlWrites( { folder: handoffOf( facts ), component: view.entry( e )?.template.component, handler: handlerOf( e ) } ), openTargets, scope?.id ?? null ) : null );
	// The owning block's trigger settings drawn from the control (the entry's `trigger` names the block's settings): words
	// beside a count make a pill with that label, no words an icon; the tablet and phone styles follow the label's own widths
	// (a label shown from tablet up and hidden on a phone is a pill whose phone style, the entry's `styleMobile`, is the icon; a
	// tier that agrees with the one above it writes nothing); a count that paints its own box is a bubble, else plain; a count
	// showing zero at rest keeps showing it; a typed aria-label is the trigger's accessible name. `parts` names which draft
	// children are the trigger's sub-parts by role, { count: key | null, label: [ key ] }, so the proposal reads each at the
	// block's part for that role (lib/skeleton-part-slots.mjs::partSlots `named`) instead of guessing among siblings.
	const triggerOf = ( e, T ) => {
		if ( ! T ) {
			return { attributes: {}, parts: { count: null, label: [] } };
		}
		// The words and the count are read through the control's width-only children too (a label drawn only on a phone is
		// an alternative of its parent, never one of its block children, lib/skeleton-model.mjs::widthOnly).
		const leavesOf = ( x ) => m.kids( x ).filter( ( k ) => ! m.isPart( k ) ).flatMap( ( k ) => [ k, ...leavesOf( k ) ] );
		const leaves = [ ...( m.words( e ) ? [ e ] : [] ), ...leavesOf( e ).filter( ( k ) => m.words( k ) && ! m.kids( k ).some( ( c ) => ! m.isPart( c ) ) ) ];
		const count = leaves.find( numberOnly ) ?? null;
		const labelLeaves = leaves.filter( ( k ) => k !== count && m.words( k ).trim() );
		const aria = view.attr( e, 'aria-label' );
		const drawsLabel = ( w ) => labelLeaves.some( ( k ) => k.visible?.[ w ] );
		// The label is the words drawn at the widest width any label is drawn at.
		const labelWidth = [ 1440, 768, 375 ].find( drawsLabel ) ?? null;
		const label = labelLeaves.filter( ( k ) => k.visible?.[ labelWidth ] ).map( ( k ) => m.words( k ).trim() ).join( ' ' );
		const desktop = drawsLabel( 1440 ) ? T.pill : T.icon;
		const tablet = drawsLabel( 768 ) ? T.pill : T.icon;
		const mobile = drawsLabel( 375 ) ? T.pill : T.icon;
		const attributes = {
			[ T.style ]: label ? desktop : T.icon,
			...( label && T.styleTablet && desktop !== tablet ? { [ T.styleTablet ]: tablet } : {} ),
			...( label && T.styleMobile && mobile !== tablet ? { [ T.styleMobile ]: mobile } : {} ),
			...( label ? { [ T.label ]: label } : {} ),
			...( count ? { [ T.countStyle ]: view.ownPaint( count ) ? T.bubble : T.plain } : {} ),
			...( count && 0 === Number( m.words( count ).trim() ) ? { [ T.showZero ]: { desktop: true } } : {} ),
			...( aria && ! /\{\{/.test( aria ) ? { [ T.ariaLabel ]: aria } : {} ),
		};
		return { attributes, parts: { count: count && count !== e ? count.key : null, label: label ? labelLeaves.filter( ( k ) => k !== e ).map( ( k ) => k.key ) : [] } };
	};
	// The commerce region of a WooCommerce page surface (lib/skeleton-commerce-region.mjs), found once for the surface.
	const region = commerceRegion( { m, commerce: surface.commerce, rule: R.commerceRegion } );
	// The shop's filter rail beside its product listing (lib/skeleton-filter-rail.mjs), from the draft catalogue's facets.
	const rail = region?.key ? filterRail( { m, region, filters: surface.commerce.filters, rule: R.filterRail, money: R.commerceRegion.money } ) : null;
	// The product tiles of a page that is not the shop (lib/skeleton-product-tile.mjs), each bound to its catalogue product.
	// The review sections that name a review platform (lib/skeleton-review-platform.mjs), each that platform's review block.
	const reviews = R.reviewPlatform ? reviewPlatformRegions( { m, rule: R.reviewPlatform } ) : { regions: new Map(), notes: [] };
	const tiles = R.productTile ? productTiles( { m, products: surface.products, money: R.commerceRegion?.money } ) : { tiles: new Map(), listings: new Set(), notes: [] };
	// The grids of titled picture tiles, each one link or control (lib/skeleton-picture-tiles.mjs), each a card grid.
	// The parents whose children are numbered steps (rules.numberedSteps, lib/skeleton-numbered-steps.mjs).
	const stepRuns = R.numberedSteps ? numberedSteps( { m, rule: R.numberedSteps, headingLevels: facts.enumOf?.( R.numberedSteps.block, R.numberedSteps.settings.level ) || [] } ) : new Map();
	// The card grids of picture tiles (rules.pictureTileGrid) and of text tiles (rules.textTileGrid) by their parent's key; no
	// parent is in both (a picture grid needs pictures, a text grid none).
	const pictureGrids = R.pictureTileGrid ? pictureTileGrids( { m, rule: R.pictureTileGrid, money: R.commerceRegion?.money } ) : { grids: new Map(), notes: [] };
	const textGrids = R.textTileGrid ? textTileGrids( { m, rule: R.textTileGrid, money: R.commerceRegion?.money } ) : { grids: new Map(), notes: [] };
	textGrids.grids.forEach( ( g, k ) => pictureGrids.grids.has( k ) || pictureGrids.grids.set( k, { ...g, text: true } ) );
	pictureGrids.notes.push( ...textGrids.notes );
	// A surface the page map holds as an sgs_choice_flow row: what the flow holds, read from the fact record.
	const role = surface.role ?? null;
	const flow = R.choiceFlow && 'choiceFlow' === role?.role ? choiceFlowModel( { view, rootKey: view.entry( m.root )?.template.key ?? null, R: R.choiceFlow, formControl: R.formControl, brands: facts.brands || [], surfaceKind: surface.kind, parts: scope?.surfaceParts ?? [], folder: handoffOf( facts ) } ) : null;
	// The surface's accordions, sliders and tabs, recognised by what the draft's code does (lib/skeleton-widgets.mjs), read
	// once on first use.
	let widgetsRead = null;
	const widgets = () => ( widgetsRead ||= widgetModel( { m, view, facts, R, surface, declared: ( e ) => declared( e, tokens ), topBlock: hooks.topBlock, narrows: ( c ) => !! R.optionSetFilter && narrowsList( c ) } ) );
	// The verdict an accordion, slider or tabs part takes, or null. A handoff record that agrees is named in the reason.
	const widgetVerdict = ( e ) => {
		const hit = R.accordion || R.slider || R.tabs ? widgets().of( e ) : null;
		const md = hit?.model;
		if ( ! hit ) {
			return null;
		}
		if ( 'accordionControl' === hit.rule || 'sliderControl' === hit.rule || 'tabsList' === hit.rule ) {
			return v( md.kind, { action: 'absorbed', into: hit.into } );
		}
		if ( 'slider' === hit.rule ) {
			// The slides travel with the verdict: each is one child the slider draws, read for its card's look at its own slide.
			return v( 'slider', { block: md.block, absorb: true, attributes: md.attributes, slides: md.slides, slideFields: md.slideFields, reason: `${ R.slider.reason }; ${ md.slides.length } slides, ${ md.arrows } arrow and ${ md.dots } dot controls${ md.timer ? ', a timer' : '' }${ md.drag ? ', drag' : '' }; no handoff record kind names a slider` } );
		}
		if ( 'tabs' === hit.rule ) {
			return v( 'tabs', { block: R.tabs.block } );
		}
		if ( 'tab' === hit.rule ) {
			const tab = facts.composition[ R.tabs.block ]?.accepts?.[ 0 ];
			return v( 'tabs', { block: tab, attributes: R.tabs.settings?.label ? { [ R.tabs.settings.label ]: md.tabs[ hit.index ].label } : {} } );
		}
		const S = R.accordion.settings || {};
		const why = `${ R.accordion.reason }; ${ md.units.length } items on state key ${ md.key } (${ md.multiple ? 'several open at once' : 'one open at a time' }); ${ md.record ? `agrees with handoff record ${ md.record }` : 'no handoff record of kind accordion names it' }`;
		if ( 'accordion' === hit.rule ) {
			// The units travel with the verdict: the accordion keeps its rows' parts' look as its own settings, read from them
			// (lib/skeleton-child-slots.mjs::unitSlots, rules.accordion.childSlots).
			return v( 'accordion', { block: R.accordion.block, attributes: accordionSettings( md ), reason: [ why, ...widgets().toggleIcon( md ).notes ].join( '; ' ), units: { units: md.units, open: md.open } } );
		}
		const words = widgets().itemWords( md.units[ hit.index ] );
		const closed = md.units[ hit.index ].rendered.length ? { inner: [], handover: [] } : widgets().closedPanel( md, hit.index, m.tplFinder );
		const open = md.multiple && md.open.includes( hit.index ) && S.itemOpen ? { [ S.itemOpen ]: true } : {};
		const handover = [ ...words.handover, ...closed.handover ];
		return v( 'accordion', { block: md.item, attributes: { ...words.attributes, ...open }, reason: why, ...( closed.inner.length ? { closedInner: closed.inner } : {} ), ...( handover.length ? { handover: handover[ 0 ], handovers: handover } : {} ) } );
	};
	// An accordion's own settings: several open at once for a keyed map of open items, the one item open at rest, the items'
	// category lines printed with no filter when a unit's control shows a category, and the toggle icon its units draw.
	const accordionSettings = ( md ) => {
		const S = R.accordion.settings || {};
		const lines = S.categoryShown && S.categoryAlways && md.units.some( ( u ) => S.category in widgets().itemWords( u ).attributes );
		return { ...( md.multiple && S.several ? { [ S.several ]: true } : {} ), ...( ! md.multiple && 1 === md.open.length && S.openAtRest ? { [ S.openAtRest ]: md.open[ 0 ] } : {} ), ...( lines ? { [ S.categoryAlways ]: true } : {} ), ...widgets().toggleIcon( md ).attributes };
	};
	// A form, or an element below one: the linked reference block (rules.formLink, a rule that runs after the structures) or the
	// draft's own <form>. Walked from the element up to the hero, because the hero's own media and layout wrappers are never a
	// form, nor anything under one. The hero's inner rule leaves such an element to the form rules, so the page keeps its form
	// (rules.heroInner). A commerce region and the other structures are decided before the hero's inner rule and need no check.
	const ownedBelowHero = ( e, heroKey ) => {
		for ( let x = e; x && x.key !== heroKey; x = m.byKey[ x.parentKey ] ) {
			if ( hooks.formLinkOf( x ) || 'form' === view.realTag( x ) ) {
				return true;
			}
		}
		return false;
	};

	// A business detail (an open status, opening hours or a Site Info value) has a rule of its own: it is never a trust badge.
	const businessDetail = ( k ) => openLine( k ) || !! specHit( facts.decisions.siteInfoPatterns?.hours, all( k ) ) || hooks.siteInfoKinds( k ).size > 0;
	// Whether an element of a header surface sits in a strip above or below its main bar: the element under the outermost one
	// on its way up (a child of the header's root, or of a strip root read beside the header) holds no navigation and no logo
	// (the main bar holds those: lib/skeleton-write-slots.mjs::holdsMain).
	const inHeaderStrip = ( e ) => {
		const chain = [];
		for ( let p = e; p; p = m.byKey[ p.parentKey ] ) {
			chain.unshift( p );
		}
		const top = chain[ 1 ];
		return 'header' === surface.kind && !! top && ! [ top, ...desc( top ) ].some( ( d ) => 'nav' === d.tag || logoish( d ) );
	};

	// Whether an element of a header surface or inside a page template's own top-level `<header>` sits in the header. A
	// `<header>` inside an article, section, main, aside, list item, quotation or figure heads that block (a post's title and
	// byline), never the site, so it is no header here.
	const SECTIONING = [ 'article', 'section', 'main', 'aside', 'li', 'blockquote', 'figure' ];
	const inHeader = ( e ) => 'header' === surface.kind || ancestors( e ).some( ( a ) => 'header' === view.realTag( a ) && ! ancestors( a ).some( ( x ) => SECTIONING.includes( view.realTag( x ) ) ) );
	const ancestors = ( e ) => {
		const out = [];
		for ( let p = m.byKey[ e.parentKey ]; p; p = m.byKey[ p.parentKey ] ) {
			out.push( p );
		}
		return out;
	};
	// The rendered markup of the first SVG in or beside an element's words (lib/skeleton-inventory.mjs::svgMarkupOf), and the
	// kept icon markup of it.
	const markupOf = ( k ) => [ k, ...desc( k ) ].flatMap( ( d ) => m.kids( d ) ).find( ( c ) => 'svg' === c.tag )?.svg;
	const iconOf = ( k ) => {
		const markup = markupOf( k );
		return markup ? keptSvg( markup ) : null;
	};

	const STRUCTURES = [
		// A choice flow's root is sgs/choice-flow, whatever its surfaces.json kind (a modal, a form): the flow draws its frame, and
		// its steps are composed from the record (lib/skeleton-choice-flow-tree.mjs), so the draft elements are absorbed.
		( { e } ) => ( flow && e === m.root ? v( 'choiceFlow', { block: R.choiceFlow.block, absorb: true, attributes: flow.attributes } ) : null ),
		// A surface the page map holds as a block-owned part of another row (the cart page's bag drawer) is that block, which
		// draws everything in it (S5); a row template with no owning block named leaves the root to the scoring.
		( { e } ) => {
			const own = e === m.root && 'blockPart' === role?.role ? R.blockOwnedPart?.byTemplate?.[ role.row.template ] : null;
			return own ? v( 'blockOwnedPart', { block: own.block, absorb: true, attributes: { ...( own.attributes || {} ) }, reason: `${ own.reason }; the page map holds this surface as the ${ role.part.kind } part "${ role.part.label }" of the ${ role.row.slug } row` } ) : null;
		},
		// A surface the page map holds as a part of another row, with no row of its own (lib/skeleton-surface-role.mjs, FR-48-87),
		// is never built as its own form or blocks: on a WooCommerce row it is that row's piece, which draws it (the checkout's
		// form, the account's address form), so the piece is the root and everything in it is absorbed; any other part (a part of
		// its page, a record the draft code shows nothing for) is built on its row's own surface, so this surface places nothing.
		( { e } ) => {
			if ( e !== m.root || 'ownedPart' !== role?.role || ! R.ownedPart ) {
				return null;
			}
			const held = `the page map holds this surface as the ${ role.part.kind } part "${ role.part.label }" of the ${ role.row.slug } row (owner ${ role.part.owner })`;
			const block = 'woocommerce' === role.part.owner ? ownerBlockOf( role.row, R.commerceRegion ) : null;
			return block ? v( 'ownedPart', { block, absorb: true, reason: `${ R.ownedPart.pieceReason }; ${ held }` } ) : v( 'ownedPart', { action: 'remove', reason: `${ R.ownedPart.rowReason }; ${ held }` } );
		},
		// The control that opens such a drawer is that block too (the bag pill is the cart block's trigger): the block draws the
		// drawer and its own trigger, so the control's label, count and icon are absorbed into the trigger settings. Before the
		// drawer opener, which would otherwise take any control opening a drawer as the navigation's burger.
		( { e } ) => {
			const d = opensOwnedDrawer( e );
			const trigger = d ? triggerOf( e, d.own.trigger ) : null;
			return d ? v( 'blockPartOpener', { block: d.own.block, absorb: true, triggerParts: trigger.parts, attributes: { ...( d.own.attributes || {} ), ...trigger.attributes }, reason: `${ R.blockPartOpener.reason }; it opens ${ d.surface.id } (${ d.surface.name }), which the page map holds as the ${ d.part.kind } part "${ d.part.label }" of the ${ d.row.slug } row` } ) : null;
		},
		// A control that opens a modal, flow or form row is a button linking the target's anchor (rules.surfaceOpener); the surface
		// holding it gets the target's frame (lib/skeleton-openers.mjs::surfaceFrames, called by lib/skeleton-propose.mjs).
		( { e } ) => {
			const t = opensSurface( e );
			return t ? v( 'surfaceOpener', { block: R.surfaceOpener.button.block, absorb: true, attributes: openerAttributes( t, ( m.words( e ) || textLeaves( e ).map( ( k ) => m.words( k ) ).join( ' ' ) ).replace( /\s+/g, ' ' ).trim(), R.surfaceOpener ), reason: `${ R.surfaceOpener.reason }; it opens the ${ t.kind } ${ t.slug }` } ) : null;
		},
		// A WooCommerce page's commerce region is WooCommerce's working piece, an ordinary block that draws the region
		// itself (rules.commerceRegion): the region's children are absorbed into it.
		( { e } ) => ( region?.key === e.key ? v( 'commerceRegion', { block: region.block, absorb: true, attributes: region.attributes, inner: region.inner, item: region.item?.key ?? null, reason: region.reason } ) : null ),
		// The shop's filter rail is the framework's working filter (rules.filterRail): the rail's children are absorbed into it.
		( { e } ) => ( rail?.key === e.key ? v( 'filterRail', { block: R.filterRail.block, absorb: true, attributes: rail.attributes, inner: rail.inner, reason: rail.reason, ...( rail.ownAlternativeBelow ? { ownAlternativeBelow: rail.ownAlternativeBelow } : {} ) } ) : null ),
		// A tile of a priced loop naming a catalogue product, on a page that is not the shop, is the site's product card bound
		// to that product (rules.productTile): the card draws the tile, so its elements are absorbed.
		// A review section naming one review platform is that platform's review block (rules.reviewPlatform), which draws the
		// section's reviews, rating line and links, so its elements are absorbed. Before the slider rule, which would take the reviews.
		( { e } ) => {
			const hit = reviews.regions.get( e.key );
			return hit ? v( 'reviewPlatform', { block: hit.block, absorb: true, attributes: hit.attributes, reason: `${ R.reviewPlatform.reason }; ${ hit.reason }`, ...( hit.handover ? { handover: hit.handover } : {} ) } ) : null;
		},
		( { e } ) => ( tiles.listings.has( e.key ) && R.productTile.listing ? v( 'productTile', { block: R.productTile.listing, reason: R.productTile.listingReason } ) : null ),
		( { e } ) => {
			const t = tiles.tiles.get( e.key );
			return t ? v( 'productTile', { block: R.productTile.block, absorb: true, attributes: { ...( R.productTile.attributes || {} ) }, product: t.draftId, reason: `${ R.productTile.reason }; the tile names the catalogue product ${ t.draftId } "${ t.name }"${ t.brand ? ` (${ t.brand })` : '' }` } ) : null;
		},
		// The control that opens the drawer, inside a header whose navigation block draws its own opener below its collapse
		// point: the navigation block draws it, so it is absorbed there.
		( { e } ) => {
			const nav = R.drawerOpener && 'nav' !== e.tag && opensDrawer( e ) ? burgerNav() : null;
			return nav && nav.key !== e.key ? v( 'drawerOpener', { action: 'absorbed', into: nav.key } ) : null;
		},
		// The drawer's own close button: the drawer block draws it (its close part), so it is absorbed there.
		( { e } ) => ( R.drawerClose && 'drawer' === surface.kind && e !== m.root && closesDrawer( e ) ? v( 'drawerClose', { action: 'absorbed', into: m.root.key } ) : null ),
		// A direct child of a header's disclosure panel, told apart by its declared sizing, own paint and a loop of links:
		// a growing child holding a run of links is a mega group, a fixed or ratio-sized painted box without links an aside,
		// and any other growing child a plain container (lib/skeleton-panel-rules.mjs).
		( { e } ) => {
			const { rule, ...hit } = panel.panelChild( e ) ?? {};
			return rule ? v( rule, hit ) : null;
		},
		// An accordion (its host, items and their controls), a slider (its track and its controls) and tabs (the host, the tab
		// list and the shown panel), read by what the draft's code does (lib/skeleton-widgets.mjs).
		( { e } ) => widgetVerdict( e ),
		// A group whose block children are all buttons carrying a pressed or checked state (a loop of chips, or two or more) is
		// a choice the visitor makes: inside a form element it is that form's tiles field (`optionSetForm`); anywhere else it is
		// an option picker, which draws its own options, and when the chips' handlers write a state key another list on the
		// surface is filtered by it carries the hand-over to wire that filter (`optionSetFilter`). On a form surface drawn
		// without a <form> (its root is the form block by rule formHost: a wizard in a <div>) a group that filters no list is
		// the form's tiles field too.
		// The tiles field's label, required marker and hint are its own settings, read as any field's (fieldContent).
		( { e } ) => {
			const chips = chipGroup( e );
			if ( ! chips ) {
				return null;
			}
			if ( tilesField( e ) ) {
				return v( 'optionSetForm', { block: R.optionSetForm.block, attributes: fieldContent( e, R.optionSetForm.block ), absorb: true } );
			}
			const filter = R.optionSetFilter && narrowsList( chips[ 0 ] );
			const shelf = filter ? categoryFilter( chips ) : null;
			if ( shelf ) {
				return v( 'optionSetFilter', { block: shelf.name, attributes: shelf.attributes, inner: shelf.innerBlocks, absorb: true, reason: shelf.reason } );
			}
			return v( filter ? 'optionSetFilter' : 'optionSet', { block: R.optionSet.block, attributes: R.optionSet.hideLabel ? { [ R.optionSet.hideLabel.setting ]: false } : {}, chips: chips.map( ( k ) => k.key ), absorb: true, ...( filter ? { handover: { owner: 'behaviour', kind: 'behaviour', detail: R.optionSetFilter.handover } } : {} ) } );
		},
		// A strip whose own animation loops a translate for ever is a marquee: logos make a brand strip, labels a scrolling
		// trust bar; the repeated items are its items.
		// A strip with no stamped children whose template holds one text binding the draft's code fills (its items are built
		// in code) and whose own animation loops a translate for ever is the same marquee: the items are added in the editor.
		( { e, kidsB } ) => {
			const rec = view.entry( e );
			const built = rec && ! kidsB.length && ! view.childrenOf( e ).length && rec.template.holes.some( ( h ) => 'text' === h.where );
			// The motion keys name the template element (`<dc file>/<tpl>`), whatever import chain the page stamps it under.
			if ( ! R.marqueeCodeItems || ! built || ! ( loops( e ) || motion.has( templateKey( { dc: e.template, tpl: e.tpl } ) ) ) ) {
				return null;
			}
			// The items the inventory read from the rendered strip (lib/skeleton-inventory.mjs, `codeItems`) are the block's items,
			// each its words and its icon as the icon writer keeps it; with none read, the items are handed over. Items with no
			// icon take the block's word-only style (`items.plain`), and the first item's element is where Fill reads the
			// items' look (`codeItem`, its child-index path from the strip: lib/skeleton-propose.mjs gives it the draftSlots of
			// `items.slots`). A glyph drawn beside every item's words (a separator) has no setting: the row names it (`glyphNote`).
			const I = R.marqueeCodeItems.items;
			const read = I && ( e.codeItems || [] ).length >= 2 ? e.codeItems : null;
			const items = read ? read.map( ( x ) => {
				const svg = x.svg ? keptSvg( x.svg ) : null;
				return { [ I.text ]: x.text, ...( svg ? { [ I.svg ]: svg } : {} ) };
			} ) : null;
			if ( ! items ) {
				return v( 'marqueeCodeItems', { block: R.marqueeCodeItems.block, attributes: {}, absorb: true, handover: { owner: 'content-page', kind: 'presence', detail: R.marqueeCodeItems.handover } } );
			}
			const plain = I.plain && read.every( ( x ) => ! x.svg ) ? { [ I.plain.setting ]: I.plain.value } : {};
			const marks = [ ...new Set( read.map( ( x ) => x.marks || '' ) ) ];
			const glyph = I.marksNote && 1 === marks.length && '' !== marks[ 0 ] ? { glyphNote: `${ I.marksNote }: the draft draws "${ marks[ 0 ] }" beside every item's words` } : {};
			return v( 'marqueeCodeItems', { block: R.marqueeCodeItems.block, attributes: { [ I.setting ]: items, ...Object.fromEntries( ( I.clear || [] ).map( ( a ) => [ a, '' ] ) ), ...plain }, absorb: true, ...( Object.keys( plain ).length ? { decided: plain } : {} ), ...( Array.isArray( read[ 0 ].at ) ? { codeItem: read[ 0 ].at } : {} ), ...glyph } );
		},
		( { e, kidsB } ) => {
			if ( ! loops( e ) || ! kidsB.length ) {
				return null;
			}
			const logos = desc( e ).some( isMedia );
			// A strip of links each naming one item in words, with no picture (a brand strip set in type), is the logo block
			// showing names: each link's words are one item, a loop doubled for the scroll read once (`marquee.textItems`).
			const T = R.marquee?.textItems;
			const names = ! logos && T && kidsB.length >= 2 && kidsB.every( ( k ) => 'a' === k.tag && !! all( k ) ) ? onceOfLoop( kidsB.map( ( k ) => all( k ) ) ) : null;
			if ( names ) {
				return v( 'marquee', { block: R.marquee.logoBlock, attributes: { ...T.attributes, [ T.items.setting ]: names.map( ( n ) => ( { [ T.items.text ]: n } ) ) }, absorb: true, handover: { owner: 'content-page', kind: 'presence', detail: T.handover } } );
			}
			if ( ! logos && ! pageSection( e, R.marquee?.itemBlock ) ) {
				return null;
			}
			// Logo tiles that each name themselves (an aria-label) show that name where no picture is set yet: a strip of empty
			// picture placeholders is never an empty band, and a logo added later replaces its name (`marquee.labelledLogos`).
			const L = R.marquee?.labelledLogos;
			const labelled = !! L && kidsB.length >= 2 && kidsB.every( ( k ) => '' !== String( k.attrs?.[ 'aria-label' ] ?? '' ).trim() );
			// A labelled tile the draft paints (a declared background, border or shadow) is the block's name tile
			// (`marquee.labelledLogos.tile`): the setting that draws each name as a tile and the layout that draws tiles (the row layout
			// draws none, so Fill may not choose it: `decided`), and the first tile is where Fill reads the tile's look (`firstItem`, `marquee.itemSlots`).
			const T2 = L?.tile;
			const painted = labelled && !! T2 && PAINT_DECL.test( String( kidsB[ 0 ].attrs?.style ?? '' ) );
			// Tiles of a fixed square size are the strip's count per device and its cap per device (`marquee.labelledLogos.tileSize`): a
			// length per device is no setting the block holds, and these settings paint a size, so they are decided, never attributes.
			const sizeRule = L?.tileSize;
			const size = logos && sizeRule ? tileCount( { tiles: squareTile( kidsB[ 0 ] ), viewport: boxWidths( m.byKey[ e.parentKey ] ), gap: stripGap( e.attrs?.style ) } ) : null;
			const sizeDecided = size ? { [ sizeRule.count ]: size.columns, ...Object.fromEntries( Object.entries( size.caps ).map( ( [ device, cap ] ) => [ sizeRule.cap[ device ], cap ] ) ) } : {};
			const decided = { ...( painted ? { [ T2.layout.setting ]: T2.layout.value } : {} ), ...sizeDecided };
			return v( 'marquee', logos ? { block: R.marquee?.logoBlock, attributes: labelled ? { ...L.attributes, ...( painted ? { [ T2.setting ]: true, [ T2.layout.setting ]: T2.layout.value } : {} ) } : {}, absorb: true, ...( painted ? { firstItem: kidsB[ 0 ].key } : {} ), ...( Object.keys( decided ).length ? { decided } : {} ), handover: { owner: 'content-page', kind: 'presence', detail: 'the brand logos: add each logo image to the strip' } } : { block: R.marquee?.itemBlock, attributes: {}, absorb: true } );
		},
		// A row of short non-interactive labels, each with at most a glyph, is a trust bar (its badges are its items).
		( { e, kidsB } ) => {
			const T = R.trustBar;
			// A badge is a short label that is not a business detail (an open status, hours or a Site Info value have their
			// own rules); the badges sit side by side, never stacked.
			const detail = businessDetail;
			const badge = ( k ) => ! [ 'a', 'button' ].includes( k.tag ) && ! HEADING.test( k.tag ) && !! all( k ) && ! /^\d+$/.test( all( k ) ) && all( k ).split( ' ' ).length <= ( T?.maxWords ?? 4 ) && ! detail( k ) && m.blockKids( k ).every( ( g ) => bare( g ) || iconOnly( g ) || bindingGlyph( g ) );
			// What makes a badge a trust badge is its meaning: at least one names a capability the framework database records
			// for the trust bar (accreditation, certification, halal and the like), matched on the word's stem.
			const stem = ( w ) => ( w.length <= 4 ? w : w.slice( 0, 5 ) );
			const vocab = new Set( ( T ? facts.capsOf( T.block ) : [] ).filter( ( c ) => ! c.includes( '-' ) && ! ( T.ignoreCapabilities || [] ).includes( c ) ).map( stem ) );
			const trusted = ( k ) => all( k ).toLowerCase().split( /[^a-z]+/ ).some( ( w ) => w.length >= 3 && vocab.has( w.length <= 4 ? w : stem( w ) ) );
			if ( ! T || ! pageSection( e, T.block ) || m.words( e ) || [ 'a', 'button' ].includes( e.tag ) || kidsB.length < ( T.minItems ?? 2 ) || ! kidsB.every( badge ) || m.stacked( kidsB ) || detail( e ) || ! kidsB.some( trusted ) ) {
				return null;
			}
			return v( 'trustBar', { block: T.block, absorb: true, attributes: { items: kidsB.map( ( k ) => ( { label: all( k ) } ) ) } } );
		},
		// A run of labels side by side in a header's strip row is one trust bar (rules.headerStripBar): each label an item, the
		// glyph drawn beside its words the item's icon (the inventory's rendered SVG, lib/skeleton-inventory.mjs::svgMarkupOf), a
		// glyph with no letter between labels their separator. The items take the bare-icon style when every label draws an
		// icon and the word-only style when none does (`decided`), and the first label is where Fill reads the items' look.
		( { e, kidsB, parentBlock } ) => {
			const S = R.headerStripBar;
			if ( ! S || ! R.headerSlots?.rowBlock || parentBlock !== R.headerSlots.rowBlock || m.words( e ) || [ 'a', 'button' ].includes( e.tag ) || ! inHeaderStrip( e ) ) {
				return null;
			}
			const lettered = ( k ) => /[\p{L}\p{N}]/u.test( all( k ) );
			const label = ( k ) => ! [ 'a', 'button' ].includes( k.tag ) && ! HEADING.test( k.tag ) && ! interactive( k ) && ! numberOnly( k ) && all( k ).split( ' ' ).length <= ( S.maxWords ?? 12 ) && ! businessDetail( k ) && m.blockKids( k ).every( ( g ) => bare( g ) || iconOnly( g ) || bindingGlyph( g ) );
			const labels = kidsB.filter( lettered );
			if ( labels.length < ( S.minItems ?? 2 ) || ! labels.every( label ) || ! kidsB.every( ( k ) => lettered( k ) || ! m.blockKids( k ).length ) || m.stacked( kidsB ) ) {
				return null;
			}
			const texts = onceOfLoop( labels.map( all ) );
			const shown = labels.slice( 0, texts.length );
			const items = shown.map( ( k ) => {
				const svg = iconOf( k );
				return { [ S.items.text ]: all( k ), ...( svg ? { [ S.items.svg ]: svg } : {} ) };
			} );
			const icons = items.filter( ( x ) => x[ S.items.svg ] ).length;
			const style = S.style && ( icons === items.length ? S.style.icons : 0 === icons ? S.style.plain : null );
			// The icons are drawn at the size their SVGs state on the root (the block sizes the icon, so the kept markup carries
			// none): one size every label states is the bare icon's size, a setting that paints a width and a height, so decided.
			const sizes = new Set( shown.map( ( k ) => statedSvgSize( markupOf( k ) ) ) );
			const size = S.style?.iconSize && style === S.style.icons && 1 === sizes.size ? [ ...sizes ][ 0 ] : null;
			const decided = style ? { [ S.style.setting ]: style, ...( null !== size ? { [ S.style.iconSize ]: size } : {} ) } : null;
			// The glyph the draft repeats between the labels (one glyph, no letter) is the word-only items' separator: the block
			// prints it after each item (S.separator.setting), and the first one is the draft element of its separator part, where
			// Fill reads the glyph's colour.
			const glyphs = kidsB.filter( ( k ) => ! lettered( k ) && all( k ).trim() );
			const separator = S.separator && style === S.style?.plain && glyphs.length && glyphs.every( ( k ) => all( k ).trim() === all( glyphs[ 0 ] ).trim() ) ? glyphs[ 0 ] : null;
			return v( 'headerStripBar', { block: S.block, absorb: true, attributes: { [ S.items.setting ]: items, ...( style ? { [ S.style.setting ]: style } : {} ), ...( separator ? { [ S.separator.setting ]: all( separator ).trim() } : {} ) }, ...( decided ? { decided } : {} ), ...( separator ? { separator: separator.key } : {} ), firstItem: labels[ 0 ].key } );
		},
		// A lone label with a glyph before its words in a header (rules.headerStripBar.loneLabel) is a trust bar of one item: the
		// glyph is the item's icon (the rendered SVG) and the words its label, so the glyph is drawn and no longer unread. The
		// label is no link, button, heading, number or business detail, sits in no control, and its glyph comes first.
		( { e, kidsB } ) => {
			const S = R.headerStripBar;
			const L = S?.loneLabel;
			if ( ! L || ! m.words( e ) || kidsB.length || [ 'a', 'button' ].includes( e.tag ) || HEADING.test( e.tag ) || interactive( e ) || numberOnly( e ) || m.words( e ).split( ' ' ).length > ( S.maxWords ?? 12 ) || businessDetail( e ) || ! inHeader( e ) || ancestors( e ).some( ( a ) => [ 'a', 'button' ].includes( view.realTag( a ) ) || interactive( a ) ) ) {
				return null;
			}
			const svg = m.kids( e ).find( ( k ) => 'svg' === k.tag );
			const after = ( e.snippet || '' ).replace( /^<[^>]*>\s*/, '' );
			if ( ! svg || ! after.startsWith( '<svg' ) || ! iconOf( e ) ) {
				return null;
			}
			// The words at each width: the widest width's words are the item's label, the shorter ones the note.
			const wide = e.wordsAt?.[ 1440 ] || e.wordsAt?.[ 768 ] || e.wordsAt?.[ 375 ] || '';
			const shorter = Object.entries( e.wordsAt || {} ).filter( ( [ , x ] ) => x && x !== wide );
			const style = S.style && S.style.icons;
			const size = S.style?.iconSize ? statedSvgSize( markupOf( e ) ) : null;
			const decided = style ? { [ S.style.setting ]: style, ...( null !== size ? { [ S.style.iconSize ]: size } : {} ) } : null;
			return v( 'headerStripBar', { block: S.block, absorb: true, drawsWords: true, attributes: { [ S.items.setting ]: [ { [ S.items.text ]: wide || m.words( e ), [ S.items.svg ]: iconOf( e ) } ], ...( style ? { [ S.style.setting ]: style } : {} ) }, ...( decided ? { decided } : {} ), firstItem: e.key, reason: `${ S.reason }; ${ L.reason }`, ...( shorter.length ? { handover: { owner: 'content-page', kind: 'text', detail: `the label reads differently by width (${ shorter.map( ( [ w, x ] ) => `"${ x }" at ${ w }px` ).join( ', ' ) }, "${ wide }" elsewhere): the trust bar's item holds one label, so type the shorter words as a second bar shown only at those widths` } } : {} ) } );
		},
		// A link to a messaging app holding the app's mark and words is the app's button block, floating where fixed to the
		// viewport, its card style for a title over a line; words alone are a text link reading the app's Site Info address
		// (rules.messagingLink, lib/skeleton-messaging-link.mjs). The block draws the mark and the words, so they are absorbed.
		( { e } ) => {
			const hit = R.messagingLink ? messagingLink( { e, m, rule: R.messagingLink } ) : null;
			return hit ? v( 'messagingLink', { block: hit.block, absorb: true, attributes: hit.attributes, handover: hit.handover, reason: `${ R.messagingLink.reason }; ${ hit.reason }` } ) : null;
		},
		// The parent of a loop of titled picture tiles, each one link or control, is one card grid (rules.pictureTileGrid): the
		// block draws the cards, so the tiles are absorbed; each card's link the draft gives no address for is a handover.
		( { e } ) => {
			const g = pictureGrids.grids.get( e.key );
			const ruleName = g?.text ? 'textTileGrid' : 'pictureTileGrid';
			return g ? v( ruleName, { block: g.block, absorb: true, attributes: g.attributes, reason: `${ R[ ruleName ].reason }; ${ g.reason }`, ...( g.handovers.length ? { handover: g.handovers[ 0 ], handovers: g.handovers } : {} ) } ) : null;
		},
		// The parent of numbered steps (each typing its number beside its words, counting up from 1) is one process-steps block
		// (rules.numberedSteps): the block draws the steps, so the steps' elements are absorbed.
		( { e } ) => {
			const g = stepRuns.get( e.key );
			return g && 'form' !== surface.kind ? v( 'numberedSteps', { block: R.numberedSteps.block, absorb: true, attributes: g.attributes, decided: g.decided, reason: `${ R.numberedSteps.reason }; ${ g.reason }` } ) : null;
		},
		// The first section of a page holding its h1 is the hero; with an image inside it is the split hero. A page wrapper (the
		// `<main>`, or an element holding two or more stacked sections) is never the hero: the hero is its first block child
		// holding the h1 among two or more (however many wrappers deep), and a section after that one is not. A wrapper's only
		// child is the page's content container, not a section: such a page has no hero.
		( { e, kidsB } ) => {
			if ( 'page' !== surface.kind || ! kidsB.length || ! holdsH1( e ) || pageWrapper( e ) ) {
				return null;
			}
			const parent = m.byKey[ e.parentKey ];
			if ( 1 !== e.depth && ! ( parent && wrapperOfPage( parent ) && m.blockKids( parent ).length >= 2 && m.blockKids( parent ).find( holdsH1 ) === e ) ) {
				return null;
			}
			// A picture laid behind the content (lib/skeleton-hero-background.mjs) is the hero's background: only a picture beside
			// the content makes it the split hero.
			const backdrop = desc( e ).filter( isMedia ).filter( ( p ) => behindContent( { hero: e, picture: p, m, desc } ) );
			// A picture inside a collage layer is that layer's own, and a picture set inline in a heading is part of its words (the
			// heading draws it): neither is the hero's split media.
			const collage = collageOf( e );
			const inHeading = ( p ) => {
				for ( let up = m.byKey[ p.parentKey ]; up && up !== e; up = m.byKey[ up.parentKey ] ) {
					if ( HEADING.test( up.tag ) ) {
						return true;
					}
				}
				return false;
			};
			const pictures = desc( e ).filter( isMedia ).filter( ( p ) => ! backdrop.includes( p ) && ! collage.layerOf.has( p.key ) && ! inHeading( p ) && fillsColumn( p, e ) );
			const media = pictures.length > 0;
			// A split hero's order per device is the draft's (lib/skeleton-hero-order.mjs): its picture against every worded
			// element outside a picture, at each device's width.
			const inPicture = ( k ) => pictures.some( ( p ) => desc( p ).includes( k ) );
			const order = media ? heroSplitOrder( {
				media: pictures.find( ( p ) => Object.values( p.visible || {} ).some( Boolean ) ) || pictures[ 0 ],
				words: desc( e ).filter( ( k ) => m.words( k ) && ! m.blockKids( k ).length && ! isMedia( k ) && ! inPicture( k ) ),
				rule: R.hero?.splitOrder,
				allowed: R.hero?.splitOrder?.setting ? facts.enumOf?.( R.hero.block, R.hero.splitOrder.setting ) ?? null : null,
			} ) : { value: null, problems: [] };
			// Its picture's own alignment in its column: the draft's declared justify-self or auto side margins.
			const align = media ? heroMediaAlignment( { style: declared( pictures.find( ( p ) => Object.values( p.visible || {} ).some( Boolean ) ) || pictures[ 0 ], tokens ), rule: R.hero?.splitAlignment } ) : null;
			// The side an absolutely placed content block is anchored to is the hero's vertical alignment (rules.hero.verticalAlignment): a
			// setting that paints CSS, so the verdict carries it as `decided` and Fill writes it (lib/fill-resolve.mjs::fillContent).
			const V = R.hero?.verticalAlignment;
			const anchor = ! media && V?.setting ? contentAnchor( { hero: e, m, desc, isMedia } ) : null;
			const vertical = anchor && V.values?.[ anchor ] && ( facts.enumOf?.( R.hero.block, V.setting ) || [] ).includes( V.values[ anchor ] ) ? { [ V.setting ]: V.values[ anchor ] } : {};
			const attributes = media ? { variant: 'split', ...( order.value ? { [ R.hero.splitOrder.setting ]: order.value } : {} ), ...( align ? { [ R.hero.splitAlignment.setting ]: align } : {} ) } : {};
			// The wrapper framing the picture: the outermost element above it that holds the picture alone (each a lone block child on
			// the way up to the hero's own columns) and declares a paint of its own (rules.heroInner.frame.properties).
			let frame = null;
			const framing = new Set( R.heroInner?.frame?.properties || [] );
			const picture = pictures.find( ( p ) => Object.values( p.visible || {} ).some( Boolean ) ) || pictures[ 0 ];
			for ( let up = picture ? m.byKey[ picture.parentKey ] : null; up && up !== e && 1 === m.blockKids( up ).length; up = m.byKey[ up.parentKey ] ) {
				Object.keys( declared( up, tokens ) ).some( ( p ) => framing.has( p ) ) && ( frame = up );
			}
			const verdict = v( 'hero', { block: R.hero?.block, attributes, ...( Object.keys( vertical ).length ? { decided: vertical } : {} ), ...( frame ? { mediaFrame: frame.key } : {} ), ...( media ? { handover: { owner: 'content-page', kind: 'presence', detail: 'the hero image: choose it in the hero\'s split media setting' } } : backdrop.length ? { handover: { owner: 'content-page', kind: 'presence', detail: 'the hero image: choose it in the hero\'s background setting' } } : {} ) } );
			verdict && order.problems.length && ( verdict.reason = `${ verdict.reason }; ${ order.problems.join( '; ' ) }` );
			return verdict;
		},
		// The frame that only clips or fades a marquee track goes: the strip draws its own overflow and edge fade.
		( { e, kidsB } ) => ( ! m.words( e ) && 1 === kidsB.length && loops( kidsB[ 0 ] ) && desc( kidsB[ 0 ] ).some( isMedia ) ? v( 'marqueeFrame', { action: 'unwrap' } ) : null ),
		// A wrapper whose only styles align or space its content (text-align, padding, margin) is proposed for dissolving, and
		// goes only where nothing it paints is lost: its alignment goes (the nodes inside read centred text themselves), while
		// padding is a look ruleFor's unwrap guard keeps unless a reader or its parent (absorbFor) takes it. Anything that paints
		// (a background, border, shadow), positions or lays out is not this rule's.
		( { e, st, kidsB, parentBlock } ) => {
			const props = Object.keys( st );
			const only = new Set( R.alignWrapper?.properties || [] );
			// A margin on a wrapper that follows a sibling is the gap between the two blocks, not spacing inside the wrapper:
			// unwrapping it would lose that gap, so the wrapper stays.
			const apart = !! R.alignWrapper?.siblingGap && props.some( ( p ) => p.startsWith( 'margin' ) ) && m.blockKids( m.byKey[ e.parentKey ] || { key: null } ).indexOf( e ) > 0;
			// Padding above or below its content is space no block around or inside it holds: the wrapper goes only where its
			// parent absorbs it (`onlyIfAbsorbed`, ruleFor's absorbFor), whose part then carries the space; otherwise it stays
			// and carries its own padding, even where a reader takes the padding. Side padding alone is the unwrap guard's: it
			// stays unless read or absorbed. Alignment alone goes.
			const holdsSpace = !! R.alignWrapper?.blockPadding && ( blockPadding( st ) > 0 || someWidth( e, ( r ) => ( pxOf( r[ 'padding-top' ] ) ?? 0 ) > 0 || ( pxOf( r[ 'padding-bottom' ] ) ?? 0 ) > 0, () => false ) );
			return parentBlock && ! m.words( e ) && kidsB.length && props.length && props.every( ( p ) => only.has( p ) ) && ! apart ? v( 'alignWrapper', { action: 'unwrap', ...( holdsSpace ? { onlyIfAbsorbed: true } : {} ) } ) : null;
		},
		// Inside a hero: its image is the hero's own media slot; its layout wrappers go (the hero lays out its content).
		( { e, kidsB } ) => {
			const hero = ancestorBlocks( e ).find( ( a ) => a.block === R.hero?.block );
			if ( ! hero || ownedBelowHero( e, hero.key ) ) {
				return null;
			}
			// A collage keeps its stage as a container and each absolutely placed child as a decorative image layer; what sits
			// inside a layer is classified as anywhere else (the pictures are media blocks, not the hero's split media).
			const collage = collageOf( m.byKey[ hero.key ] );
			const isHeroMedia = ( k ) => isMedia( k ) && fillsColumn( k, m.byKey[ hero.key ] );
			if ( collage.stages.has( e.key ) ) {
				return v( 'heroCollage', { block: R.heroCollage.block } );
			}
			if ( collage.layerOf.has( e.key ) ) {
				return collage.layerOf.get( e.key ) === e.key ? v( 'heroCollageLayer', { block: R.heroCollageLayer?.block } ) : null;
			}
			if ( collage.rows.has( e.key ) ) {
				return v( 'heroCollageRow', { block: R.heroCollageRow?.block } );
			}
			if ( isHeroMedia( e ) ) {
				// A picture laid behind the hero's content is its background (rules.heroBackdrop), not a part of its split media.
				return behindContent( { hero: m.byKey[ hero.key ], picture: e, m, desc } ) ? v( 'heroBackdrop', { action: 'absorbed', into: hero.key } ) : v( 'heroInner', { action: 'absorbed', into: hero.key } );
			}
			// A wrapper laying two or more items side by side is a row (a button group, a row of labels), not a layout
			// wrapper: it stays, and the scoring proposes it (the multi-button for buttons, a container for labels).
			// The row that holds the hero's image is the hero's own split (content beside media), which the hero lays out.
			const row = kidsB.length > 1 && ! m.stacked( kidsB ) && ! desc( e ).some( isHeroMedia );
			// An item of such a row inside the hero (the column of a grid or flex row that is no split: its other cell holds no
			// picture, a tilted card pile) is that row's cell: unwrapping it would hand its items to the row as cells of their own.
			const rowOf = ( x ) => {
				const items = m.blockKids( x );
				return items.length > 1 && ! m.stacked( items ) && ! desc( x ).some( isHeroMedia );
			};
			const cell = m.byKey[ e.parentKey ] && m.byKey[ e.parentKey ].key !== hero.key && rowOf( m.byKey[ e.parentKey ] );
			if ( cell ) {
				return null;
			}
			// The wrapper stacking two or more of the hero's items with no picture inside, holding every worded element of the hero
			// outside its media (its heading among them), is the hero's content column: it is the draft element of the calibrated
			// slot of the rule's `contentSetting` (lib/skeleton-write-slots.mjs::hostSlot), so Fill reads the column's gap, padding
			// and ground there. A sub-list (a run of ticks, the eyebrow and heading pair) holds only part of the words, so it is not.
			const heroEl = m.byKey[ hero.key ];
			const underMedia = ( k ) => {
				for ( let x = m.byKey[ k.parentKey ]; x && x !== heroEl; x = m.byKey[ x.parentKey ] ) {
					if ( isHeroMedia( x ) ) {
						return true;
					}
				}
				return false;
			};
			const mine = new Set( desc( e ) );
			const holdsContent = desc( heroEl ).filter( ( k ) => m.words( k ) && ! isHeroMedia( k ) && ! underMedia( k ) ).every( ( k ) => mine.has( k ) );
			const column = kidsB.length > 1 && ! desc( e ).some( isHeroMedia ) && holdsContent && R.heroInner?.contentSetting ? { hostSetting: R.heroInner.contentSetting } : {};
			// A wrapper holding the hero's picture is the split's media side, which the hero lays out itself (`hostLays`).
			const lays = desc( e ).some( isHeroMedia ) ? { hostLays: hero.key } : {};
			return ! m.words( e ) && kidsB.length && ! row ? v( 'heroInner', { action: 'unwrap', ...column, ...lays } ) : null;
		},
	];

	// Paint conservation of an unwrap (Spec 48 section 3.4): a wrapper whose look (lib/skeleton-paint-conservation.mjs::paintsBox)
	// reaches no reader once it is dissolved is not dissolved, and the next rule, or the scoring, makes it a node. Its readers:
	// its destination (`hooks.unwrapReads( e, verdict, { parentBlock, declared } )`: { all } when the element becomes the draft
	// element of a calibrated slot of its host, { band } when a band finder reads its width cap, lib/fill-band.mjs, { sizing }
	// when the one block inside draws it as a part that reads `sizing.looks` (a logo's link part, recorded as `link-slot`);
	// without the hook a declared `hostSetting` reads it all and a band reads its cap), a setting the verdict records
	// (`conserve`), the host that lays its children out itself (`hostLays`), and the nodes inside it, which read an inherited
	// look (centred text) from their own computed values. A kept unwrap's verdict records where each look it dissolves goes
	// (`conserve`).
	const unwrapRead = ( x, out ) => {
		const painted = Object.keys( paintsBox( x.e, { declared: x.st, parent: m.byKey[ x.e.parentKey ] ?? null, children: m.kids( x.e ).length, uaPadding: m.uaPadding } ) );
		const dest = hooks.unwrapReads?.( x.e, out, { parentBlock: x.parentBlock, declared: x.st } ) ?? { all: !! ( out.hostSetting ?? R[ out.rule ]?.hostSetting ), band: true };
		const records = [ ...( out.conserve ?? [] ) ];
		const setting = records.flatMap( ( r ) => ( 'setting' === r.kind ? r.looks : [] ) );
		const inherited = x.kidsB.length ? painted.filter( ( l ) => INHERITED_LOOKS.includes( l ) ) : [];
		const laid = out.hostLays && painted.includes( 'layout' ) ? [ 'layout' ] : [];
		// The looks the link part of the block inside reads (dest.sizing.looks): only those, never every band look.
		const linked = painted.filter( ( l ) => ( dest.sizing?.looks || [] ).includes( l ) && ! setting.includes( l ) );
		const left = painted.filter( ( l ) => ! setting.includes( l ) && ! inherited.includes( l ) && ! laid.includes( l ) && ! ( dest.band && BAND_LOOKS.includes( l ) ) && ! linked.includes( l ) );
		if ( ! painted.length || dest.all ) {
			return { kept: true, left, conserve: out.conserve ?? [] };
		}
		inherited.length && records.push( { kind: 'inherited', looks: inherited } );
		laid.length && records.push( { kind: 'host-layout', node: out.hostLays, looks: laid } );
		linked.length && records.push( { kind: 'link-slot', node: dest.sizing.node, slot: dest.sizing.slot, looks: linked } );
		return { kept: ! left.length, left, conserve: records };
	};

	// The parent block that absorbs a wrapper whose look no reader takes (lib/skeleton-absorb-wrapper.mjs; Bean, 2026-11-21):
	// { node, block, slot, settings, looks } when the wrapper places nothing itself, its parent's block paints every look it
	// leaves at one free part (`hooks.absorbInto( e, looks )`, which also checks that the wrapper is the parent's only content),
	// and the parent's own element paints none of those looks but padding, which adds; null otherwise.
	const absorbFor = ( x, looks ) => {
		if ( ! looks.length || positioned( x.e, x.st ) ) {
			return null;
		}
		const hit = hooks.absorbInto?.( x.e, looks ) ?? null;
		const parent = hit ? m.byKey[ x.e.parentKey ] : null;
		if ( ! parent ) {
			return null;
		}
		const parentLooks = Object.keys( paintsBox( parent, { declared: declared( parent, tokens ), parent: m.byKey[ parent.parentKey ] ?? null, children: m.kids( parent ).length, uaPadding: m.uaPadding } ) );
		const parentLays = m.shownAt( parent ).some( ( w ) => /^(?:inline-)?(?:flex|grid)$/.test( String( ( parent.displayAt ? parent.displayAt[ w ] : parent.display ) ?? '' ).trim() ) );
		return clash( { looks, parentLooks, parentLays } ).length ? null : { ...hit, looks };
	};

	// The verdict for a layer its host takes in as its overlay: an unwrap (no node, nothing inside) naming the host's overlay
	// (`overlay`, which the writer records on the host's node as draftOverlay) and the record the paint check verifies there.
	// `o`: { node, slot, setting, property, others, widthVaries } (lib/skeleton-overlay-layer.mjs::overlayOf).
	const overlayVerdict = ( e, o ) => v( 'overlayLayer', {
		action: 'unwrap',
		overlay: { node: o.node, slot: o.slot, setting: o.setting, property: o.property },
		reason: `${ R.overlayLayer.reason }: it covers its host's whole box and is read at the host's overlay "${ o.slot }" (${ o.setting })${ o.widthVaries ? '; the stack differs by width, so the widths the one-value setting cannot hold are written by Fill\'s width ladder as scoped custom CSS on the host\'s overlay' : '' }`,
		conserve: [ { kind: 'overlay', node: o.node, slot: o.slot, setting: o.setting, settings: [ o.setting, ...o.others ], layer: e.key, looks: [ 'background' ] } ],
	} );

	// The verdict for one element, or null. An unwrap whose look no reader takes, or that holds space only its parent can carry
	// (`onlyIfAbsorbed`), goes only where the parent absorbs it: the verdict then names the parent (`absorbedBy`) and records
	// the looks the parent's settings carry (`conserve` kind absorbed); otherwise the next rule decides.
	const ruleFor = ( e, parentBlock = null ) => {
		const x = { e, st: declared( e, tokens ), text: all( e ), kidsB: m.blockKids( e ), parentBlock };
		for ( const rule of [ ...STRUCTURES, ...RULES ] ) {
			const out = rule( x );
			// A decoration layer that covers its host block's whole box is the host's own overlay where the host has one
			// (`hooks.overlayInto`, lib/skeleton-overlay-layer.mjs): it makes no node and the host reads it at the overlay.
			const overlay = out && 'decorationLayer' === out.rule && out.block && R.overlayLayer ? hooks.overlayInto?.( e ) ?? null : null;
			if ( overlay ) {
				return overlayVerdict( e, overlay );
			}
			if ( out && 'unwrap' === out.action ) {
				const read = unwrapRead( x, out );
				const only = !! out.onlyIfAbsorbed;
				delete out.onlyIfAbsorbed;
				const into = ! read.kept || only ? absorbFor( x, read.left ) : null;
				if ( into ) {
					out.absorbedBy = { node: into.node, slot: into.slot, settings: into.settings };
					out.reason = `${ out.reason }; it is its parent's only content and its ${ into.looks.join( ', ' ) } is read at the parent's part "${ into.slot }" (${ into.settings.join( ', ' ) }), so the parent absorbs it`;
					read.conserve = [ ...read.conserve, { kind: 'absorbed', node: into.node, slot: into.slot, settings: into.settings, looks: into.looks } ];
				} else if ( ! read.kept || only ) {
					continue;
				}
				read.conserve.length ? ( out.conserve = read.conserve ) : delete out.conserve;
			}
			if ( out ) {
				return out;
			}
		}
		return null;
	};

	return { ruleFor, drawsChildren, declared, widgets: () => ( R.accordion || R.slider || R.tabs ? widgets() : null ), accordionRun: ( md ) => ( { attributes: accordionSettings( md ), notes: widgets().toggleIcon( md ).notes, units: { units: md.units, open: md.open } } ), iconRun: panel.iconRun, siteInfoBrand: panel.siteInfoBrand, commerceRegion: region, filterRail: rail, productTiles: tiles, reviewPlatforms: reviews, pictureTileGrids: pictureGrids, choiceFlow: flow };
}
