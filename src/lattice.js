import {
  joinRanges,
  joinRangeValue,
  meetRanges,
  rangeIncludes,
} from "./range.js";
import { ANY, NONE, GROUPS, createMap } from "./utils.js";

const isValue = (a) => typeof a === "number" || typeof a === "string";

const arrayShallowEqual = (x, y) =>
  x.length === y.length && x.every((a, i) => a === y[i]);

const testValue = (v, x) => {
  if (isValue(x)) {
    return v === x;
  }
  if (x.type === "group") {
    if (x === GROUPS.INTEGER) return Number.isInteger(v);
    if (x === GROUPS.NUMBER) return typeof v === "number";
    if (x === GROUPS.STRING) return typeof v === "string";
  }
  if (x.type === "regex") {
    return typeof v === "string" && x.value.test(v);
  }
  if (x.type === "range") {
    if (typeof v !== "number") return false;
    return rangeIncludes(x.value, v);
  }
  return false;
};

const addValue = (func, multi, x) => {
  const base = [...multi];
  let next = x;
  for (let i = 0; i < base.length; i++) {
    const res = func(next, base[i]);
    if (res === null) {
    } else if (res === base[i]) {
      next = null;
      break;
    } else {
      base.splice(i, 1);
      next = res;
      i = -1;
    }
  }
  if (next !== null) base.push(next);
  if (arrayShallowEqual(base, multi)) return multi;
  return base;
};

export const simplify = (operation, values) => {
  const [first, ...rest] = values;
  const result = rest.reduce(
    (res, y) => addValue(operation === "meet" ? meet : join, res, y),
    [first]
  );
  if (result.length === 1) return result[0];
  return {
    type: operation,
    value: arrayShallowEqual(result, values) ? values : result,
  };
};

export const resolve = (x, deep = false) => {
  if (!x) return x;
  if (Array.isArray(x)) {
    if (!deep) return x;
    return x.map((y) => resolve(y, true));
  }
  if (typeof x === "object") {
    if (x.isStream) return resolve(x.get(), deep);
    if (x.type === "atom") {
      const value = [x.value, resolve(x.atom, deep)];
      const result = meet(...value);
      return result === null ? { type: "meet", value } : result;
    }
    if (!deep) return x;
    return Object.fromEntries(
      Object.entries(x).map(([k, y]) => [k, resolve(y, true)])
    );
  }
  return x;
};

export const applyMap = ($map, $input) => {
  const mapValue = resolve($map);
  if (mapValue === ANY) return ANY;

  const map = createMap(mapValue);
  const input = resolve($input);

  if (Number.isInteger(input) && input >= 1 && input <= map.items.length) {
    return map.items[input - 1];
  }

  if (input in map.values) {
    return map.values[input];
  }

  if (map.pairs.length > 0) {
    const pairResults = map.pairs.map((pairs) => {
      for (const { key: $key, value: $value, parameters } of pairs) {
        const key = resolve($key);
        const value = resolve($value);
        if (!parameters) {
          if (meet(input, key) === input) return value;
        } else {
          const args = parameters.reduce(
            (res, k) => ({ ...res, [k]: ANY }),
            {}
          );
          if (meet(input, key, args) === input) return value(args);
        }
      }
      return ANY;
    });

    return simplify("meet", pairResults);
  }

  return ANY;
};

export const join = (a, b) => {
  if (a === b) return a;
  if (a === ANY || b === ANY) return ANY;
  if (a === NONE) return b;
  if (b === NONE) return a;

  if (a.type === "join" || b.type === "join") {
    const [j, x] = a.type === "join" && b.type !== "join" ? [a, b] : [b, a];
    const res = addValue(join, j.value, x);
    if (res === j.value) return j;
    if (res.length === 1) return res[0];
    return { type: "join", value: res };
  }

  if (a.type === "meet" || b.type === "meet") {
    const [m, x] = a.type === "meet" ? [a, b] : [b, a];
    const mapped = m.value.map((y) => join(y, x));
    if (arrayShallowEqual(mapped, m.value)) return m;
    return simplify("meet", mapped);
  }

  if (isValue(a) || isValue(b)) {
    const [v, x] = isValue(a) ? [a, b] : [b, a];
    if (typeof v === "number" && x.type === "range") {
      const res = joinRangeValue(x.value, v);
      if (res) return res;
    }
    return testValue(v, x) ? x : null;
  }

  if (a.type === "group" || b.type === "group") {
    const [g, x] = a.type === "group" ? [a, b] : [b, a];
    if (g === GROUPS.STRING) {
      if (x.type === "regex") return g;
      return null;
    }
    if ([GROUPS.INTEGER, GROUPS.NUMBER].includes(g)) {
      if ([GROUPS.INTEGER, GROUPS.NUMBER].includes(x)) {
        return g === GROUPS.INTEGER ? x : g;
      }
      if (x.type === "range") {
        return g === GROUPS.INTEGER ? null : g;
      }
      return null;
    }
  }

  if (a.type !== b.type) return null;

  if (a.type === "regex") {
    return a.value.toString() === b.value.toString() ? a : null;
  }

  if (a.type === "range") {
    return joinRanges(a.value, b.value);
  }

  return null;
};

export const meet = (a, b, context = {}) => {
  if (a === b) return a;
  if (a === NONE || b === NONE) return NONE;
  if (a === ANY) return b;
  if (b === ANY) return a;

  if (a.type === "parameter" || b.type === "parameter") {
    const [p, x] = a.type === "parameter" ? [a, b] : [b, a];
    context[p.name] = x;
    return x;
  }

  if (a.type === "meet" || b.type === "meet") {
    const [m, x] = a.type === "meet" && b.type !== "meet" ? [a, b] : [b, a];
    const res = addValue(meet, m.value, x);
    if (res === m.value) return m;
    if (res.length === 1) return res[0];
    return { type: "meet", value: res };
  }

  if (a.type === "join" || b.type === "join") {
    const [m, x] = a.type === "join" ? [a, b] : [b, a];
    const mapped = m.value.map((y) => meet(y, x));
    if (arrayShallowEqual(mapped, m.value)) return m;
    return simplify("join", mapped);
  }

  if (isValue(a) || isValue(b)) {
    const [v, x] = isValue(a) ? [a, b] : [b, a];
    return testValue(v, x) ? v : NONE;
  }

  if (a.type === "group" || b.type === "group") {
    const [g, x] = a.type === "group" ? [a, b] : [b, a];
    if (g === GROUPS.STRING) {
      if (x.type === "regex") return x;
      return NONE;
    }
    if ([GROUPS.INTEGER, GROUPS.NUMBER].includes(g)) {
      if ([GROUPS.INTEGER, GROUPS.NUMBER].includes(x)) {
        return g === GROUPS.INTEGER ? g : x;
      }
      if (x.type === "range") {
        return g === GROUPS.INTEGER ? null : x;
      }
      return NONE;
    }
  }

  if (a.type !== b.type) return NONE;

  if (a.type === "map") {
    const keys = Object.keys({ ...a.values, ...b.values });
    const values = keys.map((k) =>
      meet(resolve(applyMap(a, k)), resolve(applyMap(b, k)), context)
    );
    if (
      b.items.length === 0 &&
      b.pairs.length === 0 &&
      arrayShallowEqual(
        values,
        keys.map((k) => a.values[k])
      )
    ) {
      return a;
    }
    if (
      a.items.length === 0 &&
      a.pairs.length === 0 &&
      arrayShallowEqual(
        values,
        keys.map((k) => b.values[k])
      )
    ) {
      return b;
    }
    return {
      type: "map",
      values: Object.fromEntries(keys.map((k, i) => [k, values[i]])),
      items: [...a.items, ...b.items],
      pairs: [...a.pairs, ...b.pairs],
    };
  }

  if (a.type === "regex") {
    return a.value.toString() === b.value.toString() ? a : null;
  }

  if (a.type === "range") {
    return meetRanges(a.value, b.value);
  }

  return null;
};
