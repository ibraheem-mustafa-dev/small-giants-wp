/**
 * SGS Button Presets — Customiser PREVIEW-side live binding.
 *
 * Applies button-preset token changes to the preview iframe instantly, with no page
 * reload (`transport: 'postMessage'`). Loaded only inside the Customiser preview
 * (`customize_preview_init`), never on the public frontend.
 *
 * SPEC 32 (FR-32-1 / FR-32-4 as amended 2026-07-18, D345)
 * -------------------------------------------------------
 * This script MUST NOT touch any `.sgs-button` element's `style` attribute — not even
 * to set a `--var`. It writes ONE `<style>` element containing ONE `:root{...}` rule.
 * That is a stylesheet rule, exactly like the `<style id="global-styles-inline-css">`
 * rule WordPress emits for the saved values, so the preview and the published page
 * change the buttons by the identical mechanism.
 *
 * WHY `:root` REACHES THE BUTTON
 * ------------------------------
 * `src/blocks/button/style.css` has `.sgs-button--primary { --sgs-btn-bg: var(
 * --wp--custom--button-presets--primary--background, <fallback> ); }` and the base
 * `.sgs-button` rule consumes `var(--sgs-btn-bg)`. Custom properties INHERIT, so
 * redefining the `--wp--custom--*` token on `:root` re-resolves `--sgs-btn-bg` on every
 * preset button at once. The element itself is never selected or mutated.
 *
 * WHY THE ELEMENT IS APPENDED TO <head> AT RUNTIME
 * -----------------------------------------------
 * WordPress already defines these same tokens in `<style id="global-styles-inline-css">`
 * at `:root`, which is identical specificity (0,1,0). Ties resolve by SOURCE ORDER, so
 * our rule must come later in the document to win. Appending to the end of `<head>`
 * after load guarantees that without any `!important` escalation.
 */
( function ( api ) {
	'use strict';

	var STYLE_ID = 'sgs-button-presets-preview';

	// setting id -> CSS custom property name, injected by PHP (`wp_add_inline_script`).
	var varMap = window.sgsButtonPresetVars || {};

	// Live values keyed by CSS custom property. Only entries the client has actually
	// changed this session appear here; everything else keeps falling through to the
	// saved global-styles rule, so an untouched token is never restated or disturbed.
	var overrides = {};

	/**
	 * Return the single preview <style> element, creating and appending it on demand.
	 *
	 * @return {HTMLStyleElement} The style element.
	 */
	function styleEl() {
		var el = document.getElementById( STYLE_ID );

		if ( ! el ) {
			el = document.createElement( 'style' );
			el.id = STYLE_ID;
			( document.head || document.documentElement ).appendChild( el );
		}

		return el;
	}

	/**
	 * Rebuild the whole `:root{...}` rule from the current override set.
	 *
	 * Rebuilt wholesale rather than appended to, so that clearing a value back to
	 * "Theme default" genuinely REMOVES the declaration instead of leaving a stale
	 * one behind that would keep winning by source order.
	 *
	 * @return {void}
	 */
	function render() {
		var decls = [];
		var prop;

		for ( prop in overrides ) {
			if ( Object.prototype.hasOwnProperty.call( overrides, prop ) && overrides[ prop ] !== '' ) {
				decls.push( prop + ':' + overrides[ prop ] );
			}
		}

		styleEl().textContent = decls.length ? ':root{' + decls.join( ';' ) + '}' : '';
	}

	/**
	 * Guard against anything that could break out of the declaration or the <style>
	 * element. The PHP `sanitise_colour_token()` allowlist is the real gate on SAVE;
	 * this is the same allowlist applied to the unsaved preview value, so a malformed
	 * value can never reach the preview DOM either.
	 *
	 * @param {string} value Candidate value.
	 * @return {string} The value if permitted, otherwise ''.
	 */
	function safe( value ) {
		if ( typeof value !== 'string' ) {
			return '';
		}

		value = value.trim();

		if ( value === '' || value.toLowerCase() === 'transparent' ) {
			return value === '' ? '' : 'transparent';
		}

		if ( /^var\(--wp--preset--color--[a-z0-9]+(?:-[a-z0-9]+)*\)$/.test( value ) ) {
			return value;
		}

		if ( /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test( value ) ) {
			return value.toLowerCase();
		}

		return '';
	}

	Object.keys( varMap ).forEach( function ( settingId ) {
		api( settingId, function ( setting ) {
			setting.bind( function ( value ) {
				overrides[ varMap[ settingId ] ] = safe( value );
				render();
			} );
		} );
	} );
} )( wp.customize );
