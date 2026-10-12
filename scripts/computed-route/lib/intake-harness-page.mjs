// The in-page half of the determinism harness (Spec 48 FR-48-28). harnessInit is serialised into the page with
// page.addInitScript, so it is self-contained (no closure over module scope). It runs at document start, after
// Playwright's clock init script (context init scripts run before page init scripts), so the wrappers below wrap the
// FAKE setTimeout, setInterval and requestAnimationFrame. It installs window.__sgsHarness:
//   - Math.random seeded (mulberry32 from cfg.seed);
//   - localStorage and sessionStorage cleared, then filled from cfg.storage ({ local: {}, session: {} });
//   - every timeout tracked until it fires or is cleared (its due time in virtual ms);
//   - every interval's ticks counted; after cfg.intervalTicks ticks its callback is a no-op (it stays paused);
//   - requestAnimationFrame chains capped. The chain rule: a request made while a frame callback runs belongs to that
//     callback's chain; any other request starts a new chain. A chain's count is the number of its callbacks that have
//     run. Once a chain has run cfg.rafFrames callbacks, a further request from it is not scheduled: it gets an id that
//     never fires (so `if (this._raf) return` guards stay set, and the loop stays paused);
//   - every Web Animation the draft creates (Element.prototype.animate) and every CSS animation or transition seen at a
//     step kept in a registry, so sample mode can still reach one that has finished;
//   - stylesheet <link> load and error events recorded, so the font wait can tell a pending sheet from a failed one.
// cfg.disable (negative controls only) switches single items off: 'random', 'storage', 'intervals', 'raf'.
export function harnessInit( cfg ) {
	// Any clock call replays Playwright's clock log now, before the clock's own real-time timer could move it.
	performance.now();
	const off = new Set( cfg.disable || [] );
	const H = {
		errors: [], timeouts: new Map(), intervals: new Map(), rafs: new Map(), chains: new Map(), animations: new Set(),
		links: { loaded: new Set(), failed: new Set() },
	};
	window.__sgsHarness = H;
	if ( ! off.has( 'random' ) ) {
		let a = cfg.seed >>> 0;
		Math.random = function random() {
			a = ( a + 0x6D2B79F5 ) >>> 0;
			let t = a;
			t = Math.imul( t ^ ( t >>> 15 ), t | 1 );
			t ^= t + Math.imul( t ^ ( t >>> 7 ), t | 61 );
			return ( ( t ^ ( t >>> 14 ) ) >>> 0 ) / 4294967296;
		};
	}
	if ( ! off.has( 'storage' ) ) {
		try {
			for ( const [ name, entries ] of [ [ 'localStorage', cfg.storage?.local ], [ 'sessionStorage', cfg.storage?.session ] ] ) {
				window[ name ].clear();
				for ( const [ k, v ] of Object.entries( entries || {} ) ) {
					window[ name ].setItem( k, String( v ) );
				}
			}
		} catch ( e ) {
			H.errors.push( `storage could not be seeded: ${ e.message }` );
		}
	}
	const now = () => performance.now();
	const desc = ( fn ) => String( fn ).replace( /\s+/g, ' ' ).slice( 0, 160 );
	// eslint-disable-next-line no-eval
	const run = ( fn, self, args ) => ( 'function' === typeof fn ? fn.apply( self, args ) : ( 0, eval )( String( fn ) ) );
	const fake = {
		setTimeout: window.setTimeout, clearTimeout: window.clearTimeout, setInterval: window.setInterval,
		clearInterval: window.clearInterval, raf: window.requestAnimationFrame, caf: window.cancelAnimationFrame,
	};
	window.setTimeout = function setTimeout( fn, delay, ...args ) {
		const ms = Math.max( 0, Number( delay ) || 0 );
		const id = fake.setTimeout.call( window, function () {
			H.timeouts.delete( id );
			return run( fn, this, args );
		}, ms );
		H.timeouts.set( id, { kind: 'timeout', delay: ms, due: now() + ms, fn: desc( fn ) } );
		return id;
	};
	window.setInterval = function setInterval( fn, delay, ...args ) {
		const rec = { kind: 'interval', delay: Math.max( 0, Number( delay ) || 0 ), ticks: 0, fn: desc( fn ) };
		const id = fake.setInterval.call( window, function () {
			rec.ticks++;
			if ( ! off.has( 'intervals' ) && rec.ticks > cfg.intervalTicks ) {
				return undefined;
			}
			return run( fn, this, args );
		}, rec.delay );
		H.intervals.set( id, rec );
		return id;
	};
	const clear = ( id ) => {
		H.timeouts.delete( id );
		H.intervals.delete( id );
	};
	window.clearTimeout = function clearTimeout( id ) {
		clear( id );
		return fake.clearTimeout.call( window, id );
	};
	window.clearInterval = function clearInterval( id ) {
		clear( id );
		return fake.clearInterval.call( window, id );
	};
	let current = null;
	let nextChain = 1;
	let pausedId = 0x7ff00000;
	window.requestAnimationFrame = function requestAnimationFrame( fn ) {
		const chain = current ?? nextChain++;
		if ( ! off.has( 'raf' ) && ( H.chains.get( chain ) || 0 ) >= cfg.rafFrames ) {
			return ++pausedId;
		}
		const id = fake.raf.call( window, function ( ts ) {
			H.rafs.delete( id );
			H.chains.set( chain, ( H.chains.get( chain ) || 0 ) + 1 );
			const prev = current;
			current = chain;
			try {
				return fn.call( this, ts );
			} finally {
				current = prev;
			}
		} );
		H.rafs.set( id, { kind: 'frame', chain, fn: desc( fn ) } );
		return id;
	};
	window.cancelAnimationFrame = function cancelAnimationFrame( id ) {
		H.rafs.delete( id );
		return fake.caf.call( window, id );
	};
	const animate = Element.prototype.animate;
	Element.prototype.animate = function ( ...a ) {
		const anim = animate.apply( this, a );
		H.animations.add( anim );
		return anim;
	};
	const linkEvent = ( set ) => ( e ) => {
		if ( e.target instanceof HTMLLinkElement ) {
			set.add( e.target );
		}
	};
	document.addEventListener( 'load', linkEvent( H.links.loaded ), true );
	document.addEventListener( 'error', linkEvent( H.links.failed ), true );

	// Resolves once the renderer has produced a frame: a fresh IntersectionObserver's first notification is delivered
	// in the next rendering update, after every observer created before it (the draft's) has been notified in that
	// update. Native, so it does not depend on the faked requestAnimationFrame.
	H.frame = () => new Promise( ( done ) => {
		const io = new IntersectionObserver( () => {
			io.disconnect();
			done();
		} );
		io.observe( document.documentElement );
	} );
	// What still keeps the page from settling: timeouts due by windowEnd (virtual ms), intervals that have not ticked
	// cfg.intervalTicks times, frame callbacks still scheduled.
	H.pending = ( windowEnd ) => ( {
		t: now(),
		timeouts: off.has( 'timeouts' ) ? [] : [ ...H.timeouts.values() ].filter( ( x ) => x.due <= windowEnd ),
		intervals: [ ...H.intervals.values() ].filter( ( x ) => off.has( 'intervals' ) || x.ticks < cfg.intervalTicks ),
		frames: [ ...H.rafs.values() ],
	} );
	// One harness step after the clock moved: register every live animation, let the renderer produce a frame (so
	// observers see this step's state at this step's virtual time), and report what is pending.
	H.step = async ( windowEnd ) => {
		document.getAnimations().forEach( ( a ) => H.animations.add( a ) );
		await H.frame();
		return H.pending( windowEnd );
	};
	const label = ( a ) => {
		const t = a.effect?.target;
		const id = t?.closest?.( '[data-dc-tpl]' )?.getAttribute( 'data-dc-tpl' ) ?? '?';
		return `${ a.animationName || a.transitionProperty || 'web animation' } on <${ t?.tagName?.toLowerCase() ?? '?' }> (data-dc-tpl ${ id }, ${ a.effect?.getComputedTiming().duration }ms)`;
	};
	// Rest-mode hold: infinite animations paused at currentTime 0, finite ones finished (their end state). Repeats
	// after a frame while anything still runs (a finish can start a transition); returns what it held.
	H.hold = async () => {
		const held = new Set();
		const finished = new Set();
		for ( let round = 0; round < 5; round++ ) {
			const all = document.getAnimations();
			all.forEach( ( a ) => H.animations.add( a ) );
			for ( const a of all ) {
				if ( Infinity === a.effect?.getComputedTiming().endTime ) {
					if ( ! held.has( a ) || 'paused' !== a.playState || 0 !== a.currentTime ) {
						a.pause();
						a.currentTime = 0;
						held.add( a );
					}
				} else if ( 'running' === a.playState ) {
					a.finish();
					finished.add( a );
				}
			}
			await H.frame();
			if ( ! document.getAnimations().some( ( a ) => 'running' === a.playState ) ) {
				return { held: held.size, finished: finished.size };
			}
		}
		const still = document.getAnimations().filter( ( a ) => 'running' === a.playState );
		throw new Error( `animations kept starting after five hold rounds: ${ still.map( label ).join( '; ' ) }` );
	};
	// The element a sample target names: a CSS selector, or { draftId } matched with the walker's key function.
	H.resolve = ( target, keySrc ) => {
		if ( 'string' === typeof target ) {
			return document.querySelector( target );
		}
		// eslint-disable-next-line no-new-func
		const keyOf = new Function( `return (${ keySrc });` )();
		// Only stamps inside an import host have a key (the root host itself has none).
		return [ ...document.querySelectorAll( '[data-dc-tpl]' ) ].find( ( e ) => e.parentElement?.closest( '.sc-host' ) && keyOf( e ) === target.draftId ) ?? null;
	};
	// The registered animations on the target element: [ { index, label, delay, duration, iterations } ].
	H.targetAnimations = ( target, keySrc ) => {
		const el = H.resolve( target, keySrc );
		if ( ! el ) {
			throw new Error( `no element matches the sample target ${ JSON.stringify( target ) }` );
		}
		el.getAnimations().forEach( ( a ) => H.animations.add( a ) );
		H.sampled = [ ...H.animations ].filter( ( a ) => a.effect?.target === el );
		return H.sampled.map( ( a, index ) => {
			const t = a.effect.getComputedTiming();
			return { index, label: label( a ), delay: t.delay, duration: t.duration, iterations: t.iterations };
		} );
	};
	// Puts every sampled animation at local time t (its delay plus t), paused.
	H.seek = ( t ) => {
		for ( const a of H.sampled || [] ) {
			a.pause();
			a.currentTime = a.effect.getComputedTiming().delay + t;
		}
	};
	// Every font face the document knows, loaded; returns { faces, problems, blockedSheets }.
	H.fonts = async () => {
		const sheets = [ ...document.querySelectorAll( 'link[rel~="stylesheet"]' ) ];
		const failed = sheets.filter( ( l ) => H.links.failed.has( l ) ).map( ( l ) => `stylesheet ${ l.href } failed to load` );
		let blockedSheets = 0;
		const declared = [];
		for ( const s of document.styleSheets ) {
			try {
				for ( const r of s.cssRules ) {
					if ( r instanceof CSSFontFaceRule ) {
						declared.push( `${ r.style.getPropertyValue( 'font-family' ) } ${ r.style.getPropertyValue( 'font-weight' ) || 'normal' } ${ r.style.getPropertyValue( 'font-style' ) || 'normal' }` );
					}
				}
			} catch {
				// A cross-origin sheet (Google Fonts CSS) hides cssRules; its faces are read from document.fonts below.
				blockedSheets++;
			}
		}
		const faces = [ ...document.fonts ];
		await Promise.all( faces.map( ( f ) => f.load().catch( () => null ) ) );
		await document.fonts.ready;
		const problems = [ ...failed, ...faces.filter( ( f ) => 'loaded' !== f.status ).map( ( f ) => `font face ${ f.family } ${ f.weight } ${ f.style } (${ f.unicodeRange }) is ${ f.status }` ) ];
		return { faces: faces.length, declared: declared.length, blockedSheets, problems };
	};
	// True once every stylesheet <link> has either loaded or failed.
	H.sheetsSettled = () => [ ...document.querySelectorAll( 'link[rel~="stylesheet"]' ) ].every( ( l ) => l.sheet || H.links.failed.has( l ) );
}
