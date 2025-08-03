'use strict';

/**
 * Test Suite: AccessControl
 * @author   Onur Yıldırım <onur@cutepilot.com>
 */


import { AccessControl, IResource } from '../src';
import { IGrantListItem, IQueryInfo, AccessControlError, IGrantObject } from '../src/core';
import { utils, RESERVED_KEYWORDS } from '../src/utils';
// test helper
import { helper } from './helper';

describe('Test Suite: AccessControl', () => {

    // grant list fetched from DB (to be converted to a valid grants object)
    const grantList: IGrantListItem[] = [
        { role: 'admin', resource: 'video', action: 'create:any', attributes: ['*'] },
        { role: 'admin', resource: 'video', action: 'read:any', attributes: ['*'] },
        { role: 'admin', resource: 'video', action: 'update:any', attributes: ['*'] },
        { role: 'admin', resource: 'video', action: 'delete:any', attributes: ['*'] },

        { role: 'user', resource: 'video', action: 'create:own', attributes: '*, !id' },
        { role: 'user', resource: 'video', action: 'read:any', attributes: '*; !id' },
        { role: 'user', resource: 'video', action: 'update:own', attributes: ['*', '!id'] },
        { role: 'user', resource: 'video', action: 'delete:own', attributes: ['*'] }
    ];

    // valid grants object
    const grantsObject: IGrantObject = {
        admin: {
            video: {
                'create:any': ['*'],
                'read:any': ['*'],
                'update:any': ['*'],
                'delete:any': ['*']
            }
        },
        user: {
            video: {
                'create:own': ['*', '!id'],
                'read:any': ['*', '!id'],
                'update:own': ['*', '!id'],
                'delete:own': ['*']
            }
        }
    };

    let ac: AccessControl;
    beforeEach(() => {
        ac = new AccessControl();
    });

    // ---------------------------
    //  TESTS
    // ---------------------------

    test('throw on invalid grants object', () => {
        // `undefined` does/should not throw due to default value
        const invalid: any[] = [null, true, false, '', NaN, new Date(), () => { }];
        invalid.forEach((o: any) => {
            helper.expectACError(() => new AccessControl(o));
            helper.expectACError(() => ac.setGrants(o));
        });

        // omitting is allowed (results in empty grants object: {})
        expect(() => new AccessControl()).not.toThrow();
        // empty object is allowed
        expect(() => new AccessControl({})).not.toThrow();
        expect(new AccessControl({}).getGrants()).toEqual({});
        // explicit undefined is not allowed
        helper.expectACError(() => new AccessControl(undefined as any));

        // Initial Grants as an Object
        // ----------------------------

        // reserved keywords
        helper.expectACError(() => ac.setGrants({ '$': {} } as any));
        helper.expectACError(() => ac.setGrants({ '$extend': {} } as any));
        // if $extend is set to an array of strings or empty array, it's valid
        expect(() => ac.setGrants({ 'admin': { '$extend': [] } } as any)).not.toThrow();
        // empty string in the $extend array is not allowed
        helper.expectACError(() => ac.setGrants({ 'admin': { '$extend': [''] } } as any));

        // role definition must be an object
        const invalidDefs: any[] = [[], undefined, null, true, new Date()];
        invalidDefs.forEach((o: any) => {
            helper.expectACError(() => ac.setGrants({ role: o }));
        });
        // resource definition must be an object
        invalidDefs.forEach((o: any) => {
            helper.expectACError(() => ac.setGrants({ role: { resource: o } } as any));
        });
        // actions should be one of Action enumeration (with or without possession)
        helper.expectACError(() => ac.setGrants({ role: { resource: { 'invalid': [] } } } as any));
        helper.expectACError(() => ac.setGrants({ role: { resource: { 'remove:any': [] } } } as any));
        // missing colon
        helper.expectACError(() => ac.setGrants({ role: { resource: { 'createany': [] } } } as any));
        // action/possession is ok but value is invalid
        invalidDefs.forEach((o: any) => {
            helper.expectACError(() => ac.setGrants({ role: { resource: { 'create:any': o } } } as any));
        });

        // Initial Grants as an Array
        // ----------------------------

        expect(() => new AccessControl([])).not.toThrow();
        expect(new AccessControl([]).getGrants()).toEqual({});
        // array should be an array of objects
        helper.expectACError(() => ac.setGrants([[]] as any));
        // no empty grant items
        helper.expectACError(() => ac.setGrants([{}] as any));
        // e.g. $extend is not allowed for role or resource names. it's a reserved keyword.
        RESERVED_KEYWORDS.forEach(name => {
            helper.expectACError(() => ac.setGrants([{ role: name, resource: 'video', action: 'create:any' }]));
            helper.expectACError(() => ac.setGrants([{ role: 'admin', resource: name, action: 'create:any' }]));
            helper.expectACError(() => ac.setGrants([{ role: 'admin', resource: 'video', action: name }]));
        });

        // attributes property can be omitted
        expect(() => ac.setGrants([{ role: 'admin', resource: 'video', action: 'create:any' }])).not.toThrow();
        // role, resource or action properties cannot be omitted
        helper.expectACError(() => ac.setGrants([{ resource: 'video', action: 'create:any' }] as any));
        helper.expectACError(() => ac.setGrants([{ role: 'admin', resource: 'video' }] as any));
        helper.expectACError(() => ac.setGrants([{ role: 'admin', action: 'create:any' }] as any));
    });

    test('construct with grants array or object, output a grants object', () => {
        let localAc = new AccessControl(grantList);
        let grants = localAc.getGrants();
        expect(utils.type(grants)).toEqual('object');
        expect(utils.type(grants.admin)).toEqual('object');
        expect((grants.admin.video as IResource)['create:any']).toEqual(expect.any(Array));

        localAc = new AccessControl(grantsObject);
        grants = localAc.getGrants();
        expect(utils.type(grants)).toEqual('object');
        expect(utils.type(grants.admin)).toEqual('object');
        expect((grants.admin.video as IResource)['create:any']).toEqual(expect.any(Array));

        const grantsWithExtend: IGrantObject = {
            'user': {
                'account': {
                    'read:own': ['*']
                }
            },
            'admin': {
                '$extend': ['user']
            }
        };
        localAc = new AccessControl(grantsWithExtend);
        expect(utils.type(localAc.getGrants())).toEqual('object');
        expect(localAc.can('user').readOwn('account').granted).toBe(true);
        expect(localAc.can('user').readOwn('account').attributes).toEqual(['*']);
        expect(localAc.can('admin').readOwn('account').granted).toBe(true);
        expect(localAc.can('admin').readOwn('account').attributes).toEqual(['*']);
    });

    test('reset grants with #reset() only', () => {
        const localAc = new AccessControl(grantsObject);
        expect(localAc.getRoles().length).toBeGreaterThan(0);
        helper.expectACError(() => (localAc as any).setGrants());
        helper.expectACError(() => localAc.setGrants(null as any));
        helper.expectACError(() => localAc.setGrants(undefined as any));
        expect(localAc.reset().getGrants()).toEqual({});
        expect(localAc.setGrants({}).getGrants()).toEqual({});
    });

    test('add grants from flat list (db), check/remove roles and resources', () => {
        expect((ac as any).hasRole()).toEqual(false);
        expect(ac.hasRole(null as any)).toEqual(false);
        expect(ac.hasRole(undefined as any)).toEqual(false);
        expect(ac.hasRole('')).toEqual(false);

        expect((ac as any).hasResource()).toEqual(false);
        expect(ac.hasResource(null as any)).toEqual(false);
        expect(ac.hasResource(undefined as any)).toEqual(false);
        expect(ac.hasResource('')).toEqual(false);

        ac.setGrants(grantList.concat());

        const attrs1 = ac.can('user').createOwn('video').attributes;
        const attrs2 = ac.can('user').readAny('video').attributes;
        const attrs3 = ac.query('user').updateOwn('video').attributes;
        expect(attrs1.length).toEqual(2);
        expect(attrs2.length).toEqual(2);
        expect(attrs3.length).toEqual(2);

        expect(ac.getRoles().length).toEqual(2);
        expect(ac.getResources().length).toEqual(1);
        expect(ac.hasRole('admin')).toEqual(true);
        expect(ac.hasRole('user')).toEqual(true);
        expect(ac.hasRole(['user', 'admin'])).toEqual(true);
        expect(ac.hasRole(['user', 'moderator'])).toEqual(false);
        expect(ac.hasRole('moderator')).toEqual(false);
        expect(ac.hasResource('video')).toEqual(true);
        expect(ac.hasResource(['video', 'photo'])).toEqual(false);
        ac.grant('admin').create('image');
        expect(ac.hasResource(['video', 'image'])).toEqual(true);

        ac.removeRoles('admin');
        expect(ac.hasRole('admin')).toEqual(false);
        helper.expectACError(() => ac.removeRoles([]));
        helper.expectACError(() => ac.removeRoles(['']));
        helper.expectACError(() => ac.removeRoles(['none']));
        helper.expectACError(() => ac.removeRoles(['user', 'moderator']));
        expect(ac.getRoles().length).toEqual(0);
        ac.removeResources(['video']);
        expect(ac.getResources().length).toEqual(0);
        expect(ac.hasResource('video')).toEqual(false);
    });

    test('#removeResources(), #_removePermission()', () => {
        function grantAll() {
            ac.grant(['user', 'admin']).create('photo').createOwn('photo');
            expect(ac.can('admin').createAny('photo').granted).toEqual(true);
            expect(ac.can('user').createAny('photo').granted).toEqual(true);
            expect(ac.can('admin').createOwn('photo').granted).toEqual(true);
            expect(ac.can('user').createOwn('photo').granted).toEqual(true);
        }

        grantAll();
        (ac as any).removeResources('photo', 'user');
        expect(ac.can('admin').createAny('photo').granted).toEqual(true);
        expect(ac.can('user').createAny('photo').granted).toEqual(false);
        expect(ac.can('user').createOwn('photo').granted).toEqual(false);
        expect(ac.getGrants().user.photo).toBeUndefined();

        helper.expectACError(() => (ac as any)._removePermission(null));
        helper.expectACError(() => (ac as any)._removePermission(''));
        helper.expectACError(() => (ac as any)._removePermission([]));
        helper.expectACError(() => (ac as any)._removePermission(['']));

        grantAll();
        helper.expectACError(() => (ac as any)._removePermission('photo', ''));
        helper.expectACError(() => (ac as any)._removePermission(['photo'], null));
        helper.expectACError(() => (ac as any)._removePermission('photo', []));
        helper.expectACError(() => (ac as any)._removePermission('photo', ['']));

        grantAll();
        (ac as any)._removePermission('photo', 'user', 'create');
        expect(ac.can('admin').createAny('photo').granted).toEqual(true);
        expect(ac.can('user').createAny('photo').granted).toEqual(false);
        expect(ac.can('user').createOwn('photo').granted).toEqual(true);
        expect(ac.getGrants().user.photo).toBeDefined();
    });

    test('grant/deny access and check permissions', () => {
        const attrs = ['*', '!size'];

        ac.grant('user').createAny('photo', attrs);
        expect((ac.getGrants().user.photo as IResource)['create:any']).toEqual(attrs);
        expect(ac.can('user').createAny('photo').attributes).toEqual(attrs);

        ac.deny('user').createAny('photo', attrs); // <- denied even with attrs
        expect(ac.can('user').createAny('photo').granted).toEqual(false);
        expect(ac.can('user').createAny('photo').attributes).toEqual([]);

        ac.grant('user').createOwn('photo', attrs);
        expect((ac.getGrants().user.photo as IResource)['create:own']).toEqual(attrs);
        expect(ac.can('user').createOwn('photo').attributes).toEqual(attrs);

        ac.grant(['user', 'admin']).readAny('photo', attrs);
        expect(ac.can('user').readAny('photo').granted).toEqual(true);
        expect(ac.can('admin').readAny('photo').granted).toEqual(true);

        ac.deny('user, admin').readAny('photo');
        expect(ac.can('user').readAny('photo').granted).toEqual(false);
        expect(ac.can('admin').readAny('photo').granted).toEqual(false);

        ac.grant('user').updateAny('photo', attrs);
        expect((ac.getGrants().user.photo as IResource)['update:any']).toEqual(attrs);
        expect(ac.can('user').updateAny('photo').attributes).toEqual(attrs);

        ac.grant('user').updateOwn('photo', attrs);
        expect((ac.getGrants().user.photo as IResource)['update:own']).toEqual(attrs);
        expect(ac.can('user').updateOwn('photo').attributes).toEqual(attrs);

        ac.grant('user').deleteAny('photo', attrs);
        expect((ac.getGrants().user.photo as IResource)['delete:any']).toEqual(attrs);
        expect(ac.can('user').deleteAny('photo').attributes).toEqual(attrs);

        ac.grant('user').deleteOwn('photo', attrs);
        expect((ac.getGrants().user.photo as IResource)['delete:own']).toEqual(attrs);
        expect(ac.can('user').deleteOwn('photo').attributes).toEqual(attrs);

        expect(ac.query('user').updateAny('photo').attributes).toEqual(attrs);
        expect(ac.query('user').deleteAny('photo').attributes).toEqual(attrs);
        expect(ac.query('user').deleteOwn('photo').attributes).toEqual(attrs);
    });

    test('explicit undefined', () => {
        helper.expectACError(() => (ac as any).grant(undefined));
        helper.expectACError(() => (ac as any).deny(undefined));
        helper.expectACError(() => (ac as any).can(undefined));
        helper.expectACError(() => (ac as any).query(undefined));
    });

    test('aliases: #allow(), #reject(), #query()', () => {
        ac.grant(['user', 'admin']).createAny('photo');
        expect(ac.can('user').createAny('photo').granted).toBe(true);

        ac.reset();
        ac.allow(['user', 'admin']).createAny('photo');
        expect(ac.query('user').createAny('photo').granted).toBe(true);

        ac.reject('user').createAny('photo');
        expect(ac.query('user').createAny('photo').granted).toBe(false);
        expect(ac.can('user').createAny('photo').granted).toBe(false);
    });

    test('#permission()', () => {
        const localAc = new AccessControl(grantsObject);
        expect(localAc.can('admin').createAny('video').granted).toBe(true);

        const queryInfo: IQueryInfo = {
            role: 'admin',
            resource: 'video',
            action: 'create:any'
        };
        expect(localAc.permission(queryInfo).granted).toBe(true);
        queryInfo.role = 'user';
        expect(localAc.permission(queryInfo).granted).toBe(false);
        queryInfo.action = 'create:own';
        expect(localAc.permission(queryInfo).granted).toBe(true);
    });

    test('chain grant methods and check permissions', () => {
        const attrs = ['*'];

        ac.grant('superadmin')
            .createAny('profile', attrs)
            .readAny('profile', attrs)
            .createAny('video', []) // no attributes allowed
            .createAny('photo'); // all attributes allowed

        expect(ac.can('superadmin').createAny('profile').granted).toEqual(true);
        expect(ac.can('superadmin').readAny('profile').granted).toEqual(true);
        expect(ac.can('superadmin').createAny('video').granted).toEqual(false);
        expect(ac.can('superadmin').createAny('photo').granted).toEqual(true);
    });

    test('grant/deny access via object and check permissions', () => {
        const o1 = {
            role: 'moderator',
            resource: 'post',
            action: 'create:any',
            attributes: ['*']
        };
        const o2 = {
            role: 'moderator',
            resource: 'news',
            action: 'read',
            possession: 'own',
            attributes: ['*']
        };
        const o3 = {
            role: 'moderator',
            resource: 'book',
            attributes: ['*']
        };

        ac.grant(o1).grant(o2);
        ac.grant(o3).updateAny();

        expect(ac.can('moderator').createAny('post').granted).toEqual(true);
        expect(ac.can('moderator').readOwn('news').granted).toEqual(true);
        expect(ac.can('moderator').updateAny('book').granted).toEqual(true);

        ac.deny(o1).deny(o2);
        ac.deny(o3).updateAny();

        expect(ac.can('moderator').createAny('post').granted).toEqual(false);
        expect(ac.can('moderator').readOwn('news').granted).toEqual(false);
        expect(ac.can('moderator').updateAny('book').granted).toEqual(false);

        ac.grant(o1).readOwn();
        expect(ac.can('moderator').readOwn('post').granted).toEqual(true);
        ac.deny(o1).readOwn();
        expect(ac.can('moderator').readOwn('post').granted).toEqual(false);

        expect(ac.can('moderator').updateOwn('news').granted).toEqual(false);
        expect(ac.can('moderator').createAny('foo').granted).toEqual(false);
    });

    test('grant/deny access (variation, chained)', () => {
        ac.setGrants(grantsObject);

        expect(ac.can('admin').createAny('video').granted).toEqual(true);
        ac.deny('admin').create('video');
        expect(ac.can('admin').createAny('video').granted).toEqual(false);

        ac.grant('foo').createOwn('bar');
        expect(ac.can('foo').createAny('bar').granted).toEqual(false);
        expect(ac.can('foo').createOwn('bar').granted).toEqual(true);

        ac.grant('foo').create('baz', []);
        expect(ac.can('foo').create('baz').granted).toEqual(false);

        ac.grant('qux')
            .createOwn('resource1')
            .updateOwn('resource2')
            .readAny('resource1')
            .deleteAny('resource1', []);
        expect(ac.can('qux').createOwn('resource1').granted).toEqual(true);
        expect(ac.can('qux').updateOwn('resource2').granted).toEqual(true);
        expect(ac.can('qux').readAny('resource1').granted).toEqual(true);
        expect(ac.can('qux').deleteAny('resource1').granted).toEqual(false);

        ac.deny('qux')
            .createOwn('resource1')
            .updateOwn('resource2')
            .readAny('resource1')
            .deleteAny('resource1', []);
        expect(ac.can('qux').createOwn('resource1').granted).toEqual(false);
        expect(ac.can('qux').updateOwn('resource2').granted).toEqual(false);
        expect(ac.can('qux').readAny('resource1').granted).toEqual(false);
        expect(ac.can('qux').deleteAny('resource1').granted).toEqual(false);

        ac.grant('editor').resource('file1').updateAny();
        ac.grant().role('editor').updateAny('file2');
        ac.grant().role('editor').resource('file3').updateAny();
        expect(ac.can('editor').updateAny('file1').granted).toEqual(true);
        expect(ac.can('editor').updateAny('file2').granted).toEqual(true);
        expect(ac.can('editor').updateAny('file3').granted).toEqual(true);

        ac.deny('editor').resource('file1').updateAny();
        ac.deny().role('editor').updateAny('file2');
        ac.deny().role('editor').resource('file3').updateAny();
        expect(ac.can('editor').updateAny('file1').granted).toEqual(false);
        expect(ac.can('editor').updateAny('file2').granted).toEqual(false);
        expect(ac.can('editor').updateAny('file3').granted).toEqual(false);

        ac.grant('editor')
            .resource('fileX').readAny().createOwn()
            .resource('fileY').updateOwn().deleteOwn();
        expect(ac.can('editor').readAny('fileX').granted).toEqual(true);
        expect(ac.can('editor').createOwn('fileX').granted).toEqual(true);
        expect(ac.can('editor').updateOwn('fileY').granted).toEqual(true);
        expect(ac.can('editor').deleteOwn('fileY').granted).toEqual(true);

        ac.deny('editor')
            .resource('fileX').readAny().createOwn()
            .resource('fileY').updateOwn().deleteOwn();
        expect(ac.can('editor').readAny('fileX').granted).toEqual(false);
        expect(ac.can('editor').createOwn('fileX').granted).toEqual(false);
        expect(ac.can('editor').updateOwn('fileY').granted).toEqual(false);
        expect(ac.can('editor').deleteOwn('fileY').granted).toEqual(false);
    });

    test('switch-chain grant/deny roles', () => {
        ac.grant('r1')
            .createOwn('a')
            .grant('r2')
            .createOwn('b')
            .readAny('b')
            .deny('r1')
            .deleteAny('b')
            .grant('r1')
            .updateAny('c')
            .deny('r2')
            .readAny('c');

        expect(ac.can('r1').createOwn('a').granted).toEqual(true);
        expect(ac.can('r1').deleteAny('b').granted).toEqual(false);
        expect(ac.can('r1').updateAny('c').granted).toEqual(true);
        expect(ac.can('r2').createOwn('b').granted).toEqual(true);
        expect(ac.can('r2').readAny('b').granted).toEqual(true);
        expect(ac.can('r2').readAny('c').granted).toEqual(false);
    });

    test('Access#deny() should set attributes to []', () => {
        ac.deny('user').createAny('book', ['*']);
        expect((ac.getGrants().user.book as IResource)['create:any']).toEqual([]);
    });

    test('grant comma/semi-colon separated roles', () => {
        ac.grant('role2; role3, editor; viewer, agent').createOwn('book');
        expect(ac.hasRole('role3')).toEqual(true);
        expect(ac.hasRole('editor')).toEqual(true);
        expect(ac.hasRole('agent')).toEqual(true);
    });

    test('Permission#roles, Permission#resource', () => {
        ac.grant('foo, bar').createOwn('baz');
        expect(ac.can('bar').createAny('baz').granted).toEqual(false);
        expect(ac.can('bar').createOwn('baz').granted).toEqual(true);
        expect(ac.can('foo').create('baz').roles).toContain('foo');
        expect(ac.can('foo').create('baz').resource).toEqual('baz');
    });

    test('#extendRole(), #removeRoles(), Access#extend()', () => {
        ac.grant('admin').createOwn('book');

        expect(() => ac.extendRole('onur', 'admin')).toThrow();
        ac.grant('onur').extend('admin');

        expect(ac.getGrants().onur!.$extend!.length).toEqual(1);
        expect(ac.getGrants().onur!.$extend![0]).toEqual('admin');

        ac.grant('role2, role3, editor, viewer, agent').createOwn('book');

        ac.extendRole('onur', ['role2', 'role3']);
        expect(ac.getGrants().onur.$extend).toEqual(['admin', 'role2', 'role3']);

        ac.grant('admin').extend('editor');
        expect(ac.getGrants().admin.$extend).toEqual(['editor']);
        ac.grant('admin').extend(['viewer', 'editor', 'agent']).readAny('video');
        expect(ac.getGrants().admin.$extend).toContain('editor');
        expect(ac.getGrants().admin.$extend).toEqual(['editor', 'viewer', 'agent']);

        ac.grant(['editor', 'agent']).extend(['role2', 'role3']).updateOwn('photo');
        expect(ac.getGrants().editor.$extend).toEqual(['role2', 'role3']);
        expect(ac.getGrants().agent.$extend).toEqual(['role2', 'role3']);

        ac.removeRoles(['editor', 'agent']);
        expect(ac.getGrants().editor).toBeUndefined();
        expect(ac.getGrants().agent).toBeUndefined();
        expect(ac.getGrants().admin.$extend).not.toContain('editor');
        expect(ac.getGrants().admin.$extend).not.toContain('agent');

        expect(() => ac.grant('roleX').extend('roleX')).toThrow();
        expect(() => ac.grant(['admin2', 'roleX']).extend(['roleX', 'admin3'])).toThrow();
    });

    describe('extend before or after resource permissions are granted', () => {
        let localAc: AccessControl;

        function init() {
            localAc = new AccessControl();
            localAc.grant(['user', 'admin']);
            expect(localAc.getRoles().length).toEqual(2);
        }

        beforeEach(() => {
            init();
        });

        test('case #1', () => {
            localAc.grant('admin').extend('user');
            localAc.grant('user').createOwn('video');
            expect(localAc.can('admin').createOwn('video').granted).toEqual(true);
        });

        test('case #2', () => {
            localAc.grant('user').createOwn('video');
            localAc.grant('admin').extend('user');
            expect(localAc.can('admin').createOwn('video').granted).toEqual(true);
        });
    });

    test('extend multi-level (deep) roles', () => {
        ac.grant('viewer').readAny('devices');
        ac.grant('ops').extend('viewer').updateAny('devices', ['*', '!id']);
        ac.grant('admin').extend('ops').deleteAny('devices');
        ac.grant('superadmin').extend(['admin', 'ops']).createAny('devices');
        expect(() => ac.extendRole(['ops', 'admin'], 'viewer')).not.toThrow();

        expect(ac.can('ops').readAny('devices').granted).toEqual(true);
        expect(ac.can('admin').readAny('devices').granted).toEqual(true);
        expect(ac.can('admin').updateAny('devices').granted).toEqual(true);
        expect(ac.can('superadmin').readAny('devices').granted).toEqual(true);

        expect(ac.can('superadmin').updateAny('devices').attributes).toEqual(['*', '!id']);
        ac.grant('superadmin').updateAny('devices', ['*']);
        expect(ac.can('superadmin').updateAny('devices').attributes).toEqual(['*']);

        expect(ac.getInheritedRolesOf('viewer')).toEqual([]);
        expect(ac.getInheritedRolesOf('ops')).toEqual(['viewer']);
        expect(ac.getInheritedRolesOf('admin')).toEqual(['ops', 'viewer']);
        expect(ac.getInheritedRolesOf('superadmin')).toEqual(['admin', 'ops', 'viewer']);
    });

    test('throw if target role or inherited role does not exit', () => {
        helper.expectACError(() => ac.grant().createOwn());
        ac.setGrants(grantsObject);
        helper.expectACError(() => ac.can('invalid-role').createOwn('video'), 'Role not found');
        helper.expectACError(() => ac.grant('user').extend('invalid-role'));
        helper.expectACError(() => ac.grant('user').extend(['invalid1', 'invalid2']));
    });

    test('throw on invalid or reserved names', () => {
        RESERVED_KEYWORDS.forEach(name => {
            helper.expectACError(() => ac.grant(name));
            helper.expectACError(() => ac.deny(name));
            helper.expectACError(() => ac.grant().role(name));
            helper.expectACError(() => ac.grant('role').resource(name));
        });
        expect(() => ac.grant()).not.toThrow(); // omitted.
        helper.expectACError(() => ac.grant(undefined as any)); // explicit undefined
        helper.expectACError(() => ac.grant(null as any));
        helper.expectACError(() => ac.grant(''));
        helper.expectACError(() => (ac as any).grant(1));
        helper.expectACError(() => (ac as any).grant(true));
        helper.expectACError(() => (ac as any).grant(false));
        helper.expectACError(() => (ac as any).grant([]));
        helper.expectACError(() => (ac as any).grant({}));
        helper.expectACError(() => new AccessControl({ $: [] } as any));
        helper.expectACError(() => new AccessControl({ $extend: {} } as any));
    });

    test('init with grants object with $extend (issue #22)', () => {
        const grants: IGrantObject = {
            "viewer": { "account": { "read:own": ["*"] } },
            "user": {
                "$extend": ["viewer"],
                "account": { "update:own": ['*'] }
            },
            "admin": {
                "$extend": ["user"],
                "account": { "create:any": ["*"], "delete:any": ["*"] }
            }
        };
        expect(() => new AccessControl(grants)).not.toThrow();
        const localAc = new AccessControl();
        expect(() => localAc.setGrants(grants)).not.toThrow();
        const grants1 = localAc.getGrants();
        localAc.reset();
        expect(localAc.getGrants()).toEqual({});
        localAc.grant('viewer').readOwn('account')
            .grant('user').extend('viewer').updateOwn('account')
            .grant('admin').extend('user').create('account').delete('account');
        const grants2 = localAc.getGrants();
        expect(grants1).toEqual(grants2);
    });

    test('throw if a role attempts to extend itself', () => {
        helper.expectACError(() => ac.grant('user').extend('user'));

        const grants = { 'user': { '$extend': ['user'] } };
        helper.expectACError(() => new AccessControl(grants as any));
        helper.expectACError(() => ac.setGrants(grants as any));
    });

    test('throw on cross-role inheritance', () => {
        ac.grant(['user', 'admin']).createOwn('video');
        expect(ac.getRoles().length).toEqual(2);

        ac.grant('admin').extend('user');
        helper.expectACError(() => ac.grant('user').extend('admin'));

        ac.grant(['editor', 'viewer', 'sa']).createOwn('image');
        ac.grant('sa').extend('editor');
        ac.grant('editor').extend('viewer');
        helper.expectACError(() => ac.grant('viewer').extend('sa'));

        let grants: IGrantObject = {
            'user': { '$extend': ['admin'] },
            'admin': { '$extend': ['user'] }
        };
        helper.expectACError(() => new AccessControl(grants));
        helper.expectACError(() => ac.setGrants(grants));

        grants = {
            'user': { '$extend': ['sa'] },
            'sa': { '$extend': ['editor'] },
            'editor': { '$extend': ['viewer'] },
            'viewer': { '$extend': ['user'] }
        };
        helper.expectACError(() => new AccessControl(grants));
        helper.expectACError(() => ac.setGrants(grants));

        grants = {
            'user': { '$extend': ['sa'] },
            'sa': { '$extend': ['editor'] },
            'editor': { '$extend': ['user'] },
            'viewer': { '$extend': ['editor'] }
        };
        helper.expectACError(() => new AccessControl(grants));
        helper.expectACError(() => ac.setGrants(grants));
    });

    test('throw if grant or deny objects are invalid', () => {
        let o: any;

        o = { role: '', resource: 'post', action: 'create:any', attributes: ['*'] };
        expect(() => ac.grant(o)).toThrow();
        expect(() => ac.deny(o)).toThrow();

        o = { role: 'moderator', resource: null, action: 'create:any', attributes: ['*'] };
        expect(() => ac.grant(o)).toThrow();
        expect(() => ac.deny(o)).toThrow();

        o = { role: 'admin', resource: 'post', action: 'put:any', attributes: ['*'] };
        expect(() => ac.grant(o)).toThrow();
        expect(() => ac.deny(o)).toThrow();

        o = { role: 'admin', resource: 'post', action: null, attributes: ['*'] };
        expect(() => ac.grant(o)).toThrow();
        expect(() => ac.deny(o)).toThrow();

        o = { role: 'admin', resource: 'post', action: 'create:all', attributes: ['*'] };
        expect(() => ac.grant(o)).toThrow();
        expect(() => ac.deny(o)).toThrow();

        o = { role: 'admin2', resource: 'post', action: 'create', attributes: ['*'] };
        expect(() => ac.grant(o)).not.toThrow();
        expect(ac.can('admin2').createAny('post').granted).toEqual(true);
        expect(ac.can('admin2').createOwn('post').granted).toEqual(true);
        expect(() => ac.deny(o)).not.toThrow();
    });

    test('Check with multiple roles changes grant list (issue #2)', () => {
        ac.grant('admin').updateAny('video')
            .grant(['user', 'admin']).updateOwn('video');

        expect(ac.can(['admin']).updateAny('video').granted).toEqual(true);
        ac.can(['user', 'admin']).updateOwn('video');
        expect(ac.can(['admin']).updateAny('video').granted).toEqual(true);
        expect(ac.can(['admin']).updateOwn('video').granted).toEqual(true);
    });

    test('grant/deny multiple roles and multiple resources', () => {
        ac.grant('admin, user').createAny('profile, video');
        expect(ac.can('admin').createAny('profile').granted).toEqual(true);
        expect(ac.can('admin').createAny('video').granted).toEqual(true);
        expect(ac.can('user').createAny('profile').granted).toEqual(true);
        expect(ac.can('user').createAny('video').granted).toEqual(true);

        ac.grant('admin, user').createAny('profile, video', '*,!id');
        expect(ac.can('admin').createAny('profile').attributes).toEqual(['*', '!id']);
        expect(ac.can('admin').createAny('video').attributes).toEqual(['*', '!id']);
        expect(ac.can('user').createAny('profile').attributes).toEqual(['*', '!id']);
        expect(ac.can('user').createAny('video').attributes).toEqual(['*', '!id']);

        ac.deny('admin, user').readAny('photo, book', '*,!id');
        expect(ac.can('admin').readAny('photo').attributes).toEqual([]);
        expect(ac.can('admin').readAny('book').attributes).toEqual([]);
        expect(ac.can('user').readAny('photo').attributes).toEqual([]);
        expect(ac.can('user').readAny('book').attributes).toEqual([]);

        expect(ac.can('user').createAny('non-existent').granted).toEqual(false);
    });

    test('Permission#filter()', () => {
        const attrs = ['*', '!account.balance.credit', '!account.id', '!secret'];
        let data: any = {
            name: 'Company, LTD.',
            address: { city: 'istanbul', country: 'TR' },
            account: { id: 33, taxNo: 12345, balance: { credit: 100, deposit: 0 } },
            secret: { value: 'hidden' }
        };
        ac.grant('user').createOwn('company', attrs);
        let permission = ac.can('user').createOwn('company');
        expect(permission.granted).toEqual(true);
        let filtered = permission.filter(data);
        expect(filtered.name).toEqual(expect.any(String));
        expect(filtered.address).toEqual(expect.any(Object));
        expect(filtered.address.city).toEqual('istanbul');
        expect(filtered.account).toBeDefined();
        expect(filtered.account.id).toBeUndefined();
        expect(filtered.account.balance).toBeDefined();
        expect(filtered.account.balance.credit).toBeUndefined();
        expect(filtered.secret).toBeUndefined();

        ac.deny('user').createOwn('company');
        permission = ac.can('user').createOwn('company');
        expect(permission.granted).toEqual(false);
        filtered = permission.filter(data);
        expect(filtered).toEqual({});

        const attrs2 = ['*', '!id'];
        const data2 = [
            { id: 1, name: 'x', age: 30 },
            { id: 2, name: 'y', age: 31 },
            { id: 3, name: 'z', age: 32 }
        ];
        ac.grant('user')
            .createOwn('account', ['*'])
            .updateOwn('account', attrs2);
        permission = ac.can('user').updateOwn('account');
        filtered = permission.filter(data2);
        expect(filtered).toEqual(expect.any(Array));
        expect(filtered.length).toEqual(data2.length);
    });

    test('union granted attributes for extended roles, on query', () => {
        const restrictedAttrs = ['*', '!id', '!pwd'];
        ac.grant('user').updateAny('video', restrictedAttrs)
            .grant('admin').extend('user');
        expect(ac.can('admin').updateAny('video').attributes).toEqual(restrictedAttrs);

        ac.grant('admin').updateAny('video');
        expect(ac.can('admin').updateAny('video').attributes).toEqual(['*']);

        ac.grant('editor').updateAny('video', ['*', '!pwd', 'title']).extend('user');
        expect(ac.can('editor').updateAny('video').attributes).toEqual(['*', '!pwd']);

        ac.grant('role1').createOwn('photo', ['image', 'name'])
            .grant('role2').createOwn('photo', ['name', '!location'])
            .grant('role3').createOwn('photo', ['*', '!location'])
            .grant('role4').extend(['role1', 'role2'])
            .grant('role5').extend(['role1', 'role2', 'role3']);
        expect(ac.can('role4').createOwn('photo').attributes).toEqual(['image', 'name']);
        expect(ac.can('role5').createOwn('photo').attributes).toEqual(['*', '!location']);
    });

    test('AccessControl.filter()', () => {
        const o = { name: 'John', age: 30, account: { id: 1, country: 'US' } };
        const x = AccessControl.filter(o, ['*', '!account.id', '!age']);
        expect(x.name).toEqual('John');
        expect(x.account.id).toBeUndefined();
        expect(x.account.country).toEqual('US');

        expect(o.account.id).toEqual(1);
        expect(o).not.toEqual(x);
    });

    test('AccessControl#lock(), Access#lock()', () => {
        let localAc: AccessControl;

        function _inoperative() {
            helper.expectACError(() => localAc.setGrants({}));
            helper.expectACError(() => localAc.reset());
            helper.expectACError(() => localAc.grant('editor'));
            helper.expectACError(() => localAc.deny('admin'));
            helper.expectACError(() => localAc.extendRole('admin', 'user'));
            helper.expectACError(() => localAc.removeRoles(['admin']));
            helper.expectACError(() => localAc.removeResources(['video']));

            expect(() => ((localAc as any)._grants.hacker = { 'account': { 'read:any': ['*'] } })).toThrow();
            expect(localAc.hasRole('hacker')).toBe(false);
        }

        function _operative() {
            expect(localAc.getRoles()).toContain('user');
            expect(localAc.getRoles()).toContain('admin');
            expect(localAc.getResources()).toContain('video');
            expect(localAc.getExtendedRolesOf('admin')).not.toContain('user');
        }

        function _test() {
            _inoperative();
            _operative();
        }

        localAc = new AccessControl();
        localAc.grant('user').createAny('video')
            .grant('admin').createAny('photo')
            .lock();
        _test();

        localAc = new AccessControl();
        localAc.grant('user').createAny('video')
            .grant('admin').createAny('photo');
        localAc.lock();
        _test();

        localAc = new AccessControl();
        helper.expectACError(() => localAc.lock());
        localAc.setGrants({ 'admin': { 'account': {} } }).lock();
        _inoperative();

        localAc = new AccessControl();
        localAc.setGrants({ 'admin': { 'account': {} } });
        (localAc as any)._isLocked = true;
        localAc.lock();
        _inoperative();

        localAc = new AccessControl({ 'admin': { 'account': {} } });
        Object.freeze((localAc as any)._grants);
        localAc.lock();
        helper.expectACError(() => localAc.removeResources(['account']));
        _inoperative();

        localAc = new AccessControl({ 'admin': { 'account': {} } });
        (localAc as any)._isLocked = true;
        Object.freeze((localAc as any)._grants);
        localAc.lock();
        helper.expectACError(() => localAc.removeResources(['account']));
        _inoperative();
    });

    test('Action / Possession enumerations', () => {
        expect(AccessControl.Action).toEqual(expect.any(Object));
        expect(AccessControl.Possession).toEqual(expect.any(Object));
        expect(AccessControl.Possession.ANY).toBe('any');
        expect(AccessControl.Possession.OWN).toBe('own');
    });

    test('AccessControlError', () => {
        helper.expectACError(() => { throw new AccessControl.Error(); });
        helper.expectACError(() => { throw new AccessControlError(); });
        expect(new AccessControlError().message).toEqual('');
    });

});