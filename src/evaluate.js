import { resolveDeep, resolveToMulti, resolveToSingle } from "./resolve.js";
import { derived, effect } from "./streams.js";
import { getParameters } from "./types.js";

export const unary = {
  "!": (a) => !a,
  "-": (a) => -a,
  "...": (a) => ({ __type: "multi", value: a.items }),
};
export const binary = {
  "|": (a, b) => (a || b ? true : false),
  "&": (a, b) => (a && b ? true : false),
  "=": (a, b) => a === b,
  "!=": (a, b) => a !== b,
  concat: (...args) => args.filter((x) => x).join(""),
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
  for (const n of nodes.filter((n) => n.type === "push")) {
    let skipFirst = !n.first;
    const [$source, $trigger] = n.nodes.map((n) => evaluate(n, newContext));
    const target = newContext[n.key.value];
    if ($trigger) {
      const trigger = derived(() => resolveDeep($trigger) && {});
      let prevTrigger = {};
      effect(() => {
        const nextTrigger = resolveToSingle(trigger);
        if (!skipFirst && nextTrigger && nextTrigger !== prevTrigger) {
          target.value.set(resolveDeep($source));
        }
        prevTrigger = nextTrigger;
        skipFirst = false;
      });
    } else {
      effect(() => {
        const value = resolveDeep($source);
        if (!skipFirst) {
          target.value.set(value);
        }
        skipFirst = false;
      });
    }
  }
  const items = nodes
    .filter((n) => n.type !== "assign" && n.type !== "push")
    .map((n) => evaluate(n, newContext));
  return { values, items };
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
      const result = resolveToSingle($block).items.map(($v, i) => {
        const matches = node.patterns.map((p, j) =>
          getParameters(p, j === 0 ? $v : i + 1)
        );
        if (!matches.every((m) => m)) throw new Error();
        return evaluate(
          node.nodes[1],
          matches.reduce((res, m) => ({ ...res, ...m }), context)
        );
      });
      return { __type: "multi", value: result };
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
      const { values, items } = evaluateBlock(node.nodes, context);
      return {
        __type: "block",
        values,
        items: items.reduce((res, $v) => {
          const v = resolveToMulti($v);
          if (v === null) return res;
          if (v.__type === "multi") return [...res, ...v.value];
          return [...res, v];
        }, []),
      };
    });
  }

  if (node.type === "multi") {
    return derived(() => {
      const { items } = evaluateBlock(node.nodes, context);
      return { __type: "multi", value: items };
    });
  }

  const $values = node.nodes.map((n) => evaluate(n, context));

  if (node.type === "operation") {
    return derived(() => {
      const args = $values.map((x) => resolveToSingle(x));
      return (args.length === 1 ? unary : binary)[node.operation](...args);
    });
  }

  if (node.type === "if") {
    return derived(() => {
      const [$test, $yes, $no = null] = $values;
      return resolveToSingle($test) ? $yes : $no;
    });
  }

  if (node.type === "get") {
    const [block, arg] = $values.map((x) => resolveToSingle(x));
    if (arg in block.values) {
      return block.values[arg];
    }
    if (Number.isInteger(arg) && arg - 1 in block.items) {
      return block.items[arg - 1];
    }
    throw new Error();
  }

  if (node.type === "call") {
    const [$func, ...$args] = $values;
    return derived(() => {
      const multi = resolveToMulti($func);
      const funcs =
        multi === null ? [] : multi.__type === "multi" ? multi.value : [multi];
      for (const f of funcs) {
        if (typeof f === "function") {
          return f.reactiveFunc
            ? f(...$args)
            : f(...$args.map((x) => resolveToSingle(x)));
        }
        const matches = f.patterns.map((p, i) => getParameters(p, $args[i]));
        if (matches.every((m) => m)) {
          return evaluate(
            f.body,
            matches.reduce((res, m) => ({ ...res, ...m }), context)
          );
        }
      }
      throw new Error();
    });
  }
};

export default evaluate;
