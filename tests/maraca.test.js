import { NO, GROUPS } from "../src/values/index.js";
import run from "../src/index.js";

test.only("sync", () => {
  expect(run({}, `1 + 1`)).toEqual(2);
  expect(run({}, `1 | 2 | 3`)).toEqual({ __type: "join", value: [1, 2, 3] });
  expect(run({}, `{ 1 > 2: 1, : 2 }`)).toEqual(2);
  expect(run({}, `{ 1 > 2: 1 }`)).toEqual(NO);
  expect(run({}, `{ 'x': 1 -> any, : x + 1 }`)).toEqual(2);
  expect(run({}, `('x': 1)`)).toEqual({
    __type: "map",
    values: { x: 1 },
    items: [],
    pairs: [],
  });
  expect(run({}, `(*x: x + 1).1`)).toEqual(2);
  expect(run({}, `('x': string)`)).toEqual({
    __type: "map",
    values: { x: GROUPS.STRING },
    items: [],
    pairs: [],
  });
  expect(run({}, `('x': 1 -> any)`)).toEqual({
    __type: "map",
    values: { x: 1 },
    items: [],
    pairs: [],
  });
  expect(run({}, `('x': y)`)).toEqual({
    __type: "map",
    values: { x: NO, y: NO },
    items: [],
    pairs: [],
  });
  expect(run({}, `((): 1, : 2).('x': 1)`)).toEqual(1);
  expect(run({ func: (x) => x + 1 }, `func.1`)).toEqual(2);
  expect(run({}, `(('a': *x): x + 1).('a': 1)`)).toEqual(2);
  expect(run({}, `(1, 2, 3)..((*x): x + 1)`)).toEqual({
    __type: "map",
    values: {},
    items: [2, 3, 4],
    pairs: [],
  });
  expect(run({}, `((*a, *b): a + b)(1, 2)`)).toEqual(3);
  expect(run({}, `(('a': 1) & *x: x).('a': 1, 1, 2, 3)`)).toEqual({
    __type: "map",
    values: {},
    items: [1, 2, 3],
    pairs: [],
  });
  expect(run({}, `(('a': *x) & *y: (x, y)).('a': 'hi', 1, 2, 3)`)).toEqual({
    __type: "map",
    values: {},
    items: [
      "hi",
      {
        __type: "map",
        values: {},
        items: [1, 2, 3],
        pairs: [],
      },
    ],
    pairs: [],
  });
});
