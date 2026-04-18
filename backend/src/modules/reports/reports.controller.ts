import { Request, Response } from "express"

import { asyncHandler } from "../../utils/async-handler"
import { AppError } from "../../utils/http-error"
import { CreateReportDto, ListReportsQueryDto } from "./reports.dto"
import {
  deleteReport,
  downloadReport,
  generateExperimentReport,
  getReportById,
  listReports,
} from "./reports.service"

function toPdfBuffer(pdfData: unknown): Buffer {
  if (Buffer.isBuffer(pdfData)) {
    return pdfData
  }

  if (pdfData instanceof Uint8Array) {
    return Buffer.from(pdfData)
  }

  if (typeof pdfData === "string") {
    const trimmed = pdfData.trim().replace(/^"|"$/g, "")
    const decoded = Buffer.from(trimmed, "base64")

    if (decoded.subarray(0, 4).toString("utf8") === "%PDF") {
      return decoded
    }

    return Buffer.from(trimmed)
  }

  if (pdfData && typeof pdfData === "object") {
    const candidate = pdfData as {
      data?: number[]
      buffer?: unknown
      type?: string
    }

    if (Array.isArray(candidate.data)) {
      return Buffer.from(candidate.data)
    }

    if (candidate.buffer instanceof Uint8Array) {
      return Buffer.from(candidate.buffer)
    }

    if (candidate.buffer instanceof ArrayBuffer) {
      return Buffer.from(candidate.buffer)
    }

    if (candidate.type === "Buffer" && Array.isArray(candidate.data)) {
      return Buffer.from(candidate.data)
    }
  }

  throw new AppError("Report data is not a valid PDF payload", 500, "INVALID_REPORT_DATA")
}

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError("Authentication required", 401, "UNAUTHENTICATED")
  }

  return req.user
}

export const generateReportController = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req)
  const { experimentId } = req.params as { experimentId: string }

  const report = await generateExperimentReport(user.userId, user.role, experimentId)

  return res.status(201).json({ report })
})

export const createReportController = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req)
  const { experimentId } = req.body as CreateReportDto

  const report = await generateExperimentReport(user.userId, user.role, experimentId)

  return res.status(201).json({ report })
})

export const listReportsController = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req)
  const query = req.query as unknown as ListReportsQueryDto

  const result = await listReports(user.userId, user.role, query)

  return res.status(200).json(result)
})

export const getReportController = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req)
  const { reportId } = req.params as { reportId: string }

  const report = await getReportById(user.userId, user.role, reportId)

  return res.status(200).json({ report })
})

export const downloadReportController = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req)
  const { reportId } = req.params as { reportId: string }

  const report = await downloadReport(user.userId, user.role, reportId)
  const pdfBuffer = toPdfBuffer(report.pdfData)

  res.setHeader("Content-Type", report.mimeType || "application/pdf")
  res.setHeader("Content-Disposition", `attachment; filename=\"${report.fileName}\"`)
  res.setHeader("Content-Length", String(pdfBuffer.byteLength))

  return res.status(200).send(pdfBuffer)
})

export const deleteReportController = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req)
  const { reportId } = req.params as { reportId: string }

  await deleteReport(user.userId, user.role, reportId)

  return res.status(200).json({ message: "Report deleted" })
})
