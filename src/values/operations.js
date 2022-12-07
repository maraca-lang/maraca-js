import combine from "./combine.js";
import { YES, NO } from "./index.js";

const operators = {
  "|": (...args) => combine({ __type: "join", value: args }),
  "&": (...args) => combine({ __type: "meet", value: args }),
  "=": (a, b) => (a === b ? YES : NO),
  "!=": (a, b) => (a !== b ? YES : NO),
  concat: (...args) => args.filter((x) => x !== NO).join(""),
};

const numericOperators = {
  "<=": (a, b) => (a <= b ? YES : NO),
  ">=": (a, b) => (a >= b ? YES : NO),
  "<": (a, b) => (a < b ? YES : NO),
  ">": (a, b) => (a > b ? YES : NO),
  "+": (a, b) => a + b,
  "-": (a, b) => a - b,
  "*": (a, b) => a * b,
  "/": (a, b) => a / b,
  "%": (a, b) => ((((a - 1) % b) + b) % b) + 1,
  "^": (a, b) => a ** b,
};

export default (operation, values) => {
  if (operators[operation]) {
    return operators[operation](...values);
  }
  if (values.every((a) => typeof a === "number")) {
    if (operation === "-" && values.length === 1) {
      return -values[0];
    }
    return numericOperators[operation](...values);
  }
  return NO;
};
