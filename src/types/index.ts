/** Coefficient */
export type CoefficientConfig = {
  'input-parameter': string;
  coefficient: number;
  'output-parameter': string;
};

/** Exponent */
export type ExponentConfig = {
  'input-parameter': string;
  exponent: number;
  'output-parameter': string;
};

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

/** Multiply */
export type MultiplyConfig = {
  'input-parameters': string[];
  'output-parameter': string;
};

/** Substract */
export type SubtractConfig = {
  'input-parameters': string[];
  'output-parameter': string;
};

/** Sum */
export type SumConfig = {
  'input-parameters': string[];
  'output-parameter': string;
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

export type ParameterMetadata = {
  [key: string]: {
    description: string;
    unit: string;
    'aggregation-method': 'sum' | 'avg' | 'none';
  };
};

export type PluginParametersMetadata = {
  inputs: ParameterMetadata;
  outputs: ParameterMetadata;
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
