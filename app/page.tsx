/**
 * Root Page - Redirect to login
 *
 * The application has no public landing page.
 * Users are redirected to login to access their respective interface.
 */

import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/login')
}
