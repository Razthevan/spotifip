if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const { RESTDataSource } = require("apollo-datasource-rest");
const queryString = require("query-string");

const API_BASE_URL = "https://www.googleapis.com/youtube/v3";

class YouTubeSearchApi extends RESTDataSource {
  constructor() {
    super();

    this.baseURL = API_BASE_URL;
  }

  async getYouTubeId(title, mainArtists) {
    try {
      const queryParams = {
        q: `track:${title} ${
          mainArtists.length ? `artist:${mainArtists[0]}` : ""
        }`,
        type: "video",
        key: process.env.YOUTUBE_API_KEY,
        part: "snippet",
        videoEmbeddable: true,
      };

      const encodedQueryParams = queryString.stringify(queryParams, {
        sort: false,
        strict: true,
      });

      const result = await this.get("/search", encodedQueryParams);
      const { items } = result;

      if (!items.length) {
        return null;
      }
      return items[0].id.videoId;
    } catch (error) {
      return null;
    }
  }
}

module.exports = YouTubeSearchApi;
