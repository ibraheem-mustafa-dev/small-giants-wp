/**
 * Live header height without a page-wide restyle.
 *
 * `--sgs-header-height` is an inherited custom property: writing it on :root
 * restyles every element. Two pieces keep the shrink cheap:
 *
 *   createHeightPublisher() decides which writes happen. The live edge goes to
 *   the `live` sink on every change; the RESTING value goes to the `resting`
 *   sink only when it rises, flips to 0, or the caller asks for an exact write.
 *
 *   createLiveHeight() writes the live value as an inline custom property on
 *   each element a stylesheet positions from `--sgs-header-height` (sticky
 *   offsets, panels), so only those subtrees restyle. The elements come from
 *   the CSSOM: every rule whose declarations use `var( --sgs-header-height )`,
 *   each comma-separated selector validated alone, pseudo-elements stripped so
 *   `.x::before` reaches `.x`. Matched nodes are cached; a shrink frame does
 *   only `setProperty`. The cache is rebuilt, at most once per `delay`, after
 *   elements are added or removed, after a stylesheet is added or a `<link>`
 *   loads. An element that stops matching loses its inline property.
 *
 * Limits. These consumers get the RESTING value while the header is shrunk,
 * not the live one: a consumer whose rule depends on a class or state
 * (`.is-open`, `[open]`, `:hover`), a pseudo-element selector that strips to a
 * dangling combinator, a rule in an `@import`ed sheet, an element inside a
 * shadow root, and a `var( --sgs-header-height )` inside an inline `style`
 * attribute. Nothing in the repository does any of these.
 *
 * @package SGS\Blocks
 */

const PROP = '--sgs-header-height';
const USES_PROP = /var\(\s*--sgs-header-height\s*[,)]/;
const PSEUDO_ELEMENT = /::[a-z-]+(\([^)]*\))?|:(?:before|after|first-line|first-letter)\b/gi;

/**
 * Split a selector list on its top-level commas.
 *
 * @param {string} text Selector list.
 * @return {string[]} Members, trimmed, empties dropped.
 */
export function splitSelectorList( text ) {
	const parts = [];
	let depth = 0;
	let quote = '';
	let start = 0;
	for ( let i = 0; i < text.length; i++ ) {
		const ch = text[ i ];
		if ( quote ) {
			if ( '\\' === ch ) {
				i++;
			} else if ( ch === quote ) {
				quote = '';
			}
		} else if ( '"' === ch || "'" === ch ) {
			quote = ch;
		} else if ( '(' === ch || '[' === ch ) {
			depth++;
		} else if ( ')' === ch || ']' === ch ) {
			depth--;
		} else if ( ',' === ch && 0 === depth ) {
			parts.push( text.slice( start, i ) );
			start = i + 1;
		}
	}
	parts.push( text.slice( start ) );
	return parts.map( ( p ) => p.trim() ).filter( Boolean );
}

/**
 * The element a selector styles once pseudo-elements are removed.
 *
 * @param {string} selector One selector.
 * @return {string} Host selector; '' when nothing is left.
 */
export function hostSelector( selector ) {
	return selector.replace( PSEUDO_ELEMENT, '' ).trim();
}

/**
 * Decide which header-height writes happen.
 *
 * @param {{ live: function( string ): void, resting: function( string ): void }} sinks Receivers of each write, as px strings.
 * @return {function( number, boolean ): void} publish( edge, exact )
 */
export function createHeightPublisher( sinks ) {
	let live = null;
	let resting = null;
	const px = ( edge ) => Math.round( edge ) + 'px';

	return function publish( edge, exact ) {
		if ( edge !== live ) {
			live = edge;
			sinks.live( px( edge ) );
		}
		if ( edge === resting ) {
			return;
		}
		// The inherited resting value restyles the whole page. Without an exact
		// publish (a resize) it is written only when it first appears, rises
		// or drops to 0: a header shrinking or growing back passes every
		// lower value to the live sink alone.
		if ( true === exact || null === resting || edge > resting || 0 === edge ) {
			resting = edge;
			sinks.resting( px( edge ) );
		}
	};
}

/**
 * @param {{ doc?: Document, win?: Window, delay?: number }} [options] Injected for tests.
 * @return {{ set: function( string ): void, refresh: function(): void }} Live-value writer.
 */
export function createLiveHeight( options = {} ) {
	const doc = options.doc || document;
	const win = options.win || window;
	const delay = Number.isFinite( options.delay ) ? options.delay : 200;
	const maxWait = 8 * delay;

	const valid = new Map();
	const written = new Map();
	let selectors = [];
	let cache = new Set();
	let sheetCount = -1;
	let value = null;
	let timer = 0;
	let idle = 0;
	let firstPending = 0;
	let lastChange = 0;

	function isValid( selector ) {
		if ( ! valid.has( selector ) ) {
			let ok = true;
			try {
				doc.querySelector( selector );
			} catch ( e ) {
				ok = false;
			}
			valid.set( selector, ok );
		}
		return valid.get( selector );
	}

	function collect( rules, found ) {
		for ( const rule of Array.prototype.slice.call( rules ) ) {
			if ( rule.selectorText && rule.style && USES_PROP.test( rule.style.cssText ) ) {
				splitSelectorList( rule.selectorText ).forEach( ( member ) => {
					const host = hostSelector( member );
					if ( host && isValid( host ) ) {
						found.add( host );
					}
				} );
			}
			if ( rule.cssRules ) {
				collect( rule.cssRules, found );
			}
		}
	}

	function rebuildSelectors() {
		const found = new Set();
		for ( const sheet of Array.prototype.slice.call( doc.styleSheets ) ) {
			try {
				collect( sheet.cssRules, found );
			} catch ( e ) {
				// A cross-origin sheet is unreadable and not ours.
			}
		}
		selectors = Array.from( found );
		sheetCount = doc.styleSheets.length;
	}

	function write( el ) {
		if ( written.get( el ) !== value ) {
			written.set( el, value );
			el.style.setProperty( PROP, value );
		}
	}

	function requery() {
		if ( doc.styleSheets.length !== sheetCount ) {
			rebuildSelectors();
		}
		const matched = new Set();
		selectors.forEach( ( selector ) => {
			doc.querySelectorAll( selector ).forEach( ( el ) => {
				if ( el !== doc.documentElement && el !== doc.body ) {
					matched.add( el );
				}
			} );
		} );
		written.forEach( ( v, el ) => {
			if ( ! matched.has( el ) ) {
				el.style.removeProperty( PROP );
				written.delete( el );
			}
		} );
		cache = matched;
		if ( null !== value ) {
			cache.forEach( write );
		}
	}

	// Runs once the page has been quiet for `delay` (or has waited `maxWait`
	// under continuous changes), then on an idle callback.
	function onQuiet() {
		timer = 0;
		const now = Date.now();
		const quiet = now - lastChange;
		if ( quiet < delay && now - firstPending < maxWait ) {
			timer = win.setTimeout( onQuiet, delay - quiet );
			return;
		}
		firstPending = 0;
		const run = function () {
			idle = 0;
			requery();
		};
		idle =
			typeof win.requestIdleCallback === 'function'
				? win.requestIdleCallback( run, { timeout: 1000 } )
				: win.setTimeout( run, 0 );
	}

	function schedule() {
		lastChange = Date.now();
		if ( ! timer && ! idle ) {
			firstPending = lastChange;
			timer = win.setTimeout( onQuiet, delay );
		}
	}

	function stylesChanged() {
		sheetCount = -1;
		schedule();
	}

	if ( typeof win.MutationObserver !== 'undefined' ) {
		new win.MutationObserver( function ( records ) {
			for ( const record of records ) {
				const nodes = Array.prototype.slice
					.call( record.addedNodes )
					.concat( Array.prototype.slice.call( record.removedNodes ) );
				if ( nodes.some( ( n ) => 1 === n.nodeType ) ) {
					schedule();
					return;
				}
			}
		} ).observe( doc.documentElement, { childList: true, subtree: true } );
	}
	doc.addEventListener(
		'load',
		function ( event ) {
			if ( event.target && 'LINK' === event.target.tagName ) {
				stylesChanged();
			}
		},
		true
	);
	win.addEventListener( 'load', stylesChanged );

	requery();

	return {
		/**
		 * Write the live value to every cached consumer. No query runs.
		 *
		 * @param {string} px Value such as `65px`.
		 */
		set( px ) {
			value = px;
			cache.forEach( write );
		},
		/** Rebuild the cache now. */
		refresh: requery,
	};
}

/**
 * The receivers of every header-height write.
 *
 * @param {Document} [doc]        Document whose root carries the properties.
 * @param {{ set: function( string ): void }} [liveHeight] Consumer writer.
 * @return {{ live: function( string ): void, resting: function( string ): void }} Sinks for createHeightPublisher().
 */
export function createHeaderHeightWriter( doc = document, liveHeight = createLiveHeight( { doc } ) ) {
	return {
		live( px ) {
			doc.documentElement.style.setProperty( '--sgs-header-height-live', px );
			liveHeight.set( px );
		},
		resting( px ) {
			doc.documentElement.style.setProperty( PROP, px );
		},
	};
}
