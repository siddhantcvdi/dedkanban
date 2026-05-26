"use client";

export function SignInPage({ signingIn, onSignIn }: { signingIn: boolean; onSignIn: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F2F0E3] dark:bg-[#1f1f1f] px-4">
      <div className="w-full max-w-sm rounded-2xl bg-[#E6E4D7] dark:bg-[#282828] border border-[#DDD9C8] dark:border-[#313131] shadow-xl p-8 flex flex-col items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F76F53] to-[#c94523] flex items-center justify-center shadow-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <rect x="3" y="3" width="7" height="18" rx="1" />
              <rect x="14" y="3" width="7" height="11" rx="1" />
            </svg>
          </div>
          <span className="text-lg font-bold text-[#2C2A22] dark:text-[#e5e2db] tracking-tight">DedKanban</span>
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-[#3D3A30] dark:text-[#ccc8c0]">Welcome back</p>
          <p className="text-xs text-[#9C9888] dark:text-[#5e5a55]">Sign in to access your boards</p>
        </div>
        <button
          onClick={onSignIn}
          disabled={signingIn}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-[#313131] border border-[#DDD9C8] dark:border-[#3a3a3a] text-sm font-semibold text-[#3D3A30] dark:text-[#ccc8c0] hover:bg-[#fafaf8] dark:hover:bg-[#3a3a3a] hover:border-[#F76F53] dark:hover:border-[#F76F53]/60 transition-all shadow-sm disabled:opacity-50"
        >
          {signingIn ? (
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          {signingIn ? "Redirecting…" : "Continue with Google"}
        </button>
      </div>
    </div>
  );
}
