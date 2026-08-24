"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { useAuth } from "@/components/auth-context"
import { apiRequest } from "@/lib/api-client"

export type DashboardMarketNewsEvent = {
  id: string
  date: string
  country: string
  currency: string
  event: string
  category: string
  actual: string
  forecast: string
  previous: string
  importance: number
  source: string
}

type MarketNewsResponse = {
  events: DashboardMarketNewsEvent[]
  limited: boolean
}

let newsCache: MarketNewsResponse | null = null
let newsRequest: Promise<MarketNewsResponse> | null = null
const profileCache = new Map<string, string>()
const profileRequests = new Map<string, Promise<string | null>>()

function cleanUsername(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/^@/, "").replace(/[^a-z0-9_.]/g, "").slice(0, 30) || "trader"
}

function requestNews(force = false) {
  if (!force && newsCache) return Promise.resolve(newsCache)
  if (!force && newsRequest) return newsRequest

  newsRequest = apiRequest<MarketNewsResponse>("/api/market-news")
    .then((response) => {
      newsCache = { events: response.events ?? [], limited: Boolean(response.limited) }
      return newsCache
    })
    .finally(() => {
      newsRequest = null
    })
  return newsRequest
}

function requestUsername(userId: string) {
  const cached = profileCache.get(userId)
  if (cached) return Promise.resolve(cached)
  const pending = profileRequests.get(userId)
  if (pending) return pending

  const request = apiRequest<{ profile?: { username?: string | null } }>("/api/profile")
    .then(({ profile }) => {
      const username = profile?.username ? cleanUsername(profile.username) : null
      if (username) profileCache.set(userId, username)
      return username
    })
    .finally(() => profileRequests.delete(userId))
  profileRequests.set(userId, request)
  return request
}

export function useDashboardShellData() {
  const { user } = useAuth()
  const fallbackUsername = useMemo(() => cleanUsername(user?.user_metadata.user_name ?? user?.user_metadata.preferred_username ?? user?.email?.split("@")[0]), [user])
  const [username, setUsername] = useState(() => user?.id ? profileCache.get(user.id) ?? fallbackUsername : fallbackUsername)
  const [news, setNews] = useState<DashboardMarketNewsEvent[]>(() => newsCache?.events ?? [])
  const [newsLimited, setNewsLimited] = useState(() => newsCache?.limited ?? false)
  const [newsLoading, setNewsLoading] = useState(() => !newsCache)

  useEffect(() => {
    setUsername(user?.id ? profileCache.get(user.id) ?? fallbackUsername : fallbackUsername)
    if (!user?.id) return
    let active = true
    void requestUsername(user.id).then((value) => {
      if (active && value) setUsername(value)
    }).catch(() => undefined)
    return () => { active = false }
  }, [fallbackUsername, user?.id])

  const loadNews = useCallback(async (force = false) => {
    if (force || !newsCache) setNewsLoading(true)
    try {
      const response = await requestNews(force)
      setNews(response.events)
      setNewsLimited(response.limited)
    } catch {
      if (!newsCache) {
        setNews([])
        setNewsLimited(false)
      }
    } finally {
      setNewsLoading(false)
    }
  }, [])

  useEffect(() => { void loadNews() }, [loadNews])

  return { username, news, newsLimited, newsLoading, refreshNews: () => loadNews(true) }
}
