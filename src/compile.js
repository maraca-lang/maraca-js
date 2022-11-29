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
  return { __type: "atom", value, atom: atom(value) };
};

const resolveToAtom = (x) => {
  if (typeof x === "object" && x.isStream) return resolveToAtom(x.get());
  return x;
};

const compile = (node, context, pushes = []) => {
  if (node.type === "value") {
    return node.value;
  }

  if (node.type === "keyword") {
    return {
      yes: ANY,
      no: NONE,
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

  if (node.type === "push") {
    const [source, target, trigger] = node.nodes;
    const result = makeAtom(compile(target, context));
    pushes.push({ source, target: result, trigger, first: true });
    return result;
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
    const pushes = [];
    for (const { key, value } of node.values) {
      const result = makeAtom(compile(value, newContext, pushes));
      newContext[key] = result;
      values[key] = result;
    }
    const items = node.items.map((n) =>
      makeAtom(compile(n, newContext, pushes))
    );
    const pairs =
      node.pairs.length === 0
        ? []
        : [
            node.pairs.map(({ key, value, parameters }) => ({
              key: compile(key, newContext),
              value: parameters
                ? (args) => compile(value, { ...newContext, ...args })
                : makeAtom(compile(value, newContext, pushes)),
              parameters,
            })),
          ];
    pushes.push(
      ...node.pushes.map((n) => {
        const [source, target, trigger] = n.nodes;
        return { source, target: compile(target, newContext), trigger };
      })
    );

    if (pushes.length === 0) {
      return { __type: "map", values, items, pairs };
    }

    return derived(() => {
      for (const push of pushes) {
        let skipFirst = !push.first;
        const source = compile(push.source, newContext);
        if (push.trigger) {
          const trigger = compile(push.trigger, newContext);
          const triggerStream = derived(() =>
            resolve(trigger) === NONE ? false : {}
          );
          let prevTrigger = {};
          effect(() => {
            const tar = resolveToAtom(push.target);
            if (tar.__type === "atom") {
              const nextTrigger = resolve(triggerStream);
              if (nextTrigger && nextTrigger !== prevTrigger) {
                prevTrigger = nextTrigger;
                if (!skipFirst) tar.atom.set(resolve(source, true, true));
              }
            }
            skipFirst = false;
          });
        } else {
          effect(() => {
            const tar = resolveToAtom(push.target);
            if (tar.__type === "atom") {
              const res = resolve(source, true, true);
              if (!skipFirst) tar.atom.set(res);
            }
            skipFirst = false;
          });
        }
      }
      return { __type: "map", values, items, pairs };
    });
  }

  const compiled = node.nodes.map((n) => compile(n, context));

  if (node.type === "apply") {
    const [$map, ...$args] = compiled;
    return derived(() => {
      const map = resolve($map);
      if (typeof map === "function") {
        const args = map.reactiveFunc
          ? $args
          : $args.map(($arg) => resolve($arg, true));
        if (node.complete || args.length >= map.length) return map(...args);
        const result = Object.assign(
          (...otherArgs) => map(...args, ...otherArgs),
          { reactiveFunc: map.reactiveFunc }
        );
        Object.defineProperty(result, "length", {
          value: map.length - args.length,
        });
        return result;
      }
      return compiled.reduce(($a, $b) => apply($a, $b));
    });
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
