/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 *  Test Suite: AccessControl
 *
 *  This suite mostly includes generic methods of the utils class. Most core
 *  methods (directly related with AccessControl) are tested via `ac.test.ts`.
 */

import { AccessControl } from '../src/index.js';
import { IQueryInfo, IGrants } from '../src/core/index.js';
import { utils, RESERVED_KEYWORDS } from '../src/utils.js';
// test helper
import { helper } from './helper.js';

describe('Test Suite: utils (generic)', () => {

    test('#type()', () => {
        expect(utils.type(undefined)).toEqual('undefined');
        expect(utils.type(null)).toEqual('null');
        expect(utils.type({})).toEqual('object');
        expect(utils.type([])).toEqual('array');
        expect(utils.type('')).toEqual('string');
        expect(utils.type(1)).toEqual('number');
        expect(utils.type(true)).toEqual('boolean');
    });

    test('#hasDefined()', () => {
        const o = { prop: 1, def: undefined };
        expect(utils.hasDefined(o, 'prop')).toBe(true);
        expect(utils.hasDefined(o, 'def')).toBe(false);
        expect(utils.hasDefined(o, 'none')).toBe(false);
        expect(() => utils.hasDefined(null as any, 'prop')).toThrow();
    });

    test('#toStringArray()', () => {
        expect(utils.toStringArray([])).toEqual([]);
        expect(utils.toStringArray('a')).toEqual(['a']);
        expect(utils.toStringArray('a,b,c')).toEqual(['a', 'b', 'c']);
        expect(utils.toStringArray('a, b,  c  \n')).toEqual(['a', 'b', 'c']);
        expect(utils.toStringArray('a ; b,c')).toEqual(['a', 'b', 'c']);
        expect(utils.toStringArray('a;b; c')).toEqual(['a', 'b', 'c']);
        expect(utils.toStringArray(1)).toEqual([]);
        expect(utils.toStringArray(true)).toEqual([]);
        expect(utils.toStringArray(false)).toEqual([]);
        expect(utils.toStringArray(null)).toEqual([]);
        expect(utils.toStringArray(undefined)).toEqual([]);
    });

    test('#isFilledStringArray(), #isEmptyArray()', () => {
        expect(utils.isFilledStringArray([])).toBe(true); // allowed
        expect(utils.isFilledStringArray([''])).toBe(false);
        expect(utils.isFilledStringArray(['a'])).toBe(true);
        expect(utils.isFilledStringArray(['a', ''])).toBe(false);
        expect(utils.isFilledStringArray([1])).toBe(false);
        expect(utils.isFilledStringArray([null])).toBe(false);
        expect(utils.isFilledStringArray([undefined])).toBe(false);
        expect(utils.isFilledStringArray([false])).toBe(false);

        expect(utils.isEmptyArray([])).toBe(true);
        expect(utils.isEmptyArray([1])).toBe(false);
        expect(utils.isEmptyArray([''])).toBe(false);
        expect(utils.isEmptyArray([null])).toBe(false);
        expect(utils.isEmptyArray([undefined])).toBe(false);
        expect(utils.isEmptyArray('[]')).toBe(false);
        expect(utils.isEmptyArray(1)).toBe(false);
        expect(utils.isEmptyArray(null)).toBe(false);
        expect(utils.isEmptyArray(undefined)).toBe(false);
        expect(utils.isEmptyArray(true)).toBe(false);
    });

    test('#pushUniq(), #uniqConcat(), #subtractArray()', () => {
        const original = ['a', 'b', 'c'];
        const arr = original.concat();
        expect(utils.pushUniq(arr, 'a')).toEqual(original);
        expect(utils.pushUniq(arr, 'd')).toEqual(original.concat(['d']));

        expect(utils.uniqConcat(original, ['a'])).toEqual(original);
        expect(utils.uniqConcat(original, ['d'])).toEqual(original.concat(['d']));

        expect(utils.subtractArray(original, ['a'])).toEqual(['b', 'c']);
        expect(utils.subtractArray(original, ['d'])).toEqual(original);
    });

    test('#deepFreeze()', () => {
        expect((utils as any).deepFreeze()).toBeUndefined();
        const o = {
            x: 1,
            inner: {
                x: 2
            }
        };
        expect(utils.deepFreeze(o)).toEqual(expect.any(Object));
        expect(() => o.x = 5).toThrow();
        expect(() => (o as any).inner = {}).toThrow();
        expect(() => o.inner.x = 6).toThrow();
    });

    test('#iterateArray(), #iterateObjectKeys()', () => {
        const original: number[] = [1, 2, 3];
        let items: number[] = [];
        utils.iterateArray(original, (item: number) => { items.push(item); });
        expect(items).toEqual(original);

        items = [];

        // break out early by returning false

        utils.iterateArray(original, (item: number) => {
            items.push(item);
            return item < 2;
        });
        expect(items).toEqual([1, 2]);

        const o = { x: 0, y: 1, z: 2 };
        const d: Record<string, number> = {};
        utils.iterateObjectKeys(o, (key: string, index: number) => {
            d[key] = index;
        });
        expect(d).toEqual(o);

        // test thisArg

        // create a Context constructor with proper typing
        function Context(this: any) {
            (this as any).ok = true;
        }

        utils.iterateArray([1], function (this: any, _item: number) {
            expect((this as any).ok).toBe(true);
        }, new (Context as any)());

        utils.iterateObjectKeys({ key: 1 }, function (this: any, _key: string) {
            expect((this as any).ok).toBe(true);
        }, new (Context as any)());
    });

});

describe('Test Suite: utils (core)', () => {

    // ------------------------------------------
    // NOTE: other parts of these methods should be covered in other tests.
    // check coverage report.
    // ------------------------------------------

    test('#validName(), #hasValidNames()', () => {
        let valid: unknown = 'someName';
        expect(utils.validName(valid as string)).toBe(true);
        expect(utils.validName(valid as string, false)).toBe(true);
        expect(utils.validName(valid as string, false)).toBe(true);

        let invalid: unknown = RESERVED_KEYWORDS[0];
        helper.expectACError(() => utils.validName(invalid as string));
        helper.expectACError(() => utils.validName(invalid as string, true));
        expect(utils.validName(invalid as string, false)).toBe(false);
        expect(utils.validName('', false)).toBe(false);
        // utils is exported as an object; ensure API surface is intact
        expect(utils).toEqual(expect.any(Object));
        expect(typeof (utils as any).validName).toBe('function');
        // these calls are intentionally passing invalid types; with throwOnInvalid=false they should return false
        expect((utils as unknown as any).validName(1, false)).toBe(false);
        expect((utils as unknown as any).validName(null, false)).toBe(false);
        expect((utils as unknown as any).validName(true, false)).toBe(false);

        valid = ['valid', 'name'];
        expect(utils.hasValidNames(valid as unknown as string)).toBe(true);
        expect(utils.hasValidNames(valid as unknown as string, false)).toBe(true);
        expect(utils.hasValidNames(valid as unknown as string, false)).toBe(true);

        invalid = ['valid', RESERVED_KEYWORDS[RESERVED_KEYWORDS.length - 1]];
        helper.expectACError(() => utils.hasValidNames(invalid as unknown as string[]));
        helper.expectACError(() => utils.hasValidNames(invalid as unknown as string[], true));
        expect(utils.hasValidNames(invalid as unknown as string[], false)).toBe(false);
    });

    test('#validResourceObject()', () => {
        helper.expectACError(() => utils.validResourceObject(null));
        helper.expectACError(() => utils.validResourceObject(null));
        expect(utils.validResourceObject({ create: [] })).toBe(true);
        expect(utils.validResourceObject({ 'create:any': ['*', '!id'] })).toBe(true);
        expect(utils.validResourceObject({ 'update:own': ['*'] })).toBe(true);

        helper.expectACError(() => utils.validResourceObject({ invalid: [], create: [] }));
        helper.expectACError(() => utils.validResourceObject({ 'invalid:any': [] }));
        helper.expectACError(() => utils.validResourceObject({ 'invalid:any': [''] }));
        helper.expectACError(() => utils.validResourceObject({ 'read:own': ['*'], 'invalid:own': [] }));

        helper.expectACError(() => utils.validResourceObject({ 'create:all': [] }));
        helper.expectACError(() => utils.validResourceObject({ 'create:all': [] }));

        helper.expectACError(() => utils.validResourceObject({ create: null }));
        helper.expectACError(() => utils.validResourceObject({ 'create:own': undefined }));
        helper.expectACError(() => utils.validResourceObject({ 'read:own': [], 'create:any': [''] }));
        helper.expectACError(() => utils.validResourceObject({ 'create:any': ['*', ''] }));
    });

    test('#validRoleObject()', () => {
        const grants: IGrants = { admin: { account: { 'read:any': ['*'] } } };
        expect(utils.validRoleObject(grants, 'admin')).toBe(true);
        grants.admin = { account: ['*'] };
        helper.expectACError(() => utils.validRoleObject(grants, 'admin'));
        grants.admin = { account: { 'read:own': ['*'] } };
        expect(() => utils.validRoleObject(grants, 'admin')).not.toThrow();
        grants.admin = { account: { read: ['*'] } };
        expect(() => utils.validRoleObject(grants, 'admin')).not.toThrow();
        grants.admin = { account: { 'read:all': ['*'] } };
        helper.expectACError(() => utils.validRoleObject(grants, 'admin'));
        grants.admin = { $extend: ['*'] }; // cannot inherit non-existent role(s)
        helper.expectACError(() => utils.validRoleObject(grants, 'admin'));

        grants.user = { account: { 'read:own': ['*'] } };
        grants.admin = { $extend: ['user'] };
        expect(() => utils.validRoleObject(grants, 'admin')).not.toThrow();
        // @ts-ignore (intentional invalid structure for test)
        grants.admin = { $: { account: { 'read:own': ['*'] } } }; // $: reserved
        helper.expectACError(() => utils.validRoleObject(grants, 'admin'));
        grants.admin = { account: [] }; // invalid resource structure
        helper.expectACError(() => utils.validRoleObject(grants, 'admin'));
        grants.admin = { account: { 'read:own': [''] } }; // invalid resource structure
        helper.expectACError(() => utils.validRoleObject(grants, 'admin'));
        // @ts-ignore (intentional invalid structure for test)
        grants.admin = { account: null }; // invalid resource structure
        helper.expectACError(() => utils.validRoleObject(grants, 'admin'));
    });

    test('#normalizeQueryInfo(), #normalizeAccessInfo()', () => {
    // @ts-ignore (testing invalid input)
        helper.expectACError(() => utils.normalizeQueryInfo(null));
        // @ts-ignore (testing invalid input)
        helper.expectACError(() => utils.normalizeQueryInfo({ role: null }));
        // @ts-ignore (intentional invalid input)
        helper.expectACError(() => (utils as any).normalizeQueryInfo({ role: 1 }));
        helper.expectACError(() => utils.normalizeQueryInfo({ role: [] }));
        helper.expectACError(() => utils.normalizeQueryInfo({ role: '' }));
        helper.expectACError(() => utils.normalizeQueryInfo({ role: 'sa', resource: '' }));
        // @ts-ignore (intentional invalid input)
        helper.expectACError(() => (utils as unknown).normalizeQueryInfo({ role: 'sa', resource: null }));
        // @ts-ignore (intentional invalid input)
        helper.expectACError(() => (utils as unknown).normalizeQueryInfo({ role: 'sa', resource: [] }));

        // @ts-ignore (testing invalid input)
        helper.expectACError(() => utils.normalizeAccessInfo(null));
        // @ts-ignore (testing invalid input)
        helper.expectACError(() => utils.normalizeAccessInfo({ role: null }));
        helper.expectACError(() => utils.normalizeAccessInfo({ role: [] }));
        helper.expectACError(() => utils.normalizeAccessInfo({ role: '' }));
        helper.expectACError(() => (utils as any).normalizeAccessInfo({ role: 1 }));
        helper.expectACError(() => utils.normalizeAccessInfo({ role: 'sa', resource: '' }));
        // @ts-ignore (intentional invalid input)
        helper.expectACError(() => (utils as unknown).normalizeAccessInfo({ role: 'sa', resource: null }));
        // @ts-ignore (intentional invalid input)
        helper.expectACError(() => (utils as unknown).normalizeAccessInfo({ role: 'sa', resource: [] }));
    });

    test('#getRoleHierarchyOf()', () => {
        const grants: IGrants = {
            admin: {
                $extend: ['user']
                // 'account': { 'read:any': ['*'] }
            }
        };
        helper.expectACError(() => utils.getRoleHierarchyOf(grants, 'admin'));
        grants.admin = { $extend: ['admin'] };
        helper.expectACError(() => utils.getRoleHierarchyOf(grants, 'admin'));

        grants.admin = { account: { 'read:any': ['*'] } };
        // @ts-ignore (testing invalid input)
        helper.expectACError(() => utils.getRoleHierarchyOf(grants, null));
        helper.expectACError(() => utils.getRoleHierarchyOf(grants, ''));
    });

    test('#getFlatRoles()', () => {
    // @ts-ignore (testing invalid input)
        helper.expectACError(() => utils.getFlatRoles({}, null));
        helper.expectACError(() => utils.getFlatRoles({}, ''));
    });

    test('#getNonExistentRoles()', () => {
        const grants: IGrants = {
            admin: {
                account: { 'read:any': ['*'] }
            }
        };
        expect(utils.getNonExistentRoles(grants, [])).toEqual([]);
        expect(utils.getNonExistentRoles(grants, [''])).toEqual(['']);
    });

    test('#getCrossExtendingRole()', () => {
        const grants: IGrants = {
            user: {},
            admin: {
                $extend: ['user', 'editor']
            },
            editor: {
                $extend: ['admin']
            }
        };
        // implementation returns false when no cross inheritance is found
        expect(utils.getCrossExtendingRole(grants, 'admin', ['admin'])).toEqual(false);
        expect(utils.getCrossExtendingRole(grants, 'admin', ['user'])).toEqual(false);
        helper.expectACError(() => utils.getCrossExtendingRole(grants, 'user', ['admin']));
    });

    test('#extendRole()', () => {
        const grants: IGrants = {
            user: {},
            admin: {
                $extend: ['user', 'editor']
            },
            editor: {
                $extend: ['admin']
            },
            viewer: {}
        };
        // @ts-ignore (testing invalid input)
        helper.expectACError(() => utils.extendRole(grants, null, ['admin']));
        // @ts-ignore (testing invalid input)
        helper.expectACError(() => utils.extendRole(grants, 'admin', null));
        helper.expectACError(() => utils.extendRole(grants, 'nonexisting', 'user'));
        helper.expectACError(() => utils.extendRole(grants, 'admin', 'nonexisting'));
        helper.expectACError(() => utils.extendRole(grants, 'admin', 'editor')); // cross
        helper.expectACError(() => utils.extendRole(grants, '$', 'user')); // reserved keyword
        expect(() => utils.extendRole(grants, 'admin', 'viewer')).not.toThrow();
    });

    test('#getUnionAttrsOfRoles()', () => {
        const grants: IGrants = {
            user: {
                account: {
                    'read:own': ['*']
                }
            },
            admin: {
                $extend: ['user']
            }
        };
        const query: IQueryInfo = {
            role: 'admin',
            resource: 'account',
            action: 'read'
        };
        expect(utils.getUnionAttrsOfRoles(grants, query)).toEqual([]);
        query.role = 'nonexisting';
        helper.expectACError(() => utils.getUnionAttrsOfRoles(grants, query));
    });

    test('#lockAC()', () => {
    // @ts-ignore (testing invalid input)
        expect(() => utils.lockAC(null)).toThrow();
        const ac = new AccessControl();
        helper.expectACError(() => utils.lockAC(ac));
        ((ac as unknown) as { _grants: unknown | null })._grants = null;
        // @ts-ignore (testing invalid internal state)
        helper.expectACError(() => utils.lockAC(ac));
    });

});
