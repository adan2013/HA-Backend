const Entities = {
  binarySensor: {
    contact: {
      mainDoorDeadbolt: 'binary_sensor.maindoordeadboltsensor_contact',
    },
    device: {
      danielMacbookPro: {
        microphone: 'binary_sensor.daniels_macbook_pro_audio_input_in_use',
        camera: 'binary_sensor.daniels_macbook_pro_camera_in_use',
      },
    },
    motion: {
      kitchen: 'binary_sensor.kitchenmotionsensor_occupancy',
    },
    waterLeak: {
      washingMachine: 'binary_sensor.washingmachineleaksensor_water_leak',
      waterFilter: 'binary_sensor.waterfilterleaksensor_water_leak',
    },
  },
  inputBoolean: {
    automations: {
      balconyCircuitAutoSwitch: 'input_boolean.balconycircuitautoswitch',
      printerAutoOff: 'input_boolean.printerautooff',
    },
    kitchenLights: {
      autoLights: 'input_boolean.kitchenautolights',
      ignoreSunPosition: 'input_boolean.kitchenignoresunposition',
      leftLightOn: 'input_boolean.kitchenleftlighton',
      rightLightOn: 'input_boolean.kitchenrightlighton',
    },
    notifications: {
      dndAtNight: 'input_boolean.alertdndatnight',
      soundOn: 'input_boolean.alertsounds',
      tabletLight: 'input_boolean.alerttabletlights',
    },
    security: {
      deadboltMonitoring: 'input_boolean.alertdeadbolt',
      waterLeakMonitoring: 'input_boolean.alertwaterleak',
    },
    system: {
      alertBatteryLevel: 'input_boolean.alertbatterylevel',
      alertSelfDiagnostic: 'input_boolean.alertselfdiagnostic',
    },
  },
  inputDateTime: {
    carInsurance: 'input_datetime.carinsurance',
    carTechnicalInspection: 'input_datetime.cartechnicalinspection',
    coffeeMachineCleaning: 'input_datetime.coffeemachinecleaning',
    kitchenFilterService: 'input_datetime.kitchenfilterservice',
    kitchenFinalFilterService: 'input_datetime.kitchenfinalfilterservice',
    kitchenMembraneFilterService: 'input_datetime.kitchenmembranefilterservice',
  },
  light: {
    danielRoom: {
      bedLamp: 'light.danielbedlamp',
    },
    dashNode: {
      tabletLight: 'light.dash_node_tablet_notification_lights',
    },
    kitchen: {
      leftSide: 'light.kitchenleftlight',
      rightSide: 'light.kitchenrightlight',
    },
    livingRoom: {
      cabinet: 'light.cabinetlight',
      ceilingBackSection: 'light.livingroombacklight',
      ceilingFrontSection: 'light.livingroomfrontlight',
      table: 'light.tablelight',
      tv: 'light.tvlight',
    },
  },
  sensor: {
    bambuLabPrinter: {
      currentLayer: 'sensor.p1s_01p00a453001011_current_layer',
      printStatus: 'sensor.p1s_01p00a453001011_print_status',
      nozzleTemperature: 'sensor.p1s_01p00a453001011_nozzle_temperature',
      progressPercentage: 'sensor.p1s_01p00a453001011_print_progress',
      remainingTime: 'sensor.p1s_01p00a453001011_remaining_time',
      totalLayerCount: 'sensor.p1s_01p00a453001011_total_layer_count',
    },
    light: {
      kitchen: 'sensor.kitchenmotionsensor_illuminance',
    },
    power: {
      balcony: {
        power: 'sensor.balconycircuitswitch_power',
        energy: 'sensor.balconycircuitswitch_energy',
      },
      bambuLabPrinter: {
        power: 'sensor.bambulabprinterplug_power',
        energy: 'sensor.bambulabprinterplug_energy',
      },
      washingMachine: {
        power: 'sensor.washingmachineplug_power',
        energy: 'sensor.washingmachineplug_energy',
      },
    },
    remote: {
      danielBed: 'sensor.danielbedremote_action',
      kitchen: 'sensor.kitchenremote_action',
      livingRoom: 'sensor.livingroomremote_action',
    },
  },
  switch: {
    circuit: {
      balcony: 'switch.balconycircuitswitch',
    },
    plug: {
      bambuLabPrinter: 'switch.bambulabprinterplug',
    },
  },
}

export default Entities
