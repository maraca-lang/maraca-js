import parse from "./parse.js";

const captureNode = (node, context, capture) => {
  if (node.type === "block" || node.type === "fragment") {
    const keys = node.nodes
      .filter((n) => n.type === "assign")
      .map((n) => n.label);
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
          label: name,
          variable: true,
          nodes: [{ type: "value", value: null }],
        });
      };
      for (const n of node.nodes) captureNode(n, newContext, newCapture);
      for (const n of node.nodes) captureNode(n, newContext);
    }
  } else if (node.type === "for" || node.type === "function") {
    const parameters = [...new Set(node.labels)];
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
    const values = node.nodes.filter((n) => n.type === "assign");
    // .map((n) => ({
    //   label: n.label,
    //   node: n,
    // }));
    const newProcessVar = (name) => {
      if (!(name in processed)) {
        processed[name] = true;
        const v = values.find((v) => v.label === name);
        if (v && !v.processed) {
          v.processed = true;
          orderValues(v, newProcessVar);
          ordered.push(v.variable ? { ...v, nodes: [] } : v);
        } else {
          processVar(name);
        }
      }
    };
    for (const { label } of values) newProcessVar(label);
    for (const n of node.nodes.filter((n) => n.type !== "assign")) {
      orderValues(n, newProcessVar);
    }
    ordered.push(
      ...node.nodes
        .filter((n) => n.type === "assign" && n.variable)
        .map((n) => ({
          type: "push",
          first: true,
          key: n.label,
          nodes: [n.nodes[0]],
        }))
    );
    ordered.push(...node.nodes.filter((n) => n.type !== "assign"));
    node.nodes = ordered;
  } else if (node.type === "for" || node.type === "function") {
    const parameters = [...new Set(node.labels)];
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
