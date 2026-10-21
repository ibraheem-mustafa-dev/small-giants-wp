// The two key levels of a draft element, built and read here and nowhere else (tests/fact-key.test.mjs refuses a key
// built from a template literal in any other module of lib/).
//   template key  `<dc file>/<tpl>`: the element in the annotated template, offline, with no copy. The host is a draft
//                 component name (a motion record names its `dc`).
//   instance key  `<chain>/<tpl>#<copy>`: the element the draft runtime stamped in a rendered page, as
//                 scripts/parity/lib/collect.mjs::tplKeyOf names it. The chain is the import hosts from the document root
//                 (`Root`, then `<template name>@<host stamp>#<host copy>` for each nested import, joined by `>`).
//                 A row id carries the instance key after `skeleton:<surface>:`.

// { chain: [ string ], tpl: number, copy: number }, or null when the text is not an instance key.
export function parseInstanceKey( key ) {
	const m = 'string' === typeof key ? /^(.+)\/(\d+)#(\d+)$/.exec( key ) : null;
	if ( ! m ) {
		return null;
	}
	const chain = m[ 1 ].split( '>' );
	if ( chain.some( ( part, i ) => '' === part || ( i > 0 && ! /^.+#\d+$/.test( part ) ) ) ) {
		return null;
	}
	return { chain, tpl: Number( m[ 2 ] ), copy: Number( m[ 3 ] ) };
}

// The key text of { chain, tpl, copy } (parseInstanceKey's inverse).
export const instanceKey = ( { chain, tpl, copy } ) => `${ chain.join( '>' ) }/${ tpl }#${ copy }`;

// The same element's key with another copy index (a row id's `#<copy>` suffix), or the text unchanged when it is not a key.
export function withCopy( key, copy ) {
	const p = parseInstanceKey( key );
	return p ? instanceKey( { ...p, copy } ) : key;
}

// The element's key with every copy index removed (`Root>H@1#0/5#3` is `Root>H@1/5`): the same template element in every
// copy. Takes an instance key or its parse.
export function copylessKey( key ) {
	const p = 'string' === typeof key ? parseInstanceKey( key ) : key;
	return p ? `${ p.chain.map( ( part ) => part.replace( /#\d+$/, '' ) ).join( '>' ) }/${ p.tpl }` : null;
}

// { dc, tpl: string } or null for a template key (`<dc file>/<tpl>`); the tpl is a number or a name, never a copy.
export function parseTemplateKey( key ) {
	const m = 'string' === typeof key ? /^(.+)\/([^/#]+)$/.exec( key ) : null;
	return m ? { dc: m[ 1 ], tpl: m[ 2 ] } : null;
}

export const templateKey = ( { dc, tpl } ) => `${ dc }/${ tpl }`;

// The template key an instance key names: the innermost host's template name and the tpl number. The root host (a single
// chain part) takes `rootComponent` when it is given, because the runtime names the root host `Root` on a served draft and
// intake's harness names it after the component. Null when the text is not an instance key.
export function templateKeyOf( key, rootComponent = null ) {
	const p = parseInstanceKey( key );
	if ( ! p ) {
		return null;
	}
	const dc = 1 === p.chain.length && rootComponent ? rootComponent : p.chain[ p.chain.length - 1 ].replace( /(?:@\d+)?#\d+$/, '' );
	return templateKey( { dc, tpl: p.tpl } );
}

// A template key with its host renamed (the root host between the served and the intake key space); a key of another
// host, or text that is not a template key, is returned as it is.
export function renameHost( key, from, to ) {
	const p = parseTemplateKey( key );
	return p && p.dc === from ? templateKey( { dc: to, tpl: p.tpl } ) : key;
}

// An instance key whose chain is the single root host `from`, renamed to `to`; any other key as it is.
export function renameRootHost( key, from, to ) {
	const p = parseInstanceKey( key );
	return p && 1 === p.chain.length && p.chain[ 0 ] === from ? instanceKey( { ...p, chain: [ to ] } ) : key;
}
