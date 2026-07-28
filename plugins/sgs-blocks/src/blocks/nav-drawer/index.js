import { registerBlockType, registerBlockVariation } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import Save from './save';
import variations from './variations';
import './style.css';
import './editor.css';

registerBlockType( metadata.name, {
	edit: Edit,
	save: Save,
} );

// Seven desktop-variant presets (design gate 2026-07-28) — see variations.js.
variations.forEach( ( variation ) => registerBlockVariation( metadata.name, variation ) );
