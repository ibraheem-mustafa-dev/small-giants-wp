/**
 * Shared WhatsApp glyph for the editor canvas (inline/floating/banner icon and the card variant's icon badge): the
 * registry's WhatsApp mark (includes/data/brand-registry.json), the same path render.php prints through
 * sgs_whatsapp_glyph_svg(). fill="currentColor", so CSS sets the colour.
 *
 * @package SGS\Blocks
 */

import { brandBySlug, brandSvgPaths } from '../../utils/brand-registry';

const MARK = brandSvgPaths( brandBySlug( 'whatsapp' ) );

export default function WhatsappIcon( { className = 'sgs-whatsapp-cta__icon', size = '' } ) {
	return (
		<svg
			className={ className }
			viewBox={ MARK.viewBox }
			width="24"
			height="24"
			style={ size ? { width: size, height: size } : undefined }
			fill="currentColor"
			aria-hidden="true"
		>
			{ MARK.paths.map( ( p ) => (
				<path key={ p.d } d={ p.d } />
			) ) }
		</svg>
	);
}
