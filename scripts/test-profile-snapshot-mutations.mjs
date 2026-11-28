// Local source mutations, restored in finally; no production or database access.
import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const target=path.join(root,"src/components/PrivateSnapshotBoundary.tsx");
const original=await readFile(target,"utf8");
const mutations=[
  ["remove owner identity", 'key={`${ownerId}:${routeKey}`}', 'key={routeKey}'],
  ["remove route identity", 'key={`${ownerId}:${routeKey}`}', 'key={ownerId}'],
  ["accept stale restore response", 'if (!mounted || verification !== verificationRef.current) return;', 'if (!mounted) return;'],
  ["render unresolved authentication", 'if (loading || (restoration !== null && restoration.ownerId !== ownerId))', 'if (restoration !== null && restoration.ownerId !== ownerId)'],
];
let survived=0;
try {
  for(const [name,from,to] of mutations) {
    if(!original.includes(from)) throw new Error(`Mutation target missing: ${name}`);
    await writeFile(target,original.replace(from,to));
    const run=spawnSync(process.execPath,["--experimental-strip-types","--test","tests/profile-snapshot-privacy.test.mjs"],{cwd:root,encoding:"utf8",timeout:60000});
    const log=run.stdout+run.stderr;
    const failures=log.match(/(?:ℹ|#) fail (\d+)/)?.[1];
    if(run.error || !failures || /Build failed|SyntaxError|ReferenceError/.test(log)) throw new Error(`Invalid mutation run: ${name}\n${log}`);
    const killed=run.status!==0 && Number(failures)>0;
    console.log(`${killed?'KILLED':'SURVIVED'}: ${name}; failed tests=${failures}`);
    console.log(log.split('\n').filter(l=>l.startsWith('✖ SEC-01')||l.startsWith('not ok')).join('\n'));
    if(!killed) survived++;
  }
} finally {await writeFile(target,original);}
if(survived) process.exitCode=1;
