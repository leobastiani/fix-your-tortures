import _ from "lodash";

interface FixtureDefinition<FactoryInput, FactoryResult> {
  factory: (factoryInput: FactoryInput) => FactoryResult;
  key?: string;
}

export class FixtureDictionary {
  public definedFixtures = new Map<string, any>();

  define<FactoryInput, FactoryResult>(
    fixtureName: string,
    {
      factory,
      key = "index",
    }: FixtureDefinition<FactoryInput, FactoryResult> & { key?: string }
  ): void {
    this.definedFixtures.set(fixtureName, {
      factory,
      key,
    });
  }
}

export class FixtureCache {
  public map = _.memoize((_: string) => new Map<any, any>());
}

export class FixtureRequester {
  indexCounter = _.memoize((_: string) => ({
    index: 0,
  }));

  getNewIndex(fixtureName: string): number {
    return this.indexCounter(fixtureName).index++;
  }

  constructor(
    private readonly fixtureDictionary: FixtureDictionary,
    private readonly fixtureCache: FixtureCache
  ) {}

  with(fixtureName: string, options: any = {}): any {
    Object.assign(options, { index: this.getNewIndex(fixtureName) });
    const fixtureDefinition =
      this.fixtureDictionary.definedFixtures.get(fixtureName);
    const { factory } = fixtureDefinition;
    let { key } = fixtureDefinition;
    let keyValue = _.get(options, key);
    if (keyValue === undefined) {
      key = "index";
      keyValue = options.index;
    }
    const cached = this.fixtureCache.map(fixtureName).get(keyValue);
    if (!_.isNil(cached)) {
      return cached;
    }
    const ret = factory({
      ...options,
      fixtures: new FixtureRequester(this.fixtureDictionary, this.fixtureCache),
    });
    this.fixtureCache.map(fixtureName).set(keyValue, ret);
    return ret;
  }
}

export class FixtureGetter {
  constructor(
    private readonly fixtureDictionary: FixtureDictionary,
    private readonly fixtureCache: FixtureCache
  ) {}

  get = _.memoize((fixtureName: string) => {
    const values: any = Array.from(this.fixtureCache.map(fixtureName).values());
    const key = this.fixtureDictionary.definedFixtures.get(fixtureName).key;
    if (key !== "index") {
      for (const value of values) {
        const keyValue = _.get(value, key);
        values[keyValue] = value;
      }
    }
    return values;
  });
}

export function inc(fn: (i: number) => string): () => string {
  let i = 0;
  return (): string => {
    return fn(i++);
  };
}
