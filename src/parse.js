import ohm from "ohm-js";

const grammar = String.raw`Maraca {

  start
    = space* value? space*

  value
    = or

  or
    = or space* "|" space* and -- or
    | and

  and
    = and space* "&" space* equal -- and
    | equal

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
    = ("-" | "!" | "...") space* apply -- unary
    | apply

  apply
    = apply "." label -- key
    | apply "[" space* value space* "]" -- get
    | apply "(" space* items space* ")" -- call
    | atom

  atom
    = if | for | function | block | multi | content | string | number | boolean | label | brackets

  if
    = "if" space* value space* "then" space* value (space* "else" space* value)?

  for
    = "for" space* pattern (space* "," space* pattern)? space* "in" space* value space* value

  function
    = "(" space* listOf<pattern, separator> space* ")" space* "=>" space* value

  block
    = "[" space* values (space* "~" space* items)? space* "]" -- both
    | "[" space* values space* "]" -- values
    | "[" space* items space* "]" -- items

  multi
    = "{" space* values (space* "~" space* items)? space* "}" -- both
    | "{" space* items space* "}" -- items

  values
    = listOf<(assign | push), separator> space* ","?

  assign
    = pattern space* ":" space* value

  push
    = ("when" space* value space*)? "push" space* value space* "->" space* label

  items
    = listOf<value, separator> space* ","?

  pattern
    = label space* "is" space* p_or -- is
    | (p_or | label)

  p_or
    = p_or space* "|" space* p_and -- or
    | p_and

  p_and
    = p_and space* "&" space* test -- and
    | test

  test
    = "[" space* pattern space* "]" -- block
    | ("any" | "string" | "number" | "integer" | "maybe") -- type
    | ("!=" | "=" | "<=" | ">=" | "<" | ">") value -- compare
    | "(" space* pattern space* ")" -- brackets

  content
    = "\"" (multi | c_chunk)* "\""

  c_chunk
    = (c_char | escape)+

  c_char
    = ~("\"" | "\\" | "{") any

  string
    = "'" (multi | s_chunk)* "'"

  s_chunk
    = (s_char | escape)+

  s_char
    = ~("'" | "\\" | "{") any

  escape
    = "\\" any

  number
    = digit+ ("." digit+)?

  boolean
    = ("yes" | "no")

  label
    = ~("if" | "then" | "else" | "yes" | "no") alnum+

  brackets
    = "(" space* value space* ")"

  separator
    = space* "," space*
    | (linespace* "\n")+ linespace*

  linespace
    = ~"\n" "\x00".."\x20"
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

  or_or: binary,
  or: (a) => a.ast,

  and_and: binary,
  and: (a) => a.ast,

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

  apply_key: (a, _1, b) => ({
    type: "get",
    nodes: [a.ast, { type: "value", value: b.ast.value }],
  }),
  apply_get: (a, _1, _2, b, _3, _4) => ({
    type: "get",
    nodes: [a.ast, b.ast],
  }),
  apply_call: (a, _1, _2, b, _3, _4) => ({
    type: "call",
    nodes: [a.ast, ...b.ast],
  }),
  apply: (a) => a.ast,

  atom: (a) => a.ast,

  if: (_1, _2, a, _3, _4, _5, b, _6, _7, _8, c) => ({
    type: "if",
    nodes: [a.ast, b.ast, c.ast[0]].filter((x) => x),
  }),

  for: (_1, _2, a, _3, _4, _5, b, _6, _7, _8, c, _9, d) => ({
    type: "for",
    patterns: [a.ast, b.ast[0]].filter((x) => x),
    nodes: [c.ast, d.ast],
  }),

  function: (_1, _2, a, _3, _4, _5, _6, _7, b) => ({
    type: "function",
    patterns: a.ast,
    nodes: [b.ast],
  }),

  block_both: (_1, _2, a, _3, _4, _5, b, _6, _7) => ({
    type: "block",
    nodes: [...a.ast, ...(b.ast[0] || [])],
  }),
  block_values: (_1, _2, a, _3, _4) => ({ type: "block", nodes: a.ast }),
  block_items: (_1, _2, a, _3, _4) => ({ type: "block", nodes: a.ast }),

  multi_both: (_1, _2, a, _3, _4, _5, b, _6, _7) => ({
    type: "multi",
    nodes: [...a.ast, ...(b.ast[0] || [])],
  }),
  multi_items: (_1, _2, a, _3, _4) => ({ type: "multi", nodes: a.ast }),

  values: (a, _1, _2) => a.ast,

  assign: (a, _1, _2, _3, b) => ({
    type: "assign",
    pattern: a.ast,
    nodes: [b.ast],
  }),

  push: (_1, _2, a, _3, _4, _5, b, _6, _7, _8, c) => ({
    type: "push",
    key: c.ast,
    nodes: [b.ast, a.ast[0]].filter((x) => x),
  }),

  items: (a, _1, _2) => a.ast,

  pattern_is: (a, _1, _2, _3, b) => ({ type: "is", nodes: [a.ast, b.ast] }),
  pattern: (a) => a.ast,

  p_or_or: (a, _1, _2, _3, b) => ({ type: "or", nodes: [a.ast, b.ast] }),
  p_or: (a) => a.ast,

  p_and_and: (a, _1, _2, _3, b) => ({ type: "and", nodes: [a.ast, b.ast] }),
  p_and: (a) => a.ast,

  test_block: (_1, _2, a, _3, _4) => ({
    type: "block",
    value: a.ast,
  }),
  test_type: (a) => ({
    type: "type",
    value: a.sourceString,
  }),
  test_compare: (a, b) => ({
    type: "compare",
    operation: a.sourceString,
    value: b.ast,
  }),
  test_brackets: (_1, _2, a, _3, _4) => a.ast,

  content: (_1, a, _2) => ({ type: "block", nodes: a.ast }),

  c_chunk: (a) => ({
    type: "value",
    value: a.sourceString.replace(/\\(.)/g, (_, a) => a),
  }),

  c_char: (_) => null,

  string: (_1, a, _2) =>
    a.ast.length === 0 || (a.ast.length === 1 && a.ast[0].type === "value")
      ? a.ast[0] || { type: "value", value: "" }
      : {
          type: "operation",
          operation: "concat",
          nodes: a.ast,
        },

  s_chunk: (a) => ({
    type: "value",
    value: a.sourceString.replace(/\\(.)/g, (_, a) => a),
  }),

  s_char: (_) => null,

  escape: (_1, _2) => null,

  number: (a, b, c) => ({
    type: "value",
    value: parseFloat([a, b, c].map((x) => x.sourceString).join("")),
  }),

  boolean: (a) => ({ type: "value", value: a.sourceString === "yes" }),

  label: (a) => ({ type: "label", value: a.sourceString }),

  brackets: (_1, _2, a, _3, _4) => a.ast,

  separator: (_1, _2, _3) => null,

  linespace: (_) => null,

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
