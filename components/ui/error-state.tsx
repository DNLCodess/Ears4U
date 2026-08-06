import { ApiError, COLD_START_MESSAGE } from '@/lib/api/errors'
import { Button } from './button'

export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  const msg = error instanceof ApiError
    ? (error.coldStart ? COLD_START_MESSAGE : error.friendly)
    : 'Something went wrong. Try again.'
  return (
    <div role="alert" className="rounded-2xl bg-card px-5 py-6 text-center space-y-3">
      <p className="text-[15px]">{msg}</p>
      {retry ? <Button variant="ghost" onClick={retry}>Try again</Button> : null}
    </div>
  )
}
