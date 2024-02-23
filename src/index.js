if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const cookie = require("cookie");
const { ApolloServer } = require("apollo-server");
const { ApolloGateway, RemoteGraphQLDataSource } = require("@apollo/gateway");

const port = 4000;
const SPOTIFY_ACCESS_TOKEN = "spotify_access_token";
const whitelist = [
  "http://localhost:3000",
  "http://localhost:4000",
  "https://eclectic.now.sh",
  "https://eclectic.vercel.app",
];

class DataSourceWithHeadersHandling extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }) {
    if (context.headers) {
      const parsedSpotifyCookie = context.headers.cookie
        ? cookie.parse(context.headers.cookie)
        : null;
      if (parsedSpotifyCookie) {
        request.http.headers.set(
          SPOTIFY_ACCESS_TOKEN,
          parsedSpotifyCookie[SPOTIFY_ACCESS_TOKEN],
        );
      }
    }
  }
  didReceiveResponse({ response, _, context }) {
    const spotify_access_token =
      response.http.headers.get(SPOTIFY_ACCESS_TOKEN);

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
                { maxAge: 3600 },
              );

              response.http.headers.set("Set-Cookie", spotifyCookie);
            }
          },
        };
      },
    },
  ],
  cors: {
    credentials: true,
    origin: (origin, callback) => {
      if (whitelist.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: "GET,POST,OPTIONS",
  },
});

server.listen({ port: process.env.PORT || port }).then(({ url }) => {
  console.log(`SpotiFip service ready at ${url}`);
});
