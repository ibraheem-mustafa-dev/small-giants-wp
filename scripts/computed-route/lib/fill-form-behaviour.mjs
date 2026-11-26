// A cloned form keeps its behaviour (Spec 48 FR-48-100, FR-48-57), the parts Fill's form pass (lib/fill-form.mjs::formWrites)
// writes beside each field's own settings:
// - the success message: `successMessage` on the form is the words the draft shows once the form is sent, read from the fact
//   record: the form's submit handler (the `<form>`'s onSubmit) makes literal setState writes (`sent = true`); the state of the
//   form's record or of a `result` record of the same component whose every key holds one of those writes is the sent state,
//   and the words of the text elements under the sc-if that state shows (never a button or link, never a glyph alone such as
//   a tick) are the message, one line each, joined by a line break. A text with a hole the visitor fills (`{{ name }}`) is
//   left out and named in a note;
// - a field the draft's own validation refuses empty (a copy lib/fill-form-schema.mjs::requiredCopyOf reads for it) is
//   `required`, so the clone refuses a blank submission as the draft does, and shows that copy (`msgRequired`);
// - the draft folder the form pass reads its sources from is the one the draft's logic is read from (formDraftFolder), so a
//   draft served by URL (`--draft-url`, as site-run passes it) still hands the validation copy over.
import fs from 'fs';
import path from 'path';
import { loadDraft, readBinding, propName } from './intake-ast.mjs';
import { fnsNamed } from './intake-census-map.mjs';
import { fnWrites, ownWrites } from './intake-pagemap-flow-openers.mjs';
import { templateKeyOf } from './form-scif-fields.mjs';
import { templateKey } from './fact-key.mjs';

const GLYPH_ONLY = /^[^\p{L}\p{N}]*$/u;

// The draft folder Fill reads a draft's scripts from: --draft-dir, else the surface entry's draftDir, else the client's
// handoff folder (the folder lib/fill-list-content.mjs::logicReader is given).
export const formDraftFolder = ( { draftDir = null, repo, entryDraftDir = null, client } ) => draftDir || path.join( repo, entryDraftDir || path.join( 'sites', client, 'handoff' ) );

// Plain words as HTML text: the message is rich text, so the draft's own "<", ">" and "&" are escaped and only the line
// breaks between lines are markup.
const htmlText = ( s ) => String( s ).replace( /&/g, '&amp;' ).replace( /</g, '&lt;' ).replace( />/g, '&gt;' );

// A literal as fnWrites writes it (`true`, `"size"`).
const lit = ( v ) => ( 'string' === typeof v ? JSON.stringify( v ) : String( v ) );

// The form record (kind form) whose roots hold the template element `key`, or null.
export function formRecordOf( factRecord, key ) {
	const chain = [ key, ...( factRecord?.elements?.[ key ]?.template?.parentChain || [] ) ];
	return Object.values( factRecord?.surfaces || {} ).find( ( s ) => 'form' === s.kind && ( s.roots || [] ).some( ( r ) => chain.includes( r ) ) ) || null;
}

// { message, lines, notes } for a form record: the words its sent state shows, or message null with a note saying why.
export function successMessageOf( { factRecord, record, folder } ) {
	const els = factRecord?.elements || {};
	const notes = [];
	const under = ( root ) => Object.values( els ).map( ( e ) => e.template ).filter( ( t ) => t && ( t.key === root || ( t.parentChain || [] ).includes( root ) ) );
	const form = ( record?.roots || [] ).flatMap( under ).find( ( t ) => 'form' === t.tag && t.attrs?.onSubmit );
	if ( ! form ) {
		return { message: null, lines: [], notes: [ `the form ${ record?.id || '?' } has no <form> with a submit handler, so its sent state is unread` ] };
	}
	const idx = fs.existsSync( path.join( folder, `${ record.dc }.dc.html` ) ) ? loadDraft( folder, `${ record.dc }.dc.html` ).idx : null;
	let expr = null;
	try {
		expr = readBinding( form.attrs.onSubmit )?.expr;
	} catch {
		expr = null;
	}
	const name = expr && ( propName( expr ) || ( 'Identifier' === expr.type ? expr.name : null ) );
	// The handler's writes on the form's own component (a write through dcLogic('<dc>') included, one on another component not).
	const writes = ownWrites( idx && name ? [ 'member', 'local', 'key' ].flatMap( ( how ) => fnsNamed( { nodes: idx.all }, name, how ) ).flatMap( ( fn ) => [ ...fnWrites( idx, fn ) ] ) : [], record.dc );
	const records = Object.values( factRecord?.surfaces || {} ).filter( ( s ) => s.dc === record.dc && ( s === record || 'result' === s.kind ) );
	const sent = records.flatMap( ( s ) => ( s.states || [] ).map( ( st ) => ( { s, st } ) ) ).find( ( { st } ) => {
		const keys = Object.entries( st.state_keys || {} );
		return keys.length && ( st.sc_if_tpl_ids || [] ).length && keys.every( ( [ k, v ] ) => writes.has( `${ k }=${ lit( v ) }` ) );
	} );
	if ( ! sent ) {
		return { message: null, lines: [], notes: [ `the form ${ record.id }'s submit handler ${ name || '?' } shows no state of it or of a result record (writes: ${ [ ...writes ].join( ', ' ) || 'none' })` ] };
	}
	const lines = [];
	for ( const id of sent.st.sc_if_tpl_ids ) {
		const shown = under( templateKey( { dc: record.dc, tpl: id } ) ).sort( ( a, b ) => Number( a.n ) - Number( b.n ) );
		const controls = shown.filter( ( t ) => [ 'button', 'a' ].includes( t.tag ) ).map( ( t ) => t.key );
		for ( const t of shown ) {
			const words = String( t.words || '' ).trim();
			if ( ! words || GLYPH_ONLY.test( words ) || controls.some( ( c ) => c === t.key || ( t.parentChain || [] ).includes( c ) ) ) {
				continue;
			}
			if ( /\{\{/.test( words ) ) {
				notes.push( `"${ words }" in the sent state fills in what the visitor typed, which a saved message cannot, so it is left out` );
				continue;
			}
			lines.push( words );
		}
	}
	return lines.length ? { message: lines.map( htmlText ).join( '<br>' ), lines, notes, state: `${ sent.s.id } ${ sent.st.name }` } : { message: null, lines, notes: [ ...notes, `the sent state ${ sent.s.id } "${ sent.st.name }" shows no words` ] };
}

// The success message write for a skeleton's form node: { writes: [{ attr, value, merge }], unmapped: [], notes }. node: the
// `sgs/form` tree node (its draftRef names the draft's form element); component: the surface's root component; has( block,
// attr ): the block holds the setting.
export function successWrites( { node, block, factRecord, component, folder, has } ) {
	const out = { writes: [], unmapped: [], notes: [] };
	const key = templateKeyOf( node, component );
	const record = key ? formRecordOf( factRecord, key ) : null;
	if ( ! record ) {
		return out;
	}
	const read = successMessageOf( { factRecord, record, folder } );
	out.notes.push( ...read.notes );
	if ( ! read.message ) {
		return out;
	}
	if ( ! has( block, 'successMessage' ) ) {
		out.unmapped.push( { property: 'success message', value: JSON.stringify( read.message ), slot: '', reason: `${ block } holds no setting for the draft's sent message` } );
		return out;
	}
	read.message !== node.attributes?.successMessage && out.writes.push( { attr: 'successMessage', value: read.message, merge: 'replace' } );
	return out;
}

// The required flag a field takes from the draft's validation copy: { writes, unmapped, notes }. copy: lib/fill-form-schema.mjs::copyFor's
// answer for the field; attributes: what the node holds.
export function requiredFromCopy( { block, attributes = {}, copy = {}, has } ) {
	const out = { writes: [], unmapped: [], notes: [] };
	if ( ! copy?.required || true === attributes.required ) {
		return out;
	}
	if ( ! has( block, 'required' ) ) {
		out.unmapped.push( { property: 'required', value: 'true', slot: '', reason: `${ block } holds no required setting, and the draft refuses the field empty ("${ copy.required }")` } );
		return out;
	}
	out.writes.push( { attr: 'required', value: true, merge: 'replace' } );
	return out;
}
