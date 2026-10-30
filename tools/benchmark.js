import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {fixture} from '../tests/fixtures/browser.js';
import {analyze,duplicateGroups,indexTree} from '../extension/core/classifier.js';
import {buildPlan} from '../extension/core/reconcile.js';

for(const count of [1000,5000,10000]){
  const tree=fixture(count),start=performance.now();
  const result=analyze(tree);
  const firstMs=performance.now()-start;
  const cached=performance.now(),again=analyze(tree,{cache:result.cache});
  const cachedMs=performance.now()-cached;
  const links=indexTree(tree).links,duplicatesStart=performance.now(),groups=duplicateGroups(links);
  const duplicatesMs=performance.now()-duplicatesStart;
  const proposals=result.proposals.filter(p=>p.category!=='Review Inbox').map(p=>({...p,status:'approved'}));
  const planned=performance.now(),plan=await buildPlan(tree,proposals,'benchmark');
  const planMs=performance.now()-planned;
  assert.equal(links.length,count);
  assert.equal(result.proposals.length,count);
  assert.equal(again.hits,count);
  assert.ok(groups.exact.length===0);
  assert.ok(plan.operations.length>0);
  console.log(JSON.stringify({bookmarks:count,classifyMs:+firstMs.toFixed(1),cachedMs:+cachedMs.toFixed(1),duplicatesMs:+duplicatesMs.toFixed(1),planMs:+planMs.toFixed(1),operations:plan.operations.length,memoryMiB:+(process.memoryUsage().heapUsed/1048576).toFixed(1)}));
}
