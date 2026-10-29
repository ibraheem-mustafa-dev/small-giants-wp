// The inventory of a surface from the one intake saved (`sites/<client>/build/intake/inventories/<intakeSurface>.json`), in the
// served draft's key space, for a surface whose root is not a selector the draft shows on its own (a form on its page: intake
// read it at its route with the rendering state it needed). Intake names the entry draft's root host after its component
// (`<component>/<n>#<copy>`, an import's `<component>><Child>@...`); the served runtime names it `Root`, and Fill's finders
// resolve in the served space only (lib/key-space.mjs).
import fs from 'fs';
import path from 'path';
import { servedKey, SERVED_ROOT } from './key-space.mjs';

// inv: a saved inventory; rootComponent: the entry component's name (checks.rootName). Returns the inventory in the served space,
// its elements, root key and `beside` list alike.
export function servedInventoryOf( inv, rootComponent ) {
	const served = ( key ) => servedKey( rootComponent && String( key ).startsWith( `${ rootComponent }>` ) ? `${ SERVED_ROOT }${ String( key ).slice( rootComponent.length ) }` : key, rootComponent );
	const own = ( e ) => ( e.template === rootComponent ? SERVED_ROOT : e.template );
	const checks = inv.checks ? { ...inv.checks, ...( inv.checks.rootName === rootComponent ? { rootName: SERVED_ROOT } : {} ), ...( inv.checks.rootKey ? { rootKey: served( inv.checks.rootKey ) } : {} ) } : inv.checks;
	// The saved inventory's top element hangs under a parent that is not in it; the surface root has no parent. The
	// siblings read beside the root (`beside`, the strips' roots) are named in the same space as the elements.
	const keys = new Set( inv.elements.map( ( e ) => e.key ) );
	return { ...inv, checks, ...( inv.beside ? { beside: inv.beside.map( ( b ) => ( { ...b, key: served( b.key ) } ) ) } : {} ), elements: inv.elements.map( ( e ) => ( { ...e, key: served( e.key ), ...( e.parentKey && keys.has( e.parentKey ) ? { parentKey: served( e.parentKey ) } : { parentKey: null } ), template: own( e ) } ) ) };
}

// The saved inventory of a manifest surface in the served space. surfaces: the parsed surfaces.json; intake: the parsed
// intake.json. Throws when the surface names no intake skeleton or intake saved no inventory for it.
export function savedInventoryOf( { repo, client, surface, surfaces, intake } ) {
	const slug = surfaces[ surface ]?.intakeSurface;
	const entry = slug ? intake?.skeletons?.[ slug ] : null;
	if ( ! entry ) {
		throw new Error( `"${ surface }" names no intake skeleton (intakeSurface) in sites/${ client }/build/surfaces.json` );
	}
	const file = path.join( repo, 'sites', client, 'build', 'intake', 'inventories', `${ slug }.json` );
	if ( ! fs.existsSync( file ) ) {
		throw new Error( `intake saved no inventory for ${ slug } (${ path.relative( repo, file ) })` );
	}
	return servedInventoryOf( JSON.parse( fs.readFileSync( file, 'utf8' ) ), entry.inventory?.checks?.rootName ?? null );
}
