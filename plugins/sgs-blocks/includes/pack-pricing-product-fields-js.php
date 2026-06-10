<?php
/**
 * SGS Smart Bulk Pricing — product panel inline JS (Spec 28 P3 preview + P4 apply).
 *
 * Defines sgs_pack_pricing_preview_js(), the inline admin JS for the Smart
 * Pricing panel.  Flow: Generate preview (P3) → reveal Apply → confirm modal
 * (P4 step 1) → POST apply (P4 step 2) → reveal Revert.  The markup it binds to
 * is rendered by pack-pricing-product-fields-markup.php.
 *
 * Security: server-response text rendered via textContent (never innerHTML);
 * X-WP-Nonce on every write; readyState-guarded init (the script attaches to the
 * woocommerce_admin handle which WP prints in the HEAD, before the panel exists).
 *
 * @package   SGS\Blocks
 * @since     1.15.0
 * @see       .claude/specs/28-SGS-SMART-BULK-PRICING.md FR-28-10/14
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Return the inline JS for the Smart Pricing product panel (preview + apply).
 *
 * No <script> tags; the caller passes this to wp_add_inline_script(). No price
 * maths in JS — all formatting comes from the server (SSR==swap rule).
 *
 * @return string Raw JS.
 */
function sgs_pack_pricing_preview_js(): string {
	return <<<'JS'
( function() {
	'use strict';

	// Holds the most recent preview rows so the confirm modal can show
	// current→new per pack without a second server round-trip.
	var lastPreviewRows = [];

	function sgsGet( id ) { return document.getElementById( id ); }

	function sgsClear( el ) {
		while ( el && el.firstChild ) { el.removeChild( el.firstChild ); }
	}

	// ── Preview (P3) ──────────────────────────────────────────────────────────
	function sgsBindPreview( btn ) {
		btn.addEventListener( 'click', function() {
			var productId  = parseInt( btn.dataset.productId, 10 );
			var previewUrl = btn.dataset.previewUrl;
			var nonce      = btn.dataset.nonce;
			var status     = sgsGet( 'sgs-pack-pricing-preview-status' );
			var wrap       = sgsGet( 'sgs-pack-pricing-preview-wrap' );
			var tbody      = sgsGet( 'sgs-pack-pricing-preview-tbody' );
			var metaEl     = sgsGet( 'sgs-pack-pricing-preview-meta' );
			var applyWrap  = sgsGet( 'sgs-pack-pricing-apply-wrap' );

			if ( ! productId || ! previewUrl ) { return; }

			var basePoundsEl = sgsGet( '_sgs_base_price_pounds' );
			var basePence    = basePoundsEl && basePoundsEl.value
				? Math.round( parseFloat( basePoundsEl.value ) * 100 )
				: 0;

			var kRadio = document.querySelector( 'input[name="_sgs_pack_k"]:checked' );
			var kNotch = kRadio ? kRadio.value : '';

			var packSizes = [];
			document.querySelectorAll( 'input[name="_sgs_pack_sizes[]"]:checked' ).forEach( function( cb ) {
				packSizes.push( parseInt( cb.value, 10 ) );
			} );

			var body = { product_id: productId };
			if ( basePence >= 10 )  { body.base_pence = basePence; }
			if ( kNotch )           { body.k_notch    = kNotch; }
			if ( packSizes.length ) { body.pack_sizes = packSizes; }

			status.textContent = 'Generating preview…';
			btn.disabled       = true;

			fetch( previewUrl, {
				method:  'POST',
				headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
				body: JSON.stringify( body ),
			} )
			.then( function( res ) { return res.json(); } )
			.then( function( data ) {
				btn.disabled = false;
				if ( data.code ) {
					status.style.color = '#c62828';
					status.textContent = data.message || 'Error generating preview.';
					wrap.style.display = 'none';
					if ( applyWrap ) { applyWrap.style.display = 'none'; }
					return;
				}

				status.style.color = '#2e7d32';
				status.textContent = 'Preview generated (no prices saved to shop).';

				lastPreviewRows = data.preview_rows || [];

				sgsClear( tbody );
				lastPreviewRows.forEach( function( row ) {
					var tr   = document.createElement( 'tr' );
					var note = row.clamped ? ( '⚠️ ' + row.guardrail_note ) : ( row.locked ? '🔒 ' + row.guardrail_note : '' );

					var tdSize   = document.createElement( 'td' );
					var strongEl = document.createElement( 'strong' );
					strongEl.textContent = String( row.pack_size );
					tdSize.appendChild( strongEl );
					tr.appendChild( tdSize );

					[ row.pack_price_fmt, row.per_unit_fmt, row.saving_display ].forEach( function( cellText ) {
						var td = document.createElement( 'td' );
						td.textContent = String( cellText || '' );
						tr.appendChild( td );
					} );

					var tdNote = document.createElement( 'td' );
					tdNote.style.color    = row.clamped ? '#bf360c' : '#666';
					tdNote.style.fontSize = '12px';
					tdNote.textContent    = note;
					tr.appendChild( tdNote );

					tbody.appendChild( tr );
				} );

				if ( data.config ) {
					var c = data.config;
					var sourceLabels = {
						'default':  'site default',
						'site':     'your site settings',
						'category': 'this product’s category',
						'product':  'this product’s own setting',
						'request':  'your selection above'
					};
					metaEl.textContent = 'Calculated using: £' + ( c.base_pence / 100 ).toFixed( 2 ) + ' single-unit price' +
						' · discount strength from ' + ( sourceLabels[ c.source_k ] || c.source_k ) +
						' · pack sizes from ' + ( sourceLabels[ c.source_sizes ] || c.source_sizes ) +
						' · .99 price endings ' + ( c.charm_round ? 'on' : 'off' ) + '.';
				}

				wrap.style.display = 'block';
				// Reveal the two-step apply button now a preview exists.
				if ( applyWrap ) { applyWrap.style.display = 'block'; }
			} )
			.catch( function( err ) {
				btn.disabled       = false;
				status.style.color = '#c62828';
				status.textContent = 'Network error: ' + err.message;
			} );
		} );
	}

	// ── Apply step 1: open the confirm modal (P4 FR-28-10) ────────────────────
	function sgsBindApply( btn ) {
		var applyBtn  = sgsGet( 'sgs-pack-pricing-apply-btn' );
		var modal     = sgsGet( 'sgs-pack-pricing-confirm-modal' );
		var confirmTb = sgsGet( 'sgs-confirm-price-tbody' );
		if ( ! applyBtn || ! modal || ! confirmTb ) { return; }

		applyBtn.addEventListener( 'click', function() {
			sgsClear( confirmTb );
			lastPreviewRows.forEach( function( row ) {
				var tr = document.createElement( 'tr' );
				[ String( row.pack_size ), '—', String( row.pack_price_fmt || '' ) ].forEach( function( txt ) {
					var td = document.createElement( 'td' );
					td.textContent = txt;
					tr.appendChild( td );
				} );
				confirmTb.appendChild( tr );
			} );
			modal.style.display = 'flex';
		} );

		var cancel = sgsGet( 'sgs-confirm-apply-cancel' );
		if ( cancel ) {
			cancel.addEventListener( 'click', function() { modal.style.display = 'none'; } );
		}

		var yes = sgsGet( 'sgs-confirm-apply-yes' );
		if ( yes ) {
			yes.addEventListener( 'click', function() {
				modal.style.display = 'none';
				sgsRunApply( btn );
			} );
		}
	}

	// ── Apply step 2: POST the write (P4) ─────────────────────────────────────
	function sgsRunApply( btn ) {
		var productId  = parseInt( btn.dataset.productId, 10 );
		var applyUrl   = btn.dataset.applyUrl;
		var nonce      = btn.dataset.nonce;
		var status     = sgsGet( 'sgs-pack-pricing-apply-status' );
		var revertWrap = sgsGet( 'sgs-pack-pricing-revert-wrap' );

		if ( ! productId || ! applyUrl ) { return; }

		var basePoundsEl = sgsGet( '_sgs_base_price_pounds' );
		var basePence    = basePoundsEl && basePoundsEl.value
			? Math.round( parseFloat( basePoundsEl.value ) * 100 )
			: 0;
		var kRadio = document.querySelector( 'input[name="_sgs_pack_k"]:checked' );
		var packSizes = [];
		document.querySelectorAll( 'input[name="_sgs_pack_sizes[]"]:checked' ).forEach( function( cb ) {
			packSizes.push( parseInt( cb.value, 10 ) );
		} );

		var body = { product_id: productId };
		if ( basePence >= 10 )  { body.base_pence = basePence; }
		if ( kRadio && kRadio.value ) { body.k_notch = kRadio.value; }
		if ( packSizes.length ) { body.pack_sizes = packSizes; }

		status.style.color = '#666';
		status.textContent = 'Applying prices…';

		fetch( applyUrl, {
			method:  'POST',
			headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
			body: JSON.stringify( body ),
		} )
		.then( function( res ) { return res.json(); } )
		.then( function( data ) {
			if ( data.code ) {
				status.style.color = '#c62828';
				status.textContent = data.message || 'Error applying prices.';
				return;
			}
			status.style.color = data.success ? '#2e7d32' : '#bf360c';
			var msg = String( data.summary || 'Done.' );
			if ( data.sale_price_warning ) { msg += ' ' + String( data.sale_price_warning ); }
			status.textContent = msg;
			if ( data.has_backup && revertWrap ) { revertWrap.style.display = 'block'; }
		} )
		.catch( function( err ) {
			status.style.color = '#c62828';
			status.textContent = 'Network error: ' + err.message;
		} );
	}

	// ── Revert (P4 FR-28-14) ──────────────────────────────────────────────────
	function sgsBindRevert( btn ) {
		var revertBtn = sgsGet( 'sgs-pack-pricing-revert-btn' );
		if ( ! revertBtn ) { return; }

		revertBtn.addEventListener( 'click', function() {
			var productId = parseInt( btn.dataset.productId, 10 );
			var revertUrl = btn.dataset.revertUrl;
			var nonce     = btn.dataset.nonce;
			var status    = sgsGet( 'sgs-pack-pricing-revert-status' );
			if ( ! productId || ! revertUrl ) { return; }

			status.style.color = '#666';
			status.textContent = 'Reverting…';
			revertBtn.disabled = true;

			fetch( revertUrl, {
				method:  'POST',
				headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
				body: JSON.stringify( { product_id: productId } ),
			} )
			.then( function( res ) { return res.json(); } )
			.then( function( data ) {
				revertBtn.disabled = false;
				if ( data.code ) {
					status.style.color = '#c62828';
					status.textContent = data.message || 'Error reverting.';
					return;
				}
				status.style.color = '#2e7d32';
				status.textContent = 'Restored ' + String( data.restored || 0 ) + ' price(s) from backup.';
			} )
			.catch( function( err ) {
				revertBtn.disabled = false;
				status.style.color = '#c62828';
				status.textContent = 'Network error: ' + err.message;
			} );
		} );
	}

	function sgsPackPricingInit() {
		var btn = sgsGet( 'sgs-pack-pricing-preview-btn' );
		if ( ! btn ) { return; }
		sgsBindPreview( btn );
		sgsBindApply( btn );
		sgsBindRevert( btn );
	}

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', sgsPackPricingInit );
	} else {
		sgsPackPricingInit();
	}
} )();
JS;
}
