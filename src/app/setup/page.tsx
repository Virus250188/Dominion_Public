export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import { SetupWizard } from "@/components/auth/SetupWizard";
import { LoginHero } from "@/components/auth/LoginHero";

export default async function SetupPage() {
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    redirect("/");
  }

  return (
    <>
      {/* Custom setup background — covers animated BG */}
      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_#0c1929_0%,_#060d18_50%,_#020408_100%)]" />

      {/* Subtle ambient glow spots */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2 h-[500px] w-[600px] rounded-full bg-[#1e40af]/8 blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 h-[300px] w-[400px] rounded-full bg-[#0ea5e9]/5 blur-[100px]" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="flex flex-col items-center">
          <LoginHero mode="setup" />

          {/* Glass setup card */}
          <div className="w-full max-w-md">
            <div className="glass-card overflow-hidden">
              <div className="px-8 py-8">
                <SetupWizard />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
