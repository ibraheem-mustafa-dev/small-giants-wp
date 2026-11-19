/**
 * no-site: the kill switch for every script that reaches a WordPress site. A process started with SGS_NO_SITE set (the mutation
 * checker and the route's test script set it) may not log in, run a site's wp-cli, build a page or call a site's REST API:
 * each entry point calls assertMayContactSite() first and throws this message. SGS_NO_SITE unset, empty or "0" is off.
 */
'use strict';

const MESSAGE = 'SGS_NO_SITE is set: this process may not contact a site';

/**
 * Whether the kill switch is on in `env`.
 *
 * @param {Object} [env] The environment to read (default process.env).
 * @return {boolean} True when SGS_NO_SITE is set to anything but "" or "0".
 */
function switchOn( env = process.env ) {
	return Boolean( env.SGS_NO_SITE ) && '0' !== env.SGS_NO_SITE;
}

/**
 * Throws the kill-switch message when the switch is on.
 *
 * @param {Object} [env] The environment to read (default process.env).
 */
function assertMayContactSite( env = process.env ) {
	if ( switchOn( env ) ) {
		throw new Error( MESSAGE );
	}
}

module.exports = { MESSAGE, switchOn, assertMayContactSite };
