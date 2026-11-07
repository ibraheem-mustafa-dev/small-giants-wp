// Chrome rule: the level a heading block renders (sgs/heading `level`, default h2, no value for "not a heading"). The draft's paired
// element names its own tag. A real heading (h1 to h6) sets that level. A heading-looking element that is a p, div or span in the
// draft must not be a heading on the page, so the block takes the level below the nearest real heading before it in the draft
// (a section's real heading), which keeps the outline sound and leaves the page one h2 per real section heading. The block's own
// size, weight, family and colour settings are stored on the block, so the look does not follow the tag.
const HEADING = /^h([1-6])$/;
const refNumber = ( ref ) => Number( /-(\d+)$/.exec( String( ref ) )?.[ 1 ] ?? NaN );
const levelOf = ( attrs ) => HEADING.exec( String( attrs.level ?? 'h2' ) )?.[ 1 ] ?? ( /^[1-6]$/.test( String( attrs.level ) ) ? String( attrs.level ) : '2' );

export function headingLevel( ctx ) {
	const { block, saved, target, draft, all } = ctx;
	if ( 'sgs/heading' !== block || target.slot || 'subheading' === saved.headingRole ) {
		return [];
	}
	const tag = draft?.[ 1440 ]?.tag;
	if ( ! tag ) {
		return [];
	}
	const have = `h${ levelOf( saved ) }`;
	let want = HEADING.test( tag ) ? tag : null;
	let why = `${ target.tpl } is a ${ tag } in the draft`;
	if ( ! want ) {
		const mine = refNumber( target.ref );
		const real = Object.entries( all?.drafts?.[ 1440 ]?.facts ?? {} )
			.map( ( [ key, f ] ) => ( { key, n: refNumber( key.split( '~' )[ 0 ] ), tag: f?.tag } ) )
			.filter( ( x ) => x.n < mine && HEADING.test( x.tag ?? '' ) && 'sgs/heading' === all.blocks[ x.key.split( '~' )[ 0 ] ]?.block )
			.sort( ( a, b ) => b.n - a.n )[ 0 ];
		const above = real ? Number( HEADING.exec( real.tag )[ 1 ] ) : 2;
		want = `h${ Math.min( above + 1, 6 ) }`;
		why += `, not a heading: it sits under ${ real ? `the ${ real.tag } ${ real.key }` : 'the page\'s h2 level' } and takes ${ want }`;
	}
	if ( want === have ) {
		return [ { status: 'equal', prop: 'level', why: `${ why }: renders ${ have } already` } ];
	}
	return [ { status: 'op', prop: 'level', why, writes: [ { attr: 'level', value: want } ], checks: [] } ];
}
