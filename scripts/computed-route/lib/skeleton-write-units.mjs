// The units of siblings that are ONE block and the nodes built from them (Spec 48 §3.4, split out of
// lib/skeleton-propose.mjs::proposeSkeleton): a typed brand name is the logo block, icon-only Site Info links in a drawer's
// top row are one social icons group, two or more stacked text links are one list, and an accordion's items beside other
// content in their holder are one accordion. `unitsOf` finds the units among an element's children; `buildBrand`,
// `buildIcons`, `buildList` and `buildAccordion` build each one's node and record its rows; `buildItems` builds the block the
// identity matcher places over a tab set.
// The factory takes the writer's shared context (`ctx`) after the row book (lib/skeleton-write-record.mjs) is in `ctx.w`.
import { brandOwnsAddress } from './brand-registry.mjs';
import { linkWrite } from './draft-link.mjs';
import { isMarker } from './skeleton-rules.mjs';
import { ordinal, glyph, markerSettingsFrom } from './fill-list-marker.mjs';
import { inlineText, inlineValue } from './inline-text.mjs';
import { finish, W } from './skeleton-classify.mjs';
import { specHit } from './skeleton-facts.mjs';

export const LOGO_HANDOVER = { owner: 'site-info', kind: 'presence', detail: 'the logo image: a logo block\'s image setting paints a measured size, so a skeleton cannot hold it; choose the site logo in the editor' };

export function makeUnits( ctx ) {
	const { m, facts, cls, R, view, overrides, base, rootOf, w, siteLink } = ctx;
	const { record, absorbSubtree } = w;
	const { capsOf, enumOf } = facts;
	const minLinks = facts.decisions.structural?.linkList?.minLinks ?? 2;
	// ---- units: which siblings are one block ----
	const removedBy = ( e ) => cls.briefOnly( e ) || overrides( e, m.words( e ) )?.remove;
	const typedBrandRun = ( list, i ) => {
		if ( ! facts.siteName ) {
			return null;
		}
		for ( let len = 1; len <= 3 && i + len <= list.length; len++ ) {
			const run = list.slice( i, i + len );
			if ( run.every( ( k ) => m.words( k ) && 'img' !== k.tag && ! m.blockKids( k ).length ) && run.map( m.words ).join( ' ' ).toLowerCase() === facts.siteName.toLowerCase() ) {
				return run;
			}
		}
		return null;
	};
	// A list item link: words of its own, or one piece of text beside bare decorations only (a marker dot, a glyph), which
	// the list block draws as its marker. One such link alone is a pill button; two or more stacked are a list. A link drawn
	// as a button (m.buttonStyled) is no list item: a group of them is a button group wherever their row wraps.
	const listLink = ( e ) => ! m.buttonStyled( e ) && ( m.isTextLink( e ) || ( 'a' === e.tag && !! String( e.allText ?? '' ).trim() && m.blockKids( e ).every( ( k ) => ! m.blockKids( k ).length ) && m.blockKids( e ).filter( ( k ) => m.words( k ) ).length <= 1 ) || markerRow( e ) );
	// A bullet row that is not a link: a marker (rules.dotMarker) beside one piece of text and nothing else.
	const markerRow = ( e ) => {
		const kids = m.blockKids( e );
		const marker = ( k ) => isMarker( k, m, R.dotMarker );
		return 'a' !== e.tag && ! m.words( e ) && kids.some( marker ) && 1 === kids.filter( ( k ) => ! marker( k ) ).length && kids.every( ( k ) => marker( k ) || ( m.words( k ) && ! m.blockKids( k ).length ) );
	};
	// A run of list links: stacked one above the next, or every child of a grid (a list laid out in columns).
	const linkRun = ( list, i, parent = null ) => {
		const span = [];
		for ( let j = i; j < list.length && ( listLink( list[ j ] ) || removedBy( list[ j ] ) ); j++ ) {
			span.push( list[ j ] );
		}
		while ( span.length && removedBy( span[ span.length - 1 ] ) ) {
			span.pop();
		}
		const links = span.filter( ( k ) => ! removedBy( k ) );
		const gridList = 'grid' === parent?.display && span.length === list.length;
		return links.length >= minLinks && ( m.stacked( links ) || gridList ) && ! removedBy( span[ 0 ] ) ? span : [];
	};
	// ---- rows of text that are one list: each row one piece of text with at most one leading marker ----
	const shownEl = ( k ) => Object.values( k.visible || {} ).some( Boolean );
	const isControlEl = ( k ) => [ 'a', 'button', 'input', 'select', 'textarea', 'label', 'form' ].includes( k.tag ) || !! m.read.handler( k );
	const under = ( x, top ) => {
		for ( let p = x; p; p = m.byKey[ p.parentKey ] ) {
			if ( p === top ) {
				return true;
			}
		}
		return false;
	};
	const squash = ( s ) => String( s ?? '' ).replace( /\s+/g, ' ' ).trim();
	// The row's leading marker, or null: an svg or icon, an empty dot or bar (rules.dotMarker), or a typed glyph, emoji or
	// ordinal (`1`, `01`, `1.`, `(1)`, `i.`, `a)`) standing before the row's text. `kind` is the list marker type it draws.
	const leadingMarker = ( row ) => {
		const first = m.kids( row ).filter( shownEl )[ 0 ];
		if ( ! first ) {
			return null;
		}
		if ( 'svg' === first.tag || ( 'img' === first.tag && m.isPart( first ) ) ) {
			return { el: first, kind: 'icon', words: '' };
		}
		if ( isMarker( first, m, R.dotMarker ) ) {
			return { el: first, kind: 'bullet', words: '' };
		}
		const w = squash( m.words( first ) );
		if ( ! w || m.blockKids( first ).length || isControlEl( first ) ) {
			return null;
		}
		const o = ordinal( w );
		if ( o ) {
			return { el: first, kind: 'numbered', words: w, ordinal: o };
		}
		const g = [ ...new Intl.Segmenter( undefined, { granularity: 'grapheme' } ).segment( w ) ];
		return 1 === g.length && ! /[\p{L}\p{N}]/u.test( w ) ? { el: first, kind: glyph( w ).kind, words: w } : null;
	};
	// One row of a list: no control anywhere in it, and one piece of text (its own words, else its one text child) beside
	// at most one leading marker; a row with no marker is an item only inside the author's own list (`ul`, `ol`).
	const textItem = ( row, parent ) => {
		if ( isControlEl( row ) || m.els.some( ( x ) => x !== row && under( x, row ) && isControlEl( x ) ) ) {
			return null;
		}
		const marker = leadingMarker( row );
		const rest = m.blockKids( row ).filter( ( k ) => k !== marker?.el );
		let text = squash( m.words( row ) );
		let textEl = row;
		if ( marker && m.isPart( marker.el ) && marker.words && text.startsWith( marker.words ) ) {
			text = squash( text.slice( marker.words.length ) );
		}
		if ( text && rest.length ) {
			return null;
		}
		if ( ! text ) {
			if ( 1 !== rest.length || m.blockKids( rest[ 0 ] ).some( ( k ) => squash( m.words( k ) ) ) ) {
				return null;
			}
			textEl = rest[ 0 ];
			text = squash( m.words( textEl ) );
		}
		if ( ! text || ( ! marker && ! [ 'ul', 'ol' ].includes( parent?.tag ) ) ) {
			return null;
		}
		return { row, text, textEl, marker };
	};
	// A run of two or more such rows, stacked or laid out in a grid, whose markers are all of one kind (typed ordinals
	// counting up from 1, as a list numbers itself).
	const itemRun = ( list, i, parent = null ) => {
		const run = [];
		for ( let j = i; j < list.length; j++ ) {
			const it = textItem( list[ j ], parent );
			if ( ! it ) {
				break;
			}
			run.push( it );
		}
		const kinds = new Set( run.map( ( it ) => it.marker?.kind ?? 'none' ) );
		const counts = run.every( ( it, j ) => 'numbered' !== it.marker?.kind || [].concat( it.marker.ordinal.n ).includes( j + 1 ) );
		const laid = m.stacked( run.map( ( it ) => it.row ) ) || 'grid' === parent?.display || [ 'ul', 'ol' ].includes( parent?.tag );
		return run.length >= 2 && 1 === kinds.size && counts && laid ? run : [];
	};
	// The logo image among a typed brand name's siblings: an image whose file name, alt text or class says it is the brand mark
	// (decisions.logoImage), or whose alt text is the site name. The image is the logo, so the words beside it are not one.
	const logoImageAmong = ( list ) => list.find( ( k ) => 'img' === k.tag && ( specHit( facts.decisions.logoImage, `${ k.attrs?.srcBasename || '' } ${ k.attrs?.alt || '' } ${ k.attrs?.class || '' }` ) || ( k.attrs?.alt || '' ).trim().toLowerCase() === facts.siteName.toLowerCase() ) ) ?? null;
	const unitsOf = ( e, list = m.blockKids( e ) ) => {
		const out = [];
		for ( let i = 0; i < list.length; ) {
			// The items of an accordion whose holder also holds other content (lib/skeleton-accordion.mjs `runs`): one accordion.
			const acc = cls.accordionRuns?.get( list[ i ].key );
			if ( acc && acc.items.every( ( k, j ) => list[ i + j ]?.key === k ) ) {
				out.push( { type: 'accordion', els: acc.items.map( ( k ) => m.byKey[ k ] ), run: acc } );
				i += acc.items.length;
				continue;
			}
			const brand = typedBrandRun( list, i );
			const icons = brand ? [] : cls.iconRun( list, i, e );
			const run = brand || icons.length ? [] : linkRun( list, i, e );
			const rows = brand || icons.length || run.length ? [] : itemRun( list, i, e );
			if ( brand ) {
				out.push( { type: 'brand', els: brand, logo: logoImageAmong( list ) } );
				i += brand.length;
			} else if ( icons.length ) {
				out.push( { type: 'icons', els: icons, parent: e } );
				i += icons.length;
			} else if ( run.length ) {
				out.push( { type: 'list', els: run } );
				i += run.length;
			} else if ( rows.length ) {
				out.push( { type: 'list', els: rows.map( ( it ) => it.row ), rows } );
				i += rows.length;
			} else {
				out.push( { type: 'single', els: [ list[ i ] ] } );
				i++;
			}
		}
		return out;
	};

	// A typed brand name beside a logo image (`logo`) is dropped: the image is the logo, and the words are the accepted
	// difference between a typed and a pictured wordmark.
	function buildBrand( els, logo = null ) {
		const [ first, ...rest ] = els;
		if ( logo ) {
			const reason = `typed brand name "${ els.map( m.words ).join( ' ' ) }" beside the logo image ${ logo.key }: the logo image is the logo, so the typed words are dropped (an accepted difference)`;
			els.forEach( ( e ) => record( e, { action: 'remove', reason, confidence: 1, candidates: [] }, { unit: 'brand' } ) );
			return null;
		}
		const r = cls.classify( first, null, { typedBrand: true } );
		const node = base( first, r.candidates[ 0 ].block, {} );
		node.handover = [ LOGO_HANDOVER ];
		record( first, r, { unit: 'brand', note: `typed brand name "${ els.map( m.words ).join( ' ' ) }" is the logo block` } );
		rest.forEach( ( e ) => record( e, { action: 'absorbed', reason: `part of the typed brand name; the logo block carries it`, confidence: r.confidence, candidates: [] }, { into: first.key } ) );
		return node;
	}

	// A run of icon-only Site Info links in a drawer's top row (rule drawerIconRun): one social icons group on the first link,
	// the others absorbed into it. Fill generates the group's icons from the Site Info row; the icons are resolved inside the
	// links' parent in the root's own template, and the group is the drawer's `icons` top-row slot (chromeSlotType icons).
	function buildIcons( els, parent ) {
		const D = R.drawerIconRun;
		const [ first, ...rest ] = els;
		const slugs = els.map( ( l ) => cls.siteInfoBrand( l ).slug );
		const node = base( first, D.block, {} );
		node.siteInfoRow = slugs;
		const root = rootOf( parent );
		if ( parent.template === root.template && els.every( ( l ) => l.template === root.template ) ) {
			const sel = ( x ) => `[data-dc-tpl="${ x.tpl }"]`;
			node.draftRef = `${ root.tag }${ sel( root ) } ${ sel( parent ) }`;
			node.childRefs = Object.fromEntries( els.map( ( l, i ) => [ slugs[ i ], sel( l ) ] ) );
		}
		const targets = [ ...new Set( els.map( ( l ) => l.attrs?.target ).filter( Boolean ) ) ];
		1 === targets.length && ( node.childAttributes = { linkTarget: targets[ 0 ] } );
		node.handover = [ { owner: 'site-info', kind: 'presence', detail: D.handover } ];
		const why = { rule: 'drawerIconRun', source: 'rule drawerIconRun', reason: D.reason, confidence: 1 };
		const hit = { block: D.block, score: 1, share: 1, evidence: [ { text: `rule drawerIconRun: ${ D.reason }` } ] };
		record( first, { ...why, candidates: [ hit ] }, { unit: 'icons', slot: D.slot, rowNote: `icons generated by Fill from siteInfoRow ${ JSON.stringify( slugs ) }; ${ D.slot.attribute } ${ D.slot.value } on ${ D.slot.block }` } );
		rest.forEach( ( l ) => record( l, { ...why, action: 'absorbed', into: first.key, reason: `part of the drawer's top-row icon group: ${ D.block } draws it from Site Info`, candidates: [] } ) );
		return node;
	}

	const kindOfLink = ( l ) => {
		const kinds = [ ...cls.siteInfoKinds( l ) ].filter( ( [ k ] ) => facts.listItem.kinds.includes( k ) ).sort( ( a, b ) => b[ 1 ].w - a[ 1 ].w );
		return kinds[ 0 ]?.[ 0 ] || null;
	};
	function buildList( els, rows = null ) {
		const slug = facts.listSlug;
		const li = facts.listItem;
		const handover = [];
		const rowOf = new Map( ( rows || [] ).map( ( it ) => [ it.row, it ] ) );
		const items = els.filter( ( l ) => ! removedBy( l ) ).map( ( l ) => {
			// A row of text (not a link): its one piece of text, the marker the list draws for it left out.
			const it = rowOf.get( l );
			if ( it ) {
				const rich = it.marker && m.isPart( it.marker.el ) ? null : inlineText( { m, e: it.textEl, block: slug, attr: `items.${ li.text }`, codeRepo: facts.codeRepo, siteLink, clickable: !! li.url } );
				rich && handover.push( ...rich.handover );
				return { [ li.text ]: rich ? rich.value : it.text };
			}
			const kind = kindOfLink( l );
			const href = l.attrs?.href || '';
			const real = href && '#' !== href;
			if ( kind ) {
				const owner = facts.brands.find( ( b ) => b.slug === kind );
				return { [ li.text ]: '', [ li.siteInfoSource ]: kind, ...( real && li.siteInfoLink && ! ( owner && brandOwnsAddress( owner, href ) ) ? { [ li.siteInfoLink ]: true } : {} ) };
			}
			// The draft's destination as a site address (lib/draft-link.mjs): a draft route is never written as it stands.
			const r = siteLink( href, l );
			const out = linkWrite( r, href );
			if ( 'none' === r.kind && 'a' === l.tag ) {
				handover.push( { owner: 'behaviour', kind: 'link', detail: `draft link "${ m.words( l ) }" is "#": its destination is not in the draft, url left empty` } );
			}
			out.handover && handover.push( out.handover );
			// An item holding inline parts writes them as the markup the item's text holds (lib/inline-text.mjs).
			const rich = inlineText( { m, e: l, block: slug, attr: `items.${ li.text }`, codeRepo: facts.codeRepo, siteLink, clickable: !! li.url } );
			rich && handover.push( ...rich.handover );
			return { [ li.text ]: rich ? rich.value : m.words( l ) || String( l.allText ?? '' ).replace( /\s+/g, ' ' ).trim(), ...( null !== out.value ? { [ li.url ]: out.value } : {} ) };
		} );
		const C = {};
		const ev = ( b, kind, w, text ) => ( C[ b ] ||= { block: b, evidence: [] } ).evidence.push( { kind, w, text } );
		ev( slug, 'db', W.tag, `html_tag_to_core_block: ul -> ${ slug }: the database block for a list` );
		capsOf( slug ).includes( 'list' ) && ev( slug, 'capability', W.capability, `block_capabilities: ${ slug } lists "list"` );
		ev( slug, 'structure', W.structure, rows ? `${ items.length } rows of one piece of text each${ rows[ 0 ].marker ? `, each after a ${ rows[ 0 ].marker.kind } marker` : '' }, one list` : `${ items.length } bare text links, one above the next` );
		const own = facts.tagMap.a?.core_block_slug;
		own && ev( own, 'db', W.tag, `html_tag_to_core_block: a -> ${ own } (each link on its own)` );
		const r = finish( C );
		const node = base( els.find( ( l ) => ! removedBy( l ) ), slug, { ...markerAttrs( slug, rows ), items } );
		handover.length && ( node.handover = handover );
		// The list's items are the copies its repeated item part pairs with (lib/skeleton-part-pairing.mjs).
		ctx.unitItems.set( node, els.filter( ( l ) => ! removedBy( l ) ) );
		els.forEach( ( l, i ) => {
			if ( removedBy( l ) ) {
				const o = overrides( l, m.words( l ) );
				const b = cls.briefOnly( l );
				return record( l, { action: 'remove', reason: b ? `brief-only line (${ b.id }): ${ b.reason }` : o.reason || o.source, source: b ? `decisions ${ b.id }` : o.source, confidence: 0.9, candidates: [] } );
			}
			const at = items[ els.filter( ( x, j ) => j < i && ! removedBy( x ) ).length ];
			const row = record( l, i === els.findIndex( ( x ) => ! removedBy( x ) ) ? r : { ...r, candidates: r.candidates.slice( 0, 1 ) }, { unit: 'list', item: at, ...( at[ li.siteInfoSource ] ? { siteInfoKind: at[ li.siteInfoSource ] } : {} ) } );
			absorbSubtree( l, { block: slug, key: l.key }, 'the list item\'s marker', 'drawsChildren' );
			return row;
		} );
		return node;
	}
	// The list's marker settings from the framework DB's enums (lib/fill-list-marker.mjs::markerSettingsFrom: the enum holding
	// the marker kinds, the one holding `decimal`): the kind the rows' markers draw, `none` with no marker, and for typed
	// ordinals the number style that prints them; a value the enum lacks is left to the block's default.
	function markerAttrs( slug, rows ) {
		const S = markerSettingsFrom( facts.q( "SELECT attr_name, enum_values, default_value FROM block_attributes WHERE block_slug = ? AND source IN ( 'sgs', 'sgs-ext' ) AND css_property IS NULL AND enum_values IS NOT NULL", slug ) );
		const marker = rows?.[ 0 ]?.marker ?? null;
		const kind = marker?.kind ?? 'none';
		const out = {};
		S.marker?.values.includes( kind ) && ( out[ S.marker.attr_name ] = kind );
		const formats = 'numbered' === kind ? marker.ordinal.formats.filter( ( f ) => rows.every( ( it ) => it.marker.ordinal.formats.includes( f ) ) ) : [];
		const format = formats.find( ( f ) => S.number?.values.includes( f ) );
		format && ( out[ S.number.attr_name ] = format );
		return out;
	}
	// The items of an accordion standing beside other content in their holder: one accordion node (no draft element of its
	// own, so no draftRef) holding each item's node; the holder's row names it.
	function buildAccordion( els, run, holder ) {
		const block = R.accordion.block;
		const node = { name: block, attributes: { ...run.attributes }, innerBlocks: els.flatMap( ( it ) => [].concat( w.buildNode( it, block ) || [] ) ) };
		const row = ctx.rowOf[ holder.key ];
		row && ( row.rowNote = [ row.rowNote, `its children ${ els[ 0 ].key } to ${ els.at( -1 ).key } are one ${ block } beside its other content: ${ run.reason }` ].filter( Boolean ).join( '; ' ) );
		return node;
	}
	// A block holding one kind of item block over a tab set (the identity matcher's `items`): one item per control, labelled with
	// the control's words; the rendered panel goes in the first item, the one open at rest, built by its own rules; the tab list
	// and its controls are the block's own (absorbed).
	function buildItems( e, r, top ) {
		const { nodeOfKey, finder } = ctx;
		const { items } = r;
		const node = base( e, top.block, { ...( top.attributes || {} ) } );
		nodeOfKey[ e.key ] = node;
		record( e, r, { attributes: node.attributes } );
		const controls = items.controls.map( ( k ) => m.byKey[ k ] ).filter( Boolean );
		const panels = items.panels.map( ( k ) => m.byKey[ k ] ).filter( Boolean );
		const within = ( x, top2 ) => {
			for ( let p = x; p; p = m.byKey[ p.parentKey ] ) {
				if ( p === top2 ) {
					return true;
				}
			}
			return false;
		};
		const walk = ( x ) => m.blockKids( x ).forEach( ( k ) => {
			if ( panels.some( ( p ) => within( k, p ) ) ) {
				return;
			}
			const i = controls.indexOf( k );
			record( k, { action: 'absorbed', rule: 'identity', into: e.key, reason: i >= 0 ? `drawn by ${ top.block }: the label of its item ${ i + 1 } (${ items.block })` : `drawn by ${ top.block }: its own list of controls`, confidence: 1, candidates: [] } );
			walk( k );
		} );
		walk( e );
		node.innerBlocks = controls.map( ( c ) => ( { name: items.block, attributes: { [ items.labelAttr ]: inlineValue( { m, e: c, block: items.block, attr: items.labelAttr, codeRepo: facts.codeRepo, siteLink, clickable: true } ).value }, draftRef: finder( c ), draftFingerprint: m.fingerprint( c ), innerBlocks: [] } ) );
		// The panel is built as itself (its own rules still apply: a sign-in form stays the form) inside item 1.
		panels.forEach( ( p ) => node.innerBlocks[ 0 ] && node.innerBlocks[ 0 ].innerBlocks.push( ...[].concat( w.buildNode( p, items.block ) || [] ) ) );
		const unread = controls.slice( 1 ).map( ( c ) => `"${ m.words( c ).trim() }"` );
		unread.length && ( node.handover = [ { owner: 'content-page', kind: 'text', detail: `the panels of ${ unread.join( ', ' ) } are not rendered by the draft read, so their content is written in the editor from the draft` } ] );
		return node;
	}

	return { unitsOf, removedBy, buildBrand, buildIcons, buildList, buildAccordion, buildItems };
}
