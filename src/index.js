import compile from "./compile.js";
import { apply, cleanValue, resolve, YES } from "./values/index.js";
import parse from "./parse/index.js";
import run from "./streams.js";

export { YES, NO, resolve } from "./values/index.js";
export { atom, derived, effect } from "./streams.js";

export const reactiveFunc = (func) =>
  Object.assign(func, { reactiveFunc: true });

const merge = (source) => {
  if (typeof source === "string") return source;
  return `( ${Object.entries(source)
    .map(([k, v]) => `'${k}': ${merge(v)}`)
    .join(", ")} )`;
};

const standard = {
  filter: reactiveFunc((_input) => {
    const [$data, $map] = resolve(_input).items;
    const data = resolve($data);
    if (Array.isArray(data)) {
      return data.filter(
        (v, i) => resolve(apply($map, cleanValue([v, i + 1]))) !== NO
      );
    }
    const result = {
      __type: "map",
      values: Object.fromEntries(
        Object.keys(data.values)
          .map((k) => [k, data.values[k]])
          .filter(([k, v]) => resolve(apply($map, cleanValue([v, k]))) !== NO)
      ),
      items: data.items.filter(
        (v, i) => resolve(apply($map, cleanValue([v, i + 1]))) !== NO
      ),
      pairs: data.pairs.map((pairs) =>
        pairs.filter(
          ({ value }) => resolve(apply($map, cleanValue([value, YES]))) !== NO
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
