// Writes Solve's report (FR-47-3): solve-report.json (everything) and solve-report.md (counts per class, every write
// with its before and after values, every token snap, wrong writes, and each surviving row with its class).
import fs from 'fs';
import path from 'path';
import { openRows } from './solve-rows.mjs';

const cell = ( v ) => String( typeof v === 'object' && null !== v ? JSON.stringify( v ) : v ?? '' ).replace( /\|/g, '\\|' ).replace( /\n/g, ' ' ).slice( 0, 160 );

export function writeSolveReport( outDir, r ) {
	fs.writeFileSync( path.join( outDir, 'solve-report.json' ), JSON.stringify( { ...r, before: undefined, after: undefined, openBefore: openRows( r.before ).length, openAfter: openRows( r.after ).length }, null, 1 ) );
	const L = [ `# Solve: ${ r.surface }`, '',
		`Refs added: ${ r.refsAdded }. Write rounds: ${ r.rounds }${ r.roundThreeWrote ? ' (round 3 still wrote: a kill condition)' : '' }. Open rows before: ${ openRows( r.before ).length }, after: ${ openRows( r.after ).length }. Intended (accepted): ${ r.intended }.`, '',
		'| Class | Rows |', '|---|---|',
		`| Hardcode (setting holds the draft value, paint still differs) | ${ r.classes.hardcode.length } |`,
		`| Missing setting (no setting paints it) | ${ r.classes.missing.length } |`,
		`| Unresolved | ${ r.classes.unresolved.length } |`,
		`| Derived box rows (not written) | ${ r.classes.derived.length } |`,
		`| Other kinds (reported, never written) | ${ r.classes.other.length } |`,
		`| Wrong writes | ${ r.wrong.length } of ${ r.writes.length } |`, '',
		'## Writes', '', '| Round | Node | Block | Element | Property | Setting | Before | After |', '|---|---|---|---|---|---|---|---|',
		...r.writes.map( ( w ) => `| ${ w.round } | ${ w.ref } | ${ w.block } | \`${ w.path }\` | ${ w.prop }${ w.state ? ':' + w.state : '' } | ${ w.attr } | ${ cell( w.before ) } | ${ cell( w.after ) } |` ), '',
		'## Wrong writes', '', ...( r.wrong.length ? r.wrong.map( ( w ) => `- round ${ w.round } ${ w.ref } ${ w.block } ${ w.attr } = ${ cell( w.after ) }${ w.reverted ? ' (reverted: ' + cell( w.revertReason ) + ')' : '' }` ) : [ 'None.' ] ), '',
		'## Token snaps', '', '| Where | From | To | Distance | Kind |', '|---|---|---|---|---|',
		...r.snaps.map( ( s ) => `| ${ s.where } | ${ s.from } | ${ s.to } | ${ s.distance ?? '' } | ${ s.kind } |` ), '' ];
	const section = ( title, rows, withReason ) => {
		L.push( `## ${ title }`, '' );
		if ( ! rows.length ) {
			L.push( 'None.', '' );
			return;
		}
		L.push( `| Width | Pair | Node | Element | Kind | Key | Draft | Live |${ withReason ? ' Reason |' : '' }`, `|---|---|---|---|---|---|---|---|${ withReason ? '---|' : '' }` );
		rows.forEach( ( x ) => L.push( `| ${ x.width } | ${ x.pair } | ${ x.ref || '' } | \`${ x.path ?? '' }\` | ${ x.kind } | ${ x.key } | ${ cell( x.draft ) } | ${ cell( x.live ) } |${ withReason ? ' ' + cell( x.reason ) + ' |' : '' }` ) );
		L.push( '' );
	};
	section( 'Hardcode', r.classes.hardcode, true );
	section( 'Missing setting', r.classes.missing, true );
	section( 'Unresolved', r.classes.unresolved, true );
	section( 'Derived box rows', r.classes.derived, false );
	fs.writeFileSync( path.join( outDir, 'solve-report.md' ), L.join( '\n' ) );
}
