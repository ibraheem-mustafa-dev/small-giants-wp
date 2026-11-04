// The ES-module face of the shared framework-database resolver: loads the CommonJS twin and re-exports it.
import { createRequire } from 'node:module';

const require = createRequire( import.meta.url );
const twin = require( '../../../plugins/sgs-blocks/scripts/lib/framework-db.js' );

export const frameworkDbPath = twin.frameworkDbPath;
