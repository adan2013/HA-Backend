import addLeadingZero from './addLeadingZero'

export default (date: Date = new Date()): string => {
  const hr = addLeadingZero(date.getHours())
  const min = addLeadingZero(date.getMinutes())
  const d = addLeadingZero(date.getDate())
  const m = addLeadingZero(date.getMonth() + 1)
  const y = date.getFullYear()
  return `${hr}:${min} ${d}-${m}-${y}`
}
