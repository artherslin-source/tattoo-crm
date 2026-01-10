"use client";

import useMediaQuery from "@/hooks/useMediaQuery";

// iPad / iPad Pro (CSS width range)
export default function useIsIpad() {
  return useMediaQuery("(min-width: 768px) and (max-width: 1366px)");
}

