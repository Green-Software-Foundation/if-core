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
  <C = ConfigParams>(params: PluginFactoryParams<C>) =>
  (
    config: C = {} as C,
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
        allowArithmeticExpressions,
      } = params;
      let evaluatedConfig;
      let outputParam: string;
      const expressionCleanedConfig: ConfigParams = {};
      const isArithmeticEnable = !!allowArithmeticExpressions;
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
      const safeConfig = configValidation ? 
        typeof configValidation === 'function'
          ? configValidation(mappedConfig)
          : validate<z.infer<typeof configValidation>>(
              configValidation as ZodType<any>,
              mappedConfig
            ) : config

      // Check if arithmetic expressions are enabled, store the cleaned version of the expression into expressionCleanedConfig
      if (isArithmeticEnable) {
        Object.entries(safeConfig).forEach(([paramKey, paramValue]) => {
          expressionCleanedConfig[paramKey] =
            getParameterFromArithmeticExpression(paramValue as string);
        });
      }

      // Validate each input using the inputValidation function or schema
      const safeInputs = inputs.map((input, index) => {
        if (!inputValidation) {
          return input
        };

        if (typeof inputValidation === 'function') {
          return inputValidation(
            input,
            Object.keys(expressionCleanedConfig).length
              ? expressionCleanedConfig
              : safeConfig,
            index
          );
        }

        return validate<z.infer<typeof inputValidation>>(
          inputValidation as ZodType<any>,
          input,
          index
        );
      });

      // Apply mapping to inputs if needed
      inputs = safeInputs.map((safeInput, index) => ({
        ...inputs[index],
        ...mapInputIfNeeded(safeInput, mapping),
      }));

      // Execute the callback with the validated and possibly mapped inputs
      const outputs = await implementation(inputs, {
        ...safeConfig,
        ...(evaluatedConfig || {}),
        mapping,
      });

      // Check if arithmetic expressions are enabled, get output parameter
      if (isArithmeticEnable) {
        outputParam = Object.keys(outputs[0]).filter(
          ouptut => !Object.keys(inputs[0]).includes(ouptut)
        )[0];
      }

      return outputs.map((output, index) => {
        // Check if arithmetic expressions are enabled, evaluate output parameter
        const resultOutput = isArithmeticEnable
          ? evaluateArithmeticOutput(outputParam, output[outputParam])
          : output;
      
        // Merge input if it exists, otherwise just use the output
        const correspondingInput = inputs[index] || {};
        
        return {
          ...correspondingInput,
          ...mapOutputIfNeeded(resultOutput, mapping),
        };
      });
    },
  });
