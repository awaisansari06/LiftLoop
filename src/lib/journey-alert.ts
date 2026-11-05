// A retried push must not tell a passenger to wait for a pickup that already happened.
export function isCurrentJourneyAlert(title:string,status:string|undefined,createdAt:string,now=Date.now()) {
  if(now-Date.parse(createdAt)>5*60000)return false;
  const states:Record<string,string[]>={
    'Your driver is on the way':['waiting','approaching','arrived'],
    'Your driver is nearby':['approaching'],
    'Your driver has arrived':['arrived'],
    'You are next':['waiting','approaching','arrived'],
    'Pickup confirmed':['onboard'],
    'Driver timing update':['waiting','approaching','arrived','onboard'],
  };
  return !states[title]||!!status&&states[title].includes(status);
}
