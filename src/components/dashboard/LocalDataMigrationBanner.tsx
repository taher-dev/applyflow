import { useState } from 'react'
import {
  CloudUpload,
  Download,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  HardDrive,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  detectLegacyApplications,
  createBackupJsonString,
  getImportLedger,
  importApplicationsToCloud,
  removeImportedFromLocalStorage,
  type LegacyDetectionResult,
  type ImportSummary,
} from '@/lib/local-import'
import type { JobApplication } from '@/types/dashboard'
import { toast } from 'sonner'
import { useAuth } from '@/context/useAuth'

interface LocalDataMigrationBannerProps {
  onImportComplete?: () => Promise<void> | void
}

export function LocalDataMigrationBanner({
  onImportComplete,
}: LocalDataMigrationBannerProps) {
  const { user } = useAuth()
  const [detection, setDetection] = useState<LegacyDetectionResult | null>(() =>
    detectLegacyApplications()
  )
  const [unimportedRecords, setUnimportedRecords] = useState<JobApplication[]>(() => {
    const result = detectLegacyApplications()
    if (!result.hasLegacyData) return []
    const ledger = getImportLedger()
    return result.customRecords.filter((app) => !ledger[app.id])
  })
  const [isDismissed, setIsDismissed] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; name: string } | null>(null)
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)

  if (!user || isDismissed || !detection || unimportedRecords.length === 0) {
    return null
  }

  const handleDownloadBackup = () => {
    try {
      const jsonStr = createBackupJsonString(unimportedRecords)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `applyflow-local-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Backup downloaded', {
        description: 'Your local application data has been saved to your downloads.',
      })
    } catch {
      toast.error('Failed to create download backup')
    }
  }

  const handleStartImport = async () => {
    setIsImporting(true)
    setImportProgress({ current: 0, total: unimportedRecords.length, name: '' })

    try {
      const summary = await importApplicationsToCloud(
        unimportedRecords,
        (current, total, item) => {
          setImportProgress({
            current,
            total,
            name: `${item.role} at ${item.company}`,
          })
        }
      )

      setImportSummary(summary)

      if (summary.succeeded.length > 0) {
        toast.success(`Imported ${summary.succeeded.length} application(s) to cloud!`)
        await onImportComplete?.()
      }

      if (summary.failed.length > 0) {
        toast.error(`Failed to import ${summary.failed.length} application(s)`, {
          description: summary.failed[0].error,
        })
      }
    } catch {
      toast.error('Unexpected error during cloud import')
    } finally {
      setIsImporting(false)
      setImportProgress(null)
    }
  }

  const handleClearLocalData = () => {
    if (!importSummary) return

    const succeededIds = importSummary.succeeded.map((s) => s.legacyId)
    removeImportedFromLocalStorage(succeededIds)

    // Re-check detection
    const refreshed = detectLegacyApplications()
    setDetection(refreshed)
    const ledger = getImportLedger()
    const pending = refreshed.customRecords.filter((app) => !ledger[app.id])
    setUnimportedRecords(pending)

    setIsDialogOpen(false)
    toast.success('Local copies cleared', {
      description: 'Imported applications are now safely stored in your cloud account.',
    })
  }

  return (
    <>
      {/* Banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-slate-800 shadow-2xs mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-2xs mt-0.5 sm:mt-0">
              <CloudUpload className="size-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <span>Local application records detected</span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-800">
                  {unimportedRecords.length} record{unimportedRecords.length === 1 ? '' : 's'}
                </span>
              </h4>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                You have {unimportedRecords.length} application(s) saved in this browser.
                Migrate them to your cloud account to access them anywhere.
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
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 cursor-pointer shadow-2xs gap-1.5"
            >
              <CloudUpload className="size-3.5" />
              <span>Migrate to cloud</span>
            </Button>

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-blue-100/60 transition-colors cursor-pointer"
              aria-label="Dismiss banner"
              title="Dismiss for this session"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Migration Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-900 flex items-center gap-2">
              <HardDrive className="size-5 text-blue-600" />
              <span>Migrate applications to cloud</span>
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs mt-1">
              Transfer your locally saved applications to your PostgreSQL account.
              Existing cloud records will never be overwritten.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {!importSummary ? (
              <>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 max-h-48 overflow-y-auto space-y-2">
                  <div className="text-xs font-semibold text-slate-700">
                    Ready to import ({unimportedRecords.length}):
                  </div>
                  {unimportedRecords.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between text-xs py-1 border-b border-slate-200/60 last:border-0"
                    >
                      <span className="font-medium text-slate-900 truncate">
                        {app.company}
                      </span>
                      <span className="text-slate-500 truncate ml-2">
                        {app.role}
                      </span>
                    </div>
                  ))}
                </div>

                {isImporting && importProgress && (
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-blue-900 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Importing to database...</span>
                      </span>
                      <span>
                        {importProgress.current} / {importProgress.total}
                      </span>
                    </div>
                    <p className="text-[11px] text-blue-700 truncate">
                      {importProgress.name}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                    <CheckCircle2 className="size-4" />
                    <span>Migration complete</span>
                  </div>
                  <p className="text-xs text-emerald-700">
                    Successfully migrated {importSummary.succeeded.length} application(s).
                  </p>
                </div>

                {importSummary.failed.length > 0 && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-1">
                    <div className="flex items-center gap-2 text-amber-800 text-xs font-semibold">
                      <AlertTriangle className="size-4" />
                      <span>{importSummary.failed.length} record(s) failed</span>
                    </div>
                    <p className="text-xs text-amber-700">
                      Failed records were retained in local storage so you can retry.
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
                  disabled={isImporting || unimportedRecords.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <CloudUpload className="size-3.5" />
                      <span>Import {unimportedRecords.length} records</span>
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
                <Button
                  size="sm"
                  onClick={handleClearLocalData}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs"
                >
                  Clear local records
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
