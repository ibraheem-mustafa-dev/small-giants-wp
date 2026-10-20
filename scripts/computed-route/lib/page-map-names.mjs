// The page map's naming conventions, shared by intake (lib/intake-pagemap-surfaces.mjs writes them) and the site build
// (lib/site-build-menus.mjs reads them back, Spec 48 FR-48-55). A mega-menu panel row is titled "<menu item label> mega
// menu", so the label its menu item shows is the title without that suffix.
export const MEGA_TITLE_SUFFIX = ' mega menu';

export const megaPanelTitle = ( label ) => `${ label }${ MEGA_TITLE_SUFFIX }`;

export const megaPanelLabel = ( title ) => {
	const t = String( title );
	return t.endsWith( MEGA_TITLE_SUFFIX ) ? t.slice( 0, -MEGA_TITLE_SUFFIX.length ) : t;
};
