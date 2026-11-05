import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
function guard(role,roles){
 const context=vm.createContext({exports:{},require:name=>name.includes('useStore')?{useAuthStore:()=>({user:{user_type:role},loading:false})}:name.includes('navigation')?{Navigate:()=>null}:name.includes('kinetic-loader')?{KineticTextLoader:()=>null}:name.includes('roles')?{dashboardPath:()=>'/'}:require(name)});
 vm.runInContext(ts.transpileModule(readFileSync('src/components/RouteGuard.tsx','utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText,context);
 return context.exports.ProtectedRoute({roles,children:'content'}).props.children==='content';
}
test('shared protected pages allow every signed-in role',()=>{
 for(const role of ['student','driver','both','admin','pending_admin'])assert.equal(guard(role,[]),true);
});
test('both role permits passenger/driver routes but never admin',()=>{
 assert.equal(guard('both',['student']),true);assert.equal(guard('both',['driver']),true);assert.equal(guard('both',['admin']),false);assert.equal(guard('student',['admin']),false);
});
test('travel profile separates route caches and denied GPS never returns fabricated coordinates',async()=>{
 const storage=new Map(),calls=[];
 const context=vm.createContext({exports:{},require,process:{env:{}},navigator:{geolocation:{getCurrentPosition:(_ok,fail)=>fail(new Error('Denied'))}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},fetch:async url=>{calls.push(String(url));return {ok:true,json:async()=>({features:[{geometry:{coordinates:[[77,28],[77.1,28.1]]},properties:{summary:{distance:1000,duration:120},segments:[]}}]})}},setTimeout,clearTimeout});
 vm.runInContext(ts.transpileModule(readFileSync('src/lib/maps.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
 await context.exports.calculateRoute([28,77],[28.1,77.1],'driving-car');await context.exports.calculateRoute([28,77],[28.1,77.1],'cycling-regular');assert.equal(calls.length,2);
 await assert.rejects(context.exports.getUserLocation(),/Location access failed/);
});
