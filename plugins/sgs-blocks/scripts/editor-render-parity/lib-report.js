/**
 * Prints one check section of the survey report.
 */

'use strict';

function printReport( title, netNew, accepted, blocksBuild = false ) {
	// The label is DERIVED from the flag, not hardcoded. It used to read "advisory"
	// unconditionally, so flipping a check to blocking would have left the output
	// confidently stating the opposite of what the gate now does (R3-c, 2026-08-20).
	process.stdout.write(
		`${ title } — ${
			blocksBuild
				? 'BLOCKING: a net-new finding fails the build'
				: 'advisory, does not fail the build'
		}:\n`
	);
	if ( accepted.length ) {
		process.stdout.write( `  ${ accepted.length } baselined finding(s) (accepted with reason).\n` );
	}
	if ( ! netNew.length ) {
		process.stdout.write( '  OK — 0 net-new findings.\n\n' );
		return;
	}
	process.stdout.write( `  ${ netNew.length } net-new finding(s):\n` );
	for ( const f of netNew ) {
		process.stdout.write( `   - [${ f.block }] ${ f.attr } — ${ f.reason }\n` );
	}
	process.stdout.write( '\n' );
}

module.exports = {
	printReport,
};
