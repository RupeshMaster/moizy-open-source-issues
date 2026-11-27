const test = require('node:test');
const assert = require('node:assert/strict');

const {
  validateRequired,
  validateEmail,
  validatePassword,
  validateNumber,
  validateField
} = require('../src/utils/validation');

const VALID = { valid: true, message: '' };

test('validateRequired rejects missing and blank values', () => {
  const expected = { valid: false, message: 'This field is required.' };

  assert.deepEqual(validateRequired(null), expected);
  assert.deepEqual(validateRequired(undefined), expected);
  assert.deepEqual(validateRequired(''), expected);
  assert.deepEqual(validateRequired('   '), expected);
});

test('validateRequired accepts any other value, including 0 and false', () => {
  assert.deepEqual(validateRequired('Moeez'), VALID);
  assert.deepEqual(validateRequired(0), VALID);
  assert.deepEqual(validateRequired(false), VALID);
});

test('validateEmail accepts well-formed addresses and skips empty values', () => {
  assert.deepEqual(validateEmail('user@example.com'), VALID);
  assert.deepEqual(validateEmail(''), VALID);
  assert.deepEqual(validateEmail(null), VALID);
});

test('validateEmail rejects malformed addresses', () => {
  const expected = { valid: false, message: 'Invalid email format.' };

  assert.deepEqual(validateEmail('abc.com'), expected);
  assert.deepEqual(validateEmail('user@domain'), expected);
  assert.deepEqual(validateEmail('user name@example.com'), expected);
});

test('validatePassword requires a minimum length of 8 by default', () => {
  assert.deepEqual(validatePassword('12345678'), VALID);
  assert.deepEqual(validatePassword(''), VALID);
  assert.deepEqual(validatePassword('1234567'), {
    valid: false,
    message: 'Password must be at least 8 characters long.'
  });
});

test('validatePassword accepts a custom minimum length', () => {
  assert.deepEqual(validatePassword('1234', 4), VALID);
  assert.deepEqual(validatePassword('12345678', 12), {
    valid: false,
    message: 'Password must be at least 12 characters long.'
  });
});

test('validateNumber accepts non-negative numbers and skips empty values', () => {
  assert.deepEqual(validateNumber(42), VALID);
  assert.deepEqual(validateNumber('3.14'), VALID);
  assert.deepEqual(validateNumber(0), VALID);
  assert.deepEqual(validateNumber(''), VALID);
  assert.deepEqual(validateNumber(null), VALID);
});

test('validateNumber rejects values that are not finite numbers', () => {
  const expected = { valid: false, message: 'Must be a valid number.' };

  assert.deepEqual(validateNumber('abc'), expected);
  assert.deepEqual(validateNumber(Infinity), expected);
});

test('validateNumber rejects negative numbers', () => {
  assert.deepEqual(validateNumber(-1), { valid: false, message: 'Must be a non-negative number.' });
});

test('validateField passes when every rule passes', () => {
  assert.deepEqual(validateField('user@example.com', [validateRequired, validateEmail]), VALID);
  assert.deepEqual(validateField('anything', []), VALID);
});

test('validateField returns the result of the first rule that fails', () => {
  assert.deepEqual(validateField('', [validateRequired, validateEmail]), {
    valid: false,
    message: 'This field is required.'
  });
  assert.deepEqual(validateField('abc.com', [validateRequired, validateEmail]), {
    valid: false,
    message: 'Invalid email format.'
  });
});

test('validateField accepts rules with their own options', () => {
  const atLeastTwelve = (value) => validatePassword(value, 12);

  assert.equal(validateField('12345678', [atLeastTwelve]).valid, false);
});

test('validateField skips rules that are not functions', () => {
  assert.deepEqual(validateField('value', ['required', null, validateRequired]), VALID);
});

test('validateField logs an error and passes when rules is not an array', (t) => {
  const consoleError = t.mock.method(console, 'error', () => {});

  assert.deepEqual(validateField('value', 'required'), VALID);
  assert.equal(consoleError.mock.callCount(), 1);
});
