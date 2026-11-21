import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import test from 'node:test';
import {issueHappyLearningDetectionToken, verifyHappyLearningDetectionToken, HAPPY_LEARNING_TOKEN_TTL_SECONDS} from '../src/lib/happy-learning/happyLearningDetectionToken.server.ts';
const secret='synthetic-test-only-key';const now=1800000000000;
const candidate={id:'synthetic-id',personId:'person-A',captureType:'interest',value:'ceramics',polarity:'likes',semanticTags:['interest','like'],evidenceText:'Anna likes ceramics.',source:'chat_message',schemaVersion:'happy-learning-detection-v2'};
const issue=()=>issueHappyLearningDetectionToken({userId:'owner-A',candidate,secret,now});
const verify=(token,change={})=>verifyHappyLearningDetectionToken({token,candidate,secret,now,...change});
const resign=change=>{const claims={...JSON.parse(Buffer.from(issue().split('.')[0],'base64url')), ...change};const payload=Buffer.from(JSON.stringify(claims)).toString('base64url');return `${payload}.${createHmac('sha256',secret).update(payload).digest('base64url')}`;};
test('confirmation token has explicit audience and rejects legacy, wrong-purpose and excessive lifetime even when signed',()=>{
 assert.equal(verify(issue()).ok,true);
 for(const change of [{aud:'other-operation'},{aud:undefined},{v:1},{exp:Math.floor(now/1000)+HAPPY_LEARNING_TOKEN_TTL_SECONDS+1},{iat:Math.floor(now/1000)+61}])assert.equal(verify(resign(change)).ok,false);
});
test('expiry, source/person/value tampering and noncanonical signature fail closed',()=>{
 assert.equal(verify(issue(),{now:now+HAPPY_LEARNING_TOKEN_TTL_SECONDS*1000}).ok,false);
 for(const change of [{personId:'person-B'},{value:'tampered'},{source:'gift_discovery'},{schemaVersion:'other-schema'}])assert.equal(verify(issue(),{candidate:{...candidate,...change}}).ok,false);
 assert.equal(verify(issue()+'=').ok,false);assert.equal(verify(issue(),{secret:''}).ok,false);
});
