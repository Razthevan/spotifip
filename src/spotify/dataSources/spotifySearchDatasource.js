const { RESTDataSource } = require("apollo-datasource-rest");

const API_BASE_URL = "https://api.spotify.com/v1";

const UNAUTHENTICATED_ERROR = "UNAUTHENTICATED";

class SpotifySearchAPI extends RESTDataSource {
  constructor() {
    super();

    this.baseURL = API_BASE_URL;
  }

  async willSendRequest(request) {
    const {
      spotify_access_token,
      dataSources: { spotifyAuthenticationAPI },
    } = this.context;

    if (!spotify_access_token) {
      const new_spotify_access_token = await spotifyAuthenticationAPI.getAuthenticationToken();
      request.headers.set(
        "Authorization",
        `Bearer ${new_spotify_access_token}`
      );
    }
    if (spotify_access_token) {
      request.headers.set("Authorization", `Bearer ${spotify_access_token}`);
    }
  }

  async getSongMetadata(title, albumTitle, mainArtists) {
    try {
      const result = await this.get("/search", {
        q: title,
        type: "track",
        limit: 3,
        include_external: true,
      });
      const {
        tracks: { items, total },
      } = result;

      if (!total) {
        return null;
      }
      const trackInfo = items[0];
      const { album, artists, external_urls, name } = trackInfo;
      const albumInfo = {
        albumName: album.name,
        albumImages: album.images,
        albumReleaseDate: album.release_date,
        albumLink: album.external_urls.spotify,
      };
      const artistsInfo = artists.map((artist) => {
        return {
          name: artist.name,
        };
      });
      const spotifyUrl = external_urls.spotify;
      const metadata = { albumInfo, artistsInfo, spotifyUrl, name };
      console.log("metadata: ", metadata);
      return metadata;
    } catch (error) {
      if (error.extensions && error.extensions.code === UNAUTHENTICATED_ERROR) {
        return null;
      }
      return null;
    }
  }
}

module.exports = SpotifySearchAPI;
