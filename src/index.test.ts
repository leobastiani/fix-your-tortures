import {
  FixtureCache,
  FixtureDictionary,
  FixtureGetter,
  FixtureGraphRequester,
  FixtureIndexCounter,
  FixtureRequester,
} from "./index";

describe("chat with two messages and two users", () => {
  function setup(): {
    fixtureRequester: FixtureRequester;
    fixtureDictionary: FixtureDictionary;
    fixtureCache: FixtureCache;
    fixtureGetter: FixtureGetter;
    fixtureGraphRequester: FixtureGraphRequester;
  } {
    const fixtureDictionary = new FixtureDictionary();
    interface User {
      username: string;
      password: string;
    }
    interface Message {
      from: User;
      to: User;
      content: string;
    }
    const userFactory = ({
      index = 0,
      username = `username${index}`,
      password = "123456",
    }: Partial<User> & { index?: number } = {}): User => ({
      username,
      password,
    });
    const messageFactory = ({
      fixtures,
      from = fixtures.with("user"),
      to = fixtures.with("user"),
      content,
    }: {
      fixtures?: any;
      from?: User;
      to?: User;
      content: string;
    }): Message => ({
      from,
      to,
      content,
    });
    fixtureDictionary.define("user", {
      factory: userFactory,
      key: "username",
    });
    fixtureDictionary.define("message", {
      factory: messageFactory,
    });
    const fixtureCache = new FixtureCache();
    const fixtureGraphRequester = new FixtureGraphRequester();
    const fixtureRequester = new FixtureRequester(
      fixtureDictionary,
      new FixtureIndexCounter(),
      new FixtureIndexCounter(),
      fixtureCache,
      fixtureGraphRequester
    );
    const fixtureGetter = new FixtureGetter(fixtureDictionary, fixtureCache);
    return {
      fixtureRequester,
      fixtureDictionary,
      fixtureCache,
      fixtureGetter,
      fixtureGraphRequester,
    };
  }

  it("can be declared with only two messages", () => {
    const { fixtureRequester } = setup();

    const m1 = fixtureRequester.with("message", { content: "Hi" });
    const m2 = fixtureRequester.with("message", { content: "Hello" });

    expect(m1.from.username).toBe("username0");
    expect(m1.to.username).toBe("username1");
    expect(m2.from.username).toBe("username0");
    expect(m2.to.username).toBe("username1");

    expect(m1.content).toBe("Hi");
    expect(m2.content).toBe("Hello");
  });

  it("can declare a message and then get fixtures by destruturing array", () => {
    const { fixtureRequester, fixtureGetter } = setup();

    fixtureRequester.with("message", { content: "Hi" });
    const [userFrom, userTo] = fixtureGetter.get("user");
    const { username0, username1 } = fixtureGetter.get("user");
    const [message] = fixtureGetter.get("message");
    expect(userFrom).toBe(username0);
    expect(userTo).toBe(username1);
    expect(message.from).toBe(userFrom);
    expect(message.to).toBe(userTo);
    expect(message.content).toBe("Hi");
  });

  it("has proper build order with two messages and two users", () => {
    const { fixtureRequester, fixtureGetter, fixtureGraphRequester } = setup();

    fixtureRequester.with("message", { content: "Hi" });
    fixtureRequester.with("message", { content: "Hello" });

    // these two users are going to be added before the first message
    fixtureRequester.with("user");
    fixtureRequester.with("user");

    const [userFrom, userTo] = fixtureGetter.get("user");
    const messages = fixtureGetter.get("message");
    expect(fixtureGraphRequester.toBuild.map((data) => data.name)).toEqual([
      "user",
      "user",
      "message",
      "message",
    ]);
    expect(fixtureGraphRequester.toBuild.map((data) => data.data)).toEqual([
      userFrom,
      userTo,
      ...messages,
    ]);
  });

  it("has proper build order with two messages and one user at the end", () => {
    const { fixtureRequester, fixtureGetter, fixtureGraphRequester } = setup();

    fixtureRequester.with("message", { content: "Hi" });
    fixtureRequester.with("message", { content: "Hello" });
    fixtureRequester.create("user");
    const [userFrom, userTo, userLastAdded] = fixtureGetter.get("user");
    const messages = fixtureGetter.get("message");
    expect(fixtureGraphRequester.toBuild.map((data) => data.name)).toEqual([
      "user",
      "user",
      "message",
      "message",
      "user",
    ]);
    expect(fixtureGraphRequester.toBuild.map((data) => data.data)).toEqual([
      userFrom,
      userTo,
      ...messages,
      userLastAdded,
    ]);
    expect(userLastAdded.username).toBe("username2");
  });
});
