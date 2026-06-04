import { GraphQLObjectType, GraphQLSchema, GraphQLString } from "graphql";

/**
 * Construct a GraphQL schema and define the necessary resolvers.
 *
 * type Query {
 *   hello: String
 * }
 * type Subscription {
 *   greetings: String
 * }
 */
const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: "Query",
    fields: {
      hello: {
        type: GraphQLString,
        resolve: () => "world",
      },
    },
  }),
  subscription: new GraphQLObjectType({
    name: "Subscription",
    fields: {
      greetings: {
        type: GraphQLString,
        subscribe: async function* () {
          for (const hi of ["Hi", "Bonjour", "Hola", "Ciao", "Zdravo"]) {
            yield { greetings: hi };
            await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second
          }
        },
      },
    },
  }),
});

import { useServer } from "graphql-ws/use/ws";
import { WebSocketServer } from "ws"; // yarn add ws

const server = new WebSocketServer({
  port: 4000,
  path: "/graphql",
});

useServer({ schema }, server);

console.log("Listening to port 4000");
