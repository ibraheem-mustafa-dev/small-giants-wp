// Skeleton writer step 2a, the standing rules (Spec 48 FR-48-6, the rules from Bean's review of 2026-10-13): framework-wide
// verdicts that settle an element before any scoring, so a row settled here is settled the same way for every client.
// Each rule has an id, its patterns and its reason in data/skeleton-decisions.json `rules`; this file holds only the
// mechanisms. A verdict is { rule, reason, ... } with one of:
//   action 'remove'  the element and everything in it go (a decoration layer, a typed divider, a site setting);
//   action 'unwrap'  the element goes and its children take its place (a width wrapper, the link around a logo);
//   block            the element becomes that block; `absorb` true when the block draws the element's children itself.
// Precedence (lib/skeleton-classify.mjs::makeClassifier): a client decision, then these rules, then a finaliser pick or a
// standing element decision, then the database scoring.
import { specHit } from './skeleton-facts.mjs';

// The element's declared inline style as { property: value } (lower-case property names; values as written, which may
// hold a draft binding such as {{ R.px }}).
export function declared( e ) {
	const out = {};
	for ( const part of String( e.attrs?.style || '' ).split( ';' ) ) {
		const at = part.indexOf( ':' );
		if ( at > 0 ) {
			out[ part.slice( 0, at ).trim().toLowerCase() ] = part.slice( at + 1 ).trim();
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
// One or more emoji (each optionally followed by a variation selector or a zero-width joiner), spaces removed first.
const EMOJI = /^(?:\p{Extended_Pictographic}[\u{FE0F}\u{200D}]?)+$/u;
const HEADING = /^h[1-6]$/;

// o: { m (lib/skeleton-model.mjs), facts (lib/skeleton-facts.mjs), surface: { slug, kind, name }, hooks: { siteInfoKinds,
// isColumnLabel, topBlock, blockOfKey } (the classifier's own readings: an element's Site Info kinds, whether it heads a
// column of links, the block its plain scoring proposes, the block already proposed for an ancestor's key), motion (a Set
// of template keys, `<component>/<tpl>`, whose own animation loops a translate for ever: lib/skeleton-rerun.mjs::loopingKeys) }.
export function makeRules( { m, facts, surface = {}, hooks, motion = new Set() } ) {
	const R = facts.decisions.rules || {};
	const arrayBlocks = new Set( facts.q( 'SELECT DISTINCT block_slug FROM array_item_schema' ).map( ( r ) => r.block_slug ) );
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
	const all = ( e ) => {
		const kids = m.blockKids( e );
		const text = kids.length ? [ m.words( e ), ...kids.map( all ) ].filter( Boolean ).join( ' ' ) : String( e.allText ?? m.words( e ) );
		return text.replace( /\s+/g, ' ' ).trim();
	};
	const hasSvg = ( e ) => m.kids( e ).some( ( k ) => 'svg' === k.tag );
	const bare = ( e ) => ! m.words( e ) && ! m.blockKids( e ).length;
	const iconOnly = ( e ) => bare( e ) && hasSvg( e );
	const emojiOnly = ( e ) => ! m.blockKids( e ).length && EMOJI.test( m.words( e ).replace( /\s+/g, '' ) );
	const desc = ( e ) => m.blockKids( e ).flatMap( ( k ) => [ k, ...desc( k ) ] );
	const handlerOf = ( e ) => /sc-camel-on-click="\{\{\s*([^}\s]+)\s*\}\}"/.exec( e.snippet || '' )?.[ 1 ] || '';
	// A control the visitor operates: a button, anything with a click handler, a pressed or expanded state. It is never
	// static text (a label, a heading, a card title).
	const interactive = ( e ) => 'button' === e.tag || !! handlerOf( e ) || null != e.attrs?.[ 'aria-pressed' ] || null != e.attrs?.[ 'aria-expanded' ];
	// A disclosure or slider control (it opens, closes or steps something): never a pill button.
	const disclosure = ( e ) => null != e.attrs?.[ 'aria-expanded' ] || null != e.attrs?.[ 'aria-pressed' ] || /toggle|prev|next|open|close|expand|collapse/i.test( handlerOf( e ) );
	// Words that are only a number (a count, an index "01"): never a label or a title.
	const numberOnly = ( e ) => /^\d+$/.test( m.words( e ).trim() );
	const textLeaves = ( e ) => desc( e ).filter( ( k ) => m.words( k ) && ! m.blockKids( k ).length );
	const logoish = ( k ) => k.tag.endsWith( '-logo' ) || facts.logoBlocks.includes( hooks.topBlock( k ) );
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
	// The first piece of text in a whole-card link titles it.
	const titlesCard = ( e ) => {
		const card = cardOf( e );
		return !! card && desc( card ).find( ( k ) => m.words( k ) && ! m.blockKids( k ).length ) === e;
	};
	// The call to action that ends a card link: its last piece of text, short, after the title, either with a glyph beside
	// it or below at least two other pieces of text. Returns that element, or null.
	const cardAction = ( card ) => {
		const texts = textLeaves( card );
		const last = texts.at( -1 );
		if ( ! last || texts.length < 2 || m.words( last ).split( ' ' ).length > ( R.cardAction?.maxWords ?? 4 ) || numberOnly( last ) ) {
			return null;
		}
		const holder = m.byKey[ last.parentKey ];
		const glyph = [ ...m.kids( last ), ...( holder && holder !== card ? m.kids( holder ) : [] ) ].some( ( k ) => 'svg' === k.tag || iconOnly( k ) || bindingGlyph( k ) );
		return glyph || texts.length >= 3 ? last : null;
	};
	// The card link an element is the call to action of, or null.
	const actionOf = ( e ) => {
		for ( let p = m.byKey[ e.parentKey ], i = 0; p && i < 3; p = m.byKey[ p.parentKey ], i++ ) {
			if ( 'a' === p.tag ) {
				return cardAction( p ) === e ? p : null;
			}
		}
		return null;
	};
	const realHref = ( e ) => ( e.attrs?.href && '#' !== e.attrs.href && ! /\{\{/.test( e.attrs.href ) ? e.attrs.href : null );

	// The link source a Site Info kind becomes on a link (tel: is phone, a maps host is directions), or null.
	const linkKindOf = ( e ) => {
		const kinds = [ ...hooks.siteInfoKinds( e ) ].map( ( [ k ] ) => k );
		const map = R.linkSourceForKind?.map || {};
		const k = kinds.find( ( x ) => map[ x ] );
		return k ? { kind: k, source: map[ k ] } : null;
	};
	// Whether the element's words are the Site Info value itself (a typed phone number or email address), so the label
	// reads Site Info too.
	const wordsAreValue = ( e, kind ) => {
		const VALUE = { phone: /^[+\d][\d\s()-]{6,20}$/, email: /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i };
		return !! VALUE[ kind ]?.test( all( e ) );
	};
	// A verdict of a rule, or null when the decisions data has no entry for it (each rule is switched on by its entry).
	const v = ( rule, extra ) => ( R[ rule ] ? { rule, reason: R[ rule ].reason || rule, ...extra } : null );
	const linkAttrs = ( e, lk ) => {
		if ( lk ) {
			return { sgsBlockLinkSource: lk.source };
		}
		return realHref( e ) ? { sgsBlockLink: realHref( e ) } : {};
	};
	const DECORATION_TAGS = new Set( [ 'img', 'iframe', 'video', 'input', 'textarea', 'select', 'hr' ] );

	// The rules in precedence order; the first verdict wins. Each takes x: { e, st (declared style), text (all its
	// words), kidsB (block children), parentBlock }.
	const RULES = [
		// A bar above the header (by surface kind and name) is the header's top row.
		( { e } ) => {
			const hit = 0 === e.depth && ( R.surfaceRoot?.entries || [] ).find( ( x ) => x.kind === surface.kind && new RegExp( x.namePattern, 'i' ).test( surface.name || '' ) );
			return hit ? v( 'surfaceRoot', { block: hit.block, reason: hit.reason } ) : null;
		},
		// A full-width bar a few pixels tall, fixed to the viewport, drawing only a fill: the Floating UI reading progress
		// setting.
		( { e, st } ) => ( bare( e ) && ! hasSvg( e ) && 'fixed' === st.position && ( px( st.height ) ?? 99 ) <= ( R.readingProgress?.maxHeightPx ?? 6 ) && /^100(?:%|vw)$/.test( st.width || '' ) ? v( 'readingProgress', { action: 'remove', handover: { owner: 'site-setting', kind: 'floating-ui', detail: R.readingProgress?.handover || 'reading progress bar' } } ) : null ),
		// A layer that holds nothing: a ring is a decorative image; a fill, gradient or glow folds into the background of
		// the block it sits in.
		( { e, st } ) => {
			if ( ! bare( e ) || hasSvg( e ) || DECORATION_TAGS.has( e.tag ) || ! ( 'true' === e.attrs?.[ 'aria-hidden' ] || [ 'absolute', 'fixed' ].includes( st.position ) ) ) {
				return null;
			}
			const ring = /\d/.test( st.border || st[ 'border-width' ] || '' ) && ! /^(?:0|none)/.test( st.border || '' );
			return ring ? v( 'decorativeShape', { block: R.decorativeShape?.block || null } ) : v( 'decorationLayer', { action: 'remove' } );
		},
		( { e, kidsB } ) => ( ! kidsB.length && specHit( R.typedDivider, m.words( e ) ) ? v( 'typedDivider', { action: 'remove' } ) : null ),
		// A custom element named as a logo (<brand-logo>) is the logo block, which reads the site logo.
		( { e } ) => ( e.tag.includes( '-' ) && specHit( facts.decisions.logoImage, e.tag ) && facts.logoBlocks.length ? v( 'logoElement', { block: facts.logoBlocks[ 0 ], absorb: true, handover: { owner: 'site-info', kind: 'presence', detail: 'the logo image: choose the site logo in the editor' } } ) : null ),
		// A custom element the draft uses as an image placeholder (<image-slot>) is the media block.
		( { e } ) => ( e.tag.includes( '-' ) && specHit( R.mediaElement, e.tag ) ? v( 'mediaElement', { block: R.mediaElement?.block } ) : null ),
		// A group of links that each hold only an image is a logo wall: a gallery whose items are the links.
		( { e, kidsB } ) => ( ! m.words( e ) && kidsB.length >= ( R.logoGrid?.minItems ?? 3 ) && kidsB.every( imageLink ) ? v( 'logoGrid', { block: R.logoGrid?.block, absorb: true } ) : null ),
		// The link around a logo goes: the logo block links home itself.
		// Its children are one or more logos (a mark and a wordmark side by side).
		( { e, kidsB } ) => ( 'a' === e.tag && specHit( R.homeLink, e.attrs?.href || '' ) && kidsB.length && kidsB.every( logoish ) ? v( 'homeLink', { action: 'unwrap' } ) : null ),
		// A centring width wrapper inside a block that sets its own width (a header or footer, their rows, a section).
		// Directly under a section root it goes only when it lays nothing out itself: a centred grid or flex there is the
		// row the root accepts.
		( { e, st, kidsB, parentBlock } ) => {
			const role = facts.composition[ parentBlock ]?.composition_role;
			const centred = st[ 'max-width' ] && /\bauto\b/.test( `${ st.margin || '' } ${ st[ 'margin-inline' ] || '' } ${ st[ 'margin-left' ] || '' }` );
			const laysOut = /grid|flex/.test( st.display || e.display || '' );
			return ! m.words( e ) && kidsB.length && parentBlock && 'wrapper-shell' !== role && centred && ! ( 'section-root' === role && laysOut ) ? v( 'widthWrapper', { action: 'unwrap' } ) : null;
		},
		// A back-to-top control is a link whose source is 'top'.
		( { e, text, kidsB } ) => {
			const control = [ 'a', 'button' ].includes( e.tag ) || !! handlerOf( e );
			if ( ! control || ! ( specHit( R.backToTop, `${ text } ${ e.attrs?.[ 'aria-label' ] || '' }` ) || specHit( R.backToTop?.handlers, handlerOf( e ) ) ) ) {
				return null;
			}
			return kidsB.length ? v( 'backToTop', { block: R.backToTop?.wholeBlock, attributes: { sgsBlockLinkSource: 'top' } } ) : v( 'backToTop', { block: R.backToTop?.lone, attributes: { linkSource: 'top', label: text } } );
		},
		( { e } ) => ( 'iframe' === e.tag && specHit( R.mapEmbed, srcOf( e ) ) ? v( 'mapEmbed', { block: R.mapEmbed?.block, attributes: { displayType: 'map' }, absorb: true, handover: { owner: 'site-info', kind: 'presence', detail: R.mapEmbed.handover } } ) : null ),
		// A live open or closed line; a second line beside the first is part of the same display.
		( { e, text } ) => {
			if ( ! specHit( R.openStatus, text ) || desc( e ).length > 2 ) {
				return null;
			}
			// An earlier open-status line within the same block (up to two levels up, as a sibling or a cousin) holds it.
			const scope = m.byKey[ m.byKey[ e.parentKey ]?.parentKey ] || m.byKey[ e.parentKey ];
			const order = m.els.indexOf( e );
			const first = scope ? desc( scope ).find( ( x ) => m.els.indexOf( x ) < order && specHit( R.openStatus, all( x ) ) && desc( x ).length <= 2 ) : null;
			return first ? v( 'openStatus', { action: 'absorbed', into: first.key } ) : v( 'openStatus', { block: R.openStatus?.block, attributes: { displayType: 'open-status' }, absorb: true } );
		},
		// An hours row: a few pieces of text (a day, its times) and nothing nested, reading as a day and a clock time.
		( { text, kidsB } ) => ( kidsB.length && kidsB.length <= ( R.hoursRows?.maxParts ?? 3 ) && kidsB.every( ( k ) => ! m.blockKids( k ).length ) && specHit( facts.decisions.siteInfoPatterns?.hours, text ) && text.length <= ( R.hoursRows?.maxChars ?? 80 ) ?v( 'hoursRows', { block: R.hoursRows?.block, attributes: { displayType: 'hours', hoursLayout: 'rows' }, absorb: true } ) : null ),
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
				// A card that ends in a short call to action is a plain card: the action is the button that holds the link.
				return R.cardAction && cardAction( e ) ? v( 'wholeCardLink', { block: R.wholeCardLink?.block, attributes: {} } ) : v( 'wholeCardLink', { block: R.wholeCardLink?.block, attributes: linkAttrs( e, lk ) } );
			}
			// One action with one label (and a glyph): a pill. A toggle or a slider arrow is not; nor is a link with no words.
			if ( 1 !== texts.length || disclosure( e ) ) {
				return null;
			}
			return v( 'pillButton', { block: R.pillButton?.block, absorb: true, attributes: { label: text, ...( lk ? { linkSource: lk.source } : {} ), ...( lk && wordsAreValue( e, lk.kind ) ? { labelFromSiteInfo: true } : {} ) } } );
		},
		// A lone text link to a Site Info address (a phone number, an email address, a maps host) is a button whose link
		// reads Site Info; credit and copyright lines stay business details.
		( { e, text, kidsB } ) => {
			const lk = 'a' === e.tag && ! kidsB.length && m.words( e ) ? linkKindOf( e ) : null;
			return lk ? v( 'siteInfoLink', { block: R.siteInfoLink?.block, attributes: { label: text, linkSource: lk.source, ...( wordsAreValue( e, lk.kind ) ? { labelFromSiteInfo: true } : {} ) } } ) : null;
		},
		( { e } ) => ( 'nav' === e.tag && R.navigation?.bySurface?.[ surface.kind ] ? v( 'navigation', { block: R.navigation.bySurface[ surface.kind ], absorb: true } ) : null ),
		( { e } ) => ( ! m.isIconLink( e ) && ( iconOnly( e ) || emojiOnly( e ) || bindingGlyph( e ) ) ? v( 'solitaryIcon', { block: R.solitaryIcon?.block } ) : null ),
		// The call to action that ends a card link is the card's button, holding the card's link.
		( { e } ) => {
			const card = actionOf( e );
			if ( ! card ) {
				return null;
			}
			const lk = linkKindOf( card );
			let link = realHref( card ) ? { url: realHref( card ) } : {};
			if ( lk ) {
				link = { linkSource: lk.source };
			}
			return v( 'cardAction', { block: R.cardAction?.block, attributes: { label: m.words( e ), ...link } } );
		},
		// A short run of words: the first in a header or footer row's column heads it; set in capitals, wide tracking or a
		// pill it is a kicker. A control the visitor operates and a bare number are neither.
		( { e, st, kidsB } ) => {
			// Its only children may be bare decorations (a marker dot), which the label, a leaf, absorbs.
			if ( kidsB.some( ( k ) => ! bare( k ) ) || ! m.words( e ) || HEADING.test( e.tag ) || 'a' === e.tag || interactive( e ) || numberOnly( e ) || m.words( e ).split( ' ' ).length > ( R.label?.maxWords ?? 4 ) ) {
				return null;
			}
			const heading = headsRowColumn( e ) && v( 'columnHeading', { block: R.columnHeading?.block } );
			if ( heading ) {
				return heading;
			}
			const caps = 'uppercase' === st[ 'text-transform' ] || ( em( st[ 'letter-spacing' ] ) ?? 0 ) >= ( R.label?.minTrackingEm ?? 0.06 );
			const pill = ( px( st[ 'border-radius' ] ) ?? 0 ) >= 99 && !! st.padding;
			const label = ( caps || pill ) && ! hooks.isColumnLabel( e ) && v( 'label', { block: R.label?.block } );
			if ( label ) {
				return label;
			}
			return titlesCard( e ) ? v( 'cardTitle', { block: R.cardTitle?.block } ) : null;
		},
	];

	// The blocks already proposed for the element's ancestors, nearest first (an unwrapped ancestor has none).
	const ancestorBlocks = ( e ) => {
		const out = [];
		for ( let p = m.byKey[ e.parentKey ]; p; p = m.byKey[ p.parentKey ] ) {
			const b = hooks.blockOfKey?.( p.key );
			b && out.push( { block: b, key: p.key } );
		}
		return out;
	};
	// A block the database files as a section (`block_composition.container_kind`, as the hero and the trust bar) is only
	// ever a page's own section: an element directly under a page surface's root. Badges inside a section are labels.
	const pageSection = ( e, block ) => 'section' !== facts.composition[ block ]?.container_kind || ( 'page' === surface.kind && 1 === e.depth );
	const isMedia = ( k ) => 'img' === k.tag || ( k.tag.includes( '-' ) && !! specHit( R.mediaElement, k.tag ) );
	// The element's own animation loops a translate for ever (the inventory's motion record): a marquee track.
	const loops = ( e ) => motion.has( String( e.key ).replace( /#\d+$/, '' ) );

	// Composite structures, before the element rules: a marquee, a trust bar, a page's hero and what its hero provides.
	const STRUCTURES = [
		// A strip whose own animation loops a translate for ever is a marquee: logos make a brand strip, labels a scrolling
		// trust bar; the repeated items are its items.
		( { e, kidsB } ) => {
			if ( ! loops( e ) || ! kidsB.length ) {
				return null;
			}
			const logos = desc( e ).some( isMedia );
			if ( ! logos && ! pageSection( e, R.marquee?.itemBlock ) ) {
				return null;
			}
			return v( 'marquee', logos ? { block: R.marquee?.logoBlock, attributes: {}, absorb: true, handover: { owner: 'content-page', kind: 'presence', detail: 'the brand logos: add each logo image to the strip' } } : { block: R.marquee?.itemBlock, attributes: {}, absorb: true } );
		},
		// A row of short non-interactive labels, each with at most a glyph, is a trust bar (its badges are its items).
		( { e, kidsB } ) => {
			const T = R.trustBar;
			// A badge is a short label that is not a business detail (an open status, hours or a Site Info value have their
			// own rules); the badges sit side by side, never stacked.
			const detail = ( k ) => !! specHit( R.openStatus, all( k ) ) || !! specHit( facts.decisions.siteInfoPatterns?.hours, all( k ) ) || hooks.siteInfoKinds( k ).size > 0;
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
		// The first section of a page holding its h1 is the hero; with an image inside it is the split hero.
		( { e, kidsB } ) => {
			if ( 'page' !== surface.kind || 1 !== e.depth || ! kidsB.length || ! desc( e ).some( ( k ) => 'h1' === k.tag ) ) {
				return null;
			}
			const media = desc( e ).some( isMedia );
			return v( 'hero', { block: R.hero?.block, attributes: media ? { variant: 'split' } : {}, ...( media ? { handover: { owner: 'content-page', kind: 'presence', detail: 'the hero image: choose it in the hero\'s split media setting' } } : {} ) } );
		},
		// The frame that only clips or fades a marquee track goes: the strip draws its own overflow and edge fade.
		( { e, kidsB } ) => ( ! m.words( e ) && 1 === kidsB.length && loops( kidsB[ 0 ] ) && desc( kidsB[ 0 ] ).some( isMedia ) ? v( 'marqueeFrame', { action: 'unwrap' } ) : null ),
		// A wrapper that only aligns or spaces its content (text-align, padding, margin) goes: the blocks around and inside
		// it align and pad themselves. Anything that paints (a background, border, shadow), positions or lays out stays.
		( { e, st, kidsB, parentBlock } ) => {
			const props = Object.keys( st );
			const only = new Set( R.alignWrapper?.properties || [] );
			return parentBlock && ! m.words( e ) && kidsB.length && props.length && props.every( ( p ) => only.has( p ) ) ? v( 'alignWrapper', { action: 'unwrap' } ) : null;
		},
		// Inside a hero: its image is the hero's own media slot; its layout wrappers go (the hero lays out its content).
		( { e, kidsB } ) => {
			const hero = ancestorBlocks( e ).find( ( a ) => a.block === R.hero?.block );
			if ( ! hero ) {
				return null;
			}
			if ( isMedia( e ) ) {
				return v( 'heroInner', { action: 'absorbed', into: hero.key } );
			}
			// A wrapper laying two or more items side by side is a row (a button group, a row of labels), not a layout
			// wrapper: it stays, and the scoring proposes it (the multi-button for buttons, a container for labels).
			// The row that holds the hero's image is the hero's own split (content beside media), which the hero lays out.
			const row = kidsB.length > 1 && ! m.stacked( kidsB ) && ! desc( e ).some( isMedia );
			return ! m.words( e ) && kidsB.length && ! row ? v( 'heroInner', { action: 'unwrap' } ) : null;
		},
	];

	// The verdict for one element, or null.
	const ruleFor = ( e, parentBlock = null ) => {
		const x = { e, st: declared( e ), text: all( e ), kidsB: m.blockKids( e ), parentBlock };
		for ( const rule of [ ...STRUCTURES, ...RULES ] ) {
			const out = rule( x );
			if ( out ) {
				return out;
			}
		}
		return null;
	};

	return { ruleFor, drawsChildren, declared };
}
