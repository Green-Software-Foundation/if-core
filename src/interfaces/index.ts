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

import {
  evaluateInput,
  evaluateConfig,
  evaluateArithmeticOutput,
  getParameterFromArithmeticExpression,
  evaluateSimpleArithmeticExpression,
} from '../utils/arithmetic-helper';

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
      kind: 'execute',
      inputs: {...params.metadata.inputs, ...parametersMetadata?.inputs},
      outputs: parametersMetadata?.outputs || params.metadata.outputs,
    },
    execute: async (inputs: PluginParams[]) => {
      const {
        implementation,
        configValidation,
        inputValidation,
        allowArithmeticExpressions,
      } = params;
      let evaluatedConfig;
      let outputParam: string;
      const pureConfig: ConfigParams = {};
      const isArithmeticEnable = !!allowArithmeticExpressions?.length;
      const mappedConfig: ConfigParams = mapConfigIfNeeded(config, mapping);

      if (isArithmeticEnable) {
        Object.entries(mappedConfig).forEach(([paramKey, paramValue]) => {
          mappedConfig[paramKey] =
            evaluateSimpleArithmeticExpression(paramValue);
        });

        inputs = inputs.map(input => {
          const evaluatedInput = evaluateInput(input);
          evaluatedConfig = evaluateConfig({
            config: mappedConfig,
            input: evaluatedInput,
            parametersToEvaluate: allowArithmeticExpressions,
          });

          return evaluatedInput;
        });
      }

      // Validate config using the provided configValidation function or schema
      const safeConfig =
        typeof configValidation === 'function'
          ? configValidation(mappedConfig)
          : validate<z.infer<typeof configValidation>>(
              configValidation as ZodType<any>,
              mappedConfig
            );

      if (isArithmeticEnable) {
        Object.entries(safeConfig).forEach(([paramKey, paramValue]) => {
          pureConfig[paramKey] = getParameterFromArithmeticExpression(
            paramValue as string
          );
        });
      }

      // Validate each input using the inputValidation function or schema
      const safeInputs = inputs.map(input => {
        if (typeof inputValidation === 'function') {
          return inputValidation(
            input,
            Object.keys(pureConfig).length ? pureConfig : mappedConfig
          );
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
      const outputs = await implementation(
        inputs,
        evaluatedConfig || safeConfig
      );

      if (isArithmeticEnable) {
        outputParam = Object.keys(outputs[0]).filter(
          ouptut => !Object.keys(inputs[0]).includes(ouptut)
        )[0];
      }
      return inputs.map((input, index) => {
        let output;
        if (isArithmeticEnable) {
          const outputParamValue = outputs[index][outputParam];
          output = evaluateArithmeticOutput(outputParam, outputParamValue);
        }
        return {
          ...input,
          ...mapOutputIfNeeded(output || outputs[index], mapping),
        };
      });
    },
  });
