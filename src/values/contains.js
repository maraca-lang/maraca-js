import apply from "./apply.js";
import { cleanValue, YES, NO, GROUPS } from "./index.js";
import { rangeIncludesValue, rangeIncludesRange } from "./range.js";

const isValue = (a) => typeof a === "number" || typeof a === "string";

const contains = (_outer, _inner) => {
  const outer = cleanValue(_outer);
  const inner = cleanValue(_inner);

  if (outer?.__type === "parameter") {
    const res = contains(outer.value || YES, inner);
    if (!res) return false;
    return {
      needed: YES,
      context: {
        ...(res.context || {}),
        [outer.name]: res.needed,
      },
    };
  }

  if (inner === outer) return { needed: YES };

  if (outer === YES || inner === NO) return { needed: inner };
  if (outer === NO || inner === YES) return false;

  if (outer?.__type === "join") {
    let context = false;
    for (const v of outer.value) {
      const res = contains(v, inner);
      if (res) context = { ...(context || {}), ...(res.context || {}) };
    }
    return context && Object.keys(context).length > 0
      ? { needed: YES, context }
      : { needed: YES };
  }
  if (outer?.__type === "meet") {
    let context = {};
    for (const v of outer.value) {
      const res = contains(v, inner);
      context = context && context && { ...context, ...(res.context || {}) };
    }
    return context && Object.keys(context).length > 0
      ? { needed: YES, context }
      : { needed: YES };
  }

  if (isValue(inner)) {
    if (isValue(outer)) {
      return inner === outer && { needed: YES };
    }
    if (outer.__type === "group") {
      if (outer === GROUPS.INTEGER) {
        return Number.isInteger(inner) && { needed: inner };
      }
      if (outer === GROUPS.NUMBER) {
        return typeof inner === "number" && { needed: inner };
      }
      if (outer === GROUPS.STRING) {
        return typeof inner === "string" && { needed: inner };
      }
    }
    if (outer.__type === "regex") {
      return (
        typeof inner === "string" &&
        outer.value.test(inner) && { needed: inner }
      );
    }
    if (outer.__type === "range") {
      if (typeof inner !== "number") return false;
      return rangeIncludesValue(outer.value, inner) && { needed: inner };
    }
  }

  if (isValue(outer)) return false;

  if (outer.__type === "group") {
    if (outer === GROUPS.STRING) {
      return inner.__type === "regex" && { needed: inner };
    }
    if (outer === GROUPS.NUMBER) {
      return (
        (inner === GROUPS.INTEGER || inner.__type === "range") && {
          needed: inner,
        }
      );
    }
    return false;
  }

  if (inner.__type !== outer.__type) return false;

  if (inner.__type === "regex") {
    return inner.value.toString() === outer.value.toString() && { needed: YES };
  }

  if (inner.__type === "range") {
    return rangeIncludesRange(outer.value, inner.value) && { needed: inner };
  }

  if (inner.__type === "map") {
    if (outer.pairs.length > 0) return false;
    const keys = [
      ...new Set([
        ...Object.keys(outer.values),
        ...Object.keys(inner.values),
        ...Object.keys(outer.items).map((k) => `${parseInt(k, 10) + 1}`),
        ...Object.keys(inner.items).map((k) => `${parseInt(k, 10) + 1}`),
      ]),
    ];
    const needed = { __type: "map", values: {}, items: [], pairs: [] };
    let context = {};
    for (const k of keys) {
      const a = apply(outer, k);
      const b = apply(inner, k);
      const res = contains(a, b);
      if (!res) return false;
      if (res.needed !== YES) {
        if (/\d+/.test(k)) needed.items[parseInt(k, 10) - 1] = b;
        else needed.values[k] = b;
      }
      context = { ...context, ...(res.context || {}) };
    }
    return Object.keys(context).length > 0 ? { needed, context } : { needed };
  }
};

export default contains;
