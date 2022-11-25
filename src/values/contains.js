import apply from "./apply.js";
import { ANY, NONE, GROUPS } from "./index.js";
import { rangeIncludesValue, rangeIncludesRange } from "./range.js";

const isValue = (a) => typeof a === "number" || typeof a === "string";

const contains = (outer, inner, context) => {
  if (outer?.__type === "parameter") {
    context[outer.name] = inner;
    return contains(outer.value || ANY, inner);
  }

  if (inner === outer) return true;

  if (inner === NONE) return true;
  if (inner === ANY) return false;
  if (outer === NONE) return false;
  if (outer === ANY) return true;

  if (isValue(inner)) {
    if (isValue(outer)) {
      return inner === outer;
    }
    if (outer.__type === "group") {
      if (outer === GROUPS.INTEGER) return Number.isInteger(inner);
      if (outer === GROUPS.NUMBER) return typeof inner === "number";
      if (outer === GROUPS.STRING) return typeof inner === "string";
    }
    if (outer.__type === "regex") {
      return typeof inner === "string" && outer.value.test(inner);
    }
    if (outer.__type === "range") {
      if (typeof inner !== "number") return false;
      return rangeIncludesValue(outer.value, inner);
    }
  }

  if (isValue(outer)) return false;

  if (outer.__type === "group") {
    if (outer === GROUPS.STRING) {
      return inner.__type === "regex";
    }
    if (outer === GROUPS.NUMBER) {
      return inner === GROUPS.INTEGER || inner.__type === "range";
    }
    return false;
  }

  if (inner.__type !== outer.__type) return false;

  if (inner.__type === "regex") {
    return inner.value.toString() === outer.value.toString();
  }

  if (inner.__type === "range") {
    return rangeIncludesRange(outer.value, inner.value);
  }

  if (inner.__type === "map") {
    if (outer.pairs.length > 0 || outer.items.length > 0) return false;
    const keys = [
      ...new Set([
        ...Object.keys({ ...outer.values, ...inner.values }),
        ...Object.keys(inner.items).map((k) => `${parseInt(k, 10) + 1}`),
      ]),
    ];
    return keys.every((k) =>
      contains(apply(outer, k), apply(inner, k), context)
    );
  }
};

export default contains;
