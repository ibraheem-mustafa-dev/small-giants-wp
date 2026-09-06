/**
 * NEGATIVE CONTROL for resolvedByVariationSwitcher().
 *
 * `isActive` IS present, but every scope is `inserter` only — no `transform`.
 * That is precisely the ORIGINAL sgs/nav-drawer defect: the look is chosen once
 * at insertion and can never be changed afterwards, so the client is stuck with
 * whatever they picked. The rule MUST still flag variantPreset here.
 *
 * If this fixture ever stops flagging, the transform-scope exemption has
 * widened into "any variations.js mentioning the attribute" and is overmatching.
 */
const variations = [
	{
		name: 'plain',
		title: 'Plain',
		scope: [ 'inserter' ],
		isActive: [ 'variantPreset' ],
		attributes: { variantPreset: 'plain' },
	},
	{
		name: 'bold',
		title: 'Bold',
		scope: [ 'inserter' ],
		isActive: [ 'variantPreset' ],
		attributes: { variantPreset: 'bold' },
	},
];
export default variations;
