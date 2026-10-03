import assert from 'node:assert/strict';
import { TelemetryStabilizer } from '../src/services/telemetryStabilizer.ts';
const base = 1700000000000;
const asset = () => ({id:'CNC-001',healthScore:96,status:'HEALTHY',sensors:[{id:'t',type:'Temperature',currentValue:60,history:[60]}]});
const msg = (value,time,healthScore=96,status='Running') => ({machineId:'CNC-001',sensorType:'temperature',value,healthScore,status,recordedAt:new Date(time).toISOString()});
const filter = new TelemetryStabilizer();let fleet=[asset()];filter.seed(fleet,base);
filter.ingest(msg(62,base+4000),base+4000);fleet=filter.flush(fleet,base+4000);assert.equal(fleet[0].sensors[0].currentValue,60.4);
filter.ingest(msg(200,base+8000),base+8000);fleet=filter.flush(fleet,base+8000);assert.equal(fleet[0].sensors[0].currentValue,60.4,'isolated spike held');
assert.equal(filter.ingest(msg(150,base+8000),base+8000),undefined,'duplicate ignored');
filter.ingest(msg(NaN,base+10000),base+10000);filter.ingest(msg(62,base+12000),base+12000);
const before=fleet[0].sensors[0].currentValue;fleet=filter.flush(fleet,base+12000);assert.ok(fleet[0].sensors[0].currentValue-before<=0.5,'rate limited');
assert.equal(filter.ingest(msg(100,base+16000,40,'Fault'),base+16000),'DOWN');fleet=filter.flush(fleet,base+16000);assert.equal(fleet[0].status,'DOWN');assert.equal(fleet[0].healthScore,40);
for (const offset of [20000,24000]) {filter.ingest(msg(63,base+offset,96),base+offset);fleet=filter.flush(fleet,base+offset);assert.equal(fleet[0].status,'DOWN','recovery requires confirmation');}
filter.ingest(msg(63,base+28000,96),base+28000);fleet=filter.flush(fleet,base+28000);assert.equal(fleet[0].status,'DOWN','health score must recover before healthy label');
for(let offset=32000; offset<=240000; offset+=4000){filter.ingest(msg(63,base+offset,96),base+offset);fleet=filter.flush(fleet,base+offset);}
assert.equal(fleet[0].status,'HEALTHY');
const frozen=fleet;assert.equal(filter.isFresh(base+270000),false);
const delayed=filter.flush(fleet,base+270000);
assert.deepEqual(delayed[0].sensors,frozen[0].sensors,'stale readings freeze');
assert.equal(delayed[0].connectionState,'DELAYED','stale connection state remains visible');
assert.equal(filter.flush(delayed,base+290000)[0].connectionState,'DISCONNECTED');
const step=new TelemetryStabilizer();step.seed([asset()],base);for(const offset of [4000,8000,12000])step.ingest(msg(80,base+offset),base+offset);assert.equal(step.flush([asset()],base+12000)[0].sensors[0].currentValue,60.5,'sustained step accepted with rate cap');
step.seed([asset()],base+60000);assert.equal(step.flush([asset()],base+60000)[0].sensors[0].currentValue,60,'new session resets filter');
console.log('Passed: EMA, spike rejection, rate cap, invalid/duplicate input, immediate fault, confirmed recovery, stale freeze, sustained steps, session reset.');
