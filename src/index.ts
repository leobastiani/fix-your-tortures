import _ from "lodash";

interface FixtureDefinition<FactoryInput, FactoryResult> {
  factory: (factoryInput: FactoryInput) => FactoryResult;
  key: string;
}

export class FixtureDictionary {
  public readonly definedFixtures = new Map<string, any>();
  public readonly fixtureKey: FixtureKey;

  constructor() {
    this.fixtureKey = new FixtureKey(this);
  }

  define<FactoryInput, FactoryResult>(
    fixtureName: string,
    {
      factory,
      key = "index",
    }: Omit<FixtureDefinition<FactoryInput, FactoryResult>, "key"> &
      Partial<Pick<FixtureDefinition<FactoryInput, FactoryResult>, "key">>
  ): void {
    this.definedFixtures.set(fixtureName, {
      factory,
      key,
    });
  }

  factory(fixtureName: string): any {
    return this.definedFixtures.get(fixtureName).factory;
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

export class FixtureKey {
  constructor(private readonly fixtureDictionary: FixtureDictionary) {}

  get(fixtureName: string, options: any = {}): { key: string; value: any } {
    const fixtureDefinition =
      this.fixtureDictionary.definedFixtures.get(fixtureName);
    let { key } = fixtureDefinition;
    let value = _.get(options, key);
    if (value === undefined) {
      key = "index";
      value = options.index;
    }
    return { key, value };
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
    const { value: keyValue } = this.fixtureDictionary.fixtureKey.get(
      fixtureName,
      options
    );
    const cached = this.fixtureCache.map(fixtureName).get(keyValue);
    if (!_.isNil(cached)) {
      return cached;
    }
    this.globalFixtureIndexCounter.mutateOptions(fixtureName, options);
    const factory = this.fixtureDictionary.factory(fixtureName);
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
