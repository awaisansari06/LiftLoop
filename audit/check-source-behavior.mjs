import ts from 'typescript';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,readdirSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
const files=[];function walk(dir){for(const item of readdirSync(dir)){const p=dir+'/'+item;if(statSync(p).isDirectory())walk(p);else if(/\.(tsx?|css|sql|mjs|json)$/.test(p))files.push(p);}}
for(const dir of ['src','supabase','tests'])walk(dir);
for(const file of ['next.config.ts','package.json','tsconfig.json','postcss.config.mjs','public/manifest.json'])files.push(file);
const inventory=files.map(file=>{const source=readFileSync(file,'utf8');const parsed=/\.tsx?$/.test(file)?ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true):null;return {file,lines:source.split('\n').length,sha256:createHash('sha256').update(source).digest('hex'),parseErrors:parsed?.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' '))||[],tables:[...source.matchAll(/\.from\(['"]([^'"]+)['"]\)/g)].map(m=>m[1]),rpc:[...source.matchAll(/\.rpc(?:<[^>]+>)?\(['"]([^'"]+)['"]/g)].map(m=>m[1])};});
writeFileSync('audit/source-inventory.json',JSON.stringify(inventory,null,2));
console.log('First-party source/config/test files:',inventory.length,'lines:',inventory.reduce((n,f)=>n+f.lines,0),'parse errors:',inventory.reduce((n,f)=>n+f.parseErrors.length,0));
const results={routeGuards:[],routeCache:{},geolocation:{},dateHandling:{}};
let currentUser;
const guardContext=vm.createContext({exports:{},require:(name)=>name.includes('useStore')?{useAuthStore:()=>({user:currentUser,loading:false})}:name.includes('navigation')?{Navigate:()=>null}:name.includes('kinetic-loader')?{KineticTextLoader:()=>null}:name.includes('roles')?{dashboardPath:()=>'/'}:require(name)});
const guardSource=readFileSync('src/components/RouteGuard.tsx','utf8');
vm.runInContext(ts.transpileModule(guardSource,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,guardContext);
for(const role of ['student','driver','admin','both','pending_admin'])for(const allowed of [[],['student'],['admin']]){currentUser={user_type:role};const r=guardContext.exports.ProtectedRoute({roles:allowed,children:'CONTENT'});results.routeGuards.push({role,allowed,access:r.props.children==='CONTENT'?'allowed':'redirected'});}
const storage=new Map();const calls=[];
const mapContext=vm.createContext({exports:{},require,process:{env:{}},navigator:{geolocation:{getCurrentPosition:(_ok,fail)=>fail(new Error('Permission denied'))}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},fetch:async url=>{calls.push(String(url));return {ok:true,json:async()=>({routes:[{geometry:'_p~iF~ps|U_ulLnnqC_mqNvxq`@',distance:1000,duration:120}]})}},setTimeout,clearTimeout});
vm.runInContext(ts.transpileModule(readFileSync('src/lib/maps.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,mapContext);
await mapContext.exports.calculateRoute([28,77],[28.1,77.1],'driving-car');await mapContext.exports.calculateRoute([28,77],[28.1,77.1],'cycling-regular');
results.routeCache={requestedProfiles:['driving-car','cycling-regular'],actualProviderRequests:calls.length,cyclingRequestSent:calls.some(url=>url.includes('biking'))};
results.geolocation={permissionDeniedReturns:await mapContext.exports.getUserLocation(),throwsError:false};
const local='2026-11-05T10:00:00+05:30';results.dateHandling={chosenLocal:local,sentByForm:'2026-11-05T10:00:00',instantIfDatabaseUTC:'2026-11-05T10:00:00Z',intendedInstant:new Date(local).toISOString(),earlyMorningDateButton:new Date('2026-11-05T01:00:00+05:30').toISOString().split('T')[0],displayedLocalDay:5};

const search=readFileSync('src/screens/RideSearch.tsx','utf8');
const filterStart=search.indexOf('  const filtered = useMemo(() => {');
const filterEnd=search.indexOf('  const markers =',filterStart);
const filterSource=search.slice(search.indexOf('  const CORRIDOR_KM'),filterEnd);
const a=[28.6139,77.209], b=[28.6149,77.210];
const filterContext=vm.createContext({useMemo:fn=>fn(),hasSearch:true,rides:[{departure_time:'2026-11-05T10:00:00+00:00',from_location:{lat:b[0],lng:b[1]},to_location:{lat:a[0],lng:a[1]}}],dateFilter:'',fromCoords:a,toCoords:b,fromName:'A',toName:'B',getDistance:mapContext.exports.getDistance});
vm.runInContext(filterSource+';globalThis.result=filtered.length;',filterContext);
results.corridorMatching={oppositeDirectionShortRideMatches:filterContext.result===1};
results.dateHandling.localMidnightRide='2026-11-04T19:00:00+00:00';
results.dateHandling.matchesNov5Filter='2026-11-04T19:00:00+00:00'.startsWith('2026-11-05');
const create=readFileSync('src/screens/CreateRide.tsx','utf8');const expr=create.match(/const canNext = ([^;]+);/)[1];
results.createRideClear={clearedPickupStillAllowsNext:vm.runInNewContext(expr,{step:0,from:{name:'',coords:[0,0]},to:{name:'B',coords:b}})};

writeFileSync('audit/source-behavior-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
