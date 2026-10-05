'use strict';
// Mock for @wordpress/data
// A store as a selector callback sees it before anything resolves: every selector exists and returns undefined.
const emptyStore = () => new Proxy( {}, { get: ( target, key ) => ( 'then' === key ? undefined : () => undefined ) } );

module.exports = {
	useSelect: jest.fn( ( fn ) => fn ? fn( jest.fn( emptyStore ) ) : undefined ),
	useDispatch: jest.fn( () => ( {
		updateBlockAttributes: jest.fn(),
		insertBlocks: jest.fn(),
		removeBlock: jest.fn(),
		selectBlock: jest.fn(),
	} ) ),
	useRegistry: jest.fn( () => ( {
		select: jest.fn( () => ( {} ) ),
		dispatch: jest.fn( () => ( {} ) ),
		resolveSelect: jest.fn( () => ( {} ) ),
		subscribe: jest.fn( () => jest.fn() ),
	} ) ),
	resolveSelect: jest.fn( () => ( {} ) ),
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
