'use strict';

/**
 * Test Suite: AccessControl
 *
 * This suite mostly includes generic methods of the utils class. Most core
 * methods (directly related with AccessControl) are tested via `ac.test.ts`.
 *
 * @author   Onur Yıldırım <onur@cutepilot.com>
 */


import { AccessControl } from '../src';
import { IQueryInfo } from '../src/core';
import { utils, RESERVED_KEYWORDS } from '../src/utils';
// test helper
import { helper } from './helper';

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
        const arr = [...original];
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
        utils.deepFreeze(o);
        expect(Object.isFrozen(o)).toBe(true);
        expect(Object.isFrozen(o.inner)).toBe(true);
        expect(() => { o.x = 5; }).toThrow();
        expect(() => { (o as any).inner = {}; }).toThrow();
        expect(() => { o.inner.x = 6; }).toThrow();
    });

    test('#each(), #eachKey()', () => {
        const original: number[] = [1, 2, 3];
        let items: number[] = [];
        utils.each(original, (item: number) => items.push(item));
        expect(items).toEqual(original);

        items = [];

        // break out early by returning false
        utils.each(original, (item: number) => {
            items.push(item);
            return item < 2;
        });
        expect(items).toEqual([1, 2]);

        const o = { x: 0, y: 1, z: 2 };
        const d: Record<string, number> = {}; // Corrected: Added explicit type
        utils.eachKey(o, (key: string, index: number) => {
            d[key] = index;
        });
        expect(d).toEqual(o);

        // test thisArg
        // Corrected: Replaced function constructor with a modern class
        class Context {
            ok = true;
        }

        utils.each([1], function (this: Context, item: number) {
            expect(this.ok).toBe(true);
        }, new Context());

        utils.eachKey({ key: 1 }, function (this: Context, key: string) {
            expect(this.ok).toBe(true);
        }, new Context());
    });

});

describe('Test Suite: utils (core)', () => {

    test('#validName(), #hasValidNames()', () => {
        const valid = 'someName';
        expect(utils.validName(valid)).toBe(true);
        expect(utils.validName(valid, false)).toBe(true);

        const invalid = RESERVED_KEYWORDS[0];
        helper.expectACError(() => utils.validName(invalid));
        expect(utils.validName(invalid, false)).toBe(false);
        expect(utils.validName('', false)).toBe(false);
        // Corrected: Cast invalid inputs to 'any' for testing purposes
        expect(utils.validName(1 as any, false)).toBe(false);
        expect(utils.validName(null as any, false)).toBe(false);
        expect(utils.validName(true as any, false)).toBe(false);

        const validList = ['valid', 'name'];
        expect(utils.hasValidNames(validList)).toBe(true);
        expect(utils.hasValidNames(validList, false)).toBe(true);

        const invalidList = ['valid', RESERVED_KEYWORDS[RESERVED_KEYWORDS.length - 1]];
        helper.expectACError(() => utils.hasValidNames(invalidList));
        expect(utils.hasValidNames(invalidList, false)).toBe(false);
    });

    test('#validResourceObject()', () => {
        // Corrected: Cast invalid inputs to 'any' for testing purposes
        helper.expectACError(() => utils.validResourceObject(null as any));
        expect(utils.validResourceObject({ 'create': [] })).toBe(true);
        expect(utils.validResourceObject({ 'create:any': ['*', '!id'] })).toBe(true);
        expect(utils.validResourceObject({ 'update:own': ['*'] })).toBe(true);

        helper.expectACError(() => utils.validResourceObject({ 'invalid': [], 'create': [] }));
        helper.expectACError(() => utils.validResourceObject({ 'invalid:any': [] }));
        helper.expectACError(() => utils.validResourceObject({ 'create:all': [] }));
        helper.expectACError(() => utils.validResourceObject({ 'create': null as any }));
        helper.expectACError(() => utils.validResourceObject({ 'create:own': undefined as any }));
        helper.expectACError(() => utils.validResourceObject({ 'create:any': ['*', ''] }));
    });

    test('#validRoleObject()', () => {
        const grants: any = { 'admin': { 'account': { 'read:any': ['*'] } } };
        expect(utils.validRoleObject(grants, 'admin')).toBe(true);
        grants.admin = { 'account': ['*'] };
        helper.expectACError(() => utils.validRoleObject(grants, 'admin'));
        grants.admin = { 'account': { 'read:own': ['*'] } };
        expect(() => utils.validRoleObject(grants, 'admin')).not.toThrow();
        grants.admin = { 'account': { 'read:all': ['*'] } };
        helper.expectACError(() => utils.validRoleObject(grants, 'admin'));
        grants.admin = { '$extend': ['*'] }; // cannot inherit non-existent role(s)
        helper.expectACError(() => utils.validRoleObject(grants, 'admin'));

        grants.user = { 'account': { 'read:own': ['*'] } };
        grants.admin = { '$extend': ['user'] };
        expect(() => utils.validRoleObject(grants, 'admin')).not.toThrow();
    });

    test('#normalizeQueryInfo(), #normalizeAccessInfo()', () => {
        // Corrected: Cast invalid inputs to 'any' for testing purposes
        helper.expectACError(() => utils.normalizeQueryInfo(null as any));
        helper.expectACError(() => utils.normalizeQueryInfo({ role: null } as any));
        helper.expectACError(() => utils.normalizeQueryInfo({ role: 1 } as any));
        helper.expectACError(() => utils.normalizeQueryInfo({ role: [] }));
        helper.expectACError(() => utils.normalizeQueryInfo({ role: 'sa', resource: '' }));

        helper.expectACError(() => utils.normalizeAccessInfo(null as any));
        helper.expectACError(() => utils.normalizeAccessInfo({ role: null } as any));
        helper.expectACError(() => utils.normalizeAccessInfo({ role: [] }));
        helper.expectACError(() => utils.normalizeAccessInfo({ role: 1 } as any));
        helper.expectACError(() => utils.normalizeAccessInfo({ role: 'sa', resource: '' }));
    });

    test('#getRoleHierarchyOf()', () => {
        const grants: any = { 'admin': { '$extend': ['user'] } };
        helper.expectACError(() => utils.getRoleHierarchyOf(grants, 'admin'));
        grants.admin = { '$extend': ['admin'] };
        helper.expectACError(() => utils.getRoleHierarchyOf(grants, 'admin'));

        grants.admin = { 'account': { 'read:any': ['*'] } };
        // Corrected: Cast invalid inputs to 'any' for testing purposes
        helper.expectACError(() => utils.getRoleHierarchyOf(grants, null as any));
        helper.expectACError(() => utils.getRoleHierarchyOf(grants, ''));
    });

    test('#getFlatRoles()', () => {
        // Corrected: Cast invalid inputs to 'any' for testing purposes
        helper.expectACError(() => utils.getFlatRoles({}, null as any));
        helper.expectACError(() => utils.getFlatRoles({}, ''));
    });

    test('#getNonExistentRoles()', () => {
        const grants: any = { 'admin': { 'account': { 'read:any': ['*'] } } };
        expect(utils.getNonExistentRoles(grants, [])).toEqual([]);
        expect(utils.getNonExistentRoles(grants, [''])).toEqual(['']);
    });

    test('#getCrossExtendingRole()', () => {
        const grants: any = { 'user': {}, 'admin': { '$extend': ['user', 'editor'] }, 'editor': { '$extend': ['admin'] } };
        // Corrected: Cast invalid inputs to 'any' for testing purposes
        expect(utils.getCrossExtendingRole(grants, 'admin', 'admin' as any)).toEqual('admin');
        expect(utils.getCrossExtendingRole(grants, 'admin', 'user')).toEqual(null);
        helper.expectACError(() => utils.getCrossExtendingRole(grants, 'user', ['admin']));
    });

    test('#extendRole()', () => {
        const grants: any = { 'user': {}, 'admin': { '$extend': ['user', 'editor'] }, 'editor': { '$extend': ['admin'] }, 'viewer': {} };
        // Corrected: Cast invalid inputs to 'any' for testing purposes
        helper.expectACError(() => utils.extendRole(grants, null as any, ['admin']));
        helper.expectACError(() => utils.extendRole(grants, 'admin', null as any));
        helper.expectACError(() => utils.extendRole(grants, 'nonexisting', 'user'));
        helper.expectACError(() => utils.extendRole(grants, 'admin', 'nonexisting'));
        helper.expectACError(() => utils.extendRole(grants, 'admin', 'editor')); // cross
        helper.expectACError(() => utils.extendRole(grants, '$', 'user')); // reserved keyword
        expect(() => utils.extendRole(grants, 'admin', 'viewer')).not.toThrow();
    });

    test('#getUnionAttrsOfRoles()', () => {
        const grants: any = { 'user': { 'account': { 'read:own': ['*'] } }, 'admin': { '$extend': ['user'] } };
        const query: IQueryInfo = { role: 'admin', resource: 'account', action: 'read' };
        expect(utils.getUnionAttrsOfRoles(grants, query)).toEqual(['*']);
        query.role = 'nonexisting';
        helper.expectACError(() => utils.getUnionAttrsOfRoles(grants, query));
    });

    test('#lockAC()', () => {
        // Corrected: Cast invalid inputs to 'any' for testing purposes
        expect(() => utils.lockAC(null as any)).toThrow();
        const ac = new AccessControl();
        helper.expectACError(() => utils.lockAC(ac));
        (ac as any)._grants = null;
        helper.expectACError(() => utils.lockAC(ac));
    });

});