// The screenshot review gate for draft-live-walk.mjs. Writes contact.md: every
// state x width side-by-side shot, full size, with the config's review note for it or
// UNREVIEWED. A run with an unreviewed shot fails (GAP-CHECKLIST.md, "Screenshot review").
import fs from 'fs';
import path from 'path';

// Returns the number of shots with no review note.
export function writeContactSheet( outDir, cfg, runs ) {
	const review = cfg.review || {};
	const lines = [ `# Contact sheet: ${ cfg.name }`, '', 'Draft left, live right. Each note says what was compared in that shot.', '' ];
	let unreviewed = 0;
	for ( const r of runs ) {
		const note = review[ `${ r.state }@${ r.width }` ];
		if ( ! note ) {
			unreviewed++;
		}
		const open = Object.values( r.pairs ).flatMap( ( p ) => p.diffs ).filter( ( d ) => ! d.accepted ).length;
		lines.push( `## ${ r.state } @ ${ r.width } (${ open } open)`, '', `![${ r.state } @ ${ r.width }](${ r.shot })`, '',
			note ? `Reviewed: ${ note }` : '**UNREVIEWED**: open the shot, compare draft and live region by region, and add `review[\'' + r.state + '@' + r.width + '\']` to the config.', '' );
	}
	lines.splice( 3, 0, `**${ unreviewed } of ${ runs.length } shots unreviewed.**`, '' );
	fs.writeFileSync( path.join( outDir, 'contact.md' ), lines.join( '\n' ) );
	return unreviewed;
}
