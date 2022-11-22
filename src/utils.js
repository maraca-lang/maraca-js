export const ANY = undefined;
export const NONE = false;
export const GROUPS = {
  INTEGER: { type: "group", value: "integer" },
  NUMBER: { type: "group", value: "number" },
  STRING: { type: "group", value: "string" },
};

export const createMap = (value) => {
  if (Array.isArray(value)) {
    return { type: "map", values: {}, items: value, pairs: [] };
  }
  if (value.type === "map") return value;
  return { type: "map", values: value, items: [], pairs: [] };
};
