"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.possessions = exports.Possession = exports.actions = exports.Action = void 0;
const Action_js_1 = require("./Action.js");
Object.defineProperty(exports, "Action", { enumerable: true, get: function () { return Action_js_1.Action; } });
const Possession_js_1 = require("./Possession.js");
Object.defineProperty(exports, "Possession", { enumerable: true, get: function () { return Possession_js_1.Possession; } });
const actions = Object.values(Action_js_1.Action);
exports.actions = actions;
const possessions = Object.values(Possession_js_1.Possession);
exports.possessions = possessions;
//# sourceMappingURL=index.js.map