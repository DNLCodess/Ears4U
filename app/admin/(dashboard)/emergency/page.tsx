'use client'
import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getAdminEmergencyDashboard, deleteAdminEmergencyResource } from '@/lib/api/admin/endpoints'
import { adminQk } from '@/lib/query/admin-keys'
import { errorMessage } from '@/lib/api/errors'
import type { AdminEmergencyDashboard, AdminEmergencyResource } from '@/lib/api/admin/types'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { Button } from '@/components/ui/button'
import { AdminEmergencyResourceSheet } from '@/components/admin/emergency-resource-sheet'

const SUMMARY_LABELS: { key: keyof Omit<AdminEmergencyDashboard, 'resources'>; label: string }[] = [
  { key: 'totalHotlines', label: 'Hotlines' },
  { key: 'totalWebsites', label: 'Websites' },
  { key: 'totalClinics', label: 'Clinics' },
  { key: 'activeCountriesCount', label: 'Active countries' },
]

// `text-marigold`/`text-marigold-deep` both fail a 3:1 contrast check against the card
// background (marigold is an inherently light, low-contrast hue) - the established fallback
// elsewhere in the codebase for text that needs to sit on a marigold surface is `text-fir-deep`
// (see the notification-count badge in app/(app)/home/page.tsx and the CTA gradients in
// components/shell/tab-bar.tsx), which passes comfortably. Reused here instead of shipping a
// low-contrast label.
const TYPE_BADGE: Record<AdminEmergencyResource['resourceType'], { label: string; className: string }> = {
  HOTLINE: { label: 'Hotline', className: 'bg-marigold/15 text-fir-deep' },
  WEBSITE: { label: 'Website', className: 'bg-fir/15 text-fir' },
  CLINIC: { label: 'Clinic', className: 'bg-leaf/15 text-leaf' },
}

function DeleteAction({ resource }: { resource: AdminEmergencyResource }) {
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)

  const mutation = useMutation({
    mutationFn: () => deleteAdminEmergencyResource(resource.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminQk.emergencyDashboard })
      setConfirming(false)
    },
  })

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-2">
        {mutation.isError ? <p role="alert" className="text-sm text-clay">{errorMessage(mutation.error)}</p> : null}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="destructive"
            busy={mutation.isPending}
            aria-label={`Confirm delete ${resource.name}`}
            onClick={() => mutation.mutate()}
          >
            Confirm delete
          </Button>
          <Button type="button" variant="ghost" onClick={() => { mutation.reset(); setConfirming(false) }}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Button type="button" variant="ghost" onClick={() => setConfirming(true)}>
      Delete
    </Button>
  )
}

export default function AdminEmergencyPage() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingResourceId, setEditingResourceId] = useState<number | null>(null)

  const dashboard = useQuery({ queryKey: adminQk.emergencyDashboard, queryFn: getAdminEmergencyDashboard })

  const editingResource = dashboard.data?.resources.find(r => r.id === editingResourceId) ?? null

  const openAdd = () => { setEditingResourceId(null); setSheetOpen(true) }
  const openEdit = (resource: AdminEmergencyResource) => { setEditingResourceId(resource.id); setSheetOpen(true) }

  let content: ReactNode
  if (dashboard.isError) {
    content = <ErrorState error={dashboard.error} retry={() => void dashboard.refetch()} />
  } else if (dashboard.isLoading || !dashboard.data) {
    content = (
      <>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {SUMMARY_LABELS.map(m => (
            <div key={m.key} className="rounded-2xl bg-card px-4 py-3.5">
              <Skeleton lines={2} />
            </div>
          ))}
        </div>
        <div className="rounded-2xl bg-card px-4 py-3.5">
          <Skeleton lines={5} />
        </div>
      </>
    )
  } else {
    const data = dashboard.data
    content = (
      <>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {SUMMARY_LABELS.map(m => (
            <div key={m.key} className="rounded-2xl bg-card px-4 py-3.5">
              <p className="text-xs opacity-60">{m.label}</p>
              <p className="mt-1 font-display text-2xl font-semibold">{data[m.key].toLocaleString()}</p>
            </div>
          ))}
        </div>

        {data.resources.length === 0 ? (
          <div className="rounded-2xl bg-card px-4 py-6 text-center text-sm opacity-55">
            No emergency resources yet. Add one to get started.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-fir/10 rounded-2xl bg-card px-4">
            {data.resources.map(r => (
              <div key={r.id} className="flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[14px] font-medium">{r.name}</p>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${TYPE_BADGE[r.resourceType].className}`}>
                      {TYPE_BADGE[r.resourceType].label}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold
                      ${r.active ? 'bg-leaf/15 text-leaf' : 'bg-fir/10 text-fir'}`}>
                      {r.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="truncate text-xs opacity-55">{r.country} · {r.contactInfo}</p>
                </div>
                <div className="flex flex-none items-center justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => openEdit(r)}>Edit</Button>
                  <DeleteAction resource={r} />
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold">Emergency Resources</h1>
        <Button type="button" onClick={openAdd}>+ Add resource</Button>
      </div>

      {content}

      <AdminEmergencyResourceSheet
        resource={editingResource}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  )
}
