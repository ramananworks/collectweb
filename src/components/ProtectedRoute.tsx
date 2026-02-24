// AUTH BYPASS FOR DEVELOPMENT — re-enable before production
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
