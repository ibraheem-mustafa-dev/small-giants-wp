/**
 * sgs/icon-list items that take their text and link from Site Info: the editor's twin of
 * includes/helpers-site-info-items.php::sgs_site_info_item(). The canvas and the item editor read the same
 * values the frontend prints, from `window.sgsBlocksData.siteInfo` (Sgs_Site_Info_Binding::editor_site_info())
 * and `window.sgsBlocksData.siteInfoHours` (Sgs_Site_Info_Binding::editor_hours()).
 *
 * @package SGS\Blocks
 */

import { __ } from "@wordpress/i18n";

/** Item `siteInfoSource` values, matching sgs_site_info_item_sources() in PHP. */
export const SITE_INFO_SOURCES = ["phone", "email", "address", "hours"];

/** The Content select's options; '' is today's typed text. */
export const CONTENT_SOURCE_OPTIONS = [
  { label: __("Typed text", "sgs-blocks"), value: "" },
  { label: __("Phone (from Site Info)", "sgs-blocks"), value: "phone" },
  { label: __("Email (from Site Info)", "sgs-blocks"), value: "email" },
  { label: __("Address (from Site Info)", "sgs-blocks"), value: "address" },
  { label: __("Opening hours (from Site Info)", "sgs-blocks"), value: "hours" },
];

/**
 * Whether the item reads Site Info.
 *
 * @param {Object} item List item.
 * @return {boolean} True for a known `siteInfoSource`.
 */
export function usesSiteInfo(item) {
  return SITE_INFO_SOURCES.includes(item?.siteInfoSource);
}

/**
 * What an item shows now, as the frontend would print it.
 *
 * @param {Object} item     List item.
 * @param {Object} siteInfo `window.sgsBlocksData.siteInfo`.
 * @param {Object} hours    `window.sgsBlocksData.siteInfoHours` ({ text, link }).
 * @return {{text:string, lines:string[], url:string, hidden:boolean, invalid:boolean}} `hidden` is true when Site Info
 *         holds no usable value, which hides the item on the frontend; `invalid` marks an email that is_email() would
 *         refuse. `lines` is the text split where the site breaks a line (the address), `text` joins them with "\n".
 */
export function siteInfoItemPreview(item, siteInfo, hours) {
  const source = item?.siteInfoSource;
  const link = !!item?.siteInfoLink;
  const entry = (key) =>
    siteInfo && "object" === typeof siteInfo ? siteInfo[key] : undefined;
  let text = "";
  let url = "";
  let invalid = false;
  let lines = null;

  if ("phone" === source) {
    text = (entry("phone")?.value || "").trim();
    url = text ? "tel:" + text.replace(/[^0-9+]/g, "") : "";
  } else if ("email" === source) {
    text = (entry("email")?.value || "").trim();
    // The site hides an address is_email() refuses, so the canvas treats it like a blank one.
    if (text && !isValidEmail(text)) {
      invalid = true;
      text = "";
    }
    url = text ? "mailto:" + text : "";
  } else if ("address" === source) {
    // The site prints each <br> as a line break.
    lines = (entry("address")?.value || "")
      .split(/<br\s*\/?>/i)
      .map((line) => line.trim())
      .filter(Boolean);
    text = lines.join("\n");
    url = text && link ? entry("address")?.link || "" : "";
  } else if ("hours" === source) {
    text = hours?.text || "";
    url = text && link ? item.url || hours?.link || "" : "";
  }
  return { text, lines: lines || (text ? [text] : []), url, hidden: "" === text, invalid };
}

/**
 * A close twin of WordPress's is_email(): six characters or more, one "@", no spaces, a dotted domain.
 *
 * @param {string} email Address.
 * @return {boolean} True when the site would show it.
 */
export function isValidEmail(email) {
  return email.length >= 6 && /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email);
}

/**
 * The item after its Content select changes to `source`. An address or opening-hours item links by default (to the
 * map / the Google profile); phone and email always link, so the switch does not apply to them, and a `newTab` left
 * from an earlier typed or web link is dropped because a tel: or mailto: link never opens a tab.
 *
 * @param {Object} item   List item.
 * @param {string} source New `siteInfoSource` ('' for typed text).
 * @return {Object} The updated item.
 */
export function contentSourcePatch(item, source) {
  const next = {
    ...item,
    siteInfoSource: source,
    siteInfoLink: "address" === source || "hours" === source ? true : undefined,
  };
  if ("phone" === source || "email" === source) next.newTab = undefined;
  return next;
}
