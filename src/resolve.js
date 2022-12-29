export const resolveToMulti = (x) => {
  if (x?.isStream) return resolveToMulti(x.get());
  if (x?.__type === "atom") return resolveToMulti(x.value.get());
  if (x?.__type === "multi") {
    const flat = x.value.reduce((res, $y) => {
      const y = resolveToMulti($y);
      if (y === null) return res;
      if (y.__type === "multi") return [...res, ...y.value];
      return [...res, y];
    }, []);
    if (flat.length === 0) return null;
    if (flat.length === 1) return flat[0];
    return { __type: "multi", value: flat };
  }
  return x;
};

export const resolveToSingle = (x) => {
  const multi = resolveToMulti(x);
  if (multi === null) throw new Error();
  if (multi?.__type === "multi") return multi.value[0];
  return multi;
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
