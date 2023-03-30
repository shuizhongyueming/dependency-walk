
const {b2a} = customRequire('./b2a/b2a.js');
const {b2b} = customRequire('./b2b/b2b');

const b2 = {
  b2a,
  b2b,
}

customExports.b2 = b2;