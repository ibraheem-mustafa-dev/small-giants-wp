// The checkout page's own words, steps and extra blocks (Spec 48 FR-48-55, the site build's checkout content step; MERGED F-24).
// WooCommerce's Checkout block keeps them in the checkout PAGE's content (the `woocommerce/checkout` block and its inner
// blocks), not in the template the route builds, so neither the template pieces nor part-look reach them: a from-blank site
// showed WooCommerce's own "Contact information", "Place Order" and "Order summary" whatever the draft drew. This step reads
// what the checkout draft draws from its skeleton inventory (sites/<client>/build/skeleton/<surface>.inventory.json, the
// surfaces.json entry building the `checkout` template) and the draft file, and writes it onto the page's block tree:
//   - each step: a section, fieldset or article whose first child is a heading or legend and that holds a field or a choice,
//     mapped onto WooCommerce's step blocks by what it holds, never by its words: the step with an email field is the contact
//     step; a step whose template shows a note box (a textarea) once one of its two choices is picked is the gift step
//     (`sgs/gift-order`); of the rest, the one with a card field (a `cc-*` autocomplete token), else the last with fields, is
//     the payment step; a step with fields is the address step, and also the delivery options when it holds choices; a step
//     of choices alone is the delivery options. A step drawn as one box over several WooCommerce steps puts its title on the
//     first (in WooCommerce's order) and an empty title on the others, which WooCommerce draws with no heading and no number;
//   - the title is the heading's own words. A heading led by a short number in a child of its own is a numbered step
//     (`showFormStepNumbers`, the number WooCommerce's); a number written in the heading's own words stays in the title;
//   - the place-order button is the form column's last button: its words without the amount are `placeOrderButtonLabel`, an
//     amount in them is the with-price style (`is-style-with-price`), and the mark between words and amount the
//     `priceSeparator` (empty when there is none, which removes WooCommerce's dot);
//   - a line of words after the steps: before the button it is an `sgs/commerce-note` before the actions block; after the
//     button, with a link it is the terms block's `text`, without one a note after the actions block;
//   - the order summary (the form column's sibling showing an amount): its first words are `sgsCheckoutStrings.summaryTitle`
//     and a link beside them `sgsSummaryEditLinkLabel`; the lines after its last row are notes in the totals block, a line
//     carrying an amount the pay-later message (`sgs/pay-later-message`); a loop line whose first text line is set in capitals
//     above the name shows the brand (`sgsItemShowBrand`);
//   - the contact step's tick box label is `createAccountLabel` and turns on WooCommerce's account creation at checkout, its
//     sign-in link `loginLink` (the words before it `loginPrefix`) and turns on the checkout's sign-in reminder, the email
//     field's label `emailLabel`, a town field's (`address-level2`) `cityLabel`; the express divider's words `expressDivider`;
//   - no note field (a textarea outside the gift step) removes WooCommerce's order-note block.
// Parts the draft does not draw keep WooCommerce's default (Bean's D-6). A setting the page already holds with another value
// is kept and noted, as the account piece does; a block the page already holds (the gift step, a note with the same words) is
// not placed twice. Only words, modes and blocks are written: the look is part-look's.
// `site-build.mjs --checkout-content [--apply]` runs it alone (`--content <file>` plans against a saved page instead of the
// site); a whole build runs it after the shop options. Pure apart from readCheckoutArtefacts and runCheckoutContent.
import fs from 'node:fs';
import path from 'node:path';
import { below, inventoryTree, tagAttrs } from './template-piece-account-read.mjs';
import { openTag } from './template-piece-draft.mjs';
import { parseTemplate } from './shop-parts-read.mjs';
import { logicOf } from './shop-parts-logic.mjs';
import { cutTo } from './template-piece-gift.mjs';
import { labelOf } from './part-look-modes.mjs';
import { draftLinksFor, resolveDraftLink } from './draft-link.mjs';
import { blocksOf, findBlock, insertBlock, newBlock, parseContent, removeBlock, serializeContent } from './checkout-content-markup.mjs';

export const WC = {
	checkout: 'woocommerce/checkout',
	fields: 'woocommerce/checkout-fields-block',
	totals: 'woocommerce/checkout-totals-block',
	summary: 'woocommerce/checkout-order-summary-block',
	contact: 'woocommerce/checkout-contact-information-block',
	address: 'woocommerce/checkout-shipping-address-block',
	methods: 'woocommerce/checkout-shipping-methods-block',
	payment: 'woocommerce/checkout-payment-block',
	actions: 'woocommerce/checkout-actions-block',
	terms: 'woocommerce/checkout-terms-block',
	orderNote: 'woocommerce/checkout-order-note-block',
};
export const GIFT = 'sgs/gift-order';
export const NOTE = 'sgs/commerce-note';
export const PAY_LATER = 'sgs/pay-later-message';
export const SIGNUP_OPTION = 'woocommerce_enable_signup_and_login_from_checkout';
export const REMINDER_OPTION = 'woocommerce_enable_checkout_login_reminder';
export const WITH_PRICE = 'is-style-with-price';
const WC_SEPARATOR = '·';

const ws = ( s ) => String( s ?? '' ).replace( /\s+/g, ' ' ).trim();
const squashAll = ( s ) => String( s ?? '' ).replace( /&amp;/g, '&' ).replace( /&#39;/g, "'" ).replace( /&quot;/g, '"' ).replace( /\s+/g, '' );
const HEADING = /^(h[1-6]|legend)$/;
const STEP_TAGS = [ 'section', 'fieldset', 'article' ];
const NOT_TYPED = [ 'checkbox', 'radio', 'hidden', 'submit', 'button', 'reset', 'image', 'file', 'range', 'color' ];
const AMOUNT_IN = /[£$€]\s?\d|\d\s?[£$€]/;
const LETTER = /\p{L}/u;
const live = ( s ) => /\{\{/.test( String( s ?? '' ) );
const shownAt = ( e, w ) => Boolean( e?.visible?.[ w ] );

// The checkout surface's artefacts for a client: { key, entry, inventory, source, file } (inventory or source null when its file
// is absent), or null when no surfaces.json entry builds the checkout template.
export function readCheckoutArtefacts( { repo, client } ) {
	const build = path.join( repo, 'sites', client, 'build' );
	const json = ( f ) => ( fs.existsSync( f ) ? JSON.parse( fs.readFileSync( f, 'utf8' ) ) : null );
	const surfaces = json( path.join( build, 'surfaces.json' ) ) || {};
	const key = Object.keys( surfaces ).find( ( k ) => 'checkout' === surfaces[ k ]?.target?.template );
	if ( ! key ) {
		return null;
	}
	const entry = surfaces[ key ];
	const folder = entry.draftDir ? path.resolve( repo, entry.draftDir ) : path.join( repo, 'sites', client, 'handoff' );
	const draft = entry.draftIndex ? path.join( folder, entry.draftIndex ) : null;
	return {
		key, entry,
		inventory: json( path.join( build, 'skeleton', `${ key }.inventory.json` ) ),
		source: draft && fs.existsSync( draft ) ? fs.readFileSync( draft, 'utf8' ) : null,
		file: entry.draftIndex || '',
	};
}

// The draft's template elements, each with its own words (its text runs joined), parent and children.
function templateElements( source ) {
	if ( ! source ) {
		return [];
	}
	const out = [];
	const go = ( n ) => ( n.children || [] ).forEach( ( c ) => {
		if ( c.tag ) {
			out.push( c );
			go( c );
		}
	} );
	go( parseTemplate( source ) );
	return out;
}
const ownText = ( t ) => ( t.children || [] ).filter( ( c ) => ! c.tag ).map( ( c ) => c.text ).join( ' ' );
const elementKids = ( t ) => ( t.children || [] ).filter( ( c ) => c.tag );
function* templateBelow( t ) {
	for ( const c of elementKids( t ) ) {
		yield c;
		yield* templateBelow( c );
	}
}

// What the checkout draft draws, read from the inventory (and the draft file for what only shows in another state):
// { steps, numbered, pay, notesBefore, notesAfter, terms, summary, strings, editLabel, brand, payLater, summaryNotes, orderNote,
// signup, reminder, gift, gaps }. `link( href )` resolves a draft link to a site address (null when it does not).
export function checkoutDraft( { inventory, source = null, link = () => null } ) {
	const gaps = [];
	const els = inventory?.elements || [];
	const byKey = new Map( els.map( ( e ) => [ e.key, e ] ) );
	const rootEl = els.find( ( e ) => e.tag === inventory?.root && Object.values( e.visible || {} ).some( Boolean ) );
	const tree = rootEl ? inventoryTree( inventory, rootEl.key ) : null;
	const empty = { steps: [], numbered: false, pay: null, notesBefore: [], notesAfter: [], terms: null, summary: null, strings: {}, editLabel: null, brand: false, payLater: false, summaryNotes: [], orderNote: true, signup: false, reminder: false, gift: null, gaps };
	if ( ! tree ) {
		gaps.push( 'the inventory has no shown page element, so nothing of the checkout is read' );
		return empty;
	}
	const all = below( tree );
	const rank = new Map( all.map( ( n, i ) => [ n, i ] ) );
	const el = ( n ) => byKey.get( n.key );
	const rendered = ( n ) => ws( el( n )?.words );
	const words = ( n ) => ( n.text && ! live( n.text ) ? n.text : rendered( n ) );
	const srcAttrs = ( n ) => tagAttrs( openTag( el( n )?.snippet ) );
	const typeOf = ( n ) => String( srcAttrs( n ).type ?? n.attrs.type ?? '' ).toLowerCase();
	const tokenOf = ( n ) => String( srcAttrs( n ).autocomplete ?? '' ).toLowerCase().trim();
	const isEntry = ( n ) => [ 'input', 'select', 'textarea' ].includes( n.tag ) && ! NOT_TYPED.includes( typeOf( n ) );
	const isTick = ( n ) => 'input' === n.tag && 'checkbox' === typeOf( n );
	const isControl = ( n ) => [ 'a', 'button' ].includes( n.tag ) || ( 'input' === n.tag && [ 'submit', 'button' ].includes( typeOf( n ) ) );
	const ancestors = ( n ) => {
		const out = [];
		for ( let p = n.parent; p; p = p.parent ) {
			out.push( p );
		}
		return out;
	};
	const inside = ( n, test ) => ancestors( n ).some( test );
	const hasWords = ( n ) => LETTER.test( rendered( n ) );

	// The draft's template node of an inventory node: the node's nearest own-worded descendant (or itself) found by its tag and
	// own words alone in the template (only when exactly one element matches), then climbed back up as many element levels as
	// the inventory climbs (the draft runtime's conditions and loops are template elements, never inventory ones).
	const tpl = templateElements( source );
	const templateOf = ( n ) => {
		const anchor = below( n ).find( ( d ) => d.text && ! live( d.text ) && LETTER.test( d.text ) );
		if ( ! anchor ) {
			return null;
		}
		const hits = tpl.filter( ( t ) => t.tag === anchor.tag && squashAll( ownText( t ) ) === squashAll( anchor.text ) );
		if ( 1 !== hits.length ) {
			return null;
		}
		let t = hits[ 0 ];
		for ( let i = n === anchor ? 0 : ancestors( anchor ).indexOf( n ) + 1; i > 0 && t; i-- ) {
			do {
				t = t.parent;
			} while ( t && /^sc-/.test( t.tag || '' ) );
		}
		return t && t.tag === n.tag ? t : null;
	};

	// The steps, the form column holding them and its place-order button.
	const steps = all.filter( ( n ) => STEP_TAGS.includes( n.tag ) && n.children[ 0 ] && HEADING.test( n.children[ 0 ].tag ) && below( n ).some( ( d ) => isEntry( d ) || isControl( d ) || isTick( d ) ) );
	if ( ! steps.length ) {
		gaps.push( 'the draft draws no checkout step (a section, fieldset or article led by a heading and holding a field or a choice)' );
		return empty;
	}
	const chains = steps.map( ( s ) => [ s, ...ancestors( s ) ] );
	const column = chains[ 0 ].find( ( a ) => chains.every( ( c ) => c.includes( a ) ) && ! steps.includes( a ) ) || tree;
	const pay = below( column ).filter( ( n ) => 'button' === n.tag || ( 'input' === n.tag && 'submit' === typeOf( n ) ) ).pop() || null;
	const fieldsIn = ( s ) => below( s ).filter( isEntry );
	const choicesIn = ( s ) => below( s ).filter( ( n ) => 'button' === n.tag && n !== pay );

	// The gift step: two choices, and a note box its template shows only under a condition (the gift branch).
	const giftOf = ( s ) => {
		if ( 2 !== choicesIn( s ).length ) {
			return null;
		}
		const t = templateOf( s );
		const branch = t ? [ ...templateBelow( t ) ].find( ( x ) => 'sc-if' === x.tag && [ ...templateBelow( x ) ].some( ( y ) => 'textarea' === y.tag ) ) : null;
		return branch ? { step: s, branch } : null;
	};
	const gifts = steps.map( giftOf ).filter( Boolean );
	const giftSteps = gifts.map( ( g ) => g.step );
	const contact = steps.find( ( s ) => fieldsIn( s ).some( ( f ) => 'email' === typeOf( f ) || 'email' === tokenOf( f ) ) ) || null;
	const rest = steps.filter( ( s ) => s !== contact && ! giftSteps.includes( s ) );
	const payment = rest.find( ( s ) => fieldsIn( s ).some( ( f ) => /^cc-/.test( tokenOf( f ) ) ) ) || [ ...rest ].reverse().find( ( s ) => fieldsIn( s ).length ) || null;
	const blocksFor = ( s ) => {
		if ( s === contact ) {
			return [ WC.contact ];
		}
		if ( s === payment ) {
			return [ WC.payment ];
		}
		if ( fieldsIn( s ).length ) {
			return choicesIn( s ).length ? [ WC.address, WC.methods ] : [ WC.address ];
		}
		return choicesIn( s ).length ? [ WC.methods ] : [];
	};
	const numberOf = ( h ) => ( h.children[ 0 ] && /^\d{1,2}$/.test( rendered( h.children[ 0 ] ) ) ? rendered( h.children[ 0 ] ) : null );
	const read = steps.map( ( s ) => {
		const h = s.children[ 0 ];
		const number = numberOf( h );
		const title = number ? ws( h.text && ! live( h.text ) ? h.text : rendered( h ) ) : words( h );
		live( h.text ) && gaps.push( `step ${ s.key }: its title is a live value ("${ h.text }"); the words it shows by default ("${ rendered( h ) }") are written` );
		return { key: s.key, title, number, gift: giftSteps.includes( s ), blocks: giftSteps.includes( s ) ? [ GIFT ] : blocksFor( s ) };
	} );
	read.filter( ( r ) => ! r.gift && ! r.blocks.length ).forEach( ( r ) => gaps.push( `step ${ r.key } ("${ r.title }") holds neither fields nor choices WooCommerce draws, so it has no block` ) );
	const titled = read.filter( ( r ) => ! r.gift && r.blocks.length );
	const numbered = titled.length > 0 && titled.every( ( r ) => r.number );

	// The place-order button's words, amount and separator.
	let payRead = null;
	if ( pay ) {
		const text = ws( el( pay )?.allText ?? rendered( pay ) );
		const label = labelOf( text );
		const withPrice = AMOUNT_IN.test( text );
		const mark = withPrice ? /^.*?([·•|–-])?\s*[£$€]?\s?\d/.exec( text.slice( label.length ) )?.[ 1 ] ?? '' : null;
		label ? ( payRead = { key: pay.key, label, withPrice, separator: mark } ) : gaps.push( `the place-order button ${ pay.key } has no words of its own` );
	}

	// The lines of words in the form column after the first step: notes and the terms line.
	const lineNodes = below( column ).filter( ( n ) => hasWords( n ) && ! HEADING.test( n.tag ) && ! isControl( n ) && ! [ 'label', 'span', 'b', 'strong', 'em', 'i' ].includes( n.tag ) && rank.get( n ) > rank.get( steps[ 0 ] ) && ! inside( n, ( a ) => isControl( a ) || 'label' === a.tag || HEADING.test( a.tag ) ) );
	const outer = lineNodes.filter( ( n ) => ! inside( n, ( a ) => lineNodes.includes( a ) ) );
	const afterPay = ( n ) => pay && rank.get( n ) > rank.get( pay );
	const linkOf = ( n ) => n.children.find( ( c ) => 'a' === c.tag ) || null;
	const noteOf = ( n ) => {
		const a = linkOf( n );
		const href = a ? srcAttrs( a ).href ?? '' : '';
		const url = a ? link( href, el( a ) ) : null;
		a && null === url && gaps.push( `note ${ n.key }: its link "${ href }" goes to no page of the site, so the note is written without it` );
		return { key: n.key, text: words( n ), ...( a && null !== url ? { linkLabel: words( a ), linkUrl: url } : {} ) };
	};
	const notesBefore = outer.filter( ( n ) => ! afterPay( n ) && ! steps.some( ( s ) => s === n || inside( n, ( a ) => a === s ) ) ).map( noteOf );
	const after = outer.filter( afterPay );
	const termsNode = after.find( ( n ) => linkOf( n ) ) || null;
	const notesAfter = after.filter( ( n ) => n !== termsNode ).map( noteOf );
	let terms = null;
	if ( termsNode ) {
		const t = templateOf( termsNode );
		if ( t ) {
			const esc = ( s ) => String( s ).replace( /&(?!amp;|lt;|gt;|quot;|#39;)/g, '&amp;' ).replace( /</g, '&lt;' ).replace( />/g, '&gt;' );
			let broken = false;
			const html = ( t.children || [] ).map( ( c ) => {
				if ( ! c.tag ) {
					return esc( c.text );
				}
				const url = 'a' === c.tag ? link( c.attrs.href ?? '', null ) : null;
				broken = broken || null === url;
				return `<a href="${ esc( url ?? '' ) }">${ esc( ws( ownText( c ) ) ) }</a>`;
			} ).join( '' ).replace( /\s+/g, ' ' ).trim();
			broken ? gaps.push( `terms ${ termsNode.key }: a link in it goes to no page of the site, so WooCommerce's terms words are kept` ) : ( terms = { key: termsNode.key, text: html, afterPay: true } );
		} else {
			gaps.push( `terms ${ termsNode.key }: its words are not found once in the draft's template, so WooCommerce's terms words are kept` );
		}
	}

	// The order summary: the form column's sibling showing an amount on a wide screen (a discount code box in it is no step).
	const summary = ( column.parent?.children || [] ).find( ( n ) => n !== column && ! isControl( n ) && shownAt( el( n ), '1440' ) && AMOUNT_IN.test( el( n )?.allText || '' ) ) || null;
	let summaryTitle = null;
	let editLabel = null;
	let brand = false;
	const summaryNotes = [];
	let payLater = false;
	if ( summary ) {
		const inner = below( summary ).slice( 1 );
		const firstAmount = inner.findIndex( ( n ) => AMOUNT_IN.test( rendered( n ) ) );
		const title = inner.find( ( n, i ) => ( firstAmount < 0 || i < firstAmount ) && hasWords( n ) && ! isControl( n ) );
		if ( title ) {
			summaryTitle = words( title );
			const edit = title.parent.children.find( ( c ) => c !== title && isControl( c ) && hasWords( c ) );
			edit && ( editLabel = words( edit ) );
		}
		// The lines after the summary's last row: its trailing children with words of their own.
		const kids = summary.children;
		for ( let i = kids.length - 1; i >= 0 && hasWords( kids[ i ] ) && kids[ i ] !== title; i-- ) {
			const n = kids[ i ];
			AMOUNT_IN.test( rendered( n ) ) || live( n.text ) ? ( payLater = true ) : summaryNotes.unshift( noteOf( n ) );
		}
		const t = title ? templateOf( summary ) : null;
		const loop = t ? [ ...templateBelow( t ) ].find( ( x ) => 'sc-for' === x.tag ) : null;
		brand = !! loop && [ ...templateBelow( loop ) ].some( ( x ) => {
			const k = elementKids( x );
			const holeOnly = ( y ) => /^\s*\{\{[^}]+\}\}\s*$/.test( ownText( y ) ) && ! elementKids( y ).length;
			return k.length >= 2 && k.every( holeOnly ) && /text-transform\s*:\s*uppercase/i.test( k[ 0 ].attrs.style || '' ) && ! /text-transform\s*:\s*uppercase/i.test( k[ 1 ].attrs.style || '' );
		} );
		! t && gaps.push( `summary ${ summary.key }: its template is not found once in the draft, so whether its lines show a brand is not read` );
	} else {
		gaps.push( 'no order summary (the form column\'s sibling showing an amount) is found, so its words are not read' );
	}

	// The contact step's words, and the express divider's.
	const strings = {};
	summaryTitle && ( strings.summaryTitle = summaryTitle );
	const divider = all.find( ( n ) => rank.get( n ) < rank.get( steps[ 0 ] ) && hasWords( n ) && n.children.length >= 2 && n.children.every( ( c ) => ! rendered( c ) && ! c.children.length ) );
	divider && ( strings.expressDivider = words( divider ) );
	let signup = false;
	let reminder = false;
	if ( contact ) {
		const tickLabel = below( contact ).find( ( n ) => 'label' === n.tag && below( n ).some( isTick ) );
		const tickWords = tickLabel ? below( tickLabel ).find( ( d ) => hasWords( d ) && ! isEntry( d ) ) : null;
		if ( tickWords ) {
			strings.createAccountLabel = words( tickWords );
			signup = true;
		}
		const login = below( contact ).find( ( n ) => isControl( n ) && n !== pay && hasWords( n ) && ! inside( n, ( a ) => 'label' === a.tag ) );
		if ( login ) {
			strings.loginLink = words( login );
			reminder = true;
			login.parent !== contact && hasWords( login.parent ) && ( strings.loginPrefix = `${ words( login.parent ) } ` );
		}
		const fieldName = ( f ) => ws( ancestors( f ).find( ( a ) => 'label' === a.tag )?.text ) || ws( srcAttrs( f ).placeholder );
		const email = fieldsIn( contact ).find( ( f ) => 'email' === typeOf( f ) || 'email' === tokenOf( f ) );
		email && fieldName( email ) && ( strings.emailLabel = fieldName( email ) );
		const city = all.find( ( f ) => isEntry( f ) && 'address-level2' === tokenOf( f ) );
		city && fieldName( city ) && ( strings.cityLabel = fieldName( city ) );
	}

	// A note field outside the gift step keeps WooCommerce's order note.
	const orderNote = below( column ).some( ( n ) => 'textarea' === n.tag && ! giftSteps.some( ( g ) => inside( n, ( a ) => a === g ) ) );

	// The gift step's settings (Spec 27 FR-30-21's step words): its title, the two tiles (the heading line, then the words), and
	// the gift branch's name and note fields with their labels, placeholder and lengths, and its own line.
	let gift = null;
	if ( gifts.length ) {
		const g = gifts[ 0 ];
		const L = logicOf( source || '' );
		const attrs = { stepTitle: read.find( ( r ) => r.key === g.step.key ).title };
		choicesIn( g.step ).forEach( ( b, i ) => {
			const head = b.children.find( ( c ) => hasWords( c ) );
			const [ lab, txt ] = i ? [ 'optionGiftLabel', 'optionGiftText' ] : [ 'optionMeLabel', 'optionMeText' ];
			head && ( attrs[ lab ] = words( head ) );
			b.text && ! live( b.text ) && ( attrs[ txt ] = ws( b.text ) );
		} );
		const branch = [ ...templateBelow( g.branch ) ];
		const labelText = ( f ) => {
			for ( let p = f.parent; p && p !== g.branch; p = p.parent ) {
				if ( 'label' === p.tag ) {
					return ws( ownText( p ) );
				}
			}
			return '';
		};
		const handler = ( f ) => String( f.attrs.onChange ?? f.attrs.onchange ?? '' ).replace( /^\{\{\s*|\s*\}\}$/g, '' ).trim();
		const name = branch.find( ( x ) => 'input' === x.tag && ! NOT_TYPED.includes( String( x.attrs.type ?? '' ).toLowerCase() ) );
		const note = branch.find( ( x ) => 'textarea' === x.tag );
		if ( name ) {
			labelText( name ) && ( attrs.recipientLabel = labelText( name ) );
			const cut = L ? cutTo( L, handler( name ) ) : null;
			null !== cut && ( attrs.recipientLimit = cut );
		}
		labelText( note ) && ( attrs.messageLabel = labelText( note ) );
		note.attrs.placeholder && ( attrs.messagePlaceholder = ws( note.attrs.placeholder ) );
		const cut = L ? cutTo( L, handler( note ) ) : null;
		null !== cut && ( attrs.messageLimit = cut );
		const line = branch.find( ( x ) => LETTER.test( ownText( x ) ) && ! live( ownText( x ) ) && ! [ 'label', 'button', 'a' ].includes( x.tag ) && ! [ ...branch ].some( ( p ) => 'label' === p.tag && [ ...templateBelow( p ) ].includes( x ) ) );
		line && ( attrs.giftOnlyLine = ws( ownText( line ) ) );
		gift = { key: g.step.key, attrs };
	}

	return { steps: read, numbered, pay: payRead, notesBefore, notesAfter, terms, summary: summary?.key ?? null, strings, editLabel, brand, payLater, summaryNotes, orderNote, signup, reminder, gift, gaps };
}

// The plan from what the draft draws: { sets: [ { block, attrs, why } ], removes: [ { block, why } ], moves: [ { block, after,
// why } ], inserts: [ { block, attrs, parent, anchor, before, why } ], options: [ { name, value, why } ] }. Every block is named by WooCommerce's or SGS's block name.
export function planCheckoutContent( draft ) {
	const sets = [];
	const removes = [];
	const inserts = [];
	const moves = [];
	const options = [];
	const checkoutAttrs = {};
	draft.numbered && ( checkoutAttrs.showFormStepNumbers = true );
	Object.keys( draft.strings ).length && ( checkoutAttrs.sgsCheckoutStrings = { ...draft.strings } );
	draft.editLabel && ( checkoutAttrs.sgsSummaryEditLinkLabel = draft.editLabel );
	draft.brand && ( checkoutAttrs.sgsItemShowBrand = true );
	Object.keys( checkoutAttrs ).length && sets.push( { block: WC.checkout, attrs: checkoutAttrs, why: 'the draft\'s words for the summary, the contact step and the express divider, and its step numbers' } );
	const mapped = draft.steps.filter( ( s ) => s.blocks.length );
	for ( const s of mapped.filter( ( x ) => ! x.gift ) ) {
		s.blocks.forEach( ( block, i ) => sets.push( { block, attrs: { title: i ? '' : s.title }, why: i ? `step ${ s.key } draws this part inside "${ s.title }", so it has no heading of its own` : `step ${ s.key }'s heading` } ) );
	}
	if ( draft.pay ) {
		const attrs = { placeOrderButtonLabel: draft.pay.label };
		draft.pay.withPrice && ( attrs.className = WITH_PRICE );
		draft.pay.withPrice && draft.pay.separator !== WC_SEPARATOR && ( attrs.priceSeparator = draft.pay.separator );
		sets.push( { block: WC.actions, attrs, why: `the place-order button ${ draft.pay.key }` } );
	}
	draft.terms && sets.push( { block: WC.terms, attrs: { text: draft.terms.text }, why: `the terms line ${ draft.terms.key }` } );
	draft.terms?.afterPay && moves.push( { block: WC.terms, after: WC.actions, why: `the terms line ${ draft.terms.key } sits below the place-order button` } );
	draft.orderNote || removes.push( { block: WC.orderNote, why: 'the draft draws no note field' } );
	if ( draft.gift ) {
		const at = mapped.findIndex( ( s ) => s.gift );
		const before = mapped.slice( 0, at ).reverse().find( ( s ) => ! s.gift );
		const next = mapped.slice( at + 1 ).find( ( s ) => ! s.gift );
		inserts.push( { block: GIFT, attrs: draft.gift.attrs, parent: WC.fields, anchor: before ? before.blocks[ before.blocks.length - 1 ] : next?.blocks[ 0 ] ?? null, before: ! before, why: `the gift step ${ draft.gift.key }` } );
	}
	const noteAttrs = ( n ) => ( { text: n.text, ...( n.linkLabel ? { linkLabel: n.linkLabel, linkUrl: n.linkUrl } : {} ) } );
	draft.notesBefore.forEach( ( n ) => inserts.push( { block: NOTE, attrs: noteAttrs( n ), parent: WC.fields, anchor: WC.actions, before: true, why: `the note ${ n.key } above the place-order button` } ) );
	[ ...draft.notesAfter ].reverse().forEach( ( n ) => inserts.push( { block: NOTE, attrs: noteAttrs( n ), parent: WC.fields, anchor: WC.actions, before: false, why: `the note ${ n.key } below the place-order button` } ) );
	draft.payLater && inserts.push( { block: PAY_LATER, attrs: {}, parent: WC.totals, anchor: null, before: false, why: 'the summary\'s line carrying an instalment amount' } );
	draft.summaryNotes.forEach( ( n ) => inserts.push( { block: NOTE, attrs: noteAttrs( n ), parent: WC.totals, anchor: null, before: false, why: `the summary's closing line ${ n.key }` } ) );
	draft.signup && options.push( { name: SIGNUP_OPTION, value: 'yes', why: 'the contact step draws a tick box to create an account' } );
	draft.reminder && options.push( { name: REMINDER_OPTION, value: 'yes', why: 'the contact step draws a sign-in link' } );
	return { sets, removes, moves, inserts, options };
}

const same = ( a, b ) => JSON.stringify( a ) === JSON.stringify( b );

// The plan applied to the page's markup: { content, changes: [ text ], notes: [ text ] }. A setting the block holds with
// another value is kept and noted; a class is added beside the block's own; a block already there is not placed again.
export function applyCheckoutPlan( text, plan ) {
	const tree = parseContent( text );
	const changes = [];
	const notes = [];
	const checkout = blocksOf( tree ).find( ( x ) => x.block.name === WC.checkout )?.block;
	if ( ! checkout ) {
		notes.push( 'the checkout page holds no woocommerce/checkout block, so its words are not written' );
		return { content: text, changes, notes };
	}
	const blockOf = ( name ) => ( name === WC.checkout ? checkout : findBlock( checkout, name )?.block ?? null );
	const write = ( b, key, value ) => {
		b.attrs[ key ] = value;
		b.changed = true;
		changes.push( `${ b.name } ${ key }: ${ JSON.stringify( value ) }` );
	};
	for ( const s of plan.sets ) {
		const b = blockOf( s.block );
		if ( ! b ) {
			notes.push( `${ s.block }: the page holds no such block, so ${ Object.keys( s.attrs ).join( ', ' ) } (${ s.why }) is not written` );
			continue;
		}
		for ( const [ key, value ] of Object.entries( s.attrs ) ) {
			const held = b.attrs[ key ];
			if ( 'className' === key ) {
				const classes = String( held ?? '' ).split( /\s+/ ).filter( Boolean );
				if ( ! classes.includes( value ) ) {
					write( b, key, [ ...classes, value ].join( ' ' ) );
					// The block's saved wrapper carries its classes too (WordPress's save output, which the editor checks the markup against).
					'string' === typeof b.inner[ 0 ] && ( b.inner[ 0 ] = b.inner[ 0 ].replace( /^(\s*<[a-z][a-z0-9-]*\b[^>]*?\sclass=")([^"]*)"/i, ( m, head, list ) => ( list.split( /\s+/ ).includes( value ) ? m : `${ head }${ list } ${ value }"` ) ) );
				}
				continue;
			}
			if ( value && 'object' === typeof value && ! Array.isArray( value ) ) {
				const merged = { ...( held && 'object' === typeof held ? held : {} ) };
				let moved = false;
				for ( const [ k, v ] of Object.entries( value ) ) {
					if ( undefined === merged[ k ] ) {
						merged[ k ] = v;
						moved = true;
					} else if ( ! same( merged[ k ], v ) ) {
						notes.push( `${ b.name } ${ key }.${ k }: the page holds ${ JSON.stringify( merged[ k ] ) }, kept (the draft says ${ JSON.stringify( v ) })` );
					}
				}
				moved && write( b, key, merged );
				continue;
			}
			if ( undefined === held ) {
				write( b, key, value );
			} else if ( ! same( held, value ) ) {
				notes.push( `${ b.name } ${ key }: the page holds ${ JSON.stringify( held ) }, kept (the draft says ${ JSON.stringify( value ) }: ${ s.why })` );
			}
		}
	}
	for ( const r of plan.removes ) {
		const hit = findBlock( checkout, r.block );
		if ( hit ) {
			removeBlock( hit.parent, hit.block );
			changes.push( `${ r.block } removed (${ r.why })` );
		}
	}
	for ( const mv of plan.moves || [] ) {
		const hit = findBlock( checkout, mv.block );
		const anchor = findBlock( checkout, mv.after );
		if ( hit && anchor && hit.parent === anchor.parent && hit.parent.inner.indexOf( hit.block ) < hit.parent.inner.indexOf( anchor.block ) ) {
			removeBlock( hit.parent, hit.block );
			insertBlock( hit.parent, hit.block, { anchor: anchor.block } );
			changes.push( `${ mv.block } moved after ${ mv.after } (${ mv.why })` );
		}
	}
	for ( const ins of plan.inserts ) {
		const existing = blocksOf( checkout ).map( ( x ) => x.block ).filter( ( b ) => b.name === ins.block );
		if ( GIFT === ins.block && existing.length ) {
			notes.push( `${ GIFT}: the page already holds one, so it is not placed again (its words are left as they are)` );
			continue;
		}
		if ( NOTE === ins.block && existing.some( ( b ) => b.attrs.text === ins.attrs.text ) ) {
			continue;
		}
		if ( PAY_LATER === ins.block && existing.length ) {
			continue;
		}
		const parent = blockOf( ins.parent );
		if ( ! parent ) {
			notes.push( `${ ins.block }: the page holds no ${ ins.parent }, so ${ ins.why } is not placed` );
			continue;
		}
		const anchor = ins.anchor ? parent.inner.find( ( x ) => 'string' !== typeof x && x.name === ins.anchor ) ?? null : null;
		insertBlock( parent, newBlock( ins.block, ins.attrs ), { anchor, before: ins.before } );
		changes.push( `${ ins.block } placed in ${ ins.parent }${ anchor ? ` ${ ins.before ? 'before' : 'after' } ${ ins.anchor }` : '' } (${ ins.why }): ${ JSON.stringify( ins.attrs ) }` );
	}
	return { content: changes.length ? serializeContent( tree ) : text, changes, notes };
}

// The page's block tree as indented lines of block names and the settings this step writes (for the dry run and the offline print).
export function outlineContent( text ) {
	const lines = [];
	const shown = [ 'title', 'placeOrderButtonLabel', 'priceSeparator', 'className', 'text', 'linkLabel', 'linkUrl', 'showFormStepNumbers', 'sgsCheckoutStrings', 'sgsSummaryEditLinkLabel', 'sgsItemShowBrand', 'stepTitle', 'optionMeLabel', 'optionMeText', 'optionGiftLabel', 'optionGiftText', 'recipientLabel', 'messageLabel', 'messagePlaceholder', 'giftOnlyLine', 'recipientLimit', 'messageLimit' ];
	const go = ( node, depth ) => node.inner.forEach( ( x ) => {
		if ( 'string' === typeof x ) {
			return;
		}
		const attrs = Object.fromEntries( Object.entries( x.attrs ).filter( ( [ k ] ) => shown.includes( k ) ) );
		lines.push( `${ '  '.repeat( depth ) }${ x.name }${ Object.keys( attrs ).length ? ` ${ JSON.stringify( attrs ) }` : '' }` );
		go( x, depth + 1 );
	} );
	go( parseContent( text ), 0 );
	return lines;
}

// The draft read and the plan for a client: { draft, plan } or { why } when there is nothing to read.
export function checkoutPlanFor( { repo, client } ) {
	const a = readCheckoutArtefacts( { repo, client } );
	if ( ! a ) {
		return { why: 'surfaces.json has no surface building the checkout template' };
	}
	if ( ! a.inventory ) {
		return { why: `no inventory at sites/${ client }/build/skeleton/${ a.key }.inventory.json` };
	}
	const ctx = draftLinksFor( { repo, client } );
	const link = ( href ) => {
		const r = resolveDraftLink( href, ctx, { file: a.file } );
		return 'address' === r.kind || 'external' === r.kind ? r.value : null;
	};
	const draft = checkoutDraft( { inventory: a.inventory, source: a.source, link } );
	return { draft, plan: planCheckoutContent( draft ) };
}

const PAGE = "(int) get_option( 'woocommerce_checkout_page_id' )";
const readPhp = () => `$id = ${ PAGE }; $p = $id ? get_post( $id ) : null; echo wp_json_encode( array( 'id' => $id, 'content' => $p ? base64_encode( $p->post_content ) : null, 'options' => array( '${ SIGNUP_OPTION }' => (string) get_option( '${ SIGNUP_OPTION }' ), '${ REMINDER_OPTION }' => (string) get_option( '${ REMINDER_OPTION }' ) ) ) );`;
const writePhp = ( id, content, options ) => `kses_remove_filters(); $r = wp_update_post( wp_slash( array( 'ID' => ${ Number( id ) }, 'post_content' => base64_decode( '${ Buffer.from( content, 'utf8' ).toString( 'base64' ) }' ) ) ), true ); ${ options.map( ( o ) => `update_option( '${ o.name }', '${ o.value }' );` ).join( ' ' ) } echo wp_json_encode( array( 'ok' => ! is_wp_error( $r ), 'error' => is_wp_error( $r ) ? $r->get_error_message() : '' ) );`;
const json = ( text, what ) => {
	const s = String( text );
	const start = s.indexOf( '{' );
	if ( start < 0 ) {
		throw new Error( `the ${ what } printed no JSON: ${ s.slice( 0, 300 ) }` );
	}
	return JSON.parse( s.slice( start ) );
};

// The checkout page and options as the site holds them: { id, content (null: no page), options }.
export function readCheckoutPage( runPhp ) {
	const r = json( runPhp( readPhp() ), 'checkout page read' );
	return { id: r.id, content: null === r.content ? null : Buffer.from( r.content, 'base64' ).toString( 'utf8' ), options: r.options || {} };
}

// Runs the step: prints the plan, and with `apply` writes the page and the options and reads them back. `content` (a saved page's
// markup) plans against it instead of the site and never writes. Returns the exit code (0 done or nothing to do, 1 the read-back
// disagrees).
export function runCheckoutContent( { repo, client, runPhp = null, apply = false, content = null, log = console.log, error = console.error } ) {
	const got = checkoutPlanFor( { repo, client } );
	if ( got.why ) {
		log( `checkout content: nothing to do (${ got.why })` );
		return 0;
	}
	const { draft, plan } = got;
	draft.gaps.forEach( ( g ) => log( `note: ${ g }` ) );
	const site = null === content ? readCheckoutPage( runPhp ) : { id: 0, content, options: {} };
	if ( null === site.content ) {
		log( 'checkout content: the site has no checkout page (woocommerce_checkout_page_id), so nothing is written' );
		return 0;
	}
	const result = applyCheckoutPlan( site.content, plan );
	result.notes.forEach( ( n ) => log( `note: ${ n }` ) );
	const options = null === content ? plan.options.filter( ( o ) => site.options[ o.name ] !== o.value ) : plan.options;
	result.changes.forEach( ( c ) => log( `checkout content: ${ c }` ) );
	options.forEach( ( o ) => log( `checkout content: option ${ o.name }: ${ JSON.stringify( site.options[ o.name ] ?? '' ) } -> ${ o.value } (${ o.why })` ) );
	if ( null !== content ) {
		log( 'checkout content: the planned page tree' );
		outlineContent( result.content ).forEach( ( l ) => log( `  ${ l }` ) );
		return 0;
	}
	if ( ! result.changes.length && ! options.length ) {
		log( 'checkout content: nothing to do' );
		return 0;
	}
	if ( ! apply ) {
		log( `checkout content: ${ result.changes.length } page change(s) and ${ options.length } option(s) on page ${ site.id } (dry run: re-run with --apply)` );
		return 0;
	}
	const w = json( runPhp( writePhp( site.id, result.content, options ) ), 'checkout page write' );
	if ( ! w.ok ) {
		error( `FAILED: the checkout page ${ site.id } was not saved: ${ w.error }` );
		return 1;
	}
	const back = readCheckoutPage( runPhp );
	const stuck = options.filter( ( o ) => back.options[ o.name ] !== o.value );
	if ( back.content !== result.content || stuck.length ) {
		error( `FAILED: after the write ${ back.content !== result.content ? `the checkout page ${ site.id } holds other markup than was written` : '' }${ stuck.map( ( o ) => ` ${ o.name } reads ${ JSON.stringify( back.options[ o.name ] ) }` ).join( ',' ) }` );
		return 1;
	}
	log( `checkout content: page ${ site.id } written and read back (${ result.changes.length } change(s))${ options.length ? `; ${ options.map( ( o ) => `${ o.name } now reads "${ o.value }"` ).join( ', ' ) }` : '' }` );
	return 0;
}
