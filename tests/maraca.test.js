import { ANY, NONE, GROUPS } from "../src/values/index.js";
import run from "../src/index.js";

test.only("sync", () => {
  expect(run({}, `1 + 1`)).toEqual(2);
  expect(run({}, `1 | 2 | 3`)).toEqual({ __type: "join", value: [1, 2, 3] });
  expect(run({}, `!any`)).toEqual(NONE);
  expect(run({}, `!none`)).toEqual(ANY);
  expect(run({}, `{ 1 > 2: 1, : 2 }`)).toEqual(2);
  expect(run({}, `{ 'x': 1 -> any, : x + 1 }`)).toEqual(2);
  expect(run({}, `['x': 1]`)).toEqual({
    __type: "map",
    values: { x: 1 },
    items: [],
    pairs: [],
  });
  expect(run({}, `[*x: x + 1].1`)).toEqual(2);
  expect(run({}, `['x': string]`)).toEqual({
    __type: "map",
    values: { x: GROUPS.STRING },
    items: [],
    pairs: [],
  });
  expect(run({}, `['x': 1 -> any]`)).toEqual({
    __type: "map",
    values: { x: 1 },
    items: [],
    pairs: [],
  });
  expect(run({}, `['x': y]`)).toEqual({
    __type: "map",
    values: { x: ANY, y: ANY },
    items: [],
    pairs: [],
  });
  expect(run({}, `[[]: 1, : 2].['x': 1]`)).toEqual(1);
  expect(run({ func: (x) => x + 1 }, `func.1`)).toEqual(2);
  expect(run({}, `[['a': *x]: x + 1].['a': 1]`)).toEqual(2);
});
