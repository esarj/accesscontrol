import { AccessControl } from '../../src/index.js';

console.info(AccessControl);
const ac = new AccessControl();
ac.grant('user').createAny('resource');
console.info(ac.getGrants());
