/**
 * AuthoredText — the editor canvas's print of a typed rich value (a setting edited with
 * `SgsFreeTextField type="rich"`), the twin of `sgs_rich_text_kses()` on the front end.
 *
 * The markup goes through `@wordpress/dom`'s `safeHTML` (scripts, event handlers and `javascript:` URLs removed)
 * before it is inserted, so a pasted or imported value never reaches the canvas as live script. Use
 * `authoredTextPlain()` (src/utils/authored-text.js) where the canvas needs the words only (an `aria-label`, a title).
 *
 * @package SGS\Blocks
 */
import { safeHTML } from '@wordpress/dom';

/**
 * @param {Object}  props
 * @param {*}       props.value  The typed value (HTML string or plain text).
 * @param {string}  [props.as]   The element to print inside (default `span`).
 * @param {Object}  [props.rest] Any other prop goes to that element.
 * @return {JSX.Element} The element holding the sanitised markup.
 */
export default function AuthoredText( { value, as: Tag = 'span', ...rest } ) {
	return <Tag { ...rest } dangerouslySetInnerHTML={ { __html: safeHTML( String( value ?? '' ) ) } } />;
}
