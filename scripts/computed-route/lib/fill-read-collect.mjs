// The in-page half of Fill's draft read (lib/fill-read.mjs::readDraft): collectMany runs inside the draft page through
// page.evaluate, so it holds everything it uses; the walker's collectors arrive as source text.

// In-page. Collects every job's pair snapshot with the walker's collectPair, plus what Fill adds: the exact border box,
// whether it takes part in flow, the element's own words and link, and (a block holding other blocks) its own text
// styles. jobs: [{ id, finder, mark (a number: stamp the element so slot finders scope to it), own, stampOnly (stamp the
// element as the job's node's own and read nothing: lib/region-stand-in.mjs) }].
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
	for ( const j of jobs.filter( ( x ) => ! x.stampOnly ) ) {
		const el = resolve( j.finder );
		if ( el && null !== j.mark ) {
			el.setAttribute( scopeAttr, String( j.mark ) );
		}
		// Text inside another node's element is that node's: the walker's text carrier skips it (`textOthers`), so a group read
		// as one node (a menu whose element also holds a phone link another node draws) never takes that node's look as its own.
		const others = jobs.filter( ( x ) => x.root && x.owner !== j.owner ).map( ( x ) => x.finder );
		// Text in another read element pinned out of flow inside this one (a count badge part positioned on the bag's corner)
		// paints over the box, never in it: where the element's own label is hidden at a width, the pinned count would
		// otherwise be its first text and give the whole element the count's white.
		const pinned = el ? jobs.filter( ( x ) => x !== j && ! x.stampOnly ).filter( ( x ) => {
			const p = resolve( x.finder );
			return !! p && p !== el && el.contains( p ) && [ 'absolute', 'fixed' ].includes( getComputedStyle( p ).position );
		} ).map( ( x ) => x.finder ) : [];
		const snap = collect( [ j.finder, props, resolveSrc, null, null, null, paintSrc, pseudoProps, { textOthers: [ ...others, ...pinned ] } ] );
		if ( ! el || snap.missing ) {
			out[ j.id ] = { missing: true };
			continue;
		}
		const r = el.getBoundingClientRect();
		snap.rect = { x: Math.round( r.x * 1000 ) / 1000, y: Math.round( ( r.y + window.scrollY ) * 1000 ) / 1000, w: Math.round( r.width * 1000 ) / 1000, h: Math.round( r.height * 1000 ) / 1000 };
		snap.position = getComputedStyle( el ).position;
		snap.inFlow = ! [ 'absolute', 'fixed' ].includes( snap.position );
		// What a visitor can see of the element across the page: its opacity with every ancestor's multiplied in, its visibility,
		// the horizontal span every ancestor that clips it leaves (overflow other than visible, paint containment, or a clip-path,
		// whose ancestor's box stands for its shape; null when none clips), and the page width (lib/fill-visible-count.mjs::visibleCount
		// reads it: a stacked card at opacity 0 or a card past a clipping edge is not shown).
		const seenCs = getComputedStyle( el );
		let opacity = Number( seenCs.opacity );
		let span = null;
		for ( let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement ) {
			const s = getComputedStyle( a );
			opacity *= Number( s.opacity );
			if ( 'visible' !== s.overflowX || /\b(?:paint|strict|content)\b/.test( s.contain ) || 'none' !== s.clipPath ) {
				const b = a.getBoundingClientRect();
				span = span ? [ Math.max( span[ 0 ], b.x ), Math.min( span[ 1 ], b.x + b.width ) ] : [ b.x, b.x + b.width ];
			}
		}
		const clip = span ? { x: Math.round( span[ 0 ] * 1000 ) / 1000, w: Math.round( Math.max( 0, span[ 1 ] - span[ 0 ] ) * 1000 ) / 1000 } : null;
		snap.view = { opacity: Math.round( opacity * 1000 ) / 1000, visibility: seenCs.visibility, clip, page: document.documentElement.clientWidth };
		// Where line-height computes to normal, the px height of one line box of the element's font at normal (the value
		// lib/fill-normal-keywords.mjs writes in place of a keyword the setting cannot hold).
		const lineCs = getComputedStyle( el );
		if ( 'normal' === lineCs.lineHeight ) {
			const probe = document.createElement( 'div' );
			probe.style.cssText = 'position:absolute;visibility:hidden;left:-99999px;top:0;margin:0;padding:0;border:0;white-space:nowrap;line-height:normal';
			for ( const p of [ 'font-family', 'font-size', 'font-weight', 'font-style', 'font-stretch', 'font-variant', 'font-feature-settings', 'font-variation-settings', 'font-optical-sizing' ] ) {
				probe.style.setProperty( p, lineCs.getPropertyValue( p ) );
			}
			probe.textContent = 'Hg';
			document.body.appendChild( probe );
			const lh = probe.getBoundingClientRect().height;
			probe.remove();
			lh > 0 && ( snap.normalLineHeight = Math.round( lh * 1000 ) / 1000 );
		}
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
		// A custom element draws its picture in its open shadow root (an image placeholder element), so the <img>s with an
		// address in the open shadow roots of the element and its descendants count too, those showing one address as one
		// image (such an element keeps a second copy of its picture for its own editing chrome).
		const imgSrc = ( i ) => i.getAttribute( 'src' ) ?? i.getAttribute( 'data-src' ) ?? '';
		const shadowImgs = ( n ) => ( n.shadowRoot ? [ ...n.shadowRoot.querySelectorAll( 'img' ), ...[ ...n.shadowRoot.querySelectorAll( '*' ) ].flatMap( shadowImgs ) ] : [] );
		const drawn = [ el, ...el.querySelectorAll( '*' ) ].flatMap( shadowImgs ).filter( ( i ) => '' !== imgSrc( i ) );
		const imgs = el.matches( 'img' ) ? [ el ] : [ ...el.querySelectorAll( 'img' ), ...drawn.filter( ( i, n ) => drawn.findIndex( ( j ) => imgSrc( j ) === imgSrc( i ) ) === n ) ];
		const cap = el.matches( 'figure' ) ? el.querySelector( 'figcaption' ) : null;
		snap.img = 1 === imgs.length ? { tag: el.localName, src: imgSrc( imgs[ 0 ] ), alt: imgs[ 0 ].getAttribute( 'alt' ), caption: cap ? ( cap.textContent || '' ).replace( /\s+/g, ' ' ).trim() : null } : null;
		// The media this element is or holds that shows at this width, in document order (Spec 49 section 11: the kind per
		// width is read from the visible element): { tag, src, poster, alt, natural, markup, own, element } each, where `element`
		// is what lib/media/absorb.mjs::placement reads. A hidden sibling (display:none) is not drawn, so it is not listed. An
		// inline svg counts only when it is this element or the only media it holds (an icon beside a photo is no media here).
		{
			const shown = ( n ) => {
				const r = n.getBoundingClientRect();
				const c = getComputedStyle( n );
				return r.width > 0 && r.height > 0 && 'none' !== c.display && 'hidden' !== c.visibility && ! n.closest( '[hidden]' );
			};
			const rasters = ( el.matches( 'img, video, iframe' ) ? [ el ] : [ ...el.querySelectorAll( 'img, video, iframe' ) ] ).filter( shown );
			// A link's or button's icon inside this element is that control's glyph, never this element's media (the hero's
			// arrow inside its call-to-action is no hero picture); the element's own svg, or one inside the control it is, counts.
			const glyph = ( n ) => {
				const ctl = n.closest( 'a, button, [role="button"]' );
				return !! ctl && ctl !== el && el.contains( ctl );
			};
			const vectors = ( el.matches( 'svg' ) ? [ el ] : [ ...el.querySelectorAll( 'svg' ) ] ).filter( ( n ) => ! n.parentElement?.closest( 'svg' ) && shown( n ) && ! glyph( n ) );
			// A picture a custom element draws in its shadow root (an <image-slot> photo) is a picture as much as a light-DOM
			// <img>: while one shows, an inline svg beside it is no media here.
			const shadowShown = drawn.some( shown );
			const nodes = rasters.length ? rasters : ( ! shadowShown && 1 === vectors.length ? vectors : [] );
			// The image placeholders this element is or holds that draw no picture (a custom element whose open shadow root has an
			// <img> with no address, an <image-slot> the client fills later): { id, placeholder } each, shown ones only.
			snap.emptyPictures = [ el, ...el.querySelectorAll( '*' ) ]
				.filter( ( n ) => n.localName.includes( '-' ) && n.shadowRoot && n.shadowRoot.querySelector( 'img' ) && ! shadowImgs( n ).some( ( i ) => '' !== imgSrc( i ) ) && shown( n ) )
				.map( ( n ) => ( { id: n.id || null, placeholder: n.getAttribute( 'placeholder' ) || null } ) );
			// The outermost absolutely placed wrapper between a picture and this element that covers this element's whole box and
			// holds no words (a parallax wrapper sized past the hero): the picture is laid behind the element's content through it.
			const coverOf = ( n ) => {
				const er = el.getBoundingClientRect();
				let wrap = null;
				for ( let a = n.parentElement; a && a !== el; a = a.parentElement ) {
					const r = a.getBoundingClientRect();
					if ( 'absolute' === getComputedStyle( a ).position && r.width >= er.width - 1 && r.height >= er.height - 1 && '' === ( a.textContent || '' ).trim() ) {
						wrap = a;
					}
				}
				return wrap;
			};
			const readOne = ( n ) => {
				const c = getComputedStyle( n );
				const par = n.parentElement;
				const box = n.getBoundingClientRect();
				const pr = par ? par.getBoundingClientRect() : box;
				const sibs = par ? [ ...par.children ].filter( ( x ) => x !== n && ! x.matches( 'source, track, figcaption' ) && 'none' !== getComputedStyle( x ).display ) : [];
				const later = sibs.some( ( x ) => 4 & n.compareDocumentPosition( x ) );
				const tag = n.localName;
				const attr = ( k ) => n.getAttribute( k );
				const src = 'img' === tag ? ( n.closest( 'picture' ) && n.currentSrc ? n.currentSrc : null ) ?? attr( 'src' ) ?? attr( 'data-src' ) ?? '' : 'video' === tag ? ( attr( 'src' ) ?? n.querySelector( 'source' )?.getAttribute( 'src' ) ?? '' ) : 'iframe' === tag ? attr( 'src' ) ?? '' : '';
								const ni = 'img' === tag ? { w: n.naturalWidth, h: n.naturalHeight } : 'video' === tag ? { w: n.videoWidth, h: n.videoHeight } : null;
				return {
					tag, src, poster: 'video' === tag ? attr( 'poster' ) : null, alt: 'img' === tag ? attr( 'alt' ) : null,
					natural: ni && ni.w > 0 && ni.h > 0 ? ni : null, markup: 'svg' === tag ? new XMLSerializer().serializeToString( n ) : null, own: n === el,
					element: {
						computed: { position: c.position, inset: [ c.top, c.right, c.bottom, c.left ].every( ( v ) => '0px' === v ) },
						fullBox: Math.abs( box.width - pr.width ) <= 1 && Math.abs( box.height - pr.height ) <= 1,
						behindSiblings: later || Number( c.zIndex ) < 0, hasSiblingContent: sibs.length > 0,
						hasText: '' !== ( n.textContent || '' ).trim(), offsets: [ c.top, c.right, c.bottom, c.left ].some( ( v ) => 'auto' !== v ),
					},
				};
			};
			// A picture laid behind this element's content through a covering wrapper reads as that wrapper's placement (the hero's
			// background), not as the static picture inside it.
			const read = ( n ) => {
				const out = readOne( n );
				const cover = n === el ? null : coverOf( n );
				if ( ! cover ) {
					return out;
				}
				const sibs = [ ...cover.parentElement.children ].filter( ( x ) => x !== cover && 'none' !== getComputedStyle( x ).display );
				return { ...out, element: { computed: { position: 'absolute', inset: true }, fullBox: true, behindSiblings: sibs.some( ( x ) => 4 & cover.compareDocumentPosition( x ) ), hasSiblingContent: sibs.length > 0, hasText: false, offsets: true } };
			};
			// A wordless element with no child element that paints one picture as its own background
			// (`<div style="background-image:url(card.jpg)">`, a card's photo drawn with CSS) shows that picture: it is the
			// element's own image, with an empty alt (a background has no accessible name). A gradient, two layers, or an
			// element holding words or elements is no picture of its own.
			const bgUrl = /^url\(\s*(["']?)([^"')]+)\1\s*\)$/.exec( getComputedStyle( el ).backgroundImage || '' )?.[ 2 ] || null;
			const painted = ! nodes.length && ! el.children.length && '' === ( el.textContent || '' ).trim() && shown( el ) ? bgUrl : null;
			const light = painted ? ( ( one ) => [ { ...one, tag: 'img', src: painted, alt: '', element: { ...one.element, ownBackground: true } } ] )( read( el ) ) : nodes.map( read );
			// A custom element draws its picture in its open shadow root: those images, one per address, when no light-DOM media shows.
			const seen = new Set();
			const shadow = light.length ? [] : drawn.filter( ( i ) => shown( i ) && ! seen.has( imgSrc( i ) ) && seen.add( imgSrc( i ) ) ).map( read );
			snap.media = [ ...light, ...shadow ];
		}
		// Every picture the element draws when it draws two or more, in document order (one image placeholder's copies of one
		// address count once), so a list block can give each of its items the picture the draft draws in that item.
		const pictures = [];
		for ( const n of [ el, ...el.querySelectorAll( '*' ) ] ) {
			if ( n.matches( 'img' ) && '' !== imgSrc( n ) ) {
				pictures.push( imgSrc( n ) );
			}
			const own = shadowImgs( n ).map( imgSrc ).filter( Boolean );
			pictures.push( ...own.filter( ( s, k ) => own.indexOf( s ) === k ) );
		}
		snap.pictures = pictures.length > 1 ? pictures : null;
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
		// How many glyphs (inline svgs, light DOM) the element is or holds: none is the draft's evidence that a block's own icon
		// part is absent (lib/fill-resolve.mjs::glyphEvidence).
		snap.glyphs = svgs.length;
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
		// A list item's CSS-drawn marker (lib/fill-list-marker.mjs): its list-style type and image and its ::marker content,
		// with the ::marker's colour and size. Null for an element that is not a list item.
		const ics = getComputedStyle( el );
		if ( /list-item/.test( ics.display ) ) {
			const mk = getComputedStyle( el, '::marker' );
			snap.marker = { type: ics.listStyleType, image: ics.listStyleImage, content: mk.content, color: srgb( mk.color ), fontSize: mk.fontSize };
		} else {
			snap.marker = null;
		}
		// An element with words of its own (a text node directly inside it) paints its own text, whatever its first text is:
		// `<p><b>Lead:</b> the rest</p>` is the paragraph's look, never the bold lead-in's.
		if ( j.own || [ ...el.childNodes ].some( ( c ) => 3 === c.nodeType && '' !== c.textContent.trim() ) ) {
			const cs = getComputedStyle( el );
			for ( const p of props.filter( ( x ) => [ 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-transform', 'color', 'text-shadow' ].includes( x ) ) ) {
				const v = cs.getPropertyValue( p ).trim();
				snap.styles[ p ] = /color$/.test( p ) ? srgb( v ) : v;
			}
			// A decoration paints down, never up: this element shows the one it or an ancestor draws, not the underline of a link
			// somewhere inside it (the collector's first-text carrier). A wrapper around a breadcrumb of underlined links is not underlined.
			if ( props.includes( 'text-decoration-line' ) ) {
				let from = el;
				while ( from && 'none' === getComputedStyle( from ).textDecorationLine ) {
					from = from.parentElement;
				}
				const dc = from ? getComputedStyle( from ) : null;
				snap.styles[ 'text-decoration-line' ] = dc ? dc.textDecorationLine : 'none';
				snap.styles[ 'text-decoration-color' ] = dc ? srgb( dc.textDecorationColor ) : 'none';
				snap.styles[ 'text-decoration-thickness' ] = dc ? dc.textDecorationThickness : 'none';
				snap.styles[ 'text-underline-offset' ] = dc ? dc.textUnderlineOffset : 'none';
			}
		}
		// collectPair reads a text colour off the paint carrying most of its text (parity/lib/paint.mjs::textCarrier); an element with no text (an icon-only link)
		// keeps its own, which a glyph drawn in currentColor paints and lib/fill-state.mjs::holdDefaults holds with its ground.
		if ( props.includes( 'color' ) && ! snap.styles.color ) {
			snap.styles.color = srgb( getComputedStyle( el ).color );
		}
		out[ j.id ] = snap;
	}
	// Each read element's layout box (`layoutRect`, page coordinates): its border box with every transform switched off, as
	// layout places it. Siblings are laid out (and their gap measured, lib/fill-resolve-state.mjs::planSpacing) between these
	// boxes, whatever a rotation or a scroll entrance paints over them. Transitions are held off while the transforms switch,
	// so nothing animates back afterwards.
	const sheet = ( css ) => {
		const tag = document.createElement( 'style' );
		tag.textContent = css;
		document.head.appendChild( tag );
		document.documentElement.getBoundingClientRect();
		return tag;
	};
	const calm = sheet( '*, *::before, *::after { transition: none !important; }' );
	const flat = sheet( '*, *::before, *::after { transform: none !important; rotate: none !important; scale: none !important; translate: none !important; }' );
	for ( const j of jobs ) {
		const el = out[ j.id ] && ! out[ j.id ].missing ? resolve( j.finder ) : null;
		if ( el ) {
			const r = el.getBoundingClientRect();
			out[ j.id ].layoutRect = { x: Math.round( r.x * 1000 ) / 1000, y: Math.round( ( r.y + window.scrollY ) * 1000 ) / 1000, w: Math.round( r.width * 1000 ) / 1000, h: Math.round( r.height * 1000 ) / 1000 };
		}
	}
	flat.remove();
	document.documentElement.getBoundingClientRect();
	calm.remove();
	return out;
}
