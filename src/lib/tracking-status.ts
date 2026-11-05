export function trackingStatus(status:string|undefined, updatedAt:string|undefined, now=Date.now()) {
 if(status==='completed')return {label:'Ride completed',live:false};
 if(status==='cancelled')return {label:'Ride cancelled',live:false};
 if(status!=='in_progress')return {label:'Ride not started',live:false};
 const age=updatedAt ? now-Date.parse(updatedAt) : NaN;
 if(Number.isFinite(age)&&age>=-10000&&age<45000)return {label:'Live GPS',live:true};
 return {label:updatedAt?'GPS update delayed':'Waiting for GPS',live:false};
}
