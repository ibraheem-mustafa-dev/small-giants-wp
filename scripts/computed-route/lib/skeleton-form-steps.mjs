// The steps of a multi-step draft form in the skeleton (Spec 48 FR-48-57, FR-48-83 §10.1). A draft whose logic holds a form
// schema of more than one step (lib/fill-form-schema.mjs::formSchemaOf) gets its form as `sgs/form` > one `sgs/form-step` per
// schema step that has fields (its `label` the draft's) and an `sgs/form-review` where the schema has a step with no fields.
// The inventory of a form surface is the rendered page, which shows one step, so:
//   fields   each step holds its schema fields in schema order. A rendered field node is the schema field whose label is
//            its label, or whose options are its choices (a tiles field); every other schema field (a later step's, or one
//            the first step shows only while another field has a value) is built from the schema
//            (lib/skeleton-form-step-parts.mjs::schemaFieldNode): its block by the field's type, its label, required mark,
//            help text and `fieldName` the draft's, and Fill writes the rest from the schema (lib/fill-form.mjs::formWrites).
//            A rendered field no schema field claims stays in the first step, ahead of the schema's.
//   content  a rendered element whose text is bound to the current step's record (a heading reading `cur.title`) is that
//            step's content: it moves into the first step, and each later step holds a copy with that step's value, reading
//            the same draft element for its look.
//   chrome   the draft's own step indicator, "Step n of m" count and Next / Back buttons are what the form block draws for
//            itself (its progress bar, step list and Previous / Next buttons), so they are absorbed, never copied as static
//            blocks (lib/skeleton-form-step-parts.mjs::stepChrome; rules.formSteps).
// lib/fill-form.mjs::formWrites reads the same order: steps by schema order, then the review.
import { formSchemaOf } from './fill-form-schema.mjs';
import { stepChrome, schemaFieldNode, pairFields, boundKey, boundCopy, isField } from './skeleton-form-step-parts.mjs';

const hasStepNodes = ( n ) => ( n.innerBlocks || [] ).some( ( k ) => 'sgs/form-step' === k.name || 'sgs/form-review' === k.name );

function findForm( list ) {
	for ( const n of list ) {
		if ( 'sgs/form' === n.name ) {
			return n;
		}
		const inner = findForm( n.innerBlocks || [] );
		if ( inner ) {
			return inner;
		}
	}
	return null;
}

// Removes every node `take` picks from `list` (depth first, a picked node with everything in it); an ancestor left with no
// children goes too. Returns the picked nodes in document order.
function takeWhere( list, take, out = [] ) {
	for ( let i = 0; i < list.length; i++ ) {
		const n = list[ i ];
		if ( take( n ) ) {
			out.push( n );
			list.splice( i--, 1 );
			continue;
		}
		if ( n.innerBlocks?.length ) {
			takeWhere( n.innerBlocks, take, out );
			! n.innerBlocks.length && list.splice( i--, 1 );
		}
	}
	return out;
}

const holds = ( n, pick ) => pick( n ) || ( n.innerBlocks || [] ).some( ( k ) => holds( k, pick ) );

// The skeleton with the form's steps and review proposed, or the skeleton itself when the surface is not a form, the draft holds
// no multi-step schema, or the form already carries step nodes. `component` is the draft component the form surface's record
// names (its `dc`): its own schema, never another form's; none reads the first schema the record holds. rules: the standing
// rules (formControl, optionSetForm, cardHeading, formSteps); has( block, attr ): whether the block holds the attribute;
// draftOf( node ): { chips, holes, inLoop, handlers } of the node's draft element (formStepContext), or null; absorb( node,
// reason, role ): told of each node the form draws itself (and each node inside it), so its row is settled; note( text ): a
// schema field the form blocks hold no field for, or a setting a built node cannot hold.
export function formStepNodes( skeleton, { factRecord, surfaceKind, component = null, rules = {}, has = () => true, draftOf = () => null, absorb = () => {}, note = () => {} } ) {
	const schema = 'form' === surfaceKind ? formSchemaOf( factRecord, component ) : null;
	if ( ! schema || schema.steps.length < 2 ) {
		return skeleton;
	}
	const form = findForm( skeleton );
	if ( form && hasStepNodes( form ) ) {
		return skeleton;
	}
	const host = form || { name: 'sgs/form', attributes: {}, innerBlocks: skeleton };
	const steps = schema.steps;
	const first = steps.find( ( s ) => s.fields.length );
	const keyOf = ( n ) => boundKey( n, draftOf( n ), steps, first );
	const content = ( n ) => isField( n ) || null !== keyOf( n );
	// Where the first field or step content sat among the form's children is where the steps go.
	const before = host.innerBlocks.slice();
	const at = Math.max( 0, before.findIndex( ( n ) => holds( n, content ) ) );
	// The draft's own step navigation is the form's: absorbed, with every node inside it.
	const chrome = stepChrome( { steps, rules: rules.formSteps, draftOf } );
	takeWhere( host.innerBlocks, chrome.is ).forEach( ( n ) => {
		const role = chrome.roleOf( n );
		const all = ( k ) => {
			absorb( k, chrome.reasonOf( n ), role );
			( k.innerBlocks || [] ).forEach( all );
		};
		all( n );
	} );
	// The order the content and the fields sat in: content before the first field leads each step, the rest follows it.
	const order = [];
	const walk = ( list ) => list.forEach( ( n ) => {
		order.push( n );
		! isField( n ) && walk( n.innerBlocks || [] );
	} );
	walk( host.innerBlocks );
	const moved = takeWhere( host.innerBlocks, content );
	const fields = moved.filter( isField );
	const firstField = fields.length ? order.indexOf( fields[ 0 ] ) : Infinity;
	const bound = moved.filter( ( n ) => ! isField( n ) ).map( ( n ) => ( { node: n, key: keyOf( n ), lead: order.indexOf( n ) < firstField } ) );
	const paired = pairFields( fields, steps, { rules, draftOf } );
	const made = steps.map( ( s ) => {
		if ( ! s.fields.length ) {
			return { name: 'sgs/form-review', attributes: {}, innerBlocks: [] };
		}
		const own = bound.map( ( b ) => ( s === first ? b : { ...b, node: boundCopy( b.node, b.key, first, s ) } ) );
		const kids = s.fields.flatMap( ( f ) => {
			const hit = paired.byField.get( f );
			if ( hit ) {
				return [ hit ];
			}
			const built = schemaFieldNode( f, { rules, has } );
			built.note && note( `${ s.label }: ${ built.note }` );
			return built.node ? [ built.node ] : [];
		} );
		const lead = own.filter( ( b ) => b.lead ).map( ( b ) => b.node );
		const tail = own.filter( ( b ) => ! b.lead ).map( ( b ) => b.node );
		return { name: 'sgs/form-step', attributes: { label: s.label }, innerBlocks: [ ...lead, ...( s === first ? paired.unclaimed : [] ), ...kids, ...tail ] };
	} );
	// The children that sat before the anchor and are still here: the steps go after them.
	const kept = before.slice( 0, at ).filter( ( n ) => host.innerBlocks.includes( n ) ).length;
	host.innerBlocks.splice( kept, 0, ...made );
	return form ? skeleton : [ host ];
}

// formStepNodes's reading of the proposal (lib/skeleton-propose.mjs::proposeSkeleton): m, view, nodeOfKey (element key -> its
// node), rowOf (element key -> its row), rows, rules (the standing rules) and attr( block, attr ) (the framework DB's
// attribute check). Returns { rules, has, draftOf, absorb, note }:
//   draftOf  a node's draft element: its choices (the words of the buttons it holds), its template's holes, whether it sits in
//            a loop, and the expressions of its event handlers (`{{ next }}` is `next`);
//   absorb   the node's row (and the rows absorbed into it) settled as drawn by the form; beside the step list or the step
//            count, a wordless element no block fits (the progress line) is drawn by the form too;
//   note     a line on the root row's slot notes.
export function formStepContext( { m, view, nodeOfKey, rowOf, rows, rules = {}, attr = null } ) {
	const keyOf = new Map( Object.entries( nodeOfKey ).map( ( [ k, n ] ) => [ n, k ] ) );
	const draftOf = ( n ) => {
		const e = m.byKey[ keyOf.get( n ) ];
		if ( ! e ) {
			return null;
		}
		const t = view.entry( e )?.template;
		const handlers = Object.entries( t?.attrs || {} ).filter( ( [ a ] ) => /^on[A-Z]/.test( a ) ).map( ( [ , v ] ) => String( v ).replace( /^\s*\{\{\s*|\s*\}\}\s*$/g, '' ) );
		return { chips: m.blockKids( e ).filter( ( k ) => 'button' === view.realTag( k ) ).map( ( k ) => m.words( k ) ), holes: t?.holes || [], inLoop: !! t?.membership?.scFor?.length, handlers };
	};
	const R = rules.formSteps || {};
	const settle = ( row, reason ) => Object.assign( row, { action: 'absorbed', block: null, into: m.root.key, rule: 'formSteps', reason: `drawn by sgs/form: ${ reason }` } );
	const absorb = ( n, reason, role ) => {
		const key = keyOf.get( n );
		const row = rowOf[ key ];
		if ( ! row || ! reason ) {
			return;
		}
		settle( row, reason );
		rows.filter( ( r ) => r.into === key && 'absorbed' === r.action ).forEach( ( r ) => settle( r, reason ) );
		const e = m.byKey[ key ];
		if ( e && [ 'indicator', 'count' ].includes( role ) && R.reasons?.progress ) {
			const quiet = ( k ) => ! m.words( k ) && ! String( k.allText ?? '' ).trim();
			m.els.filter( ( k ) => k.parentKey === e.parentKey && k !== e && 'unresolved' === rowOf[ k.key ]?.action && quiet( k ) ).forEach( ( k ) => settle( rowOf[ k.key ], R.reasons.progress ) );
		}
	};
	const note = ( text ) => {
		const root = rowOf[ m.root.key ];
		root && ( root.slotNotes = [ ...( root.slotNotes || [] ), text ] );
	};
	return { rules, has: attr ? ( b, a ) => !! attr( b, a ) : () => true, draftOf, absorb, note };
}
