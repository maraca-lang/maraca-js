import combine from "./combine.js";

export { default as apply } from "./apply";
export { default as doOperation } from "./operations";

export const ANY = undefined;
export const NONE = false;
export const GROUPS = {
  INTEGER: { __type: "group", value: "integer" },
  NUMBER: { __type: "group", value: "number" },
  STRING: { __type: "group", value: "string" },
};

export const resolve = (x, deep = false) => {
  if (!x) return x;
  if (Array.isArray(x)) {
    if (!deep) return x;
    return x.map((y) => resolve(y, true));
  }
  if (typeof x === "object") {
    if (x.isStream) return resolve(x.get(), deep);
    if (x.__type === "atom") {
      return combine({
        __type: "meet",
        value: [x.value, resolve(x.atom, deep)],
      });
    }
    if (!deep) return x;
    return Object.fromEntries(
      Object.entries(x).map(([k, y]) => [k, resolve(y, true)])
    );
  }
  return x;
};
