// Writes the parity report: report.json (everything), report.md (the differences),
// and one side-by-side screenshot per state and width (draft left, live right).
import fs from 'fs';
import path from 'path';

const cell = ( v ) => String( v ?? '' ).replace( /\|/g, '\\|' ).replace( /\n/g, ' ' ).slice( 0, 140 );

export function writeReport( outDir, cfg, results ) {
	fs.writeFileSync( path.join( outDir, 'report.json' ), JSON.stringify( results, null, 1 ) );
	const lines = [ `# Parity: ${ cfg.name }`, '', `Draft: ${ cfg.draft.url }  `, `Live: ${ cfg.live.url }`, '' ];
	let open = 0;
	let accepted = 0;
	for ( const r of results.runs ) {
		const rows = [];
		for ( const [ pair, p ] of Object.entries( r.pairs ) ) {
			for ( const d of p.diffs ) {
				if ( d.accepted ) {
					accepted++;
				} else {
					open++;
				}
				rows.push( `| ${ pair } | ${ d.kind } | ${ d.key } | ${ cell( d.draft ) } | ${ cell( d.live ) } | ${ d.accepted ? 'accepted: ' + cell( d.accepted ) : '**open**' } |` );
			}
		}
		lines.push( `## ${ r.state } @ ${ r.width }  (${ r.shot })`, '' );
		if ( rows.length ) {
			lines.push( '| pair | kind | key | draft | live | status |', '|---|---|---|---|---|---|', ...rows, '' );
		} else {
			lines.push( 'No differences.', '' );
		}
	}
	lines.splice( 5, 0, `**${ open } open, ${ accepted } accepted** across ${ results.runs.length } state x width runs.`, '' );
	fs.writeFileSync( path.join( outDir, 'report.md' ), lines.join( '\n' ) );
	return { open, accepted };
}

// Puts the draft and live screenshots of one run side by side in one PNG.
export async function sideBySide( browser, draftPng, livePng, outPng, width ) {
	const page = await browser.newPage( { viewport: { width: Math.min( width * 2 + 24, 3000 ), height: 400 } } );
	const uri = ( f ) => 'data:image/png;base64,' + fs.readFileSync( f ).toString( 'base64' );
	await page.setContent( `<body style="margin:0;display:flex;gap:24px;background:#c00;align-items:flex-start">
		<img src="${ uri( draftPng ) }" style="width:${ width }px"><img src="${ uri( livePng ) }" style="width:${ width }px"></body>` );
	await page.waitForTimeout( 100 );
	await page.screenshot( { path: outPng, fullPage: true } );
	await page.close();
}
