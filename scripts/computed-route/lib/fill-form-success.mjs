// The words a form shows once it is sent (Spec 48 FR-48-57 success state, ruled by Bean 2026-10-28: the draft's result surface
// or the form's own sent state, whichever the draft holds), read from the fact record and the form's script, for lib/fill-form.mjs
// to write as the `sgs/form` block's `successMessage`.
//   - A result surface: the surface record (facts.surfaces, kind `result`) of the form's component whose parent surface is
//     rooted on the form or one of its ancestors; its roots' subtree is the sent state.
//   - A sent state of the form's own: the form's submit handler (its `onSubmit` hole, a method of the component's script)
//     sets a state key to true (`this.setState({ sent: true })`); the elements an `sc-if` on that key shows are the sent state.
//     Only a key named like a result (sent, submitted, success, done, thanks, complete) counts, so `sending: true` never does.
// The message is the sent state's text elements in document order, each ending in a full stop (a heading gets one), a hole
// printing run-time text replaced by the value the fact record read for it at rest (`name: v.name || 'there'` reads "there"),
// a hole with no single string or number value dropped and named in a note. A control inside the sent state (a "Send another
// message" button, a link) is no part of the message.
import fs from 'node:fs';
import path from 'node:path';
import { templateKeyOf } from './fact-key.mjs';

const RESULT_KEY = /sent|submitted|success|done|thanks|complete/i;
const CONTROL_TAGS = new Set( [ 'button', 'a', 'input', 'select', 'textarea', 'label', 'option', 'svg', 'script', 'style' ] );
const HOLE = /\{\{[^}]*\}\}/g;
const READ_WIDTH = 1440;

// The folder the draft's component files are read from: the run's own `--draft-dir`, else the surface's `draftDir`, else the
// client's handoff folder, so a draft served by URL reads the same logic as one served from a folder.
export function draftFolderOf( { draftDir = null, entry = null, repo, client } ) {
	return draftDir || path.join( repo, entry?.draftDir || path.join( 'sites', client, 'handoff' ) );
}

// The text of the first block `{ ... }` after position `from` in `src`, quotes and template strings skipped.
function braceBody( src, from ) {
	let depth = 0;
	let quote = null;
	for ( let i = from; i < src.length; i++ ) {
		const c = src[ i ];
		if ( quote ) {
			if ( '\\' === c ) {
				i++;
			} else if ( c === quote ) {
				quote = null;
			}
		} else if ( '\'"`'.includes( c ) ) {
			quote = c;
		} else if ( '{' === c ) {
			depth++;
		} else if ( '}' === c && 0 === --depth ) {
			return src.slice( from, i + 1 );
		}
	}
	return '';
}

// The state keys named like a result that the component's method `handler` sets to true: `submit = (e) => { ... }`,
// `submitContact: e => { ... }` or `submit(e) { ... }`.
export function sentKeys( src, handler ) {
	if ( ! handler || ! /^\w+$/.test( handler ) ) {
		return [];
	}
	const m = new RegExp( `\\b${ handler }\\s*(?:[=:]\\s*(?:async\\s*)?(?:\\([^)]*\\)|\\w+)\\s*=>|\\s*\\([^)]*\\))\\s*\\{` ).exec( String( src || '' ) );
	if ( ! m ) {
		return [];
	}
	const body = braceBody( src, m.index + m[ 0 ].length - 1 );
	return [ ...new Set( [ ...body.matchAll( /\b(\w+)\s*:\s*true\b/g ) ].map( ( x ) => x[ 1 ] ).filter( ( k ) => RESULT_KEY.test( k ) ) ) ];
}

const hasOwn = ( t, key ) => t.key === key || ( t.parentChain || [] ).includes( key );
const shows = ( t, key ) => ( t.membership?.scIf || [] ).some( ( m ) => new RegExp( `^\\{\\{\\s*${ key }\\s*\\}\\}$` ).test( String( m.value ).trim() ) );

// The sent-state words of a form: { message, notes, source } or null when the draft holds none. facts: the fact record;
// formKey: the form's template key (`<component>/<n>`); scriptOf( component ): the component's script text (null reads the
// result surface only).
export function successMessageOf( { facts, formKey, scriptOf = () => null } ) {
	const form = facts?.elements?.[ formKey ]?.template;
	if ( ! form ) {
		return null;
	}
	const component = form.component;
	const chain = [ formKey, ...( form.parentChain || [] ) ];
	const roots = Object.values( facts.surfaces || {} )
		.filter( ( s ) => 'result' === s.kind && s.dc === component && ( facts.surfaces[ s.parent ]?.roots || [] ).some( ( r ) => chain.includes( r ) ) )
		.flatMap( ( s ) => s.roots || [] );
	const handler = /(\w+)\s*$/.exec( form.events?.find( ( e ) => 'onSubmit' === e.name )?.expr || '' )?.[ 1 ] ?? null;
	const keys = roots.length ? [] : sentKeys( scriptOf( component ), handler );
	if ( ! roots.length && ! keys.length ) {
		return null;
	}
	const inState = ( t ) => t.component === component && ( roots.some( ( r ) => hasOwn( t, r ) ) || keys.some( ( k ) => shows( t, k ) ) );
	const members = Object.values( facts.elements ).filter( ( e ) => e.template && inState( e.template ) );
	const controls = new Set( members.filter( ( e ) => CONTROL_TAGS.has( e.template.realTag || e.template.tag ) ).map( ( e ) => e.template.key ) );
	const notes = [];
	const parts = members
		.filter( ( e ) => ! CONTROL_TAGS.has( e.template.realTag || e.template.tag ) && ! ( e.template.parentChain || [] ).some( ( k ) => controls.has( k ) ) )
		.sort( ( a, b ) => Number( a.template.n ) - Number( b.template.n ) )
		.map( ( e ) => {
			let i = 0;
			// An element whose words are only blanks (a tick icon the script builds) has no words to carry.
			const worded = '' !== String( e.template.words || '' ).replace( HOLE, '' ).trim();
			return String( e.template.words || '' ).replace( HOLE, () => {
				const v = e.logic?.holes?.[ `text#${ i++ }` ]?.[ READ_WIDTH ]?.v;
				if ( 1 === v?.length && [ 'string', 'number' ].includes( v[ 0 ].t ) ) {
					return String( v[ 0 ].v );
				}
				worded && notes.push(`a blank in the sent state's words (${ e.template.key }) has no single value at rest, so it is left out of successMessage` );
				return '';
			} ).replace( /\s+/g, ' ' ).replace( /\s+([.,!?;:])/g, '$1' ).trim();
		} )
		.filter( ( p ) => /[\p{L}\p{N}]/u.test( p ) );
	if ( ! parts.length ) {
		return null;
	}
	const message = parts.map( ( p ) => ( /[.!?…:]$/.test( p ) ? p : `${ p }.` ) ).join( ' ' );
	return { message, notes, source: roots.length ? `the result surface (${ roots.join( ', ' ) })` : `the form's sent state (${ keys.join( ', ' ) })` };
}

// The form component's script text from the draft folder, or null.
export function componentScript( folder, component ) {
	const file = folder && component ? path.join( folder, `${ component }.dc.html` ) : null;
	return file && fs.existsSync( file ) ? fs.readFileSync( file, 'utf8' ) : null;
}

// The template key of a node's draft element: its root target's `tpl` finder. component: the surface's own component.
export function formKeyOf( target, component ) {
	return 'string' === typeof target?.finder?.tpl ? templateKeyOf( target.finder.tpl, component ) : null;
}
