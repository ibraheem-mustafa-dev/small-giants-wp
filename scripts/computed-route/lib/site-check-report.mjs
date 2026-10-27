// The result of a site check (site-check.mjs): the eight checks, each one's verdict from its items, the result.json
// shape and result.md. An item is { status: 'pass' | 'fail' | 'n-a', subject, url?, selector?, screenshot?, error?,
// detail? }; a check is { id, n, title, status, summary, items }. Pure: nothing here touches a browser or the disk.

export const CHECKS = [
	{ id: 'pages', title: 'Every page-map page loads (200) and renders its main content' },
	{ id: 'menu', title: 'Header links exist and point at page-map pages; no page links to a draft file' },
	{ id: 'mega', title: 'Each mega menu opens its panel and closes' },
	{ id: 'drawer', title: 'The drawer opens at 375 and 768 and closes' },
	{ id: 'modals', title: 'Every modal and choice flow opens from its trigger and closes' },
	{ id: 'forms', title: 'Every form submits to its success state (one marked test entry)' },
	{ id: 'flows', title: "The client's scripted flows pass" },
	{ id: 'woocommerce', title: "Cart, checkout and my-account show WooCommerce's working forms" },
].map( ( c, i ) => ( { ...c, n: i + 1 } ) );

export const STATUSES = [ 'pass', 'fail', 'n-a' ];

// `--only a,b`: the check ids, or { error } naming the unknown ones.
export function parseOnly( raw ) {
	if ( null == raw ) {
		return { ids: CHECKS.map( ( c ) => c.id ) };
	}
	const ids = String( raw ).split( ',' ).map( ( s ) => s.trim() ).filter( Boolean );
	const unknown = ids.filter( ( id ) => ! CHECKS.some( ( c ) => c.id === id ) );
	if ( ! ids.length || unknown.length ) {
		return { error: `--only names ${ unknown.join( ', ' ) || 'nothing' }; the checks are ${ CHECKS.map( ( c ) => c.id ).join( ', ' ) }` };
	}
	return { ids };
}

// A check's verdict from its items: fail when any item failed; pass when at least one passed; otherwise n-a (nothing of
// its kind on the site, or every item not applicable). An item with a status outside STATUSES is a fail, so a typo in a
// checker can never read as a pass.
export function verdictOf( items ) {
	if ( items.some( ( i ) => ! STATUSES.includes( i.status ) || 'fail' === i.status ) ) {
		return 'fail';
	}
	return items.some( ( i ) => 'pass' === i.status ) ? 'pass' : 'n-a';
}

// One check's record. `naReason` is the summary when the check found nothing to test.
export function checkRecord( id, items, naReason = '' ) {
	const def = CHECKS.find( ( c ) => c.id === id );
	const status = verdictOf( items );
	const count = ( s ) => items.filter( ( i ) => i.status === s ).length;
	const summary = 'n-a' === status && ! items.length ? naReason || 'nothing to check' : `${ count( 'pass' ) } pass, ${ count( 'fail' ) } fail, ${ count( 'n-a' ) } n-a`;
	return { id, n: def.n, title: def.title, status, summary, items };
}

// The record of a check the run was told to skip (--only).
export const skippedRecord = ( id ) => ( { ...checkRecord( id, [] ), status: 'skipped', summary: 'not run (--only)' } );

// Non-zero when any check failed.
export const exitCodeOf = ( checks ) => ( checks.some( ( c ) => 'fail' === c.status ) ? 1 : 0 );

const cell = ( v ) => String( v ?? '' ).replace( /\|/g, '\\|' ).replace( /\s*\n\s*/g, ' ' );

// The evidence line of an item: every field it carries, in a fixed order.
export function evidenceOf( item ) {
	return [ [ 'url', item.url ], [ 'selector', item.selector ], [ 'screenshot', item.screenshot ], [ 'error', item.error ], [ 'detail', item.detail ] ]
		.filter( ( [ , v ] ) => null != v && '' !== v )
		.map( ( [ k, v ] ) => `${ k }: ${ 'selector' === k || 'screenshot' === k ? `\`${ v }\`` : v }` )
		.join( '; ' );
}

// result.md: the run header, a pass/fail table by check, the failures with their evidence, then every other item.
export function renderMarkdown( result ) {
	const out = [ `# Site check: ${ result.client } on ${ result.site }`, '', `${ result.base } · ${ result.startedAt } · exit ${ result.exitCode }`, '' ];
	out.push( '| # | Check | Status | Summary |', '|---|---|---|---|' );
	for ( const c of result.checks ) {
		out.push( `| ${ c.n } | ${ cell( c.title ) } | ${ c.status.toUpperCase() } | ${ cell( c.summary ) } |` );
	}
	const failed = result.checks.flatMap( ( c ) => c.items.filter( ( i ) => 'fail' === i.status || ! STATUSES.includes( i.status ) ).map( ( i ) => ( { c, i } ) ) );
	out.push( '', '## Failures', '' );
	out.push( ...( failed.length ? failed.map( ( { c, i } ) => `- **${ c.n }. ${ c.id }** ${ i.subject }: ${ evidenceOf( i ) }` ) : [ 'None.' ] ) );
	out.push( '', '## Every item', '' );
	for ( const c of result.checks.filter( ( x ) => x.items.length ) ) {
		out.push( `### ${ c.n }. ${ c.title }`, '' );
		out.push( ...c.items.map( ( i ) => `- ${ i.status.toUpperCase() } ${ i.subject }${ evidenceOf( i ) ? `: ${ evidenceOf( i ) }` : '' }` ), '' );
	}
	if ( result.notes?.length ) {
		out.push( '## Notes', '', ...result.notes.map( ( n ) => `- ${ n }` ), '' );
	}
	return `${ out.join( '\n' ).replace( /\n+$/, '' ) }\n`;
}
