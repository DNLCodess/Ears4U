// components/admin/emergency-resource-sheet.tsx
'use client'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createAdminEmergencyResource, updateAdminEmergencyResource } from '@/lib/api/admin/endpoints'
import { adminQk } from '@/lib/query/admin-keys'
import { errorMessage } from '@/lib/api/errors'
import type { AdminEmergencyResource, AdminEmergencyResourceInput } from '@/lib/api/admin/types'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Toggle } from '@/components/ui/toggle'

const TYPE_OPTIONS: { value: AdminEmergencyResourceInput['resourceType']; label: string }[] = [
  { value: 'HOTLINE', label: 'Hotline' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'CLINIC', label: 'Clinic' },
]

const EMPTY_FORM: AdminEmergencyResourceInput = {
  name: '', country: '', resourceType: 'HOTLINE', contactInfo: '', active: true,
}

// Builds the form's input state from a resource, dropping `id`. `resource` is
// structurally assignable to `AdminEmergencyResourceInput` (it just has an
// extra `id` field, which TS's structural typing allows), so assigning it to
// `form` directly would silently carry `id` along into the create/update
// request body. Pick the input fields explicitly instead.
function toInput(resource: AdminEmergencyResource | null): AdminEmergencyResourceInput {
  if (!resource) return EMPTY_FORM
  const { name, country, resourceType, contactInfo, active } = resource
  return { name, country, resourceType, contactInfo, active }
}

export function AdminEmergencyResourceSheet({ resource, open, onClose }: {
  resource: AdminEmergencyResource | null
  open: boolean
  onClose: () => void
}) {
  return (
    <Sheet open={open} onClose={onClose} title={resource ? 'Edit resource' : 'Add resource'}>
      {/* Keyed on the resource's identity (not just presence) so switching which
          resource is being edited - or between edit and create - remounts the
          form and re-derives its initial state, instead of syncing local state
          to a prop via an effect. */}
      <ResourceForm key={resource ? resource.id : 'create'} resource={resource} onClose={onClose} />
    </Sheet>
  )
}

function ResourceForm({ resource, onClose }: {
  resource: AdminEmergencyResource | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<AdminEmergencyResourceInput>(() => toInput(resource))

  const mutation = useMutation({
    mutationFn: () => {
      const payload: AdminEmergencyResourceInput = {
        ...form,
        name: form.name.trim(),
        country: form.country.trim(),
        contactInfo: form.contactInfo.trim(),
      }
      return resource
        ? updateAdminEmergencyResource(resource.id, payload)
        : createAdminEmergencyResource(payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminQk.emergencyDashboard })
      onClose()
    },
  })

  const valid = form.name.trim() !== '' && form.country.trim() !== '' && form.contactInfo.trim() !== ''

  return (
    <form
      onSubmit={e => { e.preventDefault(); if (valid) mutation.mutate() }}
      className="flex flex-col gap-4"
    >
      {mutation.isError ? <p role="alert" className="text-sm text-clay">{errorMessage(mutation.error)}</p> : null}
      <Field label="Name" required value={form.name}
        onChange={e => { setForm(f => ({ ...f, name: e.target.value })); mutation.reset() }} />
      <Field label="Country" required value={form.country}
        onChange={e => { setForm(f => ({ ...f, country: e.target.value })); mutation.reset() }} />
      <div>
        <p id="resource-type-label" className="mb-2 text-sm font-semibold opacity-70">Type</p>
        <div aria-labelledby="resource-type-label" className="flex gap-2">
          {TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={form.resourceType === opt.value}
              onClick={() => { setForm(f => ({ ...f, resourceType: opt.value })); mutation.reset() }}
              className={`rounded-full px-3 py-1.5 text-sm transition ${
                form.resourceType === opt.value ? 'bg-fir text-oat' : 'bg-card'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <Field label="Contact info" required value={form.contactInfo}
        onChange={e => { setForm(f => ({ ...f, contactInfo: e.target.value })); mutation.reset() }} />
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold opacity-70">Active</p>
        <Toggle
          label="Active"
          checked={form.active}
          onChange={next => { setForm(f => ({ ...f, active: next })); mutation.reset() }}
        />
      </div>
      <Button type="submit" busy={mutation.isPending} disabled={!valid}>
        {resource ? 'Save changes' : 'Add resource'}
      </Button>
    </form>
  )
}
