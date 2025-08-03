"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../../src/index.js");
console.log(index_js_1.AccessControl);
const ac = new index_js_1.AccessControl();
ac.grant('user').createAny('resource');
console.log(ac.getGrants());
//# sourceMappingURL=import.js.map