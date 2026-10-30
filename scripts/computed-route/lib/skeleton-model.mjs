// The skeleton writer's reading of an inventory (lib/skeleton-inventory.mjs): the element tree, which elements are parts of
// another (a glyph and everything in it, an element never shown), the words and links an element carries, whether a run of
// siblings is stacked. Pure functions over the inventory JSON, so they run offline. An element's attributes, bindings,
// declared styles and resolved values are read through `read` (lib/element-facts.mjs), the one reader every skeleton rule
// calls, exposed as `m.read`.
import { parseTplKey } from './fill-skeleton.mjs';
import { fingerprintOf } from './identity.mjs';
import { elementFacts } from './element-facts.mjs';
import { PHRASING_TAGS } from './phrasing-content.mjs';

const ws = ( s ) => String( s ?? '' ).replace( /\s+/g, ' ' ).trim();
// The most a draft icon measures on either side before it is a picture.
export const ICON_PX = 48;

export function inventoryModel( inventory, read = elementFacts() ) {
	const els = inventory.elements;
	const byKey = Object.fromEntries( els.map( ( e ) => [ e.key, e ] ) );
	const kids = ( e ) => els.filter( ( c ) => c.parentKey === e.key );
	const inSvg = ( e ) => {
		for ( let p = byKey[ e.parentKey ]; p; p = byKey[ p.parentKey ] ) {
			if ( 'svg' === p.tag ) {
				return true;
			}
		}
		return false;
	};
	const shownAnywhere = ( e ) => Object.values( e.visible ).some( Boolean );
	// An icon beside a label: an image or a wrapper of images and svgs with no words, at most ICON_PX across.
	const isGlyph = ( c ) => {
		const b = c.box?.[ 1440 ] || c.box?.[ 375 ] || null;
		const small = ! b || ( b.w <= ICON_PX && b.h <= ICON_PX );
		return 'svg' === c.tag || ( ! ws( c.words ) && ! ws( c.allText ) && small && ( 'img' === c.tag || ( [ 'span', 'i', 'div' ].includes( c.tag ) && kids( c ).length > 0 && kids( c ).every( isGlyph ) ) ) );
	};
	// The icon of a link or button that holds its own words: part of the control (its icon slot), never a block of its own.
	const isLabelIcon = ( e ) => 'svg' !== e.tag && [ 'a', 'button' ].includes( byKey[ e.parentKey ]?.tag ) && !! ws( byKey[ e.parentKey ].words ) && isGlyph( e );
	// Part of its parent rather than a block: an svg and everything in it, an element never shown at any width (a br), the icon beside a control's label, or the cite a blockquote ends with (its attribution).
	const isCite = ( e ) => [ 'cite', 'footer', 'figcaption' ].includes( e.tag ) && 'blockquote' === byKey[ e.parentKey ]?.tag && !! ws( e.words );
	const basePart = ( e ) => 'svg' === e.tag || inSvg( e ) || ! shownAnywhere( e ) || isLabelIcon( e ) || isCite( e );
	// Whether an element renders inline at every width it shows at: the per-width display the inventory records
	// (`displayAt`), else its one recorded display (an inventory read before it recorded each width's).
	const inlineAt = ( e ) => {
		const at = e.displayAt ? Object.entries( e.displayAt ).filter( ( [ w, v ] ) => e.visible?.[ w ] && v ).map( ( [ , v ] ) => v ) : [ e.display ];
		return at.length > 0 && at.every( ( v ) => 'inline' === v );
	};
	// Inline content: HTML phrasing content (lib/phrasing-content.mjs) that renders inline at every width, holds words and
	// only other inline content (a line break, never shown, is part of it), and is neither a pill (a button, a badge) nor
	// bound to an event.
	const inlineContent = ( c ) => PHRASING_TAGS.has( c.tag ) && inlineAt( c ) && !! ws( c.allText || c.words ) && ! pillStyled( c ) && ! read.events( c ).length && kids( c ).every( ( k ) => ! shownAnywhere( k ) || inlineContent( k ) );
	// Part of the words around it: inline content whose parent holds nothing but text and inline content, beside words of
	// the parent's own or another inline element. Such a parent is one text element whose content is the inline HTML
	// (inlineHtml); a parent holding any block child (a button, an image, an inline-block pill) keeps every child a block.
	const inlinePart = ( e ) => {
		const p = byKey[ e.parentKey ];
		if ( ! p || ! inlineContent( e ) ) {
			return false;
		}
		const own = kids( p ).filter( ( k ) => ! basePart( k ) );
		return own.every( inlineContent ) && ( !! ws( p.words ) || own.length > 1 );
	};
	const isPart = ( e ) => basePart( e ) || inlinePart( e );
	// The widest width an element renders at (1440, else 768, else 375), the width its own classification is read at.
	const refWidth = ( e ) => [ 1440, 768, 375 ].find( ( w ) => e?.visible?.[ w ] ) ?? null;
	// A child that does not render where its parent does (an sc-if on a width: a label shown only on a phone): an alternative
	// of its parent, never part of what the parent is classified on.
	const widthOnly = ( c ) => {
		const ref = refWidth( byKey[ c.parentKey ] );
		return null !== ref && ! c.visible?.[ ref ] && shownAnywhere( c );
	};
	const blockKids = ( e ) => kids( e ).filter( ( c ) => ! isPart( c ) && ! widthOnly( c ) );
	const widthKids = ( e ) => kids( e ).filter( ( c ) => ! isPart( c ) && widthOnly( c ) );
	// The widths an element renders at, as the 375, 768 and 1440 it is visible at.
	const shownAt = ( e ) => [ 375, 768, 1440 ].filter( ( w ) => e.visible?.[ w ] );
	// The inline parts of an element, in document order.
	const inlineParts = ( e ) => kids( e ).filter( inlinePart );
	// The element's content in order: [ { text } | { br } | { el } ], from the inventory's recorded run order (`flow`: text
	// runs, line breaks and the keys of the stamped children); an inventory read before it recorded the order places the
	// element's own words (set off by spaces from its children) before its children when they open its content (textLeads), else after them.
	const flowOf = ( e ) => {
		if ( Array.isArray( e.flow ) ) {
			return e.flow.map( ( x ) => ( 'string' === typeof x ? { text: x } : x.br ? { br: true } : { el: byKey[ x.key ] ?? null } ) ).filter( ( x ) => null != x.text || x.br || x.el );
		}
		const els = kids( e ).map( ( el ) => ( { el } ) );
		const own = e.words ? [ { text: els.length ? ` ${ e.words } ` : e.words } ] : [];
		return false === e.textLeads ? [ ...els, ...own ] : [ ...own, ...els ];
	};
	// An element's words: its own, and the words of its inline parts in the order they read, a line break as a space (an
	// element with no inline parts reads its own words, as the inventory recorded them).
	const words = ( e ) => {
		if ( ! inlineParts( e ).length ) {
			return ws( e.words );
		}
		const say = ( x ) => flowOf( x ).map( ( r ) => ( null != r.text ? r.text : r.br || 'br' === r.el.tag ? ' ' : inlineContent( r.el ) ? say( r.el ) : '' ) ).join( '' );
		return ws( say( e ) );
	};
	// The element's text as rendered with its line breaks kept as <br>, and the draft's own placeholders on it ({{ phone }}).
	const textWithBreaks = ( e ) => read.textWithBreaks( e );
	const placeholders = ( e ) => read.placeholders( e );
	const box = ( e ) => e.box?.[ 1440 ] || e.box?.[ 375 ] || null;
	// Whether the elements sit one above the next (each starts at or below the previous one's bottom edge).
	const stacked = ( list ) => list.every( ( e, i ) => {
		const a = i ? box( list[ i - 1 ] ) : null;
		const b = box( e );
		return ! i || ( a && b && b.y >= a.y + a.h - 1 );
	} );
	const isTextLink = ( e ) => 'a' === e.tag && !! words( e ) && ! blockKids( e ).length;
	// Whether an element is drawn as a pill: its declared style (the record's longhands, or a property the template binds to a
	// script value) gives it side padding and a ground (a background that is not transparent, or a border of some width that
	// is drawn). A link drawn so is a button, never a plain text link; any other is a badge, never words inside a sentence.
	const pillStyled = ( e ) => {
		const st = read.declared( e );
		const low = ( k ) => String( st[ k ] ?? '' ).trim().toLowerCase();
		const clear = ( v ) => ! v || /^(none|transparent|initial|inherit|unset)$/.test( v ) || /^rgba\([^)]*,\s*0\s*\)$/.test( v );
		const ground = ! clear( low( 'background-color' ) ) || ( !! low( 'background' ) && ! clear( low( 'background' ) ) );
		const edge = [ 'top', 'right', 'bottom', 'left' ].some( ( side ) => /^(solid|dashed|dotted|double)$/.test( low( `border-${ side }-style` ) ) && ! /^0(px)?$/.test( low( `border-${ side }-width` ) || '0' ) );
		const bound = read.bound( e );
		const padded = [ 'padding-left', 'padding-right' ].some( ( k ) => low( k ) && ! /^0(px)?$/.test( low( k ) ) ) || bound.some( ( p ) => /^padding(?:-left|-right|-inline)?$/.test( p ) );
		const boundGround = bound.some( ( p ) => /^(?:background|border)/.test( p ) );
		return padded && ( ground || edge || boundGround );
	};
	const buttonStyled = ( e ) => 'a' === e.tag && pillStyled( e );
	const isIconLink = ( e ) => 'a' === e.tag && ! words( e ) && kids( e ).some( ( k ) => 'svg' === k.tag );
	// The slot of an element in the draft's own naming: the copy of its tag among its parent's block children.
	const childIndex = ( e ) => blockKids( byKey[ e.parentKey ] || { key: null } ).indexOf( e );
	// The fingerprint Fill's origin map keeps (lib/identity.mjs::fingerprintOf): tag, class, a hash of the style attribute (only a hash, never a value), the ancestor tags, a hash of the element's own words and its template line.
	const fingerprint = ( e ) => fingerprintOf( e, byKey );
	return { read, els, byKey, kids, isPart, inlineParts, flowOf, blockKids, widthKids, widthOnly, shownAt, words, textWithBreaks, placeholders, box, stacked, isTextLink, buttonStyled, isIconLink, childIndex, fingerprint, root: els.find( ( e ) => 0 === e.depth ) || els[ 0 ], tplFinder: ( e ) => ( parseTplKey( e.key ) ? { tpl: e.key } : null ) };
}
