/** Formats a duration in seconds as "T+HH:MM:SS". */
export function formatElapsed(totalSeconds: number): string {
  const seconds = Math.floor(totalSeconds)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return `T+${pad(hours)}:${pad(minutes)}:${pad(secs)}`
}
