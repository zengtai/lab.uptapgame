"use strict";

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    console.log("start");

    const axios = require("axios");
    // Parses the JSON returned by a network request
    const parseJSON = (res) => (res.json ? res.json() : res);
    // Checks if a network request came back fine, and throws an error if not
    const checkStatus = (res) => {
      if (res.status >= 200 && res.status < 300) {
        return res;
      }
      return parseJSON(res).then((res) => {
        throw res;
      });
    };
    const fetcher = async (url) => {
      try {
        const data = await axios.get(url).then(checkStatus).then(parseJSON);
        //console.log(data);
        return data;
      } catch (e) {
        return null;
      }
    };

    let games = await fetcher(
      "https://uptapapi.uptap.com/h5Game/?type=GameList&platform=uptap&token=dXB0YXBnYW1l572R56uZ55So"
    );
    games = games.data.gamelist;
    games.map(
      (game) =>
        (game["title"] = game.name
          .replace(/([a-zA-Z])([0-9])/g, "$1 $2")
          .replace(/([A-Z])/g, " $1")
          .trim()
          .replace(/3 D/g, " 3D")
          .replace(/\s+/g, " "))
    );
    games.map(
      (game) => (game["slug"] = game.title.replace(/ /g, "-").toLowerCase())
    );
    games.map(
      (game) =>
        (game["category"] = game.category
          .trim()
          .toLowerCase()
          .replace(/^\S/, (s) => s.toUpperCase()))
    );
    games.map(
      (game) =>
        (game["category"] =
          game["category"] == "Puzzles" ? "Puzzle" : game["category"])
    );
    games.map((game) => (game["time"] = new Date(game.time).toISOString()));
    games.map(
      (game) =>
        (game["url"] =
          `https://cdn.uptapgame.com/newgames/minigame.html?platform=uptap&appid=` +
          game.name)
    );

    games.map(async (game) => {
      const entry = await strapi.db.query("api::game.game").findOne({
        where: { appid: game.name },
      });
      console.log(entry);
      const categoryEntry = await strapi.db
        .query("api::category.category")
        .findOne({
          where: {
            name: game.category,
          },
        });
      console.log(categoryEntry);
      // console.log(categoryEntry.id);

      if (categoryEntry == null) {
        await strapi.db.query("api::category.category").create({
          data: {
            name: game.category,
            slug: game.category.toLowerCase(),
            publishedAt: new Date(),
          },
        });
      } else {
        await strapi.db.query("api::category.category").update({
          where: {
            slug: game.category.toLowerCase(),
          },
          data: {
            name: game.category,
            slug: game.category.trim().toLowerCase(),
            publishedAt: new Date(),
          },
        });
      }
      if (entry == null) {
        await strapi.db.query("api::game.game").create({
          data: {
            appid: game.name,
            title: game.title,
            slug: game.slug,
            description: game.description,
            icon_url: game.icon,
            game_url: game.url,
            creation_date: new Date(game.time).toISOString(),
            publishedAt: new Date(),
            category: [categoryEntry.id],
          },
        });
      } else {
        await strapi.db.query("api::game.game").update({
          where: { appid: game.name },
          data: {
            appid: game.name,
            title: game.title,
            slug: game.slug,
            description: game.description,
            icon_url: game.icon,
            game_url: game.url,
            creation_date: new Date(game.time).toISOString(),
            publishedAt: new Date(),
            // status: "published",
            category: [categoryEntry.id],
          },
        });
      }
    });
  },
};
