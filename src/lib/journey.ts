import type { GeoLocation } from '../types/index.ts';

export type JourneyStatus = 'waiting' | 'approaching' | 'arrived' | 'onboard' | 'dropped_off' | 'no_show' | 'cancelled';
export interface PassengerJourney {
  booking_id: string; ride_id: string; rider_id: string; driver_id: string;
  passenger_name: string; pickup: GeoLocation; dropoff: GeoLocation; landmark: string;
  pickup_order: number; dropoff_order: number; status: JourneyStatus; ready_at: string | null;
  arrived_at: string | null; boarded_at: string | null; dropped_off_at: string | null;
  eta_at: string | null; eta_updated_at: string | null; seats: number;
  phone?: string | null;
}
export interface JourneyStop { bookingId: string; kind: 'pickup' | 'dropoff'; location: GeoLocation; passenger: PassengerJourney }
export interface JourneySnapshot {
  passengers: PassengerJourney[]; pin: string | null;
  vehicle: { vehicle_number: string; vehicle_model: string; vehicle_color: string } | null;
  delay_until: string | null;
  driver: {full_name:string|null;phone:string|null} | null;
}
export const journeyLabels: Record<JourneyStatus, string> = {
  waiting: 'Waiting for pickup', approaching: 'Driver nearby', arrived: 'Driver at pickup',
  onboard: 'Onboard', dropped_off: 'Dropped off', no_show: 'Missed pickup', cancelled: 'Cancelled',
};
export function orderedStops(passengers: PassengerJourney[]): JourneyStop[] {
  const pickups = passengers.filter(p => ['waiting', 'approaching', 'arrived'].includes(p.status))
    .sort((a,b) => a.pickup_order-b.pickup_order || a.booking_id.localeCompare(b.booking_id))
    .map(p => ({bookingId:p.booking_id,kind:'pickup' as const,location:p.pickup,passenger:p}));
  // A passenger still waiting will also need a drop-off after being collected.
  const drops = passengers.filter(p => !['dropped_off','no_show','cancelled'].includes(p.status))
    .sort((a,b) => a.dropoff_order-b.dropoff_order || a.booking_id.localeCompare(b.booking_id))
    .map(p => ({bookingId:p.booking_id,kind:'dropoff' as const,location:p.dropoff,passenger:p}));
  return [...pickups,...drops];
}
export function distanceKm(a: GeoLocation,b: GeoLocation) {
  const radians=(n:number)=>n*Math.PI/180;
  const h=Math.sin(radians(b.lat-a.lat)/2)**2+Math.cos(radians(a.lat))*Math.cos(radians(b.lat))*Math.sin(radians(b.lng-a.lng)/2)**2;
  return 6371*2*Math.asin(Math.min(1,Math.sqrt(h)));
}
export function etaText(passenger: PassengerJourney, now=Date.now()) {
  if (!passenger.eta_at || !passenger.eta_updated_at || now-Date.parse(passenger.eta_updated_at)>90000) return 'Waiting for an updated ETA';
  return `About ${Math.max(1,Math.ceil((Date.parse(passenger.eta_at)-now)/60000))} min to ${passenger.status==='onboard'?'drop-off':'pickup'}`;
}
export function cancellationPolicy(booking: {status:string;payment_status:string;payment_provider?:string;total_price:number|null},ride?: {status:string;departure_time:string},now=Date.now()) {
  const allowed=!!ride && ride.status==='active' && Date.parse(ride.departure_time)>now && ['pending','confirmed'].includes(booking.status);
  const automatic=booking.payment_status!=='paid'||['simulated','razorpay_test'].includes(booking.payment_provider||'');
  return {allowed:allowed&&automatic,refund:booking.payment_status==='paid'?Number(booking.total_price||0):0,
    reason:!allowed?'Online cancellation closes at departure or when the driver leaves. Contact support for help.':!automatic?'Contact support to cancel and refund this payment.':'Cancel before departure for a full refund. Your seat will be released.'};
}
