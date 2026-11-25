// Heavy route tools refuse to run with the system temp folder on C: (plan 2026-11-25-land-fixes-and-editor-cleanup, Task 1):
// tests, sweeps and browsers write their scratch there, and on 2026-11-24 parallel workers filled C: and crashed the PC.
import os from 'node:os';

export function tempOnC( dir = os.tmpdir() ) {
	return /^[cC]:/.test( dir );
}

export function assertTempOffC( tool, dir = os.tmpdir() ) {
	if ( tempOnC( dir ) ) {
		throw new Error( `${ tool}: the temp folder ${ dir } is on C:. Point TEMP and TMP at E: first (Bash: export TEMP='E:\\sgs-tmp\\tmp-<label>' TMP='E:\\sgs-tmp\\tmp-<label>'; PowerShell: $env:TEMP='E:\\sgs-tmp\\tmp-<label>'; $env:TMP=$env:TEMP).` );
	}
}
