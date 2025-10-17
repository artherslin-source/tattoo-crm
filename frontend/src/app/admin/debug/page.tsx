"use client";

import { useEffect, useState } from "react";
import { getAccessToken, getUserRole } from "@/lib/api";

export default function DebugPage() {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = getAccessToken();
    const userRole = getUserRole();
    
    setToken(accessToken);
    setRole(userRole);
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Information</h1>
      <div className="space-y-4">
        <div>
          <strong>Access Token:</strong> {token ? "Present" : "Missing"}
          {token && (
            <div className="mt-2 text-sm text-text-muted-light break-all">
              {token}
            </div>
          )}
        </div>
        <div>
          <strong>User Role:</strong> {role || "None"}
        </div>
        <div>
          <strong>Local Storage:</strong>
          <pre className="mt-2 text-sm bg-gray-100 p-2 rounded">
            {typeof window !== 'undefined' ? JSON.stringify({
              accessToken: localStorage.getItem('accessToken'),
              refreshToken: localStorage.getItem('refreshToken'),
              userRole: localStorage.getItem('userRole'),
              userBranchId: localStorage.getItem('userBranchId'),
            }, null, 2) : 'Server-side rendering'}
          </pre>
        </div>
      </div>
    </div>
  );
}
