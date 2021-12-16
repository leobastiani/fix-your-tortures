/* eslint-disable @typescript-eslint/ban-ts-comment */
import _ = require("lodash");

const memoizedFunctions: any[] = [];

const _memoize = _.memoize;

// @ts-expect-error
_.memoize = (...args) => {
  const ret = _memoize.apply(_, args);
  memoizedFunctions.push(ret);
  return ret;
};

beforeEach(() => {
  memoizedFunctions.forEach((f) => f.cache.clear());
});

module.exports = _;
