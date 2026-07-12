"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <button className="button secondary" onClick={handleSignOut} type="button">
      <LogOut aria-hidden="true" size={16} />
      Sign out
    </button>
  );
}
