import {
  derived,
  resolveDeep,
  resolveToFragment,
  resolveToSingle,
} from "./signals.js";
import { getParameters } from "./types.js";

const unary = {
  "-": (a) => -a,
  "...": (a) => ({ __type: "fragment", value: a.items }),
};
const binary = {
  "=": (a, b) => a === b,
  "!=": (a, b) => a !== b,
  "<=": (a, b) => a <= b,
  ">=": (a, b) => a >= b,
  "<": (a, b) => a < b,
  ">": (a, b) => a > b,
  "+": (a, b) => a + b,
  "-": (a, b) => a - b,
  "*": (a, b) => a * b,
  "/": (a, b) => a / b,
  "%": (a, b) => ((((a - 1) % b) + b) % b) + 1,
  "^": (a, b) => a ** b,
};

const isTruthy = (x) => !(x === false || x === null);

const toBlock = (value) => {
  if (!value || typeof value !== "object") throw new Error();
  if (Array.isArray(value)) {
    return { __type: "block", values: {}, items: value };
  }
  if (value.__type !== "block") {
    return { __type: "block", values: value, items: [] };
  }
  return value;
};

const evaluateBlock = (nodes, context) => {
  const newContext = { ...context };
  const values = {};
  for (const n of nodes.filter((n) => n.type === "assign")) {
    const pattern = n.pattern;
    const $value = evaluate(n.nodes[0], newContext);
    const res = getParameters(pattern, $value, true);
    if (!res) throw new Error();
    Object.assign(newContext, res);
    Object.assign(values, res);
  }
  const pushes = nodes
    .filter((n) => n.type === "push")
    .map((n) => {
      let skipFirst = !n.first;
      const [$source, $trigger] = n.nodes.map((n) => evaluate(n, newContext));
      const target = newContext[n.key.value];
      if (!$trigger) {
        return derived(() => {
          const value = resolveDeep($source);
          if (!skipFirst) {
            target.value.set(value);
          }
          skipFirst = false;
        });
      }
      const trigger = derived(() => resolveDeep($trigger) && {});
      let prevTrigger = {};
      return derived(() => {
        const nextTrigger = resolveToSingle(trigger);
        if (!skipFirst && nextTrigger && nextTrigger !== prevTrigger) {
          target.value.set(resolveDeep($source));
        }
        prevTrigger = nextTrigger;
        skipFirst = false;
      });
    });
  const items = nodes
    .filter((n) => n.type !== "assign" && n.type !== "push")
    .map((n) => evaluate(n, newContext));
  return { values, items, pushes };
};

const evaluate = (node, context) => {
  if (node.type === "value") {
    return node.value;
  }

  if (node.type === "label") {
    return context[node.value];
  }

  if (node.type === "for") {
    const $block = evaluate(node.nodes[0], context);
    return derived(() => {
      const block = resolveToSingle($block);
      if (block === null) return null;
      const result = toBlock(block).items.map(($v, i) => {
        const matches = node.patterns.map((p, j) =>
          getParameters(p, j === 0 ? $v : i + 1)
        );
        if (!matches.every((m) => m)) throw new Error();
        return evaluate(
          node.nodes[1],
          matches.reduce((res, m) => ({ ...res, ...m }), context)
        );
      });
      return { __type: "fragment", value: result };
    });
  }

  if (node.type === "function") {
    return {
      __type: "function",
      patterns: node.patterns,
      body: node.nodes[0],
    };
  }

  if (node.type === "block") {
    return derived(() => {
      const { values, items, pushes } = evaluateBlock(node.nodes, context);
      return derived(
        () => ({
          __type: "block",
          values: Object.fromEntries(
            Object.entries(values).filter(
              ([_, $v]) => resolveToFragment($v) !== null
            )
          ),
          items: items.reduce((res, $v) => {
            const v = resolveToFragment($v);
            if (v === null) return res;
            if (v.__type === "fragment") return [...res, ...v.value];
            return [...res, v];
          }, []),
        }),
        pushes
      );
    });
  }

  if (node.type === "fragment") {
    return derived(() => {
      const { items } = evaluateBlock(node.nodes, context);
      return { __type: "fragment", value: items };
    });
  }

  const $values = node.nodes.map((n) => evaluate(n, context));

  if (node.type === "operation") {
    return derived(() => {
      if (node.operation === "concat") {
        return $values
          .map((x) => resolveToFragment(x))
          .reduce((res, x) => {
            if (x === null) return res;
            if (x.__type === "fragment") return [...res, ...x.value];
            return [...res, x];
          }, [])
          .join("");
      }
      const args = $values.map((x) => resolveToSingle(x));
      if (node.operation === "!") {
        return !isTruthy(args[0]);
      }
      if (node.operation === "|") {
        return isTruthy(args[0]) ? args[0] : args[1];
      }
      if (node.operation === "&") {
        return !isTruthy(args[0]) ? args[0] : args[1];
      }
      if (args.some((x) => x === null)) return null;
      return (args.length === 1 ? unary : binary)[node.operation](...args);
    });
  }

  if (node.type === "if") {
    return derived(() => {
      const [$test, $yes, $no = null] = $values;
      return isTruthy(resolveToSingle($test)) ? $yes : $no;
    });
  }

  if (node.type === "get") {
    return derived(() => {
      const [base, arg] = $values.map((x) => resolveToSingle(x));
      if (base === null) return null;
      const block = toBlock(base);
      if (arg in block.values) {
        return block.values[arg];
      }
      if (Number.isInteger(arg) && arg - 1 in block.items) {
        return block.items[arg - 1];
      }
      return null;
    });
  }

  if (node.type === "call") {
    const [$func, ...$args] = $values;
    return derived(() => {
      const fragment = resolveToFragment($func);
      const funcs =
        fragment === null
          ? []
          : fragment.__type === "fragment"
          ? fragment.value
          : [fragment];
      for (const f of funcs) {
        if (typeof f === "function") {
          return f.reactiveFunc
            ? f(...$args)
            : f(...$args.map((x) => resolveToFragment(x)));
        }
        const matches = f.patterns.map((p, i) => getParameters(p, $args[i]));
        if (matches.every((m) => m)) {
          return evaluate(
            f.body,
            matches.reduce((res, m) => ({ ...res, ...m }), context)
          );
        }
      }
      return null;
    });
  }
};

export default evaluate;
