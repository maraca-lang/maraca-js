import { atom } from "./signals.js";

const runTest = (test, value) => {
  if (!test) return false;
  const v = value?.__type === "atom" ? value.value.value : value;
  if (test.type === "block") {
    if (v.__type !== "block") return false;
    const valueTests = test.nodes
      .filter((n) => n.type === "assign")
      .reduce((res, n) => ({ ...res, [n.key.value]: n.nodes[0] }), {});
    const itemsTest = test.nodes.find((n) => n.type !== "assign");
    return (
      Object.keys({ ...valueTests, ...v.values }).every((k) =>
        runTest(valueTests[k], v.values[k])
      ) && v.items.every((v) => runTest(itemsTest, v))
    );
  }
  if (test.type === "or") {
    return test.nodes.some((p) => runTest(p, v));
  }
  if (test.type === "and") {
    return test.nodes.every((p) => runTest(p, v));
  }
  if (test.type === "type") {
    if (test.value === "any") return true;
    if (test.value === "string") return typeof v === "string";
    if (test.value === "number") return typeof v === "number";
    if (test.value === "integer") return Number.isInteger(v);
    if (test.value === "maybe") return typeof v === "boolean";
  }
  if (test.type === "compare") {
    return operation[test.operation](v, test.value);
  }
};

const nestedAtom = (x, test) => {
  if (x?.__type !== "block") {
    return atom(x, (v) => {
      if (!runTest(test, v)) throw new Error();
      return v;
    });
  }
  const valueTests = test.nodes
    .filter((n) => n.type === "assign")
    .reduce((res, n) => ({ ...res, [n.key.value]: n.nodes[0] }), {});
  const itemsTest = test.nodes.find((n) => n.type !== "assign");
  return atom(x, (v) => {
    if (!runTest(test, v)) throw new Error();
    return {
      __type: "block",
      values: Object.fromEntries(
        Object.entries(v.values).map(([k, v]) => [
          k,
          nestedAtom(v, valueTests[k]),
        ])
      ),
      items: v.items.map((v) => nestedAtom(v, itemsTest)),
    };
  });
};

export const getParameters = (pattern, $value) => {
  if (pattern.type === "label") {
    return { [pattern.value]: $value };
  }
  if (pattern.type === "is") {
    const [label, test] = pattern.nodes;
    return { [label.value]: $value ? $value : nestedAtom(null, test) };
  }
  return {};
};
