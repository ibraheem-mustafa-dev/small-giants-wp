// Read-only trial: render a card's settings A (current) and B (Solve's write) through the
// block renderer, inject the CSS difference into a throwaway live page, measure, remove.
import fs from 'fs';
import { pathToFileURL } from 'url';
const { chromium } = await import( pathToFileURL( 'C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/node_modules/playwright/index.mjs' ).href );
const REPO = 'C:/Users/Bean/Projects/small-giants-wp';
const env = Object.fromEntries( fs.readFileSync( REPO + '/.claude/secrets/local-eye-care.env', 'utf8' ).split( /\r?\n/ ).filter( ( l ) => /^[A-Z_]+=/.test( l ) ).map( ( l ) => [ l.slice( 0, l.indexOf( '=' ) ), l.slice( l.indexOf( '=' ) + 1 ).trim().replace( /^["']|["']$/g, '' ) ] ) );
const base = env.WP_URL_LOCALEYECARE.replace( /\/+$/, '' );
const REFS = [ 'cr-ref-home-31', 'cr-ref-home-35', 'cr-ref-home-39', 'cr-ref-home-43' ];
const TRIAL = process.argv[ 2 ] === 'forward43' ? [ 'cr-ref-home-43' ] : [ 'cr-ref-home-31', 'cr-ref-home-35', 'cr-ref-home-39' ];
const WIDTHS = [ 375, 768, 1440 ];
const runDir = REPO + '/sites/eye-care-ward-end/build/qa/solve/home/2026-10-09T09-03-14';
const report = JSON.parse( fs.readFileSync( runDir + '/solve-report.json', 'utf8' ) );
const tree = JSON.parse( fs.readFileSync( REPO + '/sites/eye-care-ward-end/build/home.tree.json', 'utf8' ) );

// Solve's final padding write per card (last write on attr "padding").
const solveWrite = {};
for ( const w of report.writes ) if ( w.attr === 'padding' && [ 'cr-ref-home-31', 'cr-ref-home-35', 'cr-ref-home-39' ].includes( w.ref ) ) solveWrite[ w.ref ] = w.after;
// forward43: Solve's exact write on -31 applied to its untouched twin -43.
solveWrite[ 'cr-ref-home-43' ] = solveWrite[ 'cr-ref-home-31' ];
// Real-rebuild measurements: child widths after the write (openAfter / classes.unresolved width rows).
const realRows = {};
for ( const r of report.classes.unresolved.concat( report.classes.derived || [] ) ) {
	if ( r.key !== 'width' || r.state !== 'opening' ) continue;
	for ( const o of r.owners || [] ) if ( TRIAL.includes( o.ref ) && o.path.startsWith( '.sgs-container__inner' ) ) ( realRows[ `${ o.ref }|${ r.ref }|${ r.width }` ] = { draft: r.draft, live: r.live } );
}
const treeAttrs = {};
( function walk( n ) { if ( ! n || typeof n !== 'object' ) return; const a = n.attributes; if ( a && REFS.includes( a.className ) ) treeAttrs[ a.className ] = a; for ( const v of Object.values( n ) ) if ( typeof v === 'object' ) walk( v ); } )( tree );

const b = await chromium.launch();
const ctx = await b.newContext();
const adm = await ctx.newPage();
await adm.goto( base + '/wp-login.php' );
await adm.fill( '#user_login', env.WP_USER_LOCALEYECARE ); await adm.fill( '#user_pass', env.WP_PWD_LOCALEYECARE );
await Promise.all( [ adm.waitForNavigation(), adm.click( '#wp-submit' ) ] );
await adm.goto( base + '/wp-admin/profile.php', { waitUntil: 'domcontentloaded' } );
await adm.waitForFunction( () => window.wpApiSettings?.nonce || window.wp?.apiFetch?.nonceMiddleware?.nonce, null, { timeout: 60000 } );
const nonce = await adm.evaluate( () => window.wpApiSettings?.nonce || window.wp.apiFetch.nonceMiddleware.nonce );
const api = ( p, init ) => adm.evaluate( async ( [ u, n, init ] ) => { const r = await fetch( u, { ...( init || {} ), headers: { 'X-WP-Nonce': n, 'Content-Type': 'application/json' } } ); return { status: r.status, body: await r.text() }; }, [ base + p, nonce, init ] );

// Front page id, then saved attributes (read-only GET).
const front = await api( '/wp-json/wp/v2/settings' );
const pageId = JSON.parse( front.body ).page_on_front;
const pg = JSON.parse( ( await api( `/wp-json/wp/v2/pages/${ pageId }?context=edit&_fields=id,modified,content` ) ).body );
const raw = pg.content.raw;
const saved = {};
for ( const m of raw.matchAll( /<!-- wp:sgs\/container (\{[\s\S]*?\}) \/?-->/g ) ) { try { const a = JSON.parse( m[ 1 ] ); if ( REFS.includes( a.className ) ) saved[ a.className ] = { attrs: a, json: m[ 1 ] }; } catch {} }
const out = { pageId, modified: pg.modified, treeMatch: {}, cards: {} };
const canon = ( o ) => JSON.stringify( o, Object.keys( JSON.parse( JSON.stringify( o ) ) ).sort() );
const deepSort = ( o ) => Array.isArray( o ) ? o.map( deepSort ) : o && typeof o === 'object' ? Object.fromEntries( Object.keys( o ).sort().map( ( k ) => [ k, deepSort( o[ k ] ) ] ) ) : o;
for ( const r of REFS ) out.treeMatch[ r ] = saved[ r ] ? JSON.stringify( deepSort( saved[ r ].attrs ) ) === JSON.stringify( deepSort( treeAttrs[ r ] ) ) : 'missing';
console.log( 'page', pageId, 'modified', pg.modified, 'tree==saved', JSON.stringify( out.treeMatch ) );
for ( const r of REFS ) if ( out.treeMatch[ r ] !== true ) console.log( '  DIFF', r, 'saved', JSON.stringify( saved[ r ]?.attrs ), '\n       tree ', JSON.stringify( treeAttrs[ r ] ) );

const render = async ( attrs ) => {
	const r = await api( '/wp-json/wp/v2/block-renderer/sgs/container?context=edit', { method: 'POST', body: JSON.stringify( { attributes: attrs } ) } );
	let html = r.body; try { html = JSON.parse( r.body ).rendered ?? r.body; } catch {}
	return { status: r.status, html };
};

// Live page (throwaway; nothing persists).
const live = await ctx.newPage( { viewport: { width: 375, height: 900 } } );
await live.setViewportSize( { width: 375, height: 900 } );
await live.goto( base + '/', { waitUntil: 'networkidle' } );
await live.addStyleTag( { content: '*,*::before,*::after{transition:none!important;animation:none!important}' } );

// Rules (any nesting) whose selector mentions a token, as normalised cssText.
const rulesFor = ( token ) => live.evaluate( ( token ) => { const out = []; const walk = ( list, wrap ) => { for ( const r of list ) { if ( r.cssRules && ! r.selectorText ) walk( r.cssRules, wrap.concat( r.cssText.slice( 0, r.cssText.indexOf( '{' ) ).trim() ) ); else if ( r.selectorText && r.selectorText.includes( token ) ) out.push( wrap.join( ' >> ' ) + ' :: ' + r.cssText ); } }; for ( const s of document.styleSheets ) { try { walk( s.cssRules, [] ); } catch {} } return out; }, token );
// Parse a CSS string in the page's CSS engine for an apples-to-apples cssText.
const parseCss = ( text ) => live.evaluate( ( text ) => { const s = new CSSStyleSheet(); s.replaceSync( text ); const out = []; const walk = ( list, wrap ) => { for ( const r of list ) { if ( r.cssRules && ! r.selectorText ) walk( r.cssRules, wrap.concat( r.cssText.slice( 0, r.cssText.indexOf( '{' ) ).trim() ) ); else out.push( wrap.join( ' >> ' ) + ' :: ' + r.cssText ); } }; walk( s.cssRules, [] ); return out; }, text );
const styleOf = ( html ) => [ ...html.matchAll( /<style\b[^>]*>([\s\S]*?)<\/style>/g ) ].map( ( m ) => m[ 1 ] ).join( '\n' );
const classTree = ( html ) => [ ...html.matchAll( /<([a-z0-9]+)\b[^>]*?class="([^"]*)"/g ) ].map( ( m ) => m[ 1 ] + ':' + m[ 2 ] );
const uidsIn = ( cls ) => cls.split( /\s+/ ).filter( ( c ) => /^sgs-(container|cst)-[0-9a-f]{8}$/.test( c ) );

const measure = ( refs ) => live.evaluate( ( refs ) => Object.fromEntries( refs.map( ( r ) => { const el = document.querySelector( '.' + r ); const inner = el.querySelector( ':scope > .sgs-container__inner' ) || el; const ci = getComputedStyle( inner ); const kids = [ ...inner.children ].map( ( k ) => ( k.className.match( /cr-ref-home-\d+/ ) || [ k.tagName ] )[ 0 ] + '=' + getComputedStyle( k ).width ); return [ r, { innerContent: ( inner.clientWidth - parseFloat( ci.paddingLeft ) - parseFloat( ci.paddingRight ) ), outerPad: getComputedStyle( el ).paddingLeft, innerPad: ci.paddingLeft, kids } ]; } ) ), refs );

for ( const ref of TRIAL ) {
	const t0 = Date.now();
	const A = saved[ ref ].attrs;
	const MODE = process.argv[ 2 ] || 'forward';
	const B = MODE === 'reverse' ? Object.fromEntries( Object.entries( A ).filter( ( [ k ] ) => k !== 'padding' ) ) : { ...A, padding: solveWrite[ ref ] };
	const [ rA, rB ] = [ await render( A ), await render( B ) ];
	const tRender = Date.now() - t0;
	const liveCls = await live.evaluate( ( r ) => document.querySelector( '.' + r ).className, ref );
	const liveUids = uidsIn( liveCls );
	const aRoot = classTree( rA.html )[ 0 ] || ''; const bRoot = classTree( rB.html )[ 0 ] || '';
	const aUids = uidsIn( aRoot.split( ':' )[ 1 ] || '' ); const bUids = uidsIn( bRoot.split( ':' )[ 1 ] || '' );
	// Self-check: uid classes and the CSS the live page holds for those uids.
	const uidMatch = JSON.stringify( [ ...aUids ].sort() ) === JSON.stringify( [ ...liveUids ].sort() );
	const aCss = await parseCss( styleOf( rA.html ) );
	let liveRules = []; for ( const u of liveUids ) liveRules = liveRules.concat( await rulesFor( u ) );
	const aRules = aCss.filter( ( t ) => liveUids.some( ( u ) => t.includes( u ) ) || aUids.some( ( u ) => t.includes( u ) ) );
	const setL = new Set( liveRules ), setA = new Set( aRules );
	const cssMissingLive = aRules.filter( ( t ) => ! setL.has( t ) ), cssExtraLive = liveRules.filter( ( t ) => ! setA.has( t ) );
	// Diff B vs A after mapping B's uids onto A's.
	let bText = styleOf( rB.html ); bUids.forEach( ( u, i ) => { const tgt = aUids.find( ( x ) => x.split( '-' )[ 1 ] === u.split( '-' )[ 1 ] ); if ( tgt ) bText = bText.split( u ).join( tgt ); } );
	const bCss = await parseCss( bText );
	const setB = new Set( bCss ), setAall = new Set( aCss );
	const added = bCss.filter( ( t ) => ! setAall.has( t ) ), removed = aCss.filter( ( t ) => ! setB.has( t ) );
	const ctA = classTree( rA.html ), ctB = classTree( rB.html ).map( ( c ) => { let x = c; bUids.forEach( ( u ) => { const tgt = aUids.find( ( y ) => y.split( '-' )[ 1 ] === u.split( '-' )[ 1 ] ); if ( tgt ) x = x.split( u ).join( tgt ); } ); return x; } );
	const classDiff = ctB.map( ( c, i ) => c !== ctA[ i ] ? { i, a: ctA[ i ], b: c } : null ).filter( Boolean );
	out.cards[ ref ] = { status: [ rA.status, rB.status ], liveUids, aUids, bUids, uidMatch, liveRuleCount: liveRules.length, aRuleCount: aRules.length, cssMissingLive, cssExtraLive, added, removed, classDiff, solveWrite: solveWrite[ ref ], tRender };
	console.log( `\n${ ref } render A/B ${ rA.status }/${ rB.status } in ${ tRender }ms; live uids ${ liveUids } | A uids ${ aUids } | B uids ${ bUids } | uidMatch ${ uidMatch }` );
	console.log( `  self-check CSS: live rules ${ liveRules.length }, A rules ${ aRules.length }, A-not-live ${ cssMissingLive.length }, live-not-A ${ cssExtraLive.length }` );
	for ( const x of cssMissingLive.slice( 0, 4 ) ) console.log( '    A-not-live', x.slice( 0, 260 ) );
	for ( const x of cssExtraLive.slice( 0, 4 ) ) console.log( '    live-not-A', x.slice( 0, 260 ) );
	console.log( `  diff B-A: +${ added.length } -${ removed.length } rules, class changes ${ classDiff.length }` );
	for ( const x of added ) console.log( '    +', x.slice( 0, 300 ) );
	for ( const x of removed ) console.log( '    -', x.slice( 0, 300 ) );
	for ( const x of classDiff ) console.log( '    class', JSON.stringify( x ) );
}

// Measure before, inject (all three cards together, as the real rebuild had them), measure, remove, measure.
const results = {};
const snap = async ( tag ) => { for ( const w of WIDTHS ) { await live.setViewportSize( { width: w, height: 900 } ); await live.waitForTimeout( 150 ); ( results[ w ] ??= {} )[ tag ] = await measure( REFS ); } };
await snap( 'before' );
const t1 = Date.now();
const liveToA = {};
const css = [], removedLive = [];
for ( const ref of TRIAL ) {
	const c = out.cards[ ref ];
	// B's uid already mapped onto A's; A's uid == live uid when the self-check passes, else map A -> live.
	let add = c.added.map( ( t ) => t.split( ' :: ' ) ).map( ( [ wrap, rule ] ) => wrap ? wrap.split( ' >> ' ).reduce( ( acc, w ) => `${ w }{${ acc }}`, rule ) : rule );
	if ( ! c.uidMatch ) c.aUids.forEach( ( u ) => { const tgt = c.liveUids.find( ( x ) => x.split( '-' )[ 1 ] === u.split( '-' )[ 1 ] ); if ( tgt ) add = add.map( ( s ) => s.split( u ).join( tgt ) ); } );
	css.push( ...add );
	removedLive.push( ...c.removed );
}
// Wrap order: reduce builds innermost-first; rebuild properly (outer at-rule wraps inner).
const cssText = out.cards && TRIAL.flatMap( ( ref ) => out.cards[ ref ].added.map( ( t ) => { const [ wrap, rule ] = t.split( ' :: ' ); let s = rule; if ( wrap ) for ( const w of wrap.split( ' >> ' ).reverse() ) s = `${ w }{${ s }}`; let o = s; const c = out.cards[ ref ]; if ( ! c.uidMatch ) c.aUids.forEach( ( u ) => { const tgt = c.liveUids.find( ( x ) => x.split( '-' )[ 1 ] === u.split( '-' )[ 1 ] ); if ( tgt ) o = o.split( u ).join( tgt ); } ); return o; } ) ).join( '\n' );
fs.writeFileSync( new URL( './injected.css', import.meta.url ), cssText );
const handle = cssText ? await live.addStyleTag( { content: cssText } ) : null;
const delKeys = TRIAL.flatMap( ( ref ) => out.cards[ ref ].removed );
const deleted = await live.evaluate( ( keys ) => { const want = new Set( keys ); const done = []; const walk = ( owner, list, wrap, path ) => { for ( let i = list.length - 1; i >= 0; i-- ) { const r = list[ i ]; if ( r.cssRules && ! r.selectorText ) walk( r, r.cssRules, wrap.concat( r.cssText.slice( 0, r.cssText.indexOf( '{' ) ).trim() ), path.concat( i ) ); else { const k = wrap.join( ' >> ' ) + ' :: ' + r.cssText; if ( want.has( k ) ) { done.push( { k, text: r.cssText, path: path.concat( i ) } ); owner.deleteRule( i ); } } } }; [ ...document.styleSheets ].forEach( ( s, si ) => { try { walk( s, s.cssRules, [], [ si ] ); } catch {} } ); window.__trialDeleted = done; return done.map( ( d ) => d.k ); }, delKeys );
console.log( 'deleted live rules', deleted.length, 'of', delKeys.length );
// Class-list changes on the live element (none expected unless classDiff shows one).
const classOps = TRIAL.flatMap( ( ref ) => out.cards[ ref ].classDiff.filter( ( d ) => d.i === 0 ).map( ( d ) => ( { ref, add: d.b.split( ':' )[ 1 ].split( /\s+/ ).filter( ( c ) => ! d.a.split( ':' )[ 1 ].split( /\s+/ ).includes( c ) ), rm: d.a.split( ':' )[ 1 ].split( /\s+/ ).filter( ( c ) => ! d.b.split( ':' )[ 1 ].split( /\s+/ ).includes( c ) ) } ) ) );
await live.evaluate( ( ops ) => { for ( const o of ops ) { const el = document.querySelector( '.' + o.ref ); el.classList.add( ...o.add ); el.classList.remove( ...o.rm ); } }, classOps );
const tInject = Date.now() - t1;
await snap( 'trial' );
if ( handle ) await handle.evaluate( ( n ) => n.remove() );
await live.evaluate( () => { for ( const d of [ ...window.__trialDeleted ].reverse() ) { let o = document.styleSheets[ d.path[ 0 ] ]; for ( const j of d.path.slice( 1, -1 ) ) o = o.cssRules[ j ]; o.insertRule( d.text, d.path[ d.path.length - 1 ] ); } } );
await live.evaluate( ( ops ) => { for ( const o of ops ) { const el = document.querySelector( '.' + o.ref ); el.classList.remove( ...o.add ); el.classList.add( ...o.rm ); } }, classOps );
await snap( 'reverted' );
out.removedRulesNotApplied = removedLive; out.classOps = classOps; out.tInject = tInject; out.results = results; out.realRows = realRows;
console.log( '\nclassOps', JSON.stringify( classOps ), 'removed rules (would need deleting)', removedLive.length, 'inject ms', tInject );
for ( const w of WIDTHS ) for ( const r of REFS ) { const x = results[ w ]; console.log( w, r, 'inner content', x.before[ r ].innerContent, '->', x.trial[ r ].innerContent, '->', x.reverted[ r ].innerContent, '| outerPad', x.before[ r ].outerPad, '->', x.trial[ r ].outerPad, '| kids', x.before[ r ].kids.join( ' ' ), '=>', x.trial[ r ].kids.join( ' ' ), '| reverted kids same', JSON.stringify( x.reverted[ r ].kids ) === JSON.stringify( x.before[ r ].kids ) ); }
console.log( 'realRows', JSON.stringify( realRows ) );
fs.writeFileSync( new URL( `./trial-out-${ process.argv[ 2 ] || 'forward' }.json`, import.meta.url ), JSON.stringify( out, null, 1 ) );
await b.close();
