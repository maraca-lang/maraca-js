import { NONE, GROUPS } from "./index.js";

const comparePos = (a, b, type) => {
  if (a.pos === b.pos) {
    if (a.inc === b.inc) return 0;
    return (a.inc ? -1 : 1) * (type === "start" ? 1 : -1);
  }
  return a.pos < b.pos ? -1 : 1;
};

const getLower = (x, y, type) => {
  if (x && y) return comparePos(x, y, type) === -1 ? x : y;
  return type === "start" ? undefined : x || y;
};

const getHigher = (x, y, type) => {
  if (x && y) return comparePos(x, y, type) === 1 ? x : y;
  return type === "end" ? undefined : x || y;
};

const cleanRange = (p) => {
  if (!p.start) delete p.start;
  if (!p.end) delete p.end;
  return p;
};

export const rangeIncludesValue = ({ start, end }, n) => {
  if (start) {
    if (n < start.pos) return false;
    if (n === start.pos && !start.inc) return false;
  }
  if (end) {
    if (n > end.pos) return false;
    if (n === end.pos && !end.inc) return false;
  }
  return true;
};

export const rangeIncludesRange = (outer, inner) =>
  getLower(outer.start, inner.start, "start") === outer.start &&
  getHigher(outer.end, inner.end, "end") === outer.end;

export const joinRangeValue = ({ start, end }, n) => {
  if (start?.pos === n && !start.inc) {
    return {
      type: "range",
      value: cleanRange({ start: { ...start, inc: true }, end }),
    };
  }
  if (end?.pos === n && !end.inc) {
    return {
      type: "range",
      value: cleanRange({ start, end: { ...end, inc: true } }),
    };
  }
};

export const joinRanges = (r1, r2) => {
  if (r1.start && r2.start) {
    const [x, y] =
      comparePos(r1.start, r2.start, "start") < 0 ? [r1, r2] : [r2, r1];
    if (
      !x.end ||
      x.end.pos > y.start.pos ||
      (x.end.pos === y.start.pos && (x.end.inc || y.start.inc))
    ) {
      return {
        type: "range",
        value: cleanRange({
          start: x.start,
          end: getHigher(x.end, y.end, "end"),
        }),
      };
    }
    return null;
  }
  if (r1.end && r2.end) {
    const [x, y] = comparePos(r1.end, r2.end) > 0 ? [r1, r2] : [r2, r1];
    if (
      !x.start ||
      x.start.pos < y.end.pos ||
      (x.start.pos === y.end.pos && (x.start.inc || y.end.inc))
    ) {
      return {
        type: "range",
        value: cleanRange({
          start: getLower(x.start, y.start, "start"),
          end: x.end,
        }),
      };
    }
    return null;
  }
  const [x, y] = r1.start ? [r1, r2] : [r2, r1];
  if (
    x.start.pos < y.end.pos ||
    (x.start.pos === y.end.pos && (x.start.inc || y.end.inc))
  ) {
    return GROUPS.NUMBER;
  }
  return null;
};

export const meetRanges = (r1, r2) => {
  const start = getHigher(r1.start, r2.start, "start");
  const end = getLower(r1.end, r2.end, "end");
  if (start && end) {
    if (start.pos > end.pos) return NONE;
    if (start.pos === end.pos) {
      return start.inc && end.inc ? start.pos : NONE;
    }
  }
  return { type: "range", value: cleanRange({ start, end }) };
};
