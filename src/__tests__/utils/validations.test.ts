import {z} from 'zod';

import {validate} from '../../utils/validations';
import {ERRORS} from '../../utils/errors';

const {InputValidationError, ManifestValidationError} = ERRORS;

describe('utils/validations', () => {
  describe('validate(): ', () => {
    const schema = z.object({
      coefficient: z.number(),
      'input-parameter': z.string().min(1),
      'output-parameter': z.string().min(1),
    });

    it('successfully returns valid data.', () => {
      const validObject = {
        coefficient: 3,
        'input-parameter': 'cpu/memory',
        'output-parameter': 'result',
      };
      const result = validate(schema, validObject);

      expect(result).toEqual(validObject);
    });

    it('throws an InputValidationError with a formatted message when validation fails.', () => {
      const invalidObject = {
        coefficient: 3,
        'input-parameter': 2,
        'output-parameter': 'result',
      };

      expect.assertions(2);
      try {
        validate(schema, invalidObject);
      } catch (error) {
        expect(error).toBeInstanceOf(InputValidationError);
        expect(error).toEqual(
          new InputValidationError(
            '"input-parameter" parameter is expected string, received number. Error code: invalid_type.'
          )
        );
      }
    });

    it('uses a custom error constructor when provided', () => {
      const invalidObject = {
        coefficient: 3,
        'input-parameter': 2,
        'output-parameter': 'result',
      };

      expect.assertions(1);
      try {
        validate(schema, invalidObject, undefined, ManifestValidationError);
      } catch (error) {
        expect(error).toBeInstanceOf(ManifestValidationError);
      }
    });

    it('throws an InputValidationError for invalid_union issue and call prettifyErrorMessage.', () => {
      const schema = z.object({
        data: z.union([z.string(), z.number().min(10)]),
      });
      const invalidObject = {data: false};
      const index = 3;

      expect.assertions(2);

      try {
        validate(schema, invalidObject, index);
      } catch (error) {
        expect(error).toBeInstanceOf(InputValidationError);
        expect(error).toEqual(
          new InputValidationError(
            '"data" parameter is expected string, received boolean at index 3. Error code: invalid_union.'
          )
        );
      }
    });

    it('returns only the error message when path is empty.', () => {
      const schema = z.object({
        '': z.string().min(1),
      });

      const invalidObject = {};
      const index = 4;

      expect.assertions(2);
      try {
        validate(schema, invalidObject, index);
      } catch (error) {
        expect(error).toBeInstanceOf(InputValidationError);
        expect(error).toEqual(new InputValidationError('Required'));
      }
    });
  });
});
