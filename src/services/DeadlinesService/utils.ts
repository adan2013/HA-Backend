export const getDaysToDeadline = (
  lastUpdate = '',
  interval: number,
): number => {
  const today = new Date()
  const deadline = new Date(lastUpdate)
  deadline.setDate(deadline.getDate() + interval)
  return Math.ceil((deadline.getTime() - today.getTime()) / 86400000)
}
