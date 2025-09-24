"use client";

import { useRouter } from "next/navigation";
import { clearTokens } from "@/lib/api";

export default function LogoutButton() {
  const router = useRouter();
  function onClick() {
    clearTokens();
    router.push("/login");
  }
  return (
    <button onClick={onClick} className="text-sm underline">
      登出
    </button>
  );
}


