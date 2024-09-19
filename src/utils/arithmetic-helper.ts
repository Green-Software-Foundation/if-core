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
      .replace(`${checkedOutputParameter}`, calculatedResult.toString())
      .replace(/['"]/g, '');
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

  return !!(
    parameter !== checkedParameter &&
    parameter.replace('=', '').match(arithmeticExpression)
  );
};

/**
 * Evaluates an arithmetic expression by validating it first,
 * then either returning the original expression or evaluating its value.
 *
 * The function performs the following:
 * 1. Checks if the expression is valid based on the provided parameters.
 * 2. If valid, it returns the original expression.
 * 3. If the expression is a basic arithmetic operation, it evaluates the expression.
 * 4. If not, it proceeds to evaluate more complex expressions.
 */
const evaluateArithmeticExpression = (
  expression: string,
  parameterValue: string,
  parametersToEvaluate: string[],
  input: PluginParams
) => {
  if (isExpressionValid(expression, parameterValue, parametersToEvaluate)) {
    return expression;
  }

  const replacedValue = expression.replace('=', '');

  if (isBasicArithmetic(replacedValue)) {
    return eval(expression);
  }

  return evaluateComplexExpression(
    expression,
    parameterValue,
    parametersToEvaluate,
    input
  );
};

/**
 * Validates whether a given expression is a valid arithmetic expression or not.
 */
const isExpressionValid = (
  expression: string,
  parameterValue: string,
  parametersToEvaluate: string[]
) => {
  const onlyNumberAndMathSymbols =
    /^\s*\d+(\.\d+)?(\s*[-+*/]\s*\d+(\.\d+)?)*\s*$/;

  return (
    typeof expression !== 'string' ||
    (!expression.includes('=') &&
      !expression.match(onlyNumberAndMathSymbols)) ||
    (parametersToEvaluate?.length &&
      !parametersToEvaluate.includes(parameterValue))
  );
};

/**
 * Checks if a given string is a basic arithmetic expression.
 * Validates if the input string consists only of numbers
 * and basic arithmetic operators (+, -, *, /).
 */
const isBasicArithmetic = (expression: string): boolean => {
  const onlyNumberAndMathSymbols =
    /^\s*\d+(\.\d+)?(\s*[-+*/]\s*\d+(\.\d+)?)*\s*$/;
  return onlyNumberAndMathSymbols.test(expression);
};

/**
 * Evaluates a complex arithmetic expression by parsing it into operands,
 * validating whether each operand is a number or an operator, and evaluating
 * any parameters within the expression. The resulting valid operands are
 * joined together and evaluated using `eval`.
 */
const evaluateComplexExpression = (
  expression: string,
  parameterValue: string,
  parametersToEvaluate: string[],
  input: PluginParams
) => {
  const operands = parseArithmeticParameter(expression);
  const params: string[] = [];

  operands.forEach(operand => {
    // Check if the operand is a number
    if (operand && !isNaN(Number(operand))) {
      params.push(operand);
    } else if (isOperandOperator(operand, expression)) {
      params.push(operand);
    } else {
      const evaluatedOperand = evaluateOperand({
        parameter: operand,
        expression,
        parameterValue,
        parametersToEvaluate,
        input,
      });
      params.push(evaluatedOperand);
    }
  });

  return params.length ? eval(params.join('')) : expression;
};

/**
 * Checks if a given operand is a valid arithmetic operator within an expression.
 * Throws an error if the operand is not one of the allowed arithmetic operators: *, +, -, or /.
 */
const isOperandOperator = (operand: string, expression: string) => {
  if (operand.length === 1 && !/[\+\-\*/]/.test(operand)) {
    throw new WrongArithmeticExpressionError(
      `The operator in \`${expression}\` should be one of these arithmetic operators: *, +, - or \\.`
    );
  } else if (operand.length === 1) {
    return true;
  }

  return false;
};

/**
 * Evaluates the value of a given parameter from the input.
 * If the parameter's value is an arithmetic expression, it evaluates the expression.
 * Otherwise, it returns the parameter's value directly.
 */
const evaluateOperand = (operandOptions: {
  parameter: string;
  expression: string;
  parameterValue: string;
  parametersToEvaluate: string[];
  input: PluginParams;
}) => {
  const {parameter, expression, parameterValue, parametersToEvaluate, input} =
    operandOptions;

  if (!(parameter in input)) {
    throw new InputValidationError(
      `${parameter} is missing from the input array or has nullish value.`
    );
  }

  const isExpression = isValidArithmeticExpression(input[parameter]);

  if (isExpression) {
    return evaluateArithmeticExpression(
      input[parameter],
      parameter,
      [...(parametersToEvaluate || []), parameter],
      input
    );
  }

  if (input[parameter] === 0 && expression.includes('/')) {
    throw new ZeroDivisionArithmeticOperationError(
      `Division by zero in \`${parameterValue}: ${expression}\` using input parameter \`${parameter}\`.`
    );
  }

  return input[parameter];
};

/**
 * Evaluates a simple arithmetic expression if the input is a valid expression.
 * It checks if the input string follows a pattern for simple arithmetic
 * operations (numbers with operators like *, /, +, -) between them.
 */
export const evaluateSimpleArithmeticExpression = (parameter: string) => {
  const simpleExpressionRegex = /^\d+([*_/+])\d+$/;

  return typeof parameter === 'string' && parameter.match(simpleExpressionRegex)
    ? eval(parameter)
    : parameter;
};
