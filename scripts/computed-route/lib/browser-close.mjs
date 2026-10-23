// Closing a Chromium browser without waiting on a page that cannot answer. A graceful close waits on every page's main
// thread (Playwright's own bound is 30 s), so a page stuck in a busy script held close() until the script ended, and the
// busier the machine the longer it took. The route's browsers read their process id while they answer and end the process
// when the graceful close has not finished within CLOSE_GRACE_MS.
export const CLOSE_GRACE_MS = 3000;

// The browser process id, read over the browser's own DevTools session; null when it cannot be read.
export const browserPidOf = ( browser ) => browser.newBrowserCDPSession()
	.then( ( cdp ) => cdp.send( 'SystemInfo.getProcessInfo' ) )
	.then( ( r ) => r.processInfo.find( ( p ) => 'browser' === p.type )?.id ?? null )
	.catch( () => null );

// `close` is the graceful close; when it has not finished within `graceMs`, `kill` ends the browser process and the close
// is awaited again, itself bounded by `graceMs`. Returns whether the browser had to be killed.
export async function closeBounded( { close, kill, graceMs = CLOSE_GRACE_MS } ) {
	const after = ( ms, value ) => new Promise( ( resolve ) => setTimeout( () => resolve( value ), ms ).unref() );
	const closing = Promise.resolve().then( close ).catch( () => {} );
	const hung = await Promise.race( [ closing.then( () => false ), after( graceMs, true ) ] );
	if ( hung ) {
		try {
			kill();
		} catch {
			// The process is already gone.
		}
		await Promise.race( [ closing, after( graceMs ) ] );
	}
	return hung;
}

// Closes a browser whose process id was read with browserPidOf.
export const closeBrowser = ( browser, pid ) => closeBounded( { close: () => browser.close(), kill: () => pid && process.kill( pid, 'SIGKILL' ) } );
