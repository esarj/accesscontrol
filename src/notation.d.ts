declare module 'notation' {
    export class Notation {
        constructor(obj: unknown);
        static Glob: {
            union(arr1: string[], arr2: string[]): string[];
        };
        value: unknown;
        filter(attributes: string[]): Notation;
    }
}
