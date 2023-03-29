import compile from "./compile.js";
import evaluate from "./evaluate.js";
import { resolveDeep, resolveToSingle } from "./signals.js";

export { atom, derived, effect } from "./signals.js";

export const reactiveFunc = (func) =>
  Object.assign(func, { reactiveFunc: true });

export const resolve = (value, deep = false) =>
  deep ? resolveDeep(value) : resolveToSingle(value);

const merge = (source) => {
  if (typeof source === "string") return source;
  return `[ ${Object.entries(source)
    .map(([k, v]) => `${k}: ${merge(v)}`)
    .join(", ")} ]`;
};

export default (library, source) =>
  evaluate(compile(merge(source), library), library);
