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
import type { JobApplication, WorkplaceType } from '@/types/dashboard'
import { cn } from '@/lib/utils'
import { PlusCircle, Pencil, Building2, Calendar, DollarSign, Link2, MapPin } from 'lucide-react'

// 1. Zod Validation Schema with Field & Cross-Field Validations
const applicationFormSchema = z
  .object({
    company: z.string().trim().min(1, 'Company name is required'),
    role: z.string().trim().min(1, 'Job title is required'),
    status: z.enum(['Applied', 'Rejected', 'Offer', 'Active', 'Saved', 'Screening', 'Interview'], {
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
    workplaceType: z.enum(['Remote', 'Hybrid', 'On-site'], {
      errorMap: () => ({ message: 'Work arrangement is required' }),
    }),
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

export type ApplicationFormData = z.infer<typeof applicationFormSchema>

export interface ApplicationFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  applicationToEdit?: JobApplication | null
  onSaveApplication: (
    appData: Omit<JobApplication, 'id'>,
    existingId?: string
  ) => void
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

export function ApplicationFormDialog({
  open,
  onOpenChange,
  applicationToEdit,
  onSaveApplication,
}: ApplicationFormDialogProps) {
  const isEditing = Boolean(applicationToEdit)
  const today = new Date().toISOString().split('T')[0]

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: {
      company: '',
      role: '',
      status: 'Applied',
      appliedDate: today,
      jobUrl: '',
      location: '',
      workplaceType: '' as unknown as WorkplaceType,
      employmentType: 'Full-time',
      minSalary: '',
      maxSalary: '',
      notes: '',
      followUpDate: '',
    },
  })

  // Prefill when editing, reset to blank when creating
  useEffect(() => {
    if (open) {
      if (applicationToEdit) {
        reset({
          company: applicationToEdit.company,
          role: applicationToEdit.role,
          status:
            applicationToEdit.status === 'Offer'
              ? 'Offer'
              : applicationToEdit.status === 'Rejected'
              ? 'Rejected'
              : 'Applied',
          appliedDate: applicationToEdit.appliedDate,
          jobUrl: applicationToEdit.jobUrl || '',
          location: applicationToEdit.location || '',
          workplaceType: applicationToEdit.workplaceType,
          employmentType: applicationToEdit.employmentType || 'Full-time',
          minSalary:
            applicationToEdit.minSalary !== undefined ? String(applicationToEdit.minSalary) : '',
          maxSalary:
            applicationToEdit.maxSalary !== undefined ? String(applicationToEdit.maxSalary) : '',
          notes: applicationToEdit.notes || '',
          followUpDate: applicationToEdit.followUpDate || '',
        })
      } else {
        reset({
          company: '',
          role: '',
          status: 'Applied',
          appliedDate: today,
          jobUrl: '',
          location: '',
          workplaceType: '' as unknown as WorkplaceType,
          employmentType: 'Full-time',
          minSalary: '',
          maxSalary: '',
          notes: '',
          followUpDate: '',
        })
      }
    }
  }, [open, applicationToEdit, reset, today])

  const onSubmit = (data: ApplicationFormData) => {
    const min =
      data.minSalary && data.minSalary.trim() !== '' ? Number(data.minSalary) : undefined
    const max =
      data.maxSalary && data.maxSalary.trim() !== '' ? Number(data.maxSalary) : undefined

    const formatted = formatSalary(min, max)

    onSaveApplication(
      {
        company: data.company.trim(),
        role: data.role.trim(),
        status: data.status,
        appliedDate: data.appliedDate,
        jobUrl: data.jobUrl?.trim() || undefined,
        location: data.location?.trim() || undefined,
        workplaceType: data.workplaceType,
        employmentType: data.employmentType || undefined,
        minSalary: min,
        maxSalary: max,
        salary: formatted,
        notes: data.notes?.trim() || undefined,
        followUpDate: data.followUpDate || undefined,
      },
      applicationToEdit ? applicationToEdit.id : undefined
    )

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[82vh] sm:max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs">
              {isEditing ? <Pencil className="size-4" /> : <PlusCircle className="size-4" />}
            </div>
            <DialogTitle className="text-lg">
              {isEditing ? 'Edit Application' : 'Add New Application'}
            </DialogTitle>
          </div>
          <DialogDescription>
            {isEditing
              ? `Update details, status, compensation, and notes for ${applicationToEdit?.company}.`
              : 'Record a new job opportunity to track your interviews, follow-ups, and offer progress.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1" noValidate>
          {/* Section 1: Role Overview */}
          <div className="space-y-3 p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Building2 className="size-3.5 text-slate-900" />
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
          <div className="space-y-3 p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Calendar className="size-3.5 text-slate-900" />
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
                        <SelectItem value="Rejected">Rejected</SelectItem>
                        <SelectItem value="Offer">Offer</SelectItem>
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
          <div className="space-y-3 p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <MapPin className="size-3.5 text-slate-900" />
              Arrangement & Location
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Workplace Type */}
              <div className="space-y-1.5">
                <Label htmlFor="workplaceType" className="text-xs font-medium">
                  Work Arrangement <span className="text-rose-500">*</span>
                </Label>
                <Controller
                  name="workplaceType"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        id="workplaceType"
                        aria-invalid={!!errors.workplaceType}
                        className={cn(
                          'h-9 w-full text-xs sm:text-sm',
                          errors.workplaceType && 'border-destructive ring-destructive/20'
                        )}
                      >
                        <SelectValue placeholder="Select arrangement" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        <SelectItem value="Remote">Remote</SelectItem>
                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                        <SelectItem value="On-site">On-site</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.workplaceType && (
                  <p className="text-[11px] font-medium text-destructive">
                    {errors.workplaceType.message}
                  </p>
                )}
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="location" className="text-xs font-medium">
                    Location
                  </Label>
                  <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
                </div>
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
          <div className="space-y-3 p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <DollarSign className="size-3.5 text-slate-900" />
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
              className="bg-slate-900 hover:bg-slate-800 text-white cursor-pointer shadow-xs rounded-lg"
            >
              {isEditing ? 'Save Changes' : 'Add Application'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Backward-compatible alias
export const AddApplicationDialog = ApplicationFormDialog
