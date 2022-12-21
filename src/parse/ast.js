import ohm from "ohm-js";

const grammar = String.raw`Maraca {

  start
    = space* value? space*

  value
    = join

  join
    = nonemptyListOf<meet, joininner>

  joininner
    = space* "|" space*

  meet
    = nonemptyListOf<equal, meetinner>

  meetinner
    = space* "&" space*

  equal
    = equal space* ("!=" | "=") space* compare -- equal
    | compare

  compare
    = compare space* ("<=" | ">=" | "<" | ">") space* sum -- compare
    | sum

  sum
    = sum space* ("+" | "-") space* product -- sum
    | product

  product
    = product space* ("*" | "/" | "%") space* power -- product
    | power

  power
    = power space* "^" space* unary -- power
    | unary

  unary
    = "-" space* apply -- unary
    | apply

  apply
    = apply space* (".." | ".") space* atom -- apply
    | apply atom -- pair
    | atom

  atom
    = map | block | content | string | number | keyword | parameter | variable

  map
    = "(" space* items space* ")"

  block
    = "{" space* items space* "}"

  items
    = listOf<(assign | push | value), itemsinner> space* ","?

  assign
    = value? space* ":" space* (push | value)?

  itemsinner
    = space* "," space*

  push
    = (value space* "?" space*)? value space* "->" space* value

  content
    = "\"" (block | cchunk)* "\""

  string
    = "'" (block | schunk)* "'"

  cchunk
    = (cchar | escape)+

  cchar
    = ~("\"" | "\\" | "{") any

  schunk
    = (schar | escape)+

  schar
    = ~("'" | "\\" | "{") any

  escape
    = "\\" any

  number
    = digit+ ("." digit+)?

  keyword
    = "yes" | "no" | "string" | "number" | "integer"

  parameter
    = "*" variable

  variable
    = alnum+
}`;

const g = ohm.grammar(grammar);
const s = g.createSemantics();

const binary = (a, _1, b, _2, c) => ({
  type: "operation",
  operation: b.sourceString,
  nodes: [a.ast, c.ast],
});

s.addAttribute("ast", {
  start: (_1, a, _2) => a.ast[0],

  value: (a) => a.ast,

  join: (a) =>
    a.ast.length === 1
      ? a.ast[0]
      : {
          type: "operation",
          operation: "|",
          nodes: a.ast,
        },

  joininner: (_1, _2, _3) => null,

  meet: (a) =>
    a.ast.length === 1
      ? a.ast[0]
      : {
          type: "operation",
          operation: "&",
          nodes: a.ast,
        },

  meetinner: (_1, _2, _3) => null,

  equal_equal: binary,
  equal: (a) => a.ast,

  compare_compare: binary,
  compare: (a) => a.ast,

  sum_sum: binary,
  sum: (a) => a.ast,

  product_product: binary,
  product: (a) => a.ast,

  power_power: binary,
  power: (a) => a.ast,

  unary_unary: (a, _1, b) => ({
    type: "operation",
    operation: a.sourceString,
    nodes: [b.ast],
  }),
  unary: (a) => a.ast,

  apply_apply: (a, _1, b, _2, c) =>
    b.sourceString === ".."
      ? { type: "apply", map: true, nodes: [a.ast, c.ast] }
      : { type: "apply", nodes: [a.ast, c.ast] },
  apply_pair: (a, b) => ({ type: "apply", nodes: [a.ast, b.ast] }),
  apply: (a) => a.ast,

  atom: (a) => a.ast,

  map: (_1, _2, a, _3, _4) => ({ type: "map", nodes: a.ast }),

  block: (_1, _2, a, _3, _4) => ({ type: "map", block: true, nodes: a.ast }),

  items: (a, _1, _2) => a.ast,

  itemsinner: (_1, _2, _3) => null,

  assign: (a, _1, _2, _3, b) => ({
    type: "assign",
    nodes: [
      b.ast[0] || { type: "keyword", name: "yes" },
      a.ast[0] || { type: "keyword", name: "yes" },
    ],
  }),

  push: (a, _1, _2, _3, b, _4, _5, _6, c) => ({
    type: "push",
    nodes: [b.ast, c.ast, a.ast[0]].filter((x) => x),
  }),

  content: (_1, a, _2) => ({ type: "map", nodes: a.ast }),

  string: (_1, a, _2) =>
    a.ast.length === 0 || (a.ast.length === 1 && a.ast[0].type === "value")
      ? a.ast[0] || { type: "value", value: "" }
      : {
          type: "operation",
          operation: "concat",
          nodes: a.ast,
        },

  cchunk: (a) => ({
    type: "value",
    value: a.sourceString.replace(/\\(.)/g, (_, a) => a),
  }),

  cchar: (_) => null,

  schunk: (a) => ({
    type: "value",
    value: a.sourceString.replace(/\\(.)/g, (_, a) => a),
  }),

  schar: (_) => null,

  escape: (_1, _2) => null,

  number: (a, b, c) => ({
    type: "value",
    value: parseFloat([a, b, c].map((x) => x.sourceString).join("")),
  }),

  keyword: (a) => ({ type: "keyword", name: a.sourceString }),

  parameter: (_1, a) => ({ type: "parameter", name: a.sourceString }),

  variable: (a) => ({ type: "variable", name: a.sourceString }),

  listOf: (a) => a.ast,
  nonemptyListOf: (a, _1, b) => [a.ast, ...b.ast],
  emptyListOf: () => [],

  _iter: (...children) => children.map((c) => c.ast),
  _terminal: () => null,
});

export default (script) => {
  const m = g.match(script);
  if (m.failed()) {
    console.error(m.message);
    throw new Error("Parser error");
  }
  return s(m).ast;
};
