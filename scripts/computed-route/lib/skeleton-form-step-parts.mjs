// The parts lib/skeleton-form-steps.mjs::formStepNodes reads a multi-step draft form by (Spec 48 FR-48-57): the draft's own
// step navigation the form block draws itself (`stepChrome`), the rendered field each schema field is (`pairFields`), the
// field node a schema field the page never rendered becomes (`schemaFieldNode`) and the elements bound to the current step's
// record (`boundKey`, `boundCopy`).
//
// A schema field is read by the keys the draft's logic gives it (lib/fill-form-schema.mjs reads the same record): `name`,
// `label`, `type` (none is a text input), `req` (only `true` marks it required: a test the draft computes from another field
// is a condition, read by Fill), `hint`, `options` and `text` (a tick's own words).

export const isField = ( n ) => /^sgs\/form-field-/.test( n?.name || '' );
const squash = ( s ) => String( s ?? '' ).replace( /\s+/g, ' ' ).trim();
const TEXT_ATTRS = [ 'text', 'content', 'label' ];
const wordsOf = ( n ) => squash( TEXT_ATTRS.map( ( a ) => n?.attributes?.[ a ] ).find( ( v ) => 'string' === typeof v && v.trim() ) );
const matcher = ( spec ) => ( spec?.patterns?.length ? ( s ) => spec.patterns.some( ( p ) => new RegExp( p, spec.flags || '' ).test( s ) ) : () => false );

// Whether a button is the form's Next or Back: 'next' or 'back' when its words or a click handler name moving to the next
// or previous step (rules.formSteps `next` / `back`), else null. Fill reads the same test for the buttons' words
// (lib/fill-form-buttons.mjs).
export function navRole( words, handlers = [], rules = null ) {
	const R = rules || {};
	if ( matcher( R.next?.words )( words ) || handlers.some( matcher( R.next?.handlers ) ) ) {
		return 'next';
	}
	return matcher( R.back?.words )( words ) || handlers.some( matcher( R.back?.handlers ) ) ? 'back' : null;
}

// The draft's own step navigation inside the form. steps: the schema's steps; rules: rules.formSteps; draftOf( node ): the
// node's draft facts ({ handlers }). Returns { is( node ), reasonOf( node ) }:
//   indicator  the lowest node whose texts hold every step's label in schema order (a list of the steps);
//   count      a node whose text is a step count ("Step 1 of 5") whose total is the number of steps;
//   next/back  a button (rules.formSteps.navBlock) whose words or click handler name moving to the next or previous step.
// A node holding a field is never navigation.
export function stepChrome( { steps, rules = null, draftOf = () => null } ) {
	const R = rules || {};
	const labels = steps.map( ( s ) => squash( s.label ) );
	const texts = ( n, out = [] ) => {
		const w = wordsOf( n );
		w && out.push( w );
		( n.innerBlocks || [] ).forEach( ( k ) => texts( k, out ) );
		return out;
	};
	const listsSteps = ( n ) => {
		let i = 0;
		for ( const t of texts( n ) ) {
			t === labels[ i ] && i++;
		}
		return i === labels.length;
	};
	const anyField = ( n ) => isField( n ) || ( n.innerBlocks || [] ).some( anyField );
	const count = matcher( R.countLabel );
	const total = ( w ) => Number( ( w.match( /\d+/g ) || [] ).pop() );
	const role = ( n ) => {
		if ( ! R.reasons || anyField( n ) ) {
			return null;
		}
		if ( listsSteps( n ) && ! ( n.innerBlocks || [] ).some( listsSteps ) ) {
			return 'indicator';
		}
		const w = wordsOf( n );
		if ( w && count( w ) && total( w ) === steps.length ) {
			return 'count';
		}
		if ( R.navBlock !== n.name ) {
			return null;
		}
		return navRole( w, draftOf( n )?.handlers || [], R );
	};
	return { is: ( n ) => null !== role( n ), roleOf: role, reasonOf: ( n ) => R.reasons?.[ role( n ) ] ?? null };
}

// The rendered field node of each schema field: a field node is the first unclaimed schema field (of a field type) whose label
// is the node's label, or whose options are the node's choices (draftOf( node ).chips). Returns { byField (Map schema field ->
// node), unclaimed (the rendered field nodes no schema field claims, in their order) }.
export function pairFields( fields, steps, { rules = {}, draftOf = () => null } ) {
	const byField = new Map();
	const unclaimed = [];
	const all = steps.flatMap( ( s ) => s.fields ).filter( ( f ) => 'field' === kindOf( f, rules ) );
	for ( const n of fields ) {
		const label = squash( n.attributes?.label );
		const chips = ( draftOf( n )?.chips || [] ).map( squash );
		const hit = all.find( ( f ) => ! byField.has( f ) && ( ( label && squash( f.label ) === label ) || ( chips.length && Array.isArray( f.options ) && f.options.length === chips.length && f.options.every( ( o, i ) => squash( o ) === chips[ i ] ) ) ) );
		hit ? byField.set( hit, n ) : unclaimed.push( n );
	}
	return { byField, unclaimed };
}

// The block a schema field's type is, by the standing rules: a type that is a tag of rules.formControl.byTag (select,
// textarea) or an input type of its byType (a required checkbox is the consent field, as rules.formControl says), else the
// draft's own word for it in rules.formSteps.schemaTypes (a `type` to read as an input type, or a `rule` whose block it is).
// Returns { block, kind: 'field' | 'content' } or null for a type the rules name no block for (and for a button type).
function blockOf( f, rules, type = f.type ? String( f.type ).toLowerCase() : 'text', depth = 0 ) {
	const F = rules.formControl || {};
	if ( F.byTag?.[ type ] ) {
		return { block: F.byTag[ type ], kind: 'field' };
	}
	if ( ( F.notFields || [] ).includes( type ) ) {
		return null;
	}
	if ( F.byType?.[ type ] ) {
		return { block: 'checkbox' === type && true === f.req && F.consent ? F.consent : F.byType[ type ], kind: 'field' };
	}
	const own = rules.formSteps?.schemaTypes?.[ type ];
	if ( own?.type && depth < 1 ) {
		return blockOf( f, rules, String( own.type ).toLowerCase(), depth + 1 );
	}
	const block = own?.rule ? rules[ own.rule ]?.block : null;
	return block ? { block, kind: isField( { name: block } ) ? 'field' : 'content' } : null;
}

const kindOf = ( f, rules ) => blockOf( f, rules )?.kind ?? 'field';

// The node a schema field becomes when the page never rendered it: { node } or { node: null, note } for a type the rules name
// no block for. A field block holds the field's label (a tick with no label holds its words as the consent text, or as its
// one option's label), required mark, help text and `fieldName`, each where the block holds that setting (has( block, attr ));
// a content block (a heading between fields) holds the label as its text, and a condition it waits on is a note.
export function schemaFieldNode( f, { rules = {}, has = () => true } ) {
	const hit = blockOf( f, rules );
	if ( ! hit ) {
		return { node: null, note: `the draft's field "${ f.name || f.label || '?' }" is a ${ f.type || 'text' } field, and no form block is that (rules.formControl, rules.formSteps.schemaTypes)` };
	}
	const { block, kind } = hit;
	const a = {};
	const put = ( attr, value ) => {
		has( block, attr ) && ( a[ attr ] = value );
		return attr in a;
	};
	if ( 'content' === kind ) {
		TEXT_ATTRS.some( ( attr ) => f.label && put( attr, String( f.label ) ) );
		return { node: { name: block, attributes: a, innerBlocks: [] }, note: false === f.show ? `the draft shows "${ f.label }" only while another field has a value; ${ block } holds no condition, so it always shows` : null };
	}
	f.label ? put( 'label', String( f.label ) ) : f.text && ( put( 'consentText', String( f.text ) ) || put( 'options', [ { value: String( f.text ), label: String( f.text ) } ] ) );
	true === f.req && put( 'required', true );
	f.hint && put( 'helpText', String( f.hint ) );
	f.name && put( 'fieldName', String( f.name ) );
	return { node: { name: block, attributes: a, innerBlocks: [] }, note: null };
}

// The key of the current step's record a node's text is bound to, or null: the node's draft element sits in no loop, a text
// hole of it reads `<record>.<key>`, every step with fields holds a string at that key, and the node's words are the first
// step's value there. d: draftOf( node ) ({ holes, inLoop }).
export function boundKey( n, d, steps, first ) {
	if ( ! d || d.inLoop || ! first || isField( n ) ) {
		return null;
	}
	const w = wordsOf( n );
	for ( const h of d.holes || [] ) {
		const key = 'text' === String( h.where ).split( ':' )[ 0 ] ? String( h.path || '' ).split( '.' ).slice( 1 ).pop() : null;
		if ( key && w && squash( first[ key ] ) === w && steps.every( ( s ) => ! s.fields.length || 'string' === typeof s[ key ] ) ) {
			return key;
		}
	}
	return null;
}

// A bound node's copy for another step: the same draft element (its look), with the attribute that held the first step's value
// holding this step's.
export function boundCopy( n, key, first, step ) {
	const copy = structuredClone( n );
	const attr = TEXT_ATTRS.find( ( a ) => squash( copy.attributes?.[ a ] ) === squash( first[ key ] ) );
	attr && ( copy.attributes[ attr ] = step[ key ] );
	return copy;
}
