import { computed, effect as baseEffect, signal } from "@preact/signals-core";

export const atom = (initial, map) => {
  const s = signal(initial);
  return {
    __type: "signal",
    get: () => s.value,
    set: (v) => {
      s.value = map ? map(v) : v;
    },
  };
};

export const derived = (func, deps = []) => {
  const s = computed(func);
  return {
    __type: "signal",
    get: () => {
      for (const d of deps) resolveDeep(d);
      return s.value;
    },
  };
};

export const effect = (run) =>
  baseEffect(() => {
    const disposes = [];
    const nestedEffect = (nestedRun) => disposes.push(effect(nestedRun));
    disposes.push(run(nestedEffect));
    return () => {
      for (const d of disposes.filter((d) => d)) d();
    };
  });

export const resolveItems = (items) =>
  items.reduce((res, $v) => {
    const v = resolveToFragment($v);
    if (v === null) return res;
    if (v.__type === "fragment") return [...res, ...v.value];
    return [...res, v];
  }, []);

export const resolveToFragment = (x) => {
  if (x?.__type === "signal") return resolveToFragment(x.get());
  if (x?.__type === "fragment") {
    const flat = resolveItems(x.value);
    if (flat.length === 0) return null;
    if (flat.length === 1) return flat[0];
    return { __type: "fragment", value: flat };
  }
  return x;
};

export const resolveToSingle = (x) => {
  const fragment = resolveToFragment(x);
  if (fragment === null) return null;
  if (fragment?.__type === "fragment") return fragment.value[0];
  return fragment;
};

export const resolveDeep = (x) => {
  const value = resolveToSingle(x);
  if (value?.__type === "block") {
    return {
      __type: "block",
      values: Object.fromEntries(
        Object.entries(value.values)
          .map(([k, y]) => [k, resolveDeep(y)])
          .filter(([_, v]) => v !== null)
      ),
      items: resolveDeep(resolveItems(value.items)),
    };
  }
  if (Array.isArray(value)) return value.map((y) => resolveDeep(y));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, y]) => [k, resolveDeep(y)])
    );
  }
  return value;
};
