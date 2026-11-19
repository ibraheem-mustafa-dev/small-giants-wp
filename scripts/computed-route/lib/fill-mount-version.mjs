// The preset a draft mount names (Spec 48A FR-48A-17: a button built once as `Button.dc.html` and mounted through
// `<dc-import name="Button" version="gold" size="lg">`; "a button mounted with a preset is cloned as that preset"). Fill reads it
// from the draft's own facts, never from a hand-written list of names: a skeleton node whose draft element is the control
// (`a` or `button`) of a component that declares an enum prop `version`, and whose mount host in the parent's template carries
// `version="<name>"` (a literal) or no `version` (the component's declared default).
//
// A target's tpl finder is an instance key (`Root>Button@12#0/3#0`): its innermost host `Button@12#0` is the mount, stamped
// `12` in the parent's template (the chain part before it, or the entry draft's component for the root), so the mount is
// the fact record `<parent>/12`, whose `attrs` hold the mount's attributes. A version written as `{{ ... }}` is bound to the
// parent's logic and is not read here: the node falls back to matching its look to a preset.
import fs from 'fs';
import path from 'path';
import { parseInstanceKey, templateKey, templateKeyOf } from './fact-key.mjs';
import { declaredProps } from './intake-props.mjs';

const SUFFIX = '.dc.html';
const HOST = /^(.+)@(\d+)#\d+$/;

// The components of a draft folder that declare an enum prop `version`: { Component: default version or null }.
export function versionDefaults( folder ) {
	const out = {};
	if ( ! folder || ! fs.existsSync( folder ) ) {
		return out;
	}
	for ( const file of fs.readdirSync( folder ).filter( ( f ) => f.endsWith( SUFFIX ) ) ) {
		const decl = declaredProps( fs.readFileSync( path.join( folder, file ), 'utf8' ) );
		const v = decl.props?.version;
		if ( v && 'enum' === v.editor && Array.isArray( v.options ) && v.options.length ) {
			out[ file.slice( 0, -SUFFIX.length ) ] = null === v.default || undefined === v.default ? null : String( v.default );
		}
	}
	return out;
}

// The mount a target's draft element sits in: { component, host (the mount's fact record) }, or null.
function mountOf( finder, facts, rootComponent ) {
	const p = parseInstanceKey( finder?.tpl );
	const m = p ? HOST.exec( p.chain[ p.chain.length - 1 ] ) : null;
	if ( ! m ) {
		return null;
	}
	const outer = 2 === p.chain.length ? rootComponent : p.chain[ p.chain.length - 2 ].replace( /(?:@\d+)?#\d+$/, '' );
	const host = outer ? facts.elements?.[ templateKey( { dc: outer, tpl: m[ 2 ] } ) ]?.template : null;
	return host && 'dc-import' === host.tag && host.own?.name === m[ 1 ] ? { component: m[ 1 ], host } : null;
}

// The mount version of every skeleton node whose root target is the control of a versioned component mount:
// Map( node index -> { version, component, how: 'mount' | 'default' } ). `defaults`: versionDefaults().
export function mountVersions( { nodes, facts, rootComponent, defaults } ) {
	const out = new Map();
	for ( const n of nodes ) {
		const finder = n.targets.find( ( t ) => '' === t.slot )?.finder;
		const tag = facts?.elements?.[ templateKeyOf( finder?.tpl, rootComponent ) ]?.template?.tag;
		const mount = finder && [ 'a', 'button' ].includes( tag ) ? mountOf( finder, facts, rootComponent ) : null;
		if ( ! mount || ! Object.hasOwn( defaults || {}, mount.component ) ) {
			continue;
		}
		const raw = mount.host.attrs?.version;
		if ( undefined === raw && null !== defaults[ mount.component ] ) {
			out.set( n.index, { version: defaults[ mount.component ], component: mount.component, how: 'default' } );
		} else if ( 'string' === typeof raw && '' !== raw.trim() && ! raw.includes( '{{' ) ) {
			out.set( n.index, { version: raw.trim(), component: mount.component, how: 'mount' } );
		}
	}
	return out;
}
