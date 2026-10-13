/**
 * Editor-canvas twin of the shared pause / play button (includes/helpers-motion-pause.php).
 *
 * Same classes and icons as the frontend markup, so assets/css/motion-pause.css and the block's
 * own `{block}__pause` rule paint it in the canvas. Decorative here (aria-hidden, not focusable):
 * nothing moves in the editor, so there is nothing to pause; it only shows where the button sits.
 */

/**
 * @param {Object} props
 * @param {string} props.block       The block's root class, e.g. 'sgs-notice-banner'.
 * @param {string} [props.placement] 'inline' (default) or 'overlay-end'.
 * @return {Element} The preview.
 */
export default function MotionPausePreview( { block, placement = 'inline' } ) {
	return (
		<span
			className={ `sgs-motion-pause sgs-motion-pause--${ placement } ${ block }__pause` }
			aria-hidden="true"
		>
			<svg className="sgs-motion-pause__icon sgs-motion-pause__icon--pause" viewBox="0 0 24 24" width="20" height="20" focusable="false">
				<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" />
			</svg>
			<svg className="sgs-motion-pause__icon sgs-motion-pause__icon--play" viewBox="0 0 24 24" width="20" height="20" focusable="false">
				<path d="M8 5v14l11-7z" fill="currentColor" />
			</svg>
		</span>
	);
}
