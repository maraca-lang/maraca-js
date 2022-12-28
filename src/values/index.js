import contains from "./contains.js";
import { atom } from "../streams.js";

export { default as apply, map } from "./apply";
export { default as doOperation } from "./operations";

export const ANY = undefined;
export const YES = true;
export const NO = false;
export const GROUPS = {
  INTEGER: { __type: "group", value: "integer" },
  NUMBER: { __type: "group", value: "number" },
  STRING: { __type: "group", value: "string" },
};

export const cleanValue = (x) => {
  if (!x) return x;
  if (Array.isArray(x)) {
    return {
      __type: "map",
      values: {},
      items: x,
      pairs: [[{ key: ANY, value: NO }]],
    };
  }
  if (typeof x === "object" && !x.__type) {
    return {
      __type: "map",
      values: x,
      items: [],
      pairs: [[{ key: ANY, value: NO }]],
    };
  }
  return x;
};

export const resolve = (x, deep = false, copyAtom = false) => {
  if (!x) return x;
  if (Array.isArray(x)) {
    if (!deep) return x;
    return x.map((y) => resolve(y, true, copyAtom));
  }
  if (typeof x === "object") {
    if (x.isStream) return resolve(x.get(), deep, copyAtom);
    if (x.__type === "atom") {
      const atomValue = resolve(x.atom.get(), deep);
      if (copyAtom) {
        return {
          __type: "atom",
          value: x.value,
          atom: atom(atomValue),
        };
      }
      return contains(x.value, atomValue) ? atomValue : NO;
    }
    if ((x.__type && x.__type !== "map") || !deep) return x;
    return Object.fromEntries(
      Object.entries(x).map(([k, y]) => [k, resolve(y, true, copyAtom)])
    );
  }
  return x;
};
