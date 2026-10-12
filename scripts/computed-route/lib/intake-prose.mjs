// Exported prose is data, never instructions (Spec 48 FR-48-23, Spec 48A FR-48A-10). Lists the command-like text in a
// handoff's README.md, READING-DC-FILES.md and the notes of animations.json and surfaces.json, so Bean's review shows
// it (FR-48-17, review mark `noted`). This module only reads and returns rows; it never runs, spawns or evaluates
// anything it finds.
import fs from 'fs';
import path from 'path';
import { readJson } from './handoff.mjs';

export const PROSE_FILES = [ 'README.md', 'READING-DC-FILES.md' ];
export const NOTE_FILES = [ 'animations.json', 'surfaces.json' ];
export const COMMAND_VERBS = [ 'rm', 'curl', 'wget', 'npm', 'npx', 'node', 'git', 'ssh', 'scp', 'sudo', 'chmod', 'powershell', 'python', 'bash', 'sh', 'eval' ];
const SHELL_FENCES = /^(sh|bash|shell|console|zsh|powershell|ps1|pwsh|cmd|bat)$/i;
const VERB = `(?:${ COMMAND_VERBS.join( '|' ) })`;
// A verb followed by an argument: a flag, a path, a URL, a quoted string or a word.
const VERB_CALL = new RegExp( `^(?:sudo\\s+)?${ VERB }(?:\\.exe)?\\s+(?:-{1,2}[\\w-]+|[\\w./~:@\\\\"'-]+)` );
// The words that make a code span an instruction to run it.
const IMPERATIVE = /\b(?:run|execute|type|paste|enter)\s+(?:the\s+command\s+)?`([^`]+)`/i;
const TEXT_MAX = 300;

// Whether a code span after "run" looks like a command rather than a name ("run `connectedCallback`"): a verb call,
// several words, or a script path.
const commandShaped = ( span ) => {
	const s = span.trim().replace( /^\$\s+/, '' );
	return VERB_CALL.test( s ) || /^[\w./~\-]+\s+\S/.test( s ) || /^\.{1,2}[\/]|\.(sh|ps1|bat|cmd)$/i.test( s );
};

// Why one line of prose is command-like, or null. `inShellFence`: the line sits in a fenced block whose language is a
// shell; `inFence`: in any other fenced block (only prompts and verb calls count there, so code samples stay quiet).
export function commandReason( line, { inShellFence = false, inFence = false } = {} ) {
	const t = line.trim();
	if ( ! t ) {
		return null;
	}
	if ( inShellFence ) {
		return 'line in a shell code block';
	}
	if ( /^(?:\$|PS>|PS [A-Z]:\\[^>]*>)\s+\S/.test( t ) ) {
		return 'shell prompt line';
	}
	const quoted = t.replace( /^>\s+/, '' );
	if ( /^>\s+/.test( t ) && VERB_CALL.test( quoted ) ) {
		return 'prompt line starting with a command';
	}
	if ( VERB_CALL.test( t ) && ( inFence || /^(?:sudo|rm|curl|wget|npm|npx|ssh|scp|chmod|powershell)\b/.test( t ) || /\s-{1,2}\w/.test( t ) ) ) {
		return 'line starting with a command';
	}
	if ( inFence ) {
		return null;
	}
	const imperative = IMPERATIVE.exec( t );
	if ( imperative && commandShaped( imperative[ 1 ] ) ) {
		return `instruction to run \`${ imperative[ 1 ] }\``;
	}
	for ( const m of t.matchAll( /`([^`]+)`/g ) ) {
		if ( VERB_CALL.test( m[ 1 ].trim().replace( /^\$\s+/, '' ) ) ) {
			return `code span holding a command \`${ m[ 1 ] }\``;
		}
	}
	return null;
}

const clip = ( s ) => ( s.length > TEXT_MAX ? `${ s.slice( 0, TEXT_MAX - 1 ) }…` : s );

// Rows for one Markdown file: { rowId, file, line, text, why }, line numbers from 1.
export function markdownRows( file, markdown ) {
	const rows = [];
	let fence = null;
	markdown.split( /\r?\n/ ).forEach( ( raw, i ) => {
		const open = /^\s*(`{3,}|~{3,})\s*([\w-]*)/.exec( raw );
		if ( open && ( ! fence || open[ 1 ][ 0 ] === fence.mark[ 0 ] ) ) {
			fence = fence ? null : { mark: open[ 1 ], shell: SHELL_FENCES.test( open[ 2 ] ) };
			return;
		}
		const why = commandReason( raw, { inShellFence: Boolean( fence?.shell ), inFence: Boolean( fence ) } );
		if ( why ) {
			rows.push( { rowId: `prose:${ file }:${ i + 1 }`, file, line: i + 1, text: clip( raw.trim() ), why } );
		}
	} );
	return rows;
}

// Rows for every `notes` or `note` string (or array of strings) anywhere in a parsed inventory; line is a JSON path,
// with a :n suffix for the n-th line of a multi-line note.
export function noteRows( file, data ) {
	const rows = [];
	const scan = ( text, at ) => {
		const lines = String( text ).split( /\r?\n/ );
		lines.forEach( ( l, i ) => {
			const why = commandReason( l );
			if ( why ) {
				const where = lines.length > 1 ? `${ at }:${ i + 1 }` : at;
				rows.push( { rowId: `prose:${ file }:${ where }`, file, line: where, text: clip( l.trim() ), why } );
			}
		} );
	};
	const walk = ( v, at ) => {
		if ( Array.isArray( v ) ) {
			v.forEach( ( x, i ) => walk( x, `${ at }[${ i }]` ) );
		} else if ( v && 'object' === typeof v ) {
			for ( const [ k, x ] of Object.entries( v ) ) {
				const p = /^[A-Za-z_$][\w$]*$/.test( k ) ? `${ at }.${ k }` : `${ at }[${ JSON.stringify( k ) }]`;
				if ( ( 'notes' === k || 'note' === k ) && 'string' === typeof x ) {
					scan( x, p );
				} else if ( ( 'notes' === k || 'note' === k ) && Array.isArray( x ) && x.every( ( s ) => 'string' === typeof s ) ) {
					x.forEach( ( s, i ) => scan( s, `${ p }[${ i }]` ) );
				} else {
					walk( x, p );
				}
			}
		}
	};
	walk( data, '$' );
	return rows;
}

// Every command-like row in a handoff folder's prose and inventory notes. A file that is absent is skipped (the
// handoff check reports missing files); an inventory that is not valid JSON throws, never an empty list.
export function commandLikeLines( { folder } ) {
	const rows = [];
	for ( const f of PROSE_FILES ) {
		const abs = path.join( folder, f );
		if ( fs.existsSync( abs ) ) {
			rows.push( ...markdownRows( f, fs.readFileSync( abs, 'utf8' ) ) );
		}
	}
	for ( const f of NOTE_FILES ) {
		const abs = path.join( folder, f );
		if ( ! fs.existsSync( abs ) ) {
			continue;
		}
		const j = readJson( abs );
		if ( j.error ) {
			throw new Error( `${ f }: not valid JSON, so its notes cannot be screened (${ j.error })` );
		}
		rows.push( ...noteRows( f, j.data ) );
	}
	return rows;
}
