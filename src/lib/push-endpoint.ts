// Push subscriptions are outbound URLs: only known browser push services are accepted.
export function validPushEndpoint(endpoint:string) {
  try {
    const url=new URL(endpoint);
    return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&
      ['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com','notify.windows.com'].some(host=>url.hostname===host||url.hostname.endsWith('.'+host));
  }catch{return false;}
}
