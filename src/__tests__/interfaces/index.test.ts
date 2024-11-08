import {z} from 'zod';

import {PluginParametersMetadata, PluginParams} from '../../types';
import {PluginFactory} from '../../interfaces';
import {ERRORS} from '../../utils/errors';

const {ConfigError, InputValidationError} = ERRORS;

describe('interfaces', () => {
  describe('PluginFactory(): ', () => {
    const mockInputs = [
      {
        timestamp: '2021-01-01T00:00:00Z',
        duration: 3600,
        carbon: 3,
      },
    ];
    const mockParametersMetadata = {inputs: {}, outputs: {}};

    it('creates a plugin instance with default config.', async () => {
      const params = {
        inputValidation: jest.fn(),
        implementation: jest.fn(async (inputs: PluginParams[]) => inputs),
      };
      const plugin = PluginFactory(params);
      const pluginInstance = plugin(undefined, mockParametersMetadata, {});
      const result = await pluginInstance.execute(mockInputs);

      expect.assertions(2);

      expect(typeof plugin).toBe('function');
      expect(result).toBeInstanceOf(Array);
    });

    it('validates config using configValidation function.', async () => {
      const mockImplementation = jest.fn(
        async (inputs: PluginParams[]) => inputs
      );
      const mockConfigValidation = jest.fn(config => {
        if (!config || !Object.keys(config)?.length) {
          throw new ConfigError('Config is not provided.');
        }

        return config;
      });
      const params = {
        implementation: mockImplementation,
        configValidation: mockConfigValidation,
      };

      const plugin = PluginFactory(params);
      const config = {coefficient: 2};
      const pluginInstance = plugin(config, mockParametersMetadata, {});
      const result = await pluginInstance.execute(mockInputs);

      expect.assertions(2);
      expect(mockImplementation).toHaveBeenCalledTimes(1);
      expect(result).toBeInstanceOf(Array);
    });

    it('validates config using configValidation as Zod schema.', async () => {
      const mockImplementation = jest.fn(
        async (inputs: PluginParams[]) => inputs
      );

      const params = {
        implementation: mockImplementation,
        configValidation: z.object({
          'input-parameters': z.array(z.string()),
          'output-parameter': z.string().min(1),
        }),
      };

      const plugin = PluginFactory(params);
      const config = {
        'input-parameters': ['cpu/energy', 'network/energy', 'memory/energy'],
        'output-parameter': 'result',
      };
      const mockInputs = [
        {
          timestamp: '2021-01-01T00:00:00Z',
          duration: 3600,
          'cpu/energy': 1,
          'network/energy': 1,
          'memory/energy': 1,
          energy: 3,
        },
      ];
      const pluginInstance = plugin(config, mockParametersMetadata, {});
      const result = await pluginInstance.execute(mockInputs);

      expect.assertions(2);
      expect(mockImplementation).toHaveBeenCalledTimes(1);
      expect(result).toBeInstanceOf(Array);
    });

    it('validates input using inputValidation function.', async () => {
      const mockImplementation = jest.fn(
        async (inputs: PluginParams[]) => inputs
      );
      const mockInputValidation = jest.fn((input, _config) => {
        return input;
      });
      const params = {
        implementation: mockImplementation,
        inputValidation: mockInputValidation,
      };

      const plugin = PluginFactory(params);
      const config = {coefficient: 2};
      const pluginInstance = plugin(config, mockParametersMetadata, {});
      const result = await pluginInstance.execute(mockInputs);

      expect.assertions(2);
      expect(mockImplementation).toHaveBeenCalledTimes(1);
      expect(result).toBeInstanceOf(Array);
    });

    it('validates input using inputValidation function when `allo`.', async () => {
      const mockImplementation = jest.fn(
        async (inputs: PluginParams[]) => inputs
      );
      const mockInputValidation = jest.fn((input, _config) => {
        return input;
      });
      const params = {
        implementation: mockImplementation,
        inputValidation: mockInputValidation,
        allowArithmeticExpressions: [],
      };

      const mockInputs = [
        {
          timestamp: '2021-01-01T00:00:00Z',
          duration: 3600 * 60,
          carbon: 3,
        },
      ];

      const plugin = PluginFactory(params);
      const config = {coefficient: 2};
      const pluginInstance = plugin(config, mockParametersMetadata, {});
      const result = await pluginInstance.execute(mockInputs);

      expect.assertions(2);
      expect(mockImplementation).toHaveBeenCalledTimes(1);
      expect(result).toBeInstanceOf(Array);
    });

    it('validates input using inputValidation as Zod schema.', async () => {
      const mockImplementation = jest.fn(
        async (inputs: PluginParams[]) => inputs
      );

      const params = {
        implementation: mockImplementation,
        inputValidation: z.object({
          duration: z.number().gt(0),
          vCPUs: z.number().gt(0).default(1),
          memory: z.number().gt(0).default(16),
          ssd: z.number().gte(0).default(0),
          hdd: z.number().gte(0).default(0),
          gpu: z.number().gte(0).default(0),
          'usage-ratio': z.number().gt(0).default(1),
          time: z.number().gt(0).optional(),
        }),
      };
      const mockInputs = [
        {
          timestamp: '2021-01-01T00:00:00Z',
          duration: 3600,
          'usage-ratio': 2,
        },
      ];

      const expectedOutputs = [
        {
          timestamp: '2021-01-01T00:00:00Z',
          duration: 3600,
          vCPUs: 1,
          memory: 16,
          ssd: 0,
          hdd: 0,
          gpu: 0,
          'usage-ratio': 2,
        },
      ];

      const plugin = PluginFactory(params);
      const config = {coefficient: 2};
      const pluginInstance = plugin(config, mockParametersMetadata, {});
      const result = await pluginInstance.execute(mockInputs);

      expect.assertions(3);
      expect(mockImplementation).toHaveBeenCalledTimes(1);
      expect(result).toBeInstanceOf(Array);
      expect(result).toEqual(expectedOutputs);
    });

    it('throws an error when configValidation validates an empty object as the config.', async () => {
      const mockImplementation = jest.fn();
      const mockConfigValidation = jest.fn(config => {
        if (!config || !Object.keys(config)?.length) {
          throw new ConfigError('Config is not provided.');
        }

        return config;
      });
      const params = {
        implementation: mockImplementation,
        configValidation: mockConfigValidation,
      };

      expect.assertions(1);
      try {
        const plugin = PluginFactory(params);
        const pluginInstance = plugin({}, mockParametersMetadata, {});

        await pluginInstance.execute(mockInputs);
      } catch (error) {
        expect(error).toEqual(new ConfigError('Config is not provided.'));
      }
    });

    it('evaluates arithmetic expressions in config and inputs with enabled `allowArithmeticExpressions`.', async () => {
      const config = {
        'input-parameter': '=3*carbon',
        coefficient: 3,
        'output-parameter': 'carbon-product',
      };
      const mockInputs = [
        {
          duration: 3600,
          carbon: 3,
          timestamp: '2021-01-01T00:00:00Z',
        },
      ];
      const outputs = [{...mockInputs[0], 'carbon-product': 9}];

      const mockImplementation = jest.fn(
        async (_inputs: PluginParams[]) => outputs
      );
      const params = {
        implementation: mockImplementation,
        allowArithmeticExpressions: ['input-parameter', 'coefficient'],
      };
      const plugin = PluginFactory(params);
      const pluginInstance = plugin(config, mockParametersMetadata, {});
      const result = await pluginInstance.execute(mockInputs);

      expect.assertions(2);
      expect(result).toEqual(outputs);
      expect(mockImplementation).toHaveBeenCalledWith(mockInputs, {
        ...config,
        'input-parameter': 9,
        mapping: {},
      });
    });

    it('evaluates plugin output when the `allowArithmeticExpressions` is an empty array.', async () => {
      const config = {
        'input-parameter': '=3*carbon',
        coefficient: 3,
        'output-parameter': '=10*"carbon-product"',
      };
      const mockInputs = [
        {
          duration: 3600,
          carbon: 3,
          timestamp: '2021-01-01T00:00:00Z',
        },
      ];
      const outputs = [{...mockInputs[0], 'carbon-product': 9}];

      const mockImplementation = jest.fn(
        async (_inputs: PluginParams[]) => outputs
      );
      const params = {
        implementation: mockImplementation,
        allowArithmeticExpressions: [],
      };
      const plugin = PluginFactory(params);
      const pluginInstance = plugin(config, mockParametersMetadata, {});
      const result = await pluginInstance.execute(mockInputs);

      expect.assertions(2);
      expect(result).toEqual(outputs);
      expect(mockImplementation).toHaveBeenCalledWith(mockInputs, {
        ...config,
        mapping: {},
      });
    });

    it('executes when the `parametersMetadata` is provided.', async () => {
      const mockParametersMetadata: PluginParametersMetadata = {
        inputs: {
          carbon: {
            description: 'an amount of carbon emitted into the atmosphere',
            unit: 'gCO2e',
            'aggregation-method': {
              time: 'sum',
              component: 'sum',
            },
          },
          'functional-unit': {
            description:
              'the name of the functional unit in which the final SCI value should be expressed, e.g. requests, users',
            unit: 'none',
            'aggregation-method': {
              time: 'sum',
              component: 'sum',
            },
          },
        },
        outputs: {
          sci: {
            description:
              'carbon expressed in terms of the given functional unit',
            unit: 'gCO2e',
            'aggregation-method': {
              time: 'avg',
              component: 'sum',
            },
          },
        },
      };
      const mockInputs = [
        {
          timestamp: '2021-01-01T00:00:00Z',
          'carbon-operational': 0.02,
          'carbon-embodied': 5,
          carbon: 5.02,
          users: 100,
          duration: 1,
        },
      ];
      const expectedOutputs = [{...mockInputs[0], sci: 9}];

      const mockImplementation = jest.fn(
        async (_inputs: PluginParams[]) => expectedOutputs
      );
      const params = {
        implementation: mockImplementation,
        allowArithmeticExpressions: ['functional-unit'],
      };
      const plugin = PluginFactory(params);
      const pluginInstance = plugin({}, mockParametersMetadata, {});
      const result = await pluginInstance.execute(mockInputs);

      expect.assertions(2);
      expect(result).toEqual(expectedOutputs);
      expect(mockImplementation).toHaveBeenCalledWith(mockInputs, {
        mapping: {},
      });
    });

    it('executes when the plugin has hardcoded metadata and the `parametersMetadata` is provided.', async () => {
      const mockParametersMetadata: PluginParametersMetadata = {
        inputs: {
          carbon: {
            description: 'an amount of carbon emitted into the atmosphere',
            unit: 'gCO2e',
            'aggregation-method': {
              time: 'sum',
              component: 'sum',
            },
          },
        },
      };
      const mockInputs = [
        {
          timestamp: '2021-01-01T00:00:00Z',
          'carbon-operational': 0.02,
          'carbon-embodied': 5,
          carbon: 5.02,
          users: 100,
          duration: 1,
        },
      ];

      const mockPluginMetadata: PluginParametersMetadata = {
        inputs: {
          carbon: {
            description: 'an amount of carbon emitted into the atmosphere',
            unit: 'gCO2eq',
            'aggregation-method': {
              time: 'sum',
              component: 'sum',
            },
          },
          'functional-unit': {
            description:
              'the name of the functional unit in which the final SCI value should be expressed, e.g. requests, users',
            unit: 'none',
            'aggregation-method': {
              time: 'sum',
              component: 'sum',
            },
          },
        },
        outputs: {
          sci: {
            description:
              'carbon expressed in terms of the given functional unit',
            unit: 'gCO2eq',
            'aggregation-method': {
              time: 'avg',
              component: 'avg',
            },
          },
        },
      };
      const expectedOutputs = [{...mockInputs[0], sci: 9}];

      const mockImplementation = jest.fn(
        async (_inputs: PluginParams[]) => expectedOutputs
      );
      const params = {
        metadata: mockPluginMetadata,
        implementation: mockImplementation,
        allowArithmeticExpressions: ['functional-unit'],
      };
      const plugin = PluginFactory(params);
      const pluginInstance = plugin({}, mockParametersMetadata, {});
      const result = await pluginInstance.execute(mockInputs);

      const mergedMetadata = {
        inputs: {
          ...mockPluginMetadata.inputs,
          ...mockParametersMetadata.inputs,
        },
        outputs: mockParametersMetadata.outputs || mockPluginMetadata.outputs,
      };

      expect.assertions(3);
      expect(pluginInstance.metadata).toEqual(mergedMetadata);
      expect(result).toEqual(expectedOutputs);
      expect(mockImplementation).toHaveBeenCalledWith(mockInputs, {
        mapping: {},
      });
    });

    it('executes when the `outputs` of plugin metadata are missing and the `parametersMetadata` is provided.', async () => {
      const mockParametersMetadata: PluginParametersMetadata = {
        inputs: {
          carbon: {
            description: 'an amount of carbon emitted into the atmosphere',
            unit: 'gCO2e',
            'aggregation-method': {
              time: 'sum',
              component: 'sum',
            },
          },
        },
        outputs: {
          sci: {
            description:
              'carbon expressed in terms of the given functional unit',
            unit: 'gCO2e',
            'aggregation-method': {
              time: 'avg',
              component: 'sum',
            },
          },
        },
      };
      const mockInputs = [
        {
          timestamp: '2021-01-01T00:00:00Z',
          'carbon-operational': 0.02,
          'carbon-embodied': 5,
          carbon: 5.02,
          users: 100,
          duration: 1,
        },
      ];

      const mockPluginMetadata: PluginParametersMetadata = {
        inputs: {
          carbon: {
            description: 'an amount of carbon emitted into the atmosphere',
            unit: 'gCO2eq',
            'aggregation-method': {
              time: 'sum',
              component: 'sum',
            },
          },
          'functional-unit': {
            description:
              'the name of the functional unit in which the final SCI value should be expressed, e.g. requests, users',
            unit: 'none',
            'aggregation-method': {
              time: 'sum',
              component: 'sum',
            },
          },
        },
      };
      const expectedOutputs = [{...mockInputs[0], sci: 9}];

      const mockImplementation = jest.fn(
        async (_inputs: PluginParams[]) => expectedOutputs
      );
      const params = {
        metadata: mockPluginMetadata,
        implementation: mockImplementation,
        allowArithmeticExpressions: ['functional-unit'],
      };
      const plugin = PluginFactory(params);
      const pluginInstance = plugin({}, mockParametersMetadata, {});
      const result = await pluginInstance.execute(mockInputs);

      const mergedMetadata = {
        inputs: {
          ...mockPluginMetadata.inputs,
          ...mockParametersMetadata.inputs,
        },
        outputs: mockParametersMetadata.outputs || mockPluginMetadata.outputs,
      };

      expect.assertions(3);
      expect(pluginInstance.metadata).toEqual(mergedMetadata);
      expect(result).toEqual(expectedOutputs);
      expect(mockImplementation).toHaveBeenCalledWith(mockInputs, {
        mapping: {},
      });
    });

    it('executes successfully when the `mapping` persists.', async () => {
      const config = {
        'keep-existing': false,
        from: 'original',
        to: 'copy',
      };
      const mapping = {
        copy: 'result',
      };
      const mockInputs = [
        {
          timestamp: '2021-01-01T00:00:00Z',
          duration: 3600,
          original: 'hello',
        },
      ];
      const outputs = [
        {
          duration: 3600,
          original: 'hello',
          result: 'hello',
          timestamp: '2021-01-01T00:00:00Z',
        },
      ];

      const mockImplementation = jest.fn(
        async (_inputs: PluginParams[]) => outputs
      );
      const params = {
        implementation: mockImplementation,
      };

      const plugin = PluginFactory(params);
      const pluginInstance = plugin(config, mockParametersMetadata, mapping);
      const result = await pluginInstance.execute(mockInputs);

      expect.assertions(2);
      expect(result).toEqual(outputs);
      expect(mockImplementation).toHaveBeenCalledWith(mockInputs, {
        ...config,
        mapping: {},
      });
    });

    it('executes successfully when both `mapping` and `allowArithmeticExpressions` persists.', async () => {
      const mapping = {
        'energy-per-year': 'energy/year',
      };
      const config = {
        'input-parameter': '=2 * "energy-per-year"',
        'original-time-unit': 'year',
        'new-time-unit': 'duration',
        'output-parameter': 'energy-per-duration',
      };

      const expectedResult = [
        {
          timestamp: '2021-01-01T00:00:00Z',
          duration: 3600,
          'energy/year': 10000,
          'energy-per-duration': 1.140795,
        },
      ];
      const mockInputs = [
        {
          timestamp: '2021-01-01T00:00:00Z',
          duration: 3600,
          'energy/year': 10000,
        },
      ];

      const mockImplementation = jest.fn(
        async (_inputs: PluginParams[]) => expectedResult
      );
      const params = {
        implementation: mockImplementation,
        allowArithmeticExpressions: ['input-parameter'],
      };

      const plugin = PluginFactory(params);
      const pluginInstance = plugin(config, mockParametersMetadata, mapping);
      const result = await pluginInstance.execute(mockInputs);

      expect.assertions(2);
      expect(result).toEqual(expectedResult);
      expect(mockImplementation).toHaveBeenCalledWith(mockInputs, {
        ...config,
        'input-parameter': 20000,
        mapping: {},
      });
    });

    it('evaluates arithmetic operations when the config is not provided, but the plugin has a default config.', async () => {
      const mockConfigValidation = z.object({
        'baseline-vcpus': z.number().gte(0).default(1),
        'baseline-memory': z.number().gte(0).default(16),
        lifespan: z.number().gt(0).default(126144000),
        'vcpu-emissions-constant': z.number().gte(0).default(100000),
        'output-parameter': z.string().optional(),
      });
      const expectedResult = [
        {
          timestamp: '2021-01-01T00:00:00Z',
          duration: 3600,
          vCPUs: 2,
          gpu: 0,
          hdd: 0,
          memory: 16,
          ssd: 0,
          'usage-ratio': 1,
          'embodied-carbon': 47.945205479452056,
        },
      ];

      const mockImplementation = jest.fn(
        async (_inputs: PluginParams[]) => expectedResult
      );
      const params = {
        configValidation: mockConfigValidation,
        implementation: mockImplementation,
        allowArithmeticExpressions: [
          'baseline-vcpus',
          'baseline-memory',
          'lifespan',
          'vcpu-emissions-constant',
        ],
      };
      const mockInputs = [
        {
          timestamp: '2021-01-01T00:00:00Z',
          duration: 3600,
          vCPUs: 2,
        },
      ];
      const plugin = PluginFactory(params);
      const pluginInstance = plugin(undefined, mockParametersMetadata, {});
      const result = await pluginInstance.execute(mockInputs);

      expect.assertions(2);
      expect(result).toEqual(expectedResult);
      expect(mockImplementation).toHaveBeenCalledWith(mockInputs, {
        'baseline-vcpus': 1,
        'baseline-memory': 16,
        lifespan: 126144000,
        'vcpu-emissions-constant': 100000,
        mapping: {},
      });
    });

    it('throws an error if the `allowArithmeticExpressions` has wrong value.', async () => {
      const config = {
        'input-parameter': '3*carbon',
        coefficient: 3,
        'output-parameter': 'carbon-product',
      };
      const mockInputs = [
        {
          duration: 3600,
          carbon: 3,
          timestamp: '2021-01-01T00:00:00Z',
        },
      ];
      const outputs = [{...mockInputs[0], 'carbon-product': 9}];

      const mockImplementation = jest.fn(
        async (_inputs: PluginParams[]) => outputs
      );
      const params = {
        implementation: mockImplementation,
        allowArithmeticExpressions: ['input-parameter', 'coefficient'],
      };

      expect.assertions(1);
      try {
        const plugin = PluginFactory(params);
        const pluginInstance = plugin(config, mockParametersMetadata, {});
        await pluginInstance.execute(mockInputs);
      } catch (error) {
        expect(error).toEqual(
          new InputValidationError(
            'The `input-parameter` contains an invalid arithmetic expression. It should start with `=` and include the symbols `*`, `+`, `-` and `/`.'
          )
        );
      }
    });
  });
});
