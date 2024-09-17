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
        configValidationSchema,
        inputValidationSchema,
        enableArithmeticExpressions,
      } = params;
      const mappedConfig = mapConfigIfNeeded(config, mapping);

      // Validate config using the provided configSchema
      const safeConfig = validate<z.infer<typeof configValidationSchema>>(
        configValidationSchema as ZodType<any>,
        mappedConfig
      );

      if (enableArithmeticExpressions) {
        // our implementation
      }
      // Validate each input using the inputSchema
      const safeInputs = inputs.map(input =>
        validate<z.infer<typeof inputValidationSchema>>(
          inputValidationSchema as ZodType<any>,
          input
        )
      );

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
