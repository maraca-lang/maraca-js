import { ANY, GROUPS } from "../src/values/index.js";
import run from "../src/index.js";

test.only("sync", () => {
  expect(run({}, `1 + 1`)).toEqual(2);
  expect(run({}, `1 | 2 | 3`)).toEqual({ type: "join", value: [1, 2, 3] });
  expect(run({}, `{ 1 > 2: 1, : 2 }`)).toEqual(2);
  expect(run({}, `['x': 1]`)).toEqual({
    type: "map",
    values: { x: 1 },
    items: [],
    pairs: [],
  });
  expect(run({}, `[*x: x + 1].1`)).toEqual(2);
  expect(run({}, `['x': string]`)).toEqual({
    type: "map",
    values: { x: GROUPS.STRING },
    items: [],
    pairs: [],
  });
  expect(run({}, `['x': 1 -> any]`)).toEqual({
    type: "map",
    values: { x: 1 },
    items: [],
    pairs: [],
  });
  expect(run({}, `['x': y]`)).toEqual({
    type: "map",
    values: { x: ANY, y: ANY },
    items: [],
    pairs: [],
  });
  expect(run({}, `[[]: 1, : 2].['x': 1]`)).toEqual(1);
  expect(run({ func: (x) => x + 1 }, `func.1`)).toEqual(2);
  expect(run({}, `[['a': *x]: x + 1].['a': 1]`)).toEqual(2);
});
