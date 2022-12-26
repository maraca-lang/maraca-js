import ast from "./ast.js";

const processAst = (node) => {
  if (node.type === "map" && node.block) {
    const nodes = node.nodes
      .map((n) =>
        n.type === "assign" || n.type === "push"
          ? n
          : { type: "assign", nodes: [n] }
      )
      .map((n) => processAst(n));
    if (
      !node.nodes.some(
        (n) =>
          n.type === "assign" &&
          n.nodes[1].type === "keyword" &&
          n.nodes[1].name === "any"
      )
    ) {
      nodes.push({
        type: "assign",
        nodes: [
          { type: "keyword", name: "no" },
          { type: "keyword", name: "any" },
        ],
      });
    }
    return { ...node, nodes };
  } else if (node.nodes) {
    return { ...node, nodes: node.nodes.map((n) => processAst(n)) };
  } else {
    return node;
  }
};

const getParameters = (node) => {
  if (node?.type === "parameter") return [node.name];
  if (node?.nodes) return node.nodes.flatMap((n) => getParameters(n));
  return [];
};
const addParameters = (node) => {
  if (node.type === "assign") {
    const parameters = [...new Set(getParameters(node.nodes[1]))];
    if (parameters.length > 0) node.parameters = parameters;
  }
  if (node.nodes) {
    for (const n of node.nodes) addParameters(n);
  }
};

const captureNode = (node, context, capture) => {
  if (node.type === "map") {
    const varKeys = node.nodes
      .filter((n) => n.type === "assign" && n.nodes[1]?.type === "value")
      .map((n) => n.nodes[1].value);
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
            {
              type: "push",
              nodes: [
                { type: "keyword", name: "no" },
                { type: "keyword", name: "any" },
              ],
            },
            { type: "value", value: name },
          ],
        });
      };
      for (const n of node.nodes) captureNode(n, newContext, newCapture);
      for (const n of node.nodes) captureNode(n, newContext);
    }
  } else if (node.type === "assign") {
    const newContext = (node.parameters || []).reduce(
      (res, k) => ({ ...res, [k]: true }),
      context
    );
    captureNode(node.nodes[0], newContext, capture);
    if (node.nodes[1]) captureNode(node.nodes[1], context, capture);
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
      .filter((n) => n.type === "assign" && n.nodes[1]?.type === "value")
      .reduce((res, n) => ({ ...res, [n.nodes[1].value]: n }), {});
    const newProcessVar = (name) => {
      if (!(name in processed)) {
        if (name in values) {
          processed[name] = true;
          const [value, key] = processNode(values[name], newProcessVar).nodes;
          ordered.push({ key: key.value, value });
        } else {
          processVar(name);
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
        .filter((n) => n.type === "assign" && n.nodes[1]?.type !== "value")
        .map(({ nodes: [value, key], parameters }) => ({
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
  const result = processAst(ast(script));
  addParameters(result);
  captureNode(result, library);
  const final = processNode(result, () => {});
  // console.log(JSON.stringify(final, null, 2));
  return final;
};
