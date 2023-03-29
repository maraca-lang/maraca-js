import compile from "./compile.js";
import evaluate from "./evaluate.js";
import { resolveDeep, resolveItems, resolveToSingle } from "./signals.js";

export { atom, derived, effect } from "./signals.js";

export const reactiveFunc = (func) =>
  Object.assign(func, { reactiveFunc: true });

export const resolve = (x, deep = false) => {
  if (deep) return resolveDeep(x);
  const value = resolveToSingle(x);
  if (value?.__type === "block") {
    return { ...value, items: resolveItems(value.items) };
  }
  return value;
};

const merge = (source) => {
  if (typeof source === "string") return source;
  return `[ ${Object.entries(source)
    .map(([k, v]) => `${k}: ${merge(v)}`)
    .join(", ")} ]`;
};

export default (library, source) =>
  evaluate(compile(merge(source), library), library);
