var fs = require("fs"),
  path = require("path"),
  xmlReader = require("read-xml");

var FILE = path.join(__dirname, "./offers.xml");

function getValueFromAttribute(str, attr) {
  let startPositionCut = str.slice(str.search(attr) + attr.length);
  const startPosition = startPositionCut.search('"');
  startPositionCut = startPositionCut.slice(startPositionCut.search('"') + 1);
  const value = startPositionCut.slice(
    startPosition,
    startPositionCut.search('"')
  );
  return value;
}

function getValueFromTag(str, tag) {
  const startValuePosition = str.search(tag) + tag.length + 1;
  const endValuePosition = str.search(`</${tag}`);
  return str.slice(startValuePosition, endValuePosition);
}

xmlReader.readXML(fs.readFileSync(FILE), function (err, data) {
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
  for (let i = 0; i < fileContent.length; i++) {
    let offer = fileContent[i];
    //console.log(offer);

    const idObject = getValueFromAttribute(offer, "idObject");
    offer = offer.replace("idObject", "");
    const id = getValueFromAttribute(offer, "id");
    const readyFrom = getValueFromTag(offer, "readyFrom");
    const readyTo = getValueFromTag(offer, "readyTo");

    const reservations = offer
      .slice(
        offer.search("<reservations>") + 14,
        offer.search("</reservations>")
      )
      .split("/>");
    reservations.splice(reservations.length - 1);

    console.log(reservations);
  }
});
