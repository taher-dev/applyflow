import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import type { JobApplication } from '@/types/dashboard'
import { PlusCircle, Building2, Calendar, DollarSign, Link2, MapPin } from 'lucide-react'
import { toast } from 'sonner'

// 1. Zod Validation Schema with Field & Cross-Field Validations
const addApplicationSchema = z
  .object({
    company: z.string().trim().min(1, 'Company name is required'),
    role: z.string().trim().min(1, 'Job title is required'),
    status: z.enum(['Saved', 'Applied', 'Screening', 'Interview', 'Offer', 'Rejected'], {
      required_error: 'Please select an application status',
    }),
    appliedDate: z
      .string()
      .min(1, 'Application date is required')
      .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid application date' }),
    jobUrl: z
      .string()
      .trim()
      .optional()
      .refine(
        (val) => {
          if (!val || val.length === 0) return true
          try {
            const parsed = new URL(val)
            return parsed.protocol === 'http:' || parsed.protocol === 'https:'
          } catch {
            return false
          }
        },
        { message: 'Must be a valid URL starting with http:// or https://' }
      ),
    location: z.string().trim().optional(),
    workplaceType: z.enum(['Remote', 'Hybrid', 'On-site']),
    employmentType: z
      .enum(['Full-time', 'Part-time', 'Contract', 'Internship'])
      .optional(),
    minSalary: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val || val.trim() === '') return true
          const num = Number(val)
          return !isNaN(num) && num >= 0
        },
        { message: 'Minimum salary must be 0 or greater' }
      ),
    maxSalary: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val || val.trim() === '') return true
          const num = Number(val)
          return !isNaN(num) && num >= 0
        },
        { message: 'Maximum salary must be 0 or greater' }
      ),
    notes: z.string().trim().optional(),
    followUpDate: z
      .string()
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: 'Invalid follow-up date',
      }),
  })
  .refine(
    (data) => {
      if (
        data.minSalary &&
        data.maxSalary &&
        data.minSalary.trim() !== '' &&
        data.maxSalary.trim() !== ''
      ) {
        const min = Number(data.minSalary)
        const max = Number(data.maxSalary)
        if (!isNaN(min) && !isNaN(max)) {
          return min <= max
        }
      }
      return true
    },
    {
      message: 'Minimum salary cannot exceed maximum salary',
      path: ['maxSalary'],
    }
  )

export type AddApplicationFormValues = z.infer<typeof addApplicationSchema>

interface AddApplicationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddApplication: (newApp: Omit<JobApplication, 'id'>) => void
}

function formatSalary(min?: number, max?: number): string | undefined {
  if (min !== undefined && max !== undefined) {
    const minK = min >= 1000 ? `$${Math.round(min / 1000)}k` : `$${min}`
    const maxK = max >= 1000 ? `$${Math.round(max / 1000)}k` : `$${max}`
    return `${minK} - ${maxK}`
  }
  if (min !== undefined) {
    const minK = min >= 1000 ? `$${Math.round(min / 1000)}k` : `$${min}`
    return `${minK}+`
  }
  if (max !== undefined) {
    const maxK = max >= 1000 ? `$${Math.round(max / 1000)}k` : `$${max}`
    return `Up to ${maxK}`
  }
  return undefined
}

export function AddApplicationDialog({
  open,
  onOpenChange,
  onAddApplication,
}: AddApplicationDialogProps) {
  const today = new Date().toISOString().split('T')[0]

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddApplicationFormValues>({
    resolver: zodResolver(addApplicationSchema),
    defaultValues: {
      company: '',
      role: '',
      status: 'Applied',
      appliedDate: today,
      jobUrl: '',
      location: '',
      workplaceType: 'Remote',
      employmentType: 'Full-time',
      minSalary: '',
      maxSalary: '',
      notes: '',
      followUpDate: '',
    },
  })

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      reset({
        company: '',
        role: '',
        status: 'Applied',
        appliedDate: today,
        jobUrl: '',
        location: '',
        workplaceType: 'Remote',
        employmentType: 'Full-time',
        minSalary: '',
        maxSalary: '',
        notes: '',
        followUpDate: '',
      })
    }
  }, [open, reset, today])

  const onSubmit = (data: AddApplicationFormValues) => {
    const min =
      data.minSalary && data.minSalary.trim() !== '' ? Number(data.minSalary) : undefined
    const max =
      data.maxSalary && data.maxSalary.trim() !== '' ? Number(data.maxSalary) : undefined

    const formatted = formatSalary(min, max)

    onAddApplication({
      company: data.company.trim(),
      role: data.role.trim(),
      status: data.status,
      appliedDate: data.appliedDate,
      jobUrl: data.jobUrl?.trim() || undefined,
      location: data.location?.trim() || 'Remote',
      workplaceType: data.workplaceType,
      employmentType: data.employmentType || undefined,
      minSalary: min,
      maxSalary: max,
      salary: formatted,
      notes: data.notes?.trim() || undefined,
      followUpDate: data.followUpDate || undefined,
    })

    toast.success('Application tracked successfully!', {
      description: `${data.role} at ${data.company} has been added to your pipeline.`,
    })

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-blue-600 text-white shadow-xs">
              <PlusCircle className="size-4" />
            </div>
            <DialogTitle className="text-lg">Add New Application</DialogTitle>
          </div>
          <DialogDescription>
            Record a new job opportunity to track your interviews, follow-ups, and offer progress.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1" noValidate>
          {/* Section 1: Role Overview */}
          <div className="space-y-3 p-3.5 rounded-lg border border-border/70 bg-muted/20">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Building2 className="size-3.5 text-blue-600" />
              Role Overview
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Company Name */}
              <div className="space-y-1.5">
                <Label htmlFor="company" className="text-xs font-medium">
                  Company Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="company"
                  placeholder="e.g. Stripe, Linear, Figma"
                  {...register('company')}
                  aria-invalid={!!errors.company}
                  className="h-9 text-xs sm:text-sm"
                />
                {errors.company && (
                  <p className="text-[11px] font-medium text-destructive">
                    {errors.company.message}
                  </p>
                )}
              </div>

              {/* Job Title */}
              <div className="space-y-1.5">
                <Label htmlFor="role" className="text-xs font-medium">
                  Job Title / Role <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="role"
                  placeholder="e.g. Senior Frontend Engineer"
                  {...register('role')}
                  aria-invalid={!!errors.role}
                  className="h-9 text-xs sm:text-sm"
                />
                {errors.role && (
                  <p className="text-[11px] font-medium text-destructive">
                    {errors.role.message}
                  </p>
                )}
              </div>
            </div>

            {/* Job Posting URL */}
            <div className="space-y-1.5">
              <Label htmlFor="jobUrl" className="text-xs font-medium flex items-center gap-1">
                <Link2 className="size-3 text-muted-foreground" />
                Job Posting URL <span className="text-muted-foreground text-[10px]">(Optional)</span>
              </Label>
              <Input
                id="jobUrl"
                type="url"
                placeholder="https://company.com/careers/job-id"
                {...register('jobUrl')}
                aria-invalid={!!errors.jobUrl}
                className="h-9 text-xs sm:text-sm"
              />
              {errors.jobUrl && (
                <p className="text-[11px] font-medium text-destructive">
                  {errors.jobUrl.message}
                </p>
              )}
            </div>
          </div>

          {/* Section 2: Status & Timeline */}
          <div className="space-y-3 p-3.5 rounded-lg border border-border/70 bg-muted/20">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="size-3.5 text-blue-600" />
              Status & Timeline
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Application Status */}
              <div className="space-y-1.5">
                <Label htmlFor="status" className="text-xs font-medium">
                  Status <span className="text-rose-500">*</span>
                </Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="status" className="h-9 w-full text-xs sm:text-sm">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        <SelectItem value="Saved">Saved</SelectItem>
                        <SelectItem value="Applied">Applied</SelectItem>
                        <SelectItem value="Screening">Screening</SelectItem>
                        <SelectItem value="Interview">Interview</SelectItem>
                        <SelectItem value="Offer">Offer</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.status && (
                  <p className="text-[11px] font-medium text-destructive">
                    {errors.status.message}
                  </p>
                )}
              </div>

              {/* Applied Date */}
              <div className="space-y-1.5">
                <Label htmlFor="appliedDate" className="text-xs font-medium">
                  Applied Date <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="appliedDate"
                  type="date"
                  {...register('appliedDate')}
                  aria-invalid={!!errors.appliedDate}
                  className="h-9 text-xs sm:text-sm"
                />
                {errors.appliedDate && (
                  <p className="text-[11px] font-medium text-destructive">
                    {errors.appliedDate.message}
                  </p>
                )}
              </div>

              {/* Next Follow-Up Date */}
              <div className="space-y-1.5">
                <Label htmlFor="followUpDate" className="text-xs font-medium">
                  Follow-up Date
                </Label>
                <Input
                  id="followUpDate"
                  type="date"
                  {...register('followUpDate')}
                  aria-invalid={!!errors.followUpDate}
                  className="h-9 text-xs sm:text-sm"
                />
                {errors.followUpDate && (
                  <p className="text-[11px] font-medium text-destructive">
                    {errors.followUpDate.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Work Arrangement & Employment */}
          <div className="space-y-3 p-3.5 rounded-lg border border-border/70 bg-muted/20">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MapPin className="size-3.5 text-blue-600" />
              Arrangement & Location
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Workplace Type */}
              <div className="space-y-1.5">
                <Label htmlFor="workplaceType" className="text-xs font-medium">
                  Work Arrangement
                </Label>
                <Controller
                  name="workplaceType"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="workplaceType" className="h-9 w-full text-xs sm:text-sm">
                        <SelectValue placeholder="Workplace" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        <SelectItem value="Remote">Remote</SelectItem>
                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                        <SelectItem value="On-site">On-site</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Employment Type */}
              <div className="space-y-1.5">
                <Label htmlFor="employmentType" className="text-xs font-medium">
                  Employment Type
                </Label>
                <Controller
                  name="employmentType"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || 'Full-time'}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger id="employmentType" className="h-9 w-full text-xs sm:text-sm">
                        <SelectValue placeholder="Employment type" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        <SelectItem value="Full-time">Full-time</SelectItem>
                        <SelectItem value="Part-time">Part-time</SelectItem>
                        <SelectItem value="Contract">Contract</SelectItem>
                        <SelectItem value="Internship">Internship</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <Label htmlFor="location" className="text-xs font-medium">
                  Location
                </Label>
                <Input
                  id="location"
                  placeholder="e.g. San Francisco, CA"
                  {...register('location')}
                  className="h-9 text-xs sm:text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Target Compensation */}
          <div className="space-y-3 p-3.5 rounded-lg border border-border/70 bg-muted/20">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="size-3.5 text-blue-600" />
              Annual Compensation Range
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Minimum Salary */}
              <div className="space-y-1.5">
                <Label htmlFor="minSalary" className="text-xs font-medium">
                  Minimum Salary (USD)
                </Label>
                <Input
                  id="minSalary"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="e.g. 150000"
                  {...register('minSalary')}
                  aria-invalid={!!errors.minSalary}
                  className="h-9 text-xs sm:text-sm"
                />
                {errors.minSalary && (
                  <p className="text-[11px] font-medium text-destructive">
                    {errors.minSalary.message}
                  </p>
                )}
              </div>

              {/* Maximum Salary */}
              <div className="space-y-1.5">
                <Label htmlFor="maxSalary" className="text-xs font-medium">
                  Maximum Salary (USD)
                </Label>
                <Input
                  id="maxSalary"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="e.g. 185000"
                  {...register('maxSalary')}
                  aria-invalid={!!errors.maxSalary}
                  className="h-9 text-xs sm:text-sm"
                />
                {errors.maxSalary && (
                  <p className="text-[11px] font-medium text-destructive">
                    {errors.maxSalary.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 5: Notes & Details */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-medium">
              Notes & Follow-up Details
            </Label>
            <Textarea
              id="notes"
              placeholder="e.g. Referred by Sarah from engineering, tech stack includes React and Go..."
              rows={3}
              {...register('notes')}
              className="resize-none text-xs sm:text-sm"
            />
          </div>

          {/* Footer Actions */}
          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            >
              Add Application
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
