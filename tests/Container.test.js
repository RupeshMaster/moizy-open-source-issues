const test = require('node:test');
const assert = require('node:assert/strict');

const Container = require('../utils/Container');

class Logger {}

class UserService {
  static dependencies = ['logger'];

  constructor(logger) {
    this.logger = logger;
  }
}

test('Container creates a new instance on every resolve by default', () => {
  const container = new Container();
  container.register('logger', Logger);

  const first = container.resolve('logger');
  const second = container.resolve('logger');

  assert.ok(first instanceof Logger);
  assert.notEqual(first, second);
});

test('Container returns the same instance for a singleton', () => {
  const container = new Container();
  container.register('logger', Logger, { singleton: true });

  assert.equal(container.resolve('logger'), container.resolve('logger'));
});

test('Container injects the services listed in static dependencies', () => {
  const container = new Container();
  container.register('logger', Logger);
  container.register('userService', UserService);

  const service = container.resolve('userService');

  assert.ok(service instanceof UserService);
  assert.ok(service.logger instanceof Logger);
});

test('Container resolves dependencies of dependencies', () => {
  class Controller {
    static dependencies = ['userService'];

    constructor(userService) {
      this.userService = userService;
    }
  }

  const container = new Container();
  container.register('logger', Logger);
  container.register('userService', UserService);
  container.register('controller', Controller);

  assert.ok(container.resolve('controller').userService.logger instanceof Logger);
});

test('Container shares a singleton dependency between the services that use it', () => {
  class OrderService {
    static dependencies = ['logger'];

    constructor(logger) {
      this.logger = logger;
    }
  }

  const container = new Container();
  container.register('logger', Logger, { singleton: true });
  container.register('userService', UserService);
  container.register('orderService', OrderService);

  assert.equal(container.resolve('userService').logger, container.resolve('orderService').logger);
});

test('Container keeps registrations separate between containers', () => {
  const first = new Container();
  const second = new Container();
  first.register('logger', Logger, { singleton: true });
  second.register('logger', Logger, { singleton: true });

  assert.notEqual(first.resolve('logger'), second.resolve('logger'));
});

test('Container.register rejects an invalid name or implementation', () => {
  const container = new Container();

  assert.throws(() => container.register('', Logger), TypeError);
  assert.throws(() => container.register(42, Logger), TypeError);
  assert.throws(() => container.register('logger', {}), TypeError);
});

test('Container.register rejects a name that is already registered', () => {
  const container = new Container();
  container.register('logger', Logger);

  assert.throws(() => container.register('logger', Logger), /already registered/);
});

test('Container.resolve throws for a service that is not registered', () => {
  const container = new Container();

  assert.throws(() => container.resolve('missing'), /"missing" is not registered/);
});

test('Container.resolve throws when a dependency is not registered', () => {
  const container = new Container();
  container.register('userService', UserService);

  assert.throws(() => container.resolve('userService'), /"logger" is not registered/);
});

test('Container.resolve detects circular dependencies', () => {
  class First {
    static dependencies = ['second'];
  }

  class Second {
    static dependencies = ['first'];
  }

  const container = new Container();
  container.register('first', First);
  container.register('second', Second);

  assert.throws(() => container.resolve('first'), /circular dependency detected: first → second → first/);
});
