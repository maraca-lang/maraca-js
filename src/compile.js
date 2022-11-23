import { applyMap, join, meet, resolve } from "./lattice.js";
import { atom, derived, effect } from "./streams.js";
import { ANY, NONE, GROUPS } from "./utils.js";

const operators = {
  "|": (a, b) => {
    const result = join(a, b);
    return result === null ? { type: "join", value: [a, b] } : result;
  },
  "&": (a, b) => {
    const result = meet(a, b);
    return result === null ? { type: "meet", value: [a, b] } : result;
  },
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

const compile = (node, context) => {
  if (node.type === "value") {
    if (typeof node.value === "number" || typeof node.value === "string") {
      return node.value;
    }
    return { type: "atom", value: node.value, atom: atom() };
  }

  if (node.type === "keyword") {
    return {
      type: "atom",
      value: {
        any: ANY,
        none: NONE,
        string: GROUPS.STRING,
        number: GROUPS.NUMBER,
        integer: GROUPS.INTEGER,
      }[node.name],
      atom: atom(),
    };
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

    return derived(() => {
      const newContext = { ...context };
      const values = {};

      for (const { key, value } of node.values) {
        const result = compile(value, newContext);
        newContext[key] = result;
        values[key] = result;
      }

      for (const push of node.pushes) {
        const source = compile(push.source, newContext);
        const target = compile(push.target, newContext);
        if (target.type === "atom") {
          effect(() => {
            target.atom.set(resolve(source));
          });
        }
      }

      return {
        type: "map",
        values,
        items: node.items.map((n) => compile(n, newContext)),
        pairs:
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
              ],
      };
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
    return derived(() => {
      const resolved = compiled.map((x) => resolve(x));
      if (operators[node.operation]) {
        return operators[node.operation](...resolved);
      }
      if (resolved.every((a) => typeof a === "number")) {
        return numericOperators[node.operation](...resolved);
      }
      return NONE;
    });
  }
};

export default compile;
