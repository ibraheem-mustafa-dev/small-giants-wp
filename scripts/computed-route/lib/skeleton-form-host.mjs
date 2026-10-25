// The form host of a draft form that has no <form> element (Spec 48 FR-48-57). A <form> element is the `sgs/form` block by the
// rules.formHost rule (lib/skeleton-rules.mjs); a draft whose logic holds a form schema (lib/fill-form-schema.mjs::formSchemaOf)
// but draws its fields without one (a wizard component whose steps are plain elements) is a form all the same, so the lowest
// node holding every field that no `sgs/form` holds is wrapped in an `sgs/form` node. The host has no draftRef, so Fill reads
// nothing for it and its children inherit past it, as for the host lib/skeleton-form-steps.mjs makes.
import { formSchemaOf } from './fill-form-schema.mjs';

const isField = ( n ) => /^sgs\/form-field-/.test( n?.name || '' );

// The fields in `list` that no sgs/form holds, each with the chain of nodes from the top of `list` down to it.
function orphans( list, chain = [], out = [] ) {
	for ( const n of list ) {
		if ( 'sgs/form' === n.name ) {
			continue;
		}
		const here = [ ...chain, n ];
		isField( n ) ? out.push( here ) : orphans( n.innerBlocks || [], here, out );
	}
	return out;
}

// The skeleton with its orphan fields held by one form node, or the skeleton itself when the draft holds no form schema or no
// field is outside a form.
export function formHostNodes( skeleton, { factRecord } ) {
	if ( ! formSchemaOf( factRecord ) ) {
		return skeleton;
	}
	const found = orphans( skeleton );
	if ( ! found.length ) {
		return skeleton;
	}
	// The deepest node that every chain passes through and that is not a field: the lowest node holding every field.
	const room = Math.min( ...found.map( ( c ) => c.length ) ) - 1;
	let depth = -1;
	while ( depth + 1 < room && found.every( ( c ) => c[ depth + 1 ] === found[ 0 ][ depth + 1 ] ) ) {
		depth++;
	}
	const host = { name: 'sgs/form', attributes: {}, innerBlocks: [] };
	// No node holds every field: the whole skeleton is the form.
	if ( depth < 0 ) {
		host.innerBlocks = skeleton;
		return [ host ];
	}
	const top = found[ 0 ][ depth ];
	const parent = depth ? found[ 0 ][ depth - 1 ].innerBlocks : skeleton;
	host.innerBlocks = [ top ];
	parent.splice( parent.indexOf( top ), 1, host );
	return skeleton;
}
