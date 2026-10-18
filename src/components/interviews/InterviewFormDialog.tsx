import { useState, useEffect } from 'react'
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
import type { JobApplication, Interview, InterviewType } from '@/types/dashboard'
import {
  Calendar,
  Clock,
  Video,
  User,
  Building2,
  FileText,
  AlertCircle,
  CalendarPlus,
  Pencil,
} from 'lucide-react'

const INTERVIEW_TYPES: InterviewType[] = [
  'Phone screening',
  'Video interview',
  'Technical interview',
  'On-site interview',
  'Final interview',
  'Other',
]

// Form validation schema
const interviewFormSchema = z.object({
  applicationId: z.string().min(1, 'Please select a job opportunity'),
  interviewType: z.enum(
    [
      'Phone screening',
      'Video interview',
      'Technical interview',
      'On-site interview',
      'Final interview',
      'Other',
    ],
    { errorMap: () => ({ message: 'Please select an interview type' }) }
  ),
  date: z
    .string()
    .min(1, 'Interview date is required')
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid interview date' }),
  time: z
    .string()
    .min(1, 'Interview time is required')
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please provide a valid time (HH:MM)'),
  locationOrLink: z.string().trim().optional(),
  interviewer: z.string().trim().optional(),
  notes: z.string().trim().optional(),
})

export type InterviewFormData = z.infer<typeof interviewFormSchema>

export interface InterviewFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  applications: JobApplication[]
  interviewToEdit?: Interview | null
  preselectedApplicationId?: string | null
  onSaveInterview: (
    data: Omit<Interview, 'id' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => void
  onOpenAddApplication?: () => void
}

export function InterviewFormDialog({
  open,
  onOpenChange,
  applications,
  interviewToEdit,
  preselectedApplicationId,
  onSaveInterview,
  onOpenAddApplication,
}: InterviewFormDialogProps) {
  const isEditing = Boolean(interviewToEdit)

  const [initialDefaultValues] = useState<InterviewFormData>(() => ({
    applicationId: preselectedApplicationId || '',
    interviewType: 'Video interview',
    date: new Date().toISOString().split('T')[0],
    time: '14:00',
    locationOrLink: '',
    interviewer: '',
    notes: '',
  }))

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InterviewFormData>({
    resolver: zodResolver(interviewFormSchema),
    defaultValues: initialDefaultValues,
  })

  // Prefill or reset form on dialog open/close or edit target change
  useEffect(() => {
    if (!open) {
      reset({
        applicationId: preselectedApplicationId || (applications[0]?.id ?? ''),
        interviewType: 'Video interview',
        date: new Date().toISOString().split('T')[0],
        time: '14:00',
        locationOrLink: '',
        interviewer: '',
        notes: '',
      })
      return
    }

    if (interviewToEdit) {
      // Split scheduledAt into date and time
      const [dPart = '', tPart = '14:00'] = interviewToEdit.scheduledAt.split('T')
      reset({
        applicationId: interviewToEdit.applicationId,
        interviewType: interviewToEdit.interviewType,
        date: dPart,
        time: tPart.slice(0, 5),
        locationOrLink: interviewToEdit.locationOrLink || '',
        interviewer: interviewToEdit.interviewer || '',
        notes: interviewToEdit.notes || '',
      })
    } else {
      reset({
        applicationId: preselectedApplicationId || (applications[0]?.id ?? ''),
        interviewType: 'Video interview',
        date: new Date().toISOString().split('T')[0],
        time: '14:00',
        locationOrLink: '',
        interviewer: '',
        notes: '',
      })
    }
  }, [open, interviewToEdit, preselectedApplicationId, reset, applications])

  const onSubmit = (data: InterviewFormData) => {
    // Combine date & time into standard ISO string
    const scheduledAt = `${data.date}T${data.time}`

    onSaveInterview(
      {
        applicationId: data.applicationId,
        interviewType: data.interviewType,
        scheduledAt,
        locationOrLink: data.locationOrLink?.trim() || undefined,
        interviewer: data.interviewer?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
      },
      interviewToEdit?.id
    )

    onOpenChange(false)
  }

  const handleCancel = () => {
    reset(initialDefaultValues)
    onOpenChange(false)
  }

  const hasNoApplications = applications.length === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              {isEditing ? <Pencil className="size-4.5" /> : <CalendarPlus className="size-4.5" />}
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-foreground">
                {isEditing ? 'Edit Interview Round' : 'Schedule New Interview'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {isEditing
                  ? 'Update schedule, interviewer details, and preparation notes'
                  : 'Track an upcoming recruiter screen, technical assessment, or final round'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Warning if no applications exist */}
        {hasNoApplications ? (
          <div className="py-6 space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200">
              <AlertCircle className="size-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-sm">No applications available to associate</p>
                <p className="text-muted-foreground">
                  You must add at least one job opportunity to your pipeline before scheduling an
                  interview round.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Close
              </Button>
              {onOpenAddApplication && (
                <Button
                  type="button"
                  onClick={() => {
                    onOpenChange(false)
                    onOpenAddApplication()
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                >
                  Add job application first
                </Button>
              )}
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            {/* 1. Associated Job Application */}
            <div className="space-y-1.5">
              <Label htmlFor="applicationId" className="text-xs font-medium flex items-center gap-1.5">
                <Building2 className="size-3.5 text-muted-foreground" />
                <span>Associated Application</span>
                <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="applicationId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isEditing}
                  >
                    <SelectTrigger
                      id="applicationId"
                      className="w-full text-xs h-9 bg-background cursor-pointer"
                    >
                      <SelectValue placeholder="Select a job opportunity" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-60">
                      {applications.map((app) => (
                        <SelectItem key={app.id} value={app.id} className="text-xs">
                          <span className="font-semibold text-foreground">{app.company}</span>
                          <span className="text-muted-foreground ml-1.5">— {app.role}</span>
                          <span className="text-[10px] text-muted-foreground/70 ml-2">
                            ({app.status})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.applicationId && (
                <p className="text-[11px] text-destructive font-medium">
                  {errors.applicationId.message}
                </p>
              )}
            </div>

            {/* 2. Interview Type */}
            <div className="space-y-1.5">
              <Label htmlFor="interviewType" className="text-xs font-medium flex items-center gap-1.5">
                <Video className="size-3.5 text-muted-foreground" />
                <span>Interview Type</span>
                <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="interviewType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="interviewType"
                      className="w-full text-xs h-9 bg-background cursor-pointer"
                    >
                      <SelectValue placeholder="Select interview type" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {INTERVIEW_TYPES.map((type) => (
                        <SelectItem key={type} value={type} className="text-xs">
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.interviewType && (
                <p className="text-[11px] text-destructive font-medium">
                  {errors.interviewType.message}
                </p>
              )}
            </div>

            {/* 3. Date & Time Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Date */}
              <div className="space-y-1.5">
                <Label htmlFor="date" className="text-xs font-medium flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  <span>Date</span>
                  <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="date"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="date"
                      type="date"
                      value={field.value}
                      onChange={field.onChange}
                      className="text-xs h-9 bg-background"
                    />
                  )}
                />
                {errors.date && (
                  <p className="text-[11px] text-destructive font-medium">{errors.date.message}</p>
                )}
              </div>

              {/* Time */}
              <div className="space-y-1.5">
                <Label htmlFor="time" className="text-xs font-medium flex items-center gap-1.5">
                  <Clock className="size-3.5 text-muted-foreground" />
                  <span>Time</span>
                  <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="time"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="time"
                      type="time"
                      value={field.value}
                      onChange={field.onChange}
                      className="text-xs h-9 bg-background"
                    />
                  )}
                />
                {errors.time && (
                  <p className="text-[11px] text-destructive font-medium">{errors.time.message}</p>
                )}
              </div>
            </div>

            {/* 4. Meeting Platform / Link & Interviewer Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Meeting Link / Location */}
              <div className="space-y-1.5">
                <Label htmlFor="locationOrLink" className="text-xs font-medium flex items-center gap-1.5">
                  <Video className="size-3.5 text-muted-foreground" />
                  <span>Meeting Link or Location</span>
                </Label>
                <Controller
                  name="locationOrLink"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="locationOrLink"
                      placeholder="e.g. Google Meet, Zoom, or Office Address"
                      value={field.value}
                      onChange={field.onChange}
                      className="text-xs h-9 bg-background"
                    />
                  )}
                />
              </div>

              {/* Interviewer */}
              <div className="space-y-1.5">
                <Label htmlFor="interviewer" className="text-xs font-medium flex items-center gap-1.5">
                  <User className="size-3.5 text-muted-foreground" />
                  <span>Interviewer(s)</span>
                </Label>
                <Controller
                  name="interviewer"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="interviewer"
                      placeholder="e.g. Sarah Kim (Head of Engineering)"
                      value={field.value}
                      onChange={field.onChange}
                      className="text-xs h-9 bg-background"
                    />
                  )}
                />
              </div>
            </div>

            {/* 5. Preparation Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-medium flex items-center gap-1.5">
                <FileText className="size-3.5 text-muted-foreground" />
                <span>Preparation Notes (Optional)</span>
              </Label>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <Textarea
                    id="notes"
                    placeholder="Topics to study, questions to ask the hiring team, take-home review points..."
                    rows={3}
                    value={field.value}
                    onChange={field.onChange}
                    className="text-xs bg-background resize-none"
                  />
                )}
              />
            </div>

            {/* Actions Footer */}
            <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border/60">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || hasNoApplications}
                className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                {isEditing ? 'Save Changes' : 'Schedule Interview'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
