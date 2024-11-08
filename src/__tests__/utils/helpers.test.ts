import {
  mapInputIfNeeded,
  removeMappedInputParameter,
  mapConfigIfNeeded,
  mapOutputIfNeeded,
} from '../../utils/helpers';

describe('utils/helpers', () => {
  describe('mapInputIfNeeded(): ', () => {
    it('returns a new object with mappings applied.', () => {
      const input = {
        timestamp: '2021-01-01T00:00:00Z',
        duration: 3600,
        'carbon-product': 9,
      };
      const mapping = {carbon: 'carbon-product'};
      const result = mapInputIfNeeded(input, mapping);

      expect(result).toEqual({
        timestamp: '2021-01-01T00:00:00Z',
        duration: 3600,
        carbon: 9,
        'carbon-product': 9,
      });
    });

    it('not modifies the input if mapping is empty.', () => {
      const input = {
        timestamp: '2021-01-01T00:00:00Z',
        duration: 3600,
        carbon: 9,
        'carbon-product': 9,
      };
      const mapping = {};
      const result = mapInputIfNeeded(input, mapping);

      expect(result).toEqual(input);
    });

    it('ignores mapping keys that are not in input', () => {
      const input = {
        timestamp: '2021-01-01T00:00:00Z',
        duration: 3600,
        'carbon-product': 9,
      };
      const mapping = {carbon: 'carbon-product', 'output-parameter': 'result'};
      const result = mapInputIfNeeded(input, mapping);

      expect(result).toEqual({
        timestamp: '2021-01-01T00:00:00Z',
        duration: 3600,
        carbon: 9,
        'carbon-product': 9,
      });
    });

    it('handles cases where mapping is `undefined`.', () => {
      const input = {
        timestamp: '2021-01-01T00:00:00Z',
        duration: 3600,
        carbon: 9,
        'carbon-product': 9,
      };
      const mapping = undefined;
      const result = mapInputIfNeeded(input, mapping!);

      expect(result).toEqual(input);
    });

    it('handles cases where input is empty.', () => {
      const input = {};
      const mapping = {carbon: 'carbon-product'};
      const result = mapInputIfNeeded(input, mapping);

      expect(result).toEqual({});
    });
  });

  describe('removeMappedInputParameter(): ', () => {
    it('removes mapped keys from input based on mapping.', () => {
      const input = {
        timestamp: '2021-01-01T00:00:00Z',
        duration: 3600,
        carbon: 9,
        'carbon-product': 9,
      };
      const mapping = {carbon: 'carbon-product'};
      const result = removeMappedInputParameter(input, mapping);

      expect(result).toEqual({
        timestamp: '2021-01-01T00:00:00Z',
        duration: 3600,
        'carbon-product': 9,
      });
    });

    it('returns the input unchanged if mapping is empty.', () => {
      const input = {
        timestamp: '2021-01-01T00:00:00Z',
        duration: 3600,
        carbon: 9,
      };
      const mapping = {};
      const result = removeMappedInputParameter(input, mapping);

      expect(result).toEqual(input);
    });

    it('returns the input unchanged if no keys in mapping match input', () => {
      const input = {
        timestamp: '2021-01-01T00:00:00Z',
        duration: 3600,
        carbon: 9,
      };
      const mapping = {'input-parameter': 'result'};
      const result = removeMappedInputParameter(input, mapping);

      expect(result).toEqual(input);
    });

    it('handles null or undefined mapping gracefully.', () => {
      const input = {
        timestamp: '2021-01-01T00:00:00Z',
        duration: 3600,
        carbon: 9,
      };
      const mapping = undefined;

      const resultWithUndefinedMapping = removeMappedInputParameter(
        input,
        mapping!
      );

      expect(resultWithUndefinedMapping).toEqual(input);
    });
  });

  describe('mapConfigIfNeeded(): ', () => {
    it('returns config unchanged if mapping is not provided.', () => {
      const config = {carbon: 'carbon-product', 'output-parameter': 'result'};
      const mapping = undefined;
      const result = mapConfigIfNeeded(config, mapping!);

      expect(result).toEqual(config);
    });

    it('returns config unchanged if it is not an object.', () => {
      const config = undefined;
      const mapping = {carbon: 'carbon-product'};
      const result = mapConfigIfNeeded(config, mapping);

      expect(result).toBe(config);
    });

    it('maps config keys and values based on mapping.', () => {
      const config = {
        denominator: 2,
        numerator: 'vcpus-allocated',
        output: 'cpu/number-cores',
      };
      const mapping = {
        'vcpus-allocated': 'vcpus-distributed',
      };
      const expected = {
        denominator: 2,
        numerator: 'vcpus-distributed',
        output: 'cpu/number-cores',
      };
      const result = mapConfigIfNeeded(config, mapping);

      expect(result).toEqual(expected);
    });

    it('recursively maps nested objects.', () => {
      const config = {
        filepath: './file.csv',
        query: {
          'cpu-cores-available': 'cpu/available',
          'cpu-cores-utilized': 'cpu/utilized',
          'cpu-manufacturer': 'cpu/manufacturer',
        },
        output: ['cpu-tdp', 'tdp'],
      };
      const mapping = {
        'cpu/utilized': 'cpu/util',
      };
      const expected = {
        filepath: './file.csv',
        query: {
          'cpu-cores-available': 'cpu/available',
          'cpu-cores-utilized': 'cpu/util',
          'cpu-manufacturer': 'cpu/manufacturer',
        },
        output: ['cpu-tdp', 'tdp'],
      };
      const result = mapConfigIfNeeded(config, mapping);

      expect(result).toEqual(expected);
    });

    it('replaces arithmetic expression parameter with mapped value', () => {
      const config = {
        numerator: '=3*"vcpus-allocated"',
        denominator: 'duration',
        output: 'vcpus-allocated-per-second',
      };
      const mapping = {'vcpus-allocated': 'vcpus-distributed'};

      jest.mock('../../utils/arithmetic-helper', () => ({
        getParameterFromArithmeticExpression: jest
          .fn()
          .mockReturnValue('expression'),
      }));

      const expected = {
        numerator: '=3*"vcpus-distributed"',
        denominator: 'duration',
        output: 'vcpus-allocated-per-second',
      };
      const result = mapConfigIfNeeded(config, mapping);

      expect(result).toEqual(expected);
    });

    it('deletes parameters from mapping that have been used.', () => {
      const config = {
        denominator: 2,
        numerator: 'vcpus-allocated',
        output: 'cpu/number-cores',
      };
      const mapping = {
        'vcpus-allocated': 'vcpus-distributed',
      };

      mapConfigIfNeeded(config, mapping);

      expect(mapping).not.toHaveProperty('vcpus-allocated');
    });
  });

  describe('mapOutputIfNeeded(): ', () => {
    it('returns the original output when no mapping is provided.', () => {
      const output = {'vcpus-allocated': 1};
      const mapping = undefined;

      const result = mapOutputIfNeeded(output, mapping!);

      expect(result).toEqual(output);
    });

    it('maps keys based on the provided mapping.', () => {
      const output = {
        denominator: 2,
        'vcpus-allocated': 1,
        'cpu/number-cores': 2,
      };
      const mapping = {
        'vcpus-allocated': 'vcpus-distributed',
        'cpu/number-cores': 'cpu/number-cores-mapped',
      };

      const result = mapOutputIfNeeded(output, mapping);

      expect(result).toEqual({
        denominator: 2,
        'cpu/number-cores-mapped': 2,
        'vcpus-distributed': 1,
      });
    });

    it('ignores mapping for keys not in the output.', () => {
      const output = {
        denominator: 2,
        'vcpus-allocated': 1,
        'cpu/number-cores': 2,
      };
      const mapping = {sci: 'result'};

      const result = mapOutputIfNeeded(output, mapping);

      expect(result).toEqual(output);
    });

    it('applies mapping only to keys that exist in both output and mapping.', () => {
      const output = {users: 100};
      const mapping = {users: 'users-mapped', sci: 'result'};

      const result = mapOutputIfNeeded(output, mapping);

      expect(result).toEqual({
        'users-mapped': 100,
      });
    });

    it('returns an empty object if the output is empty.', () => {
      const output = {};
      const mapping = {'vcpus-allocated': 'vcpus-distributed'};

      const result = mapOutputIfNeeded(output, mapping);

      expect(result).toEqual({});
    });
  });
});
