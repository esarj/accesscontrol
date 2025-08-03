/**
 * An interface that defines grant object to pass AccessControl's constructor
 * @example
 * const grantObject: IGrantObject = {
 *     admin: {
 *         video: {
 *             'create:any': ['*', '!views'],
 *             'read:any': ['*'],
 *             'update:any': ['*', '!views'],
 *             'delete:any': ['*']
 *         }
 *     },
 *     user: {
 *         video: {
 *             'create:own': ['*', '!rating', '!views'],
 *             'read:own': ['*'],
 *             'update:own': ['*', '!rating', '!views'],
 *             'delete:own': ['*']
 *         }
 *     }
 * }
 */

export interface IGrantObject {
    [role: string]: RoleDefinition;
}

/**
 * Defines the structure for a single resource, mapping actions to attribute arrays.
 * e.g. { 'create:any': ['*'], 'read:any': ['*'] }
 */
export interface IResource {
    [actionAndPossession: string]: string[];
}

/**
 * Defines a role definition, which is a record of resource names mapping to
 * their resource definitions, and can optionally include an `$extend` property.
 */
type RoleDefinition = {
    [resource: string]: IResource | string[] | undefined;
    $extend?: string[];
};