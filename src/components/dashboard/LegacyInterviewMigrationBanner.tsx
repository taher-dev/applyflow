import { useState, useMemo } from 'react'
import {
  CalendarClock,
  Download,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  HardDrive,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  detectLegacyInterviews,
  createInterviewBackupJsonString,
  importInterviewsToCloud,
  removeImportedInterviewsFromLocalStorage,
  type CategorizedLegacyInterview,
  type InterviewImportSummary,
} from '@/lib/local-interview-import.ts'
import type { JobApplication, Interview } from '@/types/dashboard'
import { useAuth } from '@/context/useAuth'
import { toast } from 'sonner'

interface LegacyInterviewMigrationBannerProps {
  applications: JobApplication[]
  interviews: Interview[]
  onImportComplete?: () => Promise<void> | void
}

export function LegacyInterviewMigrationBanner({
  applications,
  interviews,
  onImportComplete,
}: LegacyInterviewMigrationBannerProps) {
  const { user } = useAuth()
  const [isDismissed, setIsDismissed] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<{
    current: number
    total: number
    name: string
  } | null>(null)
  const [importSummary, setImportSummary] = useState<InterviewImportSummary | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Detect and categorize legacy interviews against current user applications and interviews
  const detection = useMemo(() => {
    // refreshTrigger is included to re-evaluate on local storage changes
    void refreshTrigger
    if (!user) return null
    return detectLegacyInterviews(applications, interviews, user.id)
  }, [applications, interviews, user, refreshTrigger])

  const eligibleRecords = detection?.eligibleRecords || []
  const allCategorized = detection?.allCategorized || []
  const hasEligible = eligibleRecords.length > 0
  const hasAttentionNeeded =
    (detection?.unmappableCount ?? 0) > 0 || (detection?.invalidCount ?? 0) > 0

  if (isDismissed || !detection || (!hasEligible && !hasAttentionNeeded)) {
    return null
  }

  const handleDownloadBackup = () => {
    try {
      const jsonStr = createInterviewBackupJsonString()
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `applyflow-interviews-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Interview backup downloaded', {
        description: 'Your local interview records have been safely exported to JSON.',
      })
    } catch {
      toast.error('Failed to download interview backup')
    }
  }

  const handleStartImport = async () => {
    if (eligibleRecords.length === 0) return

    setIsImporting(true)
    setImportProgress({
      current: 0,
      total: eligibleRecords.length,
      name: 'Preparing import...',
    })

    try {
      const summary = await importInterviewsToCloud(
        eligibleRecords,
        user?.id,
        (current, total, item) => {
          const companyName = item.parentApp?.company || 'Application'
          setImportProgress({
            current,
            total,
            name: `${item.record.interviewType || 'Interview'} for ${companyName}`,
          })
        }
      )

      setImportSummary(summary)

      if (summary.succeeded.length > 0) {
        toast.success(`Imported ${summary.succeeded.length} interview(s) to cloud!`)
        await onImportComplete?.()
      }

      if (summary.failed.length > 0) {
        toast.error(`Failed to import ${summary.failed.length} interview(s)`, {
          description: summary.failed[0].error,
        })
      }
    } catch {
      toast.error('Unexpected error during interview cloud migration')
    } finally {
      setIsImporting(false)
      setImportProgress(null)
    }
  }

  const handleClearLocalData = () => {
    if (!importSummary) return

    const succeededIds = importSummary.succeeded.map((s) => s.legacyId)
    removeImportedInterviewsFromLocalStorage(succeededIds)

    setRefreshTrigger((prev) => prev + 1)
    setIsDialogOpen(false)
    toast.success('Imported interviews cleared from local storage', {
      description: 'Your interviews are now securely stored in PostgreSQL.',
    })
  }

  const formatDateLabel = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <>
      {/* Migration Alert Banner */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 text-slate-800 shadow-2xs mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-2xs mt-0.5 sm:mt-0">
              <CalendarClock className="size-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2 flex-wrap">
                <span>Legacy interview records detected</span>
                {eligibleRecords.length > 0 && (
                  <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100 text-[11px] font-medium border-indigo-200">
                    {eligibleRecords.length} ready to import
                  </Badge>
                )}
                {detection.unmappableCount > 0 && (
                  <Badge variant="outline" className="text-[11px] text-amber-700 border-amber-300 bg-amber-50">
                    {detection.unmappableCount} need attention
                  </Badge>
                )}
              </h4>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                You have {detection.totalCount} interview record(s) in local browser storage.
                Migrate them into your cloud account to link them with your applications and receive notifications.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end pt-1 sm:pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadBackup}
              className="text-xs h-8 border-slate-300 text-slate-700 hover:bg-white cursor-pointer gap-1.5"
              title="Download offline JSON backup before importing"
            >
              <Download className="size-3.5" />
              <span>Backup</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setIsDialogOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 cursor-pointer shadow-2xs gap-1.5"
            >
              <CalendarClock className="size-3.5" />
              <span>Review & migrate</span>
            </Button>

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-indigo-100/60 transition-colors cursor-pointer"
              aria-label="Dismiss interview banner"
              title="Dismiss for this session"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Migration Modal Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-900 flex items-center gap-2">
              <HardDrive className="size-5 text-indigo-600" />
              <span>Migrate legacy interviews to cloud</span>
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs mt-1">
              Transfer your locally saved interviews to your PostgreSQL account.
              Each interview will be linked to its matching job application.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {!importSummary ? (
              <>
                {/* Status overview badges */}
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <span className="text-slate-500">Summary:</span>
                  <Badge variant="secondary" className="text-[11px] font-medium">
                    {eligibleRecords.length} Eligible
                  </Badge>
                  {detection.alreadyImportedCount > 0 && (
                    <Badge variant="outline" className="text-[11px] text-slate-600">
                      {detection.alreadyImportedCount} Already imported
                    </Badge>
                  )}
                  {detection.unmappableCount > 0 && (
                    <Badge variant="outline" className="text-[11px] text-amber-700 border-amber-300 bg-amber-50">
                      {detection.unmappableCount} Missing parent app
                    </Badge>
                  )}
                  {detection.invalidCount > 0 && (
                    <Badge variant="outline" className="text-[11px] text-rose-700 border-rose-300 bg-rose-50">
                      {detection.invalidCount} Invalid format
                    </Badge>
                  )}
                </div>

                {/* Records list preview */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 max-h-56 overflow-y-auto space-y-2.5">
                  <div className="text-xs font-semibold text-slate-700">
                    Interview Records ({allCategorized.length}):
                  </div>

                  {allCategorized.map((item: CategorizedLegacyInterview) => {
                    const isEligible = item.status === 'eligible'
                    const isImported = item.status === 'already_imported'
                    const isUnmappable = item.status === 'unmappable'
                    const isInvalid = item.status === 'invalid'
                    const isDemo = item.status === 'demo'

                    return (
                      <div
                        key={item.legacyId}
                        className="flex flex-col gap-1 p-2 rounded-md bg-white border border-slate-200/80 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-900 truncate">
                            {item.record.interviewType || 'Interview'}
                          </span>
                          <span className="text-slate-500 shrink-0">
                            {formatDateLabel(item.record.scheduledAt)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <span className="text-slate-600 truncate">
                            {item.parentApp
                              ? `${item.parentApp.company} (${item.parentApp.role})`
                              : `App ID: ${item.record.applicationId}`}
                          </span>

                          {isEligible && (
                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 text-[10px]">
                              Ready
                            </Badge>
                          )}
                          {isImported && (
                            <Badge variant="secondary" className="text-[10px] text-slate-500">
                              Imported
                            </Badge>
                          )}
                          {isUnmappable && (
                            <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 bg-amber-50">
                              No cloud app
                            </Badge>
                          )}
                          {isInvalid && (
                            <Badge variant="outline" className="text-[10px] text-rose-700 border-rose-300 bg-rose-50">
                              Invalid date
                            </Badge>
                          )}
                          {isDemo && (
                            <Badge variant="secondary" className="text-[10px] text-slate-400">
                              Demo
                            </Badge>
                          )}
                        </div>

                        {item.reason && !isEligible && (
                          <p className="text-[10px] text-slate-500 italic pt-0.5">
                            {item.reason}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Import progress indicator */}
                {isImporting && importProgress && (
                  <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-indigo-900 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Migrating interviews to PostgreSQL...</span>
                      </span>
                      <span>
                        {importProgress.current} / {importProgress.total}
                      </span>
                    </div>
                    <p className="text-[11px] text-indigo-700 truncate">
                      {importProgress.name}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                {importSummary.succeeded.length > 0 && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 space-y-1">
                    <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                      <CheckCircle2 className="size-4" />
                      <span>Migration complete</span>
                    </div>
                    <p className="text-xs text-emerald-700">
                      Successfully imported {importSummary.succeeded.length} interview(s) to your cloud database.
                    </p>
                  </div>
                )}

                {importSummary.failed.length > 0 && (
                  <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 space-y-1">
                    <div className="flex items-center gap-2 text-rose-800 text-xs font-semibold">
                      <AlertCircle className="size-4" />
                      <span>{importSummary.failed.length} record(s) failed</span>
                    </div>
                    <p className="text-xs text-rose-700">
                      {importSummary.failed[0]?.error || 'Some records could not be created.'}
                    </p>
                    <p className="text-[11px] text-slate-500 pt-0.5">
                      Failed records remain safely preserved in local storage so you can retry.
                    </p>
                  </div>
                )}

                {importSummary.skippedAlreadyImported > 0 && (
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                    <p className="text-xs text-slate-600">
                      {importSummary.skippedAlreadyImported} interview(s) were previously imported and were skipped to prevent duplicates.
                    </p>
                  </div>
                )}

                {importSummary.succeeded.length === 0 && importSummary.failed.length === 0 && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                    <div className="flex items-center gap-2 text-amber-800 text-xs font-semibold">
                      <AlertTriangle className="size-4" />
                      <span>No records were imported</span>
                    </div>
                    <p className="text-xs text-amber-700 mt-0.5">
                      No eligible interviews could be migrated. Ensure your parent applications are imported first.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {!importSummary ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isImporting}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleStartImport}
                  disabled={isImporting || eligibleRecords.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <CalendarClock className="size-3.5" />
                      <span>Import {eligibleRecords.length} interview{eligibleRecords.length === 1 ? '' : 's'}</span>
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="flex items-center justify-between w-full gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDialogOpen(false)}
                  className="text-xs"
                >
                  Keep local copy
                </Button>
                {importSummary.succeeded.length > 0 && (
                  <Button
                    size="sm"
                    onClick={handleClearLocalData}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs"
                  >
                    Clear imported records
                  </Button>
                )}
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
