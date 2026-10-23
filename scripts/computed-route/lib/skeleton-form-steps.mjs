// The steps of a multi-step draft form in the skeleton (Spec 48 FR-48-57, FR-48-83 §10.1). The inventory of a form surface is the
// rendered page, which shows one step, so the proposal's field nodes are the first step's. A draft whose logic holds a form schema
// of more than one step (lib/fill-form-schema.mjs::formSchemaOf) gets its form as `sgs/form` > one `sgs/form-step` per schema
// step that has fields (its `label` the draft's) and an `sgs/form-review` where the schema has a step with no fields. The rendered
// field nodes move into the first step in document order; a later step holds the fields the draft draws only when it reaches
// that step, which the page read never saw (Phase 2 builds them from the schema). lib/fill-form.mjs::formWrites reads the same
// order: steps by schema order, then the review.
import { formSchemaOf } from './fill-form-schema.mjs';

const isField = ( n ) => /^sgs\/form-field-/.test( n?.name || '' );
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

// Removes every field node from `list` (depth first); an ancestor left with no children goes too.
function takeFields( list ) {
	for ( let i = list.length - 1; i >= 0; i-- ) {
		const n = list[ i ];
		if ( isField( n ) ) {
			list.splice( i, 1 );
			continue;
		}
		if ( n.innerBlocks?.length ) {
			takeFields( n.innerBlocks );
			! n.innerBlocks.length && list.splice( i, 1 );
		}
	}
}

const fieldsOf = ( list, out = [] ) => {
	for ( const n of list ) {
		isField( n ) ? out.push( n ) : fieldsOf( n.innerBlocks || [], out );
	}
	return out;
};

// The skeleton with the form's steps and review proposed, or the skeleton itself when the surface is not a form, the draft holds
// no multi-step schema, or the form already carries step nodes.
export function formStepNodes( skeleton, { factRecord, surfaceKind } ) {
	const schema = 'form' === surfaceKind ? formSchemaOf( factRecord ) : null;
	if ( ! schema || schema.steps.length < 2 ) {
		return skeleton;
	}
	const form = findForm( skeleton );
	if ( form && hasStepNodes( form ) ) {
		return skeleton;
	}
	const host = form || { name: 'sgs/form', attributes: {}, innerBlocks: skeleton };
	const fields = fieldsOf( host.innerBlocks );
	// Where the first field sat among the form's children is where the steps go.
	const at = Math.max( 0, host.innerBlocks.findIndex( ( n ) => isField( n ) || fieldsOf( n.innerBlocks || [] ).length ) );
	takeFields( host.innerBlocks );
	const made = [];
	let first = true;
	for ( const s of schema.steps ) {
		if ( s.fields.length ) {
			made.push( { name: 'sgs/form-step', attributes: { label: s.label }, innerBlocks: first ? fields : [] } );
			first = false;
		} else {
			made.push( { name: 'sgs/form-review', attributes: {}, innerBlocks: [] } );
		}
	}
	host.innerBlocks.splice( Math.min( at, host.innerBlocks.length ), 0, ...made );
	return form ? skeleton : [ host ];
}
