import * as R from "ramda";

const deepMergeRecursive = (a: any, b: any): any => {
  if (Array.isArray(a) && Array.isArray(b)) {
    return [...a, ...b];
  }
  if (typeof a === "object" && typeof b === "object") {
    return R.mergeDeepWith(deepMergeRecursive, a, b);
  }
};

export function deepMerge(...objs: any[]): any {
  return objs.reduce(deepMergeRecursive, {});
}
