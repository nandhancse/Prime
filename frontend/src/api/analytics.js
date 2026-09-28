import api from './axios.js'


export async function getDashboardAnalytics() {
  const response = await api.get('analytics/dashboard/')
  return response.data
}

export async function getXpSummary() {
  const response = await api.get('analytics/xp/')
  return response.data
}

export async function getStreakSummary() {
  const response = await api.get('analytics/streak/')
  return response.data
}
