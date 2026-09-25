/**
 * SGS Local Time — static save.
 *
 * Dynamic block: render.php drives all frontend output (server-rendered so
 * no-JS and cached pages still show a correct time).
 * save() returns null per the SGS dynamic-block convention.
 *
 * @package SGS\Blocks
 */
export default function Save() {
	return null;
}
