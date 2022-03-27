declare module 'openapi-enforcer' {
  type Schema = object
  export function dereference(schema: Schema): Promise<Schema>
  type Error = {
    header: string
    statusCode: number
  }
  type Warning = Error
  interface OpenApiResponse<T> extends IterableIterator<T> {
    error?: Error
    warning?: Warning
    value: T
  }
  class OpenApiOperation {
    query: any
    body: any
    response(statusCode: number, response: any): OpenApiResponse<any>
  }
  interface OpenApiConstructor {
    new (schema: Schema): OpenApiResponse<OpenApiV3>
  }
  export class OpenApiV3 {
    constructor(schema: Schema)
    request(
      opts: {
        path?: string
        method?: string
        body?: string | object
        header?: object
      },
      opt?: { allowOtherQueryParameters?: boolean | string }
    ): OpenApiResponse<OpenApiOperation>
  }
  type V30 = {
    OpenApi: OpenApiConstructor
  }
  export const v3_0: V30

  type Enforcer = (schema: Schema, opts?: object) => Promise<OpenApiResponse<OpenApiV3>>
  const defaultEnforcer: Enforcer
  export default defaultEnforcer
}
