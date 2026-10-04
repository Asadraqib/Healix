import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

const compile = (source) =>
  'data:text/javascript;base64,' +
  Buffer.from(
    ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText,
  ).toString('base64');
const access = compile(
  await fs.readFile(new URL('../src/services/accessControl.ts', import.meta.url), 'utf8'),
);
const searchSource = (
  await fs.readFile(new URL('../src/services/searchRecords.ts', import.meta.url), 'utf8')
).replace("'./accessControl'", JSON.stringify(access));
const { searchRecords } = await import(compile(searchSource));
const records = {
  assets: [
    { id: 'machine-1', name: 'Siemens CNC', assetType: 'Mill', location: 'Bay 1', sensors: [] },
  ],
  workOrders: [
    {
      id: 'WO-1',
      title: 'Inspect spindle bearing',
      assetName: 'Siemens CNC',
      description: 'Lubrication maintenance',
      assignedTechnician: 'A Worker',
      status: 'RESOLVED',
    },
  ],
  parts: [
    { id: 'part-1', name: 'Bearing', sku: 'SKU-6205', quantityOnHand: 3, supplierName: 'OEM' },
  ],
  suppliers: [{ id: 'supplier-1', name: 'OEM Bearings', location: 'Sample' }],
};
assert.deepEqual(searchRecords(' ', 'ADMIN', records), []);
assert.equal(searchRecords('siemens cnc', 'ADMIN', records).length, 2);
assert.equal(searchRecords('LUBRICATION maintenance', 'ADMIN', records)[0].id, 'WO-1');
assert.equal(searchRecords('sku-6205', 'ADMIN', records)[0].kind, 'inventory');
assert.equal(searchRecords('OEM', 'VIEWER', records).length, 0);
assert.equal(searchRecords('OEM', 'ADMIN', records).length, 2);
assert.equal(
  searchRecords('siemens', 'ADMIN', { ...records, assets: [], workOrders: [] }).length,
  0,
);
console.log(
  'Passed: search across records, maintenance history, SKU, multiple terms, permissions, and mode-scoped records.',
);
