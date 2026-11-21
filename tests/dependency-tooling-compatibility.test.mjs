import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import test from 'node:test';
import {glob} from 'glob';
import {rimraf} from 'rimraf';

test('Capacitor cleanup dependency preserves glob deletion scope and CommonJS exports',async()=>{
 const require=createRequire(import.meta.url);assert.equal(typeof require('glob').glob,'function');assert.equal(typeof require('rimraf').rimraf,'function');
 const root=await mkdtemp(join(tmpdir(),'happydate-tooling-'));
 try{await mkdir(join(root,'nested'));await writeFile(join(root,'nested','remove.tmp'),'synthetic');await writeFile(join(root,'keep.txt'),'keep');
  assert.deepEqual(await glob('**/*.tmp',{cwd:root}),['nested/remove.tmp']);
  assert.equal(await rimraf(join(root,'**','*.tmp'),{glob:true}),true);assert.deepEqual(await glob('**/*.tmp',{cwd:root}),[]);assert.equal(await readFile(join(root,'keep.txt'),'utf8'),'keep');
 }finally{await rm(root,{recursive:true,force:true});}
});
test('patched glob honors an already aborted signal',async()=>{
 const root=await mkdtemp(join(tmpdir(),'happydate-glob-abort-'));
 try{await assert.rejects(()=>glob('**/*',{cwd:root,signal:AbortSignal.abort()}),error=>error.name==='AbortError');}
 finally{await rm(root,{recursive:true,force:true});}
});
