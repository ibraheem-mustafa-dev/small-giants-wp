import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import Save from './save';
import './style.css';
import './editor.css';
import { SVG, Path } from '@wordpress/primitives';
import { brandBySlug, brandSvgPaths } from '../../utils/brand-registry';

// The inserter icon: the registry's WhatsApp mark (includes/data/brand-registry.json) in SGS teal.
const mark = brandSvgPaths( brandBySlug( 'whatsapp' ) );
const whatsappCtaIcon = {
	src: (
		<SVG viewBox={ mark.viewBox } xmlns="http://www.w3.org/2000/svg">
			{ mark.paths.map( ( p ) => (
				<Path key={ p.d } d={ p.d } />
			) ) }
		</SVG>
	),
	foreground: '#0F7E80',
};

registerBlockType( metadata.name, {
	icon: whatsappCtaIcon,
	edit: Edit,
	save: Save,
} );
