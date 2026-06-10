<?php
/**
 * Product-template admin panel — inline JS (printed on admin_footer).
 *
 * Extracted from product-template-fields.php to keep both files under the
 * 300-line limit (code-quality.md rule). The markup this script binds to is
 * rendered by sgs_render_product_template_fields() in that file.
 *
 * Behaviour:
 *   - Save-as-template POST.
 *   - Two-step apply: dry-run (confirm=false) → inline confirm box with the
 *     summary, an optional starting-price input, Apply + Cancel buttons →
 *     live apply (confirm=true). No window.prompt/confirm.
 *   - Export: JS fetch with the X-WP-Nonce header → Blob download named
 *     sgs-template-{id}.json (the server also sets Content-Disposition for
 *     direct/non-JS consumers).
 *   - Import: textarea JSON → POST /product-templates/import.
 *
 * Security:
 *   - All user-visible text from server responses uses textContent (never
 *     innerHTML with server data — XSS guard).
 *   - The nonce + REST root come from the wp_json_encode'd data element.
 *   - The whole script is wrapped in a readyState-guarded init (an unguarded
 *     IIFE silently no-binds when DOMContentLoaded already fired).
 *
 * @package SGS\Blocks
 * @since   1.8.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Output the inline admin JS for the product-template panel.
 *
 * Runs on `admin_footer` (hooked in product-template-fields.php) so it appears
 * after the product meta-box markup. Vanilla JS only — no jQuery.
 *
 * @return void
 */
function sgs_product_template_inline_script(): void {
	// Only on the product edit screen.
	$screen = get_current_screen();
	if ( ! $screen || 'product' !== $screen->post_type || 'post' !== $screen->base ) {
		return;
	}
	if ( ! current_user_can( 'manage_woocommerce' ) ) { // phpcs:ignore WordPress.WP.Capabilities.Unknown -- manage_woocommerce is a registered WooCommerce capability.
		return;
	}
	?>
	<script>
	(function () {
		'use strict';

		function sgsTplInit() {
			var dataEl = document.getElementById('sgs-template-data');
			if (!dataEl) { return; }
			var cfg;
			try {
				cfg = JSON.parse(dataEl.textContent || dataEl.innerText || '{}');
			} catch (parseErr) {
				// A malformed data element must not silently kill all bindings.
				console.error('SGS template panel: malformed sgs-template-data element - bindings disabled.', parseErr);
				return;
			}
			if (!cfg.productId) { return; }
			var strings = cfg.strings || {};

			var restRoot  = cfg.restRoot;
			var nonce     = cfg.nonce;
			var productId = cfg.productId;

			function apiFetch(method, url, body) {
				var opts = {
					method: method,
					headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce }
				};
				if (body) { opts.body = JSON.stringify(body); }
				return fetch(url, opts).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, status: r.status, data: d }; }); });
			}

			function setMsg(elId, text, isError) {
				var el = document.getElementById(elId);
				if (!el) { return; }
				el.style.display = 'inline';
				el.style.color   = isError ? '#c00' : '#0a6';
				el.textContent   = text; // textContent only — never innerHTML with server data.
			}

			// ── Save as template ──────────────────────────────────────────────────
			var saveBtn = document.getElementById('sgs_template_save_btn');
			if (saveBtn) {
				saveBtn.addEventListener('click', function () {
					var name = (document.getElementById('sgs_template_save_name') || {}).value || '';
					name = name.trim();
					if (!name) { setMsg('sgs_template_save_msg', strings.enterName, true); return; }
					saveBtn.disabled = true;
					setMsg('sgs_template_save_msg', strings.saving, false);
					apiFetch('POST', restRoot + '/product-templates', { product_id: productId, title: name })
						.then(function (res) {
							saveBtn.disabled = false;
							if (res.ok) {
								setMsg('sgs_template_save_msg', strings.saved, false);
							} else {
								var msg = (res.data && res.data.message) ? res.data.message : strings.saveFailed + ' (' + res.status + ')';
								setMsg('sgs_template_save_msg', msg, true);
							}
						})
						.catch(function (e) { saveBtn.disabled = false; setMsg('sgs_template_save_msg', strings.networkError + ' ' + e.message, true); });
				});
			}

			// ── Export (fetch with nonce header → Blob download) ─────────────────
			var applySelect = document.getElementById('sgs_template_apply_select');
			var exportLink  = document.getElementById('sgs_template_export_link');
			function updateExportLink() {
				if (!applySelect || !exportLink) { return; }
				var opt = applySelect.options[applySelect.selectedIndex];
				exportLink.style.display = (opt && opt.getAttribute('data-export-url')) ? 'inline' : 'none';
			}
			if (applySelect && exportLink) {
				applySelect.addEventListener('change', updateExportLink);
				updateExportLink();
				exportLink.addEventListener('click', function (ev) {
					ev.preventDefault();
					var opt   = applySelect.options[applySelect.selectedIndex];
					var url   = opt ? opt.getAttribute('data-export-url') : '';
					var tplId = applySelect.value;
					if (!url) { return; }
					fetch(url, { headers: { 'X-WP-Nonce': nonce } })
						.then(function (r) {
							if (!r.ok) { throw new Error(strings.exportFailed + ' (' + r.status + ')'); }
							return r.text();
						})
						.then(function (text) {
							var blob = new Blob([text], { type: 'application/json' });
							var a    = document.createElement('a');
							a.href     = URL.createObjectURL(blob);
							a.download = 'sgs-template-' + tplId + '.json';
							document.body.appendChild(a);
							a.click();
							document.body.removeChild(a);
							URL.revokeObjectURL(a.href);
						})
						.catch(function (e) { setMsg('sgs_template_apply_msg', e.message, true); });
				});
			}

			// ── Two-step apply: dry-run → inline confirm box → live apply ────────
			var previewBtn  = document.getElementById('sgs_template_preview_btn');
			var confirmBox  = document.getElementById('sgs_template_confirm_box');
			var confirmSum  = document.getElementById('sgs_template_confirm_summary');
			var confirmBtn  = document.getElementById('sgs_template_confirm_apply_btn');
			var cancelBtn   = document.getElementById('sgs_template_confirm_cancel_btn');
			var priceInput  = document.getElementById('sgs_template_starting_price');

			function hideConfirmBox() {
				if (confirmBox) { confirmBox.style.display = 'none'; }
			}

			if (previewBtn && applySelect && confirmBox && confirmSum) {
				previewBtn.addEventListener('click', function () {
					var tplId = parseInt(applySelect.value, 10);
					if (!tplId) { setMsg('sgs_template_apply_msg', strings.selectTemplate, true); return; }

					previewBtn.disabled = true;
					hideConfirmBox();
					setMsg('sgs_template_apply_msg', strings.loadingPreview, false);

					apiFetch('POST', restRoot + '/product-templates/' + tplId + '/apply', { product_id: productId, confirm: false })
						.then(function (res) {
							previewBtn.disabled = false;
							if (!res.ok) {
								var msg = (res.data && res.data.message) ? res.data.message : strings.previewFailed + ' (' + res.status + ')';
								setMsg('sgs_template_apply_msg', msg, true);
								return;
							}
							var d     = res.data;
							var lines = [];
							if (d.would_provision) {
								d.would_provision.forEach(function (a) {
									lines.push(a.attribute + ': ' + a.term_count + ' term(s) (' + (a.term_names || []).join(', ') + ')');
								});
							}
							if (d.presentation_fields && d.presentation_fields.length) {
								lines.push(strings.presentationFields + ' ' + d.presentation_fields.join(', '));
							}
							if (d.not_carried && d.not_carried.length) {
								lines.push(strings.notCarried + ' ' + d.not_carried.join('; '));
							}
							if (d.starting_price_note) { lines.push(d.starting_price_note); }

							confirmSum.textContent = lines.join('\n'); // textContent — server data never hits innerHTML.
							confirmBox.dataset.templateId = String(tplId);
							confirmBox.style.display = 'block';
							setMsg('sgs_template_apply_msg', strings.reviewPreview, false);
						})
						.catch(function (e) { previewBtn.disabled = false; setMsg('sgs_template_apply_msg', strings.networkError + ' ' + e.message, true); });
				});
			}

			if (confirmBtn && confirmBox) {
				confirmBtn.addEventListener('click', function () {
					var tplId = parseInt(confirmBox.dataset.templateId || '0', 10);
					if (!tplId) { hideConfirmBox(); return; }

					var applyBody = { product_id: productId, confirm: true };
					var price     = priceInput ? priceInput.value.trim() : '';
					if (price !== '') { applyBody.starting_price = price; }

					confirmBtn.disabled = true;
					setMsg('sgs_template_apply_msg', strings.applying, false);
					apiFetch('POST', restRoot + '/product-templates/' + tplId + '/apply', applyBody)
						.then(function (res) {
							confirmBtn.disabled = false;
							hideConfirmBox();
							if (res.ok) {
								setMsg('sgs_template_apply_msg', res.data.message || strings.applied, false);
							} else {
								var em = (res.data && res.data.message) ? res.data.message : strings.applyFailed + ' (' + res.status + ')';
								setMsg('sgs_template_apply_msg', em, true);
							}
						})
						.catch(function (e) { confirmBtn.disabled = false; hideConfirmBox(); setMsg('sgs_template_apply_msg', strings.networkError + ' ' + e.message, true); });
				});
			}

			if (cancelBtn) {
				cancelBtn.addEventListener('click', function () {
					hideConfirmBox();
					setMsg('sgs_template_apply_msg', strings.applyCancelled, false);
				});
			}

			// ── Import ────────────────────────────────────────────────────────────
			var importBtn = document.getElementById('sgs_template_import_btn');
			if (importBtn) {
				importBtn.addEventListener('click', function () {
					var raw = (document.getElementById('sgs_template_import_json') || {}).value || '';
					raw = raw.trim();
					if (!raw) { setMsg('sgs_template_import_msg', strings.pasteJson, true); return; }

					var parsed;
					try { parsed = JSON.parse(raw); } catch (e) { setMsg('sgs_template_import_msg', strings.invalidJson + ' ' + e.message, true); return; }

					importBtn.disabled = true;
					setMsg('sgs_template_import_msg', strings.importing, false);
					apiFetch('POST', restRoot + '/product-templates/import', { envelope: parsed })
						.then(function (res) {
							importBtn.disabled = false;
							if (res.ok) {
								setMsg('sgs_template_import_msg', strings.imported, false);
							} else {
								var errData = res.data || {};
								var msg = errData.message || strings.importFailed + ' (' + res.status + ')';
								if (errData.data && errData.data.errors) {
									msg += ' ' + errData.data.errors.join('; ');
								}
								setMsg('sgs_template_import_msg', msg, true);
							}
						})
						.catch(function (e) { importBtn.disabled = false; setMsg('sgs_template_import_msg', strings.networkError + ' ' + e.message, true); });
				});
			}
		} // sgsTplInit

		// readyState guard: DOMContentLoaded may have already fired.
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', sgsTplInit);
		} else {
			sgsTplInit();
		}
	}());
	</script>
	<?php
}
