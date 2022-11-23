import run, { atom } from "./index.js";

const print = (x, space) =>
  JSON.stringify(
    x,
    (_, v) => {
      if (v === undefined) return "__undefined__";
      if (v !== v) return "__NaN__";
      return v;
    },
    space && 2
  )
    .replace(/"__undefined__"/g, "undefined")
    .replace(/"__NaN__"/g, "NaN");

const tick = atom(1);
setInterval(() => {
  tick.update((x) => x + 1);
}, 1000);

export const resolveDeep = (x) => {
  if (!x) return x;
  if (Array.isArray(x)) return x.map((y) => resolveDeep(y));
  if (typeof x === "object") {
    if (x.isStream) return resolveDeep(x.get());
    return Object.fromEntries(
      Object.entries(x).map(([k, y]) => [k, resolveDeep(y)])
    );
  }
  return x;
};

run({ tick }, `{ : 'hello' }`, (data) => {
  console.log(print(resolveDeep(data)));
});
