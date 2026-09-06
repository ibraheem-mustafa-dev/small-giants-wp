/**
 * BOTH signals present: `transform` scope (so the switcher appears on the block
 * toolbar AFTER insertion) and `isActive` naming the attribute (so the switcher
 * can tell which variation is currently selected).
 */
const variations = [
	{
		name: 'plain',
		title: 'Plain',
		scope: [ 'inserter', 'transform' ],
		isActive: [ 'variantPreset' ],
		attributes: { variantPreset: 'plain' },
	},
	{
		name: 'bold',
		title: 'Bold',
		scope: [ 'inserter', 'transform' ],
		isActive: [ 'variantPreset' ],
		attributes: { variantPreset: 'bold' },
	},
];
export default variations;
