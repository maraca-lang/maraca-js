import compile from "./compile.js";
import { resolve } from "./lattice.js";
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

export default (library, source, update) => {
  const compiled = compile(parse(combine(source), library), library);
  if (update) return run(() => update(compiled));
  return run(() => resolve(compiled, true), true);
};
