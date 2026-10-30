import {categories,canonical,categoryPath} from './taxonomy.js';
import {cacheKey} from './classifier.js';

// Cache identity includes both bookmark evidence and the selected model.
export function semanticSignature(node,metadata={},settings={},learned={}) {
  return JSON.stringify([cacheKey(node,metadata,settings.rules||[],learned),
    settings.provider,settings.endpoint,settings.model]);
}
export function shouldAskModel(node,proposal,settings={},metadata={},learned={}) {
  if(!proposal||['approved','rejected'].includes(proposal.status))return false;
  if(['user','user-rule','learned'].includes(proposal.engine))return false;
  return !['ai','ai-uncertain'].includes(proposal.engine)||proposal.aiSignature!==semanticSignature(node,metadata,settings,learned);
}
export function normalizeModelProposal(candidate,node,previous,settings,metadata={},learned={}) {
  if(!candidate||candidate.id!==node.id)throw Error('Unexpected AI bookmark ID');
  const last=typeof candidate.category==='string'?candidate.category:
    Array.isArray(candidate.path)?candidate.path.at(-1):'';
  const canonicalName=canonical(typeof last==='string'?last:'');
  const recognized=categories.some(c=>c.name===canonicalName);
  const category=recognized?canonicalName:'Review Inbox';
  const confidence=recognized&&Number.isFinite(candidate.confidence)?
    Math.min(1,Math.max(0,candidate.confidence)):0;
  const reason=typeof candidate.reason==='string'?candidate.reason.slice(0,1200):
    'Model did not explain the suggested destination.';
  return {...previous,id:node.id,title:node.title,category,
    path:recognized?categoryPath(category):['Review Inbox'],
    confidence,reason:recognized?reason:'Unknown topic; manual review required. '+reason,
    tags:[],engine:recognized?'ai':'ai-uncertain',status:'pending',
    key:cacheKey(node,metadata,settings.rules||[],learned),
    aiSignature:semanticSignature(node,metadata,settings,learned)};
}
