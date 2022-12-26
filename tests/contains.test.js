import contains from "../src/values/contains.js";
import { ANY, NO, GROUPS } from "../src/values/index.js";

test("contains: any", () => {
  expect(contains(ANY, NO)).toEqual({ needed: NO });
  expect(contains(ANY, 1)).toEqual({ needed: 1 });
  expect(contains(ANY, GROUPS.STRING)).toEqual({ needed: GROUPS.STRING });
});

test("contains: none", () => {
  expect(contains(NO, NO)).toEqual({ needed: ANY });
  expect(contains(NO, 1)).toEqual(false);
  expect(contains(NO, GROUPS.STRING)).toEqual(false);
});

test("contains: groups", () => {
  expect(contains(GROUPS.STRING, "hello")).toEqual({ needed: "hello" });
  expect(contains(GROUPS.STRING, 10)).toEqual(false);
  expect(contains(GROUPS.STRING, GROUPS.NUMBER)).toEqual(false);
  expect(contains(GROUPS.STRING, { __type: "regex", value: /a/ })).toEqual({
    needed: { __type: "regex", value: /a/ },
  });
  expect(contains(GROUPS.STRING, ANY)).toEqual(false);
  expect(contains(GROUPS.NUMBER, GROUPS.STRING)).toEqual(false);
  expect(contains(GROUPS.NUMBER, GROUPS.INTEGER)).toEqual({
    needed: GROUPS.INTEGER,
  });
  expect(contains(GROUPS.NUMBER, 10.5)).toEqual({ needed: 10.5 });
  expect(contains(GROUPS.NUMBER, 10)).toEqual({ needed: 10 });
  expect(contains(GROUPS.NUMBER, "hello")).toEqual(false);
  expect(contains(GROUPS.INTEGER, GROUPS.STRING)).toEqual(false);
  expect(contains(GROUPS.INTEGER, GROUPS.NUMBER)).toEqual(false);
  expect(contains(GROUPS.INTEGER, 10.5)).toEqual(false);
  expect(contains(GROUPS.INTEGER, 10)).toEqual({ needed: 10 });
  expect(
    contains(GROUPS.NUMBER, { __type: "range", value: { start: { pos: 0 } } })
  ).toEqual({ needed: { __type: "range", value: { start: { pos: 0 } } } });
  expect(
    contains(GROUPS.INTEGER, { __type: "range", value: { start: { pos: 0 } } })
  ).toEqual(false);
});

test("contains: regex", () => {
  expect(contains({ __type: "regex", value: /a/ }, "abc")).toEqual({
    needed: "abc",
  });
  expect(contains({ __type: "regex", value: /h/ }, "abc")).toEqual(false);
  expect(contains({ __type: "regex", value: /h/ }, 1)).toEqual(false);
  expect(contains({ __type: "regex", value: /h/ }, GROUPS.STRING)).toEqual(
    false
  );
});

test("contains: range", () => {
  expect(
    contains({ __type: "range", value: { start: { pos: 0 } } }, 10)
  ).toEqual({ needed: 10 });
  expect(
    contains({ __type: "range", value: { start: { pos: 0 } } }, 0)
  ).toEqual(false);
  expect(
    contains({ __type: "range", value: { start: { pos: 0 } } }, -5)
  ).toEqual(false);
  expect(
    contains({ __type: "range", value: { start: { pos: 0, inc: true } } }, 0)
  ).toEqual({ needed: 0 });

  expect(contains({ __type: "range", value: { end: { pos: 0 } } }, -5)).toEqual(
    { needed: -5 }
  );
  expect(contains({ __type: "range", value: { end: { pos: 0 } } }, 0)).toEqual(
    false
  );
  expect(contains({ __type: "range", value: { end: { pos: 0 } } }, 5)).toEqual(
    false
  );
  expect(
    contains({ __type: "range", value: { end: { pos: 0, inc: true } } }, 0)
  ).toEqual({ needed: 0 });

  expect(
    contains(
      { __type: "range", value: { start: { pos: 0 }, end: { pos: 10 } } },
      5
    )
  ).toEqual({ needed: 5 });
  expect(
    contains(
      { __type: "range", value: { start: { pos: 0 }, end: { pos: 10 } } },
      -5
    )
  ).toEqual(false);
  expect(
    contains(
      { __type: "range", value: { start: { pos: 0 }, end: { pos: 10 } } },
      15
    )
  ).toEqual(false);
  expect(
    contains(
      { __type: "range", value: { start: { pos: 0 }, end: { pos: 10 } } },
      0
    )
  ).toEqual(false);
  expect(
    contains(
      {
        __type: "range",
        value: { start: { pos: 0, inc: true }, end: { pos: 10 } },
      },
      0
    )
  ).toEqual({ needed: 0 });

  expect(
    contains(
      { __type: "range", value: { start: { pos: 0 } } },
      { __type: "range", value: { start: { pos: 5 } } }
    )
  ).toEqual({ needed: { __type: "range", value: { start: { pos: 5 } } } });
  expect(
    contains(
      { __type: "range", value: { start: { pos: 0 } } },
      { __type: "range", value: { start: { pos: -5 } } }
    )
  ).toEqual(false);
  expect(
    contains(
      { __type: "range", value: { start: { pos: 0 } } },
      { __type: "range", value: { start: { pos: 10 }, end: { pos: 20 } } }
    )
  ).toEqual({
    needed: {
      __type: "range",
      value: { start: { pos: 10 }, end: { pos: 20 } },
    },
  });
  expect(
    contains(
      { __type: "range", value: { start: { pos: 0 } } },
      { __type: "range", value: { start: { pos: -10 }, end: { pos: 10 } } }
    )
  ).toEqual(false);

  expect(
    contains(
      { __type: "range", value: { end: { pos: 0 } } },
      { __type: "range", value: { end: { pos: -5 } } }
    )
  ).toEqual({ needed: { __type: "range", value: { end: { pos: -5 } } } });
  expect(
    contains(
      { __type: "range", value: { end: { pos: 0 } } },
      { __type: "range", value: { end: { pos: 5 } } }
    )
  ).toEqual(false);
  expect(
    contains(
      { __type: "range", value: { end: { pos: 0 } } },
      { __type: "range", value: { start: { pos: -20 }, end: { pos: -10 } } }
    )
  ).toEqual({
    needed: {
      __type: "range",
      value: { start: { pos: -20 }, end: { pos: -10 } },
    },
  });
  expect(
    contains(
      { __type: "range", value: { end: { pos: 0 } } },
      { __type: "range", value: { start: { pos: -10 }, end: { pos: 10 } } }
    )
  ).toEqual(false);

  expect(
    contains(
      { __type: "range", value: { start: { pos: 0 }, end: { pos: 20 } } },
      { __type: "range", value: { start: { pos: 5 }, end: { pos: 15 } } }
    )
  ).toEqual({
    needed: { __type: "range", value: { start: { pos: 5 }, end: { pos: 15 } } },
  });
  expect(
    contains(
      { __type: "range", value: { start: { pos: 0 }, end: { pos: 20 } } },
      { __type: "range", value: { start: { pos: 5 } } }
    )
  ).toEqual(false);
  expect(
    contains(
      { __type: "range", value: { start: { pos: 0 }, end: { pos: 20 } } },
      { __type: "range", value: { end: { pos: 15 } } }
    )
  ).toEqual(false);

  expect(
    contains({ __type: "range", value: { start: { pos: 0 } } }, "hello")
  ).toEqual(false);
});

test("contains: map", () => {
  expect(
    contains(
      { __type: "map", values: {}, items: [], pairs: [] },
      { __type: "map", values: {}, items: [], pairs: [] }
    )
  ).toEqual({ needed: { __type: "map", values: {}, items: [], pairs: [] } });
  expect(
    contains(
      { __type: "map", values: {}, items: [], pairs: [] },
      { __type: "map", values: { x: 1 }, items: [], pairs: [] }
    )
  ).toEqual({
    needed: { __type: "map", values: { x: 1 }, items: [], pairs: [] },
  });
  expect(
    contains(
      { __type: "map", values: {}, items: [], pairs: [] },
      { __type: "map", values: {}, items: [1], pairs: [] }
    )
  ).toEqual({ needed: { __type: "map", values: {}, items: [1], pairs: [] } });
  expect(
    contains(
      { __type: "map", values: {}, items: [1], pairs: [] },
      { __type: "map", values: {}, items: [], pairs: [] }
    )
  ).toEqual(false);
  expect(
    contains(
      { __type: "map", values: { 1: 1 }, items: [], pairs: [] },
      { __type: "map", values: {}, items: [1], pairs: [] }
    )
  ).toEqual({ needed: { __type: "map", values: {}, items: [], pairs: [] } });
  expect(
    contains(
      { __type: "map", values: { x: 1 }, items: [], pairs: [] },
      { __type: "map", values: {}, items: [], pairs: [] }
    )
  ).toEqual(false);
  expect(
    contains(
      { __type: "map", values: { x: 1 }, items: [], pairs: [] },
      { __type: "map", values: { x: 1 }, items: [], pairs: [] }
    )
  ).toEqual({ needed: { __type: "map", values: {}, items: [], pairs: [] } });
  expect(
    contains(
      { __type: "map", values: { x: GROUPS.NUMBER }, items: [], pairs: [] },
      { __type: "map", values: { x: 1 }, items: [], pairs: [] }
    )
  ).toEqual({
    needed: { __type: "map", values: { x: 1 }, items: [], pairs: [] },
  });
  expect(
    contains(
      { __type: "map", values: { x: 1 }, items: [], pairs: [] },
      { __type: "map", values: { x: GROUPS.NUMBER }, items: [], pairs: [] }
    )
  ).toEqual(false);
  expect(
    contains(
      { __type: "map", values: { x: 1 }, items: [], pairs: [] },
      { __type: "map", values: { x: 1 }, items: [1, 2, 3], pairs: [] }
    )
  ).toEqual({
    needed: { __type: "map", values: {}, items: [1, 2, 3], pairs: [] },
  });
});
