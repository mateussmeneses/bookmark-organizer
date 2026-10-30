import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixtures/browser.js';
import {analyze,indexTree} from '../extension/core/classifier.js';
import {semanticSignature,shouldAskModel,normalizeModelProposal} from '../extension/core/semantic.js';
const settings={provider:'ollama',model:'test-model',endpoint:'http://127.0.0.1:11434',rules:[]};
test('All eligible bookmarks, including high-confidence rule results, are sent to AI once',()=>{
 const tree=fixture(),node=indexTree(tree).links[0],previous=analyze(tree).proposals[0];
 assert.equal(shouldAskModel(node,previous,settings),true);
 const p=normalizeModelProposal({id:node.id,path:['Pirataria'],confidence:.9,reason:'Semantic evidence'},node,previous,settings);
 assert.equal(p.category,'Piracy');
 assert.equal(p.title,node.title);
 assert.equal(shouldAskModel(node,p,settings),false);
 assert.equal(shouldAskModel(node,p,{...settings,model:'changed'}),true);
 assert.equal(shouldAskModel({...node,title:'edited'},p,settings),true);
 assert.equal(p.aiSignature,semanticSignature(node,{},settings,{}));
});
test('Approved decisions are protected and unknown model categories are not added',()=>{
 const tree=fixture(),node=indexTree(tree).links[0],previous=analyze(tree).proposals[0];
 assert.equal(shouldAskModel(node,{...previous,status:'approved'},settings),false);
 assert.equal(shouldAskModel(node,{...previous,engine:'user-rule'},settings),false);
 const p=normalizeModelProposal({id:node.id,path:['Unknown topic'],confidence:1,reason:'Unknown'},node,previous,settings);
 assert.equal(p.category,'Review Inbox');
 assert.equal(p.confidence,0);
 assert.equal(p.status,'pending');
 assert.throws(()=>normalizeModelProposal({id:'unknown'},node,previous,settings),/Unexpected/);
});
