// Skeleton standing rules read through the fact record (Spec 48 FR-48-6, FR-48-7; lib/skeleton-record.mjs): the children of
// a header's disclosure panel and the icon run in a drawer's top row. Each rule is switched on by its entry in
// data/skeleton-decisions.json `rules` (megaGroup, megaAside, megaContainer, drawerIconRun) and keys on signals the runtime
// or the handoff schema guarantees: the surface's kind, parent and opener (`surfaces.json`), the declared layout of the
// panel and of the child (flex grow and shrink, grid tracks, width, aspect ratio, own paint), a loop of links (`sc-for`)
// and the brand registry's Site Info kinds. No pixel width, no author-defined logic key and no client name is read.
import { brandOwnsAddress } from './brand-registry.mjs';
import { gridTracks, trackAt, sharesSpace, fixedTrack } from './skeleton-record.mjs';

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
	// Whether the element declares padding on any side.
	const hasPadding = ( e ) => [ 'top', 'right', 'bottom', 'left' ].some( ( side ) => ! UNSET.has( view.declared( e )[ `padding-${ side }` ] ?? '' ) && ! /^0(?:px|%|r?em)?$/.test( view.declared( e )[ `padding-${ side }` ] ) );
	// How a child is sized inside its panel row: it shares the free space (a flex-grow, or a fractional grid track), or it is a
	// fixed box (a declared width that does not shrink, a fixed grid track, or an aspect ratio).
	const sizing = ( e, layout, row ) => {
		const st = view.declared( e );
		const ratio = ! UNSET.has( st[ 'aspect-ratio' ] ?? '' );
		if ( 'flex' === layout ) {
			return { grows: grows( st[ 'flex-grow' ] ), fixed: ratio || ( ! UNSET.has( st.width ?? '' ) && '0' === String( st[ 'flex-shrink' ] ?? '' ).trim() ) };
		}
		// Each rendered child (each copy of a loop's item) takes the next track; an auto-fit or auto-fill repeat gives every child
		// the repeated track.
		const at = trackAt( view.declared( row )[ 'grid-template-columns' ], m.blockKids( row ).indexOf( e ) );
		return { grows: sharesSpace( at ), fixed: ratio || ( !! at.track && fixedTrack( at.track ) ) };
	};

	// Whether a column is a heading over a run of text links: a leaf of words that is not a link, then (at most one plain
	// wrapper down, `R.megaGroup.headedRun.maxWrappers`) an element holding a run of links that each carry words and no block
	// of their own. Under a heading two or more
	// text links are a run whatever their styles (one link in the stack may be coloured or bold: `linkRun` wants one style). A gallery of picture links, a grid of cards and a promo are not (their links hold pictures or blocks).
	const headedRun = ( e ) => {
		const cfg = R.megaGroup?.headedRun;
		if ( ! cfg ) {
			return false;
		}
		const label = ( k ) => view.has( k ) && 'a' !== k.tag && !! m.words( k ) && ! m.blockKids( k ).length;
		const textRun = ( k ) => view.has( k ) && ! view.repeated( k ) && ( view.linkRun( k ) || m.blockKids( k ).length >= 2 ) && m.blockKids( k ).every( ( l ) => m.isTextLink( l ) );
		const parts = ( x, wrappers ) => {
			const kids = m.blockKids( x );
			if ( kids.some( ( k, i ) => textRun( k ) && kids.slice( 0, i ).some( label ) ) ) {
				return true;
			}
			const only = 1 === kids.length ? kids[ 0 ] : null;
			return wrappers < ( cfg.maxWrappers ?? 1 ) && !! only && view.has( only ) && ! view.repeated( only ) && 'a' !== only.tag && ! m.words( only ) && ! view.ownPaint( only ) && parts( only, wrappers + 1 );
		};
		return parts( e, 0 );
	};

	// Whether a column is a stack of text and no more: two or more block children (`R.megaGroup.textColumn.minLeaves`), each a
	// leaf of words that is not a link and holds no block (no picture or link inside; an inline icon is a part of the block). A column that heads an item (a
	// label, a heading, a line of text) and links nowhere below the column itself.
	const textColumn = ( e ) => {
		const cfg = R.megaGroup?.textColumn;
		const kids = cfg ? m.blockKids( e ) : [];
		return !! cfg && kids.length >= ( cfg.minLeaves ?? 2 ) && kids.every( ( k ) => view.has( k ) && 'a' !== k.tag && !! m.words( k ) && ! m.blockKids( k ).length );
	};

	// The verdict ({ rule, block }) for a child of the panel's row, or null: a growing child holding a run of links, a heading
	// over one, or a stack of text alone is a mega group, a fixed or ratio-sized painted box without links an aside, any other
	// growing child a plain container. A loop's repeated item is a column only as a stack of text (a card with a picture or a
	// link inside is the card grid's).
	const rowChild = ( e, row ) => {
		if ( ! view.has( e ) ) {
			return null;
		}
		const layout = layoutOf( row );
		if ( ! layout ) {
			return null;
		}
		if ( view.repeated( e ) ) {
			return R.megaGroup && textColumn( e ) && sizing( e, layout, row ).grows ? { rule: 'megaGroup', block: R.megaGroup.block } : null;
		}
		const size = sizing( e, layout, row );
		const run = view.linkRun( e );
		if ( R.megaGroup && size.grows && ( run || headedRun( e ) || textColumn( e ) ) ) {
			return { rule: 'megaGroup', block: R.megaGroup.block };
		}
		if ( R.megaAside && size.fixed && view.ownPaint( e ) && ! run ) {
			return { rule: 'megaAside', block: R.megaAside.block };
		}
		return R.megaContainer && size.grows && ! size.fixed && ! run ? { rule: 'megaContainer', block: R.megaContainer.block } : null;
	};

	// Whether a child of a candidate row is plainly a panel column: a mega group or aside, or a plain container that holds links
	// somewhere below it (a heading over a grid of links); a row of pictures or text holds none.
	const holdsLinks = ( k, depth = 0 ) => depth < 4 && m.blockKids( k ).some( ( x ) => 'a' === x.tag || view.linkRun( x ) || holdsLinks( x, depth + 1 ) );
	const isColumn = ( k, row ) => {
		const hit = rowChild( k, row );
		return !! hit && ( 'megaContainer' !== hit.rule || holdsLinks( k ) );
	};

	// The panel's row when the root does not lay its children out itself: the first descendant, reached only through plain
	// wrappers (each the only block child of the one above, no words of its own, not a loop's item), that lays two or more
	// children out as a grid or flex row and whose children include a column. { row, chain } where
	// chain holds every wrapper down to and including the row (the panel block lays its columns out, so they go); null when
	// the root is itself the row or no such row sits within MAX_WRAPPERS levels. When the wrappers end in an element that lays
	// nothing out (block flow) and holds a run of links, or a heading over one (`R.megaPanelRow.soleColumn`), that element is
	// the panel's only column: { row: its parent, chain: the wrappers above it, column }. Computed once per panel.
	let found;
	const panelRow = () => {
		if ( undefined !== found ) {
			return found;
		}
		found = null;
		if ( ! R.megaPanelRow || ! scope?.headerDisclosure || ! view.has( root ) || layoutOf( root ) ) {
			return found;
		}
		const chain = [];
		for ( let x = root; chain.length < ( R.megaPanelRow.maxWrappers ?? 3 ); ) {
			const kids = m.blockKids( x );
			const c = 1 === kids.length ? kids[ 0 ] : null;
			if ( R.megaPanelRow.soleColumn && R.megaGroup && x !== root && kids.length >= 2 && ( view.linkRun( x ) || headedRun( x ) ) ) {
				found = { row: m.byKey[ x.parentKey ], chain: chain.slice( 0, -1 ), column: x };
				return found;
			}
			if ( ! c || ! view.has( c ) || view.repeated( c ) || m.words( c ) ) {
				return found;
			}
			const lays = !! layoutOf( c ) && m.blockKids( c ).length >= 2;
			if ( view.ownPaint( c ) && ! lays ) {
				return found;
			}
			chain.push( c );
			if ( lays ) {
				found = m.blockKids( c ).some( ( k ) => isColumn( k, c ) ) ? { row: c, chain } : null;
				return found;
			}
			x = c;
		}
		return found;
	};

	// The panel settings a wrapper's width cap and padding stand for (R.megaPanelRow.band: maxWidth for a declared max-width,
	// padding for a declared padding on any side, read from the draft's declared style), or []. Only a panel whose own element
	// paints takes them (the cap is then a plain band inside the painted shell). The verdict records them as `conserve` entries
	// on the panel's settings; the panel's calibration reads those at the panel's own element, so the check stays unverified (a
	// listed fault) until Fill reads the wrapper there.
	const bandOf = ( c ) => {
		const band = R.megaPanelRow?.band;
		if ( ! band || ! view.ownPaint( root ) ) {
			return [];
		}
		return [ ...( UNSET.has( view.declared( c )[ 'max-width' ] ?? '' ) ? [] : [ band.maxWidth ] ), ...( hasPadding( c ) ? [ band.padding ] : [] ) ];
	};

	// The values the cap stands for, as the panel's own settings for the desktop tier (the shapes `sgs/mega-panel` holds: maxWidth
	// `{ desktop: length }`, panelPadding `{ desktop: { top, right, bottom, left } }`), taken from the wrapper's declared style. A
	// style value cannot sit among the skeleton's attributes (R-47-10), so the panel node's `decided` carries them and Fill writes
	// them (lib/fill-resolve.mjs::fillContent), as rules.formControl.wrapperCap does for a field.
	const bandDecided = ( c, settings ) => {
		const band = R.megaPanelRow.band;
		const style = view.declared( c );
		const side = ( k ) => ( UNSET.has( style[ `padding-${ k }` ] ?? '' ) ? '0' : style[ `padding-${ k }` ] );
		return Object.fromEntries( settings.map( ( setting ) => [ setting, setting === band.padding
			? { desktop: Object.fromEntries( [ 'top', 'right', 'bottom', 'left' ].map( ( k ) => [ k, side( k ) ] ) ) }
			: { desktop: style[ 'max-width' ] } ] ) );
	};

	// The verdict for an element of a header disclosure panel, or null. A direct child of the panel's root that lays its own
	// grid out and carries its own padding or paint is a container, not the shell. A wrapper above the panel's row is unwrapped
	// (`megaPanelRow`). A child of the row is read by rowChild; a loop's repeated item (a card with its own paint) is the card
	// grid's, as before.
	const panelChild = ( e ) => {
		if ( scope?.headerDisclosure && R.megaGridContainer && root === e && view.has( e ) && 'grid' === layoutOf( e ) && ( view.ownPaint( e ) || hasPadding( e ) ) ) {
			return { rule: 'megaGridContainer', block: R.megaGridContainer.block };
		}
		if ( ! scope?.headerDisclosure ) {
			return null;
		}
		const wrapped = panelRow();
		if ( wrapped?.column === e ) {
			return { rule: 'megaGroup', block: R.megaGroup.block };
		}
		if ( wrapped?.chain.includes( e ) ) {
			// The first wrapper that declares a width cap or padding hands it to the panel's own settings (a later one that does
			// too keeps its look unread, so paint conservation leaves it a node). The row itself holds no band; a sole column's
			// chain holds only wrappers.
			const first = ( wrapped.column ? wrapped.chain : wrapped.chain.slice( 0, -1 ) ).find( ( c ) => bandOf( c ).length );
			const rowPaint = wrapped.row === e && R.megaPanelRow.rowPaint && view.ownPaint( e ) ? [ { kind: 'setting', node: root.key, setting: R.megaPanelRow.rowPaint, looks: [ 'background', 'border' ] } ] : [];
			const conserve = rowPaint.length ? rowPaint : first === e ? bandOf( e ).map( ( setting ) => ( { kind: 'setting', node: root.key, setting, looks: setting === R.megaPanelRow.band.padding ? [ 'padding' ] : [ 'max-width', 'margin-auto' ] } ) ) : [];
			const band = first === e && ! rowPaint.length ? bandOf( e ) : [];
			return { rule: 'megaPanelRow', action: 'unwrap', hostLays: root.key, ...( conserve.length ? { conserve } : {} ), ...( band.length ? { decided: bandDecided( e, band ) } : {} ) };
		}
		const row = wrapped ? wrapped.row : root;
		return m.byKey[ e.parentKey ] === row ? rowChild( e, row ) : null;
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
