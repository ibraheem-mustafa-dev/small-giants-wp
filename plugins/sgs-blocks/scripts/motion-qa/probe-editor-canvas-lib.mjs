/**
 * Helpers for probe-editor-canvas.mjs (Spec 38A unit M3.7): the site's credentials, the verdict reporter, the in-page
 * readers (each is serialised into the page, so it uses nothing from this module) and the editor-driving steps.
 *
 * @package SGS\Blocks
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

/** Read `.claude/secrets/<site>.env` (from the main checkout when run in a worktree) into { url, user, pass }. */
export function loadSite( siteKey ) {
	let file = path.resolve( `.claude/secrets/${ siteKey }.env` );
	if ( ! fs.existsSync( file ) ) {
		const common = execFileSync( 'git', [ 'rev-parse', '--path-format=absolute', '--git-common-dir' ], { encoding: 'utf8' } ).trim();
		file = path.join( path.dirname( common ), '.claude', 'secrets', `${ siteKey }.env` );
	}
	const env = Object.fromEntries(
		fs.readFileSync( file, 'utf8' )
			.split( /\r?\n/ )
			.filter( ( l ) => l && ! l.startsWith( '#' ) && l.includes( '=' ) )
			.map( ( l ) => [ l.slice( 0, l.indexOf( '=' ) ).trim(), l.slice( l.indexOf( '=' ) + 1 ).trim().replace( /^['"]|['"]$/g, '' ) ] )
	);
	const key = siteKey.toUpperCase().replace( /-/g, '_' );
	const site = { url: ( env[ `WP_URL_${ key }` ] || '' ).replace( /\/$/, '' ), user: env[ `WP_USER_${ key }` ], pass: env[ `WP_PWD_${ key }` ] };
	if ( ! site.url || ! site.user || ! site.pass ) {
		throw new Error( `Missing WP_URL_${ key }, WP_USER_${ key } or WP_PWD_${ key } in ${ file }` );
	}
	return site;
}

/**
 * The reporter: `verdict` for a check, `control` for its negative control (which must be red), `unanswered` for a check
 * that could not be measured (never a pass), `attempt` to run a step so a throw becomes an UNANSWERED row, `note` for
 * information. `exitCode()` is 1 on any failure, 2 when only unanswered rows remain, else 0.
 */
export function makeReporter() {
	const failures = [];
	const unansweredRows = [];
	const out = {
		failures,
		unansweredRows,
		verdict( ok, label, detail ) {
			console.log( `${ ok ? 'PASS' : 'FAIL' }  ${ label }  ${ JSON.stringify( detail ) }` );
			if ( ! ok ) failures.push( label );
		},
		control( red, label, detail ) {
			console.log( `${ red ? 'CONTROL_RED' : 'CONTROL_PASSED' }  ${ label }  ${ JSON.stringify( detail ) }` );
			if ( ! red ) failures.push( `${ label } (control stayed green)` );
		},
		unanswered( label, why, detail = {} ) {
			console.log( `UNANSWERED  ${ label }  ${ JSON.stringify( { why, ...detail } ) }` );
			unansweredRows.push( label );
		},
		note( label, detail ) {
			console.log( `NOTE  ${ label }  ${ JSON.stringify( detail ) }` );
		},
		async attempt( label, step ) {
			try {
				return await step();
			} catch ( error ) {
				out.unanswered( label, String( error.message || error ).trim().slice( 0, 240 ) );
				return undefined;
			}
		},
		exitCode() {
			if ( failures.length ) return 1;
			return unansweredRows.length ? 2 : 0;
		},
	};
	return out;
}

/**
 * In page: what the document's stylesheets hold, read from the rules (a host optimiser can combine and rename sheets, so
 * link names prove nothing). `selectorText` is tested first and the walk recurses only into a non-empty `cssRules`;
 * `rulesSeen` and `unreadable` let a silent zero be told from a real one.
 */
export function readSheetFacts() {
	const facts = { sheets: 0, unreadable: 0, rulesSeen: 0, finalStateRule: false, motionRules: false, thumbRules: false };
	const walk = ( rules ) => {
		for ( const r of rules ) {
			facts.rulesSeen++;
			if ( typeof r.selectorText === 'string' ) {
				if ( r.selectorText === '[data-sgs-me]:not([data-sgs-in])' && r.style.getPropertyPriority( '--sgs-me-from-op' ) === 'important' ) facts.finalStateRule = true;
				if ( r.selectorText.includes( 'data-sgs-me' ) ) facts.motionRules = true;
				if ( r.selectorText.includes( 'sgs-motion-thumb' ) ) facts.thumbRules = true;
			}
			if ( r.cssRules && r.cssRules.length ) walk( r.cssRules );
		}
	};
	for ( const sheet of document.styleSheets ) {
		facts.sheets++;
		try {
			walk( sheet.cssRules );
		} catch ( e ) {
			facts.unreadable++;
		}
	}
	return facts;
}

/** In page: the page's blocks, flattened, with what the probe needs to find each block's motion targets. */
export function readPlan() {
	const flat = [];
	const walk = ( blocks ) => blocks.forEach( ( b ) => {
		flat.push( b );
		walk( b.innerBlocks );
	} );
	walk( window.wp.data.select( 'core/block-editor' ).getBlocks() );
	const supports = ( name ) => Boolean( window.wp.blocks.getBlockType( name )?.supports?.sgs?.motion );
	const entranceParts = ( motion ) => Object.entries( motion?.elements || {} ).filter( ( [ , v ] ) => v?.entrance ).map( ( [ part ] ) => part );
	const selectorFor = ( name, part ) => {
		const slug = name.slice( name.indexOf( '/' ) + 1 );
		const element = window.wp.blocks.getBlockType( name )?.supports?.sgs?.elements?.[ part ] || {};
		return part === 'root' || element.isWrapper ? 'ROOT' : element.selector || `.sgs-${ slug }__${ part }`;
	};
	const scrollParts = ( b ) => entranceParts( b.attributes.sgsMotion ).filter( ( part ) => b.attributes.sgsMotion.elements[ part ].entrance?.base?.trigger === 'scroll' );
	const describe = ( b, parts ) => ( { id: b.clientId, name: b.name, selectors: parts.map( ( part ) => selectorFor( b.name, part ) ) } );
	const hover = flat.find( ( b ) => supports( b.name ) && JSON.stringify( b.attributes.sgsMotion || {} ).includes( '"hover"' ) );
	const structural = [ 'core/template-part', 'core/post-content', 'core/group', 'core/column', 'core/columns' ];
	const plain = flat.find( ( b ) => window.wp.blocks.getBlockType( b.name ) && ! supports( b.name ) && ! structural.includes( b.name ) );
	return {
		total: flat.length,
		scrollBlocks: flat.filter( ( b ) => scrollParts( b ).length ).map( ( b ) => describe( b, scrollParts( b ) ) ),
		rootEntrance: flat.find( ( b ) => b.attributes.sgsMotion?.elements?.root?.entrance )?.clientId,
		motionBlock: ( hover || flat.find( ( b ) => supports( b.name ) ) )?.clientId,
		plain: plain ? { id: plain.clientId, name: plain.name } : null,
	};
}

/**
 * In canvas: the final-state reading of one block. It counts the block's motion targets (root and the entrance parts), any
 * element carrying data-sgs-me, and its text and image nodes, and leaves out aria-hidden nodes, `.sgs-motion-layer`
 * nodes and elements an fx effect owns (`[data-sgs-fx]`).
 */
export function readBlockState( [ clientId, selectors ] ) {
	const el = document.getElementById( `block-${ clientId }` );
	if ( ! el ) return { id: clientId, found: false };
	el.scrollIntoView( { block: 'center' } );
	const targets = selectors.flatMap( ( s ) => ( s === 'ROOT' ? [ el ] : [ ...el.querySelectorAll( s ) ] ) );
	const nodes = [ ...new Set( [ ...targets, ...el.querySelectorAll( '[data-sgs-me], p, h1, h2, h3, h4, h5, h6, li, a, span, img' ) ] ) ].filter( ( n ) => ! n.closest( '[aria-hidden="true"], .sgs-motion-layer, [data-sgs-fx]' ) );
	const bad = nodes.filter( ( n ) => getComputedStyle( n ).opacity !== '1' ).length;
	return { id: clientId, found: true, counted: nodes.length, notOne: bad, targets: targets.length };
}

/**
 * In canvas: scroll a block to the centre, wait until its box stops moving, then sample an 9 x 9 grid over the part of it
 * inside the viewport (a point test says nothing about a block that covers a small share, and `elementFromPoint` is null
 * outside the viewport). Resolves { found, inView, size, insidePct, blockers, point } where `point` is a sampled point
 * that hits the block, the one nearest its visible centre.
 */
export async function locateClick( [ clientId ] ) {
	const el = document.getElementById( `block-${ clientId }` );
	if ( ! el ) return { found: false };
	el.scrollIntoView( { block: 'center' } );
	let last = '';
	for ( let i = 0; i < 20; i++ ) {
		await new Promise( ( resolve ) => setTimeout( resolve, 100 ) );
		const b = el.getBoundingClientRect();
		const key = [ b.top, b.left, b.width, b.height ].join();
		if ( key === last ) break;
		last = key;
	}
	const r = el.getBoundingClientRect();
	const out = { found: true, size: [ Math.round( r.width ), Math.round( r.height ) ], viewport: [ innerWidth, innerHeight ] };
	const x0 = Math.max( r.left, 0 );
	const x1 = Math.min( r.right, innerWidth );
	const y0 = Math.max( r.top, 0 );
	const y1 = Math.min( r.bottom, innerHeight );
	out.inView = r.width > 0 && r.height > 0 && x1 > x0 && y1 > y0;
	if ( ! out.inView ) return out;
	let inside = 0;
	let best = null;
	const blockers = {};
	for ( let i = 1; i <= 9; i++ ) {
		for ( let j = 1; j <= 9; j++ ) {
			const x = x0 + ( ( x1 - x0 ) * i ) / 10;
			const y = y0 + ( ( y1 - y0 ) * j ) / 10;
			const hit = document.elementFromPoint( x, y );
			if ( hit && el.contains( hit ) ) {
				inside++;
				const d = Math.hypot( x - ( x0 + x1 ) / 2, y - ( y0 + y1 ) / 2 );
				if ( ! best || d < best.d ) best = { x, y, d };
			} else {
				const name = hit ? `${ hit.tagName.toLowerCase() }.${ String( hit.className ).slice( 0, 50 ) }` : 'null';
				blockers[ name ] = ( blockers[ name ] || 0 ) + 1;
			}
		}
	}
	out.insidePct = Math.round( ( inside / 81 ) * 100 );
	out.blockers = blockers;
	out.point = best ? { x: best.x, y: best.y } : null;
	return out;
}

/** In page: the accessible names of a motion panel's radios and buttons, to say what the panel really holds. */
export function describePanel( panel ) {
	const root = document.querySelector( `.sgs-motion-panel--${ panel }` );
	if ( ! root ) return { mounted: false };
	const names = ( selector ) => [ ...root.querySelectorAll( selector ) ].map( ( n ) => ( n.getAttribute( 'aria-label' ) || n.textContent || '' ).trim().slice( 0, 40 ) );
	return {
		mounted: true,
		opened: root.classList.contains( 'is-opened' ),
		radiogroups: root.querySelectorAll( '.sgs-motion-thumbs[role="radiogroup"]' ).length,
		radios: names( '[role="radio"]' ),
		thumbButtons: names( '.sgs-motion-thumbs__item' ),
		pressedButtons: root.querySelectorAll( '.sgs-motion-thumbs [aria-pressed]' ).length,
		thumbs: root.querySelectorAll( '.sgs-motion-thumb' ).length,
	};
}

/** In page: running animations among the non-still thumbnails of a panel. */
export function readThumbs( panel ) {
	const boxes = [ ...document.querySelectorAll( `.sgs-motion-panel--${ panel } .sgs-motion-thumb:not(.sgs-motion-thumb--still) .sgs-motion-thumb__box` ) ];
	const running = ( b ) => b.getAnimations().some( ( a ) => a.playState === 'running' );
	return {
		count: boxes.length,
		running: boxes.filter( running ).length,
		checkedRunning: boxes.filter( ( b ) => b.closest( '[aria-checked="true"]' ) && running( b ) ).length,
		checked: boxes.filter( ( b ) => b.closest( '[aria-checked="true"]' ) ).length,
		inlineStyles: document.querySelectorAll( '.sgs-motion-thumb[style], .sgs-motion-thumb__box[style]' ).length,
		radios: document.querySelectorAll( `.sgs-motion-panel--${ panel } .sgs-motion-thumbs[role="radiogroup"] [role="radio"]` ).length,
	};
}

/** Select a block, open the block sidebar and its Styles tab. Resolves false when the block has no Styles tab. */
export async function openStyles( page, clientId ) {
	await page.evaluate( ( id ) => {
		const { dispatch } = window.wp.data;
		dispatch( 'core/block-editor' ).selectBlock( id );
		( dispatch( 'core/edit-post' )?.openGeneralSidebar || dispatch( 'core/editor' ).openGeneralSidebar )( 'edit-post/block' );
	}, clientId );
	const tab = page.getByRole( 'tab', { name: 'Styles' } ).first();
	try {
		await tab.waitFor( { timeout: 8000 } );
	} catch ( e ) {
		return false;
	}
	await tab.click();
	await page.waitForTimeout( 800 );
	return true;
}

/** Open a motion panel's body if it is closed. */
export async function openPanel( page, name ) {
	const body = page.locator( `.sgs-motion-panel--${ name }` ).first();
	if ( ( await body.count() ) && ! ( await body.getAttribute( 'class' ) ).includes( 'is-opened' ) ) {
		await body.locator( '.components-panel__body-title button' ).first().click();
		await page.waitForTimeout( 400 );
	}
}

/**
 * In canvas: record the first block element that carries data-sgs-me (the Replay target) every frame for `ms`, as
 * { me, in, opacity, translate }. Resolves with the samples.
 */
export function sampleReplay( [ clientId, ms ] ) {
	const root = document.getElementById( `block-${ clientId }` );
	const samples = [];
	const started = performance.now();
	return new Promise( ( resolve ) => {
		const tick = () => {
			const target = root.matches( '[data-sgs-me]' ) ? root : root.querySelector( '[data-sgs-me]' );
			const cs = getComputedStyle( target || root );
			samples.push( { me: Boolean( target ), in: Boolean( root.querySelector( '[data-sgs-in]' ) || root.matches( '[data-sgs-in]' ) ), opacity: Number( cs.opacity ), translate: cs.translate } );
			if ( performance.now() - started < ms ) requestAnimationFrame( tick );
			else resolve( samples );
		};
		requestAnimationFrame( tick );
	} );
}

/** Judge Replay samples: it moved (opacity or translate took three or more values while the target was stamped) and then rested clean. */
export function judgeReplay( samples ) {
	const stamped = samples.filter( ( s ) => s.me );
	const values = new Set( stamped.map( ( s ) => `${ s.opacity }|${ s.translate }` ) );
	const last = samples[ samples.length - 1 ];
	return { stamped: stamped.length, distinct: values.size, moved: values.size >= 3, restedClean: ! last.me && ! last.in && last.opacity === 1, last };
}
