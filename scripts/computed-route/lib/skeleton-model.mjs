// The skeleton writer's reading of an inventory (lib/skeleton-inventory.mjs): the element tree, which elements are parts of
// another (a glyph and everything in it, an element never shown), the words and links an element carries, whether a run of
// siblings is stacked. Pure functions over the inventory JSON, so they run offline.
import { parseTplKey } from './fill-skeleton.mjs';

const ws = ( s ) => String( s ?? '' ).replace( /\s+/g, ' ' ).trim();

export function inventoryModel( inventory ) {
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
	// Part of its parent rather than a block: an svg and everything in it, or an element never shown at any width (a br).
	const isPart = ( e ) => 'svg' === e.tag || inSvg( e ) || ! shownAnywhere( e );
	const blockKids = ( e ) => kids( e ).filter( ( c ) => ! isPart( c ) );
	const words = ( e ) => ws( e.words );
	// The element's own text with its never-shown br children kept as <br>, read from the annotated source.
	const textWithBreaks = ( e ) => ws( ( e.snippet || '' ).replace( /^<[^>]*>/, '' ).replace( /<\/[a-z]+>\s*$/i, '' ).replace( /<br[^>]*>/gi, '<br>' ).replace( /<(?!br>)[^>]+>/g, '' ) );
	// The draft's own placeholders in the element's opening tag and own text ({{ phone }}), not those of its children.
	const placeholders = ( e ) => {
		const first = /^<[^>]*>/.exec( e.snippet || '' )?.[ 0 ] || '';
		const own = ( e.snippet || '' ).slice( first.length ).replace( /<[^>]*data-dc-tpl[^>]*>[\s\S]*$/, '' );
		return [ ...( first + own ).matchAll( /\{\{\s*[^}]+?\s*\}\}/g ) ].map( ( m ) => m[ 0 ].replace( /\s+/g, ' ' ) );
	};
	const box = ( e ) => e.box?.[ 1440 ] || e.box?.[ 375 ] || null;
	// Whether the elements sit one above the next (each starts at or below the previous one's bottom edge).
	const stacked = ( list ) => list.every( ( e, i ) => {
		const a = i ? box( list[ i - 1 ] ) : null;
		const b = box( e );
		return ! i || ( a && b && b.y >= a.y + a.h - 1 );
	} );
	const isTextLink = ( e ) => 'a' === e.tag && !! words( e ) && ! blockKids( e ).length;
	const isIconLink = ( e ) => 'a' === e.tag && ! words( e ) && kids( e ).some( ( k ) => 'svg' === k.tag );
	// The slot of an element in the draft's own naming: the copy of its tag among its parent's block children.
	const childIndex = ( e ) => blockKids( byKey[ e.parentKey ] || { key: null } ).indexOf( e );
	// The fingerprint Fill's origin map keeps: tag, class and a short hash of the style attribute (only a hash, never a value).
	const fingerprint = ( e ) => {
		let h = 5381;
		for ( const ch of String( e.attrs?.style || '' ) ) {
			h = ( ( h * 33 ) ^ ch.charCodeAt( 0 ) ) >>> 0;
		}
		return { tag: e.tag, cls: e.attrs?.class || '', styleHash: h.toString( 16 ) };
	};
	return { els, byKey, kids, isPart, blockKids, words, textWithBreaks, placeholders, box, stacked, isTextLink, isIconLink, childIndex, fingerprint, root: els.find( ( e ) => 0 === e.depth ) || els[ 0 ], tplFinder: ( e ) => ( parseTplKey( e.key ) ? { tpl: e.key } : null ) };
}
