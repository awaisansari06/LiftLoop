import {readFileSync,appendFileSync,existsSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import webpush from 'web-push';
const file='.env.local';const text=existsSync(file)?readFileSync(file,'utf8'):'';
if(/^NEXT_PUBLIC_VAPID_PUBLIC_KEY=.+/m.test(text)||/^VAPID_PRIVATE_KEY=.+/m.test(text)) {
 console.log('Existing VAPID keys preserved. Configure missing values manually; do not rotate keys for subscribed browsers.');
}else{
 const keys=webpush.generateVAPIDKeys();
 appendFileSync(file,`\n# Passenger journey Web Push (server secrets stay in this ignored file)\nNEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}\nVAPID_SUBJECT=https://liftloop-v1.vercel.app\nJOURNEY_DISPATCH_SECRET=${randomBytes(32).toString('hex')}\n`);
 console.log('Web Push keys and dispatch secret saved to .env.local. No secrets were printed. Restart Next.js.');
}
