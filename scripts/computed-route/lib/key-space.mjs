// The two key spaces of a draft's elements (Spec 48 §3.4). Intake's harness names the entry draft's root host after its
// component (`<component>/<n>#<copy>`); the served draft's runtime names it `Root` (`Root/<n>#<copy>`), the same element.
// Decision keys and motion keys are written in intake's space, so a proposal from a served inventory looks them up here.
// `lib/fill-motion.mjs::elementKey` is the opposite direction (served root host to the component).
import { renameHost, renameRootHost } from './fact-key.mjs';

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
