/** Local API backed by the repository's real DATABASE_URL. No migrations or item seeding. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
const repo = fileURLToPath(new URL('../../../..', import.meta.url));
const root = path.resolve(process.cwd(), 'build/realdb-validation');
const settings = { ...dotenv.parse(fs.readFileSync(path.join(repo,'.env'))), ...process.env };
const database = new URL(settings.DATABASE_URL ?? 'file:///missing');
if (!['postgres:','postgresql:'].includes(database.protocol)) throw new Error('Configured PostgreSQL DATABASE_URL required.');
await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',()=>reject(new Error('Port 3004 is occupied; no existing process stopped.')));s.listen(3004,'127.0.0.1',()=>s.close(resolve));});
fs.mkdirSync(root,{recursive:true,mode:0o700});
fs.chmodSync(root,0o700);
const file=path.join(root,'backend.env');
// Single read attempt (no exists-then-read race): a missing file means a first run.
let old={};
try { old=dotenv.parse(fs.readFileSync(file)); } catch (error) { if (error.code!=='ENOENT') throw error; }
Object.assign(settings,{NODE_ENV:'test',PORT:'3004',APP_URL:'http://127.0.0.1:3004',B4SKILLS_API_VALIDATION_MODE:'true',JWT_SECRET:old.JWT_SECRET || crypto.randomBytes(32).toString('hex'),REFRESH_SECRET:old.REFRESH_SECRET || crypto.randomBytes(32).toString('hex'),ADMIN_SEED_EMAIL:'',ADMIN_SEED_PASSWORD:'',AWS_SECRET_ARN:'',OTEL_SDK_DISABLED:'true',SENTRY_DSN:''});
// Store only configured application settings, never the full inherited process environment.
const persisted={...dotenv.parse(fs.readFileSync(path.join(repo,'.env')))};
for(const key of ['NODE_ENV','PORT','APP_URL','B4SKILLS_API_VALIDATION_MODE','JWT_SECRET','REFRESH_SECRET','ADMIN_SEED_EMAIL','ADMIN_SEED_PASSWORD','AWS_SECRET_ARN','OTEL_SDK_DISABLED','SENTRY_DSN']) persisted[key]=settings[key];
fs.writeFileSync(file,Object.entries(persisted).map(([k,v])=>`${k}=${JSON.stringify(v)}`).join('\n'),{mode:0o600});
fs.chmodSync(file,0o600);
console.log('Real database API: http://127.0.0.1:3004; startup maintenance disabled.');
const child=spawn(process.execPath,['-r','dotenv/config','node_modules/tsx/dist/cli.mjs','server.ts'],{cwd:repo,env:{...settings,DOTENV_CONFIG_PATH:file},stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>child.kill(signal));
child.on('exit',(code)=>process.exit(code??1));
