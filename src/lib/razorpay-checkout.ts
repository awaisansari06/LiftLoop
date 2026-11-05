type PaymentResult={razorpay_order_id:string;razorpay_payment_id:string;razorpay_signature:string};
type Options={key:string;order_id:string;amount:number;currency:string;name:string;description:string;handler:(result:PaymentResult)=>void;modal:{ondismiss:()=>void}};
export type PaymentFailure={error?:{code?:string;description?:string;reason?:string;source?:string;step?:string}};
export function paymentFailureMessage(event:PaymentFailure) {
 const error=event?.error;
 const description=error?.description?.trim() || 'Razorpay did not provide a failure description.';
 const details=[error?.code,error?.reason].filter(Boolean).join(' / ');
 return `Test payment failed: ${description}${details ? ` (${details})` : ''}\nYour booking was not confirmed.`;
}
declare global {interface Window {Razorpay?:new(options:Options)=>{open:()=>void;on:(event:string,handler:(failure:PaymentFailure)=>void)=>void}}}
let loading:Promise<void>|undefined;
export function loadRazorpay(){
 if(window.Razorpay)return Promise.resolve();
 if(!loading)loading=new Promise<void>((resolve,reject)=>{
   const script=document.createElement('script');
   const fail=()=>{window.clearTimeout(timer);loading=undefined;script.remove();reject(new Error('Could not load Razorpay. Check your connection and retry.'));};
   const timer=window.setTimeout(fail,20000);
   script.src='https://checkout.razorpay.com/v1/checkout.js';
   script.onload=()=>{if(!window.Razorpay){fail();return;}window.clearTimeout(timer);resolve();};
   script.onerror=fail;
   document.head.appendChild(script);
 });
 return loading;
}
export type {PaymentResult};
