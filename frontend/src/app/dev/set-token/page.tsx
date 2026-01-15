import { Suspense } from "react";
import DevSetTokenClient from "./set-token.client";

// Dev helper route, but must still build in production.
// Force dynamic rendering to avoid prerendering this page.
export const dynamic = "force-dynamic";

export default function DevSetTokenPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-600">載入中…</div>}>
      <DevSetTokenClient />
    </Suspense>
  );
}

