// A choice flow read from the fact record (Spec 48 FR-48-6, rules.choiceFlow; Spec 43). The page map says which surface is a
// flow (lib/skeleton-surface-role.mjs); this file says what it holds, from the template and the logic's recorded values, never
// from the rendered page alone (a flow renders one step at a time) and never from a name:
//   question  a loop (`sc-for`) whose item holds a button its click handler binds to the loop item (`{{ o.pick }}`). Its
//             container is the highest element above the loop holding no other question and no other control; its words are
//             the container's own text (else the text just before it): a heading (else the first text) is the question, a
//             text before it the eyebrow or the flow's step count ("Question 1 of 3"), the text after it the intro. Each
//             option is one loop item: the first recorded text of its button is the label, a text that is not a price the
//             description, a recorded text under a condition outside the button its help text. A value is read only when
//             the loop recorded one distinct value per item; otherwise the field is left out and a note says why.
//   panel     a condition (`sc-if`) in a question's container after its options: a step the question opens underneath
//             (FR-43-26), holding the panel's fields and a result; options and panels pair in order when their counts match.
//   pieces    the flow's aside is the summary (FR-43-19); a close, skip, add-to-bag, continue or back button (by its handler or
//             words, rules.choiceFlow patterns) is the flow's own setting.
//   the rest  lib/skeleton-choice-flow-canvas.mjs: a choice between pressable buttons (a question where its buttons sit, with
//             the step its revealing option opens), the summary line and stage note, and the canvas groups (blocks of the
//             flow post beside the flow; a lone heading the flow title).
// What the family cannot hold is never dropped: lib/skeleton-choice-flow-tree.mjs::settleFlowRows makes each rendered element
// with words or a control outside every covered piece a gap row, and the notes and hand-overs here reach the review.
import { specHit } from './skeleton-facts.mjs';
import { brandOwnsAddress } from './brand-registry.mjs';
import { toggleGroups, summaryOf as summaryLine, stageNoteOf, canvasOf } from './skeleton-choice-flow-canvas.mjs';
import { flowPieces } from './skeleton-choice-flow-refs.mjs';
import { slugify } from './catalogue-read.mjs';

const HEADING = /^h[1-6]$/;
const FIELD_TAGS = new Set( [ 'input', 'select', 'textarea', 'sc-raw-select' ] );
const BOUND = /\{\{/;
const LINK_SOURCES = new Set( [ 'phone', 'email', 'whatsapp' ] );
const NOTE_ICONS = new Set( [ 'whatsapp', 'phone', 'email' ] );
const squash = ( s ) => String( s ?? '' ).replace( /\s+/g, ' ' ).trim();
const slug = ( s ) => squash( s ).toLowerCase().replace( /[^a-z0-9]+/g, '-' ).replace( /^-+|-+$/g, '' );

// The record's template tree under one root, in document order (a template element's number grows down the document).
function recordTree( els, rootKey ) {
	const comp = els[ rootKey ]?.template.component;
	const kids = new Map();
	for ( const [ k, v ] of Object.entries( els ) ) {
		const p = v.template.parent;
		v.template.component === comp && p && ( kids.get( p ) ?? kids.set( p, [] ).get( p ) ).push( k );
	}
	const num = ( k ) => Number( els[ k ].template.n );
	kids.forEach( ( list ) => list.sort( ( a, b ) => num( a ) - num( b ) ) );
	const desc = ( k ) => ( kids.get( k ) || [] ).flatMap( ( c ) => [ c, ...desc( c ) ] );
	return { kids: ( k ) => kids.get( k ) || [], desc, parent: ( k ) => els[ k ]?.template.parent ?? null, num };
}

// o: { view (lib/skeleton-record.mjs::recordView), rootKey (the flow root's record key), R (rules.choiceFlow), formControl
// (rules.formControl), brands (lib/brand-registry.mjs), surfaceKind, parts (the surface's surfaces.json parts, from
// surfaceContext), sale (lib/flow-product.mjs::flowSale: the catalogue product the flow sells and the render bindings of the
// question loops that are its attributes; a question whose loop draws one is that attribute's product-option step,
// `productAttribute`, Spec 43 FR-43-10) }. Returns { attributes (the root's settings), steps [{ key, label, question?, fields [{ block, label, key }],
// result?, parts? (the record keys of the question's own pieces: heading, intro, description, badge, toggle), wrapper? (the
// record key of the step's own element: a panel's), resultAt? (the record key a result part's result is drawn from) }], covered (record key -> what draws it), copies
// [{ words, reason }], pieces (lib/skeleton-choice-flow-refs.mjs::flowPieces: the record keys of the flow's own pieces),
// handovers, notes, missing [{ key, line, why }] (what a product-option step cannot draw, a missing feature on the
// question's row) }.
export function choiceFlowModel( { view, rootKey, R, formControl = null, brands = [], surfaceKind = null, parts = [], sale = null } ) {
	const els = view.elements || {};
	const out = { attributes: {}, steps: [], covered: new Map(), copies: [], handovers: [], notes: [], missing: [] };
	if ( ! rootKey || ! els[ rootKey ] ) {
		out.notes.push( 'the flow root has no fact record entry: its questions cannot be read' );
		return out;
	}
	const t = recordTree( els, rootKey );
	const rec = ( k ) => els[ k ].template;
	const real = ( k ) => ! /^sc-/.test( rec( k ).realTag );
	const literal = ( k ) => ( ( w ) => ( w && ! BOUND.test( w ) ? w : '' ) )( squash( rec( k ).words ) );
	const words = ( k ) => [ k, ...t.desc( k ) ].map( literal ).filter( Boolean ).join( ' ' );
	const handler = ( k ) => rec( k ).events?.find( ( ev ) => /^onclick$/i.test( ev.name ) )?.expr ?? /^\{\{\s*([^}\s]+)\s*\}\}$/.exec( rec( k ).attrs?.onClick ?? '' )?.[ 1 ] ?? '';
	const control = ( k ) => [ 'button', 'a' ].includes( rec( k ).realTag ) || !! handler( k );
	const values = ( k, hole ) => {
		const a = els[ k ].logic?.holes?.[ hole.id ] || {};
		const at = a[ 1440 ] ?? Object.values( a )[ 0 ];
		return at && ! at.err ? { v: ( at.v || [] ).filter( ( x ) => [ 'string', 'number' ].includes( x.t ) ).map( ( x ) => squash( x.v ) ), n: at.n, loop: !! at.loop, more: at.more ?? 0 } : null;
	};
	const textHoles = ( list ) => list.flatMap( ( k ) => rec( k ).holes.filter( ( h ) => 'text' === h.where ).map( ( h ) => ( { k, vals: values( k, h ) } ) ) );
	const firstValue = ( k ) => textHoles( [ k, ...t.desc( k ) ] ).map( ( x ) => x.vals?.v[ 0 ] ).find( Boolean ) || '';
	const cover = ( k, why ) => [ k, ...t.desc( k ) ].forEach( ( x ) => out.covered.has( x ) || out.covered.set( x, why ) );
	const all = t.desc( rootKey );
	const price = ( v ) => !! specHit( R.price, v );

	// The option loops: the button its handler binds to the item, and the item count the list recorded.
	const loops = all.filter( ( k ) => 'sc-for' === rec( k ).realTag && rec( k ).attrs?.as ).map( ( k ) => {
		const as = rec( k ).attrs.as;
		const button = t.desc( k ).find( ( d ) => 'button' === rec( d ).realTag && handler( d ).startsWith( `${ as }.` ) );
		const list = rec( k ).holes.find( ( h ) => 'attr:list' === h.where );
		const counted = list ? ( els[ k ].logic?.holes?.[ list.id ]?.[ 1440 ]?.v?.[ 0 ]?.n ?? null ) : null;
		return button ? { k, as, button, path: list?.path ?? null, count: counted ?? Math.max( 0, ...textHoles( t.desc( k ) ).map( ( x ) => x.vals?.n ?? 0 ) ) } : null;
	} ).filter( Boolean );
	const inLoop = ( loop ) => new Set( [ loop.k, ...t.desc( loop.k ) ] );
	// The question's container: up from the loop while the element holds no other loop and no control outside this one.
	const containerOf = ( loop ) => {
		const mine = inLoop( loop );
		const fits = ( k ) => ! t.desc( k ).some( ( d ) => ! mine.has( d ) && ( control( d ) || loops.some( ( o ) => o.k === d ) ) );
		let best = t.parent( loop.k );
		for ( let p = t.parent( best ); p && p !== rootKey && fits( p ); p = t.parent( p ) ) {
			real( p ) && ( best = p );
		}
		return best;
	};

	const add = R.addToBag;
	const pieces = { close: null, skip: null, add: null, next: null, back: null };
	const questions = loops.map( ( loop ) => {
		const box = containerOf( loop );
		const mine = inLoop( loop );
		const after = Math.max( ...[ ...mine ].map( t.num ) );
		const panels = t.desc( box ).filter( ( k ) => 'sc-if' === rec( k ).realTag && ! mine.has( k ) && t.num( k ) > after && ! String( rec( k ).attrs?.value ?? '' ).includes( `${ loop.as }.` ) );
		const top = panels.filter( ( k ) => ! panels.some( ( o ) => o !== k && t.desc( o ).includes( k ) ) );
		const skip = new Set( [ ...mine, ...top.flatMap( ( k ) => [ k, ...t.desc( k ) ] ) ] );
		let texts = t.desc( box ).filter( ( k ) => ! skip.has( k ) && real( k ) && literal( k ) );
		const lead = [];
		// No words in the container: the sibling just before it, when it holds text and no control (a label above a row of chips).
		if ( ! texts.length ) {
			const sibs = t.kids( t.parent( box ) );
			const s = sibs[ sibs.indexOf( box ) - 1 ];
			s && ( literal( s ) || t.desc( s ).some( literal ) ) && ! [ s, ...t.desc( s ) ].some( ( d ) => control( d ) || loops.some( ( o ) => o.k === d ) ) && lead.push( s );
			texts = lead.flatMap( ( x ) => [ x, ...t.desc( x ) ] ).filter( literal );
		}
		const bound = t.desc( box ).filter( ( k ) => ! skip.has( k ) && BOUND.test( rec( k ).words || '' ) );
		return { loop, box, mine, panels: top, texts, lead, bound };
	} );
	const boxes = questions.map( ( q ) => q.box );
	const inQuestion = new Set( questions.flatMap( ( q ) => [ q.box, ...t.desc( q.box ), ...q.lead.flatMap( ( s ) => [ s, ...t.desc( s ) ] ) ] ) );

	// The flow's own controls outside the questions, by handler or words.
	for ( const k of all.filter( ( x ) => ! inQuestion.has( x ) && control( x ) ) ) {
		const h = handler( k );
		const w = words( k ) || firstValue( k );
		const which = specHit( R.close, h ) || specHit( R.close, w ) || specHit( R.close, literal( k ) ) ? 'close'
			: specHit( R.skip, literal( k ) ) ? 'skip'
				: specHit( add?.handlers, h ) || specHit( add?.words, w ) ? 'add'
					: specHit( R.next, h ) ? 'next' : specHit( R.back, h ) ? 'back' : null;
		which && ! pieces[ which ] && ( pieces[ which ] = k );
	}
	const aside = all.find( ( k ) => ! inQuestion.has( k ) && 'aside' === rec( k ).realTag ) || null;
	const resultAction = pieces.add ? 'add-to-bag' : 'recommend';
	const addAttrs = {};
	if ( pieces.add ) {
		const own = words( pieces.add );
		own && ! BOUND.test( own ) && ( addAttrs.addToBasketLabel = own );
		textHoles( [ pieces.add, ...t.desc( pieces.add ) ] ).some( ( x ) => x.vals?.v.some( price ) ) && ( addAttrs.buttonShowsTotal = true );
	}

	// The steps: each question, then the steps its panels open; a choice between pressable buttons is a question where its
	// buttons sit, followed by what its revealing option shows (lib/skeleton-choice-flow-canvas.mjs).
	const x = { els, t, rec, real, literal, control, textHoles, firstValue, price, all, rootKey, loops, inQuestion };
	const toggles = toggleGroups( x );
	const shownBy = new Map();
	toggles.forEach( ( g ) => g.reveal && questions.forEach( ( q ) => t.desc( g.reveal ).includes( q.loop.k ) && shownBy.set( q, g ) ) );
	const counts = [];
	const emitQuestion = ( q ) => {
		const qi = questions.indexOf( q );
		const heading = q.texts.find( ( k ) => HEADING.test( rec( k ).realTag ) ) ?? q.texts[ 0 ];
		const at = q.texts.indexOf( heading );
		const before = q.texts.slice( 0, Math.max( 0, at ) ).map( literal );
		const intro = q.texts.slice( at + 1 ).map( literal ).join( ' ' );
		const stripped = heading ? literal( heading ).replace( new RegExp( R.stepNumber?.patterns?.[ 0 ] ?? '^$' ), '' ) : '';
		const question = { question: stripped };
		const count = before[ 0 ] ? new RegExp( R.countLabel?.patterns?.[ 0 ] ?? '^$', R.countLabel?.flags ?? '' ).exec( before[ 0 ] ) : null;
		count ? counts.push( count[ 1 ] ) : before.length && ( question.eyebrow = before.join( ' ' ) );
		intro && ( question.intro = intro );
		! stripped && out.notes.push( `question ${ qi + 1 } (${ q.box }) has no words of its own: write its question in the editor` );
		q.bound.forEach( ( k ) => out.notes.push( `question ${ qi + 1 }: the live line ${ k } "${ squash( rec( k ).words ) }" has no flow setting` ) );

		// The options, one per loop item.
		const inButton = new Set( [ q.loop.button, ...t.desc( q.loop.button ) ] );
		const conditional = ( k ) => {
			for ( let p = t.parent( k ); p && p !== q.loop.k; p = t.parent( p ) ) {
				if ( 'sc-if' === rec( p ).realTag ) {
					return true;
				}
			}
			return false;
		};
		const holes = textHoles( t.desc( q.loop.k ) );
		const own = holes.filter( ( x ) => inButton.has( x.k ) && ! conditional( x.k ) );
		const aligned = ( x ) => !! x?.vals?.loop && x.vals.v.length === q.loop.count;
		const label = own.find( ( x ) => ! x.vals?.v.some( price ) );
		const cost = own.find( ( x ) => x !== label && x.vals?.v.some( price ) );
		const description = own.find( ( x ) => x !== label && x !== cost && ! x.vals?.v.some( price ) );
		const help = holes.find( ( x ) => ! inButton.has( x.k ) && conditional( x.k ) );
		const name = `question ${ qi + 1 } "${ stripped || q.box }"`;
		// A loop drawing a list the flow product's attribute holds is that attribute's step: its options are the product's
		// terms (label, term slug), with the badges the catalogue holds and the draft's own per-option words beside them.
		const sold = sale?.steps.find( ( s ) => s.binding && s.binding === q.loop.path ) ?? null;
		const attr = sold?.attribute ?? null;
		if ( attr ) {
			const paired = ( x ) => aligned( x ) && x.vals.v.length === attr.options.length;
			question.productAttribute = `pa_${ attr.slug }`;
			question.options = attr.options.map( ( o, i ) => ( {
				label: o.term, value: slugify( o.term ),
				...( paired( description ) ? { description: description.vals.v[ i ] } : {} ),
				...( paired( help ) ? { helpText: help.vals.v[ i ] } : {} ),
				...( o.badge ? { badge: o.badge } : {} ),
				...( attr.default === o.term ? { isDefault: true } : {} ),
			} ) );
			const lacks = [
				...( 'multi' === sold.kind ? [ 'the shopper picks several of its options, and sgs/choice-flow-question has no setting for a question taking several options (it is a one-pick answer step)' ] : [] ),
				...( own.filter( ( x ) => x !== label && x !== cost && x.vals?.v.some( price ) ).map( ( x ) => `each option shows a second price (${ x.vals.v.join( ', ' ) }), and a product-option step draws only the product's price` ) ),
			];
			lacks.length && out.missing.push( { key: q.box, line: `${ name } (sgs/choice-flow-question, ${ question.productAttribute }): ${ lacks.join( '; ' ) }`, why: lacks.join( '; ' ) } );
		} else if ( aligned( label ) ) {
			question.options = label.vals.v.map( ( l, i ) => ( {
				label: l, value: slug( l ),
				...( aligned( description ) ? { description: description.vals.v[ i ] } : {} ),
				...( aligned( help ) ? { helpText: help.vals.v[ i ] } : {} ),
			} ) );
			description && ! aligned( description ) && out.notes.push( `${ name }: the option descriptions repeat a value, so they cannot be paired with their options` );
			help && ! aligned( help ) && out.notes.push( `${ name }: the option help texts repeat a value, so they cannot be paired with their options` );
		} else {
			question.options = [];
			out.notes.push( `${ name }: the loop ${ q.loop.k } recorded ${ label?.vals?.more ? `only ${ label.vals.v.length } of its ${ q.loop.count } labels` : 'no distinct label per option' }, so its options are not listed: add them in the editor` );
			out.handovers.push( { owner: 'content-page', kind: 'text', detail: `${ name }: the options are not listed (the draft's loop recorded ${ label?.vals?.more ? `only ${ label.vals.v.length } of its ${ q.loop.count } labels` : 'no distinct label per option' }): enter every option in the editor` } );
		}
		if ( cost?.vals?.v.length && ! attr?.variation ) {
			cost.vals.v.some( ( v ) => specHit( R.pricePrefixFrom, v ) ) && ( question.pricePrefix = 'from' );
			out.handovers.push( { owner: 'product-data', kind: 'text', detail: `${ name}: the option prices (${ cost.vals.v.join( ', ' ) }) come from the add-on price list (FR-43-17): name the question's price group and enter the prices there` } );
		}
		t.desc( q.loop.button ).some( ( k ) => [ 'img', 'svg' ].includes( rec( k ).realTag ) ) && out.handovers.push( { owner: 'content-page', kind: 'presence', detail: `${ name }: each option shows a picture: choose each option's image (FR-43-15)` } );
		const badges = t.desc( q.loop.button ).filter( ( k ) => conditional( k ) && ( literal( k ) || textHoles( [ k ] ).length ) );
		const badgeWords = [ ...new Set( badges.map( ( k ) => literal( k ) || firstValue( k ) ).filter( Boolean ) ) ];
		const unheld = badgeWords.filter( ( w ) => ! attr?.options.some( ( o ) => o.badge === w ) );
		unheld.length && out.handovers.push( { owner: 'content-page', kind: 'text', detail: `${ name }: the badge "${ unheld.join( ', ' ) }" shows on some options: set it on those options` } );
		cover( q.box, `${ name }, sgs/choice-flow-question` );
		q.lead.forEach( ( s ) => cover( s, `${ name }'s words, sgs/choice-flow-question` ) );
		// The question's own pieces where the draft draws them: its heading, the intro after it, the first option's description
		// and badge, and the control beside the option button that binds the item (its help toggle).
		const toggle = t.desc( q.loop.k ).find( ( k ) => ! inButton.has( k ) && control( k ) && handler( k ).startsWith( `${ q.loop.as }.` ) ) ?? null;
		const parts = { heading: heading ?? null, intro: q.texts[ at + 1 ] ?? null, description: description?.k ?? null, badge: badges[ 0 ] ?? null, toggle };
		const step = { key: q.box, label: stripped, question, fields: [], parts };
		out.steps.push( step );

		// The steps the panels open underneath, paired with the options in order.
		const made = q.panels.map( ( p, pi ) => panelStep( p, stripped, `${ name }, the step its option ${ pi + 1 } opens underneath` ) );
		if ( made.length ) {
			question.showNextStepInline = true;
			if ( made.length === question.options.length ) {
				made.forEach( ( s, i ) => ( question.options[ i ].nextStepId = String( out.steps.length + i ) ) );
			} else {
				out.notes.push( `${ name }: ${ made.length } panels and ${ question.options.length } options do not pair, so no option opens its panel: set each option's next step` );
			}
			out.steps.push( ...made );
		}
	};
	// A panel a question opens: a step holding the panel's fields and a result worded by its texts.
	function panelStep( p, label, why ) {
		const fields = t.desc( p ).filter( ( k ) => FIELD_TAGS.has( rec( k ).realTag ) && 'hidden' !== String( rec( k ).attrs?.type ?? '' ).toLowerCase() ).map( ( k ) => fieldOf( k, p ) ).filter( Boolean );
		const texts = t.desc( p ).filter( ( k ) => real( k ) && literal( k ) ).map( literal );
		const paras = t.desc( p ).filter( ( k ) => 'p' === rec( k ).realTag && literal( k ) ).map( literal );
		const result = fields.length ? { heading: '', ...( paras.length ? { body: paras.join( ' ' ) } : {} ) } : { heading: texts[ 0 ] || '', ...( texts.length > 1 ? { body: texts.slice( 1 ).join( ' ' ) } : {} ) };
		cover( p, why );
		// The panel's own element: the condition's one element (a condition draws nothing of its own).
		const own = real( p ) ? [ p ] : t.kids( p ).filter( real );
		return { key: p, label, fields, result: { ...result, action: resultAction, ...( 'add-to-bag' === resultAction ? addAttrs : {} ) }, wrapper: 1 === own.length ? own[ 0 ] : null };
	}
	// A choice between pressable buttons: one option per button; the revealing option opens what it reveals underneath and
	// every other option goes past it.
	const past = [];
	const emitToggle = ( g ) => {
		const name = `the choice between the pressable buttons in ${ g.parent }`;
		const question = { question: '', options: g.options.map( ( o ) => ( { label: o.label, value: slug( o.label ), ...( o.description ? { description: o.description } : {} ), ...( o.isDefault ? { isDefault: true } : {} ) } ) ) };
		out.notes.push( `${ name } has no words of its own: write its question in the editor` );
		g.options.some( ( o ) => ! o.label ) && out.notes.push( `${ name }: an option has no words: write its label in the editor` );
		g.prices.length && out.handovers.push( { owner: 'product-data', kind: 'text', detail: `${ name }: the option prices (${ g.prices.join( ', ' ) }) are the product's own prices (FR-43-10): set them on the product` } );
		g.buttons.forEach( ( b ) => cover( b, `${ name }, sgs/choice-flow-question` ) );
		// The first option's description is its button's second plain text (toggleGroups' reading).
		const plain = [ g.buttons[ 0 ], ...t.desc( g.buttons[ 0 ] ) ].filter( ( k ) => real( k ) && literal( k ) && ! price( literal( k ) ) );
		out.steps.push( { key: g.parent, label: '', question, fields: [], parts: { description: question.options[ 0 ]?.description ? plain[ 1 ] ?? null : null } } );
		if ( ! g.reveal ) {
			return;
		}
		const at = out.steps.length;
		const shown = questions.filter( ( q ) => shownBy.get( q ) === g );
		shown.length ? shown.forEach( emitQuestion ) : out.steps.push( panelStep( g.reveal, '', `${ name }, the step its option opens underneath` ) );
		cover( g.reveal, `${ name }, the step its option opens underneath` );
		question.showNextStepInline = true;
		question.options.forEach( ( o, i ) => {
			o.nextStepId = String( g.buttons[ i ] === g.revealer ? at : out.steps.length );
			g.buttons[ i ] !== g.revealer && past.push( { o, name } );
		} );
	};
	[ ...questions.filter( ( q ) => ! shownBy.has( q ) ).map( ( q ) => ( { at: t.num( q.box ), q } ) ), ...toggles.map( ( g ) => ( { at: t.num( g.buttons[ 0 ] ), g } ) ) ]
		.sort( ( a, b ) => a.at - b.at ).forEach( ( u ) => ( u.q ? emitQuestion( u.q ) : emitToggle( u.g ) ) );

	// A field of a panel: its block (rules.formControl by rendered type; a declared numeric input mode is a number field) and label.
	function fieldOf( k, panel ) {
		const F = formControl;
		if ( ! F ) {
			return null;
		}
		const tag = rec( k ).realTag;
		const mode = String( rec( k ).attrs?.inputMode ?? rec( k ).attrs?.inputmode ?? '' ).toLowerCase();
		const type = String( rec( k ).attrs?.type ?? ( [ 'decimal', 'numeric' ].includes( mode ) ? 'number' : 'text' ) ).toLowerCase();
		if ( 'input' === tag && ( F.notFields || [] ).includes( type ) ) {
			return null;
		}
		const block = 'input' === tag ? F.byType?.[ type ] || F.fallback : F.byTag?.[ tag ] || F.fallback;
		const aria = squash( rec( k ).attrs?.[ 'aria-label' ] );
		let wrap = null;
		for ( let p = t.parent( k ); p && p !== panel && ! wrap; p = t.parent( p ) ) {
			'label' === rec( p ).realTag && ( wrap = p );
		}
		const label = ( aria && ! BOUND.test( aria ) ? aria : '' ) || ( wrap ? t.desc( wrap ).map( literal ).find( Boolean ) : '' ) || t.desc( panel ).map( literal ).find( Boolean ) || '';
		return { block, label, key: k };
	}

	// Result parts of the surface (surfaces.json kind result) are result steps.
	for ( const part of parts.filter( ( p ) => 'result' === p.kind ) ) {
		const roots = ( part.roots || [] ).filter( ( k ) => els[ k ] );
		const texts = roots.flatMap( ( k ) => [ k, ...t.desc( k ) ] ).filter( ( k ) => literal( k ) ).map( literal );
		roots.forEach( ( k ) => cover( k, `the result "${ part.name }", sgs/choice-flow-result` ) );
		out.steps.push( { key: roots[ 0 ] ?? null, resultAt: roots[ 0 ] ?? null, label: part.name || '', fields: [], result: { heading: texts[ 0 ] || '', ...( texts.length > 1 ? { body: texts.slice( 1 ).join( ' ' ) } : {} ), action: resultAction, ...( 'add-to-bag' === resultAction ? addAttrs : {} ) } } );
	}
	// The add-to-bag control ends the flow: with no result step yet, it is one.
	if ( pieces.add && ! out.steps.some( ( s ) => s.result ) ) {
		out.steps.push( { key: pieces.add, label: '', fields: [], result: { heading: '', action: 'add-to-bag', ...addAttrs } } );
	}
	// An option that goes past a revealed step needs a step there.
	past.filter( ( p ) => Number( p.o.nextStepId ) >= out.steps.length ).forEach( ( p ) => {
		delete p.o.nextStepId;
		out.notes.push( `${ p.name }: the option "${ p.o.label }" goes past the step another option opens, and no step follows it: set its next step` );
	} );
	! questions.length && out.notes.push( `no question found under the flow root ${ rootKey }: no loop of options whose button's handler binds the loop item` );

	// The flow's own settings.
	const A = out.attributes;
	A.flowLayout = ( R.showcaseKinds || [] ).includes( surfaceKind ) ? 'showcase' : 'compact';
	counts.length && ( A.stepCountLabel = counts[ 0 ] );
	// The bar a control sits in (the root's child holding it, when that child holds no question or summary) is the flow's own.
	const bar = ( k ) => {
		let b = k;
		while ( t.parent( b ) && t.parent( b ) !== rootKey ) {
			b = t.parent( b );
		}
		return t.parent( b ) === rootKey && ! [ b, ...t.desc( b ) ].some( ( d ) => boxes.includes( d ) || d === aside ) ? b : k;
	};
	if ( pieces.close ) {
		const own = literal( pieces.close );
		Object.assign( A, { showHeader: true, closeStyle: own ? 'text' : 'icon' }, own ? { closeLabel: own } : {} );
		const head = bar( pieces.close );
		cover( head, 'the flow header (sgs/choice-flow showHeader, closeLabel)' );
		[ head, ...t.desc( head ) ].some( ( k ) => 'img' === rec( k ).realTag ) && out.handovers.push( { owner: 'site-info', kind: 'presence', detail: 'the flow header shows a logo: choose it in the flow\'s header logo setting (headerLogo)' } );
	}
	if ( pieces.skip ) {
		const holder = t.parent( pieces.skip );
		Object.assign( A, { skipLabel: words( pieces.skip ) }, holder && literal( holder ) ? { skipPrompt: literal( holder ) } : {}, specHit( add?.handlers, handler( pieces.skip ) ) ? { skipAddsToBag: true } : {} );
		cover( bar( pieces.skip ), 'the flow footer and its skip link (sgs/choice-flow skipPrompt, skipLabel)' );
	}
	if ( pieces.next ) {
		const label = words( pieces.next ) || firstValue( pieces.next );
		label && ( A.continueLabel = label );
		cover( bar( pieces.next ), 'the flow footer (sgs/choice-flow continueLabel)' );
	}
	pieces.back && cover( bar( pieces.back ), 'the flow footer and its Back button' );
	pieces.add && cover( bar( pieces.add ), 'the add-to-bag result (sgs/choice-flow-result action add-to-bag)' );
	if ( aside ) {
		A.showPricePanel = true;
		boxes.length && ( A.summaryPosition = t.num( aside ) < t.num( boxes[ 0 ] ) ? 'start' : 'end' );
		summaryOf( aside );
		cover( aside, 'the flow summary (sgs/choice-flow showPricePanel, FR-43-19)' );
	}
	// With no aside, a live line naming the picks is the summary; with the summary shown, the note after the last control is
	// its stage note; the rest with words and no control is the flow post's own blocks beside the flow, a lone heading its title.
	const summary = aside ? null : summaryLine( x, { covered: out.covered, steps: out.steps } );
	if ( summary ) {
		A.showPricePanel = true;
		boxes.length && ( A.summaryPosition = t.num( summary.panel ) < t.num( boxes[ 0 ] ) ? 'start' : 'end' );
		cover( summary.panel, 'the flow summary (sgs/choice-flow showPricePanel, FR-43-19): its live line of the picks; Fill reads its look' );
	}
	const note = A.showPricePanel && ! A.stageNote ? stageNoteOf( x, { covered: out.covered } ) : null;
	note && ( A.stageNote = words( note ), out.noteKey = note, cover( note, 'the note after the flow\'s last control (sgs/choice-flow stageNote, shown in the summary)' ) );
	const firstStep = Math.min( Infinity, ...out.steps.filter( ( s ) => s.question && els[ s.key ] ).map( ( s ) => t.num( s.key ) ) );
	const canvas = canvasOf( x, { covered: out.covered, firstStep } );
	canvas.title && ( A.title = literal( canvas.title ), cover( canvas.titleGroup, 'the flow title (sgs/choice-flow title)' ) );
	canvas.canvas.forEach( ( c ) => cover( c.key, `a block of the flow post ${ c.at } sgs/choice-flow (Spec 48 R-47-12)` ) );
	out.canvas = canvas.canvas;
	out.pieces = flowPieces( x, { pieces, head: pieces.close ? bar( pieces.close ) : null, aside, note: out.noteKey ?? null, copies: out.copies } );
	delete out.noteKey;

	// The summary's running lines (its base row and the placeholder row before the first choice) and its help note.
	function summaryOf( k ) {
		const lines = t.desc( k ).find( ( d ) => 'sc-for' === rec( d ).realTag && 2 === textHoles( t.desc( d ) ).length );
		const [ key, value ] = lines ? textHoles( t.desc( lines ) ) : [];
		if ( key?.vals?.loop && 2 === key.vals.v.length && value?.vals?.loop && 2 === value.vals.v.length && ! price( value.vals.v[ 1 ] ) ) {
			Object.assign( A, { summaryBaseLabel: key.vals.v[ 0 ], summaryPendingLabel: key.vals.v[ 1 ], summaryPendingText: value.vals.v[ 1 ] } );
		}
		const link = t.desc( k ).find( ( d ) => 'a' === rec( d ).realTag && /^(?!#|\{\{)\S/.test( rec( d ).attrs?.href ?? '' ) );
		if ( link ) {
			out.noteKey = link;
			const texts = [ link, ...t.desc( link ) ].map( literal ).filter( Boolean );
			const href = rec( link ).attrs.href;
			const brand = brands.find( ( b ) => brandOwnsAddress( b, href ) )?.slug ?? null;
			texts[ 0 ] && ( A.stageNote = texts[ 0 ] );
			A.stageNoteLink = { url: href, text: texts.slice( 1 ).join( ' ' ), source: LINK_SOURCES.has( brand ) ? brand : 'url' };
			NOTE_ICONS.has( brand ) && ( A.stageNoteIcon = brand );
			out.copies.push( { words: texts.join( '' ).replace( /\s+/g, '' ), reason: 'the summary\'s help note, shown again where the summary collapses (sgs/choice-flow stageNote)' } );
		}
	}
	return out;
}
