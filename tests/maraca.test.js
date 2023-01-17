import run from "../src/index.js";

test.only("sync", () => {
  expect(run({}, `1 + 1`)).toEqual(2);
  expect(run({}, `{ 1, 2, 3 }`)).toEqual(1);
  expect(run({}, `[1, 2, 3]`)).toEqual({
    __type: "block",
    values: {},
    items: [1, 2, 3],
  });
  expect(run({}, `[x: 1]`)).toEqual({
    __type: "block",
    values: { x: 1 },
    items: [],
  });
  expect(run({}, `[x is number: 1]`)).toEqual({
    __type: "block",
    values: { x: 1 },
    items: [],
  });
  expect(run({}, `[y: x + 1, x: 1]`)).toEqual({
    __type: "block",
    values: { x: 1, y: 2 },
    items: [],
  });
  expect(run({}, `{ (x is number)=> x + 1 }(1)`)).toEqual(2);
  expect(run({}, `[x: if no then 10 else {20, 30}]`)).toEqual({
    __type: "block",
    values: { x: 20 },
    items: [],
  });
  expect(run({}, `[x: if no then 10]`)).toEqual({
    __type: "block",
    values: {},
    items: [],
  });
  expect(run({}, `[].x?`)).toEqual(false);
});
