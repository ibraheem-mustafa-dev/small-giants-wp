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
// decisions `rules`), facts, surface: { kind }, declared (lib/skeleton-rules.mjs::declared) }.
export function makePanelRules( { m, view, scope, R, facts, surface = {}, declared } ) {
	const root = m.root;
	// The layout a panel lays its children out in: its declared display (the rendered display when the record holds no entry).
	const layoutOf = ( e ) => {
		const d = String( view.has( e ) ? view.declared( e ).display ?? '' : e.display ?? '' );
		return /grid/.test( d ) ? 'grid' : /flex/.test( d ) ? 'flex' : null;
	};
	// How a child is sized inside its panel: it shares the free space (a flex-grow, or a fractional grid track), or it is a
	// fixed box (a declared width that does not shrink, a fixed grid track, or an aspect ratio).
	const sizing = ( e, layout ) => {
		const st = view.declared( e );
		const ratio = ! UNSET.has( st[ 'aspect-ratio' ] ?? '' );
		if ( 'flex' === layout ) {
			return { grows: grows( st[ 'flex-grow' ] ), fixed: ratio || ( ! UNSET.has( st.width ?? '' ) && '0' === String( st[ 'flex-shrink' ] ?? '' ).trim() ) };
		}
		const tracks = gridTracks( view.declared( root )[ 'grid-template-columns' ] );
		// Each rendered child (each copy of a loop's item) takes the next track.
		const track = tracks[ m.blockKids( root ).indexOf( e ) ];
		return { grows: !! track && fractionalTrack( track ), fixed: ratio || ( !! track && fixedTrack( track ) ) };
	};

	// The verdict ({ rule, block }) for a direct child of a header disclosure panel, or null. A loop's repeated item (a card
	// with its own paint) is the card grid's, as before.
	const panelChild = ( e ) => {
		if ( ! scope?.headerDisclosure || m.byKey[ e.parentKey ] !== root || ! view.has( e ) || view.repeated( e ) ) {
			return null;
		}
		const layout = layoutOf( root );
		if ( ! layout ) {
			return null;
		}
		const size = sizing( e, layout );
		const run = view.linkRun( e );
		if ( R.megaGroup && size.grows && run ) {
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
