import DataCollector from '../DataCollector'

describe('DataCollector', () => {
  it('should throw an error if precision is less than 0', () => {
    expect(() => {
      new DataCollector('test', -1, 1)
    }).toThrow()
  })

  it('should throw an error if limit value is less than or equal to 0', () => {
    expect(() => {
      new DataCollector('test', 0, 0)
    }).toThrow()
    expect(() => {
      new DataCollector('test', 0, -1)
    }).toThrow()
  })

  it('should throw an error if frequency value is less than 1 or greater than limit value', () => {
    expect(() => {
      new DataCollector('test', 0, 5, 0)
    }).toThrow()
    expect(() => {
      new DataCollector('test', 0, 5, -1)
    }).toThrow()
    expect(() => {
      new DataCollector('test', 0, 5, 6)
    }).toThrow()
  })

  it('should set correct status', () => {
    const collector1 = new DataCollector('test', 0, 3)
    expect(collector1.getHelperStatus()).toEqual({
      message: 'In queue: 0/3',
      color: 'blue',
    })
    const collector2 = new DataCollector('test', 0, 3, 2)
    expect(collector2.getHelperStatus()).toEqual({
      message: 'In queue: 0/3, Saving every 2 values',
      color: 'blue',
    })
  })

  it('should save values and limit queue length', () => {
    const collector = new DataCollector('test', 0, 3)
    expect(collector.getValues()).toEqual([])
    collector.saveValue(12)
    expect(collector.getValues()).toEqual([12])
    expect(collector.getHelperStatus()).toEqual({
      message: 'In queue: 1/3',
      color: 'blue',
    })
    collector.saveValue(14.3)
    collector.saveValue(27.5)
    expect(collector.getValues()).toEqual([12, 14, 28])
    expect(collector.getHelperStatus()).toEqual({
      message: 'In queue: 3/3',
      color: 'green',
    })
    collector.saveValue(15.1)
    collector.saveValue(-76.2)
    expect(collector.getValues()).toEqual([28, 15, -76])
    collector.saveValue(0)
    expect(collector.getValues()).toEqual([15, -76, 0])
  })

  it('should clear data', () => {
    const collector = new DataCollector('test', 0, 3)
    collector.saveValue(12)
    collector.saveValue(13)
    collector.saveValue(14)
    expect(collector.getValues()).toEqual([12, 13, 14])
    collector.clearData()
    expect(collector.getValues()).toEqual([])
    expect(collector.getHelperStatus()).toEqual({
      message: 'In queue: 0/3',
      color: 'blue',
    })
  })

  it('should save first value and after that every 3rd value', () => {
    const collector = new DataCollector('test', 0, 3, 3)
    collector.saveValue(11)
    expect(collector.getValues()).toEqual([11])
    collector.saveValue(12)
    collector.saveValue(13)
    collector.saveValue(14)
    expect(collector.getValues()).toEqual([11, 14])
    collector.saveValue(15)
    collector.saveValue(16)
    collector.saveValue(17)
    expect(collector.getValues()).toEqual([11, 14, 17])
    expect(collector.getHelperStatus()).toEqual({
      message: 'In queue: 3/3, Saving every 3 values',
      color: 'green',
    })
    collector.saveValue(18)
    collector.saveValue(19)
    collector.saveValue(20)
    expect(collector.getValues()).toEqual([14, 17, 20])
  })
})
