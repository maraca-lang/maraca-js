import run, { atom, resolve } from "./index.js";

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

run({ tick }, `[*x: x * 5].tick`, (data) => {
  console.log(print(resolve(data, true)));
});
