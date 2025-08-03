"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERR_LOCK = exports.RESERVED_KEYWORDS = exports.utils = void 0;
// dep modules
// @ts-ignore
const notation_1 = require("notation");
const index_js_1 = require("./enums/index.js");
const index_js_2 = require("./core/index.js");
/**
 * List of reserved keywords.
 * i.e. Roles, resources with these names are not allowed.
 */
const RESERVED_KEYWORDS = ['*', '!', '$', '$extend'];
exports.RESERVED_KEYWORDS = RESERVED_KEYWORDS;
/**
 * Error message to be thrown after AccessControl instance is locked.
 */
const ERR_LOCK = 'Cannot alter the underlying grants model. AccessControl instance is locked.';
exports.ERR_LOCK = ERR_LOCK;
const utils = {
    // ----------------------
    // GENERIC UTILS
    // ----------------------
    type(o) {
        const match = Object.prototype.toString.call(o).match(/\s(\w+)/i);
        return match ? match[1].toLowerCase() : '';
    },
    hasDefined(o, propName) {
        // eslint-disable-next-line no-prototype-builtins
        return o.hasOwnProperty(propName) && o[propName] !== undefined;
    },
    toStringArray(value) {
        if (Array.isArray(value))
            return value;
        if (typeof value === 'string')
            return value.trim().split(/\s*[;,]\s*/);
        return [];
    },
    isFilledStringArray(arr) {
        if (!arr || !Array.isArray(arr))
            return false;
        for (const s of arr) {
            if (typeof s !== 'string' || s.trim() === '')
                return false;
        }
        return true;
    },
    isEmptyArray(value) {
        return Array.isArray(value) && value.length === 0;
    },
    pushUniq(arr, item) {
        if (arr.indexOf(item) < 0)
            arr.push(item);
        return arr;
    },
    uniqConcat(arrA, arrB) {
        const arr = arrA.concat();
        arrB.forEach((b) => {
            utils.pushUniq(arr, b);
        });
        return arr;
    },
    subtractArray(arrA, arrB) {
        return arrA.filter(a => arrB.indexOf(a) === -1);
    },
    deepFreeze(o) {
        if (utils.type(o) !== 'object')
            return o;
        Object.getOwnPropertyNames(o).forEach((key) => {
            const sub = o[key];
            if (Array.isArray(sub))
                Object.freeze(sub);
            if (utils.type(sub) === 'object') {
                utils.deepFreeze(sub);
            }
        });
        return Object.freeze(o);
    },
    /**
     * Similar to JS .forEach, except this allows for breaking out early,
     * (before all iterations are executed) by returning `false`.
     * @param array - The array to iterate over.
     * @param callback - A function to execute for each element. Return `false` to break the loop.
     * @param thisArg - Value to use as `this` when executing callback.
     */
    each(array, callback, thisArg = null) {
        const length = array.length;
        let index = -1;
        while (++index < length) {
            if (callback.call(thisArg, array[index], index, array) === false)
                break;
        }
    },
    /**
     * Iterates through the keys of the given object. Breaking out early is
     * possible by returning `false`.
     * @param object - The object to iterate over.
     * @param callback - A function to execute for each key. Return `false` to break the loop.
     * @param thisArg - Value to use as `this` when executing callback.
     */
    eachKey(object, callback, thisArg = null) {
        utils.each(Object.keys(object), callback, thisArg);
    },
    // ----------------------
    // AC ITERATION UTILS
    // ----------------------
    eachRole(grants, callback) {
        utils.eachKey(grants, (name) => { callback(grants[name], name); });
    },
    eachRoleResource(grants, callback) {
        utils.eachKey(grants, (roleName) => {
            const resources = grants[roleName];
            utils.eachKey(resources, (resourceName) => {
                // Corrected this line
                const resourceDefinition = resources[resourceName];
                callback(roleName, resourceName, resourceDefinition);
            });
        });
    },
    // ----------------------
    // AC VALIDATION UTILS
    // ----------------------
    isInfoFulfilled(info) {
        return utils.hasDefined(info, 'role')
            && utils.hasDefined(info, 'action')
            && utils.hasDefined(info, 'resource');
    },
    validName(name, throwOnInvalid = true) {
        if (typeof name !== 'string' || name.trim() === '') {
            if (!throwOnInvalid)
                return false;
            throw new index_js_2.AccessControlError('Invalid name, expected a valid string.');
        }
        if (RESERVED_KEYWORDS.indexOf(name) >= 0) {
            if (!throwOnInvalid)
                return false;
            throw new index_js_2.AccessControlError(`Cannot use reserved name: "${name}"`);
        }
        return true;
    },
    hasValidNames(list, throwOnInvalid = true) {
        let allValid = true;
        utils.each(utils.toStringArray(list), (name) => {
            if (!utils.validName(name, throwOnInvalid)) {
                allValid = false;
                return false; // break out of loop
            }
            return true; // continue
        });
        return allValid;
    },
    validResourceObject(o) {
        if (utils.type(o) !== 'object') {
            throw new index_js_2.AccessControlError(`Invalid resource definition.`);
        }
        utils.eachKey(o, (action) => {
            const s = action.split(':');
            if (index_js_1.actions.indexOf(s[0]) === -1) {
                throw new index_js_2.AccessControlError(`Invalid action: "${action}"`);
            }
            if (s[1] && index_js_1.possessions.indexOf(s[1]) === -1) {
                throw new index_js_2.AccessControlError(`Invalid action possession: "${action}"`);
            }
            const perms = o[action];
            if (!utils.isEmptyArray(perms) && !utils.isFilledStringArray(perms)) {
                throw new index_js_2.AccessControlError(`Invalid resource attributes for action "${action}".`);
            }
        });
        return true;
    },
    validRoleObject(grants, roleName) {
        const role = grants[roleName];
        if (!role || utils.type(role) !== 'object') {
            throw new index_js_2.AccessControlError(`Invalid role definition for "${roleName}".`);
        }
        utils.eachKey(role, (resourceName) => {
            if (!utils.validName(resourceName, false)) {
                if (resourceName === '$extend') {
                    const extRoles = role[resourceName];
                    if (!utils.isFilledStringArray(extRoles)) {
                        throw new index_js_2.AccessControlError(`Invalid extend value for role "${roleName}": ${JSON.stringify(extRoles)}`);
                    }
                    utils.extendRole(grants, roleName, extRoles);
                }
                else {
                    throw new index_js_2.AccessControlError(`Cannot use reserved name "${resourceName}" for a resource.`);
                }
            }
            else {
                utils.validResourceObject(role[resourceName]);
            }
        });
        return true;
    },
    getInspectedGrants(o) {
        const grants = {};
        const strErr = 'Invalid grants object.';
        const type = utils.type(o);
        if (type === 'object') {
            utils.eachKey(o, (roleName) => {
                utils.validName(roleName);
                utils.validRoleObject(o, roleName);
            });
            return o;
        }
        if (type === 'array') {
            o.forEach((item) => utils.commitToGrants(grants, item, true));
            return grants;
        }
        throw new index_js_2.AccessControlError(`${strErr} Expected an array or object.`);
    },
    // ----------------------
    // AC COMMON UTILS
    // ----------------------
    getResources(grants) {
        const resources = {};
        utils.eachRoleResource(grants, (role, resource) => {
            resources[resource] = null;
        });
        return Object.keys(resources);
    },
    normalizeActionPossession(info, asString = false) {
        if (typeof info.action !== 'string') {
            throw new index_js_2.AccessControlError(`Invalid action: ${JSON.stringify(info)}`);
        }
        const s = info.action.split(':');
        const action = s[0].trim().toLowerCase();
        if (index_js_1.actions.indexOf(action) < 0) {
            throw new index_js_2.AccessControlError(`Invalid action: ${s[0]}`);
        }
        info.action = action;
        const poss = info.possession || s[1];
        if (poss) {
            const possession = poss.trim().toLowerCase();
            if (index_js_1.possessions.indexOf(possession) < 0) {
                throw new index_js_2.AccessControlError(`Invalid action possession: ${poss}`);
            }
            info.possession = possession;
        }
        else {
            info.possession = index_js_1.Possession.ANY;
        }
        return asString
            ? `${info.action}:${info.possession}`
            : info;
    },
    normalizeQueryInfo(query) {
        if (utils.type(query) !== 'object') {
            throw new index_js_2.AccessControlError(`Invalid IQueryInfo: ${typeof query}`);
        }
        const newQuery = { ...query };
        newQuery.role = utils.toStringArray(newQuery.role);
        if (!utils.isFilledStringArray(newQuery.role)) {
            throw new index_js_2.AccessControlError(`Invalid role(s): ${JSON.stringify(newQuery.role)}`);
        }
        if (typeof newQuery.resource !== 'string' || newQuery.resource.trim() === '') {
            throw new index_js_2.AccessControlError(`Invalid resource: "${newQuery.resource}"`);
        }
        newQuery.resource = newQuery.resource.trim();
        return utils.normalizeActionPossession(newQuery);
    },
    normalizeAccessInfo(access, all = false) {
        if (utils.type(access) !== 'object') {
            throw new index_js_2.AccessControlError(`Invalid IAccessInfo: ${typeof access}`);
        }
        const newAccess = { ...access };
        newAccess.role = utils.toStringArray(newAccess.role);
        if (!utils.isFilledStringArray(newAccess.role)) {
            throw new index_js_2.AccessControlError(`Invalid role(s): ${JSON.stringify(newAccess.role)}`);
        }
        newAccess.resource = utils.toStringArray(newAccess.resource);
        if (!utils.isFilledStringArray(newAccess.resource)) {
            throw new index_js_2.AccessControlError(`Invalid resource(s): ${JSON.stringify(newAccess.resource)}`);
        }
        if (newAccess.denied || (Array.isArray(newAccess.attributes) && newAccess.attributes.length === 0)) {
            newAccess.attributes = [];
        }
        else {
            newAccess.attributes = !newAccess.attributes ? ['*'] : utils.toStringArray(newAccess.attributes);
        }
        if (all) {
            return utils.normalizeActionPossession(newAccess);
        }
        return newAccess;
    },
    resetAttributes(access) {
        if (access.denied) {
            access.attributes = [];
            return access;
        }
        if (!access.attributes || utils.isEmptyArray(access.attributes)) {
            access.attributes = ['*'];
        }
        return access;
    },
    getRoleHierarchyOf(grants, roleName, rootRole) {
        const role = grants[roleName];
        if (!role)
            throw new index_js_2.AccessControlError(`Role not found: "${roleName}"`);
        let arr = [roleName];
        if (!Array.isArray(role.$extend) || role.$extend.length === 0)
            return arr;
        role.$extend.forEach((exRoleName) => {
            if (!grants[exRoleName]) {
                throw new index_js_2.AccessControlError(`Role not found: "${exRoleName}"`);
            }
            if (exRoleName === roleName) {
                throw new index_js_2.AccessControlError(`Cannot extend role "${roleName}" by itself.`);
            }
            if (rootRole && (rootRole === exRoleName)) {
                throw new index_js_2.AccessControlError(`Cross inheritance is not allowed. Role "${exRoleName}" already extends "${rootRole}".`);
            }
            const ext = utils.getRoleHierarchyOf(grants, exRoleName, rootRole || roleName);
            arr = utils.uniqConcat(arr, ext);
        });
        return arr;
    },
    getFlatRoles(grants, roles) {
        const arrRoles = utils.toStringArray(roles);
        if (arrRoles.length === 0) {
            throw new index_js_2.AccessControlError(`Invalid role(s): ${JSON.stringify(roles)}`);
        }
        let arr = [...arrRoles];
        arrRoles.forEach((roleName) => {
            arr = utils.uniqConcat(arr, utils.getRoleHierarchyOf(grants, roleName));
        });
        return arr;
    },
    getNonExistentRoles(grants, roles) {
        const non = [];
        if (utils.isEmptyArray(roles))
            return non;
        for (const role of roles) {
            // eslint-disable-next-line no-prototype-builtins
            if (!grants.hasOwnProperty(role))
                non.push(role);
        }
        return non;
    },
    getCrossExtendingRole(grants, roleName, extenderRoles) {
        const extenders = utils.toStringArray(extenderRoles);
        let crossInherited = null;
        utils.each(extenders, (e) => {
            if (crossInherited || roleName === e) {
                return false; // break out of loop
            }
            const inheritedByExtender = utils.getRoleHierarchyOf(grants, e);
            utils.each(inheritedByExtender, (r) => {
                if (r === roleName) {
                    crossInherited = e;
                    return false; // break out of loop
                }
                return true; // continue
            });
            return !crossInherited; // continue if not found
        });
        return crossInherited;
    },
    extendRole(grants, roles, extenderRoles) {
        const arrRoles = utils.toStringArray(roles);
        if (arrRoles.length === 0) {
            throw new index_js_2.AccessControlError(`Invalid role(s): ${JSON.stringify(roles)}`);
        }
        if (utils.isEmptyArray(extenderRoles))
            return;
        const arrExtRoles = utils.toStringArray(extenderRoles);
        if (arrExtRoles.length === 0) {
            throw new index_js_2.AccessControlError(`Cannot inherit invalid role(s): ${JSON.stringify(extenderRoles)}`);
        }
        const nonExistentExtRoles = utils.getNonExistentRoles(grants, arrExtRoles);
        if (nonExistentExtRoles.length > 0) {
            throw new index_js_2.AccessControlError(`Cannot inherit non-existent role(s): "${nonExistentExtRoles.join(', ')}"`);
        }
        arrRoles.forEach((roleName) => {
            if (!grants[roleName])
                throw new index_js_2.AccessControlError(`Role not found: "${roleName}"`);
            if (arrExtRoles.indexOf(roleName) >= 0) {
                throw new index_js_2.AccessControlError(`Cannot extend role "${roleName}" by itself.`);
            }
            const crossInherited = utils.getCrossExtendingRole(grants, roleName, arrExtRoles);
            if (crossInherited) {
                throw new index_js_2.AccessControlError(`Cross inheritance is not allowed. Role "${crossInherited}" already extends "${roleName}".`);
            }
            utils.validName(roleName);
            const r = grants[roleName];
            r.$extend = Array.isArray(r.$extend)
                ? utils.uniqConcat(r.$extend, arrExtRoles)
                : arrExtRoles;
        });
    },
    preCreateRoles(grants, roles) {
        const rolesArray = utils.toStringArray(roles);
        if (rolesArray.length === 0) {
            throw new index_js_2.AccessControlError(`Invalid role(s): ${JSON.stringify(roles)}`);
        }
        rolesArray.forEach((role) => {
            // eslint-disable-next-line no-prototype-builtins
            if (utils.validName(role) && !grants.hasOwnProperty(role)) {
                grants[role] = {};
            }
        });
    },
    commitToGrants(grants, access, normalizeAll = false) {
        const safeAccess = utils.normalizeAccessInfo(access, normalizeAll);
        safeAccess.role.forEach((role) => {
            // eslint-disable-next-line no-prototype-builtins
            if (utils.validName(role) && !grants.hasOwnProperty(role)) {
                grants[role] = {};
            }
            const grantItem = grants[role];
            const ap = `${safeAccess.action}:${safeAccess.possession}`;
            safeAccess.resource.forEach((res) => {
                // eslint-disable-next-line no-prototype-builtins
                if (utils.validName(res) && !grantItem.hasOwnProperty(res)) {
                    grantItem[res] = {};
                }
                grantItem[res][ap] = utils.toStringArray(safeAccess.attributes);
            });
        });
    },
    getUnionAttrsOfRoles(grants, query) {
        const safeQuery = utils.normalizeQueryInfo(query);
        if (typeof safeQuery.role === 'undefined') {
            throw new index_js_2.AccessControlError(`Invalid role(s): ${JSON.stringify(safeQuery.role)}`);
        }
        const roles = utils.getFlatRoles(grants, safeQuery.role);
        const attrsList = [];
        roles.forEach((roleName) => {
            const role = grants[roleName];
            const resource = role[safeQuery.resource];
            if (resource) {
                const actionPossession = `${safeQuery.action}:${safeQuery.possession}`;
                const actionAny = `${safeQuery.action}:any`;
                // Explicitly provide a fallback empty array to prevent error on .concat
                const attrs = (resource[actionPossession] || resource[actionAny] || []).concat();
                attrsList.push(attrs);
            }
        });
        if (attrsList.length === 0) {
            return [];
        }
        // union all arrays of attributes
        return attrsList.reduce((acc, G_attrs) => notation_1.Notation.Glob.union(acc, G_attrs));
    },
    lockAC(ac) {
        const _ac = ac;
        if (!_ac._grants || Object.keys(_ac._grants).length === 0) {
            throw new index_js_2.AccessControlError('Cannot lock empty or invalid grants model.');
        }
        if (ac.isLocked && Object.isFrozen(_ac._grants))
            return;
        utils.deepFreeze(_ac._grants);
        _ac._isLocked = true;
    },
    // ----------------------
    // NOTATION/GLOB UTILS
    // ----------------------
    filter(object, attributes) {
        if (!Array.isArray(attributes) || attributes.length === 0) {
            return {};
        }
        const notation = new notation_1.Notation(object);
        return notation.filter(attributes).value;
    },
    filterAll(arrOrObj, attributes) {
        if (!Array.isArray(arrOrObj)) {
            return utils.filter(arrOrObj, attributes);
        }
        return arrOrObj.map(o => {
            return utils.filter(o, attributes);
        });
    }
};
exports.utils = utils;
//# sourceMappingURL=utils.js.map