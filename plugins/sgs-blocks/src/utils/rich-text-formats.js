/**
 * The shared rich-text format lists every SGS `<RichText>` passes as `allowedFormats` (Spec 02 FR-2-4, FR-2-5).
 *
 * One list per role, so a new toolbar format reaches every text element that should offer it by editing one line
 * here. Which field takes which list lives in `scripts/data/rich-text-format-roles.json`;
 * `scripts/survey-rich-text-formats.js --check` fails a RichText with an inline list or no `allowedFormats`.
 *
 * Every SGS format saves class-only markup (`sgs-highlight`, `sgs-inline-photo`), never inline style, which is why
 * core's text-colour, underline and inline-image formats are on none of these lists.
 */

/** Body copy: headings, paragraphs, quotes, descriptions. */
export const RICH_TEXT_BODY = Object.freeze( [
	'core/bold',
	'core/italic',
	'core/link',
	'core/strikethrough',
	'sgs/highlight',
	'sgs/inline-photo',
] );

/** Body copy printed inside an `<a>`, `<button>` or `<summary>`, where a nested link is invalid HTML. */
export const RICH_TEXT_BODY_NO_LINK = Object.freeze(
	RICH_TEXT_BODY.filter( ( name ) => 'core/link' !== name )
);

/** Short text whose fill, size or accessible name a stripe or photo would change (a button label). */
export const RICH_TEXT_EMPHASIS = Object.freeze( [
	'core/bold',
	'core/italic',
] );

/** Small tag text that may carry a link and nothing else. */
export const RICH_TEXT_LINK_ONLY = Object.freeze( [ 'core/link' ] );

/** Fields printed as plain text (`esc_html`), so no format would survive. */
export const RICH_TEXT_PLAIN = Object.freeze( [] );
