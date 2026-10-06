const {test}=require('node:test');
const assert=require('node:assert/strict');
const {translate}=require('../public/i18n.js');
test('Menus and descriptions translate both directions',()=>{
  for(const [en,th] of [['Shipments','รายการขนส่ง'],['Documents','เอกสาร'],['Connect Google Sheet','เชื่อมต่อ Google Sheet']]){
    assert.equal(translate(en,'th'),th);assert.equal(translate(th,'en'),en);assert.equal(translate(en,'en'),en);
  }
});
test('Dynamic labels translate without changing IDs or counts',()=>{
  assert.equal(translate('Run: Load export vessel','th'),'เริ่ม: โหลดตู้ขึ้นเรือ');
  assert.equal(translate('3/5 ready','th'),'3/5 พร้อม');
  assert.match(translate('Completed · N8N-16879-1791273942779','th'),/N8N-16879-1791273942779/);
  assert.equal(translate('EXPORT_ARRIVAL','th'),'EXPORT_ARRIVAL');assert.equal(translate('IMP-003','th'),'IMP-003');
});
test('Translated display text never needs to change workflow data',()=>{
  const data={id:'EXP-004',status:'IN_TRANSIT',document:'Export Declaration'};
  assert.equal(translate(data.document,'th'),'ใบขนสินค้าขาออก');assert.equal(data.document,'Export Declaration');assert.equal(data.status,'IN_TRANSIT');
});
test('Unknown sheet data stays intact and whitespace is preserved',()=>{
  assert.equal(translate('Hamburg (HAM)','th'),'Hamburg (HAM)');assert.equal(translate('  Shipments  ','th'),'  รายการขนส่ง  ');
});
