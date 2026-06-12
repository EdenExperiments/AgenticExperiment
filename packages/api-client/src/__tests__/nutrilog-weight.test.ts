import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createWeightLog,
  listWeightLogs,
  getWeightChart,
  deleteWeightLog,
  ApiRequestError,
} from '../client'
import type { WeightLog, WeightChartResponse } from '../types'

const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
})

function okJson(body: unknown) {
  return { ok: true, status: 200, json: async () => body }
}

function createdJson(body: unknown) {
  return { ok: true, status: 201, json: async () => body }
}

function noContent() {
  return { ok: true, status: 204, json: async () => undefined }
}

function errJson(body: unknown, status = 400) {
  return { ok: false, status, json: async () => body }
}

const weightLog: WeightLog = {
  id: 'wl-1',
  weight_kg: 72.5,
  note: 'Morning weigh-in',
  measured_at: '2026-06-12T08:00:00Z',
  created_at: '2026-06-12T08:00:01Z',
}

const chartResponse: WeightChartResponse = {
  days: 30,
  unit: 'kg',
  data: [
    { date: '2026-05-14', weight_kg: null },
    { date: '2026-06-12', weight_kg: 72.5 },
  ],
}

describe('createWeightLog', () => {
  it('POST /api/v1/nutrilog/weight-logs with JSON body', async () => {
    mockFetch.mockResolvedValueOnce(createdJson(weightLog))
    const result = await createWeightLog({
      weight_kg: 72.5,
      note: 'Morning weigh-in',
      measured_at: '2026-06-12T08:00:00Z',
    })
    expect(result).toEqual(weightLog)
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/nutrilog/weight-logs', {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify({
        weight_kg: 72.5,
        note: 'Morning weigh-in',
        measured_at: '2026-06-12T08:00:00Z',
      }),
    })
  })

  it('sends only weight_kg when optional fields omitted', async () => {
    mockFetch.mockResolvedValueOnce(createdJson(weightLog))
    await createWeightLog({ weight_kg: 72.5 })
    const [, init] = mockFetch.mock.calls[0]
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ weight_kg: 72.5 })
  })

  it('throws ApiRequestError on non-OK response', async () => {
    mockFetch.mockResolvedValueOnce(errJson({ error: 'invalid weight' }, 422))
    await expect(createWeightLog({ weight_kg: -1 })).rejects.toBeInstanceOf(ApiRequestError)
  })
})

describe('listWeightLogs', () => {
  it('GET /api/v1/nutrilog/weight-logs without limit', async () => {
    mockFetch.mockResolvedValueOnce(okJson([weightLog]))
    const result = await listWeightLogs()
    expect(result).toEqual([weightLog])
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/nutrilog/weight-logs', {
      headers: { 'Content-Type': 'application/json' },
    })
  })

  it('GET /api/v1/nutrilog/weight-logs?limit=N', async () => {
    mockFetch.mockResolvedValueOnce(okJson([weightLog]))
    await listWeightLogs({ limit: 10 })
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/nutrilog/weight-logs?limit=10', {
      headers: { 'Content-Type': 'application/json' },
    })
  })
})

describe('getWeightChart', () => {
  it('GET /api/v1/nutrilog/weight-chart without days', async () => {
    mockFetch.mockResolvedValueOnce(okJson(chartResponse))
    const result = await getWeightChart()
    expect(result).toEqual(chartResponse)
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/nutrilog/weight-chart', {
      headers: { 'Content-Type': 'application/json' },
    })
  })

  it('GET /api/v1/nutrilog/weight-chart?days=N', async () => {
    mockFetch.mockResolvedValueOnce(okJson(chartResponse))
    await getWeightChart(30)
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/nutrilog/weight-chart?days=30', {
      headers: { 'Content-Type': 'application/json' },
    })
  })
})

describe('deleteWeightLog', () => {
  it('DELETE /api/v1/nutrilog/weight-logs/{id} expects 204', async () => {
    mockFetch.mockResolvedValueOnce(noContent())
    await deleteWeightLog('wl-1')
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/nutrilog/weight-logs/wl-1', {
      headers: { 'Content-Type': 'application/json' },
      method: 'DELETE',
    })
  })

  it('throws ApiRequestError on 404', async () => {
    mockFetch.mockResolvedValueOnce(errJson({ error: 'not found' }, 404))
    await expect(deleteWeightLog('missing')).rejects.toBeInstanceOf(ApiRequestError)
  })
})
