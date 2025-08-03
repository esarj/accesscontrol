import { AccessControl } from './index.js';
import { IAccessInfo, IQueryInfo } from './core/index.js';
/**
 * List of reserved keywords.
 * i.e. Roles, resources with these names are not allowed.
 */
declare const RESERVED_KEYWORDS: string[];
/**
 * Error message to be thrown after AccessControl instance is locked.
 */
declare const ERR_LOCK = "Cannot alter the underlying grants model. AccessControl instance is locked.";
declare const utils: {
    type(o: any): string;
    hasDefined(o: any, propName: string): boolean;
    toStringArray(value: any): string[];
    isFilledStringArray(arr: any[]): boolean;
    isEmptyArray(value: any): boolean;
    pushUniq(arr: string[], item: string): string[];
    uniqConcat(arrA: string[], arrB: string[]): string[];
    subtractArray(arrA: string[], arrB: string[]): string[];
    deepFreeze(o: any): any;
    /**
     * Similar to JS .forEach, except this allows for breaking out early,
     * (before all iterations are executed) by returning `false`.
     * @param array - The array to iterate over.
     * @param callback - A function to execute for each element. Return `false` to break the loop.
     * @param thisArg - Value to use as `this` when executing callback.
     */
    each<T>(array: T[], callback: (item: T, index: number, arr: T[]) => any, thisArg?: any): void;
    /**
     * Iterates through the keys of the given object. Breaking out early is
     * possible by returning `false`.
     * @param object - The object to iterate over.
     * @param callback - A function to execute for each key. Return `false` to break the loop.
     * @param thisArg - Value to use as `this` when executing callback.
     */
    eachKey(object: Record<string, any>, callback: (key: string, index: number, keys: string[]) => any, thisArg?: any): void;
    eachRole(grants: {
        [x: string]: any;
    }, callback: (role: any, roleName: string) => void): void;
    eachRoleResource(grants: {
        [x: string]: any;
    }, callback: (roleName: string, resourceName: string, resourceDefinition: any) => void): void;
    isInfoFulfilled(info: IAccessInfo | IQueryInfo): boolean;
    validName(name: string, throwOnInvalid?: boolean): boolean;
    hasValidNames(list: any, throwOnInvalid?: boolean): boolean;
    validResourceObject(o: any): boolean;
    validRoleObject(grants: any, roleName: string): boolean;
    getInspectedGrants(o: any): any;
    getResources(grants: any): string[];
    normalizeActionPossession(info: IQueryInfo | IAccessInfo, asString?: boolean): IQueryInfo | IAccessInfo | string;
    normalizeQueryInfo(query: IQueryInfo): IQueryInfo;
    normalizeAccessInfo(access: IAccessInfo, all?: boolean): IAccessInfo;
    resetAttributes(access: IAccessInfo): IAccessInfo;
    getRoleHierarchyOf(grants: any, roleName: string, rootRole?: string): string[];
    getFlatRoles(grants: any, roles: string | string[]): string[];
    getNonExistentRoles(grants: any, roles: string[]): string[];
    getCrossExtendingRole(grants: any, roleName: string, extenderRoles: string | string[]): string | null;
    extendRole(grants: any, roles: string | string[], extenderRoles: string | string[]): void;
    preCreateRoles(grants: any, roles: string | string[]): void;
    commitToGrants(grants: any, access: IAccessInfo, normalizeAll?: boolean): void;
    getUnionAttrsOfRoles(grants: any, query: IQueryInfo): string[];
    lockAC(ac: AccessControl): void;
    filter(object: any, attributes: string[]): any;
    filterAll(arrOrObj: any, attributes: string[]): any;
};
export { utils, RESERVED_KEYWORDS, ERR_LOCK };
//# sourceMappingURL=utils.d.ts.map