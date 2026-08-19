/**
 * stage8-lighthouse.js — Chrome/Lighthouse orchestration for stage8-audit.js, split
 * out purely to keep stage8-audit.js under the repo's 250-line limit. This is the
 * ONLY module in the stage8 family that touches a real browser/network — it is
 * never exercised by --self-test.
 *
 * `lighthouse` and `chrome-launcher` are both native ESM packages (`"type":
 * "module"`); this script stays CommonJS to match every sibling script in this
 * directory, so both are loaded via a dynamic `import()` rather than converting the
 * whole file to ESM.
 *
 * @package SGS\Blocks
 */
'use strict';

/**
 * Runs Lighthouse `runs` times against `url` and returns the array of raw `lhr`
 * results (caller decides how to combine them — see `medianLhr` in
 * `stage8-report-builders.js`). Never a silent pass: throws with an explicit,
 * unambiguous message if Chrome cannot launch or a run returns no result.
 */
async function runLighthouse( { url, viewport, runs } ) {
	let launch;
	let lighthouse;
	try {
		( { launch } = await import( 'chrome-launcher' ) );
		lighthouse = ( await import( 'lighthouse' ) ).default;
	} catch ( err ) {
		throw new Error(
			`lighthouse/chrome-launcher failed to load (${ err.message }). Run "npm install" in plugins/sgs-blocks first.`
		);
	}

	let desktopConfig;
	if ( viewport === 'desktop' ) {
		desktopConfig = ( await import( 'lighthouse/core/config/desktop-config.js' ) ).default;
	}

	// M4: --no-sandbox drops a real security boundary — only add it when explicitly
	// opted in (CI containers commonly run as root, where the sandbox cannot start
	// at all), never unconditionally on a developer machine.
	const chromeFlags = [ '--headless=new', '--disable-gpu' ];
	if ( process.env.CI || process.env.SGS_STAGE8_NO_SANDBOX === '1' ) {
		chromeFlags.push( '--no-sandbox' );
	}

	let chrome;
	try {
		chrome = await launch( { chromeFlags } );
	} catch ( err ) {
		// Requirement #8: never a silent pass — an explicit, unambiguous message.
		throw new Error(
			`Chrome/Chromium is unavailable — cannot run Lighthouse (${ err.message }). ` +
				'Install Google Chrome or Chromium, or set the CHROME_PATH environment variable to its binary.'
		);
	}

	try {
		const lhrs = [];
		for ( let i = 0; i < runs; i++ ) {
			const result = await lighthouse(
				url,
				// M5: explicit timeout — Lighthouse's own default is unbounded on a
				// hung page, which would leave this script stuck rather than failing.
				{ port: chrome.port, output: 'json', logLevel: 'error', maxWaitForLoad: 45000 },
				desktopConfig
			);
			if ( ! result || ! result.lhr ) {
				throw new Error( `Lighthouse run ${ i + 1 }/${ runs } against ${ url } returned no result.` );
			}
			lhrs.push( result.lhr );
		}
		return lhrs;
	} finally {
		await chrome.kill();
	}
}

module.exports = { runLighthouse };
