import ast from "./ast.js";

const getParameters = (node) => {
  if (node.type === "parameter") return [node.name];
  if (node.nodes) return node.nodes.flatMap((n) => getParameters(n));
  return [];
};
const addParameters = (node) => {
  if (node.type === "assign") {
    const parameters = [...new Set(getParameters(node.nodes[0]))];
    if (parameters.length > 0) node.parameters = parameters;
  }
  if (node.nodes) {
    for (const n of node.nodes) addParameters(n);
  }
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
            { type: "keyword", name: "yes" },
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
        .map(({ nodes: [key, value], parameters }) => ({
          key,
          value,
          parameters,
        })),
      pushes: nodes.filter((n) => n.type === "push"),
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
  const result = ast(script);
  addParameters(result);
  captureNode(result, library);
  const final = processNode(result, () => {});
  // console.log(JSON.stringify(final, null, 2));
  return final;
};
