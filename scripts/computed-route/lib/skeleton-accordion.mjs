// A loop of disclosures is an accordion (Spec 48 §3.4, the `accordion` standing rule, RC6). Read from the fact record and the
// draft's logic syntax tree, never from words or from surfaces.json's kind alone:
//   - the loop (`sc-for`) has one holder, every item a copy of one template element; a holder that holds other content too (a
//     heading, a count line) keeps it, and its items, standing together, are one accordion beside it (a run);
//   - inside the item template sit a conditional panel (`sc-if`) whose value is a field of the loop item and, outside that
//     panel, a control binding an event to another field of the loop item (the fact record's `template.events`);
//   - in the logic, the loop's list is `list.map( ( item, i ) => ( { … } ) )`; the control's field is a function whose
//     `this.setState(…)` writes a state key the panel's field reads (`open = S.faq === i`, `toggle: () => this.setState(…)`);
//   - the rendered confirmation: every item's control carries `aria-expanded` (the element-facts reader: the rendered value,
//     else the record's binding).
// One open item at a time when the panel's field compares that state key with something (a single open index), several
// otherwise (a set or list of open items). The item open at rest is the one the state's initial literal names (a class
// `state = { … }` or `this.state = { … }`), else the one whose panel the read rendered. Each item is the accordion's item
// block, its title the control's words and its content the panel's text per copy: a text hole's value for that copy (a
// loop hole's answers in copy order when the record holds one distinct value per copy), else the rendered words.
// A control whose state no panel of its own item reads (a button opening a drawer or a modal) and a loop with no control
// are not accordions. Pure apart from the logic reader passed in.
import { keyName, isFn, isThisMember, subtree, resolveName, enclosingFn, classMethod } from './intake-ast.mjs';
import { patchProperties } from './skeleton-handler-opens.mjs';
import { stateReads } from './skeleton-narrowing.mjs';

const WIDTH = '1440';
const MAX_DEPTH = 6;
const shown = ( e ) => Object.values( e.visible || {} ).some( Boolean );

// The field of the loop item `as` an expression names (`f.toggle` → toggle), or null for anything else.
export function itemField( expr, as ) {
	const parts = String( expr ?? '' ).trim().split( '.' );
	return as && 2 === parts.length && parts[ 0 ] === as && /^[\w$]+$/.test( parts[ 1 ] ) ? parts[ 1 ] : null;
}

// The function a loop's list value maps each item through (`list.map( ( item, i ) => … )`), through a name the logic declares;
// null for any other value.
export function mapCallback( d, value, depth = 0 ) {
	if ( ! value || depth > MAX_DEPTH ) {
		return null;
	}
	if ( 'Identifier' === value.type ) {
		const decl = resolveName( d.idx, value );
		return 'var' === decl?.kind ? mapCallback( d, decl.init, depth + 1 ) : null;
	}
	const callee = 'CallExpression' === value.type ? value.callee : null;
	return 'MemberExpression' === callee?.type && ! callee.computed && 'map' === callee.property.name && isFn( value.arguments[ 0 ] ) ? value.arguments[ 0 ] : null;
}

// The object literal a map callback returns for each item, or null.
export function itemObject( d, fn ) {
	if ( ! fn ) {
		return null;
	}
	if ( 'ObjectExpression' === fn.body?.type ) {
		return fn.body;
	}
	const ret = subtree( d.idx, fn.body ).find( ( n ) => 'ReturnStatement' === n.type && enclosingFn( d.idx, n ) === fn && 'ObjectExpression' === n.argument?.type );
	return ret?.argument ?? null;
}

// The value node of a field of the item object: a method, a value, a name resolved to its declaration, or a member of the
// component resolved to its class method. null when the object has no such field.
export function fieldValue( d, obj, name ) {
	const p = ( obj?.properties || [] ).find( ( x ) => ( 'ObjectProperty' === x.type || 'ObjectMethod' === x.type ) && ! x.computed && keyName( x ) === name );
	if ( ! p ) {
		return null;
	}
	const value = 'ObjectMethod' === p.type ? p : p.value;
	if ( 'Identifier' === value?.type ) {
		const decl = resolveName( d.idx, value );
		return 'var' === decl?.kind && decl.init ? decl.init : value;
	}
	return isThisMember( value ) ? classMethod( d.idx, value.property.name ) || value : value;
}

// Whether the panel's field holds one open item at a time: it compares a state read with something (`S.faq === i`).
export const singleOpen = ( d, expr ) => 'BinaryExpression' === expr?.type && [ '===', '==' ].includes( expr.operator ) && [ expr.left, expr.right ].some( ( x ) => stateReads( d, x ).size > 0 );

// The literal a component's initial state gives `key` (a class `state = { … }` or `this.state = { … }`): a number, a list of
// numbers, or undefined when the code states no literal.
export function initialOf( d, key ) {
	const objects = d.idx.all.flatMap( ( n ) => {
		if ( 'ClassProperty' === n.type && 'state' === keyName( n ) && 'ObjectExpression' === n.value?.type ) {
			return [ n.value ];
		}
		return 'AssignmentExpression' === n.type && isThisMember( n.left, 'state' ) && 'ObjectExpression' === n.right?.type ? [ n.right ] : [];
	} );
	const num = ( n ) => ( 'NumericLiteral' === n?.type ? n.value : 'UnaryExpression' === n?.type && '-' === n.operator && 'NumericLiteral' === n.argument?.type ? -n.argument.value : undefined );
	for ( const obj of objects ) {
		const p = obj.properties.find( ( x ) => 'ObjectProperty' === x.type && ! x.computed && keyName( x ) === key );
		if ( p ) {
			return 'ArrayExpression' === p.value?.type ? p.value.elements.map( num ).filter( ( x ) => undefined !== x ) : num( p.value );
		}
	}
	return undefined;
}

// A record element's text for one loop copy: its template words with each text hole's value for that copy, or null when a
// hole has no single value for the copy (the record holds fewer distinct answers than copies).
export function copyText( rec, copy ) {
	let text = String( rec?.template?.words ?? '' );
	for ( const h of ( rec?.template?.holes ?? [] ).filter( ( x ) => 'text' === x.where ) ) {
		const a = rec.logic?.holes?.[ h.id ]?.[ WIDTH ];
		const values = a?.v ?? [];
		const v = a?.loop ? ( values.length === a.n ? values[ copy ] : 1 === values.length ? values[ 0 ] : undefined ) : values[ 0 ];
		if ( 'string' !== typeof v?.v && 'number' !== typeof v?.v ) {
			return null;
		}
		text = text.split( `{{ ${ h.expr } }}` ).join( String( v.v ) );
	}
	return text.replace( /\s+/g, ' ' ).trim();
}

// o: { m (the inventory model), read (lib/element-facts.mjs), logicOf( component ) (lib/skeleton-narrowing.mjs::draftLogicOf
// for the client's draft, or null), rule (rules.accordion: { block, itemBlock, panelBlock, attributes: { allowMultiple,
// defaultOpen, isOpen } }), titleAttr, textAttr (the item's and the panel block's text-content settings), rich( e, block,
// attr ) (lib/inline-text.mjs::inlineText over the model: a rendered title or panel text keeps its inline markup as its
// setting holds it, and the item carries its handover rows) }. Returns
// { holders: Map( holder key → { attributes, reason } ), runs: Map( first item key → { attributes, reason, holder, items } ) (the
// items of a holder that holds other content too), items: Map( item key → { attributes, inner, handover? } ), notes }.
export function accordionLoops( { m, read, logicOf, rule, titleAttr, textAttr, rich = () => null } ) {
	const out = { holders: new Map(), runs: new Map(), items: new Map(), notes: [] };
	if ( ! rule || ! titleAttr || ! textAttr ) {
		return out;
	}
	const records = read.view.elements || {};
	const entry = ( e ) => read.view.entry( e )?.template ?? null;
	const loopOf = ( e ) => entry( e )?.membership?.scFor?.at( -1 )?.key ?? null;
	const loops = new Map();
	m.els.filter( shown ).filter( loopOf ).forEach( ( e ) => ( loops.get( loopOf( e ) ) || loops.set( loopOf( e ), [] ).get( loopOf( e ) ) ).push( e ) );
	const within = ( e, top ) => {
		for ( let p = e; p; p = m.byKey[ p.parentKey ] ) {
			if ( p === top ) {
				return true;
			}
		}
		return false;
	};
	for ( const [ loopKey, list ] of loops ) {
		const items = list.filter( ( e ) => ! list.includes( m.byKey[ e.parentKey ] ) );
		const holders = [ ...new Set( items.map( ( e ) => e.parentKey ) ) ];
		const holder = 1 === holders.length ? m.byKey[ holders[ 0 ] ] : null;
		const itemKeys = [ ...new Set( items.map( ( e ) => entry( e )?.key ) ) ];
		if ( ! holder || holder === m.root || 1 !== itemKeys.length || ! itemKeys[ 0 ] ) {
			continue;
		}
		// A holder that also holds other content (a heading, a count line) keeps it: the items are a run of its children, one
		// accordion beside that content, when they stand together.
		const kidsOf = m.blockKids( holder );
		const first = kidsOf.indexOf( items[ 0 ] );
		const run = kidsOf.some( ( k ) => ! items.includes( k ) );
		if ( run && ( first < 0 || kidsOf.slice( first, first + items.length ).some( ( k, i ) => k !== items[ i ] ) ) ) {
			continue;
		}
		const itemKey = itemKeys[ 0 ];
		const loop = records[ loopKey ]?.template;
		const as = loop?.own?.as;
		const listPath = ( loop?.holes ?? [] ).find( ( h ) => 'attr:list' === h.where )?.path;
		const inItem = ( rec ) => ( rec.template.parentChain || [] ).includes( itemKey ) && rec.template.membership?.scFor?.at( -1 )?.key === loopKey;
		const own = Object.values( records ).filter( inItem );
		const panels = own.filter( ( rec ) => 'sc-if' === rec.template.tag ).map( ( rec ) => ( { rec, field: itemField( ( rec.template.holes || [] ).find( ( h ) => 'attr:value' === h.where )?.path, as ) } ) ).filter( ( x ) => x.field );
		const inPanel = ( rec ) => ( rec.template.membership?.scIf || [] ).some( ( s ) => panels.some( ( p ) => p.rec.template.key === s.key ) );
		const controls = own.filter( ( rec ) => ! inPanel( rec ) ).flatMap( ( rec ) => ( rec.template.events || [] ).map( ( ev ) => ( { rec, field: itemField( ev.expr, as ) } ) ) ).filter( ( x ) => x.field );
		if ( ! panels.length || ! controls.length || ! listPath ) {
			continue;
		}
		const d = logicOf( records[ itemKey ].template.component );
		const obj = d ? itemObject( d, mapCallback( d, d.values.get( listPath ) ) ) : null;
		const pair = obj ? panels.flatMap( ( p ) => controls.map( ( c ) => ( { p, c } ) ) ).map( ( x ) => {
			const shows = fieldValue( d, obj, x.p.field );
			const handler = fieldValue( d, obj, x.c.field );
			const written = new Set( handler ? patchProperties( d, handler ).map( keyName ) : [] );
			const key = [ ...( shows ? stateReads( d, shows ) : [] ) ].find( ( k ) => written.has( k ) );
			return key ? { ...x, key, shows } : null;
		} ).find( Boolean ) : null;
		if ( ! pair ) {
			out.notes.push( `${ holder.key }: a loop whose items hold a control and a conditional panel, but no control's handler writes a state the item's own panel reads, so it is no accordion` );
			continue;
		}
		// The control's words: its own, else its first piece of text not hidden from assistive technology (a question in a span
		// beside a "+" glyph).
		const titleOf = ( c ) => {
			const squash = ( x ) => m.words( x ).replace( /\s+/g, ' ' ).trim();
			const inner = squash( c ) ? null : m.els.find( ( x ) => x !== c && within( x, c ) && 'true' !== String( read.attr( x, 'aria-hidden' ) ) && squash( x ).length > 1 );
			return squash( c ) || ( inner ? squash( inner ) : '' );
		};
		const controlOf = ( it ) => m.els.find( ( x ) => entry( x )?.key === pair.c.rec.template.key && within( x, it ) ) ?? null;
		if ( ! items.every( ( it ) => controlOf( it ) && null != read.attr( controlOf( it ), 'aria-expanded' ) ) ) {
			out.notes.push( `${ holder.key }: a loop of toggles over their own panels whose controls carry no aria-expanded, so the render does not confirm a disclosure` );
			continue;
		}
		const single = singleOpen( d, pair.shows );
		const initial = initialOf( d, pair.key );
		const panelRendered = ( it ) => m.els.some( ( x ) => within( x, it ) && ( entry( x )?.membership?.scIf || [] ).some( ( s ) => s.key === pair.p.rec.template.key ) );
		const openAt = ( it, i ) => ( Array.isArray( initial ) ? initial.includes( i ) : 'number' === typeof initial ? initial === i : panelRendered( it ) );
		const content = Object.values( records ).filter( ( rec ) => rec.template.parent === pair.p.rec.template.key && String( rec.template.words ?? '' ).trim() );
		const A = rule.attributes;
		const firstOpen = items.findIndex( openAt );
		const verdict = {
			attributes: { [ A.allowMultiple ]: ! single, ...( single && firstOpen >= 0 ? { [ A.defaultOpen ]: firstOpen } : {} ) },
			reason: `${ rule.reason } (a loop of ${ items.length } items whose control writes "${ pair.key }", which the item's own panel reads; ${ single ? 'one item open at a time' : 'several items open at once' }${ run ? `; the holder ${ holder.key } also holds other content, so the items are one accordion beside it` : '' })`,
		};
		run ? out.runs.set( items[ 0 ].key, { ...verdict, holder: holder.key, items: items.map( ( it ) => it.key ) } ) : out.holders.set( holder.key, verdict );
		items.forEach( ( it, i ) => {
			const handover = [];
			const inner = content.map( ( rec ) => {
				const rendered = m.els.find( ( x ) => entry( x )?.key === rec.template.key && within( x, it ) );
				// A copy's text the logic gives is a static string (no markup); a rendered one keeps its inline parts.
				const logic = copyText( rec, i );
				const marked = null == logic && rendered ? rich( rendered, rule.panelBlock, textAttr ) : null;
				marked && handover.push( ...marked.handover );
				const text = logic ?? marked?.value ?? ( rendered ? m.words( rendered ).replace( /\s+/g, ' ' ).trim() : null );
				const at = rendered ?? m.els.find( ( x ) => entry( x )?.key === rec.template.key );
				return text ? { name: rule.panelBlock, attributes: { [ textAttr ]: text }, ...( at ? { itemKey: at.key } : {} ) } : null;
			} ).filter( Boolean );
			// A control with words of its own keeps their inline markup; one whose words sit in a child beside a glyph takes that text.
			const title = m.words( controlOf( it ) ).trim() ? rich( controlOf( it ), rule.itemBlock, titleAttr ) : null;
			title && handover.push( ...title.handover );
			content.length > inner.length && out.notes.push( `${ it.key }: ${ content.length - inner.length } of the panel's ${ content.length } text elements have no value for this copy, so the item holds the rest` );
			out.items.set( it.key, {
				attributes: { [ titleAttr ]: title?.value ?? titleOf( controlOf( it ) ), ...( openAt( it, i ) ? { [ A.isOpen ]: true } : {} ) },
				inner,
				...( handover.length ? { handover } : {} ),
			} );
		} );
	}
	return out;
}
