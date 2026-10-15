/**
 * A product card's thumbnail strip, rebuilt when a variation swaps the image set (A4), keeping the server's motion
 * stamp (Spec 38A §6.5).
 *
 * The strip is server-rendered for first paint (no-JS-safe); a variation change rebuilds the buttons and images with
 * createElement/setAttribute (never innerHTML), so the manifest-sourced url and alt cannot inject markup. Clicks are
 * handled by a delegated listener on the card (`view.js::initPillBridge`), so rebuilt buttons need no `data-wp-on`
 * directive (the Interactivity API does not bind directives on imperatively-added nodes).
 *
 * The motion renderer stamps each server thumbnail with its part class (`sgs-buybox__gallery-thumb`), its hover and
 * effect data attributes (`data-sgs-mh`, `data-sgs-mc`, `data-sgs-fx`, …) and any injected paint-layer spans
 * (`span.sgs-motion-layer`). The stamp is read off the first thumbnail before the strip is cleared and remembered per
 * strip, so a later rebuild still has it after a variation with no images emptied the strip. Rebuilt thumbnails carry no
 * entrance attributes: the entrance has already played, and a thumbnail stamped with a scroll entrance the reveal module
 * never saw would stay at its hidden start state, so they show their final state instead. A strip the server rendered
 * with no thumbnails has no stamp to keep; its rebuilt thumbnails carry the bare thumbnail class.
 *
 * @package SGS\Blocks
 */

/** Entrance attributes a rebuilt thumbnail never carries. */
const ENTRANCE = [ 'data-sgs-me', 'data-sgs-me-keyframes', 'data-sgs-me-kf', 'data-sgs-in' ];

const BARE = { className: 'product-card__thumb', attrs: [], layers: [] };

/** Strip => the stamp last read from it. */
const stamps = new WeakMap();

/**
 * The class list, motion attributes and injected layer spans of the strip's first thumbnail (or the stamp remembered
 * from an earlier read of this strip).
 *
 * @param {Element} strip The `.product-card__thumbs` strip.
 * @return {{className:string,attrs:Array<[string,string]>,layers:Element[]}} The stamp.
 */
export function readThumbStamp( strip ) {
	const first = strip.querySelector( '.product-card__thumb' );
	if ( ! first ) {
		return stamps.get( strip ) || BARE;
	}
	const stamp = {
		className: first.className || BARE.className,
		attrs: [ ...first.attributes ]
			.filter( ( attr ) => attr.name.startsWith( 'data-sgs-' ) && ! ENTRANCE.includes( attr.name ) )
			.map( ( attr ) => [ attr.name, attr.value ] ),
		layers: [ ...first.children ]
			.filter( ( child ) => child.matches( 'span.sgs-motion-layer' ) )
			.map( ( span ) => span.cloneNode( false ) ),
	};
	stamps.set( strip, stamp );
	return stamp;
}

/**
 * Write a stamp onto a rebuilt thumbnail: its classes and attributes, and a copy of each layer span appended last.
 *
 * @param {Element} btn   The rebuilt thumbnail button.
 * @param {Object}  stamp The stamp from `readThumbStamp()`.
 */
export function applyThumbStamp( btn, stamp ) {
	btn.className = stamp.className;
	stamp.attrs.forEach( ( [ name, value ] ) => btn.setAttribute( name, value ) );
	stamp.layers.forEach( ( span ) => btn.appendChild( span.cloneNode( false ) ) );
}

/**
 * Rebuild the thumbnail strip of a card from a gallery array.
 *
 * @param {Element} card        The card root (.product-card--live).
 * @param {Array}   gallery     Ordered [{ url, w, h, alt }] items.
 * @param {number}  selectedIdx Index to mark aria-current.
 */
export function renderThumbStrip( card, gallery, selectedIdx ) {
	const strip = card.querySelector( '.product-card__thumbs' );
	if ( ! strip ) {
		return;
	}
	const stamp = readThumbStamp( strip );
	while ( strip.firstChild ) {
		strip.removeChild( strip.firstChild );
	}
	const items = Array.isArray( gallery ) ? gallery : [];
	items.forEach( ( item, i ) => {
		if ( ! item || ! item.url ) {
			return;
		}
		const btn = card.ownerDocument.createElement( 'button' );
		btn.type = 'button';
		btn.setAttribute( 'role', 'listitem' );
		btn.dataset.index = String( i );
		btn.setAttribute( 'aria-current', i === selectedIdx ? 'true' : 'false' );
		btn.setAttribute( 'aria-label', 'Image ' + ( i + 1 ) );
		const img = card.ownerDocument.createElement( 'img' );
		img.src = item.url;
		img.alt = item.alt || '';
		if ( item.w ) {
			img.width = item.w;
		}
		if ( item.h ) {
			img.height = item.h;
		}
		img.loading = 'lazy';
		img.decoding = 'async';
		btn.appendChild( img );
		applyThumbStamp( btn, stamp );
		strip.appendChild( btn );
	} );
}
