import run, { resolve } from "../src/index.js";

const runTest = (code) => resolve(run({}, code), true);

test.only("sync", () => {
  expect(runTest(`1 + 1`)).toEqual(2);
  expect(runTest(`{ 1, 2, 3 }`)).toEqual(1);
  expect(runTest(`[1, 2, 3]`)).toEqual({
    __type: "block",
    values: {},
    items: [1, 2, 3],
  });
  expect(runTest(`[x: 1]`)).toEqual({
    __type: "block",
    values: { x: 1 },
    items: [],
  });
  expect(runTest(`[x is number: 1]`)).toEqual({
    __type: "block",
    values: { x: 1 },
    items: [],
  });
  expect(runTest(`[y: x + 1, x: 1]`)).toEqual({
    __type: "block",
    values: { x: 1, y: 2 },
    items: [],
  });
  expect(runTest(`{ (x is number)=> x + 1 }(1)`)).toEqual(2);
  expect(runTest(`[x: if no then 10 else {20, 30}]`)).toEqual({
    __type: "block",
    values: { x: 20 },
    items: [],
  });
  expect(runTest(`[x: if no then 10]`)).toEqual({
    __type: "block",
    values: {},
    items: [],
  });
});
