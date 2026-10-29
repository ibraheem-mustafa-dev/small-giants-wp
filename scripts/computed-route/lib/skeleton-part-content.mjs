// Part pairing by content identity (Spec 48 §3.4, RC1): a part that shows one of the block's content settings is the draft
// element that supplies that setting's value. Calibration measured which part shows each content setting (the slot map's
// `text.<attr>.path`, lib/calibrate-content.mjs), and the draft says which element supplies it, in one of two ways:
//   - the element prints the field the route writes into the setting: a text hole of the fact record (`{{ r.name }}`), the
//     field matched to the setting by the route's one field matcher (lib/fill-list-content.mjs::matchFields, the matcher Fill
//     writes the item's settings with), keeping to the setting of the field's own name or of a role the setting holds first;
//   - the element's words are the value the skeleton wrote into the setting (after folding white space, curly quotes and
//     dashes).
// A setting two elements could supply stays unpaired with its reason; parts whose settings all hold words (a quote, a name, a
// role) are told apart this way where kinds and order cannot.
import { matchFields } from './fill-list-content.mjs';

// The words of a value or an element, folded: white space collapsed, curly quotes straight, dashes one hyphen.
export const fold = ( s ) => String( s ?? '' ).replace( /[‘’‚‛]/g, '\'' ).replace( /[“”„‟]/g, '"' ).replace( /[‐-―−]/g, '-' ).replace( /\s+/g, ' ' ).trim();

// text: the slot map's `text` section ({ <attr>: { path } }); attributes: the node's settings; els: the draft elements the node
// owns (its own subtree, other nodes' elements excluded); fieldsOf( e ): the text fields element e prints ([ name ]); words( e ):
// its own words. Returns { pairs: { <path>: element }, notes: [ { slot, reason } ] }.
export function contentPairs( { text = {}, attributes = {}, els = [], fieldsOf = () => [], words = ( e ) => e.words } ) {
	const out = { pairs: {}, notes: [] };
	const paths = Object.fromEntries( Object.entries( text ).filter( ( [ , t ] ) => 'string' === typeof t?.path && t.path ).map( ( [ a, t ] ) => [ a, t.path ] ) );
	if ( ! Object.keys( paths ).length ) {
		return out;
	}
	const byField = new Map();
	els.forEach( ( e ) => fieldsOf( e ).forEach( ( f ) => byField.set( f, [ ...( byField.get( f ) || [] ), e ] ) ) );
	const { map } = matchFields( [ ...byField.keys() ].map( ( name ) => ( { name } ) ), Object.keys( paths ).map( ( key ) => ( { key } ) ), { primaryOnly: true } );
	const supplier = {};
	for ( const [ field, attr ] of Object.entries( map ) ) {
		supplier[ attr ] = byField.get( field );
	}
	for ( const [ attr, path ] of Object.entries( paths ) ) {
		const value = fold( attributes[ attr ] );
		const found = supplier[ attr ] ?? ( 'string' === typeof attributes[ attr ] && value ? els.filter( ( e ) => fold( words( e ) ) === value ) : [] );
		if ( 1 === found.length ) {
			out.pairs[ path ] = found[ 0 ];
		} else if ( found.length > 1 ) {
			out.notes.push( { slot: path, reason: `${ found.length } draft elements could supply ${ attr }, so none is its part` } );
		}
	}
	return out;
}
