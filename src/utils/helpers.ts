import {MappingParams, PluginParams} from '../types';

/**
 * Maps input data if the mapping has valid data.
 */
export const mapInputIfNeeded = (
  input: PluginParams,
  mapping: MappingParams
) => {
  const newInput = Object.assign({}, input);

  Object.entries(mapping || {}).forEach(([key, value]) => {
    if (value in newInput) {
      const mappedKey = input[value];
      newInput[key] = mappedKey;
      delete newInput[value];
    }
  });

  return newInput;
};

/**
 * Maps config data if the mapping hass valid data.
 */
export const mapConfigIfNeeded = (config: any, mapping: MappingParams) => {
  if (!mapping) {
    return config;
  }

  if (typeof config !== 'object' || config === null) {
    return config;
  }

  const result: Record<string, any> = Array.isArray(config) ? [] : {};

  Object.entries(config).forEach(([key, value]) => {
    const mappedKey = mapping[key] || key;

    if (typeof value === 'object' && value !== null) {
      result[mappedKey] = mapConfigIfNeeded(value, mapping);
    } else {
      result[mappedKey] =
        typeof value === 'string' && value in mapping ? mapping[value] : value;
    }
  });

  return result;
};

/**
 * Maps the output parameter of the plugin if the `mapping` parameter is provided.
 */
export const mapOutputIfNeeded = (
  output: PluginParams,
  mapping: MappingParams
) => {
  if (!mapping) return output;

  return Object.entries(output).reduce((acc, [key, value]) => {
    if (key in mapping) {
      acc[mapping[key]] = value;
    } else {
      acc[key] = value;
    }
    return acc;
  }, {} as PluginParams);
};
