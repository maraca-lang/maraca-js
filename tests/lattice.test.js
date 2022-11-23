import { join, meet } from "../src/lattice.js";
import { ANY, NONE, GROUPS } from "../src/utils.js";

const runTests = (func, tests) => {
  for (const [a, b, c] of tests) {
    expect(func(a, b)).toEqual(c);
    expect(func(b, a)).toEqual(c);
  }
};

test("join: none", () => {
  runTests(join, [
    [NONE, 1, 1],
    [NONE, "hello", "hello"],
    [NONE, GROUPS.NUMBER, GROUPS.NUMBER],
  ]);
});

test("join: any", () => {
  runTests(join, [
    [ANY, 1, ANY],
    [ANY, "hello", ANY],
    [ANY, GROUPS.NUMBER, ANY],
  ]);
});

test("join: groups", () => {
  const range = { type: "range", value: { start: { pos: 0 } } };
  runTests(join, [
    [GROUPS.INTEGER, GROUPS.INTEGER, GROUPS.INTEGER],
    [GROUPS.NUMBER, GROUPS.NUMBER, GROUPS.NUMBER],
    [GROUPS.STRING, GROUPS.STRING, GROUPS.STRING],
    [GROUPS.INTEGER, GROUPS.NUMBER, GROUPS.NUMBER],
    [GROUPS.INTEGER, GROUPS.STRING, null],
    [GROUPS.NUMBER, GROUPS.STRING, null],
    [GROUPS.INTEGER, range, null],
  ]);
});

test("join: numbers", () => {
  runTests(join, [
    [1, 1, 1],
    [1, "hello", null],
    [1, GROUPS.INTEGER, GROUPS.INTEGER],
    [1, GROUPS.NUMBER, GROUPS.NUMBER],
    [1, GROUPS.STRING, null],
    [
      1,
      { type: "range", value: { start: { pos: 0 } } },
      { type: "range", value: { start: { pos: 0 } } },
    ],
    [
      1,
      { type: "range", value: { start: { pos: 1 } } },
      { type: "range", value: { start: { pos: 1, inc: true } } },
    ],
    [
      1,
      { type: "range", value: { start: { pos: 1, inc: true } } },
      { type: "range", value: { start: { pos: 1, inc: true } } },
    ],
    [
      1,
      { type: "range", value: { end: { pos: 10 } } },
      { type: "range", value: { end: { pos: 10 } } },
    ],
    [
      1,
      { type: "range", value: { end: { pos: 1 } } },
      { type: "range", value: { end: { pos: 1, inc: true } } },
    ],
    [
      1,
      { type: "range", value: { end: { pos: 1, inc: true } } },
      { type: "range", value: { end: { pos: 1, inc: true } } },
    ],
    [
      1,
      { type: "range", value: { start: { pos: 0 }, end: { pos: 10 } } },
      { type: "range", value: { start: { pos: 0 }, end: { pos: 10 } } },
    ],
    [1, { type: "regex", value: /a/ }, null],
  ]);
});

test("join: strings", () => {
  runTests(join, [
    ["hello", "hello", "hello"],
    ["hello", GROUPS.STRING, GROUPS.STRING],
    ["hello", GROUPS.INTEGER, null],
    ["hello", GROUPS.NUMBER, null],
    ["hello", { type: "regex", value: /h/ }, { type: "regex", value: /h/ }],
    ["hello", { type: "regex", value: /a/ }, null],
    ["hello", { type: "range", value: { start: { pos: 0 } } }, null],
  ]);
});

test("join: regex", () => {
  const x = { type: "regex", value: /a/ };
  const y = { type: "regex", value: /b/ };
  runTests(join, [
    [x, x, x],
    [x, y, null],
  ]);
});

test("join: range", () => {
  runTests(join, [
    [
      { type: "range", value: { start: { pos: 0 } } },
      { type: "range", value: { start: { pos: 0 } } },
      { type: "range", value: { start: { pos: 0 } } },
    ],
    [
      { type: "range", value: { start: { pos: 0 } } },
      { type: "range", value: { start: { pos: 5 } } },
      { type: "range", value: { start: { pos: 0 } } },
    ],
    [
      { type: "range", value: { start: { pos: 0 } } },
      { type: "range", value: { start: { pos: 0, inc: true } } },
      { type: "range", value: { start: { pos: 0, inc: true } } },
    ],
    [
      { type: "range", value: { end: { pos: 0 } } },
      { type: "range", value: { end: { pos: 5 } } },
      { type: "range", value: { end: { pos: 5 } } },
    ],
    [
      { type: "range", value: { end: { pos: 0 } } },
      { type: "range", value: { end: { pos: 0, inc: true } } },
      { type: "range", value: { end: { pos: 0, inc: true } } },
    ],
    [
      { type: "range", value: { start: { pos: 0, inc: true } } },
      { type: "range", value: { end: { pos: 10 } } },
      GROUPS.NUMBER,
    ],
    [
      { type: "range", value: { start: { pos: 10 } } },
      { type: "range", value: { end: { pos: 0 } } },
      null,
    ],
    [
      { type: "range", value: { start: { pos: 0 } } },
      { type: "range", value: { end: { pos: 0, inc: true } } },
      GROUPS.NUMBER,
    ],
    [
      { type: "range", value: { start: { pos: 0, inc: true } } },
      { type: "range", value: { end: { pos: 0, inc: true } } },
      GROUPS.NUMBER,
    ],
    [
      { type: "range", value: { start: { pos: 0 }, end: { pos: 20 } } },
      { type: "range", value: { start: { pos: 10 }, end: { pos: 30 } } },
      { type: "range", value: { start: { pos: 0 }, end: { pos: 30 } } },
    ],
  ]);
});

test("join: multi", () => {
  runTests(join, [
    [{ type: "join", value: [1, 2] }, 3, { type: "join", value: [1, 2, 3] }],
    [{ type: "join", value: [1, 2] }, 2, { type: "join", value: [1, 2] }],
    [{ type: "join", value: [1, 2] }, GROUPS.NUMBER, GROUPS.NUMBER],
    [
      { type: "join", value: [1, 1.5] },
      GROUPS.INTEGER,
      { type: "join", value: [1.5, GROUPS.INTEGER] },
    ],
    [
      {
        type: "join",
        value: [
          { type: "range", value: { start: { pos: 0 }, end: { pos: 10 } } },
          { type: "range", value: { start: { pos: 20 }, end: { pos: 30 } } },
        ],
      },
      { type: "range", value: { start: { pos: 5 }, end: { pos: 25 } } },
      { type: "range", value: { start: { pos: 0 }, end: { pos: 30 } } },
    ],
  ]);
  expect(
    join({ type: "join", value: [1, 2] }, { type: "join", value: [3, 4] })
  ).toEqual({ type: "join", value: [1, 2, 3, 4] });
});

test("meet: none", () => {
  runTests(meet, [
    [NONE, 1, NONE],
    [NONE, "hello", NONE],
    [NONE, GROUPS.NUMBER, NONE],
  ]);
});

test("meet: any", () => {
  runTests(meet, [
    [ANY, 1, 1],
    [ANY, "hello", "hello"],
    [ANY, GROUPS.NUMBER, GROUPS.NUMBER],
  ]);
});

test("meet: groups", () => {
  const range = { type: "range", value: { start: { pos: 0 } } };
  runTests(meet, [
    [GROUPS.INTEGER, GROUPS.INTEGER, GROUPS.INTEGER],
    [GROUPS.NUMBER, GROUPS.NUMBER, GROUPS.NUMBER],
    [GROUPS.STRING, GROUPS.STRING, GROUPS.STRING],
    [GROUPS.INTEGER, GROUPS.NUMBER, GROUPS.INTEGER],
    [GROUPS.INTEGER, GROUPS.STRING, NONE],
    [GROUPS.NUMBER, GROUPS.STRING, NONE],
    [GROUPS.INTEGER, range, null],
  ]);
});

test("meet: numbers", () => {
  runTests(meet, [
    [1, 1, 1],
    [1, "hello", NONE],
    [1, GROUPS.INTEGER, 1],
    [1, GROUPS.NUMBER, 1],
    [1, GROUPS.STRING, NONE],
    [1, { type: "range", value: { start: { pos: 0 } } }, 1],
    [1, { type: "range", value: { start: { pos: 1 } } }, NONE],
    [1, { type: "range", value: { start: { pos: 1, inc: true } } }, 1],
    [1, { type: "range", value: { end: { pos: 10 } } }, 1],
    [1, { type: "range", value: { end: { pos: 1 } } }, NONE],
    [1, { type: "range", value: { end: { pos: 1, inc: true } } }, 1],
    [1, { type: "range", value: { start: { pos: 0 }, end: { pos: 10 } } }, 1],
    [1, { type: "regex", value: /a/ }, NONE],
  ]);
});

test("meet: strings", () => {
  runTests(meet, [
    ["hello", "hello", "hello"],
    ["hello", GROUPS.STRING, "hello"],
    ["hello", GROUPS.INTEGER, NONE],
    ["hello", GROUPS.NUMBER, NONE],
    ["hello", { type: "regex", value: /h/ }, "hello"],
    ["hello", { type: "regex", value: /a/ }, NONE],
    ["hello", { type: "range", value: { start: { pos: 0 } } }, NONE],
  ]);
});

test("meet: regex", () => {
  const x = { type: "regex", value: /a/ };
  const y = { type: "regex", value: /b/ };
  runTests(meet, [
    [x, x, x],
    [x, y, null],
  ]);
});

test("meet: range", () => {
  runTests(meet, [
    [
      { type: "range", value: { start: { pos: 0 } } },
      { type: "range", value: { start: { pos: 0 } } },
      { type: "range", value: { start: { pos: 0 } } },
    ],
    [
      { type: "range", value: { start: { pos: 0 } } },
      { type: "range", value: { start: { pos: 5 } } },
      { type: "range", value: { start: { pos: 5 } } },
    ],
    [
      { type: "range", value: { start: { pos: 0 } } },
      { type: "range", value: { start: { pos: 0, inc: true } } },
      { type: "range", value: { start: { pos: 0 } } },
    ],
    [
      { type: "range", value: { end: { pos: 0 } } },
      { type: "range", value: { end: { pos: 5 } } },
      { type: "range", value: { end: { pos: 0 } } },
    ],
    [
      { type: "range", value: { end: { pos: 0 } } },
      { type: "range", value: { end: { pos: 0, inc: true } } },
      { type: "range", value: { end: { pos: 0 } } },
    ],
    [
      { type: "range", value: { start: { pos: 0, inc: true } } },
      { type: "range", value: { end: { pos: 10 } } },
      {
        type: "range",
        value: { start: { pos: 0, inc: true }, end: { pos: 10 } },
      },
    ],
    [
      { type: "range", value: { start: { pos: 10 } } },
      { type: "range", value: { end: { pos: 0 } } },
      NONE,
    ],
    [
      { type: "range", value: { start: { pos: 0 } } },
      { type: "range", value: { end: { pos: 0, inc: true } } },
      NONE,
    ],
    [
      { type: "range", value: { start: { pos: 0, inc: true } } },
      { type: "range", value: { end: { pos: 0, inc: true } } },
      0,
    ],
    [
      { type: "range", value: { start: { pos: 0 }, end: { pos: 20 } } },
      { type: "range", value: { start: { pos: 10 }, end: { pos: 30 } } },
      { type: "range", value: { start: { pos: 10 }, end: { pos: 20 } } },
    ],
  ]);
});

test("meet: multi", () => {
  runTests(meet, [
    [{ type: "meet", value: [1, 2] }, 3, NONE],
    [
      {
        type: "meet",
        value: [
          { type: "regex", value: /a/ },
          { type: "regex", value: /b/ },
        ],
      },
      { type: "regex", value: /a/ },
      {
        type: "meet",
        value: [
          { type: "regex", value: /b/ },
          { type: "regex", value: /a/ },
        ],
      },
    ],
    [{ type: "join", value: [1, 2] }, 1, 1],
    [
      {
        type: "join",
        value: [
          { type: "range", value: { start: { pos: 0 }, end: { pos: 15 } } },
          { type: "range", value: { start: { pos: 25 }, end: { pos: 40 } } },
        ],
      },
      { type: "range", value: { start: { pos: 10 }, end: { pos: 30 } } },
      {
        type: "join",
        value: [
          { type: "range", value: { start: { pos: 10 }, end: { pos: 15 } } },
          { type: "range", value: { start: { pos: 25 }, end: { pos: 30 } } },
        ],
      },
    ],
  ]);
});
