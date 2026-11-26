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

// Whether a column is a heading over a run of text links: a leaf of words that is not a link, then (at most one plain
// wrapper down, `cfg.maxWrappers`, the decisions' `rules.megaGroup.headedRun`) an element holding a run of links that each
// carry words and no block of their own. Under a heading two or more text links are a run whatever their styles (one link
// in the stack may be coloured or bold: `linkRun` wants one style). A gallery of picture links, a grid of cards and a promo
// are not (their links hold pictures or blocks). The classifier's column-title check (lib/skeleton-classify.mjs) reads the
// same function, so a title the panel rule takes as the head of a column is also a heading, never a label. Returns
// ( column ) => boolean; false throughout without a record view or without the rule's entry.
export function headedRunOf( { m, view, cfg, minLinks = 2 } ) {
	const label = ( k ) => view.has( k ) && 'a' !== k.tag && !! m.words( k ) && ! m.blockKids( k ).length;
	const textRun = ( k ) => view.has( k ) && ! view.repeated( k ) && ( view.linkRun( k ) || m.blockKids( k ).length >= 2 ) && m.blockKids( k ).every( ( l ) => m.isTextLink( l ) );
	const headed = ( e ) => {
		if ( ! cfg || ! view ) {
			return false;
		}
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
	// The block siblings of a column's leaf, and the leaf's place among them.
	const around = ( e ) => {
		const sibs = m.blockKids( m.byKey[ e.parentKey ] || { key: null } );
		return { sibs, at: sibs.indexOf( e ) };
	};
	// Whether a leaf of words sits directly above a run of text links: its next block sibling is the run's container, or the
	// next `minLinks` block siblings are text links themselves (a second title followed by bare links). It titles that run
	// wherever it stands in its column.
	headed.titlesRun = ( e ) => {
		if ( ! cfg || ! view || ! label( e ) ) {
			return false;
		}
		const { sibs, at } = around( e );
		const next = sibs.slice( at + 1, at + 1 + minLinks );
		return !! next.length && ( textRun( next[ 0 ] ) || ( next.length >= minLinks && next.every( ( l ) => m.isTextLink( l ) ) ) );
	};
	// Whether a leaf of words heads the first run of its column: a run's container comes below it, with at most
	// `cfg.maxLeadLines` (default 1) other leaves of words between the two (a line of text under the title). A kicker with more
	// leaves before a later title's run is not the head of that run: the later title is.
	headed.headsRun = ( e ) => {
		if ( ! cfg || ! view || ! label( e ) ) {
			return false;
		}
		const { sibs, at } = around( e );
		const run = sibs.findIndex( ( k, i ) => i > at && textRun( k ) );
		return run > at && sibs.slice( at + 1, run ).filter( label ).length <= ( cfg.maxLeadLines ?? 1 );
	};
	return headed;
}

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

	const headedRun = headedRunOf( { m, view, cfg: R.megaGroup?.headedRun } );

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

	// The values the cap stands for, as the panel's own settings per device (the shapes `sgs/mega-panel` holds: maxWidth
	// `{ desktop: length, tablet?, mobile? }`, panelPadding `{ desktop: { top, right, bottom, left }, tablet?, mobile? }`), as the
	// draft gives them: the browser's read of the wrapper at 1440, 768 and 375 (`resolved`: its padding, its max-width where it
	// caps), or its declared style where no read was taken. Desktop is always written; a narrower device only when its value
	// differs from the one the cascade already gives it (tablet inherits desktop, mobile tablet), and a device the draft leaves
	// uncapped adds no maxWidth (a width cap has no "none" to write). A style value cannot sit among the skeleton's attributes
	// (R-47-10), so the panel node's `decided` carries them and Fill writes them (lib/fill-resolve.mjs::fillContent), as
	// rules.formControl.wrapperCap does for a field.
	const SIDES = [ 'top', 'right', 'bottom', 'left' ];
	const bandDecided = ( c, settings ) => {
		const band = R.megaPanelRow.band;
		const style = view.declared( c );
		const capOf = ( v ) => ( UNSET.has( v ?? '' ) ? null : v );
		const declaredBand = { cap: capOf( style[ 'max-width' ] ), pad: Object.fromEntries( SIDES.map( ( k ) => [ k, UNSET.has( style[ `padding-${ k }` ] ?? '' ) ? '0' : style[ `padding-${ k }` ] ] ) ) };
		// A browser read holds px; the declared style holds whatever the draft wrote (2rem, clamp(), var()). The two are never
		// compared: a device is written only where its read differs from the read before it, and a device with no read before it
		// to compare with (no read at 1440) is not written, since its value could equal the declared desktop one.
		const readAt = ( w ) => {
			const rs = c.resolved?.[ w ];
			return rs ? { cap: capOf( rs[ 'max-width' ] ), pad: Object.fromEntries( SIDES.map( ( k ) => [ k, rs[ `padding-${ k }` ] ?? null ] ) ) } : null;
		};
		const first = readAt( 1440 );
		const desktop = first ? { cap: first.cap, pad: Object.fromEntries( SIDES.map( ( k ) => [ k, first.pad[ k ] ?? declaredBand.pad[ k ] ] ) ) } : declaredBand;
		const cap = { desktop: desktop.cap ?? declaredBand.cap };
		const pad = { desktop: desktop.pad };
		// A side or a cap the earlier read does not hold (null: the read lacks the property) is no value to compare with: the next
		// read carries it forward and writes nothing for that side, since its equality with the desktop value is unknown.
		let [ capNow, padNow ] = [ first?.cap ?? null, first?.pad ?? Object.fromEntries( SIDES.map( ( k ) => [ k, null ] ) ) ];
		for ( const [ w, device ] of [ [ 768, 'tablet' ], [ 375, 'mobile' ] ] ) {
			const at = readAt( w );
			if ( ! at ) {
				continue;
			}
			null !== capNow && at.cap && at.cap !== capNow && ( cap[ device ] = at.cap );
			const sides = Object.fromEntries( SIDES.map( ( k ) => [ k, at.pad[ k ] ?? padNow[ k ] ?? desktop.pad[ k ] ] ) );
			SIDES.some( ( k ) => null !== padNow[ k ] && null !== at.pad[ k ] && at.pad[ k ] !== padNow[ k ] ) && ( pad[ device ] = sides );
			padNow = { ...padNow, ...Object.fromEntries( SIDES.filter( ( k ) => null !== at.pad[ k ] ).map( ( k ) => [ k, at.pad[ k ] ] ) ) };
			capNow = at.cap ?? capNow;
		}
		const firstRead = [ 768, 375 ].find( ( w ) => readAt( w ) );
		const note = ! first && firstRead ? `the draft was not read at 1440 (first read at ${ firstRead }): the panel's first device is written from the declared style and the narrower devices only where a read differs from the read before it` : null;
		return { decided: Object.fromEntries( settings.map( ( setting ) => [ setting, setting === band.padding ? pad : cap ] ) ), note };
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
			const read = band.length ? bandDecided( e, band ) : null;
			return { rule: 'megaPanelRow', action: 'unwrap', hostLays: root.key, ...( conserve.length ? { conserve } : {} ), ...( read ? { decided: read.decided } : {} ), ...( read?.note ? { decidedNote: read.note } : {} ) };
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
