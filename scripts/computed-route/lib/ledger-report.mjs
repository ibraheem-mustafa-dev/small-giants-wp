// The clone difference ledger's summary and Markdown (tools/clone-ledger.mjs). Pure functions.

// Rows of one element and key that differ the same way at several widths become one row with every width.
export function mergeWidths( rows ) {
	const by = new Map();
	for ( const r of rows ) {
		const k = JSON.stringify( [ r.id, r.key, r.pseudo ?? null, r.state ?? null, r.draft, r.live, r.stage ] );
		if ( by.has( k ) ) {
			by.get( k ).widths.push( r.width );
		} else {
			const { width, ...rest } = r;
			by.set( k, { ...rest, widths: [ width ] } );
		}
	}
	return [ ...by.values() ];
}

// Drops a words row whose element holds another paired element with a words row at the same width: the words differ in the
// inner element, which has its own row. Returns { rows, dropped }.
export function innermostText( rows, parentOf ) {
	const textAt = new Set( rows.filter( ( r ) => 'text' === r.key ).map( ( r ) => `${ r.index }@${ r.width }` ) );
	const hasInner = new Set();
	for ( const k of textAt ) {
		const [ idx, w ] = k.split( '@' );
		for ( let p = parentOf( Number( idx ) ); null !== p && undefined !== p; p = parentOf( p ) ) {
			hasInner.add( `${ p }@${ w }` );
		}
	}
	const keep = rows.filter( ( r ) => ! ( 'text' === r.key && '' === r.slot && hasInner.has( `${ r.index }@${ r.width }` ) ) );
	return { rows: keep, dropped: rows.length - keep.length };
}

const inc = ( m, k, n = 1 ) => m.set( k, ( m.get( k ) || 0 ) + n );

// Counts by stage and by block, and the groups: rows sharing stage, block, part and key (the coarse group) with their rows.
export function summarise( rows ) {
	const byStage = new Map();
	const follows = new Map();
	const byBlock = new Map();
	const groups = new Map();
	for ( const r of rows ) {
		inc( byStage, r.stage );
		if ( r.follows ) {
			inc( follows, r.stage );
		}
		const b = r.block || '(no block)';
		if ( ! byBlock.has( b ) ) {
			byBlock.set( b, new Map() );
		}
		inc( byBlock.get( b ), r.stage );
		const key = `${ r.state ? `:${ r.state } ` : '' }${ r.pseudo ? `${ r.pseudo } ` : '' }${ r.key }${ r.follows ? ' (follows)' : '' }`;
		const gk = JSON.stringify( [ r.stage, b, r.slot || '', key ] );
		if ( ! groups.has( gk ) ) {
			groups.set( gk, { stage: r.stage, block: b, slot: r.slot || '', key, rows: [] } );
		}
		groups.get( gk ).rows.push( r );
	}
	const sortedGroups = [ ...groups.values() ].sort( ( a, b ) => b.rows.length - a.rows.length || a.key.localeCompare( b.key ) );
	return {
		total: rows.length,
		byStage: Object.fromEntries( [ ...byStage ].sort( ( a, b ) => b[ 1 ] - a[ 1 ] ) ),
		followsByStage: Object.fromEntries( follows ),
		byBlock: Object.fromEntries( [ ...byBlock ].map( ( [ b, m ] ) => [ b, { total: [ ...m.values() ].reduce( ( s, n ) => s + n, 0 ), ...Object.fromEntries( m ) } ] ).sort( ( a, b ) => b[ 1 ].total - a[ 1 ].total ) ),
		groups: sortedGroups.map( ( g ) => ( { stage: g.stage, block: g.block, slot: g.slot, key: g.key, count: g.rows.length, refs: [ ...new Set( g.rows.map( ( r ) => r.ref || r.draftKey ) ) ].slice( 0, 12 ), example: g.rows[ 0 ] } ) ),
	};
}

const cell = ( v ) => String( v ?? '' ).replace( /\|/g, '\\|' ).replace( /\s+/g, ' ' ).slice( 0, 160 );
const proofLine = ( p ) => cell( JSON.stringify( p ) ).slice( 0, 400 );

// The ledger's Markdown: the counts, the groups with one proof each, then every row.
export function ledgerMarkdown( { client, surface, site, widths, seconds, summary, rows, unpaired, notes } ) {
	const out = [];
	out.push( `# Clone difference ledger: ${ client } / ${ surface }`, '', `Site ${ site }; widths ${ widths.join( ', ' ) }; ${ summary.total } difference rows; ${ seconds }s.`, '' );
	out.push( '## By stage', '', 'A row that `follows` another differs only because of that row (a box pushed by what is inside or before it) and carries its stage.', '', '| Stage | Rows | Of which follow another row |', '|---|---|---|', ...Object.entries( summary.byStage ).map( ( [ s, n ] ) => `| ${ s } | ${ n } | ${ summary.followsByStage?.[ s ] || 0 } |` ), '' );
	out.push( '## By block', '', '| Block | Rows | By stage |', '|---|---|---|', ...Object.entries( summary.byBlock ).map( ( [ b, m ] ) => `| ${ b } | ${ m.total } | ${ Object.entries( m ).filter( ( [ k ] ) => 'total' !== k ).map( ( [ k, n ] ) => `${ k } ${ n }` ).join( ', ' ) } |` ), '' );
	out.push( '## Groups (stage, block, part, property)', '', '| Rows | Stage | Block | Part | Property | Example (element, widths, draft, live) | Proof |', '|---|---|---|---|---|---|---|' );
	for ( const g of summary.groups ) {
		const e = g.example;
		out.push( `| ${ g.count } | ${ g.stage } | ${ cell( g.block ) } | ${ cell( g.slot ) } | ${ cell( g.key ) } | ${ cell( `${ e.ref || e.draftKey } @${ ( e.widths || [] ).join( '/' ) }: ${ JSON.stringify( e.draft ) } -> ${ JSON.stringify( e.live ) }` ) } | ${ proofLine( e.proof ) } |` );
	}
	out.push( '', `## Unpaired draft elements (${ unpaired.length })`, '', '| Draft element | Paints | Widths shown | Stage | Proof |', '|---|---|---|---|---|' );
	for ( const u of unpaired ) {
		out.push( `| ${ cell( u.draftKey ) } ${ cell( u.snippet ) } | ${ cell( u.paints.join( ', ' ) || 'nothing (layout only)' ) } | ${ u.widths.join( '/' ) } | ${ u.stage } | ${ proofLine( u.proof ) } |` );
	}
	out.push( '', '## Notes', '', ...notes.map( ( n ) => `- ${ n }` ), '' );
	out.push( '## Every row', '', 'State is rest unless named; "on" is the live part the block paints the property on when it is not the paired element.', '', '| Element | Block | Part | Property | State | Widths | Draft | Live | Stage |', '|---|---|---|---|---|---|---|---|---|' );
	for ( const r of rows ) {
		out.push( `| ${ cell( r.ref ) } (${ cell( r.draftKey ) }) | ${ cell( r.block ) } | ${ cell( r.slot ) }${ r.paintedOn ? ` (on ${ cell( r.paintedOn ) })` : '' } | ${ cell( r.pseudo ? `${ r.pseudo } ${ r.key }` : r.key ) }${ r.covers ? ` (${ cell( r.covers.join( ', ' ) ) })` : '' } | ${ r.state || '' } | ${ r.widths.join( '/' ) } | ${ cell( r.draft ) } | ${ cell( r.live ) } | ${ r.stage } |` );
	}
	return `${ out.join( '\n' ) }\n`;
}
