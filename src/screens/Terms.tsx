import { LegalPage } from "@/components/common/LegalPage";

export default function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="May 2026"
      sections={[
        { t: "1. Eligibility", body: "LiftLoop is exclusively for students, faculty, and staff of JC Bose University of Science & Technology, YMCA, Faridabad. You must have a valid @jcboseust.ac.in email to register." },
        { t: "2. Account responsibilities", body: "You are responsible for maintaining the confidentiality of your account. Sharing accounts or credentials is prohibited. Report unauthorized access immediately." },
        { t: "3. Offering rides", body: "Members offering rides must hold a valid driving licence, vehicle registration, and insurance. All documents must be verified through our platform before offering rides." },
        { t: "4. Ride conduct", body: "Everyone must maintain respectful behaviour during rides. Harassment, discrimination, or any misconduct will result in immediate account suspension." },
        { t: "5. Payments", body: "Checkout currently runs in development test mode. Simulated payments do not move real money. The fare is shown before a test booking is confirmed." },
        { t: "6. Safety", body: "Everyone agrees to use the SOS feature responsibly. False emergency reports may result in account termination. We share ride details with emergency contacts when SOS is activated." },
        { t: "7. Liability", body: "LiftLoop facilitates connections between members. We are not a transportation company and are not liable for incidents during rides. Members participate at their own risk." },
        { t: "8. Modifications", body: "We may modify these terms at any time. Continued use of the platform constitutes acceptance of the updated terms." },
      ]}
    />
  );
}
