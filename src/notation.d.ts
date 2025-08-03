declare module 'notation' {
  export class Notation {
    constructor(obj: any);
    value: any;
    filter(attributes: string[]): Notation;
    static Glob: {
      union(arr1: string[], arr2: string[]): string[];
    };
  }
}
