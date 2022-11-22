import {
  joinRanges,
  joinRangeValue,
  meetRanges,
  rangeIncludes,
} from "./range.js";
import { ANY, NONE, GROUPS } from "./utils.js";

export const applyMap = (map, input) => {
  if (Number.isInteger(input) && input >= 1 && input <= map.items.length) {
    return map.items[input - 1];
  }

  if (input in map.values) {
    return map.values[input];
  }

  if (map.pairs.length > 0) {
    const pairResults = map.pairs.map((pairs) => {
      for (const { key, value, parameters } of pairs) {
        if (!parameters) {
          if (meet(key, input) === input) return value;
        } else {
          const args = parameters.reduce(
            (res, k) => ({ ...res, [k]: ANY }),
            {}
          );
          if (meet(key, input, args) === input) return value(args);
        }
      }
      return ANY;
    });

    const [first, ...rest] = pairResults;
    const res = rest.reduce((res, y) => multipair(meet, res, y), [first]);
    if (res.length === 1) return res[0];
    return { type: "meet", value: res };
  }

  return ANY;
};

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

const multipair = (func, multi, x) => {
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

export const join = (a, b) => {
  if (a === b) return a;
  if (a === ANY || b === ANY) return ANY;
  if (a === NONE) return b;
  if (b === NONE) return a;

  if (a.type === "join" || b.type === "join") {
    const [j, x] = a.type === "join" && b.type !== "join" ? [a, b] : [b, a];
    const res = multipair(join, j.value, x);
    if (res === j.value) return j;
    if (res.length === 1) return res[0];
    return { type: "join", value: res };
  }

  if (a.type === "meet" || b.type === "meet") {
    const [m, x] = a.type === "meet" ? [a, b] : [b, a];
    const mapped = m.value.map((y) => join(y, x));
    if (arrayShallowEqual(mapped, m.value)) return m;
    const [first, ...rest] = mapped;
    const res = rest.reduce((res, y) => multipair(meet, res, y), [first]);
    if (res.length === 1) return res[0];
    return { type: "meet", value: res };
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
    const res = multipair(meet, m.value, x);
    if (res === m.value) return m;
    if (res.length === 1) return res[0];
    return { type: "meet", value: res };
  }

  if (a.type === "join" || b.type === "join") {
    const [m, x] = a.type === "join" ? [a, b] : [b, a];
    const mapped = m.value.map((y) => meet(y, x));
    if (arrayShallowEqual(mapped, m.value)) return m;
    const [first, ...rest] = mapped;
    const res = rest.reduce((res, y) => multipair(join, res, y), [first]);
    if (res.length === 1) return res[0];
    return { type: "join", value: res };
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
    return {
      type: "map",
      values: Object.fromEntries(
        keys.map((k) => [k, meet(applyMap(a, k), applyMap(b, k))])
      ),
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
