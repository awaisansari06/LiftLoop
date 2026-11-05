import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function loader(responses){
 const source=readFileSync(new URL('../src/components/maps/MapView.tsx',import.meta.url),'utf8');
 const section=source.slice(source.indexOf('let sdkPromise:'),source.indexOf('/* ── Marker icon helpers'));
 const scripts=[];const window={setTimeout:()=>1,clearTimeout(){},setInterval:()=>2,clearInterval(){}};
 const context=vm.createContext({window,MAPPLS_REST_KEY:'test-only',encodeURIComponent,document:{createElement:()=>({remove(){this.removed=true;}}),head:{appendChild(script){scripts.push(script);queueMicrotask(()=>{const ok=responses.shift();if(ok){window.mappls={Map(){}};script.onload();}else script.onerror();});}}}});
 vm.runInContext(ts.transpileModule(section.replace('export function','function'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText,context);
 return {load:context.loadMapplsSDK,scripts};
}
test('map SDK recovers from a transient failure and shares one load',async()=>{
 const {load,scripts}=loader([false,true]);const first=load();assert.equal(load(),first);await first;assert.equal(scripts.length,2);assert.equal(scripts[0].removed,true);await load();assert.equal(scripts.length,2);
});
test('failed map load permits a later manual retry',async()=>{
 const {load,scripts}=loader([false,false,true]);await assert.rejects(load(),/could not be reached/);await load();assert.equal(scripts.length,3);
});
