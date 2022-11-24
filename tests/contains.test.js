import contains from "../src/values/contains.js";
import { ANY, NONE, GROUPS } from "../src/values/index.js";

test("contains: any", () => {
  expect(contains(ANY, NONE)).toBe(true);
  expect(contains(ANY, 1)).toBe(true);
  expect(contains(ANY, GROUPS.STRING)).toBe(true);
});

test("contains: none", () => {
  expect(contains(NONE, NONE)).toBe(true);
  expect(contains(NONE, 1)).toBe(false);
  expect(contains(NONE, GROUPS.STRING)).toBe(false);
});

test("contains: groups", () => {
  expect(contains(GROUPS.STRING, "hello")).toBe(true);
  expect(contains(GROUPS.STRING, 10)).toBe(false);
  expect(contains(GROUPS.STRING, GROUPS.NUMBER)).toBe(false);
  expect(contains(GROUPS.STRING, { type: "regex", value: /a/ })).toBe(true);
  expect(contains(GROUPS.STRING, ANY)).toBe(false);
  expect(contains(GROUPS.NUMBER, GROUPS.STRING)).toBe(false);
  expect(contains(GROUPS.NUMBER, GROUPS.INTEGER)).toBe(true);
  expect(contains(GROUPS.NUMBER, 10.5)).toBe(true);
  expect(contains(GROUPS.NUMBER, 10)).toBe(true);
  expect(contains(GROUPS.NUMBER, "hello")).toBe(false);
  expect(contains(GROUPS.INTEGER, GROUPS.STRING)).toBe(false);
  expect(contains(GROUPS.INTEGER, GROUPS.NUMBER)).toBe(false);
  expect(contains(GROUPS.INTEGER, 10.5)).toBe(false);
  expect(contains(GROUPS.INTEGER, 10)).toBe(true);
  expect(
    contains(GROUPS.NUMBER, { type: "range", value: { start: { pos: 0 } } })
  ).toBe(true);
  expect(
    contains(GROUPS.INTEGER, { type: "range", value: { start: { pos: 0 } } })
  ).toBe(false);
});

test("contains: regex", () => {
  expect(contains({ type: "regex", value: /a/ }, "abc")).toBe(true);
  expect(contains({ type: "regex", value: /h/ }, "abc")).toBe(false);
  expect(contains({ type: "regex", value: /h/ }, 1)).toBe(false);
  expect(contains({ type: "regex", value: /h/ }, GROUPS.STRING)).toBe(false);
});

test("contains: range", () => {
  expect(contains({ type: "range", value: { start: { pos: 0 } } }, 10)).toBe(
    true
  );
  expect(contains({ type: "range", value: { start: { pos: 0 } } }, 0)).toBe(
    false
  );
  expect(contains({ type: "range", value: { start: { pos: 0 } } }, -5)).toBe(
    false
  );
  expect(
    contains({ type: "range", value: { start: { pos: 0, inc: true } } }, 0)
  ).toBe(true);

  expect(contains({ type: "range", value: { end: { pos: 0 } } }, -5)).toBe(
    true
  );
  expect(contains({ type: "range", value: { end: { pos: 0 } } }, 0)).toBe(
    false
  );
  expect(contains({ type: "range", value: { end: { pos: 0 } } }, 5)).toBe(
    false
  );
  expect(
    contains({ type: "range", value: { end: { pos: 0, inc: true } } }, 0)
  ).toBe(true);

  expect(
    contains(
      { type: "range", value: { start: { pos: 0 }, end: { pos: 10 } } },
      5
    )
  ).toBe(true);
  expect(
    contains(
      { type: "range", value: { start: { pos: 0 }, end: { pos: 10 } } },
      -5
    )
  ).toBe(false);
  expect(
    contains(
      { type: "range", value: { start: { pos: 0 }, end: { pos: 10 } } },
      15
    )
  ).toBe(false);
  expect(
    contains(
      { type: "range", value: { start: { pos: 0 }, end: { pos: 10 } } },
      0
    )
  ).toBe(false);
  expect(
    contains(
      {
        type: "range",
        value: { start: { pos: 0, inc: true }, end: { pos: 10 } },
      },
      0
    )
  ).toBe(true);

  expect(
    contains(
      { type: "range", value: { start: { pos: 0 } } },
      { type: "range", value: { start: { pos: 5 } } }
    )
  ).toBe(true);
  expect(
    contains(
      { type: "range", value: { start: { pos: 0 } } },
      { type: "range", value: { start: { pos: -5 } } }
    )
  ).toBe(false);
  expect(
    contains(
      { type: "range", value: { start: { pos: 0 } } },
      { type: "range", value: { start: { pos: 10 }, end: { pos: 20 } } }
    )
  ).toBe(true);
  expect(
    contains(
      { type: "range", value: { start: { pos: 0 } } },
      { type: "range", value: { start: { pos: -10 }, end: { pos: 10 } } }
    )
  ).toBe(false);

  expect(
    contains(
      { type: "range", value: { end: { pos: 0 } } },
      { type: "range", value: { end: { pos: -5 } } }
    )
  ).toBe(true);
  expect(
    contains(
      { type: "range", value: { end: { pos: 0 } } },
      { type: "range", value: { end: { pos: 5 } } }
    )
  ).toBe(false);
  expect(
    contains(
      { type: "range", value: { end: { pos: 0 } } },
      { type: "range", value: { start: { pos: -20 }, end: { pos: -10 } } }
    )
  ).toBe(true);
  expect(
    contains(
      { type: "range", value: { end: { pos: 0 } } },
      { type: "range", value: { start: { pos: -10 }, end: { pos: 10 } } }
    )
  ).toBe(false);

  expect(
    contains(
      { type: "range", value: { start: { pos: 0 }, end: { pos: 20 } } },
      { type: "range", value: { start: { pos: 5 }, end: { pos: 15 } } }
    )
  ).toBe(true);
  expect(
    contains(
      { type: "range", value: { start: { pos: 0 }, end: { pos: 20 } } },
      { type: "range", value: { start: { pos: 5 } } }
    )
  ).toBe(false);
  expect(
    contains(
      { type: "range", value: { start: { pos: 0 }, end: { pos: 20 } } },
      { type: "range", value: { end: { pos: 15 } } }
    )
  ).toBe(false);

  expect(
    contains({ type: "range", value: { start: { pos: 0 } } }, "hello")
  ).toBe(false);
});

test("contains: map", () => {
  expect(
    contains(
      { type: "map", values: {}, items: [], pairs: [] },
      { type: "map", values: {}, items: [], pairs: [] }
    )
  ).toBe(true);
  expect(
    contains(
      { type: "map", values: {}, items: [], pairs: [] },
      { type: "map", values: { x: 1 }, items: [], pairs: [] }
    )
  ).toBe(true);
  expect(
    contains(
      { type: "map", values: {}, items: [], pairs: [] },
      { type: "map", values: {}, items: [1], pairs: [] }
    )
  ).toBe(true);
  expect(
    contains(
      { type: "map", values: {}, items: [1], pairs: [] },
      { type: "map", values: {}, items: [], pairs: [] }
    )
  ).toBe(false);
  expect(
    contains(
      { type: "map", values: { 1: 1 }, items: [], pairs: [] },
      { type: "map", values: {}, items: [1], pairs: [] }
    )
  ).toBe(true);
  expect(
    contains(
      { type: "map", values: { x: 1 }, items: [], pairs: [] },
      { type: "map", values: {}, items: [], pairs: [] }
    )
  ).toBe(false);
  expect(
    contains(
      { type: "map", values: { x: 1 }, items: [], pairs: [] },
      { type: "map", values: { x: 1 }, items: [], pairs: [] }
    )
  ).toBe(true);
  expect(
    contains(
      { type: "map", values: { x: GROUPS.NUMBER }, items: [], pairs: [] },
      { type: "map", values: { x: 1 }, items: [], pairs: [] }
    )
  ).toBe(true);
  expect(
    contains(
      { type: "map", values: { x: 1 }, items: [], pairs: [] },
      { type: "map", values: { x: GROUPS.NUMBER }, items: [], pairs: [] }
    )
  ).toBe(false);
});
