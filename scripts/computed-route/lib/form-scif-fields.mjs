// A form's fields shown only while another field holds one value (Spec 48 FR-48-100; Spec 04's conditional fields). The draft
// wraps them in an `<sc-if>` that one of the form record's states shows: the fact record's surface state `{ topic: 'bulk' }`
// lists the sc-if's template id in `sc_if_tpl_ids`. Every field under such an sc-if waits on that field and value
// (`conditionalField`, `conditionalOperator` equals, `conditionalValue`), and a field the page never rendered (its sc-if was
// closed when the page was read) is built from its template as a field node, placed in template order. Read from the fact
// record and the draft's logic, never from prose:
// - a state with one key holding one value is a condition; a value that lists alternatives (`gift|allergens|other`) or
//   describes the state is none, and so is the form's own root sc-if (the editing state), which lies inside no root;
// - the field the condition watches is the one whose control's click handler writes that key (the topic chips); it takes the
//   key as its `fieldName` when it has none, and the draft's starting value of the key as its `defaultValue`; a key no field
//   writes (the sent state's) is no condition;
// - the value is the label the draft pairs with the state value (`['bulk', 'Baby shower or event']`), since a tiles field
//   submits its tile's label; with no such pair the value itself.
// Each setting is written only where the block holds it (`has( block, attr )`, the framework DB).
import fs from 'fs';
import path from 'path';
import { loadDraft, propName, keyName, subtree, isFn } from './intake-ast.mjs';
import { isDescription } from './state-openers.mjs';
import { schemaFieldNode } from './skeleton-form-step-parts.mjs';
import { templateKey } from './fact-key.mjs';

const IDENT = /^[A-Za-z_$][\w$]*$/;
const FIELD = /^sgs\/form-field-/;

// The component and template number a node's draft reference names (`Root/58#0`, `Root>EnquiryForm@468#0/26#0`), the root
// component standing for `Root`; null for a node with no reference.
export function templateKeyOf( node, rootComponent ) {
	const m = /(?:^|>)([^>@/]+)(?:@[^/]*)?\/(\d+)#\d+$/.exec( String( node?.draftRef?.tpl || '' ) );
	return m ? templateKey( { dc: 'Root' === m[ 1 ] ? rootComponent : m[ 1 ], tpl: m[ 2 ] } ) : null;
}

// The label a draft list pairs with a value (`[ 'bulk', 'Baby shower or event' ]`), or null.
function pairedLabel( idx, value ) {
	const hit = ( idx?.all || [] ).find( ( n ) => 'ArrayExpression' === n.type && 2 === n.elements.length && n.elements.every( ( x ) => 'StringLiteral' === x?.type ) && n.elements[ 0 ].value === String( value ) );
	return hit ? hit.elements[ 1 ].value : null;
}

// The draft's starting value of a state key: the literal the component's `state = { … }` gives it, or undefined.
function startValue( idx, key ) {
	for ( const n of idx?.all || [] ) {
		if ( ( 'ClassProperty' === n.type || 'PropertyDefinition' === n.type ) && 'state' === n.key?.name && 'ObjectExpression' === n.value?.type ) {
			const p = n.value.properties.find( ( x ) => 'ObjectProperty' === x.type && keyName( x ) === key );
			if ( p && /^(String|Numeric|Boolean)Literal$/.test( p.value.type ) ) {
				return p.value.value;
			}
		}
	}
	return undefined;
}

// Whether a handler of this name (an object key or member holding a function) writes `key` through setState.
function writesKey( idx, handler, key ) {
	const fns = ( idx?.all || [] ).filter( ( n ) => 'ObjectProperty' === n.type && keyName( n ) === handler && isFn( n.value ) ).map( ( n ) => n.value );
	return fns.some( ( fn ) => subtree( idx, fn.body ).some( ( c ) => 'CallExpression' === c.type && 'setState' === propName( c.callee ) && 'ObjectExpression' === c.arguments[ 0 ]?.type && c.arguments[ 0 ].properties.some( ( p ) => 'ObjectProperty' === p.type && keyName( p ) === key ) ) );
}

// The conditions a form record's states put on its sc-ifs: [{ scIf (template key), field, raw, value }].
export function scIfConditions( { factRecord, surfaceId, idx } ) {
	const rec = factRecord?.surfaces?.[ surfaceId ];
	const els = factRecord?.elements || {};
	if ( ! rec?.dc ) {
		return [];
	}
	const inForm = ( key ) => ( rec.roots || [] ).some( ( r ) => ( els[ key ]?.template?.parentChain || [] ).includes( r ) );
	const out = [];
	for ( const st of rec.states || [] ) {
		const keys = Object.entries( st.state_keys || {} );
		if ( 1 !== keys.length ) {
			continue;
		}
		const [ field, raw ] = keys[ 0 ];
		if ( ! IDENT.test( field ) || ! [ 'string', 'number', 'boolean' ].includes( typeof raw ) || isDescription( raw ) || /\|/.test( String( raw ) ) ) {
			continue;
		}
		for ( const id of st.sc_if_tpl_ids || [] ) {
			const scIf = templateKey( { dc: rec.dc, tpl: id } );
			if ( 'sc-if' === els[ scIf ]?.template?.tag && inForm( scIf ) ) {
				out.push( { scIf, field, raw, value: pairedLabel( idx, raw ) ?? String( raw ) } );
			}
		}
	}
	return out;
}

// Puts the conditions on a form surface's skeleton tree (changed in place). tree: the skeleton's nodes; factRecord: the fact
// record; surfaceId: the form's surfaces.json id; folder: the handoff folder; rules: the skeleton rules (formControl);
// has( block, attr ): whether the block holds the setting. Returns { notes, conditioned, built, named }.
export function scIfFields( tree, { factRecord, surfaceId, folder, rules = {}, has = () => false } ) {
	const rec = factRecord?.surfaces?.[ surfaceId ];
	const out = { notes: [], conditioned: [], built: [], named: [] };
	if ( ! rec?.dc || ! folder || ! fs.existsSync( path.join( folder, `${ rec.dc }.dc.html` ) ) ) {
		return out;
	}
	const idx = loadDraft( folder, `${ rec.dc }.dc.html` ).idx;
	const conditions = scIfConditions( { factRecord, surfaceId, idx } );
	if ( ! conditions.length ) {
		return out;
	}
	const els = factRecord.elements || {};
	const chainOf = ( key ) => [ key, ...( els[ key ]?.template?.parentChain || [] ) ];
	const nodes = [];
	const walk = ( list, parent ) => list.forEach( ( n ) => {
		nodes.push( { n, parent, key: templateKeyOf( n, rec.dc ) } );
		walk( n.innerBlocks || [], n );
	} );
	walk( tree, null );
	const put = ( n, attr, value ) => has( n.name, attr ) && ( n.attributes ??= {} ) && ( n.attributes[ attr ] = value );
	const wait = ( n, c ) => [ [ 'conditionalField', c.field ], [ 'conditionalOperator', 'equals' ], [ 'conditionalValue', c.value ] ].forEach( ( [ a, v ] ) => put( n, a, v ) );
	for ( const c of conditions ) {
		// The field the condition watches: a field node whose draft subtree holds a control whose click handler writes the key.
		const watched = nodes.find( ( x ) => FIELD.test( x.n.name ) && x.key && Object.values( els ).some( ( e ) => chainOf( e.template?.key ).includes( x.key ) && /\{\{\s*(?:[\w$]+\.)?([\w$]+)\s*\}\}/.test( e.template?.attrs?.onClick || '' ) && writesKey( idx, /\{\{\s*(?:[\w$]+\.)?([\w$]+)\s*\}\}/.exec( e.template.attrs.onClick )[ 1 ], c.field ) ) );
		// A state key no field of the form writes (the sent state's `sent`) is the form's own state, not a field's value.
		if ( ! watched ) {
			continue;
		}
		if ( ! watched.n.attributes?.fieldName && put( watched.n, 'fieldName', c.field ) ) {
			out.named.push( c.field );
		}
		const start = startValue( idx, c.field );
		if ( undefined !== start && ! watched.n.attributes?.defaultValue ) {
			put( watched.n, 'defaultValue', pairedLabel( idx, start ) ?? String( start ) );
		}
		// Rendered fields under the sc-if wait on the value.
		const under = nodes.filter( ( x ) => FIELD.test( x.n.name ) && x.key && chainOf( x.key ).includes( c.scIf ) );
		under.forEach( ( x ) => {
			wait( x.n, c );
			out.conditioned.push( x.key );
		} );
		// Controls under the sc-if with no node are built from their template.
		const have = new Set( nodes.map( ( x ) => x.key ).filter( Boolean ) );
		const controls = Object.values( els ).map( ( e ) => e.template ).filter( ( t ) => t && ( rules.formControl?.tags || [] ).includes( t.tag ) && ( t.parentChain || [] ).includes( c.scIf ) && ! have.has( t.key ) )
			.sort( ( a, b ) => Number( a.n ) - Number( b.n ) );
		if ( ! controls.length ) {
			out.notes.push( `the fields under ${ c.scIf } show only while ${ c.field } is "${ c.value }": ${ under.length } waits on it` );
			continue;
		}
		const host = chainOf( c.scIf ).slice( 1 ).map( ( k ) => nodes.find( ( x ) => x.key === k ) ).find( Boolean );
		const made = [];
		for ( const t of controls ) {
			const label = ( t.parentChain || [] ).map( ( k ) => els[ k ]?.template ).find( ( p ) => 'label' === p?.tag )?.words || t.attrs?.[ 'aria-label' ] || '';
			const type = 'input' === t.tag ? String( t.attrs?.type || 'text' ) : t.tag;
			const built = schemaFieldNode( { label, type, req: !! t.attrs?.required && 'false' !== String( t.attrs.required ).replace( /[{}\s]/g, '' ) }, { rules, has } );
			if ( ! built.node ) {
				out.notes.push( built.note );
				continue;
			}
			[ 'inputmode', 'placeholder' ].forEach( ( a ) => t.attrs?.[ a ] && ! /\{\{/.test( t.attrs[ a ] ) && put( built.node, a, t.attrs[ a ] ) );
			wait( built.node, c );
			made.push( { node: built.node, n: Number( t.n ) } );
			out.built.push( t.key );
		}
		const list = host ? ( host.n.innerBlocks ??= [] ) : tree;
		const at = Number( c.scIf.split( '/' ).pop() );
		const before = list.findIndex( ( k ) => Number( templateKeyOf( k, rec.dc )?.split( '/' ).pop() ) > at );
		list.splice( before < 0 ? list.length : before, 0, ...made.map( ( x ) => x.node ) );
		out.notes.push( `the fields under ${ c.scIf } show only while ${ c.field } is "${ c.value }": ${ under.length } waits on it, ${ made.length } built from the draft's template (the page never rendered them)` );
	}
	return out;
}

