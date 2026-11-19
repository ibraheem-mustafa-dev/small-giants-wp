// The account page's words and modes on its working block (Spec 48 FR-48-87; Spec 27 FR-30-25; data/template-pieces.json
// pages.account kind `account`). The skeleton placed `sgs/account` at the draft's account region
// (lib/skeleton-commerce-region.mjs::commerceRegion); this builder writes onto that one node the block's content and mode
// settings the draft answers, each part told by structure (lib/template-piece-account-read.mjs) and fed to the setting
// data/account-parts.json names:
//   - the region holds a password field: the draft shows the sign-in form on the account page, so the block keeps its form
//     view and takes the forms' words (read from the region's inventory);
//   - else the region is the signed-out prompt (a branch with links to the sign-in surface): the block's card view
//     (`prompt.view`) with the card's heading, text and the two buttons' words; each button's address is the draft link
//     resolved through the page map (lib/draft-link.mjs::resolveDraftLink). A link that reaches the page holding the block
//     (the page map folds the draft's sign-in page into the account row) writes no address: the block's own empty address
//     opens its sign-in form on the same page (`?sgs-login=1`, with the register query for the second button), and an address
//     there would send every signed-out visitor straight on (class-account-redirect.php::Account_Redirect::decide_signed_out).
//     A link to another page writes that page's address (the register button's with the block's register query); an
//     unresolved one writes nothing and is a note. The forms' words are read from the sign-in draft files themselves
//     (commerceOf's `signIn`), with the sign-in tabs where the draft draws them;
//   - the signed-in view's panel headings and sign-out words are read from the account draft's source.
// Only content and mode settings are written; the look is part-look.mjs's. A setting the node already holds with another
// value is kept and noted. Every part the draft draws that no setting holds, or that structure cannot place, is a note
// beginning `gap:`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inventoryModel } from './skeleton-model.mjs';
import { commerceRegion, leadsTo } from './skeleton-commerce-region.mjs';
import { regionRule } from './template-piece-woo-layout.mjs';
import { treeNodes } from './template-piece-draft.mjs';
import { parseTemplate } from './shop-parts-read.mjs';
import { resolveDraftLink, linkWrite } from './draft-link.mjs';
import { openDb } from './db.mjs';
import { below, formWords, hasPassword, inventoryTree, plain, promptParts, signedInWords, tabWords, templateTree } from './template-piece-account-read.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const ACCOUNT_PARTS_FILE = path.resolve( HERE, '..', 'data', 'account-parts.json' );
const REPO = path.resolve( HERE, '..', '..', '..' );
const STRINGS = /^strings\.(.+)$/;
const GROUPS = [ 'prompt', 'form', 'signedIn' ];

// The keys a PHP class's `<list>()` returns (`'key' => 'text'` pairs in its body).
export function phpListKeys( source, list ) {
	const at = String( source ).search( new RegExp( `function\\s+${ list }\\s*\\(` ) );
	if ( at < 0 ) {
		return [];
	}
	const body = String( source ).slice( at, String( source ).indexOf( '}', at ) );
	return [ ...body.matchAll( /'([A-Za-z0-9_]+)'\s*=>/g ) ].map( ( m ) => m[ 1 ] );
}

// Each setting the map names: [ { group, part, setting, value } ] (`value` undefined: the draft's words).
export function settingsOf( parts ) {
	return GROUPS.flatMap( ( group ) => Object.entries( parts?.[ group ] || {} ).filter( ( [ part ] ) => 'registerQuery' !== part ).map( ( [ part, v ] ) => ( 'string' === typeof v ? { group, part, setting: v } : { group, part, setting: v?.setting, value: v?.value } ) ) );
}

// What is wrong with the map against the framework database: one line per fault. `stringKeys` are the keys the block's
// wording class supports.
export function accountPartsProblems( parts, db, stringKeys ) {
	const out = [];
	const row = ( attr ) => db.prepare( 'SELECT attr_type, enum_values, css_property FROM block_attributes WHERE block_slug = ? AND attr_name = ?' ).get( parts.block, attr );
	if ( ! parts?.block || ! db.prepare( 'SELECT 1 FROM block_attributes WHERE block_slug = ? LIMIT 1' ).get( parts.block ) ) {
		return [ `the framework database holds no block "${ parts?.block ?? '' }"` ];
	}
	for ( const { group, part, setting, value } of settingsOf( parts ) ) {
		const where = `${ group }.${ part }`;
		const sub = STRINGS.exec( String( setting ?? '' ) );
		if ( sub ) {
			'object' !== row( 'strings' )?.attr_type && out.push( `${ where }: ${ parts.block } has no object setting "strings"` );
			stringKeys.includes( sub[ 1 ] ) || out.push( `${ where }: "${ sub[ 1 ] }" is not a key the block's wording map supports` );
			continue;
		}
		const r = setting ? row( setting ) : null;
		if ( ! r ) {
			out.push( `${ where }: the framework database holds no ${ parts.block } setting "${ setting ?? '' }"` );
			continue;
		}
		r.css_property && out.push( `${ where }: ${ setting } paints ${ r.css_property }, which is Fill's to write, never this builder's` );
		if ( undefined === value ) {
			'string' !== r.attr_type && out.push( `${ where }: ${ setting } is a ${ r.attr_type }, so it cannot take the draft's words` );
		} else if ( ( 'boolean' === r.attr_type ) !== ( 'boolean' === typeof value ) || ( 'string' === r.attr_type && 'string' !== typeof value ) ) {
			out.push( `${ where }: ${ setting } is a ${ r.attr_type }, so it cannot take ${ JSON.stringify( value ) }` );
		} else if ( r.enum_values && ! JSON.parse( r.enum_values ).includes( value ) ) {
			out.push( `${ where }: ${ setting } lists ${ r.enum_values }, not ${ JSON.stringify( value ) }` );
		}
	}
	return out;
}

// The map, refused when a setting it names is not one the block holds as content or mode.
export function loadAccountParts( { file = ACCOUNT_PARTS_FILE, db = null, repo = REPO } = {} ) {
	const parts = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	const source = path.join( repo, parts.stringsSource?.file || '' );
	const keys = fs.existsSync( source ) ? phpListKeys( fs.readFileSync( source, 'utf8' ), parts.stringsSource.list ) : [];
	const problems = accountPartsProblems( parts, db || openDb(), keys );
	if ( problems.length ) {
		throw new Error( `${ path.basename( file ) }: ${ problems.join( '; ' ) }` );
	}
	return parts;
}

// A page link without its query string and fragment; a hash link as it is.
const pagePath = ( href ) => ( String( href ?? '' ).trim().startsWith( '#' ) ? String( href ).trim() : String( href ?? '' ).split( /[?#]/ )[ 0 ] );

// One button's address: { value (null: write nothing), note }. `ctx.draftLinks` is the resolver context, `ctx.pageRowId` the
// page-map row the block's page is.
function buttonAddress( ctx, href, query ) {
	const r = resolveDraftLink( href, ctx.draftLinks || null, { file: ctx.draftFile || '' } );
	if ( 'address' === r.kind && ctx.draftLinks?.routeRow.get( r.route )?.id === ctx.pageRowId && null != ctx.pageRowId ) {
		return { value: null, note: `"${ href }" reaches this page, whose block draws the sign-in form itself: the block's own address is kept` };
	}
	if ( 'address' === r.kind ) {
		return { value: query ? `${ r.value }${ r.value.includes( '?' ) ? '&' : '?' }${ query }` : r.value, note: null };
	}
	const w = linkWrite( r, href );
	return { value: 'unresolved' === r.kind ? null : w.value, note: w.handover?.detail || ( null === w.value ? `"${ href }" reaches no page` : null ) };
}

export function place( ctx, piece ) {
	const { key, tree } = ctx;
	const parts = ctx.accountParts || loadAccountParts( { db: ctx.db } );
	const note = ( why ) => ( { notes: [ `${ key }: piece "${ piece.id }" (${ parts.block }) is not written: ${ why }` ] } );
	const homes = treeNodes( tree ).filter( ( r ) => r.node.name === parts.block );
	if ( 1 !== homes.length ) {
		return note( `the tree holds ${ homes.length } ${ parts.block }` );
	}
	const m = inventoryModel( ctx.inventory || { elements: [] } );
	const region = ctx.region ?? commerceRegion( { m, commerce: ctx.commerce, rule: regionRule() } )?.key ?? null;
	const scope = region ? inventoryTree( ctx.inventory, region ) : null;
	if ( ! scope ) {
		return note( 'the surface has no account region' );
	}
	const found = [];
	const gaps = [];
	const mode = hasPassword( scope ) ? 'form' : 'prompt';
	if ( 'form' === mode ) {
		const f = formWords( scope, parts.tokens );
		found.push( ...f.found.map( ( x ) => ( { ...x, group: 'form' } ) ) );
		gaps.push( ...f.gaps );
		below( scope ).some( ( n ) => 'tab' === n.attrs.role ) && gaps.push( 'tabs: the region draws sign-in tabs, which are read only from a sign-in draft file' );
	} else {
		const files = ctx.commerce?.signIn || [];
		const p = promptParts( scope, ( href ) => files.some( ( f ) => leadsTo( pagePath( href ), f ) ) );
		gaps.push( ...p.gaps );
		found.push( { group: 'prompt', part: 'view', value: parts.prompt.view.value, at: region } );
		for ( const [ part, n ] of [ [ 'heading', p.heading ], [ 'copy', p.copy ] ] ) {
			n && ( plain( n.text ) ? found.push( { group: 'prompt', part, value: n.text, at: n.key } ) : gaps.push( `prompt ${ part }: the draft's words at ${ n.key } carry a live value` ) );
		}
		for ( const [ which, n, query ] of [ [ 'signIn', p.signIn, null ], [ 'register', p.register, parts.prompt.registerQuery ] ] ) {
			if ( ! n ) {
				continue;
			}
			plain( p.words( n ) ) ? found.push( { group: 'prompt', part: `${ which }Label`, value: p.words( n ), at: n.key } ) : gaps.push( `prompt ${ which } button: its words at ${ n.key } carry a live value` );
			const a = buttonAddress( ctx, n.attrs.href, query );
			null !== a.value && found.push( { group: 'prompt', part: `${ which }Url`, value: a.value, at: n.key } );
			a.note && gaps.push( `prompt ${ which } button: ${ a.note }` );
		}
		// The forms the buttons lead to: each sign-in draft file, read as written.
		for ( const file of files ) {
			const at = path.join( ctx.handoffDir || '', file );
			if ( ! fs.existsSync( at ) ) {
				gaps.push( `sign-in forms: ${ file } is not in the handoff folder` );
				continue;
			}
			const root = templateTree( parseTemplate( fs.readFileSync( at, 'utf8' ) ) );
			const f = formWords( root, parts.tokens );
			const t = tabWords( root, f.forms );
			found.push( ...[ ...f.found, ...t.found ].map( ( x ) => ( { ...x, group: 'form', at: `${ file } ${ x.at }` } ) ) );
			gaps.push( ...[ ...f.gaps, ...t.gaps ].map( ( g ) => `${ file }: ${ g }` ) );
		}
	}
	if ( ctx.draftSource ) {
		const s = signedInWords( templateTree( parseTemplate( ctx.draftSource ) ), parts.tokens );
		found.push( ...s.found.map( ( x ) => ( { ...x, group: 'signedIn' } ) ) );
		gaps.push( ...s.gaps );
	}
	// The writes, in the map's order of parts; a part read twice (two sign-in files) keeps its first reading.
	const node = homes[ 0 ].node;
	node.attributes = node.attributes || {};
	const written = [];
	for ( const { group, part, setting, value: fixed } of settingsOf( parts ) ) {
		const hit = found.find( ( x ) => x.group === group && x.part === part );
		if ( ! hit ) {
			continue;
		}
		const value = undefined === fixed ? hit.value : fixed;
		const sub = STRINGS.exec( setting );
		const held = sub ? node.attributes.strings?.[ sub[ 1 ] ] : node.attributes[ setting ];
		if ( undefined !== held && JSON.stringify( held ) !== JSON.stringify( value ) ) {
			gaps.push( `${ setting } already holds ${ JSON.stringify( held ) }; the draft's ${ group } ${ part } is ${ JSON.stringify( value ) } (${ hit.at })` );
			continue;
		}
		if ( sub ) {
			node.attributes.strings = { ...( node.attributes.strings || {} ), [ sub[ 1 ] ]: value };
		} else {
			node.attributes[ setting ] = value;
		}
		written.push( setting );
	}
	return { tree, placed: [ { id: piece.id, block: parts.block, at: `the account region ${ region } (${ 'form' === mode ? 'the sign-in form on the page' : 'the signed-out prompt' })`, settings: written } ], notes: gaps.map( ( g ) => `${ key }: piece "${ piece.id }": gap: ${ g }` ) };
}
