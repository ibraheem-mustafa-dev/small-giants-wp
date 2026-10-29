// Skeleton standing rules read through the fact record (Spec 48 FR-48-6, FR-48-7; lib/skeleton-record.mjs): the children of
// a header's disclosure panel and the icon run in a drawer's top row. Each rule is switched on by its entry in
// data/skeleton-decisions.json `rules` (megaGroup, megaAside, megaContainer, drawerIconRun) and keys on signals the runtime
// or the handoff schema guarantees: the surface's kind, parent and opener (`surfaces.json`), the declared layout of the
// panel and of the child (flex grow and shrink, grid tracks, width, aspect ratio, own paint), a loop of links (`sc-for`)
// and the brand registry's Site Info kinds. No pixel width, no author-defined logic key and no client name is read.
import { brandOwnsAddress } from './brand-registry.mjs';
import { gridTracks, fractionalTrack, fixedTrack } from './skeleton-record.mjs';

const UNSET = new Set( [ '', 'initial', 'unset', 'inherit', 'auto', 'none' ] );
const grows = ( v ) => /^[\d.]+$/.test( String( v ?? '' ).trim() ) && Number( v ) > 0;

// o: { m (lib/skeleton-model.mjs), view (lib/skeleton-record.mjs::recordView), scope (surfaceContext, or null), R (the
// decisions `rules`), facts, surface: { kind }, declared (the record's declarations through lib/element-facts.mjs) }.
export function makePanelRules( { m, view, scope, R, facts, surface = {}, declared } ) {
	const root = m.root;
	// The layout a panel lays its children out in: its declared display (the rendered display when the record holds no entry).
	const layoutOf = ( e ) => {
		const d = String( view.has( e ) ? view.declared( e ).display ?? '' : e.display ?? '' );
		return /grid/.test( d ) ? 'grid' : /flex/.test( d ) ? 'flex' : null;
	};
	// Whether the element declares padding on any side.
	const hasPadding = ( e ) => [ 'top', 'right', 'bottom', 'left' ].some( ( side ) => ! UNSET.has( view.declared( e )[ `padding-${ side }` ] ?? '' ) && ! /^0(?:px|%|r?em)?$/.test( view.declared( e )[ `padding-${ side }` ] ) );
	// The element that lays the panel's columns out: the panel's root when it declares a grid or flex layout, else the grid or
	// flex element reached from the root through centring width wrappers (a lone child declaring a max-width and holding no
	// words), or null. The panel block draws its own columns, so a host that is not the root is unwrapped into the panel.
	let hostMemo;
	const hostOf = () => {
		if ( undefined !== hostMemo ) {
			return hostMemo;
		}
		hostMemo = null;
		if ( view.has( root ) && layoutOf( root ) ) {
			hostMemo = root;
			return hostMemo;
		}
		for ( let cur = root, kids = m.blockKids( cur ); 1 === kids.length && view.has( kids[ 0 ] ); kids = m.blockKids( cur ) ) {
			cur = kids[ 0 ];
			if ( layoutOf( cur ) ) {
				hostMemo = cur;
				break;
			}
			if ( m.words( cur ) || UNSET.has( view.declared( cur )[ 'max-width' ] ?? '' ) ) {
				break;
			}
		}
		return hostMemo;
	};
	// How a child is sized inside its panel: it shares the free space (a flex-grow, or a fractional grid track), or it is a
	// fixed box (a declared width that does not shrink, a fixed grid track, or an aspect ratio).
	const sizing = ( e, layout, host ) => {
		const st = view.declared( e );
		const ratio = ! UNSET.has( st[ 'aspect-ratio' ] ?? '' );
		if ( 'flex' === layout ) {
			return { grows: grows( st[ 'flex-grow' ] ), fixed: ratio || ( ! UNSET.has( st.width ?? '' ) && '0' === String( st[ 'flex-shrink' ] ?? '' ).trim() ) };
		}
		const tracks = gridTracks( view.declared( host )[ 'grid-template-columns' ] );
		// Each rendered child (each copy of a loop's item) takes the next track.
		// An auto-fit or auto-fill grid gives every child the one repeated track.
		const auto = /^repeat\(\s*auto-(?:fit|fill)\s*,\s*([\s\S]+)\)$/.exec( tracks[ 0 ] ?? '' );
		const track = auto ? auto[ 1 ].trim() : tracks[ m.blockKids( host ).indexOf( e ) ];
		return { grows: !! track && fractionalTrack( track ), fixed: ratio || ( !! track && fixedTrack( track ) ) };
	};

	// Whether a column holds a run of two or more text links one level down (a heading, then a loop or row of links, whatever
	// their own styles): the links are the column's items, as a run directly under it would be. A run of image-only links (a logo wall) is not.
	const linkColumn = ( e ) => m.blockKids( e ).some( ( k ) => view.has( k ) && m.blockKids( k ).filter( ( l ) => m.isTextLink( l ) ).length >= 2 );

	// The verdict ({ rule, block, action }) for a direct child of a header disclosure panel, or null. The panel's columns are the
	// children of its layout host (hostOf): the root itself, or the grid inside its width wrapper, which is unwrapped into the
	// panel (the panel block draws the columns and takes the host's gap). A loop's repeated item (a card with its own paint) is
	// the card grid's, as before.
	const panelChild = ( e ) => {
		// The panel's root that lays its own grid out and carries its own padding or paint is a container, not the shell.
		if ( scope?.headerDisclosure && R.megaGridContainer && root === e && view.has( e ) && 'grid' === layoutOf( e ) && ( view.ownPaint( e ) || hasPadding( e ) ) ) {
			return { rule: 'megaGridContainer', block: R.megaGridContainer.block };
		}
		const host = scope?.headerDisclosure ? hostOf() : null;
		if ( host && host !== root && e === host && R.megaPanelGrid && ! view.repeated( e ) ) {
			return { rule: 'megaPanelGrid', action: 'unwrap' };
		}
		if ( ! host || m.byKey[ e.parentKey ] !== host || ! view.has( e ) || view.repeated( e ) ) {
			return null;
		}
		const layout = layoutOf( host );
		const size = sizing( e, layout, host );
		const run = view.linkRun( e );
		if ( R.megaGroup && size.grows && ( run || linkColumn( e ) ) ) {
			return { rule: 'megaGroup', block: R.megaGroup.block };
		}
		if ( R.megaAside && size.fixed && view.ownPaint( e ) && ! run ) {
			return { rule: 'megaAside', block: R.megaAside.block };
		}
		return R.megaContainer && size.grows && ! size.fixed && ! run ? { rule: 'megaContainer', block: R.megaContainer.block } : null;
	};

	// The drawer's top row: its first child that sits in the flow (not absolutely or fixed positioned).
	const positionOf = ( k ) => ( view.has( k ) ? view.declared( k ).position : declared( k ).position ) ?? '';
	const topRow = () => m.blockKids( root ).find( ( k ) => ! [ 'absolute', 'fixed' ].includes( positionOf( k ) ) ) ?? null;
	const within = ( e, top ) => {
		for ( let p = e; p; p = m.byKey[ p.parentKey ] ) {
			if ( p === top ) {
				return true;
			}
		}
		return false;
	};
	// The brand whose Site Info kind an icon-only link stands for (tel:, mailto:, a social profile host), or null.
	// A link that shows a glyph and no words: an svg inside it, or its whole content a script value the render turned into a
	// glyph (the template's text is one binding and the render shows no words).
	const glyphLink = ( k ) => {
		const text = String( view.entry( k )?.template.words ?? '' ).trim();
		return 'a' === k.tag && ! m.words( k ) && ! m.blockKids( k ).length && ( m.isIconLink( k ) || /^\{\{[^}]+\}\}$/.test( text ) );
	};
	const siteInfoBrand = ( k ) => ( glyphLink( k ) ? facts.brands.find( ( b ) => brandOwnsAddress( b, k.attrs?.href || '' ) ) ?? null : null );
	// The run of icon-only Site Info links starting at list[i] in a drawer's top row, or [] when it is not one.
	const iconRun = ( list, i, parent ) => {
		const need = R.drawerIconRun?.minItems ?? 2;
		if ( ! R.drawerIconRun || 'drawer' !== surface.kind || ! parent || ! within( parent, topRow() ) ) {
			return [];
		}
		const span = [];
		for ( let j = i; j < list.length && siteInfoBrand( list[ j ] ); j++ ) {
			span.push( list[ j ] );
		}
		return span.length >= need ? span : [];
	};

	return { panelChild, iconRun, siteInfoBrand };
}
