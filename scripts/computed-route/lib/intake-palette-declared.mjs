// The palette roles the draft's author declares (Spec 48 FR-48-31, Bean 2026-10-24: the handoff files are the primary
// source, the painted result the cross-check), for lib/intake-palette.mjs::proposePalette. Three declarations, in
// order of strength:
//   3 a var() alias whose name (its shared namespace prefix removed) is a theme.json palette slug
//     (`--text-body: var(--ink)` names nothing; `--surface: var(--paper)` would name `surface`);
//   2 a var() alias whose name the role vocabulary maps to a slug (data/palette-role-words.json aliasNames:
//     `--surface-card: var(--white)` declares `surface-alt` for #FFFFFF);
//   1 a phrase in the comment beside a token's declaration in tokens/*.css, or in a handoff README line that names
//     a hex after the phrase (commentPhrases: `--paper: #FAF8F5; /* page background */` declares `surface`).
// The declared value is the alias's resolved colour (the chain tokens.mjs records). For each slug the strongest
// declaration wins; two declarations of one strength naming different colours cancel (neither is proposed). Words
// count here only because they are the draft author's own declaration, mapped through the framework's slugs and that
// one documented vocabulary.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const ROLE_WORDS = JSON.parse( fs.readFileSync( path.join( HERE, '..', 'data', 'palette-role-words.json' ), 'utf8' ) );

const wordsOf = ( name ) => name.replace( /^--/, '' ).toLowerCase().split( /[-_]+/ ).filter( Boolean );

// The namespace word most colour tokens share (`mm` in `--mm-cocoa`), or null: kept off alias names before matching.
export function namespaceOf( names ) {
	const first = new Map();
	names.forEach( ( n ) => first.set( wordsOf( n )[ 0 ], ( first.get( wordsOf( n )[ 0 ] ) || 0 ) + 1 ) );
	const [ word, n ] = [ ...first.entries() ].sort( ( a, b ) => b[ 1 ] - a[ 1 ] )[ 0 ] || [];
	return names.length >= 3 && n >= 0.8 * names.length ? word : null;
}

// The comment text on a declaration's line (`/* ... */` after it), or ''.
const commentOn = ( text, line ) => ( /\/\*(.*?)\*\//.exec( ( text.split( /\r?\n/ )[ line - 1 ] || '' ).split( ';' ).slice( 1 ).join( ';' ) )?.[ 1 ] || '' ).trim();

// The phrases a comment states as a use: each comma-separated clause, a leading `label:` removed, is a use when a
// phrase sits within its first three words ("cards, inputs" is a use as cards; "dividers in cards" is not).
const phraseRoles = ( text, words ) => {
	const clauses = text.toLowerCase().split( /[,;()]/ ).map( ( c ) => c.replace( /^[^:]*:\s*/, '' ).trim().split( /\s+/ ).slice( 0, 3 ).join( ' ' ) );
	return Object.entries( words.commentPhrases ).filter( ( [ phrase ] ) => clauses.some( ( c ) => ` ${ c } `.includes( ` ${ phrase } ` ) ) )
		.map( ( [ phrase, slug ] ) => ( { phrase, slug } ) );
};

// README statements: a phrase followed, within 12 characters holding no number and naming no other colour property,
// by a hex the line names ("accent, taupe: `#9C8B78`"; not "2px outline, fill #111111").
const COLOUR_PROPERTY = /\b(fill|background|border|colou?r|text|stroke)\b/i;
const readmeRoles = ( line, words ) => Object.entries( words.commentPhrases ).flatMap( ( [ phrase, slug ] ) => {
	const at = line.toLowerCase().indexOf( phrase );
	const m = at < 0 ? null : /#[0-9a-f]{6}\b/i.exec( line.slice( at + phrase.length ) );
	const gap = m ? line.slice( at + phrase.length, at + phrase.length + m.index ) : null;
	return null !== gap && gap.length <= 12 && ! /\d/.test( gap ) && ! COLOUR_PROPERTY.test( gap ) ? [ { phrase, slug, hex: m[ 0 ].toUpperCase() } ] : [];
} );

// Every declaration: [{ slug, hex, token, strength, source: 'alias'|'comment'|'readme', why }].
export function declarations( { tokens, folder, slugs, words = ROLE_WORDS } ) {
	const vocab = new Set( slugs );
	const colours = tokens.filter( ( t ) => 'colour' === t.type && t.hex );
	const ns = namespaceOf( colours.map( ( t ) => t.name ) );
	const out = [];
	const files = new Map();
	const textOf = ( file ) => {
		if ( ! folder ) {
			return '';
		}
		if ( ! files.has( file ) ) {
			const at = path.join( folder, file );
			files.set( file, fs.existsSync( at ) ? fs.readFileSync( at, 'utf8' ) : '' );
		}
		return files.get( file );
	};
	for ( const t of colours ) {
		if ( t.chain?.length ) {
			const own = wordsOf( t.name ).filter( ( w, i ) => ! ( 0 === i && w === ns ) ).join( '-' );
			if ( vocab.has( own ) ) {
				out.push( { slug: own, hex: t.hex, token: t.name, strength: 3, source: 'alias', why: `the draft declares ${ t.name }: var(${ t.chain[ t.chain.length - 1 ] }) (the slug's own name)` } );
			} else if ( words.aliasNames[ own ] && vocab.has( words.aliasNames[ own ] ) ) {
				out.push( { slug: words.aliasNames[ own ], hex: t.hex, token: t.name, strength: 2, source: 'alias', why: `the draft declares ${ t.name }: var(${ t.chain[ t.chain.length - 1 ] })` } );
			}
		}
		const note = t.file && t.line ? commentOn( textOf( t.file ), t.line ) : '';
		for ( const { phrase, slug } of note ? phraseRoles( note, words ) : [] ) {
			vocab.has( slug ) && out.push( { slug, hex: t.hex, token: t.name, strength: 1, source: 'comment', why: `the draft's comment on ${ t.name } says "${ phrase }" ("${ note }")` } );
		}
	}
	const readme = folder ? path.join( folder, 'README.md' ) : null;
	if ( readme && fs.existsSync( readme ) ) {
		for ( const line of fs.readFileSync( readme, 'utf8' ).split( /\r?\n/ ) ) {
			for ( const { slug, hex } of readmeRoles( line, words ) ) {
				const token = colours.find( ( t ) => t.hex.toUpperCase() === hex );
				token && vocab.has( slug ) && out.push( { slug, hex: token.hex, token: token.name, strength: 1, source: 'readme', why: `the handoff README says "${ line.trim().slice( 0, 120 ) }"` } );
			}
		}
	}
	return out;
}

// The declared role per slug: Map slug -> the winning declaration (strongest; a tie between different colours drops
// the slug), and `conflicts` [{ slug, hexes }] for those ties.
export function declaredRoles( list ) {
	const by = new Map();
	list.forEach( ( d ) => by.set( d.slug, [ ...( by.get( d.slug ) || [] ), d ] ) );
	const roles = new Map();
	const conflicts = [];
	for ( const [ slug, ds ] of by ) {
		const top = Math.max( ...ds.map( ( d ) => d.strength ) );
		const best = ds.filter( ( d ) => d.strength === top );
		const hexes = [ ...new Set( best.map( ( d ) => d.hex.toUpperCase() ) ) ];
		if ( 1 === hexes.length ) {
			roles.set( slug, best[ 0 ] );
		} else {
			conflicts.push( { slug, hexes } );
		}
	}
	return { roles, conflicts };
}
