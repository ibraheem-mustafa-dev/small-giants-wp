'use strict';
// Mock for @wordpress/data
module.exports = {
	useSelect: jest.fn( ( fn ) => fn ? fn( jest.fn( () => undefined ) ) : undefined ),
	useDispatch: jest.fn( () => ( {
		updateBlockAttributes: jest.fn(),
		insertBlocks: jest.fn(),
		removeBlock: jest.fn(),
		selectBlock: jest.fn(),
	} ) ),
	select: jest.fn( () => ( {} ) ),
	dispatch: jest.fn( () => ( {} ) ),
	withSelect: jest.fn( () => ( WrappedComponent ) => WrappedComponent ),
	withDispatch: jest.fn( () => ( WrappedComponent ) => WrappedComponent ),
	createRegistrySelector: jest.fn( ( fn ) => fn ),
	subscribe: jest.fn(),
	registerStore: jest.fn(),
	combineReducers: jest.fn( () => ( state ) => state ),
	createSelector: jest.fn( ( fn ) => fn ),
	createReduxStore: jest.fn( () => ( {} ) ),
	register: jest.fn(),
};
