/**
 * Motion targets for the editor-canvas emitter (Spec 38A §6.2, §6.5): the JS twin of
 * `includes/motion/class-sgs-motion-targets.php::resolve()`. A target is `root`, a part the block declares in
 * `supports.sgs.elements` (its declared `selector`, else `sgs-<slug>__<part>`; an `isWrapper` part is the root; a part
 * marked `"motion": false` is not a target; a part resolving to the container wrapper's band class is the root's direct
 * child band only), or a cloning-only `custom:<n>` whose stored selector is prefixed by the scoped root (refused without
 * a review row or with a selector that could leave the root, as `Sgs_Motion_Custom_Target` refuses it).
 *
 * The elements map is the registered block type's `supports.sgs.elements`, the same block.json source the PHP side
 * reads through the block type registry.
 *
 * @package SGS\Blocks
 */

const DECLARED_RE = /^\.[A-Za-z][A-Za-z0-9_-]*( \.[A-Za-z][A-Za-z0-9_-]*)*$/;

// A custom target's selector rules, copied from their two twins (src/ cannot import from scripts/), which must change
// together: scripts/computed-route/lib/motion-validate.mjs::selectorProblem and
// includes/motion/class-sgs-motion-custom-target.php::Sgs_Motion_Custom_Target::is_scoped. The schema's longest
// selector, an allow-list of the characters a scoped selector needs, and a deny-list of every character that could end
// the rule or the style block.
const CUSTOM_MAX_LENGTH = 200;
const CUSTOM_ALLOWED = /^[A-Za-z0-9_\-.#:\[\]="' >+~()*]+$/;
const CUSTOM_DENIED = /[<{};\\@,/]/;

/**
 * Whether a custom element carries a complete review row (`review.draftNode` and `review.reason`, non-empty text).
 *
 * @param {Object} element The custom element.
 * @return {boolean} True when reviewed.
 */
export function isReviewed( element ) {
	const review =
		element?.review && typeof element.review === 'object'
			? element.review
			: {};
	return [ 'draftNode', 'reason' ].every(
		( key ) =>
			typeof review[ key ] === 'string' && review[ key ].trim() !== ''
	);
}

/**
 * Whether a selector is one selector that stays inside the block root once prefixed.
 *
 * @param {string} selector Trimmed selector.
 * @return {boolean} True when scoped.
 */
export function isScoped( selector ) {
	if ( selector === '' || selector.length > CUSTOM_MAX_LENGTH ) {
		return false;
	}
	if ( ! CUSTOM_ALLOWED.test( selector ) || CUSTOM_DENIED.test( selector ) ) {
		return false;
	}
	if ( /^(?:html|body|:root)(?![A-Za-z0-9_-])/i.test( selector ) ) {
		return false;
	}
	return ! /^[+~]/.test( selector );
}

/**
 * The declared parts that can be motion targets: part key => isWrapper.
 *
 * @param {Object} elements `supports.sgs.elements`.
 * @return {Object<string,boolean>} Parts.
 */
export function motionParts( elements ) {
	const out = {};
	Object.entries(
		elements && typeof elements === 'object' ? elements : {}
	).forEach( ( [ key, spec ] ) => {
		const isObject = spec && typeof spec === 'object';
		if (
			isObject &&
			Object.prototype.hasOwnProperty.call( spec, 'motion' ) &&
			spec.motion === false
		) {
			return;
		}
		out[ key ] = Boolean( isObject && spec.isWrapper );
	} );
	return out;
}

/**
 * The selector a part declares, relative to the root, or '' when none or unsafe.
 *
 * @param {Object} elements `supports.sgs.elements`.
 * @param {string} part     Part key.
 * @return {string} Selector.
 */
export function declaredSelector( elements, part ) {
	const spec = elements?.[ part ];
	if ( ! spec || typeof spec !== 'object' || typeof spec.selector !== 'string' ) {
		return '';
	}
	const selector = spec.selector.trim();
	return DECLARED_RE.test( selector ) ? selector : '';
}

/**
 * The BEM class a block's part carries.
 *
 * @param {string} blockName Block name (`sgs/<slug>`).
 * @param {string} part      Part key.
 * @return {string} Class.
 */
export function partClass( blockName, part ) {
	const at = blockName.indexOf( '/' );
	const slug = at === -1 ? blockName : blockName.slice( at + 1 );
	return `sgs-${ slug }__${ part }`;
}

/**
 * The classes and tag of a selector's last compound, the twin of `Sgs_Motion_Custom_Target::last_compound()`: how the
 * markup pass finds a custom or declared-selector target's elements (pseudo-classes, pseudo-elements and attribute
 * tests are left out, and the descendant context before the last compound is checked only by the emitted CSS).
 *
 * @param {string} selector A schema-valid selector.
 * @return {{classes:string[],tag:(string|null)}} Classes and upper-case tag.
 */
export function lastCompound( selector ) {
	const parts = selector.split( /\s*[>+~]\s*|\s+/ );
	const compound = ( parts[ parts.length - 1 ] || '' ).replace(
		/::?[a-zA-Z-]+(\([^)]*\))?|\[[^\]]*\]/g,
		''
	);
	const classes = [ ...compound.matchAll( /\.([A-Za-z0-9_-]+)/g ) ].map( ( m ) => m[ 1 ] );
	const tag = /^([a-zA-Z][a-zA-Z0-9]*)/.exec( compound );
	return { classes, tag: tag ? tag[ 1 ].toUpperCase() : null };
}

const shape = ( selector, isRoot, classes, tag, child = false ) => ( {
	selector,
	root: isRoot,
	classes,
	tag,
	child,
} );

/**
 * Resolve one target to its scoped selector and its markup matcher (the shape of `Sgs_Motion_Targets::resolve()`'s
 * `match`): `root` for the block root, else the `classes` (and `tag`) an element must carry, `child` when only a direct
 * child of the root matches (the container wrapper's band).
 *
 * @param {string} blockName Block name.
 * @param {Object} elements  `supports.sgs.elements`.
 * @param {string} root      The scoped root selector (`.sgs-m-<hash>` on the page).
 * @param {string} target    Target key.
 * @param {Object} element   The stored element.
 * @return {{selector:string,root:boolean,classes:string[],tag:(string|null),child:boolean}|null} Null for a target the
 *         block does not declare, or a refused custom target.
 */
export function resolveTarget( blockName, elements, root, target, element ) {
	if ( target === 'root' ) {
		return shape( root, true, [], null );
	}
	if ( target.startsWith( 'custom:' ) ) {
		const selector = typeof element?.selector === 'string' ? element.selector.trim() : '';
		if ( ! isReviewed( element ) || ! isScoped( selector ) ) {
			return null;
		}
		const last = lastCompound( selector );
		return shape( `${ root } ${ selector }`, false, last.classes, last.tag );
	}
	const parts = motionParts( elements );
	if ( ! Object.prototype.hasOwnProperty.call( parts, target ) ) {
		return null;
	}
	if ( parts[ target ] ) {
		return shape( root, true, [], null );
	}
	const declared = declaredSelector( elements, target );
	const cls = declared !== '' ? declared.slice( 1 ) : partClass( blockName, target );
	if ( bandClasses( blockName ).includes( cls ) ) {
		return shape( `${ root } > .${ cls }`, false, [ cls ], null, true );
	}
	if ( declared !== '' ) {
		return shape( `${ root } ${ declared }`, false, lastCompound( declared ).classes, null );
	}
	return shape( `${ root } .${ cls }`, false, [ cls ], null );
}

/**
 * The classes of the band the container wrapper prints as the root's direct child.
 *
 * @param {string} blockName Block name.
 * @return {string[]} Classes.
 */
export function bandClasses( blockName ) {
	return [ 'sgs-container__inner', partClass( blockName, 'content-band' ) ];
}

/**
 * Whether the motion attribute holds a layer on a part that resolves to the wrapper's band, so the band must render
 * for the layer to reach it: the twin of `Sgs_Motion_Targets::names_band()`.
 *
 * @param {Object} motion    The stored motion attribute.
 * @param {string} blockName Block name.
 * @param {Object} elements  `supports.sgs.elements`.
 * @return {boolean} True when a band part carries a layer.
 */
export function namesBand( motion, blockName, elements ) {
	const stored = motion?.elements && typeof motion.elements === 'object' ? motion.elements : {};
	return [ 'content-band', 'inner' ].some( ( part ) => {
		const value = stored[ part ];
		if ( ! value || ( typeof value === 'object' && Object.keys( value ).length === 0 ) ) {
			return false;
		}
		const declared = declaredSelector( elements, part );
		const cls = declared !== '' ? declared.slice( 1 ) : partClass( blockName, part );
		return bandClasses( blockName ).includes( cls );
	} );
}
