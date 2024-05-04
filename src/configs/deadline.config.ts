type DeadlineConfig = {
  label: string
  entityId: string
  interval: number
  warningThreshold: number
}

const deadlines: DeadlineConfig[] = [
  {
    label: 'water prefilters',
    entityId: 'input_datetime.kitchenfilterservice',
    interval: 120,
    warningThreshold: 5,
  },
  {
    label: 'membrane water filter',
    entityId: 'input_datetime.kitchenmembranefilterservice',
    interval: 485,
    warningThreshold: 5,
  },
  {
    label: 'mineralization water filter',
    entityId: 'input_datetime.kitchenfinalfilterservice',
    interval: 365,
    warningThreshold: 5,
  },
  {
    label: 'car insurance',
    entityId: 'input_datetime.carinsurance',
    interval: 365,
    warningThreshold: 12,
  },
  {
    label: 'car technical inspection',
    entityId: 'input_datetime.cartechnicalinspection',
    interval: 365,
    warningThreshold: 12,
  },
]

export default deadlines
