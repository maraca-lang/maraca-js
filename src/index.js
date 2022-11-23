import compile from "./compile.js";
import parse from "./parse.js";
import run from "./streams.js";

export { resolve } from "./lattice.js";
export { atom, derived, effect } from "./streams.js";
export { createMap } from "./utils.js";

const combine = (source) => {
  if (typeof source === "string") return source;
  return `[ ${Object.entries(source)
    .map(([k, v]) => `'${k}': ${combine(v)}`)
    .join(", ")} ]`;
};

const resolveDeep = (x) => {
  if (!x) return x;
  if (Array.isArray(x)) return x.map((y) => resolveDeep(y));
  if (typeof x === "object") {
    if (x.isStream) return resolveDeep(x.get());
    return Object.fromEntries(
      Object.entries(x).map(([k, y]) => [k, resolveDeep(y)])
    );
  }
  return x;
};

export default (library, source, update) => {
  const compiled = compile(parse(combine(source), library), library);
  if (update) return run(() => update(compiled));
  return run(() => resolveDeep(compiled), true);
};
