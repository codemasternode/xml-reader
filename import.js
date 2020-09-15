const fs = require("fs"),
  path = require("path"),
  xmlReader = require("read-xml"),
  MongoClient = require("mongodb").MongoClient,
  url = "mongodb://localhost:27017/";

MongoClient.connect(url, { useUnifiedTopology: true }, async (err, db) => {
  if (err) throw err;
  const dbo = db.db("reservations");

  const [offers, places] = await Promise.all([getOffers(), getPlaces()]);

  dbo.collection("offers").insertMany(offers, function (err, res) {
    if (err) throw err;
    console.log("Saved offers");
    dbo.collection("places").insertMany(places, function (err, res) {
      if (err) throw err;
      console.log("Saved places");
      db.close();
    });
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
      fileContent = fileContent.slice(
        fileContent.search("<offers>") + 8,
        fileContent.search("</offers>")
      );
      fileContent = fileContent.split("</offer>");
      fileContent.splice(fileContent.length - 1);
      let offersToSave = [];
      for (let i = 0; i < fileContent.length; i++) {
        let offer = fileContent[i];
        //console.log(offer);

        const idObject = getValueFromAttribute(offer, "idObject");
        offer = offer.replace("idObject", "");
        const id = getValueFromAttribute(offer, "id");
        const readyFrom = new Date(getValueFromTag(offer, "readyFrom"));
        const readyTo = new Date(getValueFromTag(offer, "readyTo"));
        const name = getValueFromTag(offer, "name");

        const reservations = offer
          .slice(
            offer.search("<reservations>") + 14,
            offer.search("</reservations>")
          )
          .split("/>");
        reservations.splice(reservations.length - 1);
        let convertedReservations = [];
        for (let k = 0; k < reservations.length; k++) {
          const from = new Date(getValueFromAttribute(reservations[k], "from"));
          const to = new Date(getValueFromAttribute(reservations[k], "to"));
          convertedReservations.push({
            from,
            to,
          });
        }
        offersToSave.push({
          id,
          name,
          idObject,
          readyFrom,
          readyTo,
          reservations: convertedReservations,
        });
      }
      resolve(offersToSave);
    });
  });
};

const getPlaces = () => {
  const placesFile = path.join(__dirname, "./places.xml");
  return new Promise((resolve, reject) => {
    xmlReader.readXML(fs.readFileSync(placesFile), function (err, data) {
      if (err) {
        console.error(err);
      }
      let fileContent = data.content;
      fileContent = fileContent.slice(
        fileContent.search("<places>") + 8,
        fileContent.search("</places>")
      );
      fileContent = fileContent.split("</place>");
      fileContent.splice(fileContent.length - 1);
      let placesToSave = [];
      for (let i = 0; i < fileContent.length; i++) {
        let place = fileContent[i];
        //console.log(offer);
        const id = getValueFromAttribute(place, "id");
        const name = place.slice(place.search(">") + 1);
        placesToSave.push({ id, name });
      }
      resolve(placesToSave);
    });
  });
};

function getValueFromAttribute(str, attr) {
  let startPositionCut = str.slice(str.search(attr) + attr.length);
  const startPosition = startPositionCut.search('"');
  startPositionCut = startPositionCut.slice(startPositionCut.search('"') + 1);
  const value = startPositionCut.slice(
    startPosition - 1,
    startPositionCut.search('"')
  );
  return value;
}

function getValueFromTag(str, tag) {
  const startValuePosition = str.search(tag) + tag.length + 1;
  const endValuePosition = str.search(`</${tag}`);
  return str.slice(startValuePosition, endValuePosition);
}
