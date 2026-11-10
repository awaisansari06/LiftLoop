import {resolveStoredFiles} from './storage';
import {journeyAction} from './journey-api';
import { supabase } from './supabase';
import type { Ride, Booking, Review, Notification, DriverVerification, SOSAlert, GeoLocation, Message } from '../types';

// ============= AUTO-CLEANUP PAST RIDES =============
/** Automatically mark any active rides past their departure time as 'completed' */
export async function cleanupPastRides(): Promise<number> {
  // Departure is not completion. Only an explicit driver action completes a ride.
  return 0;
}

// ============= RIDES =============
export async function createRide(ride: {
  driver_id: string;
  from_location: GeoLocation;
  to_location: GeoLocation;
  departure_time: string;
  seats_available: number;
  price_per_seat: number;
  route_polyline?: string;
}): Promise<Ride> {
  const { data, error } = await supabase
    .from('rides')
    .insert(ride)
    .select()
    .single();
  if (error) throw error;
  return await resolveStoredFiles(data);
}

export async function getRides(filters?: {
  status?: string;
  from_date?: string;
  to_date?: string;
  driver_id?: string;
}): Promise<Ride[]> {
  let query = supabase
    .from('rides')
    .select('*, driver:users!driver_id(*)')
    .order('departure_time', { ascending: true });

  if (filters?.status) query = query.eq('status', filters.status);
  
  if (filters?.from_date) {
    query = query.gte('departure_time', filters.from_date);
  } else {
    // Hide past rides by default in all views
    query = query.gte('departure_time', new Date().toISOString());
  }

  if (filters?.to_date) query = query.lte('departure_time', filters.to_date);
  if (filters?.driver_id) query = query.eq('driver_id', filters.driver_id);

  const { data, error } = await query;
  if (error) throw error;
  return await resolveStoredFiles(data || []);
}

export async function getRideById(id: string): Promise<Ride | null> {
  const { data, error } = await supabase
    .from('rides')
    .select('*, driver:users!driver_id(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return await resolveStoredFiles(data);
}

export async function updateRide(id: string, updates: Partial<Ride>): Promise<Ride> {
  if (updates.status) {
    await journeyAction(id,({in_progress:'start',completed:'finish',cancelled:'cancel'} as Record<string,string>)[updates.status]||'invalid');
    const ride=await getRideById(id);
    if(!ride)throw new Error('Ride updated, but could not reload it.');
    return ride;
  }
  const { data, error } = await supabase
    .from('rides')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return await resolveStoredFiles(data);
}

export async function deleteRide(id: string): Promise<void> {
  await updateRide(id, {status:'cancelled'});
}

export async function getDriverBookingRequests(driverId: string): Promise<Booking[]> {
  // Get all bookings for rides where this user is the driver
  const { data: rides, error: ridesError } = await supabase.from('rides').select('id').eq('driver_id', driverId);
  if (ridesError) throw ridesError;
  if (!rides || rides.length === 0) return [];
  const rideIds = rides.map(r => r.id);
  const { data, error } = await supabase
    .from('bookings')
    .select('*, ride:rides(*, driver:users!driver_id(*)), rider:users!rider_id(*)')
    .in('ride_id', rideIds)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return await resolveStoredFiles(data || []);
}

// ============= BOOKINGS =============
export async function createBooking(booking: {
  ride_id: string;
  rider_id: string;
  seats_booked: number;
  total_price: number;
  payment_status?: string;
  payment_id?: string;
}): Promise<Booking> {
  const { data, error } = await supabase
    .from('bookings')
    .insert(booking)
    .select()
    .single();
  if (error) throw error;
  return await resolveStoredFiles(data);
}

export async function getBookings(userId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, ride:rides(*, driver:users!driver_id(*)), journey:passenger_journeys(*)')
    .eq('rider_id', userId)
    .order('created_at', { ascending: false });
  if (error?.code==='PGRST200') {
    const legacy=await supabase.from('bookings').select('*, ride:rides(*, driver:users!driver_id(*))').eq('rider_id',userId).order('created_at',{ascending:false});
    if(legacy.error)throw legacy.error;
    return await resolveStoredFiles(legacy.data||[]);
  }
  if (error) throw error;
  return await resolveStoredFiles(data || []);
}

export async function updateBooking(id: string, updates: Partial<Booking>): Promise<Booking> {
  const { data, error } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return await resolveStoredFiles(data);
}

// ============= REVIEWS =============
export async function createReview(review: {
  ride_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment?: string;
}): Promise<Review> {
  const { data, error } = await supabase
    .from('reviews')
    .insert(review)
    .select()
    .single();
  if (error) throw error;
  return await resolveStoredFiles(data);
}

export async function getReviewsForUser(userId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, reviewer:users!reviewer_id(*)')
    .eq('reviewee_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return await resolveStoredFiles(data || []);
}

// ============= NOTIFICATIONS =============
export async function getNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return await resolveStoredFiles(data || []);
}

export async function markNotificationRead(id: string): Promise<void> {
  const {error}=await supabase.from('notifications').update({ read: true }).eq('id', id);
  if(error)throw error;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const {error}=await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
  if(error)throw error;
}

// ============= DRIVER VERIFICATION =============
export async function submitVerification(verification: {
  user_id: string;
  license_number: string;
  license_photo?: string;
  vehicle_type?: string;
  vehicle_number?: string;
  vehicle_model?: string;
  vehicle_color?: string;
  vehicle_photo?: string;
  vehicle_docs?: string[];
  id_card_photo?: string;
  college_id?: string;
}): Promise<DriverVerification> {
  const { data, error } = await supabase
    .from('driver_verification')
    .upsert({
      ...verification,
      verification_status: 'pending',
      submitted_at: new Date().toISOString(),
      rejection_reason: null,
    }, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) throw error;
  return await resolveStoredFiles(data);
}

export async function getVerification(userId: string): Promise<DriverVerification | null> {
  const { data } = await supabase
    .from('driver_verification')
    .select('*')
    .eq('user_id', userId)
    .single();
  return await resolveStoredFiles(data);
}

export async function getPendingVerifications(): Promise<(DriverVerification & { user: any })[]> {
  const { data, error } = await supabase
    .from('driver_verification')
    .select('*, user:users!user_id(*)')
    .eq('verification_status', 'pending')
    .order('id', { ascending: true });
  if (error) throw error;
  return await resolveStoredFiles(data || []);
}

// ============= LIVE LOCATION =============
export async function updateLiveLocation(
  rideId: string,
  driverId: string,
  location: GeoLocation,
  speed: number | null
): Promise<void> {
  const { error } = await supabase
    .from('live_locations')
    .upsert({
      ride_id: rideId,
      driver_id: driverId,
      location,
      speed,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'ride_id' });
  if (error) throw error;
}

export async function getLiveLocation(rideId: string) {
  const { data } = await supabase
    .from('live_locations')
    .select('*')
    .eq('ride_id', rideId)
    .single();
  return await resolveStoredFiles(data);
}

// ============= SOS =============
export async function createSOSAlert(alert: {
  user_id: string;
  ride_id: string;
  location: GeoLocation | null;
  message?: string;
}): Promise<SOSAlert> {
  const { data, error } = await supabase
    .from('sos_alerts')
    .insert(alert)
    .select()
    .single();
  if (error) throw error;
  return await resolveStoredFiles(data);
}

export async function getActiveSOSAlerts(): Promise<SOSAlert[]> {
  const { data, error } = await supabase
    .from('sos_alerts')
    .select('*, user:users!user_id(*), ride:rides(*)')
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return await resolveStoredFiles(data || []);
}

// ============= MESSAGES =============
export async function sendMessage(msg: {
  ride_id: string;
  sender_id: string;
  message: string;
  attachment_url?: string;
}): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert(msg)
    .select('*, sender:users!sender_id(*)')
    .single();
  if (error) throw error;
  return await resolveStoredFiles(data);
}

export async function getMessages(rideId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:users!sender_id(*)')
    .eq('ride_id', rideId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return await resolveStoredFiles(data || []);
}

// ============= ADMIN =============
export async function getAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return await resolveStoredFiles(data || []);
}

export async function banUser(userId: string, reason: string, adminId: string) {
  const { error: banError } = await supabase.from('banned_users').insert({
    user_id: userId,
    reason,
    banned_by: adminId,
  });
  if (banError) throw banError;

  await supabase.from('admin_logs').insert({
    admin_id: adminId,
    action: 'ban_user',
    target_user_id: userId,
    details: { reason },
  });
}

export async function resolveSOSAlert(alertId: string, adminId: string) {
  const { error } = await supabase.from('sos_alerts').update({ status: 'resolved' }).eq('id', alertId);
  if (error) throw error;
  await supabase.from('admin_logs').insert({
    admin_id: adminId,
    action: 'resolve_sos',
    target_user_id: null,
    details: { alert_id: alertId },
  });
}

export async function updateVerificationStatus(verifId: string, status: 'verified' | 'rejected', adminId: string, rejectionReason?: string) {
  const { error } = await supabase.from('driver_verification').update({ 
    verification_status: status,
    verified_by: adminId,
    verified_at: new Date().toISOString(),
    rejection_reason: status === 'rejected' ? (rejectionReason || 'No reason provided') : null,
  }).eq('id', verifId);
  if (error) throw error;
  await supabase.from('admin_logs').insert({
    admin_id: adminId,
    action: `verify_driver_${status}`,
    target_user_id: null,
    details: { verification_id: verifId, reason: rejectionReason },
  });
}

export async function unbanUser(userId: string, adminId: string) {
  await supabase.from('banned_users').delete().eq('user_id', userId);
  await supabase.from('admin_logs').insert({
    admin_id: adminId,
    action: 'unban_user',
    target_user_id: userId,
  });
}

export async function getAdminStats() {
  const [usersRes, ridesRes, bookingsRes, pendingRes, sosRes] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('rides').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('bookings').select('total_price').eq('payment_status', 'paid'),
    supabase.from('driver_verification').select('id', { count: 'exact', head: true }).eq('verification_status', 'pending'),
    supabase.from('sos_alerts').select('id', { count: 'exact', head: true }).eq('status', 'active'),
  ]);

  const revenue = (bookingsRes.data || []).reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);

  return {
    totalUsers: usersRes.count || 0,
    activeRides: ridesRes.count || 0,
    totalRevenue: revenue,
    pendingVerifications: pendingRes.count || 0,
    activeAlerts: sosRes.count || 0,
  };
}

// ============= ADVANCED ADMIN ANALYTICS =============
export interface AdminAnalytics {
  unavailable_tables?: string[];
  kpi: {
    total_users: number; students: number; drivers: number; admins: number;
    active_rides: number; completed_rides: number; cancelled_rides: number;
    total_bookings: number; paid_bookings: number; total_revenue: number;
    pending_verifications: number; active_alerts: number; open_reports: number;
    open_support: number; banned: number; avg_rating: number; total_reviews: number;
  };
  series: { day: string; rides: number; bookings: number; users: number; revenue: number }[];
  top_routes: { from_label: string; to_label: string; ride_count: number }[];
}

export async function getAdminAnalytics(): Promise<AdminAnalytics | null> {
  const { data, error } = await supabase.rpc('admin_analytics');
  if (error) { console.error('admin_analytics rpc', error); return null; }
  return data as AdminAnalytics;
}

export interface UserStats {
  total_bookings: number; total_rides_offered: number;
  total_spent: number; total_earned: number;
  avg_rating: number; ratings_count: number;
  last_ride_at: string | null; last_booking_at: string | null;
}
export async function getUserStats(userId: string): Promise<UserStats | null> {
  const { data, error } = await supabase.rpc('user_stats', { target: userId });
  if (error) return null;
  return data as UserStats;
}

// ============= SAVED ROUTES =============
export interface SavedRoute {
  id: string; user_id: string; label: string | null;
  from_location: GeoLocation; to_location: GeoLocation; created_at: string;
}
export async function getSavedRoutes(userId: string): Promise<SavedRoute[]> {
  const { data, error } = await supabase.from('saved_routes')
    .select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10);
  if (error) return [];
  return await resolveStoredFiles(data || []);
}
export async function saveRoute(userId: string, from: GeoLocation, to: GeoLocation, label?: string) {
  const { error } = await supabase.from('saved_routes').insert({ user_id: userId, from_location: from, to_location: to, label });
  if (error) throw error;
}
export async function deleteSavedRoute(id: string) {
  await supabase.from('saved_routes').delete().eq('id', id);
}

// ============= ANNOUNCEMENTS =============
export interface Announcement {
  id: string; title: string; body: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
  audience: 'all' | 'students' | 'drivers' | 'admins';
  created_at: string; active: boolean;
}
export async function getAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase.from('announcements')
    .select('*').eq('active', true).order('created_at', { ascending: false }).limit(20);
  if (error) return [];
  return await resolveStoredFiles(data || []);
}
export async function createAnnouncement(a: { title: string; body: string; severity?: string; audience?: string; }, adminId: string) {
  const { error } = await supabase.from('announcements').insert({ ...a, created_by: adminId });
  if (error) throw error;
  await supabase.from('admin_logs').insert({ admin_id: adminId, action: 'create_announcement', target_user_id: null, details: a });
}
export async function deactivateAnnouncement(id: string, adminId: string) {
  await supabase.from('announcements').update({ active: false }).eq('id', id);
  await supabase.from('admin_logs').insert({ admin_id: adminId, action: 'deactivate_announcement', target_user_id: null, details: { id } });
}

// ============= RIDE REPORTS =============
export async function reportRide(payload: { ride_id: string; reporter_id: string; reported_user_id?: string; reason: string }) {
  const { error } = await supabase.from('ride_reports').insert(payload);
  if (error) throw error;
}
export async function getOpenReports() {
  const { data, error } = await supabase.from('ride_reports')
    .select('*, reporter:users!reporter_id(id, full_name, email), reported:users!reported_user_id(id, full_name, email), ride:rides(id, from_location, to_location, departure_time)')
    .eq('status', 'open').order('created_at', { ascending: false });
  if (error) return [];
  return await resolveStoredFiles(data || []);
}
export async function resolveReport(id: string, adminId: string, status: 'reviewed' | 'dismissed' | 'action_taken') {
  await supabase.from('ride_reports').update({ status }).eq('id', id);
  await supabase.from('admin_logs').insert({ admin_id: adminId, action: `report_${status}`, target_user_id: null, details: { id } });
}

// ============= SUPPORT INBOX (Admin) =============
export async function getSupportThreads() {
  const { data, error } = await supabase.from('support_messages')
    .select('*, user:users!user_id(id, full_name, email, profile_photo)')
    .order('created_at', { ascending: false }).limit(200);
  if (error) return [];
  return await resolveStoredFiles(data || []);
}
export async function replySupport(userId: string, adminId: string, message: string, attachment_url?: string) {
  const { error } = await supabase.from('support_messages').insert({
    user_id: userId, admin_id: adminId, message, sender_type: 'admin', is_read: false, attachment_url
  });
  if (error) throw error;
}
export async function markSupportRead(userId: string) {
  await supabase.from('support_messages').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
}
export async function sendSupportMessage(userId: string, message: string, attachment_url?: string) {
  const { error } = await supabase.from('support_messages').insert({
    user_id: userId, message, sender_type: 'user', is_read: false, attachment_url
  });
  if (error) throw error;
}
export async function getSupportForUser(userId: string) {
  const { data, error } = await supabase.from('support_messages')
    .select('*').eq('user_id', userId).order('created_at', { ascending: true });
  if (error) return [];
  return await resolveStoredFiles(data || []);
}

// ============= USERS (Admin) =============
export async function searchUsers(q: string) {
  let query = supabase.from('users').select('*').order('created_at', { ascending: false }).limit(100);
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return [];
  return await resolveStoredFiles(data || []);
}
export async function getBannedUsers() {
  const { data, error } = await supabase.from('banned_users')
    .select('*, user:users!user_id(id, full_name, email, profile_photo)')
    .order('banned_at', { ascending: false });
  if (error) return [];
  return await resolveStoredFiles(data || []);
}

// ============= AUDIT LOGS =============
export async function getAdminLogs(limit = 100) {
  const { data, error } = await supabase.from('admin_logs')
    .select('*, admin:users!admin_id(id, full_name, email)')
    .order('created_at', { ascending: false }).limit(limit);
  if (error) return [];
  return await resolveStoredFiles(data || []);
}

// ============= ALL RIDES (Admin) =============
export async function getAllRidesAdmin(status?: string, limit = 100) {
  let q = supabase.from('rides')
    .select('*, driver:users!driver_id(id, full_name, email, profile_photo)')
    .order('departure_time', { ascending: false }).limit(limit);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) return [];
  return await resolveStoredFiles(data || []);
}

export async function forceCancelRide(rideId: string, adminId: string, reason: string) {
  await updateRide(rideId, {status:'cancelled'});
  const {error} = await supabase.from('admin_logs').insert({admin_id:adminId, action:'force_cancel_ride', details:{ride_id:rideId,reason}});
  if(error) throw error;
}
