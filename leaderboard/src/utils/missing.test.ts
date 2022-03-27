import { stats, includes } from './missing'

describe('#utils/missing', () => {
  describe('#stats', () => {
    it('finds missing stats', () => {
      expect(
        stats({
          foo: ['0', '1', '2'],
          bar: ['1', '2', '3'],
          includes: [
            {
              id: '0',
              name: '0',
              foo: 0,
              bar: 0
            },
            {
              id: '1',
              name: '1',
              foo: 1,
              bar: 1
            },
            {
              id: '2',
              name: '2',
              foo: 2
            },
            {
              id: '3',
              name: '3',
              bar: 3
            }
          ] as any[]
        })
      ).toEqual([
        [
          {
            id: '2',
            name: '2',
            foo: 2
          },
          [['bar', '2']]
        ],
        [
          {
            id: '3',
            name: '3',
            bar: 3
          },
          [['foo', '3']]
        ]
      ])
    })
  })

  describe('#includes', () => {
    it('finds missing includes', () => {
      expect(
        includes({
          foo: ['0', '1', '2'],
          bar: ['1', '2', '3'],
          includes: [
            {
              id: '1',
              name: '1',
              foo: 1,
              bar: 1
            },
            {
              id: '2',
              name: '2',
              foo: 2
            },
            {
              id: '3',
              name: '3',
              bar: 3
            }
          ] as any[]
        })
      ).toEqual(['0'])
    })
  })
})
