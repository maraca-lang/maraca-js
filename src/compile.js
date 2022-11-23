import { applyMap, resolve, simplify } from "./lattice.js";
import { atom, derived, effect } from "./streams.js";
import { ANY, NONE, GROUPS } from "./utils.js";

const operators = {
  "|": (...args) => simplify("join", args),
  "&": (...args) => simplify("meet", args),
  "=": (a, b) => (a === b ? ANY : NONE),
  "!": (a, b) => (a !== b ? ANY : NONE),
};
const numericOperators = {
  "<=": (a, b) => (a <= b ? ANY : NONE),
  ">=": (a, b) => (a >= b ? ANY : NONE),
  "<": (a, b) => (a < b ? ANY : NONE),
  ">": (a, b) => (a > b ? ANY : NONE),
  "+": (a, b) => a + b,
  "-": (a, b) => a - b,
  "*": (a, b) => a * b,
  "/": (a, b) => a / b,
  "%": (a, b) => ((((a - 1) % b) + b) % b) + 1,
  "^": (a, b) => a ** b,
};
const doOperator = (operation, values) => {
  if (operators[operation]) {
    return operators[operation](...values);
  }
  if (values.every((a) => typeof a === "number")) {
    return numericOperators[operation](...values);
  }
  return NONE;
};

const makeAtom = (value) => {
  if (
    value === NONE ||
    typeof value === "number" ||
    typeof value === "string" ||
    value?.isStream ||
    value?.type === "atom"
  ) {
    return value;
  }
  return { type: "atom", value, atom: atom() };
};

const compile = (node, context) => {
  if (node.type === "value") {
    return node.value;
  }

  if (node.type === "keyword") {
    return {
      any: ANY,
      none: NONE,
      string: GROUPS.STRING,
      number: GROUPS.NUMBER,
      integer: GROUPS.INTEGER,
    }[node.name];
  }

  if (node.type === "variable") {
    return context[node.name];
  }

  if (node.type === "parameter") {
    return node;
  }

  if (node.type === "map") {
    if (node.block) {
      return compile(
        {
          type: "apply",
          nodes: [
            { ...node, block: false },
            { type: "value", value: ANY },
          ],
        },
        context
      );
    }

    const newContext = { ...context };
    const values = {};
    for (const { key, value } of node.values) {
      const result = makeAtom(compile(value, newContext));
      newContext[key] = result;
      values[key] = result;
    }
    const items = node.items.map((n) => compile(n, newContext));
    const pairs =
      node.pairs.length === 0
        ? []
        : [
            node.pairs.map(({ key, value, parameters }) => ({
              key: compile(key, newContext),
              value: parameters
                ? (args) => compile(value, { ...newContext, ...args })
                : compile(value, newContext),
              parameters,
            })),
          ];

    if (node.pushes.length === 0) {
      return { type: "map", values, items, pairs };
    }

    return derived(() => {
      for (const push of node.pushes) {
        const source = compile(push.source, newContext);
        const target = compile(push.target, newContext);
        if (target.type === "atom") {
          let skipFirst = !push.first;
          effect(() => {
            const res = resolve(source);
            if (!skipFirst) target.atom.set(res);
            skipFirst = false;
          });
        }
      }
      return { type: "map", values, items, pairs };
    });
  }

  const compiled = node.nodes.map((n) => compile(n, context));

  if (node.type === "apply") {
    return derived(() => {
      const [map, input] = compiled;
      return applyMap(map, input);
    });
  }

  if (node.type === "operation") {
    if (
      compiled.every(
        (x) => !x?.isStream && x?.type !== "map" && x?.type !== "atom"
      )
    ) {
      return doOperator(node.operation, compiled);
    }
    return derived(() =>
      doOperator(
        node.operation,
        compiled.map((x) => resolve(x))
      )
    );
  }
};

export default compile;
