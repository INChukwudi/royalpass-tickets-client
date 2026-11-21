import { apiErrorMessage } from './api-error-message';

describe('apiErrorMessage', () => {
  it('prioritizes an API message', () => {
    expect(apiErrorMessage({status: 422,error:{message:'Question 2: enter the question text.'}},'Fallback'))
      .toBe('Question 2: enter the question text.');
  });

  it('reads Problem Details and validation dictionaries', () => {
    expect(apiErrorMessage({status:400,error:{detail:'Invalid game.'}},'Fallback')).toBe('Invalid game.');
    expect(apiErrorMessage({status:400,error:{errors:{Questions:['Add a question.']}}},'Fallback')).toBe('Add a question.');
  });

  it('reports network failures clearly', () => {
    expect(apiErrorMessage({status:0},'Fallback')).toContain('could not be reached');
  });
});
