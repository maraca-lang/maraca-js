import parse from "./parse.js";

const getParameters = (pattern) => {
  if (pattern.type === "label") return [pattern.value];
  if (pattern.nodes) return pattern.nodes.flatMap((n) => getParameters(n));
  return [];
};

const captureNode = (node, context, capture) => {
  if (node.type === "block" || node.type === "fragment") {
    const keys = node.nodes
      .filter((n) => n.type === "assign")
      .map((n) => getParameters(n.pattern));
    const newContext = keys.reduce(
      (res, k) => ({ ...res, [k]: true }),
      context
    );
    if (node.type === "fragment") {
      for (const n of node.nodes) captureNode(n, newContext, capture);
    } else if (!capture) {
      const newCapture = (name) => {
        newContext[name] = true;
        node.nodes.push({
          type: "assign",
          pattern: {
            type: "is",
            nodes: [
              { type: "label", value: name },
              { type: "type", value: "any" },
            ],
          },
          nodes: [{ type: "value", value: false }],
        });
      };
      for (const n of node.nodes) captureNode(n, newContext, newCapture);
      for (const n of node.nodes) captureNode(n, newContext);
    }
  } else if (node.type === "for" || node.type === "function") {
    const parameters = [
      ...new Set(node.patterns.flatMap((p) => getParameters(p))),
    ];
    const newContext = parameters.reduce(
      (res, k) => ({ ...res, [k]: true }),
      context
    );
    for (const n of node.nodes) captureNode(n, newContext, capture);
  } else if (node.nodes) {
    for (const n of node.nodes) captureNode(n, context, capture);
  } else if (node.type === "label") {
    if (!(node.value in context)) capture(node.value);
  }
};

const orderValues = (node, processVar) => {
  if (node.type === "block" || node.type === "fragment") {
    const ordered = [];
    const processed = {};
    const values = node.nodes
      .filter((n) => n.type === "assign")
      .map((n) => ({
        parameters: [...new Set(getParameters(n.pattern))],
        node: n,
      }));
    const newProcessVar = (name) => {
      if (!(name in processed)) {
        processed[name] = true;
        const v = values.find((v) => v.parameters.includes(name));
        if (v && !v.processed) {
          v.processed = true;
          orderValues(v.node, newProcessVar);
          ordered.push(
            v.node.pattern.type === "is" ? { ...v.node, nodes: [] } : v.node
          );
        } else {
          processVar(name);
        }
      }
    };
    for (const { parameters } of values) {
      for (const name of parameters) newProcessVar(name);
    }
    for (const n of node.nodes.filter((n) => n.type !== "assign")) {
      orderValues(n, newProcessVar);
    }
    ordered.push(
      ...node.nodes
        .filter((n) => n.type === "assign" && n.pattern.type === "is")
        .map((n) => ({
          type: "push",
          first: true,
          key: n.pattern.nodes[0],
          nodes: [n.nodes[0]],
        }))
    );
    ordered.push(...node.nodes.filter((n) => n.type !== "assign"));
    node.nodes = ordered;
  } else if (node.type === "for" || node.type === "function") {
    const parameters = [
      ...new Set(node.patterns.flatMap((p) => getParameters(p))),
    ];
    const newProcessVar = (name) => {
      if (!parameters.includes(name)) processVar(name);
    };
    for (const n of node.nodes) orderValues(n, newProcessVar);
  } else if (node.nodes) {
    for (const n of node.nodes) orderValues(n, processVar);
  } else if (node.type === "label") {
    processVar(node.value);
  }
};

export default (script, library) => {
  const result = parse(script);
  captureNode(result, library);
  orderValues(result, () => {});
  // console.log(JSON.stringify(result, null, 2));
  return result;
};
