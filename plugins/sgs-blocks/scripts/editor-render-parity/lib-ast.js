/**
 * JSX AST helpers shared by the checks.
 */

'use strict';

function jsxOpeningName( openingElement ) {
	const n = openingElement.name;
	if ( ! n ) {
		return null;
	}
	if ( n.type === 'JSXIdentifier' ) {
		return n.name;
	}
	if ( n.type === 'JSXMemberExpression' ) {
		return n.property && n.property.name ? n.property.name : null;
	}
	return null;
}

function jsxAttrValueNode( openingElement, attrName ) {
	const attr = ( openingElement.attributes || [] ).find(
		( a ) => a.type === 'JSXAttribute' && a.name && a.name.name === attrName
	);
	return attr ? attr.value : null;
}

module.exports = {
	jsxAttrValueNode,
	jsxOpeningName,
};
