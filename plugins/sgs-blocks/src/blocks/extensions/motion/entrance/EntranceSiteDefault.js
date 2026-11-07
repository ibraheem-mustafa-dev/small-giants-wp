/**
 * The site reveal default in the Entrance and reveal panel (Spec 38A §8.1; FR-38A-63): when the client's theme holds
 * `entrance.reveal` rules and this block matches one, the panel names the rule and its inherited values and offers the
 * one exception, "Turn off the site reveal", stored as `entrance.off` on the root element. A block's own entrance
 * (the preset above) always wins, so the toggle shows only while the block stores none.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { useSettings } from '@wordpress/block-editor';
import { useDispatch, useSelect } from '@wordpress/data';
import { getBlockType } from '@wordpress/blocks';
import BooleanAtom from '../../../../components/motion/BooleanAtom';
import { MOTION_ATTRIBUTE_NAME } from '../register';
import { elementOf, isObject, withElement } from '../layers/layer-lists';
import { EDITOR_STORE } from './entrance-facts';
import { matchingRule, ruleSummary } from './site-default';

/**
 * @param {Object}           props
 * @param {string}           props.blockName The block's name.
 * @param {string}           props.clientId  The block's client id.
 * @param {Object|undefined} props.motion    The block's motion value.
 * @param {boolean}          props.hasOwn    Whether the block stores its own entrance.
 * @return {Element|null} The section, or null when the site has no default for this block.
 */
export default function EntranceSiteDefault( {
	blockName,
	clientId,
	motion,
	hasOwn,
} ) {
	const [ custom ] = useSettings( 'custom' );
	const { updateBlockAttributes } = useDispatch( EDITOR_STORE );
	const tokens = isObject( custom?.entrance ) ? custom.entrance : {};
	const facts = useSelect(
		( select ) => {
			const store = select( EDITOR_STORE );
			const rootId = store.getBlockRootClientId?.( clientId );
			const index = store.getBlockIndex?.( clientId ) ?? 0;
			const previousId = index
				? store.getBlockOrder?.( rootId )?.[ index - 1 ]
				: null;
			const previous = previousId ? store.getBlock?.( previousId ) : null;
			const parentName = rootId ? store.getBlockName?.( rootId ) : null;
			return {
				attributes: store.getBlockAttributes?.( clientId ),
				afterH2:
					previous?.name === 'sgs/heading' &&
					( previous.attributes?.level ?? 'h2' ) === 'h2',
				parent: rootId
					? {
							attributes: store.getBlockAttributes?.( rootId ),
							defaults: getBlockType( parentName )?.attributes,
							childCount:
								store.getBlockOrder?.( rootId )?.length || 0,
					  }
					: {},
			};
		},
		[ clientId ]
	);
	const rule = matchingRule( {
		blockName,
		attributes: facts.attributes,
		defaults: getBlockType( blockName )?.attributes,
		afterH2: facts.afterH2,
		parent: facts.parent,
		reveal: tokens.reveal,
	} );
	if ( ! rule || hasOwn ) {
		return null;
	}
	const root = elementOf( motion, 'root' );
	const off = root.entrance?.off === true;
	const toggle = ( next ) => {
		const entrance = {
			...( isObject( root.entrance ) ? root.entrance : {} ),
		};
		if ( next ) {
			entrance.off = true;
		} else {
			delete entrance.off;
		}
		const element = { ...root, entrance };
		if ( ! Object.keys( entrance ).length ) {
			delete element.entrance;
		}
		updateBlockAttributes( clientId, {
			[ MOTION_ATTRIBUTE_NAME ]: withElement( motion, 'root', element ),
		} );
	};
	let message = __(
		'This block reveals with the site item reveal, unless the page opens with it.',
		'sgs-blocks'
	);
	if ( off ) {
		message = __(
			'This block does not use the site reveal.',
			'sgs-blocks'
		);
	} else if ( 'heading' === rule ) {
		message = __(
			'This block reveals with the site heading reveal, unless the page opens with it.',
			'sgs-blocks'
		);
	}
	return (
		<div className="sgs-motion-entrance__site-default">
			<h4 className="sgs-motion-fields__heading">
				{ __( 'Site reveal', 'sgs-blocks' ) }
			</h4>
			<p className="sgs-motion-atom__help">{ message }</p>
			{ ! off && (
				<ul className="sgs-motion-atom__help">
					{ ruleSummary( tokens.reveal[ rule ], tokens ).map(
						( line ) => (
							<li key={ line }>{ line }</li>
						)
					) }
				</ul>
			) }
			<BooleanAtom
				label={ __( 'Turn off the site reveal', 'sgs-blocks' ) }
				value={ off }
				onChange={ ( next ) => toggle( next === true ) }
			/>
		</div>
	);
}
