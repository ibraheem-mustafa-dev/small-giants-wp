// The form controls a draft form holds in an `sc-if` that is closed at rest (Spec 48 FR-48-57, "conditional fields"). The
// inventory is the rendered page, so a control inside a closed condition (the cookie count and date of a bulk order, shown only
// while the topic is "bulk") is in no inventory row and no skeleton node, though it is in the fact record. Each such control
// becomes a field node of the form, built from the record:
//   block       the SGS field block for the control's tag and type (rules.formControl, as lib/skeleton-rules.mjs::controlBlock);
//   label       the words of the `label` element that wraps it, required the control's literal `required`;
//   position    after the form's last node whose draft element comes before the control in the template;
//   `hiddenControl`  the control's template key. The node has no `draftRef`, so Fill measures nothing for it: its look is the
//               form block's own field settings, which Fill reads from the form's rendered fields, and its content (placeholder,
//               input mode, condition) is read from the record (lib/fill-form.mjs::hiddenControlOf, lib/fill-form-conditions.mjs).
// Only a control whose condition Fill can write as a conditional field is built: its `sc-if` tests one choice of the form (a
// renderVals property comparing a state key with a literal, lib/fill-form-conditions.mjs::stateCondition) and a button of the
// form is that choice. A control behind any other condition (a toggle, a mode of another flow) would show for ever as a field,
// so it is left out and named on the form's row.
// A form surface whose draft holds a form schema builds its unrendered fields from the schema instead
// (lib/skeleton-form-steps.mjs), so it is left alone.
import { formSchemaOf } from './fill-form-schema.mjs';
import { parseTemplateKey } from './fact-key.mjs';
import { stateCondition } from './fill-form-conditions.mjs';

const tplNumber = ( key ) => Number( parseTemplateKey( key )?.tpl );
const squash = ( s ) => String( s ?? '' ).replace( /\s+/g, ' ' ).trim();
// A literal attribute value (a binding is not one).
const literal = ( v ) => ( null == v || /\{\{/.test( String( v ) ) ? null : String( v ) );

// The field block a recorded control becomes, or null when it is no field (a submit, reset or image input, or no rule).
export function hiddenControlBlock( t, F ) {
	if ( ! F || ! ( F.tags || [] ).includes( t.realTag ) ) {
		return null;
	}
	if ( 'input' !== t.realTag ) {
		return F.byTag?.[ t.realTag ] || null;
	}
	const type = String( literal( t.attrs?.type ) ?? 'text' ).toLowerCase();
	return ( F.notFields || [] ).includes( type ) || 'hidden' === type ? null : F.byType?.[ type ] || F.fallback || null;
}

// The recorded controls of the form `formKey` that sit in a condition the render did not open: a control of the form's
// template chain that is in no loop, has a condition of its own beyond the form's, and is no rendered inventory element.
// rendered: the template keys of the inventory's elements. Returns the fact elements in template order.
export function hiddenControls( { elements, formKey, rendered, F } ) {
	const form = elements[ formKey ]?.template;
	const outer = new Set( ( form?.membership?.scIf || [] ).map( ( m ) => m.key ) );
	return Object.values( elements )
		.map( ( e ) => e.template )
		.filter( ( t ) => t.parentChain?.includes( formKey ) && ! rendered.has( t.key ) && ! t.membership?.scFor?.length
			&& ( t.membership?.scIf || [] ).some( ( m ) => ! outer.has( m.key ) && m.key !== formKey ) && hiddenControlBlock( t, F ) )
		.sort( ( a, b ) => tplNumber( a.key ) - tplNumber( b.key ) );
}

// The words of the label element wrapping a recorded control, or ''.
const labelOf = ( elements, t ) => {
	const label = ( t.parentChain || [] ).map( ( k ) => elements[ k ]?.template ).find( ( p ) => 'label' === p?.realTag );
	return squash( label?.words );
};

// Where a control's node goes in the form: after the node of the last draft element ahead of it, else before the first one
// behind it, else at the end. Returns { list, index } of the form's descendants.
function placeIn( form, n ) {
	const found = [];
	const walk = ( node, list ) => list.forEach( ( x, i ) => {
		const t = 'string' === typeof x.draftRef?.tpl ? tplNumber( x.draftRef.tpl.replace( /#\d+$/, '' ) ) : tplNumber( x.hiddenControl );
		Number.isNaN( t ) || found.push( { list, i, t } );
		walk( x, x.innerBlocks || [] );
	} );
	walk( form, form.innerBlocks || [] );
	const before = found.filter( ( f ) => f.t < n ).sort( ( a, b ) => b.t - a.t || b.i - a.i )[ 0 ];
	if ( before ) {
		return { list: before.list, index: before.i + 1 };
	}
	const after = found.filter( ( f ) => f.t > n ).sort( ( a, b ) => a.t - b.t || a.i - b.i )[ 0 ];
	return after ? { list: after.list, index: after.i } : { list: form.innerBlocks, index: form.innerBlocks.length };
}

// The skeleton with a field node added to each form for every hidden control of it. formNodes: [ { node, key } ] the form
// nodes with their template keys; rendered, rules (the standing rules), has( block, attr ) and note( formNode, text ).
// Returns the skeleton (changed in place).
export function hiddenFieldNodes( skeleton, { factRecord, formNodes, rendered, choices = new Set(), scriptOf = () => null, rules = {}, has = () => true, note = () => {} } ) {
	const F = rules.formControl;
	if ( ! F || ! factRecord || formSchemaOf( factRecord ) ) {
		return skeleton;
	}
	for ( const { node, key } of formNodes ) {
		const left = [];
		for ( const t of hiddenControls( { elements: factRecord.elements, formKey: key, rendered, F } ) ) {
			const shown = stateCondition( t.membership.scIf, scriptOf( t.key.split( '/' )[ 0 ] ) );
			if ( ! shown || ! choices.has( shown.label ) ) {
				left.push( t );
				continue;
			}
			const block = hiddenControlBlock( t, F );
			const label = labelOf( factRecord.elements, t );
			const required = /^(?:required|true|\{\{\s*true\s*\}\})$/.test( String( t.attrs?.required ?? 'unset' ).trim() ) || '' === t.attrs?.required;
			const attributes = {};
			label && has( block, 'label' ) && ( attributes.label = label );
			required && has( block, 'required' ) && ( attributes.required = true );
			const at = placeIn( node, tplNumber( t.key ) );
			at.list.splice( at.index, 0, { name: block, attributes, innerBlocks: [], hiddenControl: t.key } );
			const outer = new Set( ( factRecord.elements[ key ]?.template.membership?.scIf || [] ).map( ( m ) => m.key ) );
			note( node, `${ block } "${ label || t.key }" is built from the fact record (${ t.key }): the draft shows it only while ${ ( t.membership.scIf || [] ).filter( ( m ) => m.key !== key && ! outer.has( m.key ) ).map( ( m ) => m.value ).join( ' and ' ) }, so no rendered element carries it` );
		}
		left.length && note( node, `${ left.length } control${ 1 === left.length ? '' : 's' } in a condition that is not a choice of this form (${ left.map( ( t ) => t.key ).join( ', ' ) }) ${ 1 === left.length ? 'is' : 'are' } not built: as a field ${ 1 === left.length ? 'it' : 'they' } would show for ever` );
	}
	return skeleton;
}

// hiddenFieldNodes's reading of the proposal (lib/skeleton-propose.mjs::proposeSkeleton): m, view, nodeOfKey (element key -> its
// node), rowOf (element key -> its row), rules (the standing rules) and attr( block, attr ) (the framework DB's attribute
// check) and scriptOf( component ) (the draft component's script text, or null). Returns { factRecord, formNodes, rendered,
// choices, scriptOf, rules, has, note }: the form nodes with their template keys, the template keys of the elements the render
// shows, the words of the buttons it shows (the choices a condition can test) and a note on the form's row.
export function hiddenFieldContext( { factRecord, m, view, nodeOfKey, rowOf, rules = {}, attr = null, scriptOf = () => null } ) {
	const keyOf = new Map( Object.entries( nodeOfKey ).map( ( [ k, n ] ) => [ n, k ] ) );
	const formNodes = Object.values( nodeOfKey ).filter( ( n ) => 'sgs/form' === n.name ).map( ( node ) => ( { node, key: view.entry( m.byKey[ keyOf.get( node ) ] )?.template.key } ) ).filter( ( f ) => f.key );
	const rendered = new Set( m.els.filter( ( e ) => Object.values( e.visible || {} ).some( Boolean ) ).map( ( e ) => view.entry( e )?.template.key ).filter( Boolean ) );
	const note = ( node, text ) => {
		const row = rowOf[ keyOf.get( node ) ];
		row && ( row.slotNotes = [ ...( row.slotNotes || [] ), text ] );
	};
	const choices = new Set( m.els.filter( ( e ) => 'button' === view.realTag( e ) ).map( ( e ) => squash( m.words( e ) ) ).filter( Boolean ) );
	return { factRecord, formNodes, rendered, choices, scriptOf, rules, has: attr ? ( b, a ) => !! attr( b, a ) : () => true, note };
}
