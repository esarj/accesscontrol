'use strict';

/**
 *  Test Helper
 *  @author   Onur Yıldırım <onur@cutepilot.com>
 */

import { AccessControl } from '../src';
import { AccessControlError } from '../src/core';

const helper = {
    expectACError(fn: any, errMsg?: string) {
        expect(fn).toThrow();
        try {
            fn();
        } catch (err) {
            expect(err instanceof AccessControl.Error).toEqual(true);
            expect(err instanceof AccessControlError).toEqual(true);
            expect(AccessControl.isAccessControlError(err)).toEqual(true);
            expect(AccessControl.isACError(err)).toEqual(true); // alias test
            if (errMsg && typeof err === 'object' && err !== null && 'message' in err && typeof (err as any).message === 'string') {
                expect((err as any).message).toContain(errMsg);
            }
        }
    }

};

export { helper };
