/**
 * SGS Option Picker — block registration.
 *
 * Dynamic block: save() returns null; render.php handles all frontend output.
 */
import { registerBlockType } from '@wordpress/blocks';
import { SVG, Path, Rect } from '@wordpress/primitives';
import metadata from './block.json';
import Edit from './edit';
import Save from './save';
import './style.css';
import './editor.css';

const SGS_TEAL = '#0F7E80';

/**
 * Block icon — three pill-shaped options in a row, the middle one highlighted.
 */
const optionPickerIcon = {
	src: (
		<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
			<Rect x="1" y="8" width="6" height="8" rx="4" fillOpacity="0.35" />
			<Rect x="9" y="8" width="6" height="8" rx="4" />
			<Rect x="17" y="8" width="6" height="8" rx="4" fillOpacity="0.35" />
		</SVG>
	),
	foreground: SGS_TEAL,
};

registerBlockType( metadata.name, {
	icon: optionPickerIcon,
	edit: Edit,
	save: Save,
} );
