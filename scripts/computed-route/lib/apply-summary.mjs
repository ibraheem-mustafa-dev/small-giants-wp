// The applier's summary table (apply.mjs, summary.md and the .apply.log) and its reader in the site run (site-run.mjs::applyDetail):
// one status list gives the table's columns and the reader's count and indexes, so a status added here is read there.
export const APPLY_STATUSES = [ 'written', 'unchecked', 'equal', 'ledger', 'no-setting', 'unpaired', 'structural', 'no-effect' ];

// `| family | <one count per status> |` rows as markdown: rows are { family, status }.
export function summaryTable( rows ) {
	const table = {};
	for ( const r of rows ) {
		table[ r.family ] = table[ r.family ] || {};
		table[ r.family ][ r.status ] = ( table[ r.family ][ r.status ] || 0 ) + 1;
	}
	const lines = [ `| Family | ${ APPLY_STATUSES.join( ' | ' ) } |`, `|---|${ APPLY_STATUSES.map( () => '---' ).join( '|' ) }|` ];
	for ( const [ f, c ] of Object.entries( table ) ) {
		lines.push( `| ${ f } | ${ APPLY_STATUSES.map( ( s ) => c[ s ] || 0 ).join( ' | ' ) } |` );
	}
	return lines.join( '\n' );
}

// The summary table's family rows in a log as { status: count } objects, one per family row; each cell is read by the status named in
// its column. A family row is a family name and one whole number per status, and nothing else.
export function summaryRows( log ) {
	const whole = ( cell ) => '' !== cell.trim() && String( Number( cell ) ) === cell.trim();
	return String( log ).split( /\r?\n/ ).map( ( l ) => l.trim().split( '|' ) )
		.filter( ( cells ) => cells.length === APPLY_STATUSES.length + 3 && '' === cells[ 0 ] && '' === cells.at( -1 ) && '' !== cells[ 1 ].trim() && cells.slice( 2, -1 ).every( whole ) )
		.map( ( cells ) => Object.fromEntries( cells.slice( 2, -1 ).map( ( n, i ) => [ APPLY_STATUSES[ i ], Number( n ) ] ) ) );
}
