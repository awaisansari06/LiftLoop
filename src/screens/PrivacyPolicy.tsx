import { LegalPage } from "@/components/common/LegalPage";

export default function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="May 2026"
      sections={[
        { t: "1. Information we collect", body: "We collect information you provide when registering: name, university email, phone number, and profile photo. Members offering rides additionally provide licence details, vehicle information, and verification documents." },
        { t: "2. How we use your information", body: "Your data is used to: match rides, verify university affiliation, process payments in development test mode, enable real-time ride tracking, send notifications, and improve our services." },
        { t: "3. Data sharing", body: "We do not sell your data. Information is shared only with: your ride partner (limited profile info), Razorpay or Stripe when its test integration is enabled, and university administration if required for safety investigations." },
        { t: "4. Location data", body: "Live location is collected only during active rides for tracking. Members offering rides share location while a ride is in progress. You can disable location sharing at any time." },
        { t: "5. Data security", body: "All data is encrypted in transit (TLS) and at rest. We use Supabase with Row Level Security (RLS) so members can only access their own data." },
        { t: "6. Your rights", body: "You may request data deletion by contacting us. You can update your profile information at any time from settings." },
        { t: "7. Contact", body: "For privacy concerns, email privacy@liftloop.in or contact the IT helpdesk at JC Bose University of Science & Technology, YMCA, Faridabad." },
      ]}
    />
  );
}
