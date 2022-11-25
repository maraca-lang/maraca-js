import apply from "./apply.js";
import contains from "./contains.js";
import { NONE, GROUPS } from "./index.js";
import { joinRanges, joinRangeValue, meetRanges } from "./range.js";

const join = (a, b) => {
  if (a?.isStream || b?.isStream) return null;

  if (contains(a, b)) return a;
  if (contains(b, a)) return b;

  if (a.__type === "range" || b.__type === "range") {
    const [r, x] = a.__type === "range" ? [a, b] : [b, a];
    if (typeof x === "number") {
      const res = joinRangeValue(r.value, x);
      if (res) return res;
    }
    if (x.__type === "range") {
      return joinRanges(r.value, x.value);
    }
    return null;
  }

  return null;
};

const meet = (a, b) => {
  if (a?.isStream || b?.isStream) return null;

  if (contains(a, b)) return b;
  if (contains(b, a)) return a;

  if (a.__type === "range" || b.__type === "range") {
    const [r, x] = a.__type === "range" ? [a, b] : [b, a];
    if (x.__type === "range") {
      return meetRanges(r.value, x.value);
    }
    if (x === GROUPS.INTEGER) {
      return null;
    }
    return NONE;
  }

  if (a.__type === "map" && b.__type === "map") {
    const keys = Object.keys({ ...a.values, ...b.values });
    const values = keys.map((k) => meet(apply(a, k), apply(b, k)));
    return {
      __type: "map",
      values: Object.fromEntries(keys.map((k, i) => [k, values[i]])),
      items: [...a.items, ...b.items],
      pairs: [...a.pairs, ...b.pairs],
    };
  }

  return null;
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
  return base;
};

const simplify = (func, values, prev) => {
  const reversed = [...values].reverse();
  const base = prev ? prev : [reversed.shift()];
  return reversed.reduce((res, y) => addValue(func, res, y), base);
};

const combine = ({ __type, value }) => {
  const parameter = value.find((x) => x?.__type === "parameter");
  if (parameter) {
    return {
      ...parameter,
      value: combine({
        __type,
        value: value.filter((x) => x?.__type !== "parameter"),
      }),
    };
  }

  const other = __type === "meet" ? "join" : "meet";
  const maps = __type === "meet" ? [meet, join] : [join, meet];
  const result = value.reduce((a, b) => {
    if (a?.__type === __type || b?.__type === __type) {
      const [x, y] = a.__type === __type ? [a, b] : [b, a];
      const result = simplify(
        maps[0],
        y.__type === __type ? y.value : [y],
        x.value
      );
      return result.length === 1 ? result[0] : { __type, value: result };
    }
    if (a?.__type === other || b?.__type === other) {
      const [x, y] = a.__type === other ? [a, b] : [b, a];
      const result = simplify(
        maps[1],
        x.value.map((z) => maps[0](y, z))
      );
      return result.length === 1 ? result[0] : { __type, value: result };
    }
    const result = maps[0](a, b);
    return result === null ? { __type, value: [a, b] } : result;
  });
  return result;
};

export default combine;
