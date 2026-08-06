'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getEmergencyResources } from '@/lib/api/endpoints'
import { qk } from '@/lib/query/keys'
import type { EmergencyResource, UserProfile } from '@/lib/api/types'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

const GROUP_ORDER: EmergencyResource['resourceType'][] = ['HOTLINE', 'WEBSITE', 'CLINIC']

const GROUP_LABELS: Record<EmergencyResource['resourceType'], string> = {
  HOTLINE: 'Hotlines',
  WEBSITE: 'Websites',
  CLINIC: 'Clinics',
}

function ResourceRow({ resource }: { resource: EmergencyResource }) {
  if (resource.resourceType === 'HOTLINE') {
    return (
      <a
        href={`tel:${resource.contactInfo}`}
        className="flex items-center justify-between gap-4 rounded-2xl bg-fir-deep px-4 py-3.5 text-oat
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold"
      >
        <span className="min-w-0">
          <span className="block text-[15px] font-medium">{resource.name}</span>
          <span className="block text-[13px] opacity-75">{resource.contactInfo}</span>
        </span>
        <span className="flex-none font-display text-[15px] font-bold text-marigold">Call</span>
      </a>
    )
  }
  if (resource.resourceType === 'WEBSITE') {
    return (
      <a
        href={resource.contactInfo}
        target="_blank"
        rel="noopener"
        className="block rounded-2xl bg-card px-4 py-3.5
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir"
      >
        <span className="block text-[15px] font-medium">{resource.name}</span>
        <span className="block text-[13px] underline opacity-75">{resource.contactInfo}</span>
      </a>
    )
  }
  return (
    <div className="rounded-2xl bg-card px-4 py-3.5">
      <span className="block text-[15px] font-medium">{resource.name}</span>
      <span className="block select-text text-[13px] opacity-75">{resource.contactInfo}</span>
    </div>
  )
}

function ResourcesList({ resources }: { resources: EmergencyResource[] }) {
  const active = resources.filter(r => r.active !== false)
  return (
    <div className="flex flex-col gap-5">
      {GROUP_ORDER.map(type => {
        const rows = active.filter(r => r.resourceType === type)
        if (rows.length === 0) return null
        return (
          <div key={type} className="flex flex-col gap-2">
            <p className="text-sm font-medium opacity-60">{GROUP_LABELS[type]}</p>
            <div className="flex flex-col gap-2">
              {rows.map(r => <ResourceRow key={r.id} resource={r} />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ResourcesBody() {
  const resources = useQuery({
    queryKey: qk.resources,
    queryFn: getEmergencyResources,
    staleTime: Infinity,
    placeholderData: previous => previous,
  })

  if (resources.data) return <ResourcesList resources={resources.data} />

  if (resources.isLoading) return <Skeleton lines={4} />

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[15px]">Could not load resources. Retry.</p>
      <p className="text-sm opacity-70">If you are in immediate danger, call your local emergency number.</p>
      <Button type="button" variant="ghost" onClick={() => void resources.refetch()}>
        Retry
      </Button>
    </div>
  )
}

export function Lifeline() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const profile = queryClient.getQueryData<UserProfile>(qk.profile)
  const title = profile?.country ? `Right now, ${profile.country}` : 'Emergency resources'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-2xl border-[1.5px] border-marigold bg-[#FBF7EC]
          px-4 py-3 text-left text-[13.5px]
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir"
      >
        <span className="opacity-80">Need support right now?</span>
        <span className="font-medium underline underline-offset-4">Emergency resources</span>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={title}>
        <ResourcesBody />
      </Sheet>
    </>
  )
}
