const { RESTDataSource } = require("apollo-datasource-rest");

const LOGIN_BASE_URL = "https://accounts.spotify.com";

class SpotifyAuthenticationAPI extends RESTDataSource {
  constructor() {
    super();
    this.baseURL = LOGIN_BASE_URL;
  }

  willSendRequest(request) {
    request.headers.set(
      "Authorization",
      `Basic  ${Buffer.from(
        process.env.CLIENT_ID + ":" + process.env.CLIENT_SECRET
      ).toString("base64")}`
    );
    request.headers.set("Content-Type", "application/x-www-form-urlencoded");
  }

  async getAuthenticationToken() {
    const body = "grant_type=client_credentials";
    const response = await this.post("/api/token", body);
    this.context.new_spotify_access_token = response.access_token;
    return response.access_token;
  }
}

module.exports = SpotifyAuthenticationAPI;
