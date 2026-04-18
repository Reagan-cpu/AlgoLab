import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

export const ACCESS_TOKEN_STORAGE_KEY = 'algolab_access_token'
export const ACCESS_TOKEN_COOKIE_KEY = 'algolab_access_token'
export const USER_ROLE_COOKIE_KEY = 'algolab_user_role'

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000').replace(/\/$/, '')

let inMemoryAccessToken: string | null = null
let refreshPromise: Promise<string | null> | null = null

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
}

export type UserRole = 'student' | 'instructor' | 'admin'

export interface AuthResponse {
  user: AuthUser
  accessToken: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  role: UserRole
}

interface BackendExperiment {
  _id: string
  algorithm: string
  mode: string
  arraySize: number
  executionTime: number
  comparisons: number
  operations: number
  dataType: string
  metadata?: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export interface ExperimentRecord {
  id: string
  algorithm: string
  mode: string
  arraySize: number
  executionTime: number
  comparisons: number
  operations: number
  dataType: string
  metadata?: Record<string, unknown> | null
  createdAt: string
  timestamp: number
}

export interface ExperimentPayload {
  algorithm: string
  mode: string
  arraySize: number
  executionTime: number
  comparisons: number
  operations: number
  dataType: string
  metadata?: Record<string, unknown>
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export const EXPERIMENTS_MAX_LIMIT = 100

export interface ExperimentListParams {
  page?: number
  limit?: number
  sortBy?: 'newest' | 'fastest' | 'algorithm'
  algorithm?: string
  mode?: string
}

interface BackendReport {
  _id?: string
  id?: string
  userId?: string
  experimentId?: string
  fileName: string
  mimeType: string
  size: number
  createdAt: string
  updatedAt?: string
}

interface BackendUser {
  _id: string
  name: string
  email: string
  role: UserRole
  createdAt: string
  updatedAt: string
}

export interface AdminUser {
  id: string
  name: string
  email: string
  role: UserRole
  createdAt: string
}

export interface AdminAnalytics {
  totalUsers: number
  totalExperiments: number
  totalReports: number
  usersByRole: {
    student: number
    instructor: number
    admin: number
  }
}

export interface ReportRecord {
  id: string
  userId: string
  experimentId: string
  fileName: string
  mimeType: string
  size: number
  createdAt: string
}

export interface PixelValue {
  r: number
  g: number
  b: number
  a: number
}

export interface UploadedImageData {
  width: number
  height: number
  pixels: PixelValue[]
}

function setMiddlewareCookie(token: string | null) {
  if (typeof document === 'undefined') {
    return
  }

  const secure = window.location.protocol === 'https:' ? '; Secure' : ''

  if (!token) {
    document.cookie = `${ACCESS_TOKEN_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax${secure}`
    return
  }

  document.cookie = `${ACCESS_TOKEN_COOKIE_KEY}=${encodeURIComponent(token)}; Path=/; Max-Age=604800; SameSite=Lax${secure}`
}

function setRoleCookie(role: UserRole | null) {
  if (typeof document === 'undefined') {
    return
  }

  const secure = window.location.protocol === 'https:' ? '; Secure' : ''

  if (!role) {
    document.cookie = `${USER_ROLE_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax${secure}`
    return
  }

  document.cookie = `${USER_ROLE_COOKIE_KEY}=${encodeURIComponent(role)}; Path=/; Max-Age=604800; SameSite=Lax${secure}`
}

export function setUserRole(role: UserRole | null) {
  setRoleCookie(role)
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return inMemoryAccessToken
  }

  if (!inMemoryAccessToken) {
    inMemoryAccessToken = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
  }

  return inMemoryAccessToken
}

export function setAccessToken(token: string | null) {
  inMemoryAccessToken = token

  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token)
    } else {
      localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
    }
  }

  setMiddlewareCookie(token)
}

function normalizeExperiment(item: BackendExperiment): ExperimentRecord {
  return {
    id: item._id,
    algorithm: item.algorithm,
    mode: item.mode,
    arraySize: item.arraySize,
    executionTime: item.executionTime,
    comparisons: item.comparisons,
    operations: item.operations,
    dataType: item.dataType,
    metadata: item.metadata,
    createdAt: item.createdAt,
    timestamp: new Date(item.createdAt).getTime(),
  }
}

function normalizeReport(item: BackendReport): ReportRecord {
  const resolvedId = item._id ?? item.id ?? ''

  return {
    id: resolvedId,
    userId: item.userId ?? '',
    experimentId: item.experimentId ?? '',
    fileName: item.fileName,
    mimeType: item.mimeType,
    size: item.size,
    createdAt: item.createdAt,
  }
}

function normalizeUser(item: BackendUser): AdminUser {
  return {
    id: item._id,
    name: item.name,
    email: item.email,
    role: item.role,
    createdAt: item.createdAt,
  }
}

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<AuthResponse>(
        `${API_BASE_URL}/api/auth/refresh`,
        {},
        {
          withCredentials: true,
        }
      )
      .then((response) => {
        const token = response.data.accessToken
        setAccessToken(token)
        setUserRole(response.data.user.role)
        return token
      })
      .catch(() => {
        setAccessToken(null)
        setUserRole(null)
        return null
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined

    if (!originalRequest) {
      return Promise.reject(error)
    }

    const isAuthRoute =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/signup') ||
      originalRequest.url?.includes('/auth/refresh')

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true
      const refreshedToken = await refreshAccessToken()

      if (refreshedToken) {
        originalRequest.headers.Authorization = `Bearer ${refreshedToken}`
        return api(originalRequest)
      }
    }

    return Promise.reject(error)
  }
)

interface ApiErrorPayload {
  message?: string
  code?: string
  details?: Record<string, string[] | string | undefined>
}

function extractValidationDetail(details: ApiErrorPayload['details']): string | null {
  if (!details) {
    return null
  }

  for (const value of Object.values(details)) {
    if (Array.isArray(value) && value.length > 0) {
      return value[0]
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      return value
    }
  }

  return null
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as ApiErrorPayload | undefined
    const validationDetail = extractValidationDetail(payload?.details)

    if (validationDetail) {
      return validationDetail
    }

    return payload?.message ?? error.message ?? fallback
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', payload)
  setAccessToken(data.accessToken)
  setUserRole(data.user.role)
  return data
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', payload)
  setAccessToken(data.accessToken)
  setUserRole(data.user.role)
  return data
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
  setAccessToken(null)
  setUserRole(null)
}

export async function getCurrentUser(): Promise<AuthUser> {
  const { data } = await api.get<{ user: AuthUser }>('/auth/me')
  setUserRole(data.user.role)
  return data.user
}

export async function createExperiment(payload: ExperimentPayload): Promise<ExperimentRecord> {
  const { data } = await api.post<{ experiment: BackendExperiment }>('/experiments', payload)
  return normalizeExperiment(data.experiment)
}

function normalizeExperimentListParams(params?: ExperimentListParams) {
  return {
    page: Math.max(1, params?.page ?? 1),
    limit: Math.min(EXPERIMENTS_MAX_LIMIT, Math.max(1, params?.limit ?? 20)),
    sortBy: params?.sortBy,
    algorithm: params?.algorithm,
    mode: params?.mode,
  }
}

export async function listExperiments(params?: ExperimentListParams): Promise<PaginatedResponse<ExperimentRecord>> {
  const { data } = await api.get<PaginatedResponse<BackendExperiment>>('/experiments', {
    params: normalizeExperimentListParams(params),
  })

  return {
    ...data,
    items: data.items.map(normalizeExperiment),
  }
}

export async function listAllExperiments(params?: ExperimentListParams): Promise<PaginatedResponse<ExperimentRecord>> {
  const { data } = await api.get<PaginatedResponse<BackendExperiment>>('/experiments/all', {
    params: normalizeExperimentListParams(params),
  })

  return {
    ...data,
    items: data.items.map(normalizeExperiment),
  }
}

export async function getExperimentById(id: string): Promise<ExperimentRecord> {
  const { data } = await api.get<{ experiment: BackendExperiment }>(`/experiments/${id}`)
  return normalizeExperiment(data.experiment)
}

export async function deleteExperimentById(id: string): Promise<void> {
  await api.delete(`/experiments/${id}`)
}

export async function createReport(experimentId: string): Promise<ReportRecord> {
  const { data } = await api.post<{ report: BackendReport }>('/reports', {
    experimentId,
  })

  return normalizeReport(data.report)
}

export async function listReports(params?: { page?: number; limit?: number }): Promise<PaginatedResponse<ReportRecord>> {
  const { data } = await api.get<PaginatedResponse<BackendReport>>('/reports', {
    params,
  })

  return {
    ...data,
    items: data.items.map(normalizeReport),
  }
}

export async function getReportById(id: string): Promise<ReportRecord> {
  const { data } = await api.get<{ report: BackendReport }>(`/reports/${id}`)
  return normalizeReport(data.report)
}

function decodeBase64PdfBlob(rawText: string): Blob | null {
  const trimmed = rawText.trim().replace(/^"|"$/g, '')

  if (!trimmed || /[^A-Za-z0-9+/=\r\n]/.test(trimmed)) {
    return null
  }

  try {
    const normalized = trimmed.replace(/\s+/g, '')
    const binary = atob(normalized)
    const bytes = new Uint8Array(binary.length)

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }

    const header = new TextDecoder('utf-8').decode(bytes.subarray(0, 4))

    if (header !== '%PDF') {
      return null
    }

    return new Blob([bytes], { type: 'application/pdf' })
  } catch {
    return null
  }
}

export async function downloadReportById(id: string): Promise<{ blob: Blob; fileName: string }> {
  const response = await api.get<Blob>(`/reports/${id}/download`, {
    responseType: 'blob',
  })

  const disposition = response.headers['content-disposition']
  const match = disposition?.match(/filename=\"?([^\";]+)\"?/)
  const fileName = match?.[1] ?? `report-${id}.pdf`
  const contentType = String(response.headers['content-type'] ?? response.data.type ?? '')

  if (contentType.includes('application/json')) {
    const text = await response.data.text()

    try {
      const payload = JSON.parse(text) as { message?: string }
      throw new Error(payload.message ?? 'Failed to download report')
    } catch {
      throw new Error('Failed to download report')
    }
  }

  const preview = await response.data
    .slice(0, 64)
    .text()
    .catch(() => '')

  const looksLikeBase64Pdf = /^"?JVBER/i.test(preview.trim())
  const decodedBlob = looksLikeBase64Pdf
    ? await response.data
        .text()
        .then((textPayload) => decodeBase64PdfBlob(textPayload))
        .catch(() => null)
    : null

  return {
    blob: decodedBlob ?? response.data,
    fileName,
  }
}

export async function uploadImage(file: File): Promise<UploadedImageData> {
  const formData = new FormData()
  formData.append('image', file)

  const { data } = await api.post<{ image: UploadedImageData }>('/upload-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return data.image
}

export async function getClassAnalytics(params?: {
  algorithm?: string
  mode?: string
  dateFrom?: string
  dateTo?: string
}) {
  const { data } = await api.get('/analytics/class', {
    params,
  })

  return data as {
    series: Array<{
      algorithm: string
      points: Array<{
        inputSize: number
        executionTime: number
        comparisons: number
        operations: number
        runs: number
      }>
    }>
  }
}

export async function listUsers(params?: { page?: number; limit?: number }) {
  const page = Math.max(1, params?.page ?? 1)
  const limit = Math.min(100, Math.max(1, params?.limit ?? 20))

  const { data } = await api.get<PaginatedResponse<BackendUser>>('/admin/users', {
    params: {
      page,
      limit,
    },
  })

  return {
    ...data,
    items: data.items.map(normalizeUser),
  }
}

export async function updateUserRole(id: string, role: UserRole) {
  const { data } = await api.patch<{ user: BackendUser }>(`/admin/users/${id}/role`, {
    role,
  })

  return normalizeUser(data.user)
}

export async function deleteUserById(id: string) {
  await api.delete(`/admin/users/${id}`)
}

export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  const { data } = await api.get<{ analytics: AdminAnalytics }>('/admin/analytics')

  return data.analytics
}

export { api }
