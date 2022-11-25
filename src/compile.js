import { atom, derived, effect } from "./streams.js";
import {
  ANY,
  NONE,
  GROUPS,
  apply,
  doOperation,
  resolve,
} from "./values/index.js";

const makeAtom = (value) => {
  if (
    value === NONE ||
    typeof value === "number" ||
    typeof value === "string" ||
    value?.isStream ||
    value?.__type === "atom" ||
    value?.__type === "parameter" ||
    (value?.__type === "map" &&
      (Object.keys(value.values).length > 0 ||
        value.items.length > 0 ||
        value.pairs.length > 0))
  ) {
    return value;
  }
  return { __type: "atom", value, atom: atom() };
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
    return { __type: "parameter", name: node.name };
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
      return { __type: "map", values, items, pairs };
    }

    return derived(() => {
      for (const push of node.pushes) {
        const target = compile(push.target, newContext);
        if (target.__type === "atom") {
          let skipFirst = !push.first;
          const source = compile(push.source, newContext);
          if (push.trigger) {
            const trigger = compile(push.trigger, newContext);
            let prevTrigger = {};
            effect(() => {
              const nextTrigger = trigger && resolve(trigger);
              if (nextTrigger !== prevTrigger) {
                prevTrigger = nextTrigger;
                if (!skipFirst) target.atom.set(resolve(source, true));
                skipFirst = false;
              }
            });
          } else {
            effect(() => {
              const res = resolve(source, true);
              if (!skipFirst) target.atom.set(res);
              skipFirst = false;
            });
          }
        }
      }
      return { __type: "map", values, items, pairs };
    });
  }

  const compiled = node.nodes.map((n) => compile(n, context));

  if (node.type === "apply") {
    const [$map, $input] = compiled;
    return derived(() => apply($map, $input));
  }

  if (node.type === "operation") {
    if (
      compiled.every(
        (x) => !x?.isStream && x?.__type !== "map" && x?.__type !== "atom"
      )
    ) {
      return doOperation(node.operation, compiled);
    }
    return derived(() =>
      doOperation(
        node.operation,
        compiled.map((x) => resolve(x))
      )
    );
  }
};

export default compile;
