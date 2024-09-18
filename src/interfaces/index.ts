import {z, ZodType} from 'zod';

import {
  mapConfigIfNeeded,
  mapInputIfNeeded,
  mapOutputIfNeeded,
  validate,
} from '../utils';
import {
  ConfigParams,
  MappingParams,
  PluginFactoryParams,
  PluginParametersMetadata,
  PluginParams,
} from '../types';

/**
 * Creates plugin instance according to given parameters.
 */
export const PluginFactory =
  (params: PluginFactoryParams) =>
  (
    config: ConfigParams = {},
    parametersMetadata: PluginParametersMetadata,
    mapping: MappingParams
  ) => ({
    metadata: {
      inputs: {...params.metadata.inputs, ...parametersMetadata?.inputs},
      outputs: parametersMetadata?.outputs || params.metadata.outputs,
    },
    execute: async (inputs: PluginParams[]) => {
      const {
        implementation,
        configValidation,
        inputValidation,
        enableArithmeticExpressions,
      } = params;

      if (enableArithmeticExpressions) {
        // our implementation
      }

      const mappedConfig = mapConfigIfNeeded(config, mapping);
      // Validate config using the provided configSchema
      const safeConfig =
        typeof configValidation === 'function'
          ? configValidation(config)
          : validate<z.infer<typeof configValidation>>(
              configValidation as ZodType<any>,
              mappedConfig
            );

      // Validate each input using the inputSchema
      const safeInputs = inputs.map(input => {
        if (typeof inputValidation === 'function') {
          return inputValidation(input, config);
        }

        return validate<z.infer<typeof inputValidation>>(
          inputValidation as ZodType<any>,
          input
        );
      });

      // Apply mapping to inputs if needed
      inputs = safeInputs.map((safeInput, index) => ({
        ...inputs[index],
        ...mapInputIfNeeded(safeInput, mapping),
      }));
      config = mapConfigIfNeeded(config, mapping);

      // Execute the callback with the validated and possibly mapped inputs
      const outputs = await implementation(inputs, safeConfig);
      const appendOutputsToInputs = inputs.map((input, index) => ({
        ...input,
        ...outputs[index],
      }));

      return mapOutputIfNeeded(appendOutputsToInputs, mapping);
    },
  });
