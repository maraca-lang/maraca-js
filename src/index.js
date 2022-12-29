import compile from "./compile.js";
import evaluate from "./evaluate.js";
import { resolveDeep, resolveToSingle } from "./resolve.js";
import run from "./streams.js";

export { atom, derived, effect } from "./streams.js";

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

const standard = {};

export default (library, source, update) => {
  const lib = { ...standard, ...library };
  const value = evaluate(compile(merge(source), lib), lib);
  if (update) return run(() => update(value));
  return run(() => resolveDeep(value), true);
};
