import compile from "./compile.js";
import parse from "./parse.js";

const run = (source, library = {}) => {
  const result = compile(parse(source, library));
  return JSON.stringify(result, null, 2);
};

console.log(run(`[*x: x * 2].10`));
