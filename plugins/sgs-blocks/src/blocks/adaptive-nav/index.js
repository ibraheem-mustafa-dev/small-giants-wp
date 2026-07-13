/**
 * SGS Adaptive Navigation — block registration.
 *
 * A single menu source that renders a desktop navigation bar and collapses
 * to the off-canvas drawer at a configurable breakpoint. Lives inside
 * sgs/site-header-row, replacing core/navigation in the header.
 */
import { registerBlockType } from '@wordpress/blocks';
import { menu as icon } from '@wordpress/icons';
import metadata from './block.json';
import Edit from './edit';
import save from './save';
import './style.css';
import './editor.css';

registerBlockType( metadata.name, {
	icon,
	edit: Edit,
	save,
} );
