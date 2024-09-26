import z from 'zod';

import {AGGREGATION_METHODS} from '../consts';

/** Interpolation */
export enum Method {
  LINEAR = 'linear',
  SPLINE = 'spline',
  POLYNOMIAL = 'polynomial',
}

/** Mock Observations */
import {DateTime} from 'luxon';

export type Generator = {
  /**
   * Generate the next value, optionally based on historical values
   */
  next: (historical: Object[] | undefined) => Object;
};

export type ObservationParams = {
  duration: number;
  timeBucket: DateTime;
  component: Record<string, string>;
  generators: Generator[];
};

export type RandIntGeneratorParams = {
  name: string;
  min: number;
  max: number;
};

/** Interface */
export type PluginParams = Record<string, any>;
export type ExecutePlugin = {
  execute: (
    inputs: PluginParams[],
    config?: Record<string, any>
  ) => PluginParams[] | Promise<PluginParams[]>;
  metadata: {
    kind: string;
    inputs?: ParameterMetadata;
    outputs?: ParameterMetadata;
  };
  [key: string]: any;
};

export type AggregationMethodTypes = (typeof AGGREGATION_METHODS)[number];

export type AggregationOptions = {
  time: AggregationMethodTypes;
  component: AggregationMethodTypes;
};

export type ParameterMetadata = Record<string, 
  {
    description: string;
    unit: string;
    'aggregation-method': AggregationOptions;
  }>

export type PluginParametersMetadata = {
  inputs?: ParameterMetadata;
  outputs?: ParameterMetadata;
};

/** Time sync */
export type TimeNormalizerConfig = {
  'start-time': Date | string;
  'end-time': Date | string;
  interval: number;
  'allow-padding': boolean;
};

export type PaddingReceipt = {
  start: boolean;
  end: boolean;
};

export type TimeParams = {
  startTime: DateTime;
  endTime: DateTime;
  interval: number;
  allowPadding: boolean;
};

/** Common */
export type ConfigParams = Record<string, any>;
export type MappingParams = Record<string, string>;

/** Group-by */
export type GroupByPlugin = {
  execute: (inputs: PluginParams[], config: GroupByConfig) => {children: any};
  metadata: {
    kind: string;
  };
  [key: string]: any;
};

export type GroupByConfig = {
  group: string[];
};

export type ArithmeticParameters = {
  config: any;
  input: PluginParams;
  parametersToEvaluate: string[];
};

/**
 * Plugin factory types.
 */
export type InputValidatorFunction = (
  input: PluginParams,
  config: ConfigParams,
  index?: number
) => PluginParams;
export type ConfigValidatorFunction = (config: ConfigParams) => ConfigParams;

export interface PluginFactoryParams<C = ConfigParams> {
  metadata: PluginParametersMetadata;
  implementation: (
    inputs: PluginParams[],
    config: C,
    mapping?: MappingParams
  ) => Promise<PluginParams[]>;
  configValidation?: z.ZodSchema | ConfigValidatorFunction;
  inputValidation?: z.ZodSchema | InputValidatorFunction;
  allowArithmeticExpressions?: string[];
}
