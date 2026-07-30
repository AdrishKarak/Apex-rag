import { SignIn } from "@clerk/nextjs";
import { AuthLayout } from "@/components/auth-layout";

export default function Page() {
  return (
    <AuthLayout>
      <SignIn
        appearance={{
          variables: {
            colorPrimary: "#4f46e5", // Indigo-600
            colorBackground: "#ffffff",
          },
          elements: {
            card: "border border-zinc-200 bg-white shadow-xl rounded-2xl w-full max-w-md mx-auto p-6",
            headerTitle: "text-zinc-900 font-bold tracking-tight text-xl sm:text-2xl",
            headerSubtitle: "text-zinc-500 text-xs sm:text-sm",
            socialButtonsBlockButton: "bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-800 transition-all font-medium py-2.5 rounded-lg w-full flex items-center justify-center shadow-sm",
            socialButtonsBlockButtonText: "text-zinc-750 text-xs sm:text-sm font-semibold",
            formFieldLabel: "text-zinc-700 font-semibold text-xs sm:text-sm mb-1.5",
            formFieldInput: "bg-white border border-zinc-200 text-zinc-900 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all py-2.5 px-3 rounded-lg text-xs sm:text-sm shadow-sm",
            formButtonPrimary: "bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shadow-sm py-2.5 rounded-lg text-xs sm:text-sm mt-2",
            footerActionLink: "text-indigo-600 hover:text-indigo-700 font-semibold transition-colors text-xs sm:text-sm",
            footerActionText: "text-zinc-500 text-xs sm:text-sm",
            dividerLine: "bg-zinc-200",
            dividerText: "text-zinc-400 text-xs font-semibold",
            formResendCodeLink: "text-indigo-600 hover:text-indigo-700",
            identityPreviewText: "text-zinc-850 text-xs sm:text-sm",
            identityPreviewEditButtonIcon: "text-zinc-500 hover:text-zinc-700",
            formHeaderTitle: "text-zinc-900 font-semibold text-lg",
            formHeaderSubtitle: "text-zinc-500 text-xs",
            alertText: "text-red-600 text-xs sm:text-sm",
            alert: "bg-red-50 border border-red-200 rounded-lg p-3",
          }
        }}
      />
    </AuthLayout>
  );
}