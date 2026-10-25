// The in-page half of Fill's draft read (lib/fill-read.mjs::readDraft): collectMany runs inside the draft page through
// page.evaluate, so it holds everything it uses; the walker's collectors arrive as source text.

// In-page. Collects every job's pair snapshot with the walker's collectPair, plus what Fill adds: the exact border box,
// whether it takes part in flow, the element's own words and link, and (a block holding other blocks) its own text
// styles. jobs: [{ id, finder, mark (a number: stamp the element so slot finders scope to it), own }].
export function collectMany( [ jobs, collectSrc, resolveSrc, paintSrc, props, pseudoProps, scopeAttr ] ) {
	// eslint-disable-next-line no-new-func
	const collect = new Function( `return (${ collectSrc });` )();
	// eslint-disable-next-line no-new-func
	const resolve = new Function( `return (${ resolveSrc });` )();
	const ctx = document.createElement( 'canvas' ).getContext( '2d' );
	const srgb = ( v ) => {
		if ( ! /^(oklab|oklch|lab|lch|color)\(/.test( v ) ) {
			return v;
		}
		ctx.fillStyle = '#000';
		ctx.fillStyle = v;
		const f = ctx.fillStyle;
		if ( ! f.startsWith( '#' ) ) {
			return f;
		}
		const n = parseInt( f.slice( 1 ), 16 );
		return `rgb(${ ( n >> 16 ) & 255 }, ${ ( n >> 8 ) & 255 }, ${ n & 255 })`;
	};
	const out = {};
	// Every target's element is stamped with its node first, so a layout read never descends into an element another node owns
	// (parity/lib/paint.mjs::layoutElement).
	for ( const j of jobs ) {
		resolve( j.finder )?.setAttribute( 'data-fill-owner', String( j.owner ) );
	}
	for ( const j of jobs ) {
		const el = resolve( j.finder );
		if ( el && null !== j.mark ) {
			el.setAttribute( scopeAttr, String( j.mark ) );
		}
		const snap = collect( [ j.finder, props, resolveSrc, null, null, null, paintSrc, pseudoProps ] );
		if ( ! el || snap.missing ) {
			out[ j.id ] = { missing: true };
			continue;
		}
		const r = el.getBoundingClientRect();
		snap.rect = { x: Math.round( r.x * 1000 ) / 1000, y: Math.round( ( r.y + window.scrollY ) * 1000 ) / 1000, w: Math.round( r.width * 1000 ) / 1000, h: Math.round( r.height * 1000 ) / 1000 };
		snap.position = getComputedStyle( el ).position;
		snap.inFlow = ! [ 'absolute', 'fixed' ].includes( snap.position );
		snap.words = ( el.textContent || '' ).replace( /\s+/g, ' ' ).trim();
		const anchors = el.matches( 'a[href]' ) ? [ el ] : [ ...el.querySelectorAll( 'a[href]' ) ];
		const sole = 1 === anchors.length && ( el === anchors[ 0 ] || anchors[ 0 ].textContent.replace( /\s+/g, ' ' ).trim() === snap.words );
		snap.href = sole ? anchors[ 0 ].getAttribute( 'href' ) : null;
		const anchor = sole ? anchors[ 0 ] : null;
		snap.target = anchor?.getAttribute( 'target' ) || null;
		snap.rel = anchor?.getAttribute( 'rel' ) || null;
		snap.id = el.getAttribute( 'id' ) || null;
		snap.ariaLabel = el.getAttribute( 'aria-label' ) || anchor?.getAttribute( 'aria-label' ) || null;
		// A picture's own name: the aria-label of an element that is a picture: a role="img" element (WAI-ARIA img role), a
		// roleless <img>, <svg> or <picture>, or a roleless, textless element with no link inside whose one element child is
		// such a picture (a custom-element logo before its script gives it a role). Never an element hidden from assistive
		// technology (aria-hidden="true" on it or an ancestor), one with a click handler or a tab stop, or a link, control,
		// list, section, landmark, form or media element.
		const ownLabel = el.getAttribute( 'aria-label' ) || null;
		const role = el.getAttribute( 'role' );
		const kids = [ ...el.children ];
		const pictureTag = ( n ) => [ 'img', 'svg', 'picture' ].includes( n.localName );
		const container = el.matches( 'a, button, input, select, textarea, label, ul, ol, li, dl, menu, section, article, nav, aside, header, footer, main, form, fieldset, table, video, audio, iframe, canvas, object, embed, dialog, details, summary' );
		const holder = ! role && ! container && ! snap.words && ! anchors.length && 1 === kids.length && pictureTag( kids[ 0 ] );
		const picture = 'img' === role || ( ! role && pictureTag( el ) ) || holder;
		const silent = !! el.closest( '[aria-hidden="true"]' ) || el.matches( '[onclick], [tabindex]' );
		snap.imageName = ownLabel && picture && ! silent ? ownLabel : null;
		// A form control, a checkbox button or a group of choice chips: what the field blocks hold as settings (lib/fill-form.mjs).
		snap.form = ( () => {
			const text = ( n ) => ( n.textContent || '' ).replace( /\s+/g, ' ' ).trim();
			const control = el.matches( 'input, select, textarea' );
			const toggle = el.matches( 'button[role="checkbox"], [role="checkbox"]' );
			const pressed = [ ...el.querySelectorAll( 'button[aria-pressed], [role="radio"], [role="option"]' ) ];
			if ( ! control && ! toggle && pressed.length < 2 && ! el.matches( 'button' ) ) {
				return null;
			}
			const f = { tag: el.localName, type: el.getAttribute( 'type' ), role: el.getAttribute( 'role' ), id: el.getAttribute( 'id' ), name: el.getAttribute( 'name' ) };
			for ( const a of [ 'autocomplete', 'inputmode', 'maxlength', 'placeholder', 'accept', 'rows', 'min', 'max', 'step' ] ) {
				f[ a ] = el.getAttribute( a );
			}
			f.required = el.hasAttribute( 'required' ) || 'true' === el.getAttribute( 'aria-required' );
			if ( control && 'select' !== el.localName ) {
				f.value = el.value;
				f.checked = !! el.checked;
			} else if ( toggle ) {
				f.checked = 'true' === el.getAttribute( 'aria-checked' );
			}
			if ( 'select' === el.localName ) {
				f.options = [ ...el.options ].map( ( o ) => ( { value: o.value, label: text( o ), selected: o.selected && o.defaultSelected } ) );
				f.value = el.value;
			}
			if ( pressed.length >= 2 ) {
				f.chips = pressed.map( ( c ) => {
					const leaves = [ ...c.querySelectorAll( '*' ) ].filter( ( x ) => ! x.children.length && text( x ) );
					const label = leaves.length ? text( leaves[ 0 ] ) : text( c );
					return { label, description: leaves.length > 1 ? text( leaves[ 1 ] ) : '', on: 'true' === c.getAttribute( 'aria-pressed' ) || 'true' === c.getAttribute( 'aria-checked' ) };
				} );
			}
			// The label that names the control: inside its box (floating) or outside it (static); and a live "n / max" counter beside it.
			if ( control ) {
				const lab = ( el.labels && el.labels[ 0 ] ) || ( f.id ? document.querySelector( `label[for="${ CSS.escape( f.id ) }"]` ) : null );
				const box = el.getBoundingClientRect();
				const lr = lab ? lab.getBoundingClientRect() : null;
				f.labelInside = lr ? lr.top >= box.top - 1 && lr.bottom <= box.bottom + 1 && lr.height > 0 : null;
				const holder = el.parentElement && el.parentElement.querySelectorAll( 'input, select, textarea' ).length < 2 ? el.parentElement : null;
				const m = holder ? /(?:^|[^\d.])\d+\s*\/\s*(\d+)(?!\d)/.exec( text( holder ) ) : null;
				f.counterMax = m ? Number( m[ 1 ] ) : null;
			}
			return f;
		} )();
		// The one image this element is (an <img>, or a <figure> / <picture> holding exactly one) and its figcaption's words.
		const imgs = el.matches( 'img' ) ? [ el ] : [ ...el.querySelectorAll( 'img' ) ];
		const cap = el.matches( 'figure' ) ? el.querySelector( 'figcaption' ) : null;
		snap.img = 1 === imgs.length ? { tag: el.localName, src: imgs[ 0 ].getAttribute( 'src' ) ?? imgs[ 0 ].getAttribute( 'data-src' ) ?? '', alt: imgs[ 0 ].getAttribute( 'alt' ), caption: cap ? ( cap.textContent || '' ).replace( /\s+/g, ' ' ).trim() : null } : null;
		// The one embedded frame this element is or holds (a map): its address, the filter it paints and its height.
		const frames = el.matches( 'iframe' ) ? [ el ] : [ ...el.querySelectorAll( 'iframe' ) ];
		snap.embed = 1 === frames.length ? { src: frames[ 0 ].getAttribute( 'src' ) ?? '', filter: getComputedStyle( frames[ 0 ] ).filter, h: frames[ 0 ].getBoundingClientRect().height } : null;
		// The first scroller in this element (or inside it) that sets its own scrollbar colour: the colours it paints, the width
		// it asks, the parts the draft declares beside them and the ground it sits on, for the theme's scrollbar tokens.
		const scroller = [ el, ...[ ...el.querySelectorAll( '*' ) ].slice( 0, 400 ) ].find( ( n ) => 'auto' !== getComputedStyle( n ).scrollbarColor );
		snap.scrollbar = null;
		if ( scroller ) {
			const sc = getComputedStyle( scroller );
			let ground = 'rgba(0, 0, 0, 0)';
			for ( let a = scroller; a && 'rgba(0, 0, 0, 0)' === ground; a = a.parentElement ) {
				ground = getComputedStyle( a ).backgroundColor;
			}
			const part = ( name ) => {
				try {
					return getComputedStyle( scroller, `::-webkit-scrollbar-${ name }` ).backgroundColor || null;
				} catch {
					return null;
				}
			};
			snap.scrollbar = { color: sc.scrollbarColor, width: sc.scrollbarWidth, ground, thumbPart: part( 'thumb' ), trackPart: part( 'track' ) };
		}
		// The one inline SVG this element is or holds, as XML with the paint the draft's CSS gave each drawing element written onto it
		// (fill, stroke and stroke width, a colour equal to the SVG's own colour as currentColor), for the icon writer.
		const svgs = el.matches( 'svg' ) ? [ el ] : [ ...el.querySelectorAll( 'svg' ) ];
		snap.svg = null;
		if ( 1 === svgs.length ) {
			const [ from ] = svgs;
			const copy = from.cloneNode( true );
			const own = getComputedStyle( from ).color;
			const pairs = [ [ from, copy ], ...[ ...from.querySelectorAll( '*' ) ].map( ( o, i ) => [ o, copy.querySelectorAll( '*' )[ i ] ] ) ];
			const drawn = /^(?:path|circle|ellipse|rect|line|polyline|polygon)$/;
			for ( const [ o, c ] of pairs ) {
				if ( drawn.test( o.localName ) ) {
					const cs = getComputedStyle( o );
					for ( const p of [ 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'fill-rule', 'opacity' ] ) {
						const v = cs.getPropertyValue( p ).trim();
						const plain = { 'stroke-linecap': 'butt', 'stroke-linejoin': 'miter', 'stroke-dasharray': 'none', 'fill-rule': 'nonzero', opacity: '1' }[ p ];
						if ( v && v !== plain ) {
							c.setAttribute( p, v === own ? 'currentColor' : v );
						}
					}
				}
			}
			if ( ! copy.getAttribute( 'viewBox' ) ) {
				const b = from.getBoundingClientRect();
				copy.setAttribute( 'viewBox', `0 0 ${ Math.round( b.width ) } ${ Math.round( b.height ) }` );
			}
			// Which side of the words the icon is drawn on, from where it and each piece of text paint along the row (or the
			// column, when the words sit beneath it): 'before' when it is drawn ahead of all of them, 'after' behind all of
			// them, null when there are no words or it sits among them.
			const ic = from.getBoundingClientRect();
			const words = [];
			const walk = document.createTreeWalker( el, NodeFilter.SHOW_TEXT );
			while ( walk.nextNode() ) {
				const t = walk.currentNode;
				if ( t.textContent.trim() && ! from.contains( t ) && ! /^(?:SCRIPT|STYLE)$/.test( t.parentElement?.tagName ?? '' ) ) {
					const range = document.createRange();
					range.selectNodeContents( t );
					const r = range.getBoundingClientRect();
					r.width && r.height && words.push( r );
				}
			}
			const ahead = words.map( ( r ) => {
				const dx = r.left + r.width / 2 - ( ic.left + ic.width / 2 );
				const dy = r.top + r.height / 2 - ( ic.top + ic.height / 2 );
				return Math.abs( dx ) >= Math.abs( dy ) ? dx > 0 : dy > 0;
			} );
			const position = ! ahead.length ? null : ahead.every( Boolean ) ? 'before' : ahead.some( Boolean ) ? null : 'after';
			snap.svg = { markup: new XMLSerializer().serializeToString( copy ), position };
		}
		// The intrinsic ratio of the image or SVG this element is, or of the one it wraps: an image's natural size, else its
		// width and height attributes, else an SVG's viewBox. A wrapper is media only when that image is its only rendered
		// content (no words, no other element) and fills its box; a button or card holding one icon is not media. null when
		// there is no such element or none states a ratio.
		const only = el.matches( 'img, svg' ) ? null : ( 1 === el.querySelectorAll( 'img, svg' ).length ? el.querySelector( 'img, svg' ) : null );
		const fills = ( m ) => {
			const [ a, b ] = [ el.getBoundingClientRect(), m.getBoundingClientRect() ];
			return Math.abs( a.width - b.width ) <= 1 && Math.abs( a.height - b.height ) <= 1;
		};
		const wraps = only && ! el.textContent.trim() && [ ...el.querySelectorAll( '*' ) ].every( ( d ) => d === only || d.contains( only ) || only.contains( d ) ) && fills( only );
		const media = el.matches( 'img, svg' ) ? el : ( wraps ? only : null );
		let ratio = null;
		if ( media && 'svg' === media.localName ) {
			const vb = media.viewBox?.baseVal;
			ratio = vb && vb.width > 0 && vb.height > 0 ? vb.width / vb.height : null;
		} else if ( media ) {
			const attrs = [ 'width', 'height' ].map( ( a ) => parseFloat( media.getAttribute( a ) ) );
			ratio = media.naturalWidth > 0 && media.naturalHeight > 0 ? media.naturalWidth / media.naturalHeight : ( attrs.every( ( n ) => n > 0 ) ? attrs[ 0 ] / attrs[ 1 ] : null );
		}
		snap.intrinsic = ratio ? { tag: media.localName, ratio } : null;
		// The size a wrapper takes from its one child: an svg or img the draft sizes with width and height attributes, that is the
		// wrapper's only content and fills its box (a caret span holding an 11px svg). The wrapper declares no size of its own.
		const kid = 1 === el.children.length && ! el.matches( 'img, svg' ) && /^(svg|img)$/.test( el.children[ 0 ].localName ) ? el.children[ 0 ] : null;
		const attrPx = ( a ) => ( /^\d+(\.\d+)?(px)?$/.test( String( kid?.getAttribute( a ) ?? '' ).trim() ) ? parseFloat( kid.getAttribute( a ) ) : null );
		const [ kw, kh ] = [ attrPx( 'width' ), attrPx( 'height' ) ];
		const kr = kid ? kid.getBoundingClientRect() : null;
		snap.childSize = kid && null !== kw && null !== kh && Math.abs( kr.width - r.width ) <= 1 && Math.abs( kr.height - r.height ) <= 1 ? { width: `${ kw }px`, height: `${ kh }px`, tag: kid.localName } : null;
		snap.role = el.getAttribute( 'role' );
		snap.className = String( el.getAttribute( 'class' ) || '' );
		if ( j.own ) {
			const cs = getComputedStyle( el );
			for ( const p of props.filter( ( x ) => [ 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-transform', 'color', 'text-shadow' ].includes( x ) ) ) {
				const v = cs.getPropertyValue( p ).trim();
				snap.styles[ p ] = /color$/.test( p ) ? srgb( v ) : v;
			}
		}
		// collectPair reads a text colour off the element painting the first text; an element with no text (an icon-only link)
		// keeps its own, which a glyph drawn in currentColor paints and lib/fill-state.mjs::holdDefaults holds with its ground.
		if ( props.includes( 'color' ) && ! snap.styles.color ) {
			snap.styles.color = srgb( getComputedStyle( el ).color );
		}
		out[ j.id ] = snap;
	}
	return out;
}
