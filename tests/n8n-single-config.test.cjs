const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const workflow = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../n8n/Fakduai-Freight-Full-Release.json'), 'utf8'));
const settings = workflow.nodes.find(node => node.name === 'Workshop Settings');
assert.equal(settings.type, 'n8n-nodes-base.set');
assert.equal(settings.parameters.includeOtherFields, true, 'Preserve LINE message, source and replyToken');
assert.deepEqual(settings.parameters.assignments.assignments.map(field => field.name), ['sheetId']);
const tools = workflow.nodes.filter(node => node.type === 'n8n-nodes-base.googleSheetsTool');
assert.equal(tools.length, 5);
for (const sheetId of ['sheet-original', 'sheet-replacement']) {
  const input = {message: {text: 'IMP-003 อยู่ไหน'}, source: {userId: 'line-user'}, replyToken: 'test-reply-token'};
  const configured = {...input, sheetId};
  for (const tool of tools) {
    assert.equal(tool.parameters.documentId.mode, 'id');
    const expression = tool.parameters.documentId.value;
    assert.match(expression, /Workshop Settings/);
    const evaluated = vm.runInNewContext(expression.slice(3, -2).trim(), {$: name => {
      assert.equal(name, 'Workshop Settings');
      return {first: () => ({json: configured})};
    }});
    assert.equal(evaluated, sheetId, `${tool.name} must use central sheetId`);
  }
  assert.equal(configured.message, input.message);
  assert.equal(configured.source, input.source);
  assert.equal(configured.replyToken, input.replyToken);
}
assert.equal(workflow.connections['LINE Webhook'].main[0][0].node, 'Split Events');
assert.equal(workflow.connections['Split Events'].main[0][0].node, 'Filter Text Messages');
assert.equal(workflow.connections['Filter Text Messages'].main[0][0].node, 'Workshop Settings');
assert.equal(workflow.connections['Workshop Settings'].main[0][0].node, 'Freight AI Agent');
assert.equal(workflow.connections['Freight AI Agent'].main[0][0].node, 'Reply to LINE');
assert.equal(workflow.nodes.some(node => node.credentials), false);
assert.equal(workflow.nodes.some(node => node.name === 'Workshop Settings1'), false);
for (const tool of tools) assert.equal(workflow.connections[tool.name].ai_tool[0][0].node, 'Freight AI Agent');
assert.equal(workflow.active, false);
console.log('Single-config LINE workflow checks passed: five tools, both Sheet IDs, LINE fields, credential sanitization and connections.');
