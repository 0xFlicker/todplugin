declare module 'shutterstock-mold' {
  function Mold(dependencies: object): Mold.Blueprint
  namespace Mold {
    interface Blueprint {
      factory(dependencies?: object): Factory
      dsl(dependencies?: object): any
    }
    type Factory<T1 = any, T2 = any, T3 = any, T4 = any, T5 = any, T6 = any, T7 = any, T8 = any, T9 = any> = (
      dep1: T1,
      dep2?: T2,
      dep3?: T3,
      dep4?: T4,
      dep5?: T5,
      dep6?: T6,
      dep7?: T7,
      dep8?: T8,
      dep9?: T9
    ) => any
  }
  export = Mold
}
