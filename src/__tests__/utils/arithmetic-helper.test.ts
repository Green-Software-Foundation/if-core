import { 
  evaluateArithmeticOutput, 
  evaluateConfig, 
  evaluateInput, 
  evaluateSimpleArithmeticExpression, 
  getParameterFromArithmeticExpression, 
  isValidArithmeticExpression,
  validateArithmeticExpression
} from "../../utils";

import { ERRORS } from '../../utils/errors';

const { WrongArithmeticExpressionError, InputValidationError } = ERRORS;

describe('utils:arithmetic-helper: ', () => {
  describe('getParameterFromArithmeticExpression(): ', () => {
    it('extracts a single parameter without quotes.', () => {
      const arithmeticParameter = "parameter"
      const expectedValue = "parameter"

      expect(getParameterFromArithmeticExpression(arithmeticParameter)).toBe(expectedValue);
    });
  
    it('extracts a parameter with quotes.', () => {
      const arithmeticParameter = "'parameter'"
      const expectedValue = "parameter"
      
      expect(getParameterFromArithmeticExpression(arithmeticParameter)).toBe(expectedValue);
    });
  
    it('extracts a parameter with hyphen or slash.', () => {
      const arithmeticParameter = "param-name"
      const arithmeticParameterWithSlash = "param/name"
      const expectedValue = "param-name"
      const expectedValueWithSlash = "param/name"

      expect(getParameterFromArithmeticExpression(arithmeticParameter)).toBe(expectedValue);
      expect(getParameterFromArithmeticExpression(arithmeticParameterWithSlash)).toBe(expectedValueWithSlash);
    });
  
    it('returns the original input if no match is found.', () => {
      const arithmeticParameter = "123"
      const expectedValue = "123"
      const arithmeticParameterEmptyString = ""
      const expectedValueEmptyString = ""
      const arithmeticParameterExclamation = "!!"
      const expectedValueExclamation = "!!"

      expect(getParameterFromArithmeticExpression(arithmeticParameter)).toBe(expectedValue);
      expect(getParameterFromArithmeticExpression(arithmeticParameterEmptyString)).toBe(expectedValueEmptyString);
      expect(getParameterFromArithmeticExpression(arithmeticParameterExclamation)).toBe(expectedValueExclamation);
    });
  
    it('should return non-string inputs as-is.', () => {
      // @ts-ignore
      expect(getParameterFromArithmeticExpression(123)).toBe(123);
      // @ts-ignore
      expect(getParameterFromArithmeticExpression(null)).toBe(null);
      // @ts-ignore
      expect(getParameterFromArithmeticExpression(undefined)).toBe(undefined);
    });
  })

  describe('evaluateArithmeticOutput(): ', () => {
    it('should correctly evaluate a simple value.', () => {
      const outputParameter = 'result';
      const output = { result: 10 };
  
      const result = evaluateArithmeticOutput(outputParameter, output);
  
      expect(result).toEqual({ result: 10 });
    });
  
    it('should evaluate and replace parameter with calculated result in a complex expression.', () => {
      const outputParameter = '=2*result';
      const output = { '=2*result': 10 };
  
      const result = evaluateArithmeticOutput(outputParameter, output);
  
      expect(result).toEqual({ result: 20 });
    });
  
    it('should throw an error for invalid arithmetic expressions.', () => {
      const outputParameter = "invalid*parameter";
      const output = { "invalid*parameter": 5 };
  
      expect(() => {
        evaluateArithmeticOutput(outputParameter, output);
      }).toThrow(WrongArithmeticExpressionError);
    });
  
    it('should return outputParameter without changes if no "=" in expression.', () => {
      const outputParameter = 'output';
      const output = { output: 15 };
  
      const result = evaluateArithmeticOutput(outputParameter, output);
  
      expect(result).toEqual({ output: 15 });
    });
  
    it('should throw error if division by zero occurs in expression.', () => {
      const outputParameter = 'result=10/0';
      const output = { result: 0 };
  
      expect(() => {
        evaluateArithmeticOutput(outputParameter, output);
      }).toThrow();
    });
  
    it('should return output with calculated result when expression is valid.', () => {
      const outputParameter = '=result+15';
      const output = { '=result+15': 5 };
  
      const result = evaluateArithmeticOutput(outputParameter, output);
  
      expect(result).toEqual({ result: 20 });
    });

    it('should handle non-numeric values in output gracefully.', () => {
      const outputParameter = '=result*2';
      const output = { result: 'non-numeric' };
  
      expect(() => {
        evaluateArithmeticOutput(outputParameter, output);   
      }).toThrow()
    });
  
    it('should return original output when expression is invalid but no "=" sign.', () => {
      const outputParameter = 'invalidExpression';
      const output = { result: 5 };
  
      const result = evaluateArithmeticOutput(outputParameter, output);
  
      expect(result).toEqual({ result: 5, invalidExpression: undefined });
    });
  
    it('should correctly process a parameter with spaces and special characters.', () => {
      const outputParameter = '= result + 10';
      const output = { '= result + 10': 15 };
  
      const result = evaluateArithmeticOutput(outputParameter, output);
  
      expect(result).toEqual({ result: 25 });
    });
  })

  describe('evaluateInput(): ', () => {
    it('should return the same input when no expressions are present.', () => {
      const input = { param1: 10, param2: 20 };
      
      const result = evaluateInput(input);
  
      expect(result).toEqual({ param1: 10, param2: 20 });
    });

    it('should evaluate simple arithmetic expression for a parameter.', () => {
      const input = { param1: '=2*5' };
      
      const result = evaluateInput(input);
  
      expect(result).toEqual({ param1: 10 });
    });
  
    it('should evaluate multiple parameters with arithmetic expressions', () => {
      const input = { param1: '=2*5', param2: '=3+7' };
      
      const result = evaluateInput(input);
  
      expect(result).toEqual({ param1: 10, param2: 10 });
    });
  
    it('should evaluate parameters with dependencies on other parameters', () => {
      const input = { param1: 10, param2: '=param1*2' };
      
      const result = evaluateInput(input);
  
      expect(result).toEqual({ param1: 10, param2: 20 });
    });
  
    it('should evaluate nested dependencies', () => {
      const input = { param1: 10, param2: '=param1*2', param3: '=param2+5' };
      
      const result = evaluateInput(input);
  
      expect(result).toEqual({ param1: 10, param2: 20, param3: 25 });
    });
  
    it('should return original value if expression is invalid', () => {
      const input = { param1: '=invalid*expression' };
      
      expect(() => {
        evaluateInput(input);
      }).toThrow(InputValidationError)
    });
  
    it('should handle a mix of valid expressions, dependencies, and plain values', () => {
      const input = { param1: 10, param2: '=param1+5', param3: 30, param4: '=param3*2' };
      
      const result = evaluateInput(input);
  
      expect(result).toEqual({ param1: 10, param2: 15, param3: 30, param4: 60 });
    });

    it('should throw an error for unsupported arithmetic operator in expression.', () => {
      const input = { param1: '=2%5' };
    
      expect(() => evaluateInput(input)).toThrow(
        new WrongArithmeticExpressionError(
          'The operator in `=2%5` should be one of these arithmetic operators: *, +, - or /.'
        )
      );
    });

    it('should throw an error if a parameter value is not a number.', () => {
      const input = { param1: '=param2*2', param2: 'mock-param' }; 
    
      expect(() => evaluateInput(input)).toThrow(
        new InputValidationError(
          'The value of the `param2` parameter in the input array is not a number.'
        )
      );
    });

    // it('should throw an error when input contains division by zero.', () => {
    //   const input = { param1: '=10/0' };
  
    //   expect(() => {
    //     const response = evaluateInput(input);
    //     console.log(response)
    //   }).toThrow(
    //     new Error('Division by zero is not allowed in arithmetic expressions.')
    //   );
    // });
  })

  describe('evaluateConfig():', () => {
      // it('should evaluate a simple arithmetic expression in config', () => {
      //   const options = {
      //     config: { param1: '=2*5' },
      //     input: {},
      //     parametersToEvaluate: ['param1']
      //   };
    
      //   const result = evaluateConfig(options);
    
      //   expect(result).toEqual({ param1: 10 });
      // });
    
      it('should skip evaluation if parameter is not in parametersToEvaluate', () => {
        const options = {
          config: { param1: '=2*5', param2: '10' },
          input: {},
          parametersToEvaluate: []
        };
    
        const result = evaluateConfig(options);
    
        expect(result).toEqual({ "param1": "=2*5", param2: '10' });
      });
    
      it('should throw error for invalid arithmetic expression', () => {
        const options = {
          config: { param1: '=2^5' },
          input: {},
          parametersToEvaluate: ['param1']
        };
    
        expect(() => evaluateConfig(options)).toThrow(
          "The `param1` contains an invalid arithmetic expression. It should start with `=` and include the symbols `*`, `+`, `-` and `/`."
        );
      });
    
      it('should use values from input in arithmetic expression', () => {
        const options = {
          config: { param1: '=inputValue*2' },
          input: { inputValue: 5 },
          parametersToEvaluate: ['param1']
        };
    
        const result = evaluateConfig(options);
    
        expect(result).toEqual({ param1: 10 });
      });
    
      it('should return original config if no parameters need evaluation.', () => {
        const options = {
          config: { param1: '10', param2: '20' },
          input: {},
          parametersToEvaluate: []
        };
    
        const result = evaluateConfig(options);
    
        expect(result).toEqual({ param1: '10', param2: '20' });
      });
    });

    describe('isValidArithmeticExpression(): ', () => {
      it('should return true for a valid arithmetic expression with variables.', () => {
        const parameter = '=param1*2';
        const result = isValidArithmeticExpression(parameter);

        expect(result).toBe(true);
      });
    
      it('should return true for a valid arithmetic expression with variables and numbers.', () => {
        const parameter = '=param1+5/2';
        const result = isValidArithmeticExpression(parameter);

        expect(result).toBe(true);
      });
    
      it('should return false for an expression without the "=" sign.', () => {
        const parameter = '2+3*5';
        const result = isValidArithmeticExpression(parameter);

        expect(result).toBe(false);
      });
    
      it('should return false for an expression with invalid characters.', () => {
        const parameter = '=param1^2';
        const result = isValidArithmeticExpression(parameter);

        expect(result).toBe(false);
      });
    
      it('should return false for an expression with unsupported operators.', () => {
        const parameter = '=param1&2';
        const result = isValidArithmeticExpression(parameter);

        expect(result).toBe(false);
      });
    
      it('should return true for a parameter that is not an expression (e.g., just a variable).', () => {
        const parameter = 'param1';
        const result = isValidArithmeticExpression(parameter);

        expect(result).toBe(true);
      });
    
      it('should return false for an invalid expression with missing operands.', () => {
        const parameter = '=param1+';
        const result = isValidArithmeticExpression(parameter);

        expect(result).toBe(false);
      });
    
      it('should return true for a valid expression with mixed numbers and variables.', () => {
        const parameter = '=5+param1/3-2';
        const result = isValidArithmeticExpression(parameter);

        expect(result).toBe(true);
      });
    
      it('should return true for a valid arithmetic expression with decimal numbers.', () => {
        const parameter = '=5.5*3.2*param1';
        const result = isValidArithmeticExpression(parameter);
        expect(result).toBe(true);
      });
    });

    describe('evaluateSimpleArithmeticExpression(): ', () => {
      it('should evaluate a valid addition expression.', () => {
        const parameter = '=2+3';
        const result = evaluateSimpleArithmeticExpression(parameter);
        
        expect(result).toBe(5);
      });
    
      // it('should evaluate a valid subtraction expression.', () => {
      //   const parameter = '=10-4';
      //   const result = evaluateSimpleArithmeticExpression(parameter);

      //   expect(result).toBe(6);
      // });
    
      it('should evaluate a valid multiplication expression.', () => {
        const parameter = '=2*3';
        const result = evaluateSimpleArithmeticExpression(parameter);

        expect(result).toBe(6);
      });
    
      it('should evaluate a valid division expression', () => {
        const parameter = '=10/2';
        const result = evaluateSimpleArithmeticExpression(parameter);

        expect(result).toBe(5);
      });
    
      it('should return the original parameter if there is no "=" sign', () => {
        const parameter = '2+3';
        const result = evaluateSimpleArithmeticExpression(parameter);

        expect(result).toBe(5);
      });
    
      it('should return the original parameter if the expression format is invalid', () => {
        const parameter = '=2+3*5';
        const result = evaluateSimpleArithmeticExpression(parameter);
        expect(result).toBe('=2+3*5');
      });
    
      it('should return the original parameter if it contains unsupported characters', () => {
        const parameter = '=a+b';
        const result = evaluateSimpleArithmeticExpression(parameter);
        expect(result).toBe('=a+b');
      });
    
      it('should return the original parameter if it is not a simple expression', () => {
        const parameter = '=param1*2';
        const result = evaluateSimpleArithmeticExpression(parameter);
        expect(result).toBe('=param1*2');
      });
    
      it('should return the original parameter if it is a standalone number', () => {
        const parameter = '=42';
        const result = evaluateSimpleArithmeticExpression(parameter);
        expect(result).toBe('=42');
      });
    
      it('should return the original parameter if the expression contains decimals', () => {
        const parameter = '=2.5+3.5';
        const result = evaluateSimpleArithmeticExpression(parameter);
        expect(result).toBe('=2.5+3.5');
      });
    });

    describe('validateArithmeticExpression', () => {
      it('should return true for a valid arithmetic expression.', () => {
        const parameterName = 'param1';
        const value = '=param1+3';
        
        const result = validateArithmeticExpression(parameterName, value);
        expect(result).toBe(value);
      });
    
      it('should return the evaluated number when type is "number" and value is a simple numeric string.', () => {
        const parameterName = 'param2';
        const value = '=param2*2';
        const type = 'number';
        
        const result = validateArithmeticExpression(parameterName, value, type);
        expect(result).toBe(2);  
      });
    
      it('should throw error if value is invalid arithmetic expression.', () => {
        const parameterName = 'param3';
        const value = '=5+*2';
        
        expect(() => {
          validateArithmeticExpression(parameterName, value)
        }).toThrow()
      });
    
      it('should return as is if expression is valid but there is nothing to inject.', () => {
        const parameterName = 'param4';
        const value = '=a+b';
        
        const result = validateArithmeticExpression(parameterName, value);
        expect(result).toBe(value)
      });
    
      it('should return the parsed number if type is "number" and value is a simple number string without expression.', () => {
        const parameterName = 'param5';
        const value = '42';
        const type = 'number';
        
        const result = validateArithmeticExpression(parameterName, value, type);
        expect(result).toBe(parseInt(value));
      });
    
      it('should return the original non-string value.', () => {
        const parameterName = 'param6';
        const value = 100; 
        
        const result = validateArithmeticExpression(parameterName, value);
        expect(result).toBe(value);
      });
    
      it('should return the original value if type is "number" but no valid number is parsed.', () => {
        const parameterName = 'param7';
        const value = '=invalid+value';
        const type = 'number';
        
        const result = validateArithmeticExpression(parameterName, value, type);
        expect(result).toBe(value);
      });
    });
})
