import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Run the real hook code with controlled effects and deferred network responses.
export function hookHarness(file,imports,globals={}) {
 const slots=[],pending=[],timers=new Map();let index=0,timerId=0;
 const changed=(a,b)=>!a||!b||a.length!==b.length||a.some((item,i)=>!Object.is(item,b[i]));
 const react={
  useState(initial){const i=index++;slots[i]??={value:typeof initial==='function'?initial():initial};return [slots[i].value,value=>{slots[i].value=typeof value==='function'?value(slots[i].value):value;}];},
  useRef(initial){const i=index++;slots[i]??={current:initial};return slots[i];},
  useMemo(fn,deps){const i=index++;if(changed(slots[i]?.deps,deps))slots[i]={deps,value:fn()};return slots[i].value;},
  useCallback(fn,deps){return react.useMemo(()=>fn,deps);},
  useEffect(fn,deps){const i=index++;if(changed(slots[i]?.deps,deps))pending.push(()=>{slots[i]?.cleanup?.();slots[i]={deps,cleanup:fn()};});},
 };
 const setInterval=fn=>{timers.set(++timerId,fn);return timerId;};
 const clearInterval=id=>timers.delete(id);
 const context=vm.createContext({exports:{},require:name=>name==='react'?react:imports[name],setInterval,clearInterval,window:{setInterval,clearInterval},console,Error,...globals});
 vm.runInContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,context);
 return {
  render(name,...args){index=0;const result=context.exports[name](...args);while(pending.length)pending.shift()();return result;},
  poll(){for(const fn of [...timers.values()])fn();},
  unmount(){for(const slot of slots)slot?.cleanup?.();},
 };
}

export function deferred(){let resolve,reject;const promise=new Promise((ok,fail)=>{resolve=ok;reject=fail;});return {promise,resolve,reject};}
export const settle=()=>new Promise(resolve=>setImmediate(resolve));
