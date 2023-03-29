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
      for (const d of deps) d.value;
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

export const resolveToFragment = (x) => {
  if (x?.__type === "signal") return resolveToFragment(x.get());
  if (x?.__type === "fragment") {
    const flat = x.value.reduce((res, $y) => {
      const y = resolveToFragment($y);
      if (y === null) return res;
      if (y.__type === "fragment") return [...res, ...y.value];
      return [...res, y];
    }, []);
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
  if (Array.isArray(value)) return value.map((y) => resolveDeep(y));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, y]) => [k, resolveDeep(y)])
    );
  }
  return value;
};
