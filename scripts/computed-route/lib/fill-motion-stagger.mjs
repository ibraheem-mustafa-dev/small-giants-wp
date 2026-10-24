// The stagger a draft's list entrance makes (Spec 38A §8 container helper; Spec 48 FR-48-47): a one-shot entrance the
// draft plays on each item of a list with a delay computed from the item's index (`Math.min( i * 26, 320 )`,
// `140 + i * 55`, `80 + Math.min( k * 45, 360 )`, or the inventory's `stagger` field) is the `sgsMotion.stagger` of the
// block that holds the items, `{ apply: true, offset, step, cap }`, with the items' own entrance as that block's root
// entrance (with Apply on, every item with no entrance of its own takes it, its delay from the helper; an `open` or
// `state` entrance plays on the items under the same state host). lib/fill-motion.mjs::motionWrites calls
// staggerPlans once and applyStagger on each holding block's root.
import { parseExpression } from '@babel/parser';
import { templateKey } from './fact-key.mjs';
import { compact } from './motion-record-text.mjs';
import { elementMotion } from './fill-motion-element.mjs';

// The schema's ranges for the helper's three timings (motion.schema.json::$defs.Stagger).
const LIMITS = { offset: 10000, step: 2000, cap: 20000 };
const constant = ( f ) => f && 0 === f.step && null === f.cap && null === f.index;

// The text of a name or a plain member read (`i`, `rv.i`), or null.
function nameOf( n ) {
	if ( 'Identifier' === n.type ) {
		return n.name;
	}
	const object = 'MemberExpression' === n.type && ! n.computed ? nameOf( n.object ) : null;
	return object && 'Identifier' === n.property.type ? `${ object }.${ n.property.name }` : null;
}

// One expression as the delay `min( offset + step * index, cap )` over one index name: { offset, step, cap, index, bare }
// (`bare` while the index is not yet multiplied by a step), or null for any other shape (a random term, a product of two names, a maximum, a call other than Math.min).
function linear( n ) {
	if ( 'NumericLiteral' === n.type ) {
		return { offset: n.value, step: 0, cap: null, index: null };
	}
	const name = nameOf( n );
	if ( name ) {
		return { offset: 0, step: 1, cap: null, index: name, bare: true };
	}
	if ( 'LogicalExpression' === n.type && /^(?:\|\||\?\?)$/.test( n.operator ) && 'NumericLiteral' === n.right.type && 0 === n.right.value ) {
		return linear( n.left );
	}
	if ( 'UnaryExpression' === n.type && '+' === n.operator ) {
		return linear( n.argument );
	}
	if ( 'CallExpression' === n.type && 'MemberExpression' === n.callee.type && 'Math' === n.callee.object.name && 'min' === n.callee.property.name && 2 === n.arguments.length ) {
		const [ a, b ] = n.arguments.map( linear );
		const [ c, f ] = constant( a ) ? [ a, b ] : constant( b ) ? [ b, a ] : [];
		return c && f ? { ...f, cap: null === f.cap ? c.offset : Math.min( f.cap, c.offset ) } : null;
	}
	if ( 'BinaryExpression' !== n.type ) {
		return null;
	}
	const a = linear( n.left );
	const b = linear( n.right );
	if ( ! a || ! b || ( a.index && b.index && a.index !== b.index ) ) {
		return null;
	}
	const index = a.index ?? b.index;
	if ( '+' === n.operator && ( null === a.cap || constant( b ) ) && ( null === b.cap || constant( a ) ) ) {
		const cap = null !== a.cap ? a.cap + b.offset : null !== b.cap ? b.cap + a.offset : null;
		return { offset: a.offset + b.offset, step: a.step + b.step, cap, index, bare: a.bare || b.bare };
	}
	if ( '-' === n.operator && constant( b ) ) {
		return { offset: a.offset - b.offset, step: a.step, cap: null === a.cap ? null : a.cap - b.offset, index, bare: a.bare };
	}
	if ( '*' === n.operator && ( constant( a ) || constant( b ) ) ) {
		const [ c, f ] = constant( a ) ? [ a, b ] : [ b, a ];
		return c.offset >= 0 ? { offset: f.offset * c.offset, step: f.step * c.offset, cap: null === f.cap ? null : f.cap * c.offset, index } : null;
	}
	return null;
}

// The stagger a record's delay states: { offset, step, cap } (cap the maximum total delay, the offset included), or
// { refused } for an index formula the helper cannot hold, or null when the record states no per-item delay (a literal
// delay, no delay, or a text that is not a formula). The inventory's `stagger` field ({ ms, base_ms, cap_ms }) is the
// same three values, its cap taken as the maximum total delay.
export function staggerOf( r ) {
	const s = r?.stagger;
	if ( s && 'object' === typeof s && 'number' === typeof s.ms ) {
		return checked( { offset: s.base_ms ?? 0, step: s.ms, cap: s.cap_ms ?? null }, `stagger ${ JSON.stringify( s ) }` );
	}
	const text = r?.delay_ms;
	if ( 'string' !== typeof text ) {
		return null;
	}
	let ast;
	try {
		ast = parseExpression( text );
	} catch {
		return null;
	}
	const f = linear( ast );
	if ( f && ! f.index ) {
		return null;
	}
	// A name that no step multiplies (`delay: d`) is a value the code computes elsewhere, not an item's index.
	if ( ! f || f.bare ) {
		return { refused: `the delay "${ text }" is not a start offset plus a step times the item's index with an optional maximum, which is all the stagger helper holds (Spec 38A §8)` };
	}
	return checked( f, `the delay "${ text }"` );
}

function checked( { offset, step, cap }, what ) {
	const ok = [ offset, step, cap ?? 0 ].every( Number.isFinite ) && offset >= 0 && step > 0 && ( null === cap || cap >= offset ) && offset <= LIMITS.offset && step <= LIMITS.step && ( null === cap || cap <= LIMITS.cap );
	return ok ? compact( { offset, step, cap } ) : { refused: `${ what } gives a start offset of ${ offset }ms, a step of ${ step }ms and a maximum of ${ cap ?? 'none' }, outside what the stagger helper holds (offset 0 to ${ LIMITS.offset }ms, step above 0 to ${ LIMITS.step }ms, a maximum not below the offset up to ${ LIMITS.cap }ms)` };
}

// A one-shot entrance played on the items of a list: an active Web Animation or CSS animation that runs once on the
// template elements it names.
const isListEntrance = ( r ) => 'active' === ( r.status ?? 'active' ) && /^(?:waapi|css-animation)$/.test( r.mechanism ) && 1 === Number( r.iterations ?? 1 ) && null != r.element?.template_tpl_id;

// The nearest template element that holds every item: the first key every item's parent chain shares.
function holderKeyOf( items, template ) {
	const chains = items.map( ( k ) => template?.elements?.[ k ]?.parentChain ).filter( Array.isArray );
	if ( chains.length !== items.length || ! chains.length ) {
		return null;
	}
	return chains[ 0 ].find( ( k ) => ! items.includes( k ) && chains.every( ( c ) => c.includes( k ) ) ) ?? null;
}

// One plan per list entrance with a per-item delay: { r, items, stagger | refused, at: { n, t } | null, holder: bool }.
// `at` is the target the walk up from the element that holds the items stops at (none when it stops at an element the
// script holds by a ref that is no target; a refused plan then falls back to an item's own target); `holder` is true when that target is a
// block's root (the helper is a block's, so a part that holds the items is no home: the plan is refused there).
// `keyOf( finder )` gives a target's template key (lib/fill-motion.mjs::elementKey).
export function staggerPlans( { records, template, nodes, keyOf } ) {
	const targets = new Map();
	for ( const n of nodes || [] ) {
		for ( const t of n.targets ) {
			const key = keyOf( t.finder );
			key && targets.set( key, [ ...( targets.get( key ) || [] ), { n, t } ] );
		}
	}
	const plans = [];
	for ( const r of ( records || [] ).filter( isListEntrance ) ) {
		const s = staggerOf( r );
		if ( ! s ) {
			continue;
		}
		const items = [ r.element.template_tpl_id ].flat().map( ( tpl ) => templateKey( { dc: r.element.dc, tpl } ) );
		const holderKey = holderKeyOf( items, template );
		const chain = holderKey ? [ holderKey, ...( template.elements[ holderKey ]?.parentChain || [] ) ] : [];
		// The walk up stops at the first element that is a target or that the draft's script holds by a ref (the list's
		// own scope, `this._listEl.querySelectorAll(...)`): a list whose scope is no target has no home on this surface.
		const stop = chain.find( ( k ) => targets.has( k ) || template.elements[ k ]?.attrs?.ref );
		const hit = targets.get( stop ) || [];
		const root = hit.find( ( x ) => ! x.t.slot );
		const at = root || hit[ 0 ] || targets.get( items.find( ( k ) => targets.has( k ) ) )?.[ 0 ] || null;
		const plan = { r, items, at, holder: Boolean( root ) };
		if ( s.refused ) {
			plans.push( { ...plan, refused: s.refused } );
		} else if ( ! root && hit.length ) {
			plans.push( { ...plan, refused: `the items' list is held by the ${ hit[ 0 ].t.slot } part of ${ hit[ 0 ].n.name }, not by a block: the stagger helper staggers a block's own items (Spec 38A §8), so the ${ s.offset }ms + ${ s.step }ms per item${ s.cap ? ` up to ${ s.cap }ms` : '' } has no home` } );
		} else if ( root ) {
			plans.push( { ...plan, stagger: s } );
		}
	}
	return plans;
}

// Writes the plans held at one root target onto the node's document (lib/fill-motion.mjs::motionWrites raises a refused
// plan's row itself): the stagger and the items' entrance on the root, or a named unmapped row. `own` is the root's own motion (elementMotion's element); `emArgs` the elementMotion options
// (mdb, ctx, offers). Returns the record ids written.
export function applyStagger( { plans, doc, own, where, out, pending, emArgs } ) {
	const used = [];
	for ( const p of plans ) {
		const row = ( reason ) => out.unmapped.push( { ...where, property: 'motion', value: p.r.id, reason } );
		const ownEntrance = own?.entrance || doc.elements.root?.entrance;
		if ( doc.stagger ) {
			row( `a second staggered list in ${ where.block }: a block holds one stagger, and its stagger is already ${ JSON.stringify( doc.stagger ) }` );
			continue;
		}
		if ( ownEntrance ) {
			row( `${ where.block } plays an entrance of its own, and with the stagger helper on its items take the block's entrance (Spec 38A §8), so the items' entrance and the block's cannot both be written` );
			continue;
		}
		// The stagger holds every item's delay, so the entrance carries none of its own.
		const e = elementMotion( [ { ...p.r, delay_ms: 0, stagger: null } ], { ...emArgs, sampled: undefined, runtime: [], target: 'root' } );
		out.unmapped.push( ...e.unmapped.map( ( u ) => ( { ...where, property: 'motion', value: u.record, reason: u.reason } ) ) );
		if ( ! e.element.entrance ) {
			continue;
		}
		doc.elements.root = { ...( doc.elements.root || {} ), entrance: e.element.entrance };
		doc.stagger = { apply: true, ...p.stagger };
		pending.push( 'root' );
		used.push( p.r.id );
		out.notes.push( { ...where, text: `${ p.r.id }: the items' entrance with a delay of ${ p.r.delay_ms ?? JSON.stringify( p.r.stagger ) } is this block's stagger (start ${ p.stagger.offset }ms, step ${ p.stagger.step }ms${ p.stagger.cap ? `, at most ${ p.stagger.cap }ms` : '' }) with that entrance, which its items take` } );
	}
	return used;
}
