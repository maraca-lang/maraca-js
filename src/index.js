import compile from "./compile.js";
import { apply, resolve, YES, NO } from "./values/index.js";
import parse from "./parse/index.js";
import run from "./streams.js";

export { YES, NO, resolve } from "./values/index.js";
export { atom, derived, effect } from "./streams.js";

export const reactiveFunc = (func, length) => {
  const result = Object.assign(func, { reactiveFunc: true });
  Object.defineProperty(result, "length", { value: length || func.length });
  return result;
};

const merge = (source) => {
  if (typeof source === "string") return source;
  return `[ ${Object.entries(source)
    .map(([k, v]) => `'${k}': ${merge(v)}`)
    .join(", ")} ]`;
};

const standard = {
  map: reactiveFunc(($data, $map) => {
    const data = resolve($data);
    if (Array.isArray(data)) {
      return data.map((x, i) => apply($map, [x, i + 1], true));
    }
    const result = {
      __type: "map",
      values: Object.fromEntries(
        Object.keys(data.values).map((k) => [
          k,
          apply($map, [data.values[k], k], true),
        ])
      ),
      items: data.items.map((x, i) => apply($map, [x, i + 1], true)),
      pairs: data.pairs.map((pairs) =>
        pairs.map(({ key, value, parameters }) => ({
          key,
          value: apply($map, [value, YES], true),
          parameters,
        }))
      ),
    };
    return result;
  }),
  filter: reactiveFunc(($data, $map) => {
    const data = resolve($data);
    if (Array.isArray(data)) {
      return data.filter(
        (v, i) => resolve(apply($map, [v, i + 1], true)) !== NO
      );
    }
    const result = {
      __type: "map",
      values: Object.fromEntries(
        Object.keys(data.values)
          .map((k) => [k, data.values[k]])
          .filter(([k, v]) => resolve(apply($map, [v, k], true)) !== NO)
      ),
      items: data.items.filter(
        (v, i) => resolve(apply($map, [v, i + 1], true)) !== NO
      ),
      pairs: data.pairs.map((pairs) =>
        pairs.filter(
          ({ value }) => resolve(apply($map, [value, YES], true)) !== NO
        )
      ),
    };
    return result;
  }),
};

export default (library, source, update) => {
  const fullLibrary = { ...standard, ...library };
  const compiled = compile(parse(merge(source), fullLibrary), fullLibrary);
  if (update) return run(() => update(compiled));
  return run(() => resolve(compiled, true), true);
};
