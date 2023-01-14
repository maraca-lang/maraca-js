export const resolveToFragment = (x) => {
  if (x?.isStream) return resolveToFragment(x.get());
  if (x?.__type === "atom") return resolveToFragment(x.value.get());
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
  if (fragment === null) throw new Error();
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
