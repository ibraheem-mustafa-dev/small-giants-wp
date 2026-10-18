/**
 * SGS motion: the nav label magnet loader (Spec 38A FR-38A-40). Tier V.
 *
 * `sgs/nav-bar-menu` and `sgs/nav-drawer-menu` pull their item labels with the SAME `@sgs/magnet` instance the `magnet`
 * fx effect uses (one document pointer listener and one rAF queue for the page), instead of bundling a copy each.
 * The module is a webpack external that the browser resolves through the import map, so it is loaded with a native
 * `import()` that webpack leaves alone; the render layers enqueue `@sgs/magnet-loader` when a label magnet is on,
 * which lists `@sgs/magnet` in the map. A failed load leaves the labels still: the pull is decoration.
 *
 * @package
 */

let loading = null;

/**
 * The shared magnet module, loaded once per bundle (the browser holds one instance).
 *
 * @return {Promise<Object|null>} The module, or null when it could not load.
 */
function loadMagnet() {
	if ( null === loading ) {
		// A script module the browser resolves through the import map, not a package on disk.
		// eslint-disable-next-line import/no-unresolved
		loading = import( /* webpackIgnore: true */ '@sgs/magnet' ).catch( () => null );
	}
	return loading;
}

/**
 * Attach the label magnet to one element once the shared module has loaded.
 *
 * @param {HTMLElement} el     The label element.
 * @param {Object}      [opts] Options for the shared `initMagnet`.
 * @return {Function} Cleanup; safe before the module has loaded (the attach is then cancelled).
 */
export function initLabelMagnet( el, opts ) {
	let stop = null;
	let cancelled = false;
	loadMagnet().then( ( mod ) => {
		if ( ! cancelled && mod && 'function' === typeof mod.initMagnet ) {
			stop = opts ? mod.initMagnet( el, opts ) : mod.initMagnet( el );
		}
	} );
	return () => {
		cancelled = true;
		if ( stop ) {
			stop();
			stop = null;
		}
	};
}
