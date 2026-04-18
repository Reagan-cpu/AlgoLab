'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { WorkspaceShell } from '@/components/layout/workspace-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  createReport,
  downloadReportById,
  getApiErrorMessage,
  listExperiments,
  listReports,
  type ExperimentRecord,
  type ReportRecord,
} from '@/lib/api'
import { toast } from 'sonner'
import { FileText, Download, RefreshCw } from 'lucide-react'

export default function ReportsPage() {
  const [experiments, setExperiments] = useState<ExperimentRecord[]>([])
  const [reports, setReports] = useState<ReportRecord[]>([])
  const [selectedExperimentId, setSelectedExperimentId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null)

  const selectedExperiment = useMemo(
    () => experiments.find((experiment) => experiment.id === selectedExperimentId) ?? null,
    [experiments, selectedExperimentId]
  )

  const loadPageData = async () => {
    setIsLoading(true)
    try {
      const [experimentResponse, reportResponse] = await Promise.all([
        listExperiments({ sortBy: 'newest', limit: 100 }),
        listReports({ limit: 100 }),
      ])

      setExperiments(experimentResponse.items)
      setReports(reportResponse.items)

      if (experimentResponse.items.length > 0) {
        setSelectedExperimentId((current) => current || experimentResponse.items[0].id)
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load reports data'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadPageData()
  }, [])

  const handleGenerateReport = async () => {
    if (!selectedExperimentId) {
      toast.error('Select an experiment first')
      return
    }

    try {
      setIsGenerating(true)
      const report = await createReport(selectedExperimentId)
      setReports((previous) => [report, ...previous])
      toast.success('Report generated successfully')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to generate report'))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRefreshReports = async () => {
    try {
      setIsRefreshing(true)
      const response = await listReports({ limit: 100 })
      setReports(response.items)
      toast.success('Reports refreshed')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to refresh reports'))
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleDownload = async (reportId: string) => {
    if (!reportId) {
      toast.error('This report cannot be downloaded because its id is missing')
      return
    }

    try {
      setDownloadingReportId(reportId)
      const { blob, fileName } = await downloadReportById(reportId)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to download report'))
    } finally {
      setDownloadingReportId(null)
    }
  }

  return (
    <WorkspaceShell
      title="Reports"
      description="Generate downloadable PDF reports from experiments and manage previously saved exports."
    >
      <div className="space-y-8">
        <Card className="glass-card mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Generate New Report</h2>

          {isLoading ? (
            <p className="text-foreground/60">Loading experiments...</p>
          ) : experiments.length === 0 ? (
            <p className="text-foreground/60">No experiments available yet. Run an algorithm first.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-foreground/70 mb-2">Select Experiment</p>
                <Select value={selectedExperimentId} onValueChange={setSelectedExperimentId}>
                  <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
                    <SelectValue placeholder="Choose an experiment" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border/50">
                    {experiments.map((experiment) => (
                      <SelectItem key={experiment.id} value={experiment.id}>
                        {experiment.algorithm} | size {experiment.arraySize} | {new Date(experiment.createdAt).toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedExperiment && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="glass p-3 rounded-lg">
                    <p className="text-foreground/60 text-xs mb-1">Algorithm</p>
                    <p className="font-semibold text-foreground">{selectedExperiment.algorithm}</p>
                  </div>
                  <div className="glass p-3 rounded-lg">
                    <p className="text-foreground/60 text-xs mb-1">Array Size</p>
                    <p className="font-semibold text-foreground">{selectedExperiment.arraySize}</p>
                  </div>
                  <div className="glass p-3 rounded-lg">
                    <p className="text-foreground/60 text-xs mb-1">Time</p>
                    <p className="font-semibold text-primary">{selectedExperiment.executionTime}ms</p>
                  </div>
                  <div className="glass p-3 rounded-lg">
                    <p className="text-foreground/60 text-xs mb-1">Comparisons</p>
                    <p className="font-semibold text-accent">{selectedExperiment.comparisons}</p>
                  </div>
                </div>
              )}

              <Button
                onClick={() => void handleGenerateReport()}
                disabled={isGenerating || !selectedExperimentId}
                className="bg-primary hover:bg-primary/90 text-foreground"
              >
                <Download className="w-4 h-4 mr-2" />
                {isGenerating ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>
          )}
        </Card>

        <Card className="glass-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Generated Reports</h2>
            <Button
              variant="outline"
              className="border-border/50 text-foreground hover:bg-card/50"
              onClick={() => void handleRefreshReports()}
              disabled={isRefreshing}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>

          {reports.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Reports Yet</h3>
              <p className="text-foreground/60">Generate your first report from an experiment above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id || `${report.fileName}-${report.createdAt}`}
                  className="glass rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div>
                    <p className="font-semibold text-foreground">{report.fileName}</p>
                    <p className="text-xs text-foreground/60">
                      {new Date(report.createdAt).toLocaleString()} | {(report.size / 1024).toFixed(1)} KB
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    className="border-border/50 text-foreground hover:bg-card/50"
                    onClick={() => void handleDownload(report.id)}
                    disabled={downloadingReportId === report.id || !report.id}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {downloadingReportId === report.id ? 'Downloading...' : 'Download PDF'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </WorkspaceShell>
  )
}
