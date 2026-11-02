// The two key spaces of a draft's elements (Spec 48 §3.4). Intake's harness names the entry draft's root host after its
// component (`<component>/<n>#<copy>`); the served draft's runtime names it `Root` (`Root/<n>#<copy>`), the same element.
// Decision keys and motion keys are written in intake's space, so a proposal from a served inventory looks them up here.
// `lib/fill-motion.mjs::elementKey` is the opposite direction (served root host to the component).
import { renameHost, renameRootHost, parseInstanceKey, templateKey } from './fact-key.mjs';

export const SERVED_ROOT = 'Root';

// True when a draft inventory's keys are in the served space.
export const isServedInventory = ( inventory ) => ( inventory?.elements || [] ).some( ( e ) => String( e.key ).startsWith( `${ SERVED_ROOT }/` ) );

// The served-space key of an intake-space key: only a root-host key (`<rootComponent>/<n>#<copy>`) changes. A key with an
// import chain (`<component>><Child>@<n>#<copy>/<n>#<copy>`) is another host's element and is returned as it is.
export function servedKey( key, rootComponent ) {
	return rootComponent ? renameRootHost( key, rootComponent, SERVED_ROOT ) : key;
}

// One surface's client decisions with their keys in the served space.
export const servedDecisions = ( decisions, rootComponent ) => Object.fromEntries( Object.entries( decisions || {} ).map( ( [ k, v ] ) => [ servedKey( k, rootComponent ), v ] ) );

// A set of motion keys (`<dc>/<tpl id>`, no copy) with the root host's component renamed to the served root.
export const servedMotion = ( keys, rootComponent ) => new Set( [ ...keys ].map( ( k ) => ( rootComponent ? renameHost( k, rootComponent, SERVED_ROOT ) : k ) ) );

// One inventory element's place in the fact record, by the identity the runtime stamps on it: the host component that
// stamped it (`template`, the draft's `data-sc-name`) and its `data-dc-tpl` number (`tpl`), never its text or class. A
// served inventory names the entry draft's root host `Root`; the record names it after the entry component, so `Root`
// becomes `rootComponent`. Returns { templateKey, instanceKey, copy } (instanceKey in intake's space, the record's), or
// { reason } when the element cannot be translated (no identity, a `Root` host with no entry component, or a key whose
// tpl disagrees with the identity).
export function translateElement( e, rootComponent = null ) {
	if ( ! e?.template || null == e.tpl ) {
		return { reason: 'the element carries no host and data-dc-tpl identity' };
	}
	const served = SERVED_ROOT === e.template;
	if ( served && ! rootComponent ) {
		return { reason: `the root host is ${ SERVED_ROOT } and the surface names no entry component` };
	}
	const parsed = parseInstanceKey( e.key );
	if ( parsed && parsed.tpl !== Number( e.tpl ) ) {
		return { reason: `the key names tpl ${ parsed.tpl } and the element tpl ${ e.tpl }` };
	}
	const dc = served ? rootComponent : e.template;
	return { templateKey: templateKey( { dc, tpl: e.tpl } ), instanceKey: served ? renameRootHost( e.key, SERVED_ROOT, rootComponent ) : e.key, copy: parsed ? parsed.copy : null };
}

// Every element of an inventory translated: { byKey: { <inventory key>: translation }, untranslated: [ { key, reason } ],
// unrecorded: [ key ] }. `unrecorded` are translated elements the record (when given) has no entry for (an element a custom
// element draws). Nothing is guessed: an element that fails to translate is listed and has no entry in byKey.
export function translateInventory( inventory, rootComponent, record = null ) {
	const byKey = {};
	const untranslated = [];
	const unrecorded = [];
	for ( const e of inventory?.elements || [] ) {
		const t = translateElement( e, rootComponent );
		if ( t.reason ) {
			untranslated.push( { key: e.key, reason: t.reason } );
			continue;
		}
		byKey[ e.key ] = t;
		record && ! record.elements?.[ t.templateKey ] && unrecorded.push( e.key );
	}
	return { byKey, untranslated, unrecorded };
}
