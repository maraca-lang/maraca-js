import compile from "./compile.js";
import { apply, resolve, NONE } from "./values/index.js";
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

const standard = {
  map: ({ items: [$data, $map] }) => {
    const data = resolve($data);
    const result = {
      __type: "map",
      values: Object.fromEntries(
        Object.keys(data.values).map((k) => [k, apply($map, data.values[k])])
      ),
      items: data.items.map((x) => apply($map, x)),
      pairs: data.pairs.map((pairs) =>
        pairs.map(({ key, value, parameters }) => ({
          key,
          value: apply($map, value),
          parameters,
        }))
      ),
    };
    return result;
  },
  filter: ({ items: [$data, $map] }) => {
    const data = resolve($data);
    const result = {
      __type: "map",
      values: Object.fromEntries(
        Object.keys(data.values)
          .map((k) => [k, data.values[k]])
          .filter(([_, v]) => resolve(apply($map, v)) !== NONE)
      ),
      items: data.items.filter((v) => resolve(apply($map, v)) !== NONE),
      pairs: data.pairs.map((pairs) =>
        pairs.filter(({ value }) => resolve(apply($map, value)) !== NONE)
      ),
    };
    return result;
  },
};

export default (library, source, update) => {
  const fullLibrary = { ...standard, ...library };
  const compiled = compile(parse(merge(source), fullLibrary), fullLibrary);
  if (update) return run(() => update(compiled));
  return run(() => resolve(compiled, true), true);
};
