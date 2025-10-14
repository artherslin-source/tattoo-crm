"use client";

import { useState, useEffect } from "react";
import { getJsonWithAuth, getUserRole, getUserBranchId } from "@/lib/api";
import { getUniqueBranches, sortBranchesByName } from "@/lib/branch-utils";

interface Branch {
  id: string;
  name: string;
  address: string;
  _count: {
    users: number;
    artists: number;
    orders: number;
    appointments: number;
  };
  [key: string]: unknown;
}

interface BranchSelectorProps {
  selectedBranchId?: string;
  onBranchChange: (branchId: string) => void;
}

export default function BranchSelector({ selectedBranchId, onBranchChange }: BranchSelectorProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBranches() {
      try {
        const data = await getJsonWithAuth<Branch[]>('/branches');
        const uniqueBranches = sortBranchesByName(getUniqueBranches<Branch>(data));
        setBranches(uniqueBranches);
        
        // 如果沒有選中的分店，且用戶有分店 ID，自動選擇
        if (!selectedBranchId) {
          const userBranchId = getUserBranchId();
          if (userBranchId) {
            onBranchChange(userBranchId);
          }
        }
      } catch (err) {
        setError('無法載入分店資料');
        console.error('Failed to fetch branches:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchBranches();
  }, [selectedBranchId, onBranchChange]);

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-600">載入分店中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (branches.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        暫無分店資料
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <label htmlFor="branch-select" className="text-sm font-medium text-gray-700">
        分店：
      </label>
      <select
        id="branch-select"
        value={selectedBranchId || ''}
        onChange={(e) => onBranchChange(e.target.value)}
        className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">選擇分店</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name} ({branch._count.users} 用戶, {branch._count.appointments} 預約)
          </option>
        ))}
      </select>
    </div>
  );
}
