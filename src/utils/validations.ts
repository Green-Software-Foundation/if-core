import {ZodIssue, ZodIssueCode, ZodSchema} from 'zod';

import {ERRORS, isValidArithmeticExpression} from '../utils';

const {InputValidationError} = ERRORS;

/**
 * Validates given `object` with given `schema`.
 */
export const validate = <T>(
  schema: ZodSchema<T>,
  object: any,
  index?: number,
  errorConstructor: ErrorConstructor = InputValidationError
) => {
  const validationResult = schema.safeParse(object);

  if (!validationResult.success) {
    throw new errorConstructor(
      prettifyErrorMessage(validationResult.error.message, index)
    );
  }

  return validationResult.data;
};

/**
 * Error message formatter for zod issues.
 */
const prettifyErrorMessage = (issues: string, index?: number) => {
  const issuesArray = JSON.parse(issues);

  return issuesArray.map((issue: ZodIssue) => {
    const code = issue.code;
    let {path, message} = issue;

    const indexErrorMessage = index !== undefined ? ` at index ${index}` : '';

    if (issue.code === ZodIssueCode.invalid_union) {
      message = issue.unionErrors[0].issues[0].message;
      path = issue.unionErrors[0].issues[0].path;
    }

    const fullPath = flattenPath(path);

    if (!fullPath) {
      return message;
    }

    return `"${fullPath}" parameter is ${message.toLowerCase()}${indexErrorMessage}. Error code: ${code}.`;
  });
};

/**
 * Flattens an array representing a nested path into a string.
 */
const flattenPath = (path: (string | number)[]): string => {
  const flattenPath = path.map(part =>
    typeof part === 'number' ? `[${part}]` : part
  );

  return flattenPath.join('.');
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
  value: any
) => {
  if (typeof value === 'string') {
    const sanitizedValue = value.replace('=', '');

    if (isValidArithmeticExpression(sanitizedValue)) {
      const evaluatedParam = evaluateExpression(sanitizedValue) || value;

      if (!isNaN(Number(evaluatedParam))) {
        return true;
      }
    }

    validateExpressionFormat(parameterName, value);
  }

  return value;
};

/**
 * Helper function to evaluate the arithmetic expression.
 */
const evaluateExpression = (expression: string) => {
  try {
    return eval(expression);
  } catch {
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
