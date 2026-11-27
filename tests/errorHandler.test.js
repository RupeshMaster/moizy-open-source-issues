const test = require('node:test');
const assert = require('node:assert/strict');

const {
  NetworkError,
  ServerError,
  ValidationError,
  handleError
} = require('../utils/errorHandler');

const silenceConsoleError = (t) => t.mock.method(console, 'error', () => {});

test('NetworkError has a name and a default message', () => {
  const error = new NetworkError();

  assert.ok(error instanceof Error);
  assert.equal(error.name, 'NetworkError');
  assert.equal(error.message, 'Network error occurred');
  assert.equal(new NetworkError('offline').message, 'offline');
});

test('ServerError keeps the HTTP status', () => {
  const error = new ServerError(503, 'Service Unavailable');

  assert.ok(error instanceof Error);
  assert.equal(error.name, 'ServerError');
  assert.equal(error.status, 503);
  assert.equal(error.message, 'Service Unavailable');
  assert.equal(new ServerError(500).message, 'Server error occurred');
});

test('ValidationError keeps the list of errors', () => {
  const error = new ValidationError(['email is required']);

  assert.ok(error instanceof Error);
  assert.equal(error.name, 'ValidationError');
  assert.deepEqual(error.errors, ['email is required']);
  assert.deepEqual(new ValidationError().errors, []);
});

test('handleError returns a connection message for a NetworkError', (t) => {
  const consoleError = silenceConsoleError(t);

  assert.equal(
    handleError(new NetworkError('offline')),
    'Unable to connect. Please check your internet connection.'
  );
  assert.deepEqual(consoleError.mock.calls[0].arguments, ['[NetworkError]: offline']);
});

test('handleError returns a server message for a ServerError', (t) => {
  const consoleError = silenceConsoleError(t);

  assert.equal(
    handleError(new ServerError(500, 'Internal Server Error')),
    'Server is not responding. Please try again later.'
  );
  assert.deepEqual(consoleError.mock.calls[0].arguments, ['[ServerError - 500]: Internal Server Error']);
});

test('handleError returns a validation message for a ValidationError', (t) => {
  const consoleError = silenceConsoleError(t);

  assert.equal(
    handleError(new ValidationError(['email is required', 'name is too short'])),
    'There are validation errors. Please check your input.'
  );
  assert.deepEqual(consoleError.mock.calls[0].arguments, [
    '[ValidationError]: email is required, name is too short'
  ]);
});

test('handleError returns a generic message for any other error', (t) => {
  const consoleError = silenceConsoleError(t);
  const expected = 'An unexpected error occurred. Please try again.';

  assert.equal(handleError(new Error('boom')), expected);
  assert.equal(handleError('plain string'), expected);
  assert.deepEqual(consoleError.mock.calls[0].arguments, ['[UnknownError]: boom']);
  assert.deepEqual(consoleError.mock.calls[1].arguments, ['[UnknownError]: plain string']);
});

test('handleError passes the message to showUserNotification when it exists', (t) => {
  silenceConsoleError(t);
  const notify = t.mock.fn();
  globalThis.showUserNotification = notify;
  t.after(() => {
    delete globalThis.showUserNotification;
  });

  const message = handleError(new NetworkError());

  assert.equal(notify.mock.callCount(), 1);
  assert.deepEqual(notify.mock.calls[0].arguments, [message]);
});
