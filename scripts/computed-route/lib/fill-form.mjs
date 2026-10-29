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
//   sits, `msgInvalid` from the schema's validation copy, `msgRequired` and `msgTooLong` from the copy the draft's own validation
//   shows for an empty or too-long field (lib/fill-form-schema.mjs::requiredCopyOf; a field the draft gives no copy writes nothing), `valueFromParam` where a link of the draft carries the control's name
//   as a query parameter, and `conditionalField` / `conditionalOperator` / `conditionalValue` from the draft's `show` test.
// A field node the skeleton built from the schema (a step the page never rendered, lib/skeleton-form-steps.mjs) has no draft
// control; its `fieldName` names the schema field, and the same settings come from that field (schemaControl).
// A form, its steps and its review step get theirs on the nodes the skeleton names as those blocks: `savedProgress`, each
// step's `label` and the review's `intro` and Edit label, from the schema of the surface's own component, and a multi-step
// form's `nextLabel`, `submitLabel` and `prevLabel` from the words of the draft's Next and Back buttons the skeleton absorbed
// into it (lib/fill-form-buttons.mjs). A button is
// `isSubmit` when the draft's is `type="submit"`. A linked reference block (a page's `sgs/form` with `formIsLinked`) renders the
// saved post's blocks and ignores its own settings, so nothing on it or inside it is written.
import fs from 'node:fs';
import path from 'node:path';
import { setAttr } from './tree.mjs';
import { formSchemaOf, schemaFieldOf, schemaFieldByName, schemaChipsOf, conditionsFromSource, linkParams, savesProgress, requiredCopyOf, copyFor } from './fill-form-schema.mjs';
import { parseTplKey } from './fill-skeleton.mjs';
import { detectReferences, referenceOf } from './references.mjs';
import { walk } from './tree.mjs';
import { stepButtonLabels, stepButtonWrites, stepRules } from './fill-form-buttons.mjs';
import { successMessageOf, componentScript, formKeyOf } from './fill-form-success.mjs';
import { stateCondition } from './fill-form-conditions.mjs';

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

// The settings Fill's form pass writes, by block: every field block (`sgs/form-field-*`) takes the draft control's settings
// (formFieldWrites), the form its button words and saved-progress flag, a step its label, the review its intro and edit
// label, and a submit button its flag. lib/content-coverage.mjs asks formSettings which settings a re-clone writes.
export const isFormFieldBlock = ( slug ) => /^sgs\/form-field-/.test( slug );
export const FORM_FIELD_SETTINGS = [ 'placeholder', 'autocomplete', 'inputmode', 'rows', 'min', 'max', 'step', 'maxLength', 'showCounter', 'options', 'defaultValue', 'defaultChecked', 'allowedTypes', 'tiles', 'multiSelect', 'floatingLabel', 'floatingLabelPosition', 'msgInvalid', 'msgRequired', 'msgTooLong', 'required', 'valueFromParam', 'conditionalField', 'conditionalOperator', 'conditionalValue' ];
export const FORM_BLOCK_SETTINGS = { 'sgs/button': [ 'isSubmit' ], 'sgs/form': [ 'savedProgress', 'nextLabel', 'submitLabel', 'prevLabel', 'successMessage' ], 'sgs/form-step': [ 'label' ], 'sgs/form-review': [ 'intro', 'editLabel' ] };
export const formSettings = ( block ) => ( isFormFieldBlock( block ) ? FORM_FIELD_SETTINGS : FORM_BLOCK_SETTINGS[ block ] || [] );

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
// draft; condition: { field, op, value } | { reason } | null; copy: { required?, tooLong? } the draft's validation shows for it.
export function formFieldWrites( { db, block, attributes = {}, el, field = null, params = new Set(), condition = null, copy = {} } ) {
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
		// What the node reads as now: the value it holds, else the block's default; a write that changes nothing is skipped.
		if ( ! same( value, undefined === attributes[ attr ] ? def.default : attributes[ attr ] ) ) {
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
	// A field the draft's own validation refuses when empty is required: the message shows only on a required field, and a draft
	// that checks in script (no native `required` attribute) would otherwise submit blank.
	set( copy.required ) && attrDef( db, block, 'required' ) && put( 'required', true, 'required' );
	set( copy.required ) && put( 'msgRequired', copy.required, 'required message' );
	set( copy.tooLong ) && put( 'msgTooLong', copy.tooLong, 'too-long message' );
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
export function formReadback( { writes, el, field = null, copy = {} } ) {
	const got = Object.fromEntries( writes.map( ( w ) => [ w.attr, w.value ] ) );
	const bad = [];
	if ( undefined !== got.autocomplete && got.autocomplete !== el.autocomplete ) {
		bad.push( `autocomplete ${ got.autocomplete } is not the draft's ${ el.autocomplete }` );
	}
	if ( undefined !== got.maxLength && got.maxLength !== ( num( el.maxlength ) ?? num( el.counterMax ) ) ) {
		bad.push( `maxLength ${ got.maxLength } is not the draft's cap` );
	}
	if ( undefined !== got.placeholder && ! [ el.placeholder, field?.field?.ph, ...( el.options || [] ).map( ( o ) => o.label ) ].includes( got.placeholder ) ) {
		bad.push( `placeholder ${ got.placeholder } is not the draft's` );
	}
	if ( undefined !== got.msgRequired && got.msgRequired !== copy.required ) {
		bad.push( `msgRequired ${ got.msgRequired } is not the draft's ${ copy.required }` );
	}
	if ( undefined !== got.msgTooLong && got.msgTooLong !== copy.tooLong ) {
		bad.push( `msgTooLong ${ got.msgTooLong } is not the draft's ${ copy.tooLong }` );
	}
	return bad;
}

// The control a schema field stands for when the page never rendered it, in the shape of the draft read's `snap.form`: its name,
// its autocomplete token, and its options as the block takes them (choices for a block holding `tiles`, else options whose value
// and label are the draft's option). The placeholder, a ticked start, a multiple choice and the validation copy come from the
// schema field itself in formFieldWrites.
export function schemaControl( db, block, f ) {
	const el = { name: f.name };
	set( f.ac ) && ( el.autocomplete = String( f.ac ) );
	if ( Array.isArray( f.options ) && f.options.length ) {
		const options = f.options.map( String );
		attrDef( db, block, 'tiles' ) ? ( el.chips = options.map( ( label ) => ( { label } ) ) ) : ( el.options = options.map( ( o ) => ( { value: o, label: o } ) ) );
	}
	return el;
}

// A single node's write: the attribute onto the tree node and a content write record for the report.
function apply( out, node, ref, rec, w ) {
	if ( same( w.value, node.attributes?.[ w.attr ] ) ) {
		return;
	}
	const { before, after } = setAttr( node, w );
	out.writes.push( { node: ref, index: rec.index, block: rec.name, slot: '', prop: '(content)', attr: w.attr, before, after, widths: [], how: 'content' } );
}

// The component whose template a control comes from: the innermost import in the chain of its `tpl` finder that is one of the
// candidates (the script that validates it), or null when the finder names no template.
export function componentOf( target, candidates ) {
	const key = 'string' === typeof target?.finder?.tpl ? parseTplKey( target.finder.tpl ) : null;
	const chain = ( key?.chain || [] ).map( ( c ) => c.split( '@' )[ 0 ] );
	return [ ...chain ].reverse().find( ( c ) => candidates.includes( c ) ) || null;
}

// Fill's form pass. nodes/flat/refOf: the skeleton nodes, their tree nodes and the ref function; reads: readDraft's result;
// facts: the fact record (or null); flags: intake's flags; db: the framework DB; source: { component: script text } for the
// draft's conditions ({ component: script text }, see formSources); component: the surface's own component (its handoff
// record's `dc`), whose schema is used (none named reads the first schema the record holds); refs: lib/references.mjs::detectReferences;
// idxFor( component ): the parsed logic of a draft component (lib/fill-list-content.mjs::logicReader); buttonRules: rules.formSteps.
// Returns { writes, unmapped, notes, settled }: `settled` is one row (reason `row-held`) for each node on or inside a linked
// reference block that the draft read, naming the linked form that holds its settings, so no read there ends silent.
export function formWrites( { nodes, flat, refOf, reads, facts, flags = [], db, sources = {}, readback = formReadback, component = null, refs = detectReferences(), idxFor = () => null, buttonRules = null, draftFolder = null } ) {
	const out = { writes: [], unmapped: [], notes: [], settled: [] };
	// The nodes of every linked reference block and the blocks inside it, each with the form its reference names.
	const linked = new Map();
	flat.forEach( ( node ) => {
		const ref = referenceOf( node, refs );
		if ( 'linked' === ref?.kind ) {
			walk( [ node ], ( n ) => linked.set( n, ref.value ) );
		}
	} );
	const schema = formSchemaOf( facts, component );
	const params = linkParams( facts );
	const conditions = schema ? conditionsFromSource( sources[ schema.component ] ) : {};
	const copies = Object.fromEntries( Object.entries( sources ).map( ( [ c, src ] ) => [ c, requiredCopyOf( src ) ] ) );
	const steps = schema ? schema.steps.filter( ( s ) => s.fields.length ) : [];
	const review = schema ? schema.steps.find( ( s ) => ! s.fields.length ) : null;
	let stepNo = 0;
	// The choice fields of the form (groups of pills) and the choices each draws: the field a state-keyed `sc-if` waits on.
	const choices = nodes.filter( ( r ) => 'sgs/form-field-tiles' === r.name ).map( ( r ) => ( { rec: r, node: flat[ r.index ], chips: reads.widths?.[ 1440 ]?.[ r.targets.find( ( t ) => '' === t.slot )?.id ]?.form?.chips || [] } ) ).filter( ( c ) => c.chips.length );
	for ( const rec of nodes ) {
		const node = flat[ rec.index ];
		if ( linked.has( node ) ) {
			const widths = [ 375, 768, 1440 ].filter( ( w ) => rec.targets.some( ( t ) => reads.widths?.[ w ]?.[ t.id ] && ! reads.widths[ w ][ t.id ].missing ) );
			widths.length && out.settled.push( { node: refOf( node ), block: rec.name, slot: '', property: '(linked form)', value: String( linked.get( node ) ), widths, reason: 'row-held', detail: `the form is the linked form "${ linked.get( node ) }": its fields and settings are that form's own, so nothing is written here` } );
			continue;
		}
		const ref = refOf( node );
		const target = rec.targets.find( ( t ) => '' === t.slot );
		const el = target ? reads.widths?.[ 1440 ]?.[ target.id ]?.form : null;
		const take = ( r ) => {
			r.writes.forEach( ( w ) => apply( out, node, ref, rec, w ) );
			out.unmapped.push( ...r.unmapped.map( ( u ) => ( { node: ref, block: rec.name, ...u } ) ) );
			out.notes.push( ...r.notes.map( ( n ) => `${ ref } ${ rec.name }: ${ n }` ) );
		};
		// The words the form shows once sent (its result surface, else its own sent state) are its `successMessage`.
		if ( 'sgs/form' === rec.name && attrDef( db, rec.name, 'successMessage' ) ) {
			const sent = successMessageOf( { facts, formKey: formKeyOf( target, component ), scriptOf: ( c ) => componentScript( draftFolder, c ) } );
			if ( sent ) {
				apply( out, node, ref, rec, { attr: 'successMessage', value: sent.message, merge: 'replace' } );
				out.notes.push( `${ ref } ${ rec.name }: successMessage is the words of ${ sent.source }`, ...sent.notes.map( ( n ) => `${ ref } ${ rec.name }: ${ n }` ) );
			}
		}
		// A field the page never rendered (a later step's, built from the schema by lib/skeleton-form-steps.mjs) is the schema
		// field its `fieldName` names, and the control it stands for is read from that field (schemaControl).
		const built = isFormFieldBlock( rec.name ) && ! el ? schemaFieldByName( schema, node.attributes?.fieldName ) : null;
		const control = el || ( built ? schemaControl( db, rec.name, built.field ) : null );
		if ( isFormFieldBlock( rec.name ) && control ) {
			const hit = built || ( el.chips ? schemaChipsOf( schema, el.chips ) : schemaFieldOf( schema, el ) );
			const copy = copyFor( copies[ componentOf( target, Object.keys( copies ) ) || schema?.component ], [ control.name, control.id, hit?.field?.name ], hit?.field || null );
			// A field the draft shows only while a choice has a value (a state-keyed `sc-if`, lib/fill-form-conditions.mjs) waits on that
			// choice field, which is named by the draft's own state key.
			let condition = hit ? conditions[ hit.field.name ] || null : null;
			const formKey = formKeyOf( target, component );
			const shown = condition || ! formKey ? null : stateCondition( facts?.elements?.[ formKey ]?.template?.membership?.scIf, componentScript( draftFolder, formKey.split( '/' )[ 0 ] ) );
			const owner = shown && choices.find( ( c ) => c.rec !== rec && c.chips.some( ( k ) => k.label === shown.label ) );
			if ( owner && attrDef( db, owner.rec.name, 'fieldName' ) ) {
				const fieldName = owner.node.attributes?.fieldName || shown.key;
				owner.node.attributes?.fieldName || apply( out, owner.node, refOf( owner.node ), owner.rec, { attr: 'fieldName', value: fieldName, merge: 'replace' } );
				condition = { field: fieldName, op: shown.op, value: shown.label };
			}
			const made = formFieldWrites( { db, block: rec.name, attributes: node.attributes || {}, el: control, field: hit, params, condition, copy } );
			take( made );
			// The read-back: every value written must be the draft fact it came from; a disagreement is a named problem in the report.
			out.unmapped.push( ...readback( { writes: made.writes, el: control, field: hit, copy } ).map( ( reason ) => ( { node: ref, block: rec.name, property: 'form read-back', value: '', slot: '', reason } ) ) );
		} else if ( 'sgs/button' === rec.name && el && 'button' === el.tag && 'submit' === el.type && attrDef( db, 'sgs/button', 'isSubmit' ) ) {
			apply( out, node, ref, rec, { attr: 'isSubmit', value: true, merge: 'replace' } );
		} else if ( 'sgs/form' === rec.name && schema ) {
			savesProgress( flags, schema.component ) && apply( out, node, ref, rec, { attr: 'savedProgress', value: true, merge: 'replace' } );
			if ( ( node.innerBlocks || [] ).some( ( k ) => 'sgs/form-step' === k.name ) ) {
				const read = stepButtonLabels( { facts, component: schema.component, idx: idxFor( schema.component ), rules: buttonRules || stepRules() } );
				take( stepButtonWrites( { ...read, attributes: node.attributes || {}, def: ( attr ) => attrDef( db, rec.name, attr ) } ) );
			}
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

// The scripts of the draft's components that hold a form schema or required-field copy: { component: text } read from
// `<folder>/<component>.dc.html`. component: the surface's own component, whose schema's script is read (none named reads
// the first schema's).
export function formSources( folder, facts, component = null ) {
	const schema = formSchemaOf( facts, component );
	const out = {};
	if ( ! folder || ! fs.existsSync( folder ) ) {
		return out;
	}
	for ( const name of fs.readdirSync( folder ).filter( ( n ) => n.endsWith( '.dc.html' ) ) ) {
		const component = name.slice( 0, -'.dc.html'.length );
		const text = fs.readFileSync( path.join( folder, name ), 'utf8' );
		const copy = requiredCopyOf( text );
		if ( component === schema?.component || copy.byType || Object.keys( copy.fields ).length ) {
			out[ component ] = text;
		}
	}
	return out;
}
