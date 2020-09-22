const fs = require("fs"),
  path = require("path"),
  xmlReader = require("read-xml"),
  MongoClient = require("mongodb").MongoClient,
  url = "mongodb://localhost:27017/";

MongoClient.connect(url, { useUnifiedTopology: true }, async (err, db) => {
  if (err) throw err;
  const dbo = db.db("reservations");

  const offers = await getOffers();
  dbo.collection("offers").insertMany(offers, function (err, res) {
    if (err) throw err;
  });
});

const getOffers = () => {
  const offersFile = path.join(__dirname, "./offers.xml");
  return new Promise((resolve, reject) => {
    xmlReader.readXML(fs.readFileSync(offersFile), function (err, data) {
      if (err) {
        console.error(err);
      }
      let fileContent = data.content;
      fileContent = fileContent.replace(/(\r\n|\n|\r)/gm, "");
      const offersToSave = [];
      const offers = fileContent.match(/<offer[^>]*>(.+?)<\/offer>/g);
      for (let i = 0; i < offers.length - 1; i++) {
        const name = offers[i]
          .match(/<name>(.*?)<\/name>/g)[0]
          .replace(/<\/?name>/g, "");
        const readyFrom = new Date(
          offers[i]
            .match(/<readyFrom>(.*?)<\/readyFrom>/g)[0]
            .replace(/<\/?readyFrom>/g, "")
        );
        const readyTo = new Date(
          offers[i]
            .match(/<readyTo>(.*?)<\/readyTo>/g)[0]
            .replace(/<\/?readyTo>/g, "")
        );
        var regex = new RegExp(
          "[\\s\\r\\t\\n]*([a-z0-9\\-_]+)[\\s\\r\\t\\n]*=[\\s\\r\\t\\n]*(['\"])((?:\\\\\\2|(?!\\2).)*)\\2",
          "ig"
        );
        var attributes = {};
        while ((match = regex.exec(offers[i]))) {
          attributes[match[1]] = match[3];
        }
        const idObject = attributes.idObject;
        const id = attributes.id;
        const reservations = offers[i].match(
          /<reservation[^>]>(.*?)<\/reservation>/g
        );
        const reservationsS = [];
        let attribs = {};
        while ((match = regex.exec(offers[i]))) {
          if (match[1] !== "id" && match[1] !== "idObject") {
            if (Object.keys(attribs).length === 2) {
              reservationsS.push({ ...attribs });
              attribs = {};
            } else {
              attribs[match[1]] = new Date(match[3]);
            }
          }
        }
        offersToSave.push({
          id,
          idObject,
          name,
          readyFrom,
          readyTo,
          reservations: reservationsS,
        });
      }
      resolve(offersToSave);
    });
  });
};
