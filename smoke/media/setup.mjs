import {admin,checked,stateFile} from './admin.mjs';
import {writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
const state={run:process.env.GITHUB_RUN_ID,users:[]};
await writeFile(stateFile,JSON.stringify(state),{mode:0o600});
for(let i=0;i<2;i++){
 const email=`media-smoke-${state.run}-${process.env.GITHUB_RUN_ATTEMPT}-${i}@example.invalid`;
 const password=randomBytes(32).toString('base64url');
 const {user}=checked(await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{first_name:'Media Smoke'},app_metadata:{media_smoke_run:state.run}}));
 state.users.push({id:user.id,email,password});
 await writeFile(stateFile,JSON.stringify(state),{mode:0o600});
}
console.log('PASS setup: two temporary Staging users');
