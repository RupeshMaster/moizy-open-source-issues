const test = require('node:test');
const assert = require('node:assert/strict');

const fetchData = require('../utils/apiService');

// Replaces fetch so the tests never touch the network.
const mockFetch = (t, implementation) => t.mock.method(global, 'fetch', implementation);
const silenceConsoleError = (t) => t.mock.method(console, 'error', () => {});

test('fetchData returns the parsed JSON body of a successful response', async (t) => {
  const fetchMock = mockFetch(t, async () => ({
    ok: true,
    status: 200,
    json: async () => ({ id: 1, name: 'Moeez' })
  }));

  assert.deepEqual(await fetchData('https://api.example.com/users/1'), { id: 1, name: 'Moeez' });
  assert.deepEqual(fetchMock.mock.calls[0].arguments, ['https://api.example.com/users/1']);
});

test('fetchData reports a server error for a response that is not ok', async (t) => {
  const consoleError = silenceConsoleError(t);
  mockFetch(t, async () => ({ ok: false, status: 500, statusText: 'Internal Server Error' }));

  assert.equal(await fetchData('https://api.example.com/users/1'), undefined);
  assert.deepEqual(consoleError.mock.calls[0].arguments, ['[ServerError - 500]: Internal Server Error']);
});

test('fetchData reports a network error when the request fails', async (t) => {
  const consoleError = silenceConsoleError(t);
  mockFetch(t, async () => {
    throw new TypeError('fetch failed');
  });

  assert.equal(await fetchData('https://api.example.com/users/1'), undefined);
  assert.deepEqual(consoleError.mock.calls[0].arguments, ['[NetworkError]: fetch failed']);
});

test('fetchData reports an unknown error when the body is not valid JSON', async (t) => {
  const consoleError = silenceConsoleError(t);
  mockFetch(t, async () => ({
    ok: true,
    status: 200,
    json: async () => {
      throw new SyntaxError('Unexpected token < in JSON');
    }
  }));

  assert.equal(await fetchData('https://api.example.com/users/1'), undefined);
  assert.deepEqual(consoleError.mock.calls[0].arguments, ['[UnknownError]: Unexpected token < in JSON']);
});
