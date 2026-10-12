/* eslint-disable no-undef */
/**
 * The in-page recorder. Playwright serialises installRecorder with fn.toString() and runs it inside the editor
 * canvas iframe, so it must stay self-contained: it refers to nothing outside its own body.
 */

/** Recorder installed in the canvas iframe. Runs in the page. */
export function installRecorder( pump ) {
	const rec = { lat: [], latT: [], idle: [], slowEvents: [], longTasks: 0, keys: 0 };
	let lastT0 = 0;
	// Frame pump: an empty requestAnimationFrame loop keeps Chrome producing frames at the display rate for the whole
	// run. Without it Chrome produces frames on demand and the wake-up path varied from boot to boot (median
	// keystroke latency 11.3 to 16.5 ms across identical runs, spread 54% with the CPU probe flat at 33-35 ms);
	// with it five runs agreed within 5%. Cadence is recorded (frameIntervalMs) so a baseline taken at one refresh
	// rate is not compared with a run at another.
	rec.raf = [];
	if ( pump ) {
		let lastRaf = 0;
		const loop = ( t ) => { if ( lastRaf ) rec.raf.push( t - lastRaf ); lastRaf = t; requestAnimationFrame( loop ); };
		requestAnimationFrame( loop );
	}
	window.__typingRec = rec;
	document.addEventListener( 'keydown', ( e ) => {
		if ( ! e.isTrusted ) return;
		rec.keys++;
		const t0 = e.timeStamp;
		lastT0 = t0;
		requestAnimationFrame( () => {
			const ch = new MessageChannel();
			ch.port1.onmessage = () => { rec.lat.push( performance.now() - t0 ); rec.latT.push( t0 ); ch.port1.close(); };
			ch.port2.postMessage( 0 );
		} );
	}, true );
	// Main-thread turnaround: keydown to the first task after the input event has been fully dispatched (every
	// handler plus the synchronous React render ran). Unlike the paint figure it does not wait for the next vsync.
	document.addEventListener( 'input', ( e ) => {
		if ( ! e.isTrusted ) return;
		const t0 = lastT0;
		const ch = new MessageChannel();
		ch.port1.onmessage = () => { rec.idle.push( performance.now() - t0 ); ch.port1.close(); };
		ch.port2.postMessage( 0 );
	}, true );
	try {
		new PerformanceObserver( ( list ) => {
			for ( const en of list.getEntries() ) if ( 'keydown' === en.name || 'input' === en.name || 'keypress' === en.name ) rec.slowEvents.push( en.duration );
		} ).observe( { type: 'event', durationThreshold: 16, buffered: true } );
		new PerformanceObserver( ( list ) => { rec.longTasks += list.getEntries().length; } ).observe( { type: 'longtask', buffered: true } );
	} catch ( e ) { /* Event Timing or Long Tasks unavailable: the headline latency does not depend on them */ }
}
