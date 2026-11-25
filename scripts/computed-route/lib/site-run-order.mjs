// The order a site run builds its surfaces in (Spec 48 FR-48-57, FR-48-55): template copies first, so a page never shows its post
// inside the theme's generic template; then the surfaces a page links by reference, built before any page that names them (the header,
// footer, drawer and menus a page's layout binds, and the forms, modals and choice flows a page's blocks carry as `formId`,
// `formIsLinked` or `flowId`); then every other surface.
import { flowTreeFile } from './site-run-flow-tree.mjs';

// The skeleton kinds a page links by reference.
export const SHARED_KINDS = [ 'header', 'footer', 'drawer', 'menu', 'form', 'modal', 'flow' ];

// 0 for a template copy, 1 for a surface a page links, 2 for the rest. `kind` is the intake skeleton's kind for the entry's
// `intakeSurface`; a choice flow is also known by the tree its entry keeps (lib/site-run-flow-tree.mjs::flowTreeFile).
export function buildRank( { entry, kind = null, buildDir = '' } ) {
	if ( entry?.target?.template ) {
		return 0;
	}
	return SHARED_KINDS.includes( kind ) || flowTreeFile( buildDir, entry ) ? 1 : 2;
}
