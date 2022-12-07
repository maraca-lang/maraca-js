import combine from "./combine.js";
import contains from "./contains.js";
import { YES, NO, resolve } from "./index.js";

const cleanMap = (value) => {
  if (
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

export const applySingle = ($map, $input, $args) => {
  const map = cleanMap(resolve($map));

  if (typeof map === "function") {
    return map(map.reactiveFunc ? $input : resolve($input, true));
  }

  const input = resolve($input);

  if (map?.__type !== "map") return contains(map, input) ? YES : NO;

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
      for (const { key: $key, value, length, parameters } of pairs) {
        const key = resolve($key);
        if (!parameters) {
          if (contains(key, input)) return value;
        } else {
          const args = parameters.reduce(
            (res, k) => ({ ...res, [k]: YES }),
            {}
          );
          const res = contains(key, input);
          if (res) {
            const funcRes = value({ ...args, ...(res.context || {}) });
            if (!$args || length === 1) return funcRes;
            const [$next = YES, ...$other] = $args;
            return applySingle(funcRes, $next, $other);
          }
        }
      }
      return YES;
    });
    return combine({ __type: "meet", value: pairResults });
  }

  return YES;
};

export default ($map, $args, complete) => {
  const map = resolve($map);
  if (typeof map === "function") {
    const args = map.reactiveFunc
      ? $args
      : $args.map(($arg) => resolve($arg, true));
    if (complete || args.length >= map.length) return map(...args);
    const result = Object.assign((...otherArgs) => map(...args, ...otherArgs), {
      reactiveFunc: map.reactiveFunc,
    });
    Object.defineProperty(result, "length", {
      value: map.length - args.length,
    });
    return result;
  }
  if (complete) {
    const [$first, ...$other] = $args;
    return applySingle($map, $first, $other);
  }
  return [$map, ...$args].reduce(($a, $b) => applySingle($a, $b));
};
