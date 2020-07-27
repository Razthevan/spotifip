const { ApolloServer, gql } = require("apollo-server");
const { buildFederatedSchema } = require("@apollo/federation");

const SpotifySearchAPI = require("./spotify/dataSources/spotifySearchDatasource");
const SpotifyAuthenticationAPI = require("./spotify/dataSources/spotifyAuthenticationDatasource");

const YouTubeSearchApi = require("./spotify/dataSources/youtubeSearchDataSource");

const port = 4001;
const SPOTIFY_ACCESS_TOKEN = "spotify_access_token";

const typeDefs = gql`
  extend type Track @key(fields: "title") {
    title: String! @external
    albumTitle: String @external
    mainArtists: [String] @external
    metadata: Metadata @requires(fields: "title albumTitle mainArtists")
  }
  type Metadata {
    name: String!
    spotifyUrl: String!
    artistsInfo: [ArtistInfo]
    albumInfo: AlbumInfo
    youTubeId: String
  }
  type ArtistInfo {
    name: String
  }
  type AlbumInfo {
    albumName: String
    albumReleaseDate: String
    albumImages: [AlbumImage]
    albumLink: String
  }
  type AlbumImage {
    url: String
    width: String
    height: String
  }
`;

const resolvers = {
  Track: {
    metadata: async (track, _, { dataSources: { spotifySearchAPI } }) => {
      const { title, albumTitle, mainArtists } = track;
      return spotifySearchAPI.getSongMetadata(title, albumTitle, mainArtists);
    },
  },
};

const server = new ApolloServer({
  schema: buildFederatedSchema([
    {
      typeDefs,
      resolvers,
    },
  ]),
  dataSources: () => {
    return {
      spotifySearchAPI: new SpotifySearchAPI(),
      spotifyAuthenticationAPI: new SpotifyAuthenticationAPI(),
      youTubeSearchAPI: new YouTubeSearchApi(),
    };
  },
  context: ({ req }) => {
    const spotify_access_token = req.headers[SPOTIFY_ACCESS_TOKEN]
      ? req.headers[SPOTIFY_ACCESS_TOKEN]
      : null;
    let new_spotify_access_token = undefined;
    return { spotify_access_token, new_spotify_access_token };
  },
  plugins: [
    {
      requestDidStart() {
        return {
          willSendResponse({ context, response }) {
            if (context.new_spotify_access_token) {
              response.http.headers.set(
                SPOTIFY_ACCESS_TOKEN,
                context.new_spotify_access_token
              );
            }
          },
        };
      },
    },
  ],
});

server.listen({ port }).then(({ url }) => {
  console.log(`Spotify service ready at ${url}`);
});
