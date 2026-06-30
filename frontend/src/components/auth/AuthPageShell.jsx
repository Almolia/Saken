export function AuthPageShell({ children }) {
  return (
    <div className="auth-shell flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
      {children}
    </div>
  )
}