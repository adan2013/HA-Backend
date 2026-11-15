type MqttMessage = {
  topic: string
  payload: string
  retain: boolean
  time: string
}

export type MqttDebugInfo = {
  entities: {
    entity_id: string
    discovery_data: { payload: { state_topic?: string } }
    subscriptions: { topic: string; messages: MqttMessage[] }[]
  }[]
}

// Only the device's state topic is evidence of activity. Bridge availability,
// discovery and command messages do not prove that this device is alive.
export function getMqttLastReport(
  info: MqttDebugInfo,
  entityId: string,
): string | undefined {
  const entity = info.entities.find((entry) => entry.entity_id === entityId)
  const topic = entity?.discovery_data?.payload?.state_topic
  if (!entity || !topic) {
    throw new Error(`MQTT state topic missing for ${entityId}`)
  }
  let latest: number | undefined
  for (const subscription of entity.subscriptions) {
    if (subscription.topic !== topic) continue
    for (const message of subscription.messages) {
      if (message.topic !== topic) continue
      let lastSeen: unknown
      try {
        lastSeen = JSON.parse(message.payload)?.last_seen
      } catch {
        // Plain text MQTT states are also valid; use their receipt time.
      }
      let timestamp: number
      if (lastSeen !== undefined) {
        // Zigbee2MQTT supports ISO strings and epoch milliseconds.
        timestamp =
          typeof lastSeen === 'number'
            ? lastSeen
            : typeof lastSeen === 'string'
            ? Date.parse(lastSeen)
            : NaN
      } else {
        // Broker replay is cached state, not a new report from the sensor.
        if (message.retain !== false) continue
        timestamp = Date.parse(message.time)
      }
      if (
        Number.isFinite(timestamp) &&
        timestamp > 0 &&
        timestamp <= Date.now()
      ) {
        latest = Math.max(latest ?? 0, timestamp)
      }
    }
  }
  return latest === undefined ? undefined : new Date(latest).toISOString()
}
