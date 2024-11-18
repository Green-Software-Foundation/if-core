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
  const regexForNumbers = /^=?[0-9+\-*/\s]+$/;

  const match =
    regex.exec(arithmeticParameter) ||
    regexForNumbers.exec(arithmeticParameter);

  if (regexForNumbers.exec(arithmeticParameter)) {
    const evaluatedValue = eval(
      arithmeticParameter.toString().replace('=', '')
    );

    if (!isNaN(evaluatedValue) && isFinite(evaluatedValue)) {
      return evaluatedValue;
    }
  }

  if (typeof arithmeticParameter === 'string' && match !== null) {
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
  output: PluginParams
) => {
  const checkedOutputParameter =
    getParameterFromArithmeticExpression(outputParameter);
  const isValidExpression = isValidArithmeticExpression(outputParameter);
  const valueFromOutput = output[outputParameter];

  if (
    typeof outputParameter === 'string' &&
    outputParameter.includes('=') &&
    checkedOutputParameter &&
    isValidExpression
  ) {
    const transformedOutputParameter = outputParameter
      .replace('=', '')
      .replace(`${checkedOutputParameter}`, valueFromOutput.toString())
      .replace(/['"]/g, '');

    const result = evaluateExpression(transformedOutputParameter);
    delete output[outputParameter];

    return {
      ...output,
      [checkedOutputParameter]: result,
    };
  } else if (outputParameter !== checkedOutputParameter) {
    throw new WrongArithmeticExpressionError(
      `The output parameter \`${outputParameter}\` contains an invalid arithmetic expression. It should start with \`=\` and include the symbols \`*\`, \`+\`, \`-\` and \`/\`.`
    );
  }

  return output;
};

/**
 * Evaluates and updates the input by replacing its properties
 * with the results of arithmetic expressions.
 */
export const evaluateInput = (input: PluginParams) => {
  const evaluatedInput = Object.assign({}, input);

  Object.entries(input).forEach(([parameter, value]) => {
    evaluatedInput[parameter] = evaluateArithmeticExpression(
      value,
      parameter,
      [],
      evaluatedInput
    );
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

  Object.keys(evaluatedConfig).forEach(parameter => {
    if (parametersToEvaluate.includes(parameter)) {
      validateArithmeticExpression(parameter, evaluatedConfig[parameter]);

      evaluatedConfig[parameter] = evaluateArithmeticExpression(
        evaluatedConfig[parameter],
        parameter,
        parametersToEvaluate,
        input
      );
    }
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
 * 1. Checks if the paramenter is `timestamp`, returns the value.
 * 2. Checks if the expression is valid based on the provided parameters.
 * 3. If valid, it returns the original expression.
 * 4. If the expression is a basic arithmetic operation, it evaluates the expression.
 * 5. If not, it proceeds to evaluate more complex expressions.
 */
const evaluateArithmeticExpression = (
  expression: string,
  parameter: string,
  parametersToEvaluate: string[],
  input: PluginParams
) => {
  if (parameter === 'timestamp') {
    return input[parameter];
  }

  if (isNotArithmeticExpression(expression)) {
    return expression;
  }

  const strippedEqualExpression = expression.replace('=', '');

  if (isBasicArithmetic(strippedEqualExpression)) {
    return evaluateExpression(strippedEqualExpression);
  }

  return evaluateComplexExpression(
    expression,
    parameter,
    parametersToEvaluate,
    input
  );
};

/**
 * Checks if the given expression is not an arithmetic expression.
 */
const isNotArithmeticExpression = (expression: string) =>
  typeof expression !== 'string' ||
  (!expression.includes('=') && !containsOnlyNumbersAndOperators(expression));

/**
 * Utility function to check if a string contains only numbers and basic math operators.
 */
const containsOnlyNumbersAndOperators = (expression: string): boolean => {
  const numberAndMathSymbolsRegex =
    /^\s*\d+(\.\d+)?(\s*[-+*/]\s*\d+(\.\d+)?)*\s*$/;

  return numberAndMathSymbolsRegex.test(expression);
};

/**
 * Checks if the provided expression is a basic arithmetic expression.
 */
const isBasicArithmetic = (expression: string): boolean =>
  typeof expression === 'string' && containsOnlyNumbersAndOperators(expression);

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

  return params.length ? evaluateExpression(params.join('')) : expression;
};

/**
 * Checks if a given operand is a valid arithmetic operator within an expression.
 * Throws an error if the operand is not one of the allowed arithmetic operators: *, +, -, or /.
 */
const isOperandOperator = (operand: string, expression: string) => {
  if (operand.length === 1 && !/[\+\-\*/]/.test(operand)) {
    throw new WrongArithmeticExpressionError(
      `The operator in \`${expression}\` should be one of these arithmetic operators: *, +, - or /.`
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

  // Checks if the parameter in the input array has number value.
  if (isNaN(Number(input[parameter]))) {
    throw new InputValidationError(
      `The value of the \`${parameter}\` parameter in the input array is not a number.`
    );
  }

  const isExpression = isValidArithmeticExpression(expression);

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

  return typeof parameter === 'string' &&
    parameter.replace('=', '').match(simpleExpressionRegex)
    ? evaluateExpression(parameter.replace('=', ''))
    : parameter;
};

/**
 * Validates whether a given value is a valid arithmetic expression.
 *
 * If the value is a string, it first removes any equal signs and checks if it
 * is a valid arithmetic expression using the `isValidArithmeticExpression` helper.
 * If valid, it attempts to evaluate the expression and ensures the result is numeric.
 * In case of an invalid format, it calls `validateExpressionFormat`.
 * The function returns true if the value is valid or numeric.
 */
export const validateArithmeticExpression = (
  parameterName: string,
  value: any,
  type?: any
) => {
  if (typeof value === 'string') {
    const sanitizedValue = value.replace('=', '');

    if (isValidArithmeticExpression(sanitizedValue)) {
      const evaluatedParam = evaluateExpression(sanitizedValue) || value;

      if (!isNaN(Number(evaluatedParam))) {
        return evaluatedParam;
      }
    }

    validateExpressionFormat(parameterName, value);

    if (type === 'number') {
      const numberMatch = sanitizedValue.match(/[-+]?[0-9]*\.?[0-9]+/g);

      return numberMatch ? parseFloat(numberMatch[0]) : value;
    }
  }

  return value;
};

/**
 * Helper function to evaluate the arithmetic expression.
 */
const evaluateExpression = (expression: string) => {
  try {
    const evaluatedValue = eval(expression);
    if (evaluatedValue === Infinity) {
      throw new ZeroDivisionArithmeticOperationError(
        `The input expression contains a division by zero: \`${expression}\`.`
      );
    }
    if (isNaN(evaluatedValue)) {
      return undefined;
    }

    return evaluatedValue;
  } catch (error) {
    if (error instanceof ZeroDivisionArithmeticOperationError) {
      throw error;
    }

    return undefined;
  }
};

/**
 * Validates whether the provided string value is a valid arithmetic expression based on its format.
 *
 * Checks if the expression contains an `=` sign and ensures that
 * the part of the string following the equal sign is a valid arithmetic expression.
 *
 * - If the string starts with `=`, the remaining part should be a valid arithmetic expression.
 * - If it doesn't start with `=`, the entire string should not resemble a valid arithmetic expression.
 *
 * Throws an `InputValidationError` error if the format or content of the arithmetic expression is invalid.
 */
const validateExpressionFormat = (parameterName: string, value: string) => {
  const hasEqualSign = value.includes('=');
  const isValid = isValidArithmeticExpression(value.replace('=', ''));

  if ((hasEqualSign && !isValid) || (!hasEqualSign && isValid)) {
    throw new InputValidationError(
      `The \`${parameterName}\` contains an invalid arithmetic expression. It should start with \`=\` and include the symbols \`*\`, \`+\`, \`-\` and \`/\`.`
    );
  }
};
