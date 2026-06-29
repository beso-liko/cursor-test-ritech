import ClerkSignInPanel from "@/components/ClerkSignInPanel";
import AuthPageHeader from "@/components/AuthPageHeader";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-6 md:px-8 md:py-8 bg-background">
      <div className="w-full max-w-md">
        <AuthPageHeader />
        <ClerkSignInPanel />
      </div>
    </div>
  );
}
