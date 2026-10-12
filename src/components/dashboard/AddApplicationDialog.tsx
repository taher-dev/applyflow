import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ApplicationStatus, WorkplaceType, JobApplication } from '@/types/dashboard'
import { PlusCircle } from 'lucide-react'

interface AddApplicationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddApplication: (newApp: Omit<JobApplication, 'id' | 'appliedDate'>) => void
}

export function AddApplicationDialog({
  open,
  onOpenChange,
  onAddApplication,
}: AddApplicationDialogProps) {
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [location, setLocation] = useState('')
  const [workplaceType, setWorkplaceType] = useState<WorkplaceType>('Remote')
  const [salary, setSalary] = useState('')
  const [status, setStatus] = useState<ApplicationStatus>('Applied')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!company.trim() || !role.trim()) {
      return
    }

    onAddApplication({
      company: company.trim(),
      role: role.trim(),
      location: location.trim() || 'Remote',
      workplaceType,
      salary: salary.trim() || undefined,
      status,
    })

    // Reset fields
    setCompany('')
    setRole('')
    setLocation('')
    setWorkplaceType('Remote')
    setSalary('')
    setStatus('Applied')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-blue-600 text-white">
              <PlusCircle className="size-4" />
            </div>
            <DialogTitle>Add New Application</DialogTitle>
          </div>
          <DialogDescription>
            Enter role and company details to track your application pipeline.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-1">
          {/* Company Name */}
          <div className="space-y-1">
            <label htmlFor="company" className="text-xs font-semibold text-foreground">
              Company Name *
            </label>
            <Input
              id="company"
              required
              placeholder="e.g. Airbnb, Stripe, Netflix"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          {/* Role / Job Title */}
          <div className="space-y-1">
            <label htmlFor="role" className="text-xs font-semibold text-foreground">
              Job Title / Role *
            </label>
            <Input
              id="role"
              required
              placeholder="e.g. Senior Frontend Engineer"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          {/* Location & Workplace Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="location" className="text-xs font-semibold text-foreground">
                Location
              </label>
              <Input
                id="location"
                placeholder="e.g. San Francisco, CA"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="workplace" className="text-xs font-semibold text-foreground">
                Workplace Type
              </label>
              <select
                id="workplace"
                value={workplaceType}
                onChange={(e) => setWorkplaceType(e.target.value as WorkplaceType)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
              </select>
            </div>
          </div>

          {/* Salary & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="salary" className="text-xs font-semibold text-foreground">
                Target Salary
              </label>
              <Input
                id="salary"
                placeholder="e.g. $160k - $185k"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="status" className="text-xs font-semibold text-foreground">
                Initial Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="Applied">Applied</option>
                <option value="Reviewing">Reviewing</option>
                <option value="Interview">Interview</option>
                <option value="Offer">Offer</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              Save Application
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
