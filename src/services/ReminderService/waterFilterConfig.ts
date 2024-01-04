export type WaterFilterInspection = {
  label: string
  entityId: string
  interval: number
}

export const inspections: WaterFilterInspection[] = [
  {
    label: 'two prefilters',
    entityId: 'input_datetime.kitchenfilterservice',
    interval: 120,
  },
  {
    label: 'membrane filter',
    entityId: 'input_datetime.kitchenmembranefilterservice',
    interval: 485,
  },
  {
    label: 'mineralization filter',
    entityId: 'input_datetime.kitchenfinalfilterservice',
    interval: 365,
  },
]

export const getDaysToNextInspection = (
  lastInspectionValue = '',
  interval: number,
): number => {
  const today = new Date()
  const deadline = new Date(lastInspectionValue)
  deadline.setDate(deadline.getDate() + interval)
  return Math.ceil((deadline.getTime() - today.getTime()) / 86400000)
}
