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
    = equal space* ("!" | "=") space* compare -- equal
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
    = ("!" | "-") space* apply -- unary
    | apply

  apply
    = apply space* "." space* atom -- apply
    | atom

  atom
    = map | block | string | number | keyword | parameter | variable | brackets

  map
    = "[" space* items space* "]"

  block
    = "{" space* items space* "}"

  items
    = listOf<(assign | push | value), itemsinner> space* ","?

  itemsinner
    = space* "," space*

  assign
    = value? space* ":" space* (push | value)?

  push
    = (value space* "?" space*)? value space* "->" space* value

  string
    = "'" (char | escape)* "'"

  char
    = ~("'" | "\\") any

  escape
    = "\\" any

  number
    = digit+ ("." digit+)?

  keyword
    = "any" | "none" | "string" | "number" | "integer"

  parameter
    = "*" variable

  variable
    = alnum+

  brackets
    = "(" space* value space* ")"
}`;

const g = ohm.grammar(grammar);
const s = g.createSemantics();

const binary = (a, _1, b, _2, c) => ({
  type: "operation",
  operation: b.sourceString,
  nodes: [a.ast, c.ast],
});

const getMapNotes = (ast) =>
  ast.flatMap((n) =>
    n.type === "assign" && n.nodes[1].type === "push"
      ? n.nodes[0].type === "value"
        ? [
            { type: "assign", nodes: [n.nodes[0], n.nodes[1].nodes[1]] },
            {
              type: "push",
              first: true,
              nodes: [
                n.nodes[1].nodes[0],
                { type: "variable", name: n.nodes[0].value },
              ],
            },
          ]
        : []
      : n
  );

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

  apply_apply: (a, _1, _2, _3, b) => ({ type: "apply", nodes: [a.ast, b.ast] }),
  apply: (a) => a.ast,

  atom: (a) => a.ast,

  map: (_1, _2, a, _3, _4) => ({ type: "map", nodes: getMapNotes(a.ast) }),

  block: (_1, _2, a, _3, _4) => ({
    type: "map",
    block: true,
    nodes: getMapNotes(a.ast),
  }),

  items: (a, _1, _2) => a.ast,

  itemsinner: (_1, _2, _3) => null,

  assign: (a, _1, _2, _3, b) => ({
    type: "assign",
    nodes: [
      a.ast[0] || { type: "keyword", name: "any" },
      b.ast[0] || { type: "keyword", name: "any" },
    ],
  }),

  push: (a, _1, _2, _3, b, _4, _5, _6, c) => ({
    type: "push",
    nodes: [b.ast, c.ast, a.ast[0]].filter((x) => x),
  }),

  string: (_1, a, _2) => ({ type: "value", value: a.sourceString }),

  char: (_) => null,

  escape: (_1, _2) => null,

  number: (a, b, c) => ({
    type: "value",
    value: parseFloat([a, b, c].map((x) => x.sourceString).join("")),
  }),

  keyword: (a) => ({ type: "keyword", name: a.sourceString }),

  parameter: (_1, a) => ({ type: "parameter", name: a.sourceString }),

  variable: (a) => ({ type: "variable", name: a.sourceString }),

  brackets: (_1, _2, a, _3, _4) => a.ast,

  listOf: (a) => a.ast,
  nonemptyListOf: (a, _1, b) => [a.ast, ...b.ast],
  emptyListOf: () => [],

  _iter: (...children) => children.map((c) => c.ast),
  _terminal: () => null,
});

const getParameters = (node) => {
  if (node.type === "parameter") return [node.name];
  if (node.nodes) return node.nodes.flatMap((n) => getParameters(n));
  return [];
};

const captureNode = (node, context, capture) => {
  if (node.type === "map") {
    const varKeys = node.nodes
      .filter((n) => n.type === "assign" && n.nodes[0].type === "value")
      .map((n) => n.nodes[0].value);
    const newContext = varKeys.reduce(
      (res, k) => ({ ...res, [k]: true }),
      context
    );
    if (node.block) {
      for (const n of node.nodes) captureNode(n, newContext, capture);
    } else if (!capture) {
      const newCapture = (name) => {
        newContext[name] = true;
        node.nodes.push({
          type: "assign",
          nodes: [
            { type: "value", value: name },
            { type: "keyword", name: "any" },
          ],
        });
      };
      for (const n of node.nodes) captureNode(n, newContext, newCapture);
      for (const n of node.nodes) captureNode(n, newContext);
    }
  } else if (node.type === "assign") {
    const parameters = getParameters(node.nodes[0]);
    const newContext = parameters.reduce(
      (res, k) => ({ ...res, [k]: true }),
      context
    );
    captureNode(node.nodes[0], context, capture);
    captureNode(node.nodes[1], newContext, capture);
  } else if (node.nodes) {
    for (const n of node.nodes) captureNode(n, context, capture);
  } else if (node.type === "variable") {
    if (!(node.name in context)) capture(node.name);
  }
};

const processNode = (node, processVar) => {
  if (node.type === "map") {
    const ordered = [];
    const processed = {};
    const values = node.nodes
      .filter((n) => n.type === "assign" && n.nodes[0].type === "value")
      .reduce((res, n) => ({ ...res, [n.nodes[0].value]: n }), {});
    const newProcessVar = (name) => {
      if (!(name in processed)) {
        if (name in values) {
          processed[name] = true;
          const [key, value] = processNode(values[name], newProcessVar).nodes;
          ordered.push({ key: key.value, value });
        }
      }
    };
    for (const name in values) newProcessVar(name);
    const nodes = node.nodes.map((n) => processNode(n, newProcessVar));
    return {
      type: "map",
      block: node.block,
      values: ordered,
      items: nodes.filter((n) => n.type !== "assign" && n.type !== "push"),
      pairs: nodes
        .filter((n) => n.type === "assign" && n.nodes[0].type !== "value")
        .map(({ nodes: [key, value] }) => {
          const parameters = [...new Set(getParameters(key))];
          if (parameters.length === 0) return { key, value };
          return { key, value, parameters };
        }),
      pushes: nodes
        .filter((n) => n.type === "push")
        .map(({ nodes: [source, target, trigger], first }) => ({
          source,
          target,
          trigger,
          first,
        })),
    };
  } else if (node.nodes) {
    return {
      ...node,
      nodes: node.nodes.map((n) => processNode(n, processVar)),
    };
  } else if (node.type === "variable") {
    processVar(node.name);
    return node;
  }
  return node;
};

export default (script, library) => {
  const m = g.match(script);
  if (m.failed()) {
    console.error(m.message);
    throw new Error("Parser error");
  }
  const result = s(m).ast;
  captureNode(result, library);
  const final = processNode(result, () => {});
  // console.log(JSON.stringify(final, null, 2));
  return final;
};
