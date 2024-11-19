import { ERRORS } from "../../utils"

describe('utils/errors: ', () => {
  describe('ERRORS: ', () => {
    it('checks errors to be instance of Error.', () => {
      Object.keys(ERRORS).forEach((errorName) => {
        // @ts-ignore
        const errorInstance = ERRORS[errorName]
        expect(errorInstance.name).toEqual(errorName)
      })
    })
  })
})