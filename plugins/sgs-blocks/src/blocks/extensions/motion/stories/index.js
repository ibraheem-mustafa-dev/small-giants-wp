/**
 * The per-effect canvas stories (Spec 38A §11, Spec 38 §9). Each story file registers its own canvas filter on import;
 * `includes/motion/data/canvas-stories.json` lists every story and whether it needs the effect's runtime stylesheet in
 * the canvas, which `includes/motion/class-sgs-motion-story-styles.php` enqueues in the editor only.
 *
 * @package
 */

import manifest from '../../../../../includes/motion/data/canvas-stories.json';
import './grid-dots';

/**
 * The effects that have a canvas story.
 *
 * @return {string[]} The effect slugs, from the shipped manifest.
 */
export function canvasStories() {
	return Object.keys( manifest.stories || {} );
}
