self.addEventListener('push',event=>{
  let data;try{data=event.data.json();}catch{return;}
  event.waitUntil(self.registration.showNotification(data.title||'LiftLoop',{body:data.body,icon:'/icon-192.png',badge:'/icon-192.png',tag:data.tag,data:{url:data.url}}));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const url=new URL(event.notification.data?.url||'/bookings',self.location.origin);
  if(url.origin!==self.location.origin)return;
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{
    for(const client of windows)if('focus' in client){await client.navigate(url.href);return client.focus();}
    return clients.openWindow(url.href);
  }));
});
