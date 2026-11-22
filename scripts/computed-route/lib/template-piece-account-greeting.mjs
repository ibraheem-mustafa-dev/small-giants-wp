// The account page's band greets the signed-in customer (shop investigation F-41, account-10). The skeleton is built from the account
// page read signed out, so a band text whose words the draft's logic changes once signed in keeps only its signed-out words. A text
// of the band (any node outside the account block bound to a draft element) whose source words are one logic value (`{{ hello }}`) is
// read in the draft's logic (renderVals): a value `test ? <signed in> : '<the signed-out words>'`, its signed-out words the ones the
// skeleton holds, is a sign-in value when its signed-in side reads the customer's own field:
//   - `'Hello, ' + a.first` (a string joined to one customer field, an `|| 'fallback'` allowed): the text binds to the plugin's customer
//     source (`sgs/customer`, includes/class-customer-binding.php) with that field's key and the draft's sentence as `format`
//     (`Hello, %s`); signed out the block keeps its typed words, as the binding falls back to them;
//   - a plain string on the same test as such a greeting (`a ? 'your account' : 'my account'`): both versions, each shown only to its
//     visitors through the Show-to setting holding `logged-in` / `logged-out` (the node keeps the signed-out words, a copy beside it
//     takes the signed-in words).
// Which customer field a draft property is: the property the draft's own form fields read, told by their autocomplete tokens (the
// given-name field reads `det.first`, so `first` is the first name), never by its name. The keys the source answers are read from
// the plugin file (`Customer_Binding::KEYS`), and the token for each key from `data/account-parts.json` `customerKeys`.
import fs from 'node:fs';
import { classMethod, keyName, isFn } from './intake-ast.mjs';
import { returnsOf } from './intake-ast-eval.mjs';
import { bindingSourceOf, boundAttr, ruleAttr } from './template-piece-order-plugin.mjs';

const VALUE = /^\s*\{\{\s*([A-Za-z_$][\w$]*)\s*\}\}\s*$/;

// The draft properties the form fields read, by the autocomplete token of the field: { token: [ property ] } from the template source
// (`<input autocomplete="given-name" value="{{ det.first }}">`).
export function fieldProperties( template ) {
	const out = {};
	for ( const tag of String( template ).match( /<input\b[^>]*>/gi ) || [] ) {
		const token = /\bauto-?complete="([^"]+)"/i.exec( tag )?.[ 1 ]?.trim().toLowerCase();
		const read = /\b(?:value|default-?value)="\{\{\s*[\w$.]*?\.([\w$]+)\s*\}\}"/i.exec( tag )?.[ 1 ];
		token && read && ( out[ token ] ??= [] ).includes( read ) === false && out[ token ].push( read );
	}
	return out;
}

// The value renderVals gives a key, as the first returned object's property value node, or null.
function renderValue( idx, key ) {
	const rv = classMethod( idx, 'renderVals' );
	const fn = rv && ( isFn( rv ) ? rv : rv.value );
	for ( const o of fn ? returnsOf( idx, fn ) : [] ) {
		const p = 'ObjectExpression' === o.type ? o.properties.find( ( x ) => 'ObjectProperty' === x.type && keyName( x ) === key ) : null;
		if ( p ) {
			return p.value;
		}
	}
	return null;
}

const literal = ( n ) => ( 'StringLiteral' === n?.type ? n.value : ( 'TemplateLiteral' === n?.type && ! n.expressions.length ? n.quasis[ 0 ].value.cooked : null ) );
const testName = ( n ) => ( 'Identifier' === n?.type ? n.name : ( 'UnaryExpression' === n?.type && '!' === n.operator && n.argument?.type === 'UnaryExpression' ? testName( n.argument.argument ) : null ) );
// The property a member read names (`a.first`, `(a.first || 'x')`), or null.
const memberProp = ( n ) => {
	if ( 'LogicalExpression' === n?.type && '||' === n.operator && null !== literal( n.right ) ) {
		return memberProp( n.left );
	}
	return 'MemberExpression' === n?.type && ! n.computed ? n.property.name : null;
};
// A string joined to one member read: { lead, prop, tail }, or null.
function joined( n ) {
	if ( 'BinaryExpression' !== n?.type || '+' !== n.operator ) {
		return null;
	}
	const parts = [];
	const flat = ( x ) => ( 'BinaryExpression' === x?.type && '+' === x.operator ? ( flat( x.left ), flat( x.right ) ) : parts.push( x ) );
	flat( n );
	const reads = parts.filter( ( p ) => null === literal( p ) );
	if ( 1 !== reads.length || ! memberProp( reads[ 0 ] ) ) {
		return null;
	}
	const at = parts.indexOf( reads[ 0 ] );
	return { lead: parts.slice( 0, at ).map( literal ).join( '' ), prop: memberProp( reads[ 0 ] ), tail: parts.slice( at + 1 ).map( literal ).join( '' ) };
}

// What the band's sign-in texts become: [ { tpl, kind: 'bind', key, format } | { tpl, kind: 'both', signedIn } ] and notes.
// `els` are the inventory elements of the band's texts ({ key, srcOwnText, words }); `idx` the draft's parsed logic; `fields`
// fieldProperties' answer; `keyTokens` { key: token } (the customer source's key each autocomplete token stands for); `keys` the
// source's keys.
export function greetingPlan( { els, idx, fields, keyTokens, keys } ) {
	const plan = [];
	const notes = [];
	const keyOfProp = ( prop ) => Object.entries( keyTokens ).find( ( [ key, token ] ) => keys.includes( key ) && ( fields[ token ] || [] ).includes( prop ) )?.[ 0 ] ?? null;
	const cands = [];
	for ( const e of els ) {
		const name = VALUE.exec( e.srcOwnText || '' )?.[ 1 ];
		const v = name && idx ? renderValue( idx, name ) : null;
		if ( 'ConditionalExpression' !== v?.type || literal( v.alternate ) !== String( e.words ?? '' ).trim() ) {
			continue;
		}
		cands.push( { e, v, test: testName( v.test ) } );
	}
	const tests = new Set();
	for ( const c of cands ) {
		const j = joined( c.v.consequent );
		const key = j ? keyOfProp( j.prop ) : null;
		if ( j && key ) {
			plan.push( { tpl: c.e.key, kind: 'bind', key, format: `${ j.lead }%s${ j.tail }` } );
			c.test && tests.add( c.test );
		} else if ( j ) {
			notes.push( `${ c.e.key }: the signed-in words read the draft's "${ j.prop }", which no form field of the draft names by a customer token, so they are not bound` );
		}
	}
	for ( const c of cands ) {
		const signedIn = literal( c.v.consequent );
		if ( null !== signedIn && c.test && tests.has( c.test ) ) {
			plan.push( { tpl: c.e.key, kind: 'both', signedIn } );
		}
	}
	return { plan, notes };
}

// Applies the plan to the tree: { placed, notes }. `walk` yields every { node, parent } of the tree; `db` the framework database;
// `supported` the bindings support map (lib/template-piece-order-plugin.mjs::supportedAttributesOf); `source` the customer source's name.
export function applyGreeting( { tree, plan, db, supported, source } ) {
	const placed = [];
	const notes = [];
	const visit = ( list, parent ) => {
		for ( let i = 0; i < list.length; i++ ) {
			const node = list[ i ];
			const step = plan.find( ( p ) => p.tpl === node.draftRef?.tpl );
			if ( step ) {
				const attr = boundAttr( db, supported, node.name, 'text-content' );
				const rule = ruleAttr( db, node.name, 'logged-in' );
				if ( 'bind' === step.kind && attr ) {
					node.attributes = { ...( node.attributes || {} ), metadata: { ...( node.attributes?.metadata || {} ), bindings: { ...( node.attributes?.metadata?.bindings || {} ), [ attr ]: { source, args: { key: step.key, format: step.format } } } } };
					placed.push( { at: step.tpl, block: node.name, attribute: attr, key: step.key, format: step.format } );
				} else if ( 'both' === step.kind && attr && rule ) {
					const copy = structuredClone( node );
					node.attributes = { ...( node.attributes || {} ), [ rule ]: 'logged-out' };
					copy.attributes = { ...( copy.attributes || {} ), [ attr ]: step.signedIn, [ rule ]: 'logged-in' };
					list.splice( i + 1, 0, copy );
					i++;
					placed.push( { at: step.tpl, block: node.name, attribute: rule, signedIn: step.signedIn } );
				} else {
					notes.push( `${ step.tpl }: ${ node.name } has no ${ attr ? 'Show-to setting' : 'words setting a binding can write' }, so its signed-in words are not placed` );
				}
			}
			node.innerBlocks?.length && visit( node.innerBlocks, node );
		}
	};
	visit( tree, null );
	return { placed, notes };
}

// The customer source's name and keys, from the plugin file.
export const customerSourceOf = ( file ) => bindingSourceOf( fs.readFileSync( file, 'utf8' ) );
