if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const fetch = require("node-fetch");
const { print } = require("graphql");
const { ApolloServer } = require("apollo-server");
const { introspectSchema } = require("graphql-tools");
const { wrapSchema } = require("@graphql-tools/wrap");
const { transformSchemaFederation } = require("graphql-transform-federation");

const port = 4002;
const URI = `https://openapi.radiofrance.fr/v1/graphql`;

const executor = ({ document, variables }) => {
  const query = print(document);
  const fetchResult = fetch(URI, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-token": process.env.NEXT_PUBLIC_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  }).then((response) => response.json());
  return fetchResult;
};

const startServer = async (port) => {
  const fipRemoteSchema = await introspectSchema(executor);
  const fipSchema = wrapSchema({
    schema: fipRemoteSchema,
    executor,
  });
  const federationSchema = transformSchemaFederation(fipSchema, {
    Track: {
      keyFields: ["title"],
    },
  });
  const server = new ApolloServer({
    schema: federationSchema,
  });
  return await server.listen({ port });
};
startServer(port).then(({ url }) => console.log(`Fip service ready at ${url}`));
