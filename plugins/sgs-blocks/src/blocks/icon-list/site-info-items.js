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
 * @return {{text:string, url:string, hidden:boolean}} `hidden` is true when Site Info holds no value, which hides
 *                                                      the item on the frontend.
 */
export function siteInfoItemPreview(item, siteInfo, hours) {
  const source = item?.siteInfoSource;
  const link = !!item?.siteInfoLink;
  const entry = (key) =>
    siteInfo && "object" === typeof siteInfo ? siteInfo[key] : undefined;
  let text = "";
  let url = "";

  if ("phone" === source) {
    text = (entry("phone")?.value || "").trim();
    url = text ? "tel:" + text.replace(/[^0-9+]/g, "") : "";
  } else if ("email" === source) {
    text = (entry("email")?.value || "").trim();
    url = text ? "mailto:" + text : "";
  } else if ("address" === source) {
    text = (entry("address")?.value || "").replace(/<br\s*\/?>/gi, ", ").trim();
    url = text && link ? entry("address")?.link || "" : "";
  } else if ("hours" === source) {
    text = hours?.text || "";
    url = text && link ? item.url || hours?.link || "" : "";
  }
  return { text, url, hidden: "" === text };
}
