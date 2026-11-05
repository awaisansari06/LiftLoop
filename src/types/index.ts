// Database types matching Supabase schema
export interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  user_type: 'student' | 'driver' | 'admin' | 'both' | 'pending_admin' | null;
  profile_complete: number;
  profile_photo: string | null;
  created_at: string;
  emergency_contact_phone?: string | null;
  admin_approved?: boolean;
}

export interface DriverVerification {
  id: string;
  user_id: string;
  license_number: string;
  license_photo: string | null;
  vehicle_type: string | null;
  vehicle_number: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  vehicle_photo: string | null;
  vehicle_docs: string[] | null;
  id_card_photo: string | null;
  college_id: string | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  rejection_reason: string | null;
  verified_by: string | null;
  verified_at: string | null;
  submitted_at: string | null;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  address?: string;
}

export interface Ride {
  id: string;
  driver_id: string;
  from_location: GeoLocation;
  to_location: GeoLocation;
  departure_time: string;
  seats_available: number | null;
  price_per_seat: number | null;
  status: 'active' | 'in_progress' | 'completed' | 'cancelled';
  route_polyline: string | null;
  created_at: string;
  // Joined data
  driver?: User;
}

export interface Booking {
  journey?: import('../lib/journey').PassengerJourney | null;
  payment_provider?: 'stripe_test' | 'simulated' | 'razorpay_test';
  id: string;
  ride_id: string;
  rider_id: string;
  seats_booked: number | null;
  total_price: number | null;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_id: string | null;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
  // Joined data
  ride?: Ride;
  rider?: User;
}

export interface LiveLocation {
  id: string;
  ride_id: string;
  driver_id: string;
  location: GeoLocation;
  speed: number | null;
  updated_at: string;
}

export interface SOSAlert {
  id: string;
  user_id: string;
  ride_id: string;
  location: GeoLocation | null;
  message: string | null;
  status: 'active' | 'resolved';
  created_at: string;
  // Joined data
  user?: User;
  ride?: Ride;
}

export interface Review {
  id: string;
  ride_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  // Joined data
  reviewer?: User;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string | null;
  read: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  ride_id: string;
  sender_id: string;
  message: string;
  attachment_url?: string;
  created_at: string;
  sender?: User;
}

export interface AdminLog {
  id: string;
  admin_id: string;
  action: string;
  target_user_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface BannedUser {
  id: string;
  user_id: string;
  reason: string | null;
  banned_by: string | null;
  banned_at: string;
}

