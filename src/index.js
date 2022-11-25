import compile from "./compile.js";
import { resolve } from "./values/index.js";
import parse from "./parse/index.js";
import run from "./streams.js";

export { resolve } from "./values/index.js";
export { atom, derived, effect } from "./streams.js";

const merge = (source) => {
  if (typeof source === "string") return source;
  return `[ ${Object.entries(source)
    .map(([k, v]) => `'${k}': ${merge(v)}`)
    .join(", ")} ]`;
};

export default (library, source, update) => {
  const compiled = compile(parse(merge(source), library), library);
  if (update) return run(() => update(compiled));
  return run(() => resolve(compiled, true), true);
};
