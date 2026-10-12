/**
 * Browser work for the editor typing harness: opening the editor, one timed typing run, and the reads that prove
 * the page was not saved and which plugin version the live site was running.
 */
import crypto from 'node:crypto';
import { WINDOW_MS, TARGET_TEXT_INDEX } from './config.mjs';
import { median, percentile, r2 } from './stats.mjs';
import { installRecorder } from './recorder.mjs';

async function bootEditor( context, editorUrl, writeCounter ) {
	const page = await context.newPage();
	await page.route( /\/wp-json\/|[?&]rest_route=/, ( route ) => {
		const m = route.request().method();
		if ( 'GET' === m || 'HEAD' === m || 'OPTIONS' === m ) return route.continue();
		writeCounter.n++;
		return route.abort();
	} );
	await page.goto( editorUrl, { waitUntil: 'domcontentloaded', timeout: 120000 } );
	await page.waitForFunction( () => window.wp && window.wp.data && window.wp.blocks &&
		window.wp.data.select( 'core/editor' ) && window.wp.data.select( 'core/editor' ).getCurrentPostId() &&
		window.wp.data.select( 'core/block-editor' ).getGlobalBlockCount() > 0, { timeout: 120000 } );
	await page.evaluate( () => {
		// The welcome guide and the autosave interval would both interfere; neither changes the typing path.
		const prefs = window.wp.data.dispatch( 'core/preferences' );
		if ( prefs ) { prefs.set( 'core/edit-post', 'welcomeGuide', false ); prefs.set( 'core/edit-post', 'fullscreenMode', false ); }
	} );
	await page.waitForFunction( () => !! document.querySelector( 'iframe[name="editor-canvas"]' ), { timeout: 60000 } );
	const frame = page.frame( { name: 'editor-canvas' } );
	await frame.waitForFunction( () => document.querySelectorAll( '[data-type="sgs/text"]' ).length > 30, { timeout: 120000 } );
	await page.waitForTimeout( 3000 ); // let async-mode block rendering and the editor's own startup work settle
	return { page, frame };
}

/** One timed typing run on a fresh editor tab. Returns the run record and the registered sgs/ attribute names. */
export async function measureRun( context, editorUrl, opts, label ) {
	const writeCounter = { n: 0 };
	const { page, frame } = await bootEditor( context, editorUrl, writeCounter );
	try {
		const blockCount = await page.evaluate( () => window.wp.data.select( 'core/block-editor' ).getGlobalBlockCount() );
		const attrSignature = await page.evaluate( () => {
			const names = new Set();
			window.wp.blocks.getBlockTypes().filter( ( b ) => b.name.startsWith( 'sgs/' ) ).forEach( ( b ) => Object.keys( b.attributes || {} ).forEach( ( k ) => names.add( k ) ) );
			return [ ...names ].sort();
		} );
		const targetId = await page.evaluate( ( idx ) => {
			const flat = [];
			const walk = ( bs ) => bs.forEach( ( b ) => { flat.push( b ); walk( b.innerBlocks ); } );
			walk( window.wp.data.select( 'core/block-editor' ).getBlocks() );
			const se = window.wp.data.select( 'core/block-editor' );
			const texts = flat.filter( ( b ) => 'sgs/text' === b.name && 'sgs/container' === ( se.getBlockName( se.getBlockRootClientId( b.clientId ) ) ) );
			return texts[ idx ] ? texts[ idx ].clientId : null;
		}, TARGET_TEXT_INDEX );
		if ( ! targetId ) throw new Error( 'the fixture has fewer sgs/text blocks than the typing target needs' );

		const editable = frame.locator( `[data-block="${ targetId }"][contenteditable="true"]` ).first();
		await editable.scrollIntoViewIfNeeded();
		await editable.click();
		await page.keyboard.press( 'Control+End' );
		await frame.evaluate( installRecorder, ! opts.noPump );

		const cpuProbe = async () => page.evaluate( () => {
			const times = [];
			for ( let k = 0; k < 7; k++ ) {
				const t = performance.now();
				let acc = 0;
				for ( let i = 1; i < 6000000; i++ ) acc += Math.sqrt( i ) % 7;
				times.push( performance.now() - t );
				if ( acc < 0 ) return -1;
			}
			return Math.min( ...times );
		} );
		const cpuBefore = await cpuProbe();
		const cdp = await context.newCDPSession( page );
		await cdp.send( 'HeapProfiler.enable' );
		await cdp.send( 'HeapProfiler.collectGarbage' );
		const heapBefore = ( await cdp.send( 'Runtime.getHeapUsage' ) ).usedSize;

		// Typed text and key timing are deterministic (seeded). Each gap is the interval plus 0-16.7 ms of jitter, so
		// keystrokes land at every phase of the 60 Hz frame; a fixed interval would sit at one phase for a whole run and
		// shift the latency distribution from run to run for reasons that have nothing to do with the editor.
		const words = [ 'steady', 'planning', 'saves', 'time', 'clear', 'pages', 'help', 'visitors', 'find', 'answers', 'quickly', 'and', 'calmly' ];
		const text = words.join( ' ' ) + ' ';
		let seed = 0x9e3779b9;
		const rand = () => { seed = ( seed + 0x6d2b79f5 ) | 0; let t = Math.imul( seed ^ ( seed >>> 15 ), 1 | seed ); t = ( t + Math.imul( t ^ ( t >>> 7 ), 61 | t ) ) ^ t; return ( ( t ^ ( t >>> 14 ) ) >>> 0 ) / 4294967296; };
		const started = Date.now();
		let nextAt = started;
		for ( let i = 0; Date.now() - started < opts.duration * 1000; i++ ) {
			await page.keyboard.type( text[ i % text.length ] );
			nextAt += opts.interval + rand() * 16.7;
			const wait = nextAt - Date.now();
			if ( wait > 0 ) await new Promise( ( r ) => setTimeout( r, wait ) );
		}
		await page.waitForTimeout( 500 ); // let the last keystroke's paint report

		const rec = await frame.evaluate( () => window.__typingRec );
		const heapRaw = ( await cdp.send( 'Runtime.getHeapUsage' ) ).usedSize;
		await cdp.send( 'HeapProfiler.collectGarbage' );
		const heap = ( await cdp.send( 'Runtime.getHeapUsage' ) ).usedSize;
		await cdp.detach().catch( () => {} );
		const cpuAfter = await cpuProbe();

		if ( rec.lat.length < 20 ) throw new Error( `only ${ rec.lat.length } keystroke latencies recorded` );
		// Headline: the median of the p95s of consecutive 10-second windows. A bursty slowdown from outside the editor
		// (another process on a shared machine) lands in one or two windows and the median ignores them; a real
		// per-keystroke cost moves every window. The plain whole-run p95 is kept as p95WholeRunMs.
		const t00 = rec.latT[ 0 ];
		const windows = [];
		for ( let i = 0; i < rec.lat.length; i++ ) {
			const w = Math.floor( ( rec.latT[ i ] - t00 ) / WINDOW_MS );
			( windows[ w ] = windows[ w ] || [] ).push( rec.lat[ i ] );
		}
		const windowP95s = windows.filter( ( w ) => w && w.length >= 20 ).map( ( w ) => r2( percentile( w, 95 ) ) );
		const run = {
			label,
			p95Ms: r2( median( windowP95s ) ),
			p95WholeRunMs: r2( percentile( rec.lat, 95 ) ),
			windowP95sMs: windowP95s,
			medianMs: r2( median( rec.lat ) ),
			maxMs: r2( Math.max( ...rec.lat ) ),
			idleP95Ms: r2( percentile( rec.idle, 95 ) ),
			idleMedianMs: r2( median( rec.idle ) ),
			keystrokes: rec.lat.length,
			frameIntervalMs: rec.raf.length ? r2( median( rec.raf ) ) : null,
			cpuProbeBeforeMs: r2( cpuBefore ),
			cpuProbeAfterMs: r2( cpuAfter ),
			heapBytes: heap,
			heapRawBytes: heapRaw,
			heapBeforeBytes: heapBefore,
			slowEvents: rec.slowEvents.length,
			longTasks: rec.longTasks,
			blockCount,
			blockedWrites: writeCounter.n,
		};
		return { run, attrSignature };
	} finally {
		await page.close( { runBeforeUnload: false } ).catch( () => {} );
	}
}

/** SHA-256 of the page's stored content, read through the REST API as the logged-in editor. */
export async function fetchContentHash( context, env, pageId ) {
	const page = await context.newPage();
	try {
		await page.goto( `${ env.url }/wp-admin/post.php?post=${ pageId }&action=edit`, { waitUntil: 'domcontentloaded', timeout: 120000 } );
		await page.waitForFunction( () => window.wp && window.wp.apiFetch && window.wpApiSettings, { timeout: 120000 } );
		const raw = await page.evaluate( async ( id ) => ( await window.wp.apiFetch( { path: `/wp/v2/pages/${ id }?context=edit` } ) ).content.raw, pageId );
		return crypto.createHash( 'sha256' ).update( raw ).digest( 'hex' );
	} finally {
		await page.close( { runBeforeUnload: false } ).catch( () => {} );
	}
}

/**
 * The SGS Blocks version the live site is running. The plugin enqueues its editor stylesheet (handle
 * sgs-extensions-editor) with SGS_BLOCKS_VERSION as the ?ver= argument, so the editor page's head carries it.
 * The plugin header's Version line is not used: it can differ from the constant the code ships with.
 * Returns 'unknown' when the stylesheet link is not on the page.
 */
export async function fetchDeployedPluginVersion( context, env, pageId ) {
	const page = await context.newPage();
	try {
		await page.goto( `${ env.url }/wp-admin/post.php?post=${ pageId }&action=edit`, { waitUntil: 'domcontentloaded', timeout: 120000 } );
		await page.waitForFunction( () => window.wp && window.wp.apiFetch && window.wpApiSettings, { timeout: 120000 } );
		const ver = await page.evaluate( () => {
			const link = document.getElementById( 'sgs-extensions-editor-css' );
			return link ? new URL( link.href ).searchParams.get( 'ver' ) : null;
		} );
		return ver || 'unknown';
	} finally {
		await page.close( { runBeforeUnload: false } ).catch( () => {} );
	}
}
