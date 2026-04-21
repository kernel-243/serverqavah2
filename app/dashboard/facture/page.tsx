import { Suspense } from "react"
import { FacturePageClient } from "./facture-page-client"

export default function FacturePage() {
  return (
    <div className="space-y-4">
      <Suspense fallback={<div>Loading...</div>}>
        <FacturePageClient />
      </Suspense>
    </div>
  )
}

