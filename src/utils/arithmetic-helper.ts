import {PluginParams, ArithmeticParameters} from '../types';

import {ERRORS} from './errors';

const {
  InputValidationError,
  WrongArithmeticExpressionError,
  ZeroDivisionArithmeticOperationError,
} = ERRORS;

/**
 * Parses an arithmetic parameter string by identifying and extracting
 * operands and variables from the input string. This function handles
 * arithmetic symbols, numeric values, and string literals, and returns
 * a list of trimmed and sanitized operands for further processing.
 */
const parseArithmeticParameter = (arithmeticParameter: string) => {
  const stringWithArithmeticSymbols =
    /(\s*[\+\-\*/&]\s*)|(\b\d+\b)|("[^"]+"|'[^']+')|(\b\w[\w-]*\b)/;

  const operands = arithmeticParameter
    .replace('=', '')
    .trim()
    .split(stringWithArithmeticSymbols)
    .filter(Boolean)
    .map(s => s.trim().replace(/^['"](.*)['"]$/, '$1'));

  return [...operands];
};

/**
 * Extracts a parameter from an arithmetic expression.
 */
export const getParameterFromArithmeticExpression = (
  arithmeticParameter: string
) => {
  const regex = /["']?([a-zA-Z]+(?:[-/][a-zA-Z]+)*)["']?/;
  let match;

  if ((match = regex.exec(arithmeticParameter)) !== null) {
    return match[1];
  }
  return arithmeticParameter;
};

/**
 * Evaluates an arithmetic expression provided as a string and returns the result.
 * The function first checks if the `outputParameter` contains an assignment ('=') and extracts the parameter
 * from the expression. If found, the expression is transformed by replacing the assignment and the parameter
 * with the `calculatedResult`, and then evaluated using `eval`. The result is returned as an object.
 * If no assignment is found, the function returns the original `outputParameter` with the `calculatedResult`.
 */
export const evaluateArithmeticOutput = (
  outputParameter: string,
  calculatedResult: number
) => {
  const checkedOutputParameter =
    getParameterFromArithmeticExpression(outputParameter);

  if (outputParameter.includes('=') && checkedOutputParameter) {
    const transformedOutputParameter = outputParameter
      .replace('=', '')
      .replace(`${checkedOutputParameter}`, calculatedResult.toString());

    const result = eval(transformedOutputParameter);

    return {[checkedOutputParameter]: result};
  }

  return {[outputParameter]: calculatedResult};
};

/**
 * Evaluates and updates the input by replacing its properties
 * with the results of arithmetic expressions.
 */
export const evaluateInput = (input: PluginParams) => {
  const evaluatedInput = Object.assign({}, input);
  Object.entries(input).map(([parameter, value]) => {
    evaluatedInput[parameter] = evaluateArithmeticExpression(
      value,
      parameter,
      [],
      evaluatedInput
    );

    return evaluatedInput[parameter];
  });

  return evaluatedInput;
};

/**
 * Evaluates and updates the config by replacing its properties
 * with the results of arithmetic expressions.
 */
export const evaluateConfig = (options: ArithmeticParameters) => {
  const {config, input, parametersToEvaluate} = options;
  const evaluatedConfig = Object.assign({}, config);

  Object.keys(evaluatedConfig).forEach(key => {
    evaluatedConfig[key] = evaluateArithmeticExpression(
      evaluatedConfig[key],
      key,
      parametersToEvaluate,
      input
    );
  });

  return evaluatedConfig;
};

/**
 * Checks if the provided parameter is a valid arithmetic expression.
 * The function uses a regular expression to validate arithmetic expressions
 * that consist of numbers, alphanumeric strings, or quoted strings,
 * separated by arithmetic operators (+, -, *, /). The expression can contain
 * whitespace and support basic arithmetic operations.
 */
export const isValidArithmeticExpression = (parameter: string) => {
  const arithmeticExpression =
    /^\s*(\d+(\.\d+)?|["']?[a-zA-Z0-9-]+["']?)(\s*[-+*/]\s*(\d+(\.\d+)?|["']?[a-zA-Z0-9-]+["']?))*\s*$/;
  const checkedParameter = getParameterFromArithmeticExpression(parameter);

  return (
    parameter !== checkedParameter &&
    parameter.replace('=', '').match(arithmeticExpression)
  );
};

/**
 * Evaluates an arithmetic expression, either directly if the expression contains
 * only numbers and basic mathematical operators (+, -, *, /), or by replacing
 * parameters with corresponding values from the input if specified.
 *
 * - If the expression is not a valid arithmetic expression or if the key is not
 *   included in `parametersToEvaluate` (if provided), the function returns the original expression.
 * - For valid arithmetic expressions with parameters, it replaces parameters with values from `input`.
 * - It handles special cases like division by zero and missing input data, throwing errors when necessary.
 * - The final arithmetic result is computed using the `eval` function
 */
const evaluateArithmeticExpression = (
  expression: string,
  key: string,
  parametersToEvaluate: string[] | undefined,
  input: PluginParams
) => {
  const onlyNumberAndMathSymbols =
    /^\s*\d+(\.\d+)?(\s*[-+*/]\s*\d+(\.\d+)?)*\s*$/;

  if (
    typeof expression !== 'string' ||
    (!expression.includes('=') &&
      !expression.match(onlyNumberAndMathSymbols)) ||
    (parametersToEvaluate?.length && !parametersToEvaluate.includes(key))
  ) {
    return expression;
  }

  const replacedValue = expression.replace('=', '');

  if (replacedValue.match(onlyNumberAndMathSymbols)) {
    expression = eval(replacedValue);
    return expression;
  }

  const operands = parseArithmeticParameter(expression);
  const params: string[] = [];

  operands.forEach(operand => {
    if (operand && !isNaN(Number(operand))) {
      params.push(operand);
    } else if (typeof operand === 'string') {
      if (operand.length === 1 && !operand.match(/[\+\-\*/]/)) {
        throw new WrongArithmeticExpressionError(
          `The operator in \`${expression}\` should be one of these arithmetic operators: *, +, - or \\.`
        );
      } else if (operand.length === 1) {
        params.push(operand);
      } else {
        if (operand in input) {
          if (input[operand] === 0 && operands.includes('/')) {
            throw new ZeroDivisionArithmeticOperationError(
              `Division by zero in \`${key}: ${expression}\` using input parameter \`${operand}\`.`
            );
          }

          params.push(input[operand]);
        } else {
          throw new InputValidationError(
            `${operand} is missing from the input array, or has nullish value.`
          );
        }
      }
    }
  });

  return params.length ? eval(params.join('')) : expression;
};
