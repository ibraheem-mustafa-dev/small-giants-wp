// The in-page half of the census runtime pass (Spec 48 FR-48-24). Both functions are serialised into the page, so they
// are self-contained (no closure over module scope).
//
// traceInit (page.addInitScript, registered after the harness's own init script so it wraps the harness's wrappers)
// installs window.__sgsTrace:
//   - calls: every call of setTimeout, setInterval, requestAnimationFrame, an observer constructor
//     (IntersectionObserver, ResizeObserver, MutationObserver) or Element.prototype.animate, recorded as
//     { kind, fn, hash, pos }: the script hash and character position of the first stack frame that has a script hash.
//     Init scripts have no hash, so that frame is the caller: the draft's call site when the draft made the call, or
//     the runtime's, React's or Playwright's own (whose hashes the Node side maps to nothing). Unique per page.
//   - motion: every `transitionrun` and `animationstart` event target with the property or animation name it ran.
// collect(arg) reads one visit's evidence and clears calls and motion, so each visit reports what ran since the last.
export function traceInit() {
	const T = { calls: [], seen: new Set(), motion: new Map() };
	window.__sgsTrace = T;
	const site = () => {
		const prev = Error.prepareStackTrace;
		const limit = Error.stackTraceLimit;
		try {
			Error.stackTraceLimit = 40;
			Error.prepareStackTrace = ( e, frames ) => {
				for ( const f of frames ) {
					const hash = f.getScriptHash ? f.getScriptHash() : '';
					if ( hash ) {
						return { hash, pos: f.getPosition() };
					}
				}
				return null;
			};
			return new Error().stack;
		} finally {
			Error.prepareStackTrace = prev;
			Error.stackTraceLimit = limit;
		}
	};
	const rec = ( kind, fn ) => {
		const s = site();
		if ( ! s ) {
			return;
		}
		const key = `${ kind }|${ fn }|${ s.hash }|${ s.pos }`;
		if ( ! T.seen.has( key ) ) {
			T.seen.add( key );
			T.calls.push( { kind, fn, hash: s.hash, pos: s.pos } );
		}
	};
	for ( const name of [ 'setTimeout', 'setInterval', 'requestAnimationFrame' ] ) {
		const orig = window[ name ];
		window[ name ] = function ( ...a ) {
			rec( 'timer', name );
			return orig.apply( this, a );
		};
	}
	for ( const name of [ 'IntersectionObserver', 'ResizeObserver', 'MutationObserver' ] ) {
		const Orig = window[ name ];
		if ( 'function' !== typeof Orig ) {
			continue;
		}
		const Wrapped = function ( ...a ) {
			if ( ! new.target ) {
				return Orig( ...a );
			}
			rec( 'observer', name );
			return Reflect.construct( Orig, a, new.target );
		};
		Wrapped.prototype = Orig.prototype;
		Object.defineProperty( Wrapped, 'name', { value: name } );
		window[ name ] = Wrapped;
	}
	const animate = Element.prototype.animate;
	Element.prototype.animate = function ( ...a ) {
		rec( 'waapi', 'animate' );
		return animate.apply( this, a );
	};
	for ( const type of [ 'transitionrun', 'animationstart' ] ) {
		window.addEventListener( type, ( e ) => {
			const name = 'animationstart' === type ? e.animationName : e.propertyName;
			const set = T.motion.get( e.target ) || new Set();
			set.add( `${ type }|${ name }` );
			T.motion.set( e.target, set );
		}, true );
	}
}

// One visit's evidence. arg: { selectors: [ selector ] (stylesheet motion rules, by index), known: [ component names
// whose template tree the caller already holds ] }. Returns:
//   rendered: [ '<component>:<n>|<tag>' ] every stamped element inside an import host (the host's own stamp belongs to
//             the host around it); loose: stamped elements outside every host (helmet children moved to <head>);
//   mounted:  the component names with a rendered host; trees: { name: { n: { tag, desc, parent } } } for each newly
//             mounted component, one entry per control element (sc-if, sc-for, sc-helmet) of its stamped template:
//             the stamps inside it and the nearest enclosing non-control stamp;
//   motion:   [ { type, name, key ('<component>:<n>' or null), sel: [ selector index ] } ];
//   calls:    traceInit's call records since the last collect;
//   fonts:    loaded font families; sheets: hrefs of loaded stylesheet links; imports: hrefs of loaded @import rules.
export function collect( arg ) {
	const T = window.__sgsTrace;
	const CONTROLS = [ 'sc-if', 'sc-for', 'sc-helmet' ];
	const parentHost = ( x ) => ( x.parentElement ? x.parentElement.closest( '.sc-host' ) : null );
	const keyOf = ( e ) => {
		const h = e && e.dataset && undefined !== e.dataset.dcTpl ? parentHost( e ) : null;
		return h && h.dataset.scName ? `${ h.dataset.scName }:${ e.dataset.dcTpl }` : null;
	};
	const rendered = new Set();
	const loose = [];
	for ( const e of document.querySelectorAll( '[data-dc-tpl]' ) ) {
		const tag = e.tagName.toLowerCase();
		const key = keyOf( e );
		if ( key ) {
			rendered.add( `${ key }|${ tag }` );
		} else {
			loose.push( { n: e.dataset.dcTpl, tag, src: e.getAttribute( 'src' ), href: e.getAttribute( 'href' ), text: 'style' === tag || 'script' === tag ? e.textContent : null } );
		}
	}
	const mounted = [ ...new Set( [ ...document.querySelectorAll( '.sc-host[data-sc-name]' ) ].map( ( h ) => h.dataset.scName ) ) ].sort();
	const trees = {};
	for ( const name of mounted.filter( ( m ) => ! arg.known.includes( m ) ) ) {
		const html = window.__dcAnnotatedTemplate( name );
		if ( ! html ) {
			continue;
		}
		const t = document.createElement( 'template' );
		t.innerHTML = html;
		const tree = {};
		for ( const c of t.content.querySelectorAll( CONTROLS.map( ( x ) => `${ x }[data-dc-tpl]` ).join( ',' ) ) ) {
			let p = c.parentElement;
			while ( p && ( ! p.hasAttribute( 'data-dc-tpl' ) || CONTROLS.includes( p.tagName.toLowerCase() ) ) ) {
				p = p.parentElement;
			}
			tree[ c.getAttribute( 'data-dc-tpl' ) ] = { tag: c.tagName.toLowerCase(), desc: [ ...c.querySelectorAll( '[data-dc-tpl]' ) ].map( ( d ) => d.getAttribute( 'data-dc-tpl' ) ), parent: p ? p.getAttribute( 'data-dc-tpl' ) : null };
		}
		trees[ name ] = tree;
	}
	const motion = [];
	for ( const [ el, set ] of T.motion ) {
		const sel = [];
		arg.selectors.forEach( ( s, i ) => {
			try {
				if ( el.matches && el.matches( s ) ) {
					sel.push( i );
				}
			} catch {
				// A selector the engine cannot match (a pseudo-element) never matches an event target.
			}
		} );
		for ( const x of set ) {
			const [ type, name ] = x.split( '|' );
			motion.push( { type, name, key: keyOf( el ), sel } );
		}
	}
	T.motion.clear();
	const calls = T.calls.splice( 0 );
	T.seen.clear();
	const unquote = ( s ) => s.replace( /^["']|["']$/g, '' );
	const fonts = [ ...new Set( [ ...document.fonts ].filter( ( f ) => 'loaded' === f.status ).map( ( f ) => unquote( f.family ) ) ) ].sort();
	const sheets = [ ...document.querySelectorAll( 'link[rel~="stylesheet"]' ) ].filter( ( l ) => l.sheet ).map( ( l ) => l.getAttribute( 'href' ) );
	const imports = [];
	const walk = ( list ) => {
		for ( const r of list ) {
			if ( r instanceof CSSImportRule && r.styleSheet ) {
				imports.push( r.href );
			}
		}
	};
	for ( const s of document.styleSheets ) {
		try {
			walk( s.cssRules );
		} catch {
			// A cross-origin sheet hides its rules; an @import inside it is not a draft's own.
		}
	}
	return { rendered: [ ...rendered ].sort(), loose, mounted, trees, motion, calls, fonts, sheets, imports };
}
