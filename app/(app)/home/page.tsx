import { Skeleton } from '@/components/ui/skeleton'

export default function HomePage() {
  return (
    <div className="px-6 py-8 lg:px-0">
      <h1 className="font-display text-3xl font-semibold mb-6">Home</h1>
      <Skeleton lines={4} />
    </div>
  )
}
