import { Request, Response, NextFunction } from 'express'
import { ObjectSchema } from 'joi'
import { sendError } from '../utils/response'

export const validate = (schema: ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,   // collect all errors, not just the first
      stripUnknown: true,  // drop fields not defined in the schema
      convert: true        // coerce strings like "12" to numbers where schema expects number
    })

    if (error) {
      const details = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message
      }))
      sendError(res, 'Validation failed', 400, details)
      return
    }

    req.body = value // use the sanitized/coerced payload downstream
    next()
  }
}