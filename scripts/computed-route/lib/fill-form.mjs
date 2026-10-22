// The form writer (Spec 48 FR-48-57, FR-48-48; the route half of Spec 04 FR-4-3 to FR-4-11). A draft form control that the
// skeleton proposed as an `sgs/form-field-*` block (skeleton-decisions.json `formControl`, `optionSetForm`) gets the field's own
// settings from the draft: what the control renders (lib/fill-read.mjs, `snap.form`) and what the draft's logic says about it
// (lib/fill-form-schema.mjs). Every attribute written is one the block holds, by framework-DB query (FP-1); a draft fact whose
// block has no setting for it is a named UNMAPPED row, never dropped and never an inline attribute.
//   placeholder, autocomplete, inputmode, rows, min, max, step, a text or textarea `maxLength` (the attribute, else the draft's
//   "n / max" counter) with `showCounter`, the select's `options` (the empty "Please select" option is the `placeholder`),
//   `defaultValue` (a select's only when it is one of its options), `defaultChecked` (an input's `checked`, or a
//   `role="checkbox"` button's `aria-checked`), the file field's `allowedTypes` from `accept`, `tiles` (label, value and the
//   description line) and `multiSelect` from a group of choice chips, `floatingLabel` and its position from where the label
//   sits, `msgInvalid` from the schema's validation copy, `valueFromParam` where a link of the draft carries the control's name
//   as a query parameter, and `conditionalField` / `conditionalOperator` / `conditionalValue` from the draft's `show` test.
// A form, its steps and its review step get theirs on the nodes the skeleton names as those blocks: `savedProgress`, each
// step's `label` and the review's `intro` and Edit label. A button is `isSubmit` when the draft's is `type="submit"`.
import fs from 'node:fs';
import path from 'node:path';
import { setAttr } from './tree.mjs';
import { formSchemaOf, schemaFieldOf, schemaChipsOf, conditionsFromSource, linkParams, savesProgress } from './fill-form-schema.mjs';

export const COVERAGE_WRITES = [
	'aria-role:checkbox',
	'html-attr:button.type',
	'html-attr:input.accept',
	'html-attr:input.autocomplete',
	'html-attr:input.placeholder',
	'html-attr:input.required',
	'html-attr:input.value',
	'html-attr:option.value',
	'html-attr:select.name',
	'html-attr:select.required',
	'html-attr:textarea.maxlength',
	'html-attr:textarea.placeholder',
	'html-attr:textarea.required',
	'html-attr:textarea.rows',
	'html:button',
	'html:form',
	'html:input',
	'html:label',
	'html:option',
	'html:select',
	'html:textarea',
	'input-type:checkbox',
	'input-type:email',
	'input-type:file',
	'input-type:tel',
	'input-type:text',
];

// The attribute definition of a block by framework-DB query: { default } or null when the block holds no such attribute.
export function attrDef( db, block, attr ) {
	const row = db.prepare( 'SELECT default_value FROM block_attributes WHERE block_slug = ? AND attr_name = ?' ).get( block, attr );
	if ( ! row ) {
		return null;
	}
	try {
		return { default: null == row.default_value ? undefined : JSON.parse( row.default_value ) };
	} catch {
		return { default: row.default_value };
	}
}

const same = ( a, b ) => JSON.stringify( a ) === JSON.stringify( b );
const set = ( v ) => null !== v && undefined !== v && '' !== v;
const num = ( v ) => ( set( v ) && Number.isFinite( Number( v ) ) ? Number( v ) : null );

// The writes, UNMAPPED rows and notes for one field block. block: its slug; attributes: what the node holds; el: the draft
// control's `snap.form`; field: the schema field it is ({ field, step }) or null; param: the link parameter names of the
// draft; condition: { field, op, value } | { reason } | null.
export function formFieldWrites( { db, block, attributes = {}, el, field = null, params = new Set(), condition = null } ) {
	const out = { writes: [], unmapped: [], notes: [] };
	if ( ! el ) {
		return out;
	}
	const gap = ( property, value, reason ) => out.unmapped.push( { property, value: JSON.stringify( value ), slot: '', reason: `${ block } holds no setting for ${ reason }` } );
	const put = ( attr, value, property, why ) => {
		const def = attrDef( db, block, attr );
		if ( ! def ) {
			gap( property, value, why || `the draft's ${ property }` );
			return false;
		}
		if ( ! same( value, def.default ) && ! same( value, attributes[ attr ] ) ) {
			out.writes.push( { attr, value, merge: 'replace' } );
		}
		return true;
	};
	const optional = ( attr, value ) => {
		if ( attrDef( db, block, attr ) ) {
			put( attr, value );
		}
	};
	const f = field?.field || {};
	const textual = !! attrDef( db, block, 'placeholder' ) || !! attrDef( db, block, 'maxLength' );
	if ( set( el.placeholder ) || set( f.ph ) ) {
		put( 'placeholder', el.placeholder || f.ph, 'placeholder' );
	}
	if ( set( el.autocomplete ) ) {
		put( 'autocomplete', el.autocomplete, 'autocomplete' );
	}
	if ( set( el.inputmode ) ) {
		put( 'inputmode', el.inputmode, 'inputmode' );
	}
	if ( set( el.rows ) && 'textarea' === el.tag ) {
		put( 'rows', num( el.rows ), 'rows' );
	}
	for ( const a of [ 'min', 'max', 'step' ] ) {
		if ( set( el[ a ] ) && 'number' === el.type ) {
			put( a, num( el[ a ] ), a );
		}
	}
	const cap = num( el.maxlength ) ?? num( el.counterMax );
	if ( null !== cap && textual ) {
		put( 'maxLength', cap, 'maxlength' );
		if ( null !== num( el.counterMax ) ) {
			put( 'showCounter', true, 'counter', 'a live character counter' );
		}
	}
	if ( el.options?.length ) {
		const real = el.options.filter( ( o ) => '' !== o.value );
		const blank = el.options.find( ( o ) => '' === o.value );
		put( 'options', real.map( ( o ) => ( { value: o.value, label: o.label } ) ), 'option value', 'its options' );
		blank && set( blank.label ) && put( 'placeholder', blank.label, 'placeholder' );
		if ( set( el.value ) && real.some( ( o ) => o.value === el.value && o.selected ) ) {
			put( 'defaultValue', el.value, 'value' );
		}
	} else if ( set( el.value ) && 'file' !== el.type && 'checkbox' !== el.type && 'radio' !== el.type ) {
		put( 'defaultValue', el.value, 'value' );
	}
	if ( el.checked ) {
		put( 'defaultChecked', true, 'checked', 'a ticked start' );
	} else if ( true === f.dflt ) {
		put( 'defaultChecked', true, 'checked', 'a ticked start' );
	}
	if ( set( el.accept ) ) {
		put( 'allowedTypes', String( el.accept ).split( ',' ).map( ( t ) => t.trim() ).filter( Boolean ), 'accept' );
	}
	if ( el.chips?.length ) {
		put( 'tiles', el.chips.map( ( c ) => ( { label: c.label, value: c.label, ...( c.description ? { description: c.description } : {} ) } ) ), 'choice chips', 'its choices' );
		if ( true === f.multi ) {
			optional( 'multiSelect', true );
		}
	}
	if ( null !== el.labelInside && undefined !== el.labelInside && attrDef( db, block, 'floatingLabel' ) ) {
		el.labelInside ? optional( 'floatingLabelPosition', 'inside' ) : put( 'floatingLabel', false, 'label' );
	}
	if ( set( f.rxMsg ) ) {
		put( 'msgInvalid', f.rxMsg, 'validation message' );
	}
	const names = [ el.name, el.id, ...( field ? [ f.name ] : [] ) ].filter( Boolean );
	const linked = [ ...params ].find( ( p ) => names.some( ( n ) => n === p || n.endsWith( `-${ p }` ) ) );
	if ( linked ) {
		put( 'valueFromParam', linked, 'link parameter', `a value taken from the link's ${ linked } parameter` );
	}
	if ( condition?.reason ) {
		out.unmapped.push( { property: 'conditional field', value: JSON.stringify( condition.field ), slot: '', reason: `${ block } waits on one field, operator and value, and the draft's test is ${ condition.reason }` } );
	} else if ( condition ) {
		put( 'conditionalField', condition.field, 'conditional field' );
		put( 'conditionalOperator', condition.op, 'conditional field' );
		put( 'conditionalValue', condition.value, 'conditional field' );
	}
	return out;
}

// Reads a written value back against the draft fact it came from; returns the problems (empty when they agree).
export function formReadback( { writes, el } ) {
	const got = Object.fromEntries( writes.map( ( w ) => [ w.attr, w.value ] ) );
	const bad = [];
	if ( undefined !== got.autocomplete && got.autocomplete !== el.autocomplete ) {
		bad.push( `autocomplete ${ got.autocomplete } is not the draft's ${ el.autocomplete }` );
	}
	if ( undefined !== got.maxLength && got.maxLength !== ( num( el.maxlength ) ?? num( el.counterMax ) ) ) {
		bad.push( `maxLength ${ got.maxLength } is not the draft's cap` );
	}
	if ( undefined !== got.placeholder && ! [ el.placeholder, ...( el.options || [] ).map( ( o ) => o.label ) ].includes( got.placeholder ) ) {
		bad.push( `placeholder ${ got.placeholder } is not the draft's` );
	}
	return bad;
}

// A single node's write: the attribute onto the tree node and a content write record for the report.
function apply( out, node, ref, rec, w ) {
	if ( same( w.value, node.attributes?.[ w.attr ] ) ) {
		return;
	}
	const { before, after } = setAttr( node, w );
	out.writes.push( { node: ref, index: rec.index, block: rec.name, slot: '', prop: '(content)', attr: w.attr, before, after, widths: [], how: 'content' } );
}

// Fill's form pass. nodes/flat/refOf: the skeleton nodes, their tree nodes and the ref function; reads: readDraft's result;
// facts: the fact record (or null); flags: intake's flags; db: the framework DB; source: { component: script text } for the
// draft's conditions ({ component: script text }, see formSources). Returns { writes, unmapped, notes }.
export function formWrites( { nodes, flat, refOf, reads, facts, flags = [], db, sources = {} } ) {
	const out = { writes: [], unmapped: [], notes: [] };
	const schema = formSchemaOf( facts );
	const params = linkParams( facts );
	const conditions = schema ? conditionsFromSource( sources[ schema.component ] ) : {};
	const steps = schema ? schema.steps.filter( ( s ) => s.fields.length ) : [];
	const review = schema ? schema.steps.find( ( s ) => ! s.fields.length ) : null;
	let stepNo = 0;
	for ( const rec of nodes ) {
		const node = flat[ rec.index ];
		const ref = refOf( node );
		const target = rec.targets.find( ( t ) => '' === t.slot );
		const el = target ? reads.widths?.[ 1440 ]?.[ target.id ]?.form : null;
		const take = ( r ) => {
			r.writes.forEach( ( w ) => apply( out, node, ref, rec, w ) );
			out.unmapped.push( ...r.unmapped.map( ( u ) => ( { node: ref, block: rec.name, ...u } ) ) );
			out.notes.push( ...r.notes.map( ( n ) => `${ ref } ${ rec.name }: ${ n }` ) );
		};
		if ( /^sgs\/form-field-/.test( rec.name ) && el ) {
			const hit = ( el.chips ? schemaChipsOf( schema, el.chips ) : schemaFieldOf( schema, el ) );
			take( formFieldWrites( { db, block: rec.name, attributes: node.attributes || {}, el, field: hit, params, condition: hit ? conditions[ hit.field.name ] || null : null } ) );
		} else if ( 'sgs/button' === rec.name && el && 'button' === el.tag && 'submit' === el.type && attrDef( db, 'sgs/button', 'isSubmit' ) ) {
			apply( out, node, ref, rec, { attr: 'isSubmit', value: true, merge: 'replace' } );
		} else if ( 'sgs/form' === rec.name && schema && savesProgress( flags, schema.component ) ) {
			apply( out, node, ref, rec, { attr: 'savedProgress', value: true, merge: 'replace' } );
		} else if ( 'sgs/form-step' === rec.name && steps[ stepNo ] ) {
			apply( out, node, ref, rec, { attr: 'label', value: steps[ stepNo++ ].label, merge: 'replace' } );
		} else if ( 'sgs/form-review' === rec.name && review?.intro ) {
			apply( out, node, ref, rec, { attr: 'intro', value: review.intro, merge: 'replace' } );
			const edit = Object.values( facts?.elements || {} ).find( ( e ) => 'button' === e.template?.tag && e.template.membership?.scFor?.length && /^edit/i.test( e.template.words || '' ) && String( e.template.key ).startsWith( `${ schema.component }/` ) );
			edit && edit.template.words !== 'Edit' && apply( out, node, ref, rec, { attr: 'editLabel', value: edit.template.words, merge: 'replace' } );
		}
	}
	return out;
}

// The scripts of the draft's components that hold a form schema: { component: text } read from `<folder>/<component>.dc.html`.
export function formSources( folder, facts ) {
	const schema = formSchemaOf( facts );
	const file = folder && schema ? path.join( folder, `${ schema.component }.dc.html` ) : null;
	return file && fs.existsSync( file ) ? { [ schema.component ]: fs.readFileSync( file, 'utf8' ) } : {};
}
