import Entities from './entities.config'

type DeadlineConfig = {
  label: string
  entityId: string
  interval: number
  warningThreshold: number
}

const deadlines: DeadlineConfig[] = [
  {
    label: 'water prefilters',
    entityId: Entities.inputDateTime.kitchenFilterService,
    interval: 120,
    warningThreshold: 5,
  },
  {
    label: 'membrane water filter',
    entityId: Entities.inputDateTime.kitchenMembraneFilterService,
    interval: 485,
    warningThreshold: 5,
  },
  {
    label: 'mineralization water filter',
    entityId: Entities.inputDateTime.kitchenFinalFilterService,
    interval: 365,
    warningThreshold: 5,
  },
  {
    label: 'car insurance',
    entityId: Entities.inputDateTime.carInsurance,
    interval: 365,
    warningThreshold: 12,
  },
  {
    label: 'car technical inspection',
    entityId: Entities.inputDateTime.carTechnicalInspection,
    interval: 365,
    warningThreshold: 12,
  },
  {
    label: 'coffee machine cleaning',
    entityId: Entities.inputDateTime.coffeeMachineCleaning,
    interval: 10,
    warningThreshold: 1,
  },
]

export default deadlines
