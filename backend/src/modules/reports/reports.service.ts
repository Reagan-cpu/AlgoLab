import { Types } from "mongoose"

import { UserRole } from "../../constants/roles"
import { AppError } from "../../utils/http-error"
import { buildExperimentPdf } from "../../utils/pdf/build-experiment-pdf"
import { ExperimentModel } from "../experiments/experiment.model"
import { ListReportsQueryDto } from "./reports.dto"
import { ReportModel } from "./report.model"

function buildScopeFilter(userId: string, role: UserRole): Record<string, unknown> {
  if (role === "admin") {
    return {}
  }

  return { userId: new Types.ObjectId(userId) }
}

export async function generateExperimentReport(userId: string, role: UserRole, experimentId: string) {
  const experimentFilter: Record<string, unknown> = {
    _id: experimentId,
    ...buildScopeFilter(userId, role),
  }

  const experiment = await ExperimentModel.findOne(experimentFilter).lean()

  if (!experiment) {
    throw new AppError("Experiment not found", 404, "EXPERIMENT_NOT_FOUND")
  }

  const pdfBuffer = await buildExperimentPdf({
    id: String(experiment._id),
    algorithm: experiment.algorithm,
    mode: experiment.mode,
    arraySize: experiment.arraySize,
    executionTime: experiment.executionTime,
    comparisons: experiment.comparisons,
    operations: experiment.operations,
    dataType: experiment.dataType,
    createdAt: new Date(experiment.createdAt),
  })

  const report = await ReportModel.create({
    userId: experiment.userId,
    experimentId: experiment._id,
    fileName: `${experiment.algorithm.toLowerCase()}-${String(experiment._id)}.pdf`,
    mimeType: "application/pdf",
    size: pdfBuffer.byteLength,
    pdfData: pdfBuffer,
  })

  return {
    id: String(report._id),
    fileName: report.fileName,
    mimeType: report.mimeType,
    size: report.size,
    createdAt: report.createdAt,
  }
}

export async function listReports(userId: string, role: UserRole, query: ListReportsQueryDto) {
  const filter: Record<string, unknown> = {
    ...buildScopeFilter(userId, role),
  }

  const skip = (query.page - 1) * query.limit

  const [items, total] = await Promise.all([
    ReportModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .select("-pdfData")
      .lean(),
    ReportModel.countDocuments(filter),
  ])

  return {
    items,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit),
  }
}

export async function downloadReport(userId: string, role: UserRole, reportId: string) {
  const filter: Record<string, unknown> = {
    _id: reportId,
    ...buildScopeFilter(userId, role),
  }

  // Keep this as a mongoose document so Buffer fields stay as raw bytes.
  const report = await ReportModel.findOne(filter).select("+pdfData")

  if (!report) {
    throw new AppError("Report not found", 404, "REPORT_NOT_FOUND")
  }

  return report
}

export async function getReportById(userId: string, role: UserRole, reportId: string) {
  const filter: Record<string, unknown> = {
    _id: reportId,
    ...buildScopeFilter(userId, role),
  }

  const report = await ReportModel.findOne(filter).select("-pdfData").lean()

  if (!report) {
    throw new AppError("Report not found", 404, "REPORT_NOT_FOUND")
  }

  return report
}

export async function deleteReport(userId: string, role: UserRole, reportId: string) {
  const filter: Record<string, unknown> = {
    _id: reportId,
    ...buildScopeFilter(userId, role),
  }

  const report = await ReportModel.findOneAndDelete(filter)

  if (!report) {
    throw new AppError("Report not found", 404, "REPORT_NOT_FOUND")
  }
}
