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
 * Validates if the provided value is a valid arithmetic expression for the given parameter.
 *
 * If the value contains an equal sign ('=') but is not a valid arithmetic expression,
 * or if it does not contain an equal sign but is a valid arithmetic expression,
 * an InputValidationError is thrown with an appropriate error message.
 */
export const validateArithmeticExpression = (paramName: string, value: any) => {
  if (
    typeof value === 'string' &&
    ((value?.includes('=') && !isValidArithmeticExpression(value)) ||
      (!value?.includes('=') && isValidArithmeticExpression(value)))
  ) {
    throw new InputValidationError(
      `The \`${paramName}\` contains an invalid arithmetic expression. It should start with \`=\` and include the symbols \`*\`, \`+\`, \`-\` and \`/\`.`
    );
  }

  return value;
};
