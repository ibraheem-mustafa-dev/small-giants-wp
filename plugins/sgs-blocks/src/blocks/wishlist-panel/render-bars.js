/**
 * SGS Wishlist Panel — the guest prompt and the logged-in alerts/share bar.
 *
 * Grid/list layouts only (never strip, never the shared-list view). Every
 * visible string comes from `labels.js::readPanelData()` — never hard-coded
 * here.
 *
 * @package
 */
import { escapeHtml } from './render-rows';

/**
 * The guest banner: "Sign in to keep your saved items…" + a Sign in link.
 *
 * @param {Object} labels `labels.js::readPanelData()` output.
 * @return {string} Bar markup.
 */
export function guestPromptHtml( labels ) {
	return (
		'<div class="sgs-wishlist-panel__guest-prompt">' +
		`<p>${ escapeHtml( labels.guestPromptText ) }</p>` +
		`<a class="sgs-wishlist-panel__sign-in wp-element-button" href="${ escapeHtml(
			labels.signInUrl
		) }">${ escapeHtml( labels.signInLabel ) }</a>` +
		'</div>'
	);
}

/**
 * One alert opt-in checkbox row, with its own privacy-policy link.
 *
 * @param {Object}  params
 * @param {string}  params.name    `price` or `stock` — feeds the checkbox id/data-alert.
 * @param {string}  params.label   The opt-in's visible label.
 * @param {boolean} params.checked Current opt-in state.
 * @param {Object}  labels         `labels.js::readPanelData()` output.
 * @return {string} Row markup.
 */
function alertRowHtml( { name, label, checked }, labels ) {
	const id = `sgs-wishlist-alert-${ name }`;
	const privacyLink = labels.privacyUrl
		? ` <a class="sgs-wishlist-panel__privacy-link" href="${ escapeHtml(
				labels.privacyUrl
		  ) }">${ escapeHtml( labels.privacyLinkLabel ) }</a>`
		: '';
	return (
		'<div class="sgs-wishlist-panel__alert-row">' +
		`<input type="checkbox" id="${ id }" data-sgs-wishlist-alert="${ name }" ${
			checked ? 'checked' : ''
		} />` +
		`<label for="${ id }">${ escapeHtml( label ) }</label>` +
		privacyLink +
		'</div>'
	);
}

/**
 * The logged-in alerts + share bar. Only the site-enabled features get a
 * row/control at all (the caller filters `features` before calling this).
 *
 * @param {Object}  params
 * @param {Object}  params.features {priceAlerts, stockAlerts, sharing} — site switches.
 * @param {Object}  params.alerts   {price, stock} — this shopper's opt-ins.
 * @param {Object}  params.share    {enabled, url} — this shopper's share state.
 * @param {Object}  labels          `labels.js::readPanelData()` output.
 * @return {string} Bar markup, or '' when no feature is enabled.
 */
export function alertsBarHtml( { features, alerts, share }, labels ) {
	if ( ! features?.priceAlerts && ! features?.stockAlerts && ! features?.sharing ) {
		return '';
	}

	let alertRows = '';
	if ( features.priceAlerts ) {
		alertRows += alertRowHtml(
			{ name: 'price', label: labels.alertsPriceLabel, checked: !! alerts?.price },
			labels
		);
	}
	if ( features.stockAlerts ) {
		alertRows += alertRowHtml(
			{ name: 'stock', label: labels.alertsStockLabel, checked: !! alerts?.stock },
			labels
		);
	}

	const shareHtml = features.sharing
		? '<div class="sgs-wishlist-panel__share">' +
		  `<button type="button" class="sgs-wishlist-panel__share-toggle" data-sgs-wishlist-share-toggle aria-pressed="${
				share?.enabled ? 'true' : 'false'
		  }">${ escapeHtml( labels.shareLabel ) }</button>` +
		  `<div class="sgs-wishlist-panel__share-controls" ${ share?.enabled ? '' : 'hidden' }>` +
		  `<input type="text" class="sgs-wishlist-panel__share-field" readonly value="${ escapeHtml(
				share?.url || ''
		  ) }" data-sgs-wishlist-share-field />` +
		  `<button type="button" data-sgs-wishlist-share-copy>${ escapeHtml(
				labels.shareCopyLabel
		  ) }</button>` +
		  `<button type="button" data-sgs-wishlist-share-regenerate>${ escapeHtml(
				labels.shareNewLinkLabel
		  ) }</button>` +
		  '</div>' +
		  '</div>'
		: '';

	return `<div class="sgs-wishlist-panel__bar">${ alertRows }${ shareHtml }</div>`;
}
