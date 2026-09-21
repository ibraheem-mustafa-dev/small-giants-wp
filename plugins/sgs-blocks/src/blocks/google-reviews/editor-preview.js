/**
 * Google Reviews — editor canvas preview pieces.
 *
 * The canvas shows the block's REAL server render (`render.php`, through `<ServerSideRender>`
 * mounted in edit.js), not a hand-built stand-in: sample cards when "Sample reviews" is chosen,
 * the written reviews when there are some, live Google reviews when the site is connected.
 * Because the server is the one place that decides what is shown, the canvas cannot disagree
 * with the live page.
 *
 * This file holds the small pieces around that render:
 *  - `SampleNotice`: ONE short warning line above the preview, only for "Sample reviews".
 *  - `EmptyState`: passed to ServerSideRender as `EmptyResponsePlaceholder`. Shown only when the
 *    server renders nothing (no written reviews, no place ID, no live Google data), and says how
 *    to fix it.
 *  - `LoadingState` / `ErrorState`: so a slow or failed request never blanks or crashes the canvas.
 *
 * The `<ServerSideRender>` element itself stays in edit.js: check-editor-render-parity.js only
 * treats a block's attributes as "reflected in the canvas" when it can see that element there.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { Notice, Spinner } from '@wordpress/components';

/** One short line for the invented sample set. */
export function SampleNotice() {
	return (
		<Notice status="warning" isDismissible={ false } className="sgs-google-reviews__editor-notice">
			{ __( 'Sample reviews: these are invented examples. Replace them with real reviews before the page goes live.', 'sgs-blocks' ) }
		</Notice>
	);
}

/** Shown when the server renders nothing: says why, and the three ways to fix it. */
export function EmptyState() {
	return (
		<Notice status="info" isDismissible={ false } className="sgs-google-reviews__editor-notice">
			<p>
				{ __( 'This block shows nothing on the live site yet, because it has no real reviews to show. To fix that, do one of these:', 'sgs-blocks' ) }
			</p>
			<ul>
				<li>{ __( 'Add your own reviews in the "Written reviews" panel.', 'sgs-blocks' ) }</li>
				<li>{ __( 'Or set the Google Place ID and API key (Settings → SGS Google Reviews) so live reviews can load.', 'sgs-blocks' ) }</li>
				<li>{ __( 'Or choose "Sample reviews" in "Reviews source" to build the layout with example reviews.', 'sgs-blocks' ) }</li>
			</ul>
		</Notice>
	);
}

/** Shown while the preview request is in flight. */
export function LoadingState() {
	return (
		<div className="sgs-google-reviews__editor-loading">
			<Spinner />
		</div>
	);
}

/**
 * Shown when the preview request fails. Never throws, never blanks the canvas.
 *
 * @param {Object} props          Props from ServerSideRender.
 * @param {Object} props.response The failed response (`errorMsg` is the readable message).
 */
export function ErrorState( { response } ) {
	return (
		<Notice status="error" isDismissible={ false } className="sgs-google-reviews__editor-notice">
			{ response?.errorMsg || __( 'The reviews preview could not load.', 'sgs-blocks' ) }
		</Notice>
	);
}
