import AdminVerifications from "@/components/AdminVerifications";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
export default function AdminVerificationDashboard() {
  return <main className="mx-auto max-w-6xl px-4 py-16 space-y-6"><Helmet><title>DTT Creator Verifications</title><meta name="robots" content="noindex,nofollow" /></Helmet><Button variant="outline" asChild><Link to="/admin-portal">BACK TO ADMIN</Link></Button><AdminVerifications /></main>;
}