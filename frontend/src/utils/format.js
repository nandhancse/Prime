export function formatDuration(totalSeconds = 0) {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`
  return `${remainingSeconds}s`
}

export function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatTime(value) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const POUNDS_PER_KILOGRAM = 2.2046226218

export function displayWeight(valueKg = 0, unit = 'kg') {
  const value = Number(valueKg)
  return unit === 'lb' ? value * POUNDS_PER_KILOGRAM : value
}

export function storedWeight(value = 0, unit = 'kg') {
  const numeric = Number(value)
  return unit === 'lb' ? numeric / POUNDS_PER_KILOGRAM : numeric
}

export function formatWeight(valueKg = 0, unit = 'kg') {
  return `${displayWeight(valueKg, unit).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`
}

export function formatVolume(value = 0, unit = 'kg') {
  return `${displayWeight(value, unit).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`
}
