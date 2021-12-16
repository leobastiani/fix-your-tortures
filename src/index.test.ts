import { FixtureCache, FixtureDictionary, FixtureRequester, inc } from "./";
import { FixtureGetter } from "./index";

describe("chat with two messages and two users", () => {
  function setup(): {
    fixtureRequester: FixtureRequester;
    fixtureDictionary: FixtureDictionary;
    fixtureCache: FixtureCache;
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

    const defaultUsername = inc((i) => `username${i}`);

    const userFactory = ({
      username = defaultUsername(),
      password = "123456",
    }: Partial<User> = {}): User => ({
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

    const fixtureRequester = new FixtureRequester(
      fixtureDictionary,
      fixtureCache
    );
    return { fixtureRequester, fixtureDictionary, fixtureCache };
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
    const { fixtureRequester, fixtureCache, fixtureDictionary } = setup();

    fixtureRequester.with("message", { content: "Hi" });
    const fixtureGetter = new FixtureGetter(fixtureDictionary, fixtureCache);
    const [userFrom, userTo] = fixtureGetter.get("user");
    const { username0, username1 } = fixtureGetter.get("user");
    const [message] = fixtureGetter.get("message");
    expect(userFrom).toBe(username0);
    expect(userTo).toBe(username1);
    expect(message.from).toBe(userFrom);
    expect(message.to).toBe(userTo);
    expect(message.content).toBe("Hi");
  });
});
