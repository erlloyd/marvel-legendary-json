import * as cheerio from "cheerio";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import stripJsonTrailingCommas from "strip-json-trailing-commas";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const setsRawJSONDir = path.join(__dirname, "..", "downloadedSetData");

const extractJSONArray = (str) => {
  var firstOpen, firstClose, candidate;
  firstOpen = str.indexOf("[");
  firstClose = str.indexOf("]");
  // console.log("firstOpen: " + firstOpen, "firstClose: " + firstClose);
  if (firstClose === -1) {
    return null;
  }
  do {
    // console.log(`trying from ${firstOpen} to ${firstClose}`);
    candidate = str.substring(firstOpen, firstClose + 1);
    // console.log("trying a candidate");
    try {
      var res = JSON.parse(candidate);
      console.log(`... found from ${firstOpen} to ${firstClose}`);
      return res;
    } catch (e) {
      // console.log("...failed");
    }
    firstClose = str.indexOf("]", firstClose + 1);
  } while (firstClose !== -1);

  console.log("didn't find anything");
  return null;
};

const doWork = async (thing) => {
  try {
    // const browser = await puppeteer.launch();
    // const page = await browser.newPage();
    // await page.goto("https://master-strike.com/heroes?set=1");
    // await page.waitForSelector(".card-group", { timeout: 1000 });

    // const body = await page.evaluate(() => {
    //   return document.querySelector("body").innerHTML;
    // });
    // console.log(body);

    // await browser.close();

    const webSiteBase = "https://master-strike.com";

    const result = await axios.get(`${webSiteBase}/heroes?set=1`);

    //Find the app.js
    const appJsRegEx = /\/js\/app\.[^\s]*\.js/;
    const appJs = result.data.match(appJsRegEx);

    //Get the app.js
    const js = await axios.get(`${webSiteBase}${appJs[0]}`);

    const searchStr = `${thing}:\\[{`;
    const heroIndices = [...js.data.matchAll(new RegExp(searchStr, "gi"))].map(
      (a) => a.index
    );

    // const ca = js.data.indexOf("a.CaptainAmerica=");
    // console.log(ca);

    heroIndices.forEach((i, index) => {
      console.log("Working with set " + (index + 1));
      const currentString = js.data.substr(i + 7);

      // fs.writeFileSync(
      //   path.join(setsRawJSONDir, `${index + 1}_RAW.json`),
      //   currentString
      // );

      // console.log(JSON.parse('[{"foo":"bar"}]'));
      // const currentString = '[{"foo":"bar"}]';

      // For the whole string, make it try to be valid json:
      var prettyString = currentString
        // Replace ": " special cases
        .replaceAll('": "', '"@colon@ "')
        .replaceAll("one: ", "one@colon@ ")
        .replaceAll("different option:", "different option@colon@")
        .replaceAll("hoose one:", "hoose one@colon@")
        .replaceAll("your deck:", "your deck@colon@")

        //Fix other weird cases
        .replaceAll("!0", "false")

        // Replace ":" with "@colon@" if it's between double-quotes
        .replace(/:\s*"([^"]*)"/g, function (match, p1) {
          return ': "' + p1.replace(/:/g, "@colon@") + '"';
        })

        // Replace ":" with "@colon@" if it's between single-quotes
        .replace(/:\s*'([^']*)'/g, function (match, p1) {
          return ': "' + p1.replace(/:/g, "@colon@") + '"';
        })

        // Add double-quotes around any tokens before the remaining ":"
        .replace(/(['"])?([a-z0-9A-Z_]+)(['"])?\s*:/g, '"$2": ')

        // Turn "@colon@" back into ":"
        .replace(/@colon@/g, ":");

      prettyString = stripJsonTrailingCommas.default(prettyString, {
        stripWhitespace: true,
      });

      // console.log(prettyString);

      const json = extractJSONArray(prettyString);
      if (json !== null) {
        console.log("...writing raw json data");
        fs.writeFileSync(
          path.join(setsRawJSONDir, `${index + 1}_${thing}.json`),
          JSON.stringify(json, null, 4)
        );
        console.log("...done");
      } else {
        console.log("... ******* PROBLEM EXTRACTING JSON");
      }
    });

    // Use Cheerio to parse the HTML
    // const $ = cheerio.load(document);
    // const cardGroups = $(".card-group");
    // console.log(cardGroups);
  } catch (error) {
    console.log("ERROR", error);
  }
};

doWork("heroes");
doWork("masterminds");
doWork("villains");
doWork("schemes");
doWork("henchmen");
