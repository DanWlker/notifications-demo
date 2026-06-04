import { createClient } from "graphql-ws";

const client = createClient({
  url: "ws://localhost:4000/graphql",
});

// query
(async () => {
  const query = client.iterate({
    query: "{ hello }",
  });

  const { value } = await query.next();
  console.log(value);
  // expect(value).toEqual({ data: { hello: "world" } });
})();

// subscription
(async () => {
  const subscription = client.iterate({
    query: "subscription { greetings }",
  });

  for await (const event of subscription) {
    console.log(event);
    // expect(event).toEqual({ greetings: "Hi" });

    // complete a running subscription by breaking the iterator loop
    // break;
  }
})();
