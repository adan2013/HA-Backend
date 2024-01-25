import { DeadlineConfig } from './utils'

export const deadlines: DeadlineConfig[] = [
  {
    label: 'water prefilters',
    entityId: 'input_datetime.kitchenfilterservice',
    interval: 120,
    warningThreshold: 10,
  },
  {
    label: 'membrane water filter',
    entityId: 'input_datetime.kitchenmembranefilterservice',
    interval: 485,
    warningThreshold: 10,
  },
  {
    label: 'mineralization water filter',
    entityId: 'input_datetime.kitchenfinalfilterservice',
    interval: 365,
    warningThreshold: 10,
  },
]
