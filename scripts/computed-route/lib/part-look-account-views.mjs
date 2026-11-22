// The account menu's settings from the draft's signed-in read (shop investigation F-39, account-6): which WooCommerce view each of the
// draft's menu tabs opens, in the draft's order, which views the site serves that no tab opens (hidden), each tab's words, its count or
// tick, whether the tabs carry icons, and whether the menu runs down the side or along a row at each width.
//
// Each tab is told by what its own view holds, never by its words (lib/part-look-signed-in.mjs records, per tab, the parts its view
// located and whether the view lists another component's cards): `data/part-look-modes.json` `sgs/account.menu.endpoints` names, per
// WooCommerce endpoint, the part that marks its view (`part`) or a view listing another component's cards (`list`), the wording key
// its label goes to, and its count or tick switch. An endpoint is taken by the first tab whose view marks it; a later tab whose view
// marks a taken endpoint, and a tab whose view marks none (a subscriptions list the site has no view for), opens no endpoint and is a
// gap row with its words. `served` lists the endpoints the block's menu can show; when every tab's view is told, each one no tab opens is hidden (the
// sign-out link is never hidden), and while any tab's view is not told none is (that tab may be any endpoint left), with a gap row.
// With the dashboard hidden, its quick cards and latest order are switched off too. Pure: tab records in, writes and gaps out.

const WIDTH_TIER = { 1440: 'desktop', 768: 'tablet', 375: 'mobile' };
const STRINGS = /^strings\.(.+)$/;

// The menu's settings: { writes, gaps, settings } in lib/part-look-modes.mjs::evaluateModes' shape. `tabs` maps a width to the tab
// records (lib/part-look-signed-in.mjs::readSignedInParts); `menu` the data; `rows` the block's database rows; `stringKeys` the keys the
// block's wording class supports.
export function accountMenuModes( { block = 'sgs/account', tabs = {}, menu = {}, rows = [], stringKeys = [] } ) {
	const out = { writes: [], gaps: [], settings: {} };
	const known = new Set( rows.map( ( r ) => r.attr_name ) );
	const holds = ( setting ) => ( STRINGS.test( setting ) ? known.has( 'strings' ) && stringKeys.includes( STRINGS.exec( setting )[ 1 ] ) : known.has( setting ) );
	const write = ( setting, value, evidence ) => {
		if ( ! holds( setting ) ) {
			out.gaps.push( { block, setting, what: 'the framework database holds no such setting for this block (or the wording class no such key)', evidence } );
			return;
		}
		out.writes.push( { attr: setting, value, part: null, property: '(content)', mode: true, evidence, draft: { 1440: value } } );
		out.settings[ setting ] = { code: 'written' };
	};
	const wide = tabs[ 1440 ] || [];
	if ( ! wide.length ) {
		return out;
	}
	const unopened = wide.filter( ( t ) => ! t.opened );
	if ( unopened.length ) {
		out.gaps.push( { block, setting: menu.order, what: 'a tab of the draft\'s menu did not open, so which view it shows is unknown and the menu is not written', evidence: JSON.stringify( unopened.map( ( t ) => t.label ) ) } );
		return out;
	}
	// Which endpoint each tab opens, in the draft's order.
	const taken = new Map();
	const open = [];
	const unread = [];
	for ( const t of wide ) {
		const e = ( menu.endpoints || [] ).find( ( x ) => ( x.part ? t.parts.includes( x.part ) : !! ( x.list && t.list ) ) );
		if ( ! e || taken.has( e.endpoint ) ) {
			unread.push( t.label );
			out.gaps.push( { block, setting: menu.order, what: e ? `the tab's view marks ${ e.endpoint }, which an earlier tab already opens; the site has no second view for it` : 'the tab\'s view is none the block draws (no WooCommerce view holds it), so the menu has no tab for it', evidence: `the draft's tab ${ JSON.stringify( t.label ) }` } );
			continue;
		}
		taken.set( e.endpoint, t );
		open.push( { e, t } );
	}
	if ( ! open.length ) {
		return out;
	}
	write( menu.order, open.map( ( x ) => x.e.endpoint ), `the draft's tabs open ${ open.map( ( x ) => `${ JSON.stringify( x.t.label ) } (${ x.e.endpoint })` ).join( ', ' ) }` );
	// An endpoint is hidden only on positive evidence: every tab of the draft is told. A tab whose view is not told may be the view
	// of any endpoint left (a downloads list the locators do not mark), so with one the menu hides nothing and says so.
	const hidden = unread.length ? [] : ( menu.served || [] ).filter( ( e ) => ! taken.has( e ) );
	if ( unread.length ) {
		const left = ( menu.served || [] ).filter( ( e ) => ! taken.has( e ) );
		out.gaps.push( { block, setting: menu.hidden, what: `the draft's tabs ${ JSON.stringify( unread ) } open no view the reader tells, and one may be any endpoint no tab opens, so none is hidden: ${ left.join( ', ' ) } stay in the menu`, evidence: `the draft's tabs ${ JSON.stringify( wide.map( ( t ) => t.label ) ) }` } );
	} else {
		write( menu.hidden, hidden, `no tab of the draft opens ${ hidden.join( ', ' ) || 'any other view' }` );
	}
	if ( hidden.includes( 'dashboard' ) ) {
		for ( const s of menu.dashboardParts || [] ) {
			write( s, false, 'the draft draws no dashboard, so its parts are off' );
		}
	}
	for ( const { e, t } of open ) {
		t.label && e.label && write( e.label, t.label, `the draft's ${ e.endpoint } tab says ${ JSON.stringify( t.label ) }` );
		e.heading && t.texts?.heading && write( e.heading, t.texts.heading, `the draft's ${ e.endpoint } view is headed ${ JSON.stringify( t.texts.heading ) }` );
		e.count && write( e.count, null !== t.count, `the draft's ${ e.endpoint } tab ${ null !== t.count ? `carries the number ${ t.count }` : 'carries no number' }` );
		e.tick && write( e.tick, null === t.count && null !== t.glyph, `the draft's ${ e.endpoint } tab ${ t.glyph ? `carries the glyph ${ t.glyph }` : 'carries no glyph' }` );
	}
	wide.every( ( t ) => ! t.icon ) && write( menu.icons, false, 'no tab of the draft carries an icon' );
	// Side by side (every tab on one row) is a row of tabs; else the menu runs down the side.
	const layout = {};
	for ( const [ w, tier ] of Object.entries( WIDTH_TIER ) ) {
		const list = tabs[ w ] || [];
		list.length > 1 && ( layout[ tier ] = list.every( ( t ) => Math.abs( t.top - list[ 0 ].top ) <= 2 ) ? 'tabs' : 'sidebar' );
	}
	Object.keys( layout ).length && write( menu.layout, layout, `the draft's tabs sit ${ Object.entries( layout ).map( ( [ k, v ] ) => `${ 'tabs' === v ? 'in a row' : 'down the side' } on ${ k }` ).join( ', ' ) }` );
	return out;
}

// The order status words of the draft (Bean's D-7): `orderStatusLabels` { processing, completed } from the draft's own status table, read
// in its logic (`idx`, lib/intake-ast.mjs::loadDraft): an object whose every value is a list opening with the status words and holding a
// number, the status's place in the order's progress, and one of whose words is a status the draft's order parts show (`reads`'
// order-status, ordersPill or chip words). The table's statuses in their progress order are WooCommerce's paid order's own,
// processing then completed (the mapping Mama's hand-finished site uses: processing "Baking soon", completed "Posted"); a later status
// has no WooCommerce status of its own and is named in the evidence. Written only when the logic shows that order (every entry holds a
// number and no two share one); otherwise a gap row, never a guess. { writes, gaps, settings } as accountMenuModes.
export function orderStatusModes( { block = 'sgs/account', idx = null, reads = {}, rows = [], setting = 'orderStatusLabels', statuses = [ 'processing', 'completed' ] } ) {
	const out = { writes: [], gaps: [], settings: {} };
	if ( ! rows.some( ( r ) => r.attr_name === setting ) ) {
		return out;
	}
	const gap = ( what, evidence = null ) => out.gaps.push( { block, setting, what, evidence } );
	const shown = new Set( [ 'order-status', 'ordersPill', 'chip' ].flatMap( ( p ) => Object.values( reads[ p ] || {} ).flat() ).map( ( i ) => String( i?.text ?? '' ).trim().toLowerCase() ).filter( Boolean ) );
	if ( ! shown.size ) {
		gap( 'the draft\'s order parts show no status words to find its status table by' );
		return out;
	}
	const tables = ( idx?.all || [] ).filter( ( n ) => 'ObjectExpression' === n.type && n.properties.length >= 2 ).map( ( n ) => n.properties.map( ( p ) => {
		const els = 'ArrayExpression' === p.value?.type ? p.value.elements : [];
		const label = 'StringLiteral' === els[ 0 ]?.type ? els[ 0 ].value : null;
		const step = els.find( ( e ) => 'NumericLiteral' === e?.type )?.value;
		return 'ObjectProperty' === p.type && null !== label ? { label, step } : null;
	} ) ).filter( ( entries ) => entries.every( Boolean ) && entries.some( ( e ) => shown.has( e.label.trim().toLowerCase() ) ) );
	if ( 1 !== tables.length ) {
		gap( tables.length ? `${ tables.length } tables of the draft's logic list the statuses its order parts show, so none is taken` : 'the draft\'s logic holds no table of status words for the statuses its order parts show', JSON.stringify( [ ...shown ] ) );
		return out;
	}
	const entries = tables[ 0 ];
	const steps = entries.map( ( e ) => e.step );
	if ( steps.some( ( s ) => 'number' !== typeof s ) || new Set( steps ).size !== steps.length ) {
		gap( 'the draft\'s status table does not give each status its own place in the progress, so which is processing and which completed is not shown', JSON.stringify( entries ) );
		return out;
	}
	const ordered = [ ...entries ].sort( ( a, b ) => a.step - b.step );
	if ( ordered.length < statuses.length ) {
		gap( `the draft's status table holds ${ ordered.length } statuses, fewer than ${ statuses.join( ' and ' ) }`, JSON.stringify( ordered ) );
		return out;
	}
	const value = Object.fromEntries( statuses.map( ( s, i ) => [ s, ordered[ i ].label ] ) );
	const rest = ordered.slice( statuses.length ).map( ( e ) => e.label );
	out.writes.push( { attr: setting, value, part: null, property: '(content)', mode: true, evidence: `the draft's status table in its progress order: ${ ordered.map( ( e ) => JSON.stringify( e.label ) ).join( ', ' ) }${ rest.length ? `; ${ JSON.stringify( rest ) } has no WooCommerce status of its own` : '' }`, draft: { 1440: value } } );
	out.settings[ setting ] = { code: 'written' };
	return out;
}

// Every account view setting the signed-in read decides beyond the mode rules: the menu (accountMenuModes) and the order status words
// (orderStatusModes), as one { writes, gaps, settings }.
export function accountViewModes( { block = 'sgs/account', tabs, menu, idx, reads, rows, stringKeys } ) {
	const parts = [ accountMenuModes( { block, tabs, menu, rows, stringKeys } ), orderStatusModes( { block, idx, reads, rows } ) ];
	return { writes: parts.flatMap( ( p ) => p.writes ), gaps: parts.flatMap( ( p ) => p.gaps ), settings: Object.assign( {}, ...parts.map( ( p ) => p.settings ) ) };
}
