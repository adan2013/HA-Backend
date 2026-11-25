import BackendInfoService from './BackendInfoService'
import ServiceManager from '../ServiceManager'
import { homeAssistantSync } from '../../events/events'
import { backendVersion } from '../../utils/backendVersion'

describe('BackendInfoService', () => {
  beforeEach(() => homeAssistantSync.resetListeners())

  it('provides version and the shared startup date before HA connects', () => {
    const startedAt = new Date('2026-11-23T10:20:00Z')
    const manager = new ServiceManager(startedAt)
    manager.registerService(new BackendInfoService(startedAt))
    expect(manager.getManagerStatus()).toMatchObject({
      startTime: '10:20 23-11-2026',
      services: {
        backend: {
          helpers: {
            'value/version': { value: backendVersion },
            'value/startedAt': { value: startedAt.toISOString() },
            'value/entitiesCount': { value: null },
          },
        },
      },
    })
  })

  it('uses the existing synced entities count on each HA synchronization', () => {
    const manager = new ServiceManager()
    manager.registerService(new BackendInfoService(new Date()))
    for (const count of [47, 0, 52]) {
      homeAssistantSync.emit({ entitiesCount: count })
      expect(manager.getManagerStatus()).toMatchObject({
        syncedEntitiesCount: count,
        services: {
          backend: { helpers: { 'value/entitiesCount': { value: count } } },
        },
      })
    }
  })
})
