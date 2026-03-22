import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import Save from './save';
import deprecated from './deprecated';
import './style.css';
import './editor.css';
import { noticeBannerIcon } from '../../utils';

registerBlockType( metadata.name, {
	icon: noticeBannerIcon,
	edit: Edit,
	save: Save,
	deprecated,
} );
