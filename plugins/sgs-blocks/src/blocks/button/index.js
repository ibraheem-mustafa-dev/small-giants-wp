import { registerBlockType, registerBlockVariation } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import save from './save';
import { STARTER_PRESETS, presetLabel, presetNames } from './preset-names';
import './style.css';
import './editor.css';

registerBlockType( metadata.name, { edit: Edit, save } );

// A site's own preset names (settings.custom.buttonPresets, on a site that opted in) are variations beside the starters
// block.json declares, so the inserter and "Transform to variation" offer each one.
presetNames()
	.filter( ( name ) => ! STARTER_PRESETS.includes( name ) )
	.forEach( ( name ) =>
		registerBlockVariation( metadata.name, {
			name,
			title: presetLabel( name ),
			description: `The site's ${ presetLabel( name ).toLowerCase() } button preset.`,
			scope: [ 'block', 'transform' ],
			isActive: ( attributes ) => name === attributes.inheritStyle,
			attributes: { inheritStyle: name },
		} )
	);
