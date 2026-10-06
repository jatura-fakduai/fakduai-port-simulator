const {test} = require('node:test');
const assert = require('node:assert/strict');
test('Pages setup creates only for explicit missing-project errors', async () => {
  const {projectExists} = await import('../scripts/check-pages-project.mjs');
  assert.equal(projectExists(200, {success:true,result:{name:'fakduai-port-simulator'}}), true);
  assert.equal(projectExists(404, {success:false,errors:[{code:8000007}]}), false);
  assert.throws(() => projectExists(403, {success:false,errors:[{code:10000}]}));
  assert.throws(() => projectExists(500, {success:false,errors:[]}));
  assert.throws(() => projectExists(404, {success:false,errors:[{code:7003}]}));
  assert.throws(() => projectExists(200, {success:true,result:{name:'other'}}));
});
