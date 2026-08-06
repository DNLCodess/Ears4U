'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createJournal, deleteJournal, getJournal, updateJournal } from '@/lib/api/endpoints'
import { qk } from '@/lib/query/keys'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet } from '@/components/ui/sheet'

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
      strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden>
      <path d="M15 5 7 12l8 7" />
    </svg>
  )
}

type ConfirmSheet = 'leave' | 'delete' | null

export default function JournalEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const isNew = id === 'new'
  const entryId = isNew ? null : Number(id)

  const router = useRouter()
  const queryClient = useQueryClient()

  const entry = useQuery({
    queryKey: entryId !== null ? qk.journalEntry(entryId) : ['journal', 'new'],
    queryFn: () => getJournal(entryId ?? 0),
    enabled: !isNew,
  })

  const [initialData, setInitialData] = useState<{ title: string; content: string } | null>(
    isNew ? { title: '', content: '' } : null
  )
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [confirmSheet, setConfirmSheet] = useState<ConfirmSheet>(null)

  // Seeds the editor once the fetched entry arrives. This is a render-phase
  // state adjustment (React's documented pattern for syncing state from a
  // query result without an effect: https://react.dev/learn/you-might-not-need-an-effect),
  // guarded so it only fires once - a later background refetch of the same
  // query must not clobber text the user is mid-edit on.
  if (!isNew && entry.data && initialData === null) {
    const seed = { title: entry.data.title ?? '', content: entry.data.content ?? '' }
    setInitialData(seed)
    setTitle(seed.title)
    setContent(seed.content)
  }

  const dirty = initialData !== null && (title !== initialData.title || content !== initialData.content)

  // Browser-level navigation (tab close, reload, URL bar) is covered here;
  // in-app Back is a plain button below so it can be intercepted with a Sheet.
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (!dirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const save = useMutation({
    mutationFn: () => {
      const payload = { title: title.trim(), content }
      return entryId !== null ? updateJournal(entryId, payload) : createJournal(payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.journal })
      if (entryId !== null) void queryClient.invalidateQueries({ queryKey: qk.journalEntry(entryId) })
      router.push('/journal')
    },
  })

  const del = useMutation({
    mutationFn: () => deleteJournal(entryId as number),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.journal })
      router.push('/journal')
    },
  })

  function handleBack() {
    if (dirty) {
      setConfirmSheet('leave')
      return
    }
    router.push('/journal')
  }

  if (!isNew && entry.isError) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-oat px-5 py-10 lg:px-6">
        <ErrorState error={entry.error} retry={() => void entry.refetch()} />
      </div>
    )
  }

  if (!isNew && (initialData === null || entry.isLoading)) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-oat px-5 py-10 lg:px-6">
        <Skeleton lines={6} />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-oat">
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-6 pb-10 pt-5">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Back to journal"
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir"
          >
            <BackIcon />
          </button>
          {dirty ? (
            <Button type="button" busy={save.isPending} onClick={() => save.mutate()}>
              Save
            </Button>
          ) : null}
        </div>

        <div className="mt-4 flex flex-1 flex-col gap-3">
          {save.isError ? <ErrorState error={save.error} retry={() => save.mutate()} /> : null}

          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title, if it wants one"
            className="w-full border-none bg-transparent font-display text-2xl font-semibold outline-none
              placeholder:opacity-40"
          />
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Say it how it actually is."
            className="w-full flex-1 resize-none border-none bg-transparent font-body text-base leading-relaxed
              outline-none placeholder:opacity-40"
          />

          {!isNew ? (
            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={() => setConfirmSheet('delete')}
                className="text-sm text-fir/60 underline underline-offset-4"
              >
                Delete entry
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <Sheet open={confirmSheet === 'leave'} onClose={() => setConfirmSheet(null)} title="Leave without saving?">
        <div className="flex flex-col gap-3">
          <Button type="button" onClick={() => setConfirmSheet(null)}>Keep writing</Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => { setConfirmSheet(null); router.push('/journal') }}
          >
            Discard
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={confirmSheet === 'delete'}
        onClose={() => setConfirmSheet(null)}
        title="Delete this entry? It cannot be brought back."
      >
        <div className="flex flex-col gap-3">
          {del.isError ? <p className="text-sm text-clay">Could not delete. Try again.</p> : null}
          <Button type="button" variant="ghost" onClick={() => setConfirmSheet(null)} disabled={del.isPending}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" busy={del.isPending} onClick={() => del.mutate()}>
            Delete
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
