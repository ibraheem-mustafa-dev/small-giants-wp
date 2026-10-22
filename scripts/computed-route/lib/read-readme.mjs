// The README reader (Spec 48 FR-48-7, Spec 48A §3, FR-48A-8 and FR-48A-10): the handoff's `README.md` split into sections by
// handoff-schema/README.template.md's headings, each section's text kept, and the lists the template marks as structured
// facts: judgement calls, open items, business details and platform intent. A heading matches a template heading by its text
// (case, numbering such as `3.` or `§3`, a trailing `(...)` note and `&` against `and` ignored; the template words may be
// followed by more words, so "Global layout (every page)" is "Global layout"). The README does not address elements, so the
// result is one object for the whole folder. Block-mapping text (a heading that names SGS or block mapping) is kept as
// evidence only (FR-48A-8): the builders choose blocks from the code. Any line lib/intake-prose.mjs flags as a command is
// kept, marked flagged with its reason, and never acted on (FR-48A-10).
import fs from 'fs';
import path from 'path';
import { commandReason } from './intake-prose.mjs';

// The headings of handoff-schema/README.template.md, in order.
export const TEMPLATE_HEADINGS = [
	'Overview', 'Files', 'Routes', 'Global layout', 'Pages', 'Forms', 'Animations and interactions',
	'Business details', 'Judgement calls', 'Open items', 'Revision',
];

// Template heading -> the structured list it feeds.
const LIST_OF = { 'Judgement calls': 'judgementCalls', 'Open items': 'openItems', 'Business details': 'businessDetails' };
const PLATFORM = /\b(platform|woocommerce|wordpress|plugins?)\b/i;
const BLOCK_HINT = /\bsgs\b|block[\s-]*mapping|\bblocks?\b/i;

// A heading's comparable text.
export const normaliseHeading = ( text ) => text
	.replace( /\s*\([^)]*\)\s*$/, '' )
	.replace( /^[\s§]*(?:\d+(?:\.\d+)*[.)]?|[ivx]+[.)])\s+/i, '' )
	.replace( /&/g, ' and ' )
	.replace( /[`*_:]/g, '' )
	.replace( /\s+/g, ' ' )
	.trim()
	.toLowerCase();

// The template heading a README heading is, or null.
export function templateHeadingOf( text ) {
	const n = normaliseHeading( text );
	return TEMPLATE_HEADINGS.find( ( t ) => n === t.toLowerCase() || n.startsWith( `${ t.toLowerCase() } ` ) ) ?? null;
}

const ITEM = /^\s*(?:[-*+]|\d+[.)])\s+(.+?)\s*$/;
const isNone = ( s ) => /^none\.?$/i.test( s.trim() );

// Sections of a Markdown text: { heading, level, line, text, lines: [ { line, text } ] }, headings inside a code fence
// ignored; the document title (the first level 1 heading) is returned as `title`.
export function splitSections( markdown ) {
	const sections = [];
	let title = null;
	let fence = null;
	let cur = null;
	markdown.split( /\r?\n/ ).forEach( ( raw, i ) => {
		const open = /^\s*(`{3,}|~{3,})/.exec( raw );
		if ( open && ( ! fence || open[ 1 ][ 0 ] === fence ) ) {
			fence = fence ? null : open[ 1 ][ 0 ];
		}
		const h = ! fence && ! open ? /^(#{1,6})[ \t]+(.+?)[ \t#]*$/.exec( raw ) : null;
		if ( h ) {
			if ( 1 === h[ 1 ].length && null === title && 0 === sections.length ) {
				title = h[ 2 ];
				cur = null;
				return;
			}
			cur = { heading: h[ 2 ], level: h[ 1 ].length, line: i + 1, lines: [] };
			sections.push( cur );
			return;
		}
		cur && cur.lines.push( { line: i + 1, text: raw } );
	} );
	return { title, sections: sections.map( ( s ) => ( { ...s, text: s.lines.map( ( l ) => l.text ).join( '\n' ).trim() } ) ) };
}

// readReadme({ folder }) -> { present, title, sections: [ { heading, level, line, template, text, none, flagged } ],
// judgementCalls, openItems, businessDetails, platformIntent: [ { text, line, section, flagged? } ], blockHints: [ { text, line,
// section } ], flagged: [ { line, text, why } ], missing: [ template heading ], gaps }. Lists hold the bullets (and numbered
// items) of the section and of the deeper headings under it; "None" is no item. `blockHints` are the bullets and table rows
// under a heading that names SGS or block mapping, evidence only.
export function readReadme( { folder } ) {
	const file = path.join( folder, 'README.md' );
	const empty = { present: false, title: null, sections: [], judgementCalls: [], openItems: [], businessDetails: [], platformIntent: [], blockHints: [], flagged: [], missing: [ ...TEMPLATE_HEADINGS ], gaps: [] };
	if ( ! fs.existsSync( file ) ) {
		return empty;
	}
	let markdown;
	try {
		markdown = fs.readFileSync( file, 'utf8' );
	} catch ( e ) {
		return { ...empty, gaps: [ { construct: 'readme', draftId: 'README.md', error: `README.md could not be read: ${ e.message }` } ] };
	}
	const { title, sections } = splitSections( markdown );
	const flaggedAt = new Map();
	let fence = null;
	markdown.split( /\r?\n/ ).forEach( ( raw, i ) => {
		const open = /^\s*(`{3,}|~{3,})\s*([\w-]*)/.exec( raw );
		if ( open && ( ! fence || open[ 1 ][ 0 ] === fence.mark ) ) {
			fence = fence ? null : { mark: open[ 1 ][ 0 ], shell: /^(sh|bash|shell|console|zsh|powershell|ps1|pwsh|cmd|bat)$/i.test( open[ 2 ] ) };
			return;
		}
		const why = commandReason( raw, { inShellFence: Boolean( fence?.shell ), inFence: Boolean( fence ) } );
		why && flaggedAt.set( i + 1, why );
	} );
	const out = { ...empty, present: true, title, sections: [], missing: [], flagged: [], gaps: [] };
	const seen = new Set();
	sections.forEach( ( s, idx ) => {
		const template = templateHeadingOf( s.heading );
		template && seen.add( template );
		const mine = s.lines.filter( ( l ) => flaggedAt.has( l.line ) ).map( ( l ) => ( { line: l.line, text: l.text.trim(), why: flaggedAt.get( l.line ) } ) );
		out.sections.push( { heading: s.heading, level: s.level, line: s.line, template, text: s.text, none: isNone( s.text ), flagged: mine } );
		out.flagged.push( ...mine );
		// The section and the deeper headings under it.
		const own = [ s ];
		for ( let j = idx + 1; j < sections.length && sections[ j ].level > s.level; j++ ) {
			own.push( sections[ j ] );
		}
		const items = [];
		for ( const part of own ) {
			for ( const l of part.lines ) {
				const m = ITEM.exec( l.text );
				const row = ! m && /^\s*\|.*\|\s*$/.test( l.text ) && ! /^\s*\|[\s:|-]+\|\s*$/.test( l.text ) ? l.text.trim() : null;
				const text = m ? m[ 1 ] : row;
				text && ! isNone( text ) && items.push( { text, line: l.line, section: part.heading, ...( flaggedAt.has( l.line ) ? { flagged: flaggedAt.get( l.line ) } : {} ) } );
			}
		}
		template && LIST_OF[ template ] && out[ LIST_OF[ template ] ].push( ...items );
		! template && PLATFORM.test( s.heading ) && ! BLOCK_HINT.test( s.heading ) && out.platformIntent.push( ...items );
		BLOCK_HINT.test( s.heading ) && out.blockHints.push( ...items.map( ( { flagged, ...it } ) => it ) );
	} );
	out.missing = TEMPLATE_HEADINGS.filter( ( t ) => ! seen.has( t ) );
	return out;
}
