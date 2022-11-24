import combine from "./combine.js";
import contains from "./contains.js";
import { ANY, NONE } from "./index.js";

const cleanMap = (value) => {
  if (
    typeof value === "number" ||
    typeof value === "string" ||
    typeof value === "function"
  ) {
    return value;
  }
  if (!value) {
    return value === undefined ? ANY : NONE;
  }
  if (Array.isArray(value)) {
    return { type: "map", values: {}, items: value, pairs: [] };
  }
  if (typeof value === "object") {
    if (value.type) return value;
    return { type: "map", values: value, items: [], pairs: [] };
  }
  return NONE;
};

export default (map, input) => {
  const m = cleanMap(map);

  if (typeof m === "function") return m(input);

  if (m?.type !== "map") return contains(m, input) ? ANY : NONE;

  if (Number.isInteger(input) && input - 1 in m.items) {
    return m.items[input - 1];
  }
  if (/\d+/.test(input) && parseInt(input, 10) - 1 in m.items) {
    return m.items[parseInt(input, 10) - 1];
  }

  if (input in m.values) {
    return m.values[input];
  }

  if (m.pairs.length > 0) {
    const pairResults = m.pairs.map((pairs) => {
      for (const { key, value, parameters } of pairs) {
        if (!parameters) {
          if (contains(key, input, {})) return value;
        } else {
          const args = parameters.reduce(
            (res, k) => ({ ...res, [k]: ANY }),
            {}
          );
          if (contains(key, input, args)) return value(args);
        }
      }
      return ANY;
    });
    return combine({ type: "meet", value: pairResults });
  }

  return ANY;
};
