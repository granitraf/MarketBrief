import { redirect } from 'next/navigation';

export default function RootDashboardRedirect() {
  redirect('/dashboard');
}
