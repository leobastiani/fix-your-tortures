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

export class FixtureData {
  constructor(public readonly name: string, public readonly data: any) {}
}

export class FixtureGraphRequester {
  toBuild = [] as FixtureData[];

  with(fixtureName: string, data: any): void {
    this.toBuild.push(new FixtureData(fixtureName, data));
  }
}

export class FixtureIndexCounter {
  indexCounter = _.memoize((_fixtureName: string) => ({
    index: 0,
  }));

  getNewIndex(fixtureName: string): number {
    return this.indexCounter(fixtureName).index++;
  }

  mutateOptions<T>(fixtureName: string, options: T): void {
    _.defaults(options, { index: this.getNewIndex(fixtureName) });
  }
}

export class FixtureRequester {
  constructor(
    private readonly fixtureDictionary: FixtureDictionary,
    private readonly localFixtureIndexCounter: FixtureIndexCounter,
    private readonly globalFixtureIndexCounter: FixtureIndexCounter,
    private readonly fixtureCache: FixtureCache,
    private readonly fixtureGraphRequester: FixtureGraphRequester
  ) {}

  private addFixture(fixtureName: string, options: any = {}): any {
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
    this.globalFixtureIndexCounter.mutateOptions(fixtureName, options);
    const ret = factory({
      ...options,
      fixtures: new FixtureRequester(
        this.fixtureDictionary,
        new FixtureIndexCounter(),
        this.globalFixtureIndexCounter,
        this.fixtureCache,
        this.fixtureGraphRequester
      ),
    });
    this.fixtureGraphRequester.with(fixtureName, ret);
    this.fixtureCache.map(fixtureName).set(keyValue, ret);
    return ret;
  }

  with(fixtureName: string, options: any = {}): any {
    this.localFixtureIndexCounter.mutateOptions(fixtureName, options);
    return this.addFixture(fixtureName, options);
  }

  create(fixtureName: string, options: any = {}): any {
    this.globalFixtureIndexCounter.mutateOptions(fixtureName, options);
    return this.addFixture(fixtureName, options);
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
