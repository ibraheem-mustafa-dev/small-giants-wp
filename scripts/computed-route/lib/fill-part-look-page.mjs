// The in-page finder of the shop look settings (template-rework Task 4). It runs inside a served draft page: given the
// locator spec (data/part-locators.json) it finds each part's element by structure (input type, role, autocomplete token,
// tag, position, repeated siblings, the kind of text an element holds, what it contains and where it sits), never by
// wording, and returns each located element with the computed styles asked for. `findPartsInPage` is passed to
// `page.evaluate`, so it closes over nothing: every helper lives inside it.
//
// A locator is { from, match, smallest, pick, rel, minCount } or { sameAs }:
//   from      'page' (default) or the name of an anchor; descendants of the anchor's elements are searched
//   match     the matcher an element must satisfy (keys below, all ANDed)
//   smallest  keep only matches that hold no other match
//   largest   keep only matches that no other match holds
//   stackGap  (a part) read the gap of the column stack its repeated copies sit in, as `stack:gap` (the space between line cards a
//             setting paints as each card's margin-bottom); every other part reads ''
//   pick      'all' (default), 'first', 'last', 'allButLast' or { index } (counted after any perRoot grouping)
//   self      search the anchor's own elements instead of their descendants (with a rel: a field's label)
//   perRoot   apply smallest and pick to each search root's matches on their own (one result per basket line, say)
//   any       a list of locators: the first that finds something answers
//   rel       what to return for each match: 'self' (default), 'label', 'wrapper', 'parent', { childIndex, deepest },
//             { child: matcher, deepest }, { ancestor: matcher }, { sibling: -1 or 1, deepest }, or a list of these applied in turn
//   minCount  fewer matches than this and the part is not found
// Matcher keys: tag, inputType ('' is an input with no type), role, autocomplete (tokens, or true for any real token),
// position (the element's own computed position), paint ('image'), text ('currency', 'count', 'words', 'none'), ownText,
// square, repeats (a sibling shares its tag and the tags of its children), minChildren, childText (the kinds of text of the
// direct children, in order: 'words', 'currency', 'count', 'none', 'any'), maxChildren, type (the type attribute of a
// button or input), has, hasAll, hasMany ({ match, atLeast }), lacks, inside, notInside, inAnchor, notInAnchor,
// parentOfAnchor, holdsAnchor (an anchor's elements: the match is inside, outside, the parent of, or holds one),
// followsAnchor (the match comes after an anchor's element in the same row or parent), lacksAnchor (holds none of an anchor's elements),
// ariaExpanded (has an aria-expanded attribute: a disclosure's button), ariaOn (aria-pressed, aria-checked or aria-selected is true),
// not (a matcher the element must fail), hasPercent (its text holds a number and a percent sign), boxed (a background colour of its own or a drawn border: a badge, not a wordmark
// on a scrim), firstSibling (the first element of its parent), overAnchor (its middle lies inside an anchor element's box and it takes at most 60% of its area: a label drawn over it, inside
// it or beside it), besideAnchor (it sits in the same row as an anchor element: they share a parent, or the anchor is one wrapper down),
// ariaCurrent (carries aria-current, other than "false": a menu's current item), pill (a fill of its own with corners rounded to at
// least 40% of its height: a status chip),
// shopPart (an element the client's shop parts record locates for that part id: `spec.shopParts` maps an id to { dc, tpl } template
// keys, and `spec.rootName` is the served page's own component), onlyChild (the only element in its parent), hasAmount (its text holds an
// amount, whole or inside a sentence), hasDate (a leaf inside it holds a date: a day beside a month, or a numeric date), minSiblings,
// precedesAnchor (the match comes before an anchor's element in the same row or the same parent: the column labels above a
// loop of lines), allChildren (a matcher every direct child satisfies), rule (a line the draft draws: an hr, an empty strip
// under 4px tall, or an element with a top or bottom border but not a border on every side, so a boxed card is not a rule),
// linksTo (a link whose file is the page named for that role, or any of several roles, in `pages`; or an element whose own click handler
// in the draft's template takes the visitor to that role's page, `spec.routeHandlers` mapping a role to { dc, handler }), control (a button, link, input, select or
// textarea), scope ('page' outside the header, footer and any fixed panel, 'overlay' inside a fixed panel or dialog, 'any'),
// modal (a dialog: role dialog or alertdialog, aria-modal="true" or a <dialog>), upper (true or false: its computed text-transform is
// uppercase), square (true or false), noAnchor (an anchor located nothing: the basket drawer's empty state is read where it holds no
// lines), notPrecedesAnchor (the negation of precedesAnchor), beforeAnchor / afterAnchor (the match comes before / after an anchor's
// element in the document: words in a box of their own beside a bar), firstChild (a matcher its first element child satisfies: a step
// drawn as a section whose first child is its heading), clickable (a control, or an element the draft's template gives a click
// handler, an onclick, role button or a pointer cursor: a quantity or save control drawn as a span), notShopPart (none of the shop parts record's elements for these ids),
// countOf (an anchor name: the first whole number in its text is how many elements that anchor locates, and it sits outside them: a
// listing's "5 treats to choose from").
// `spec.pins` maps an anchor to { tpl, host }: the anchor is the shown element the draft stamps with that template number in that
// component (a second read of the same page in another state takes the drawer the first read found). Each located element is
// returned with its own { tpl, host } stamp.
export function findPartsInPage( { spec, names, props, pages } ) {
	const AMOUNT = /[£$€]\s?\d|\d\s?[£$€]/;
	// A date on its own or in a line ("12 October 2026", "Sat 7 Nov", "Nov 7", "07/11/2026", "2026-11-07"): a day beside a month, or
	// a numeric date.
	const DATE = /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b/i;
	// An amount on its own ("£21.50", "-£3", "12,50€"); a sentence that mentions one is words.
	// A percentage on its own or in a line ("-20%", "20% off").
	const PERCENT = /\d\s?%/;
	const CURRENCY = /^[-−+]?\s?([£$€]\s?\d[\d.,]*|\d[\d.,]*\s?[£$€])$/;
	const norm = ( s ) => String( s || '' ).replace( /\s+/g, ' ' ).trim();
	const cache = new Map();
	const styleOf = ( el ) => {
		if ( ! cache.has( el ) ) {
			cache.set( el, getComputedStyle( el ) );
		}
		return cache.get( el );
	};
	const box = ( el ) => el.getBoundingClientRect();
	const shown = ( el ) => {
		const r = box( el );
		return r.width > 0 && r.height > 0 && 'none' !== styleOf( el ).display;
	};
	const textOf = ( el ) => norm( el.textContent );
	const kindOf = ( el ) => {
		const t = textOf( el );
		if ( ! t ) {
			return 'none';
		}
		if ( CURRENCY.test( t ) ) {
			return 'currency';
		}
		if ( /^\d+$/.test( t ) ) {
			return 'count';
		}
		return /[A-Za-z]/.test( t ) ? 'words' : 'any';
	};
	const ownText = ( el ) => [ ...el.childNodes ].some( ( n ) => 3 === n.nodeType && norm( n.textContent ) );
	const roleOf = ( el ) => {
		const explicit = el.getAttribute( 'role' );
		if ( explicit ) {
			return explicit;
		}
		const tag = el.tagName.toLowerCase();
		const type = ( el.getAttribute( 'type' ) || '' ).toLowerCase();
		if ( 'a' === tag ) {
			return el.hasAttribute( 'href' ) ? 'link' : '';
		}
		if ( 'input' === tag ) {
			return { checkbox: 'checkbox', radio: 'radio', range: 'slider', submit: 'button', button: 'button' }[ type ] || 'textbox';
		}
		return { button: 'button', select: 'combobox', textarea: 'textbox', fieldset: 'group', aside: 'complementary', nav: 'navigation', ul: 'list', li: 'listitem', form: 'form', dialog: 'dialog', img: 'img', h1: 'heading', h2: 'heading', h3: 'heading', h4: 'heading', h5: 'heading', h6: 'heading', legend: 'legend', label: 'label' }[ tag ] || '';
	};
	const hasImage = ( el ) => 'img' === el.tagName.toLowerCase() || 'svg' === el.tagName.toLowerCase() || ( styleOf( el ).backgroundImage && 'none' !== styleOf( el ).backgroundImage );
	const isControl = ( el ) => {
		const tag = el.tagName.toLowerCase();
		return 'button' === tag || 'input' === tag || 'select' === tag || 'textarea' === tag || ( 'a' === tag && el.hasAttribute( 'href' ) ) || 'button' === el.getAttribute( 'role' );
	};
	const drawn = ( el, side ) => parseFloat( styleOf( el )[ `border${ side }Width` ] ) > 0 && ! [ 'none', 'hidden' ].includes( styleOf( el )[ `border${ side }Style` ] );
	const isRule = ( el ) => {
		if ( 'hr' === el.tagName.toLowerCase() ) {
			return true;
		}
		const r = box( el );
		if ( ! textOf( el ) && ! el.children.length && r.height <= 3 && r.width > 40 ) {
			return true;
		}
		return ( drawn( el, 'Top' ) || drawn( el, 'Bottom' ) ) && ! ( drawn( el, 'Top' ) && drawn( el, 'Right' ) && drawn( el, 'Bottom' ) && drawn( el, 'Left' ) );
	};
	// A pill: a fill of its own (a background colour that is not transparent) with corners rounded to at least 40% of its height.
	const isPill = ( el ) => {
		const s = styleOf( el );
		const bg = s.backgroundColor;
		if ( ! bg || 'transparent' === bg || /^rgba\([^)]*,\s*0\)$/.test( bg ) ) {
			return false;
		}
		const h = box( el ).height;
		return h > 0 && parseFloat( s.borderTopLeftRadius ) >= 0.4 * h;
	};
	// A box: a background colour of its own (not transparent) or a border drawn on any side. A gradient or picture alone is not a fill, so a
	// wordmark laid over a photo on a fading scrim is not a box, and a badge with a fill or an outline is.
	const isBoxed = ( el ) => {
		const bg = styleOf( el ).backgroundColor;
		const filled = !! bg && 'transparent' !== bg && ! /^rgba\([^)]*,\s*0\)$/.test( bg );
		return filled || [ 'Top', 'Right', 'Bottom', 'Left' ].some( ( side ) => drawn( el, side ) );
	};
	// Whether the middle of an element lies inside an anchor element's box and the element takes no more than 60% of its area, so it is a
	// label drawn over it (a heart on a photo, whether the heart is inside the photo's link or beside it), never a layer covering it
	// (a "photo to come" panel).
	const sitsOver = ( el, a ) => {
		const r = box( el );
		const b = box( a );
		const x = r.left + r.width / 2;
		const y = r.top + r.height / 2;
		return r.width > 0 && r.height > 0 && r.width * r.height <= 0.6 * b.width * b.height && x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;
	};
	// Whether an element sits in the same row as an anchor element: they share a parent, or the anchor sits one wrapper down (a title
	// inside its link), and neither holds the other.
	const isBeside = ( el, a ) => a !== el && ! a.contains( el ) && ! el.contains( a ) && ( a.parentElement === el.parentElement || a.parentElement?.parentElement === el.parentElement );
	const signature = ( el ) => `${ el.tagName }|${ [ ...el.children ].map( ( c ) => c.tagName ).join( ',' ) }`;
	const repeats = ( el ) => !! el.parentElement && [ ...el.parentElement.children ].some( ( s ) => s !== el && signature( s ) === signature( el ) );
	// The last path segment of a link's target, without its query or fragment ("Checkout.dc.html" for "../Checkout.dc.html?x=1").
	const fileOf = ( href ) => {
		try {
			return decodeURIComponent( String( href ).split( '#' )[ 0 ].split( '?' )[ 0 ].split( '/' ).pop() );
		} catch ( e ) {
			return '';
		}
	};
	// The click handler the draft's own template gives an element ({ dc, handler }, from `sc-camel-on-click="{{ name }}"` on the template
	// element its data-dc-tpl stamps), or null. The page bridge window.__dcAnnotatedTemplate serves each component's stamped template.
	const tplDocs = new Map();
	const handlers = new Map();
	const handlerOfEl = ( el ) => {
		if ( handlers.has( el ) ) {
			return handlers.get( el );
		}
		let found = null;
		const n = el.getAttribute( 'data-dc-tpl' );
		if ( n && 'function' === typeof window.__dcAnnotatedTemplate ) {
			const host = el.closest( '[data-sc-name]' )?.getAttribute( 'data-sc-name' );
			const comp = ! host || 'Root' === host ? ( 'function' === typeof window.__dcRootName ? window.__dcRootName() : spec.rootName ) : host;
			if ( comp && ! tplDocs.has( comp ) ) {
				const t = document.createElement( 'template' );
				t.innerHTML = window.__dcAnnotatedTemplate( comp ) || '';
				tplDocs.set( comp, t.content );
			}
			const src = comp ? tplDocs.get( comp ).querySelector( `[data-dc-tpl="${ CSS.escape( n ) }"]` ) : null;
			const name = /^\s*\{\{\s*([^}\s]+)\s*\}\}\s*$/.exec( src?.getAttribute( 'sc-camel-on-click' ) || '' )?.[ 1 ];
			found = name ? { dc: comp, handler: name } : null;
		}
		handlers.set( el, found );
		return found;
	};
	const ancestors = ( el ) => {
		const out = [];
		for ( let p = el.parentElement; p; p = p.parentElement ) {
			out.push( p );
		}
		return out;
	};
	const isModal = ( el ) => [ 'dialog', 'alertdialog' ].includes( el.getAttribute( 'role' ) ) || 'true' === el.getAttribute( 'aria-modal' ) || 'dialog' === el.tagName.toLowerCase();
	const isPanel = ( el ) => 'fixed' === styleOf( el ).position || 'dialog' === el.getAttribute( 'role' ) || 'true' === el.getAttribute( 'aria-modal' ) || 'dialog' === el.tagName.toLowerCase();
	const scopes = new Map();
	const scopeOf = ( el ) => {
		if ( ! scopes.has( el ) ) {
			scopes.set( el, scopeUncached( el ) );
		}
		return scopes.get( el );
	};
	const scopeUncached = ( el ) => {
		const up = [ el, ...ancestors( el ) ];
		if ( up.some( isPanel ) ) {
			return 'overlay';
		}
		return up.some( ( a ) => [ 'HEADER', 'FOOTER' ].includes( a.tagName ) ) ? 'chrome' : 'page';
	};
	const descendants = ( root ) => [ ...root.querySelectorAll( '*' ) ];
	// What an element holds that sits in its own scope: a page element never counts the header, footer or fixed panel inside it.
	const held = ( el ) => {
		const scope = scopeOf( el );
		return descendants( el ).filter( ( d ) => scopeOf( d ) === scope );
	};
	const stampOf = ( el ) => ( { tpl: el.getAttribute( 'data-dc-tpl' ), host: el.closest( '[data-sc-name]' )?.getAttribute( 'data-sc-name' ) ?? null } );
	const pinned = ( pin ) => [ ...document.querySelectorAll( `[data-dc-tpl="${ CSS.escape( String( pin.tpl ) ) }"]` ) ].filter( ( el ) => stampOf( el ).host === ( pin.host ?? null ) && shown( el ) );
	const anchorEls = ( name ) => ( spec.pins?.[ name ] ? pinned( spec.pins[ name ] ) : locate( spec.anchors[ name ], `a:${ name }` ) );
	const memo = new Map();
	// Where an element sits against an anchor's element `a` in the document: -1 before it, 1 after it (the locator's `from` scope keeps
	// the comparison within one box, and `pick` takes the nearest).
	const sideOf = ( el, a ) => ( el.compareDocumentPosition( a ) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1 );
	// Whether the shop parts record locates the element for one of these part ids (its template key in its own component).
	const stampedAs = ( el, ids ) => {
		const keys = [ ...[].concat( ids ).flatMap( ( id ) => spec.shopParts?.[ id ] || [] ) ];
		const tpl = el.getAttribute( 'data-dc-tpl' );
		const host = el.closest( '[data-sc-name]' )?.getAttribute( 'data-sc-name' );
		return !! tpl && keys.some( ( k ) => String( k.tpl ) === tpl && ( k.dc === spec.rootName ? [ 'Root', spec.rootName ].includes( host ) : k.dc === host ) );
	};

	function test( el, m ) {
		if ( ! m ) {
			return true;
		}
		const tag = el.tagName.toLowerCase();
		if ( m.tag && ! m.tag.includes( tag ) ) {
			return false;
		}
		if ( m.inputType ) {
			if ( 'input' !== tag || ! m.inputType.includes( ( el.getAttribute( 'type' ) || '' ).toLowerCase() ) ) {
				return false;
			}
		}
		if ( m.role && ! m.role.includes( roleOf( el ) ) ) {
			return false;
		}
		if ( m.autocomplete ) {
			const tokens = norm( el.getAttribute( 'autocomplete' ) || el.getAttribute( 'sc-camel-auto-complete' ) ).split( ' ' ).filter( Boolean );
			const ok = true === m.autocomplete ? tokens.some( ( t ) => ! [ 'off', 'on' ].includes( t ) ) : tokens.some( ( t ) => m.autocomplete.includes( t ) );
			if ( ! ok ) {
				return false;
			}
		}
		if ( m.position && ! m.position.includes( styleOf( el ).position ) ) {
			return false;
		}
		if ( 'image' === m.paint && ! hasImage( el ) ) {
			return false;
		}
		if ( m.text && kindOf( el ) !== m.text ) {
			return false;
		}
		// A star rating: a row of star glyphs (its words may follow), or an element its label names as a rating.
		if ( undefined !== m.rating && ( /^[\u2605\u2606\u2B50\u2729\u272D]{3,}/.test( textOf( el ) ) || /\bout of 5\b|\bstars?\b|\brat(?:ed|ing)\b/i.test( el.getAttribute( 'aria-label' ) || '' ) ) !== m.rating ) {
			return false;
		}
		if ( undefined !== m.ownText && ownText( el ) !== m.ownText ) {
			return false;
		}
		if ( undefined !== m.square ) {
			const r = box( el );
			if ( ( !! r.width && r.width / r.height >= 0.8 && r.width / r.height <= 1.25 ) !== !! m.square ) {
				return false;
			}
		}
		if ( undefined !== m.modal && isModal( el ) !== m.modal ) {
			return false;
		}
		if ( undefined !== m.upper && ( 'uppercase' === styleOf( el ).textTransform ) !== m.upper ) {
			return false;
		}
		if ( m.noAnchor && anchorEls( m.noAnchor ).length ) {
			return false;
		}
		if ( undefined !== m.repeats && repeats( el ) !== m.repeats ) {
			return false;
		}
		if ( m.minChildren && el.children.length < m.minChildren ) {
			return false;
		}
		if ( undefined !== m.maxChildren && el.children.length > m.maxChildren ) {
			return false;
		}
		if ( m.type && ! m.type.includes( ( el.getAttribute( 'type' ) || '' ).toLowerCase() ) ) {
			return false;
		}
		if ( m.shopPart && ! stampedAs( el, m.shopPart ) ) {
			return false;
		}
		if ( m.notShopPart && stampedAs( el, m.notShopPart ) ) {
			return false;
		}
		if ( undefined !== m.onlyChild && ( 1 === el.parentElement?.children.length ) !== m.onlyChild ) {
			return false;
		}
		if ( undefined !== m.hasDate && [ ...el.querySelectorAll( '*' ) ].some( ( d ) => ! d.children.length && DATE.test( textOf( d ) ) ) !== m.hasDate ) {
			return false;
		}
		if ( undefined !== m.hasAmount && AMOUNT.test( textOf( el ) ) !== m.hasAmount ) {
			return false;
		}
		if ( undefined !== m.hasPercent && PERCENT.test( textOf( el ) ) !== m.hasPercent ) {
			return false;
		}
		if ( m.not && test( el, m.not ) ) {
			return false;
		}
		if ( undefined !== m.boxed && isBoxed( el ) !== m.boxed ) {
			return false;
		}
		if ( undefined !== m.firstSibling && ( null === el.previousElementSibling ) !== m.firstSibling ) {
			return false;
		}
		if ( m.overAnchor && ! anchorEls( m.overAnchor ).some( ( a ) => a !== el && sitsOver( el, a ) ) ) {
			return false;
		}
		if ( m.besideAnchor && ! anchorEls( m.besideAnchor ).some( ( a ) => isBeside( el, a ) ) ) {
			return false;
		}
		if ( m.precedesAnchor && ! anchorEls( m.precedesAnchor ).some( ( a ) => a !== el && ( a.parentElement === el.parentElement || a.parentElement?.parentElement === el.parentElement?.parentElement ) && ( el.compareDocumentPosition( a ) & Node.DOCUMENT_POSITION_FOLLOWING ) && ! el.contains( a ) ) ) {
			return false;
		}
		if ( m.notPrecedesAnchor && anchorEls( m.notPrecedesAnchor ).some( ( a ) => a !== el && ( a.parentElement === el.parentElement || a.parentElement?.parentElement === el.parentElement?.parentElement ) && ( el.compareDocumentPosition( a ) & Node.DOCUMENT_POSITION_FOLLOWING ) && ! el.contains( a ) ) ) {
			return false;
		}
		if ( m.beforeAnchor && ! anchorEls( m.beforeAnchor ).some( ( a ) => sideOf( el, a ) < 0 ) ) {
			return false;
		}
		if ( m.afterAnchor && ! anchorEls( m.afterAnchor ).some( ( a ) => sideOf( el, a ) > 0 ) ) {
			return false;
		}
		if ( m.followsAnchor && ! anchorEls( m.followsAnchor ).some( ( a ) => a !== el && ( a.parentElement === el.parentElement || a.parentElement?.parentElement === el.parentElement ) && ( el.compareDocumentPosition( a ) & Node.DOCUMENT_POSITION_PRECEDING ) && ! a.contains( el ) ) ) {
			return false;
		}
		if ( m.lacksAnchor && anchorEls( m.lacksAnchor ).some( ( a ) => el.contains( a ) ) ) {
			return false;
		}
		if ( undefined !== m.ariaExpanded && el.hasAttribute( 'aria-expanded' ) !== m.ariaExpanded ) {
			return false;
		}
		if ( undefined !== m.ariaOn && [ 'aria-pressed', 'aria-checked', 'aria-selected' ].some( ( a ) => 'true' === el.getAttribute( a ) ) !== m.ariaOn ) {
			return false;
		}
		if ( undefined !== m.ariaCurrent && ( el.hasAttribute( 'aria-current' ) && 'false' !== el.getAttribute( 'aria-current' ) ) !== m.ariaCurrent ) {
			return false;
		}
		if ( undefined !== m.pill && isPill( el ) !== m.pill ) {
			return false;
		}
		if ( m.firstChild && ! ( el.firstElementChild && test( el.firstElementChild, m.firstChild ) ) ) {
			return false;
		}
		if ( m.allChildren && ! [ ...el.children ].every( ( k ) => test( k, m.allChildren ) ) ) {
			return false;
		}
		if ( undefined !== m.rule && isRule( el ) !== m.rule ) {
			return false;
		}
		if ( m.inAnchor && ! anchorEls( m.inAnchor ).some( ( a ) => a.contains( el ) ) ) {
			return false;
		}
		if ( m.notInAnchor && anchorEls( m.notInAnchor ).some( ( a ) => a.contains( el ) ) ) {
			return false;
		}
		if ( m.parentOfAnchor && ! anchorEls( m.parentOfAnchor ).some( ( a ) => a.parentElement === el ) ) {
			return false;
		}
		if ( m.holdsAnchor && ! anchorEls( m.holdsAnchor ).some( ( a ) => el !== a && el.contains( a ) ) ) {
			return false;
		}
		if ( m.childText ) {
			const kids = [ ...el.children ];
			if ( kids.length !== m.childText.length || ! kids.every( ( k, i ) => 'any' === m.childText[ i ] || kindOf( k ) === m.childText[ i ] ) ) {
				return false;
			}
		}
		if ( undefined !== m.clickable && ( isControl( el ) || !! handlerOfEl( el ) || el.hasAttribute( 'onclick' ) || 'pointer' === styleOf( el ).cursor ) !== m.clickable ) {
			return false;
		}
		if ( undefined !== m.control && isControl( el ) !== m.control ) {
			return false;
		}
		// The count of a listing: the first whole number in its text equals how many elements an anchor locates (the shop's
		// cards), and it is not inside one of them.
		if ( m.countOf ) {
			const many = anchorEls( m.countOf );
			const n = /\d+/.exec( textOf( el ) );
			if ( ! many.length || ! n || Number( n[ 0 ] ) !== many.length || many.some( ( a ) => a.contains( el ) ) ) {
				return false;
			}
		}
		if ( m.linksTo ) {
			const roles = [].concat( m.linksTo );
			const want = roles.map( ( role ) => pages[ role ] ).filter( Boolean );
			const routed = roles.flatMap( ( role ) => spec.routeHandlers?.[ role ] || [] );
			const near = [ el, ...held( el ) ];
			const byFile = want.length && near.some( ( a ) => 'a' === a.tagName.toLowerCase() && a.hasAttribute( 'href' ) && want.includes( fileOf( a.getAttribute( 'href' ) ) ) );
			const byHandler = ! byFile && routed.length && near.some( ( a ) => {
				const h = handlerOfEl( a );
				return h && routed.some( ( r ) => r.dc === h.dc && r.handler === h.handler );
			} );
			if ( ! byFile && ! byHandler ) {
				return false;
			}
		}
		if ( m.hasMany && held( el ).filter( ( d ) => test( d, m.hasMany.match ) ).length < m.hasMany.atLeast ) {
			return false;
		}
		if ( m.has && ! held( el ).some( ( d ) => test( d, m.has ) ) ) {
			return false;
		}
		if ( m.hasAll && ! m.hasAll.every( ( h ) => held( el ).some( ( d ) => test( d, h ) ) ) ) {
			return false;
		}
		if ( m.lacks && held( el ).some( ( d ) => test( d, m.lacks ) ) ) {
			return false;
		}
		if ( m.inside && ! ancestors( el ).some( ( a ) => test( a, m.inside ) ) ) {
			return false;
		}
		if ( m.notInside && ancestors( el ).some( ( a ) => test( a, m.notInside ) ) ) {
			return false;
		}
		return true;
	}

	function related( el, rel ) {
		if ( Array.isArray( rel ) ) {
			return rel.reduce( ( cur, step ) => ( cur ? related( cur, step ) : null ), el );
		}
		if ( ! rel || 'self' === rel ) {
			return el;
		}
		if ( 'parent' === rel ) {
			return el.parentElement;
		}
		const deepen = ( e, on ) => {
			let cur = e;
			while ( on && cur && 1 === cur.children.length && ! ownText( cur ) ) {
				cur = cur.children[ 0 ];
			}
			return cur;
		};
		if ( 'label' === rel ) {
			const id = el.getAttribute( 'id' );
			const byFor = id ? document.querySelector( `label[for="${ CSS.escape( id ) }"]` ) : null;
			if ( byFor ) {
				return byFor;
			}
			const wrapped = el.closest( 'label' );
			if ( wrapped ) {
				return wrapped;
			}
			const ref = el.getAttribute( 'aria-labelledby' );
			return ref ? document.getElementById( ref.split( ' ' )[ 0 ] ) : null;
		}
		if ( 'wrapper' === rel ) {
			let cur = el;
			const holdsOne = ( e ) => [ ...e.querySelectorAll( 'input:not([type=hidden]), select, textarea, button' ) ].length <= 1;
			while ( cur.parentElement && 'BODY' !== cur.parentElement.tagName && holdsOne( cur.parentElement ) ) {
				cur = cur.parentElement;
			}
			return cur;
		}
		if ( undefined !== rel.sibling ) {
			const sib = rel.sibling < 0 ? el.previousElementSibling : el.nextElementSibling;
			return sib ? deepen( sib, rel.deepest ) : null;
		}
		if ( undefined !== rel.childIndex ) {
			const kids = [ ...el.children ];
			return deepen( kids.at( rel.childIndex ), rel.deepest ) || null;
		}
		if ( rel.child ) {
			const hit = held( el ).find( ( d ) => test( d, rel.child ) );
			return hit ? deepen( hit, rel.deepest ) : null;
		}
		if ( rel.ancestor ) {
			return ancestors( el ).find( ( a ) => test( a, rel.ancestor ) ) || null;
		}
		return null;
	}

	function pickFrom( hits, loc ) {
		let out = hits;
		if ( loc.smallest ) {
			out = out.filter( ( a ) => ! out.some( ( b ) => b !== a && a.contains( b ) ) );
		}
		if ( loc.largest ) {
			out = out.filter( ( a ) => ! out.some( ( b ) => b !== a && b.contains( a ) ) );
		}
		if ( 'first' === loc.pick ) {
			out = out.slice( 0, 1 );
		} else if ( 'last' === loc.pick ) {
			out = out.slice( -1 );
		} else if ( 'allButLast' === loc.pick ) {
			out = out.slice( 0, -1 );
		} else if ( loc.pick && undefined !== loc.pick.index ) {
			out = out.slice( loc.pick.index, loc.pick.index + 1 );
		}
		return out;
	}

	function locate( loc, key ) {
		if ( memo.has( key ) ) {
			return memo.get( key );
		}
		let done;
		if ( loc.sameAs ) {
			done = spec.anchors[ loc.sameAs ] ? anchorEls( loc.sameAs ) : locate( spec.parts[ loc.sameAs ], `p:${ loc.sameAs }` );
		} else if ( loc.any ) {
			done = [];
			for ( const [ i, alt ] of loc.any.entries() ) {
				done = locate( alt, `${ key }#${ i }` );
				if ( done.length ) {
					break;
				}
			}
		} else {
			const from = loc.from && 'page' !== loc.from ? anchorEls( loc.from ) : [ document.body ];
			const scope = loc.match?.scope || ( 'page' === ( loc.from || 'page' ) ? 'page' : 'any' );
			const grouped = from.map( ( root ) => ( loc.self ? [ root ] : descendants( root ) ).filter( ( el ) => {
				if ( [ 'SCRIPT', 'STYLE', 'LINK', 'TEMPLATE', 'NOSCRIPT' ].includes( el.tagName ) || 'x-dc' === el.tagName.toLowerCase() || ! shown( el ) ) {
					return false;
				}
				return ( 'any' === scope || scopeOf( el ) === scope ) && test( el, loc.match );
			} ) );
			let hits = [];
			if ( loc.perRoot ) {
				hits = grouped.flatMap( ( g ) => pickFrom( g, loc ) );
			} else {
				hits = pickFrom( [ ...new Set( grouped.flat() ) ], loc );
			}
			const out = [];
			for ( const el of hits ) {
				const rel = related( el, loc.rel );
				if ( rel && ! out.includes( rel ) && 'BODY' !== rel.tagName && shown( rel ) ) {
					out.push( rel );
				}
			}
			done = out.length >= ( loc.minCount || 1 ) ? out : [];
		}
		memo.set( key, done );
		return done;
	}

	// What the draft's own code states for a size property on the element (its inline style, else a stylesheet rule that matches it);
	// '' when the draft states none, so the computed size is the layout's and not the draft's look.
	const declared = ( el, prop ) => {
		const inline = el.style.getPropertyValue( prop );
		if ( inline ) {
			return inline;
		}
		for ( const sheet of document.styleSheets ) {
			let rules;
			try {
				rules = sheet.cssRules;
			} catch ( e ) {
				continue;
			}
			for ( const r of rules ) {
				if ( r.style && r.selectorText && r.style.getPropertyValue( prop ) && el.matches( r.selectorText ) ) {
					return r.style.getPropertyValue( prop );
				}
			}
		}
		return '';
	};
	const SIZES = [ 'width', 'height', 'min-width', 'min-height', 'max-width', 'flex-basis', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left' ];
	// A form control does not inherit its font: with no font family the draft's code states for it (inline, a matching rule, or
	// `font: inherit`), its computed family is the browser's own control font, not the draft's look. '1' then, else ''.
	const uaFont = ( el ) => ( [ 'select', 'input', 'textarea', 'button' ].includes( el.tagName.toLowerCase() ) && ! declared( el, 'font-family' ) ? '1' : '' );
	// The side column of a two-column grid the draft splits by unequal fractions (`1.35fr 1fr`): the width the ratio gives the smaller
	// fraction's track at this width. '' for anything else: one column, equal fractions (`1fr 1fr`), a fixed track beside a fluid one
	// (`80px 1fr`), the larger fraction's column, or an element spanning both tracks.
	const trackWidth = ( el ) => {
		const p = el.parentElement;
		if ( ! p || ! /grid/.test( styleOf( p ).display ) ) {
			return '';
		}
		const fr = declared( p, 'grid-template-columns' ).trim().split( /\s+/ ).map( ( t ) => /^(\d*\.?\d+)fr$/.exec( t )?.[ 1 ] );
		if ( 2 !== fr.length || fr.some( ( n ) => undefined === n ) || parseFloat( fr[ 0 ] ) === parseFloat( fr[ 1 ] ) ) {
			return '';
		}
		const tracks = styleOf( p ).gridTemplateColumns.split( /\s+/ ).filter( ( t ) => /^[\d.]+px$/.test( t ) );
		const side = parseFloat( fr[ 0 ] ) < parseFloat( fr[ 1 ] ) ? 0 : 1;
		const own = Math.abs( parseFloat( tracks[ side ] ) - box( el ).width ) < 1 ? tracks[ side ] : null;
		return own ? `${ Math.round( parseFloat( own ) * 10 ) / 10 }px` : '';
	};
	// The gap a stack puts between its copies: the parent's row gap, when the parent lays its children out in a column (a flex column, or
	// a grid of one column) and a sibling repeats this element's shape (every copy reads it, the last one too). '' otherwise.
	const stackGap = ( el ) => {
		const p = el.parentElement;
		if ( ! p || ! repeats( el ) ) {
			return '';
		}
		const ps = styleOf( p );
		const column = ( /flex/.test( ps.display ) && /^column/.test( ps.flexDirection ) ) || ( /grid/.test( ps.display ) && 1 === ps.gridTemplateColumns.split( /\s+/ ).filter( Boolean ).length );
		return column && parseFloat( ps.rowGap ) > 0 ? ps.rowGap : '';
	};
	// Where a choice tile's words start, from its padding box's left edge, when its first child is a mark drawn in flow (a radio, or a
	// box of at most 32px with no words) followed by words: '' otherwise. A tick box is no such mark: WooCommerce draws its own in flow.
	const markTextLeft = ( el ) => {
		const mark = el.firstElementChild;
		if ( ! mark || textOf( mark ) || [ 'absolute', 'fixed' ].includes( styleOf( mark ).position ) ) {
			return '';
		}
		const mr = box( mark );
		const input = 'input' === mark.tagName.toLowerCase();
		const isMark = input ? 'radio' === ( mark.getAttribute( 'type' ) || '' ).toLowerCase() : mr.width > 0 && mr.width <= 32 && mr.height <= 32;
		const words = [ ...el.children ].slice( 1 ).find( ( c ) => /[A-Za-z]/.test( textOf( c ) ) );
		if ( ! isMark || ! words ) {
			return '';
		}
		const left = box( words ).left - box( el ).left - ( parseFloat( styleOf( el ).borderLeftWidth ) || 0 );
		return left > 0 ? `${ Math.round( left * 10 ) / 10 }px` : '';
	};
	// Whether a label's words sit above the field it labels ('true' or 'false'): the field it holds or names (`for`), its first words'
	// box ending above the field's top. '' for an element that labels no field.
	const labelAbove = ( el ) => {
		if ( 'label' !== el.tagName.toLowerCase() ) {
			return '';
		}
		const id = el.getAttribute( 'for' );
		const field = el.querySelector( 'input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea' ) || ( id ? document.getElementById( id ) : null );
		const text = [ ...el.childNodes ].find( ( n ) => 3 === n.nodeType && norm( n.textContent ) ) || [ ...el.querySelectorAll( '*' ) ].find( ( c ) => c !== field && ! c.contains( field ) && ownText( c ) );
		if ( ! field || ! text ) {
			return '';
		}
		const range = document.createRange();
		range.selectNodeContents( text );
		return String( range.getBoundingClientRect().bottom <= box( field ).top + 1 );
	};
	const pathOf = ( el ) => {
		const parts = [];
		for ( let e = el; e && e !== document.body; e = e.parentElement ) {
			parts.unshift( `${ e.tagName.toLowerCase() }:${ [ ...e.parentElement.children ].indexOf( e ) }` );
		}
		return parts.join( '>' );
	};
	const out = {};
	for ( const name of names ) {
		const loc = spec.parts[ name ];
		if ( ! loc ) {
			continue;
		}
		const els = locate( loc, `p:${ name }` );
		out[ name ] = els.map( ( el ) => {
			const s = styleOf( el );
			const r = box( el );
			return { key: pathOf( el ), ...stampOf( el ), tag: el.tagName.toLowerCase(), text: textOf( el ).slice( 0, 300 ), box: { w: Math.round( r.width * 10 ) / 10, h: Math.round( r.height * 10 ) / 10, x: Math.round( r.left + window.scrollX ), y: Math.round( r.top + window.scrollY ) }, styles: { ...Object.fromEntries( props.map( ( p ) => [ p, s.getPropertyValue( p ) ] ) ), ...Object.fromEntries( SIZES.map( ( p ) => [ `decl:${ p }`, declared( el, p ) ] ) ), 'track:width': trackWidth( el ), 'ua:font': uaFont( el ), 'stack:gap': loc.stackGap ? stackGap( el ) : '', 'mark:text-left': markTextLeft( el ), 'label:above': labelAbove( el ) } };
		} );
	}
	return out;
}
