import Service from '../Service'
import ValueHelper from '../../helpers/ValueHelper'
import { homeAssistantSync } from '../../events/events'
import { backendVersion } from '../../utils/backendVersion'

class BackendInfoService extends Service {
  constructor(startDate: Date) {
    super('backend')
    this.registerHelper(new ValueHelper('version', backendVersion))
    this.registerHelper(new ValueHelper('startedAt', startDate.toISOString()))
    const entitiesCount = new ValueHelper<number>('entitiesCount')
    this.registerHelper(entitiesCount)
    homeAssistantSync.on(({ entitiesCount: count }) => {
      entitiesCount.setValue(count)
    })
  }
}

export default BackendInfoService
