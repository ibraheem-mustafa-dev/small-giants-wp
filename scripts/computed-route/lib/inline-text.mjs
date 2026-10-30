// Which SGS text settings hold inline markup, and the one path every writer of draft text into a block setting takes
// (rule: phrasing content inside a text element stays that element's inline HTML, in whichever block receives it).
// Where a setting's markup comes from is the framework's own record, never a list here:
//   - plugins/sgs-blocks/scripts/data/rich-text-format-roles.json `fields`: each SGS RichText (block folder, the attribute its
//     value prop prints) and the shared format list it takes;
//   - plugins/sgs-blocks/src/utils/rich-text-formats.js: each list's formats (core/bold, core/italic, core/link,
//     core/strikethrough, sgs/highlight, sgs/inline-photo), read from its source with the pinned parser;
//   - every other text setting (the framework DB's text-content attributes, the list block's item text) is plain text: a
//     draft's inline markup there is a named finding, never silently flattened.
// The draft tags each format draws are WordPress's format-library registrations (core/bold saves <strong>, core/italic
// <em>, core/strikethrough <s>, core/link <a>) and the HTML elements that draw the same (<b>, <i>, <del>).
import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import { INLINE_PAINT } from './phrasing-content.mjs';
import { linkWrite } from './draft-link.mjs';

export const FORMAT_TAGS = { 'core/bold': [ 'strong', 'b' ], 'core/italic': [ 'em', 'i' ], 'core/strikethrough': [ 's', 'del' ], 'core/link': [ 'a' ] };
// The tag a format saves (its first tag).
export const formatTag = ( format ) => FORMAT_TAGS[ format ]?.[ 0 ] ?? null;
// The format that draws a draft tag, or null.
export const formatOfTag = ( tag ) => Object.keys( FORMAT_TAGS ).find( ( f ) => FORMAT_TAGS[ f ].includes( tag ) ) ?? null;

// Each exported format list of rich-text-formats.js: `Object.freeze( [ 'a', ... ] )`, or another list filtered by
// `'x' !== name`. Any other shape throws, naming the list, so a new list is read, never guessed.
export function formatLists( source ) {
	const ast = parse( source, { sourceType: 'module' } );
	const lists = {};
	const valueOf = ( name, node ) => {
		const arg = 'CallExpression' === node.type && 'freeze' === node.callee?.property?.name ? node.arguments[ 0 ] : node;
		if ( 'ArrayExpression' === arg.type && arg.elements.every( ( x ) => 'StringLiteral' === x.type ) ) {
			return arg.elements.map( ( x ) => x.value );
		}
		const call = 'CallExpression' === arg.type && 'filter' === arg.callee?.property?.name ? arg : null;
		const test = call?.arguments[ 0 ]?.body;
		if ( call && lists[ call.callee.object.name ] && 'BinaryExpression' === test?.type && '!==' === test.operator && 'StringLiteral' === test.left.type ) {
			return lists[ call.callee.object.name ].filter( ( f ) => f !== test.left.value );
		}
		throw new Error( `rich-text-formats.js: the format list ${ name } is no list of names nor another list filtered by one name` );
	};
	for ( const st of ast.program.body ) {
		const d = 'ExportNamedDeclaration' === st.type ? st.declaration : null;
		for ( const v of d?.declarations || [] ) {
			lists[ v.id.name ] = valueOf( v.id.name, v.init );
		}
	}
	return lists;
}

const cache = new Map();
// The formats each SGS RichText setting takes: { formats: Map<'<block>:<attr>', string[]>, problems }. A field whose value
// prop is an item's (`plan.name`) is keyed `<block>:<array item>.<field>` as written; its format list names a list the
// formats file holds, else it is a problem.
export function richTextSettings( codeRepo ) {
	if ( cache.has( codeRepo ) ) {
		return cache.get( codeRepo );
	}
	const base = path.join( codeRepo, 'plugins/sgs-blocks' );
	const roles = JSON.parse( fs.readFileSync( path.join( base, 'scripts/data/rich-text-format-roles.json' ), 'utf8' ) );
	const lists = formatLists( fs.readFileSync( path.join( base, 'src/utils/rich-text-formats.js' ), 'utf8' ) );
	const formats = new Map();
	const problems = [];
	for ( const [ file, fields ] of Object.entries( roles.fields || {} ) ) {
		const folder = /src\/blocks\/([^/]+)\//.exec( file )?.[ 1 ];
		const json = folder ? path.join( base, 'src/blocks', folder, 'block.json' ) : null;
		const block = json && fs.existsSync( json ) ? JSON.parse( fs.readFileSync( json, 'utf8' ) ).name : null;
		for ( const [ expr, list ] of Object.entries( fields ) ) {
			const attr = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?/.exec( expr.trim() )?.[ 0 ];
			if ( ! block || ! attr || ! lists[ list ] ) {
				problems.push( `${ file } ${ expr }: ${ ! block ? 'no block.json beside it' : ! attr ? 'no setting name in the value' : `no format list ${ list }` }` );
				continue;
			}
			formats.set( `${ block }:${ attr }`, lists[ list ] );
		}
	}
	const out = { formats, problems };
	cache.set( codeRepo, out );
	return out;
}

// What one block setting holds of a draft's inline markup: { rich (a RichText setting), formats, br (a line break) }. A
// setting no RichText edits, or one printed as plain text (an empty format list), holds plain text only. `item` names an array setting's item field (`items.text`).
export function inlineAllowance( codeRepo, block, attr ) {
	const f = richTextSettings( codeRepo ).formats.get( `${ block }:${ attr }` );
	return f?.length ? { rich: true, formats: f, br: true } : { rich: false, formats: [], br: false };
}

// The text settings the framework DB lists (role text-content, string) that hold plain text only, as findings
// [ { block, attr, why } ], for the review: a draft's bold, link or line break written there is flattened.
export function plainTextSettings( { db, codeRepo } ) {
	const { formats } = richTextSettings( codeRepo );
	return db.prepare( "SELECT block_slug, attr_name FROM block_attributes WHERE role = 'text-content' AND attr_type = 'string' AND block_slug LIKE 'sgs/%' ORDER BY block_slug, attr_name" ).all()
		.filter( ( r ) => ! formats.get( `${ r.block_slug }:${ r.attr_name }` )?.length )
		.map( ( r ) => ( { block: r.block_slug, attr: r.attr_name, why: formats.has( `${ r.block_slug }:${ r.attr_name }` ) ? 'its RichText takes no format (RICH_TEXT_PLAIN: printed through esc_html)' : 'no RichText edits it (rich-text-format-roles.json lists none), so it holds plain text' } ) );
}


// The paint an inline tag draws by itself (the HTML Rendering section's default styles), so its own difference is the tag.
const TAG_PAINT = { b: [ 'font-weight' ], strong: [ 'font-weight' ], i: [ 'font-style' ], em: [ 'font-style' ], cite: [ 'font-style' ], dfn: [ 'font-style' ], var: [ 'font-style' ], s: [ 'text-decoration-line' ], del: [ 'text-decoration-line' ], u: [ 'text-decoration-line' ], ins: [ 'text-decoration-line' ], a: [ 'text-decoration-line', 'color' ], code: [ 'font-family' ], kbd: [ 'font-family' ], samp: [ 'font-family' ], small: [ 'font-size' ], sub: [ 'font-size', 'vertical-align' ], sup: [ 'font-size', 'vertical-align' ], mark: [ 'background-color', 'color' ] };
const escText = ( t ) => String( t ).replace( /&/g, '&amp;' ).replace( /</g, '&lt;' ).replace( />/g, '&gt;' );
const escAttr = ( t ) => escText( t ).replace( /"/g, '&quot;' );

// The paint an inline element differs from its parent by: the inventory's computed difference (`inlineDiff`), else what the
// draft declares on it (an inventory read before it recorded the difference), each of INLINE_PAINT.
function inlinePaint( m, el ) {
	const st = el.inlineDiff ?? m.read.declared( el );
	const out = {};
	INLINE_PAINT.forEach( ( k ) => {
		const alias = { 'text-decoration-line': 'text-decoration', 'background-color': 'background' }[ k ];
		const v = st[ k ] ?? ( alias ? st[ alias ] : undefined );
		null != v && '' !== String( v ).trim() && ( out[ k ] = String( v ).trim() );
	} );
	return out;
}

// The one path every writer of a draft text element into a block setting takes. o: { m (lib/skeleton-model.mjs), e (the
// draft element), block, attr (the setting receiving its words), codeRepo, siteLink (the draft-link resolver) }. When the
// element holds inline parts (lib/skeleton-model.mjs::inlineParts), its content is rebuilt as the markup the setting holds
// (inlineAllowance): text runs escaped; a line break as <br>; a bold, slanted or struck tag or span (its weight against
// the words around it, its slant, its strike) as the format's own tag (<strong>, <em>, <s>); a link as <a href> to its site
// address, never a draft route (a link with none keeps its words). What the setting holds no format for (a link in a
// button label, a <code>, a line break in a plain setting) and any other paint difference (a coloured word, a size: no
// format holds it, and no inline style is ever written, Spec 32) keeps its words and is a handover naming it.
// Returns { value, handover }, or null when the element holds no inline parts.
export function inlineText( { m, e, block, attr, codeRepo, siteLink } ) {
	if ( ! m.inlineParts( e ).length ) {
		return null;
	}
	const allow = inlineAllowance( codeRepo, block, attr );
	const handover = [];
	const lost = [];
	const where = `${ block } ${ attr }`;
	const html = ( x ) => m.flowOf( x ).map( ( r ) => {
		if ( null != r.text ) {
			return escText( r.text );
		}
		if ( r.br || 'br' === r.el.tag ) {
			allow.br || lost.push( 'a line break' );
			return allow.br ? '<br>' : ' ';
		}
		const el = r.el;
		// An element never shown prints nothing, and the parent's own children are its inline parts alone.
		if ( ! Object.values( el.visible || {} ).some( Boolean ) || ( x === e && ! m.inlineParts( e ).includes( el ) ) ) {
			return '';
		}
		let inner = html( el );
		const paint = inlinePaint( m, el );
		const own = TAG_PAINT[ el.tag ] || [];
		// Bold is a weight of 600 or more inside words drawn lighter: the browser's resolved weights of the element and the
		// element it sits in (at the widest width read), else the weight the element declares against a regular 400.
		const bold = ( y, v ) => parseInt( m.read.resolved( y, 'font-weight', 1440 ) ?? m.read.resolved( y, 'font-weight', 375 ) ?? v, 10 ) >= 600;
		const tagFormat = formatOfTag( el.tag );
		const wants = new Set( [
			...( tagFormat && 'core/link' !== tagFormat ? [ tagFormat ] : [] ),
			...( ! own.includes( 'font-weight' ) && bold( el, /^bold/.test( paint[ 'font-weight' ] || '' ) ? 700 : paint[ 'font-weight' ] ) && ! bold( x, 400 ) ? [ 'core/bold' ] : [] ),
			...( ! own.includes( 'font-style' ) && /italic|oblique/.test( paint[ 'font-style' ] || '' ) ? [ 'core/italic' ] : [] ),
			...( ! own.includes( 'text-decoration-line' ) && /line-through/.test( paint[ 'text-decoration-line' ] || '' ) ? [ 'core/strikethrough' ] : [] ),
		] );
		// What a format holds, a tag draws by itself or reads as the regular text is no difference left over.
		const settled = { 'font-weight': wants.has( 'core/bold' ) || bold( el, paint[ 'font-weight' ] ?? 400 ) === bold( x, 400 ), 'font-style': wants.has( 'core/italic' ) || 'normal' === paint[ 'font-style' ], 'text-decoration-line': wants.has( 'core/strikethrough' ) || 'none' === paint[ 'text-decoration-line' ] };
		const rest = Object.keys( paint ).filter( ( k ) => ! own.includes( k ) && ! settled[ k ] );
		rest.length && handover.push( { owner: 'content-page', kind: 'text', detail: `the words "${ m.words( el ) }" inside "${ m.words( e ) }" are drawn with ${ rest.map( ( k ) => `${ k } ${ paint[ k ] }` ).join( ', ' ) }: no format of ${ where } holds it and no inline style is written (Spec 32), so they print in the text's own style` } );
		for ( const f of [ 'core/strikethrough', 'core/italic', 'core/bold' ] ) {
			if ( wants.has( f ) ) {
				allow.formats.includes( f ) ? ( inner = `<${ formatTag( f ) }>${ inner }</${ formatTag( f ) }>` ) : lost.push( `the ${ f.replace( 'core/', '' ) } "${ m.words( el ) }"` );
			}
		}
		// A tag that draws a look no format holds (a <code>, a <sup>) keeps its words; one that draws none (a <span>, an <abbr>)
		// is no markup to keep.
		! tagFormat && TAG_PAINT[ el.tag ] && lost.push( `the <${ el.tag }> "${ m.words( el ) }"` );
		if ( 'a' === el.tag ) {
			const href = el.attrs?.href || '';
			const out = href ? linkWrite( siteLink( href, el ), href ) : { value: null, handover: null };
			out.handover && handover.push( out.handover );
			if ( null !== out.value && ! allow.formats.includes( 'core/link' ) ) {
				lost.push( `the link "${ m.words( el ) }" (${ out.value })` );
			}
			return null !== out.value && allow.formats.includes( 'core/link' ) ? `<a href="${ escAttr( out.value ) }"${ el.attrs?.target ? ` target="${ escAttr( el.attrs.target ) }"` : '' }>${ inner }</a>` : inner;
		}
		return inner;
	} ).join( '' );
	const value = html( e ).replace( /\s+/g, ' ' ).replace( /\s*<br>\s*/g, '<br>' ).trim();
	lost.length && handover.push( { owner: 'content-page', kind: 'text', detail: `${ where } ${ allow.rich ? `holds only ${ allow.formats.join( ', ' ) || 'no format' }` : 'holds plain text only (no RichText edits it)' }, so ${ lost.join( ', ' ) } inside "${ m.words( e ) }" keep${ 1 === lost.length ? 's' : '' } only ${ 1 === lost.length ? 'its' : 'their' } words` } );
	return { value, handover };
}
