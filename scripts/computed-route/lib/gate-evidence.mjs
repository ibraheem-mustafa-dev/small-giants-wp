// A gate's evidence in the form Spec 48 FR-48-66 requires: a command and its output line ({ command, line }) or a file
// and a key ({ file, key }, with the reading as `line`). Free text is not evidence.
const text = ( v ) => 'string' === typeof v && '' !== v.trim();

export const fromCommand = ( command, line ) => ( { command, line } );
export const fromFile = ( file, key, line ) => ( { file, key, line } );

// Whether a value is evidence: a command with its output line, or a file with a key.
export function isEvidence( e ) {
	return !! e && 'object' === typeof e && ! Array.isArray( e ) && ( ( text( e.command ) && text( e.line ) ) || ( text( e.file ) && text( e.key ) ) );
}

// Evidence as one readable line for the CLI: the reading, then where it came from.
export function renderEvidence( e ) {
	if ( ! isEvidence( e ) ) {
		return `(not evidence: ${ JSON.stringify( e ?? null ) })`;
	}
	return text( e.command ) ? `${ e.line } [${ e.command }]` : `${ text( e.line ) ? `${ e.line } ` : '' }[${ e.file } :: ${ e.key }]`;
}
