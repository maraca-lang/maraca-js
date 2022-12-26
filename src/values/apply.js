import combine from "./combine.js";
import contains from "./contains.js";
import { ANY, YES, NO, resolve } from "./index.js";

const cleanMap = (value) => {
  if (
    value === ANY ||
    value === YES ||
    value === NO ||
    typeof value === "number" ||
    typeof value === "string" ||
    typeof value === "function"
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return { __type: "map", values: {}, items: value, pairs: [] };
  }
  if (typeof value === "object") {
    if (value.__type) return value;
    return { __type: "map", values: value, items: [], pairs: [] };
  }
  return NO;
};

const apply = ($map, $input) => {
  const map = cleanMap(resolve($map));

  if (typeof map === "function") {
    return map(map.reactiveFunc ? $input : resolve($input, true));
  }

  const input = resolve($input);

  if (map?.__type !== "map") return contains(map, input) ? ANY : NO;

  if (Number.isInteger(input) && input - 1 in map.items) {
    return map.items[input - 1];
  }
  if (/\d+/.test(input) && parseInt(input, 10) - 1 in map.items) {
    return map.items[parseInt(input, 10) - 1];
  }

  if (input in map.values) {
    return map.values[input];
  }

  if (map.pairs.length > 0) {
    const pairResults = map.pairs.map((pairs) => {
      for (const { key: $key, value, parameters } of pairs) {
        const key = resolve($key);
        if (!parameters) {
          if (contains(key, input)) return value;
        } else {
          const res = contains(key, input);
          if (res) return value(res.context || {});
        }
      }
      return ANY;
    });
    return combine({ __type: "meet", value: pairResults });
  }

  return ANY;
};

export const map = ($map, $data) => {
  const data = resolve($data);
  if (!data) return data;
  if (Array.isArray(data)) {
    return data.map((x, i) => apply($map, cleanMap([x, i + 1])));
  }
  const result = {
    __type: "map",
    values: Object.fromEntries(
      Object.keys(data.values).map((k) => [
        k,
        apply($map, cleanMap([data.values[k], k])),
      ])
    ),
    items: data.items.map((x, i) => apply($map, cleanMap([x, i + 1]))),
    pairs: data.pairs.map((pairs) =>
      pairs.map(({ key, value, parameters }) => ({
        key,
        value: apply($map, cleanMap([value, ANY])),
        parameters,
      }))
    ),
  };
  return result;
};

export default apply;
