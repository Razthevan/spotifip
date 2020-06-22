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

  async getSongMetadata(title) {
    try {
      const metaData = await this.get("/search", {
        q: title,
        type: "track",
      });
      return title;
    } catch (error) {
      if (error.extensions.code === UNAUTHENTICATED_ERROR) {
        return null;
      }
      return error;
    }
  }
}

module.exports = SpotifySearchAPI;
