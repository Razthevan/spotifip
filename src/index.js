const { ApolloServer } = require("apollo-server");
const { ApolloGateway, RemoteGraphQLDataSource } = require("@apollo/gateway");
const cookie = require("cookie");

const port = 4000;
const SPOTIFY_ACCESS_TOKEN = "spotify_access_token";

class DataSourceWithHeadersHandling extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }) {
    if (context.headers && context.headers[SPOTIFY_ACCESS_TOKEN]) {
      request.http.headers.set(
        SPOTIFY_ACCESS_TOKEN,
        context.headers[SPOTIFY_ACCESS_TOKEN]
      );
    }
  }
  didReceiveResponse({ response, _, context }) {
    const spotify_access_token = response.http.headers.get(
      SPOTIFY_ACCESS_TOKEN
    );

    if (spotify_access_token) {
      context.spotify_access_token = spotify_access_token;
    }
    return response;
  }
}

const gateway = new ApolloGateway({
  serviceList: [
    { name: "spotify", url: "http://localhost:4001" },
    { name: "fip", url: "http://localhost:4002" },
  ],
  buildService({ name, url }) {
    return new DataSourceWithHeadersHandling({ name, url });
  },
});

const server = new ApolloServer({
  gateway,
  subscriptions: false,
  context: ({ req }) => {
    const { headers } = req;

    let spotify_access_token = null;
    return { headers, spotify_access_token };
  },
  plugins: [
    {
      requestDidStart() {
        return {
          willSendResponse({ context, response }) {
            if (context[SPOTIFY_ACCESS_TOKEN]) {
              const spotifyCookie = cookie.serialize(
                SPOTIFY_ACCESS_TOKEN,
                context[SPOTIFY_ACCESS_TOKEN],
                {}
              );

              response.http.headers.set("Set-Cookie", spotifyCookie, {
                maxAge: 3600,
              });

              response.http.headers.set(
                SPOTIFY_ACCESS_TOKEN,
                context.spotify_access_token
              );
            }
          },
        };
      },
    },
  ],
  cors: {
    credentials: true,

    origin:
      process.env.NODE_ENV === "production"
        ? "https://razthevan.now.sh/"
        : "http://localhost:3000",
  },
});

server.listen({ port: process.env.PORT || 4000 || port }).then(({ url }) => {});
