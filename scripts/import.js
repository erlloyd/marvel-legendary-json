import * as cheerio from "cheerio";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import stripJsonTrailingCommas from "strip-json-trailing-commas";
import { exit } from "process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const setsRawJSONDir = path.join(__dirname, "..", "downloadedSetData");

const extractJSONArray = (str) => {
  var firstOpen, firstClose, candidate;
  firstOpen = str.indexOf("{");
  firstClose = str.indexOf("}");
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
    firstClose = str.indexOf("}", firstClose + 1);
  } while (firstClose !== -1);

  console.log("didn't find anything");
  return null;
};

const doWork = async (thing) => {
  let setData = [];
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

    const packs = [...js.data.matchAll(/a\.\w+={/gi)].map((a) => ({
      name: a[0].substr(2, a[0].length - 4),
      index: a.index + a[0].length - 1,
    }));

    packs.forEach((pack, index) => {
      console.log("Working with pack " + pack.name);
      const currentString = js.data.substr(pack.index);
      // const currentString = `[{keyword:27},[{hc:1},": You get ",{bold:"+1"},{icon:2},"."]]`;

      // if (pack.name !== "Deadpool") {
      //   return;
      // }

      // fs.writeFileSync(
      //   path.join(setsRawJSONDir, `${pack.name}_RAW.json`),
      //   currentString
      // );

      // console.log(JSON.parse('[{"foo":"bar"}]'));
      // const currentString = '[{"foo":"bar"}]';

      // For the whole string, make it try to be valid json:
      var prettyString = currentString
        // Replace ": " special cases
        .replaceAll('": ', '"@colon@ ')
        .replaceAll(': "]', '@colon@ "]')
        .replaceAll(':"]', '@colon@"]')
        .replaceAll("one: ", "one@colon@ ")
        .replaceAll("different option:", "different option@colon@")
        .replaceAll("hoose one:", "hoose one@colon@")
        .replaceAll("your deck:", "your deck@colon@")
        .replaceAll("Ambush:", "Ambush@colon@")
        .replaceAll("Tactic:", "Tactic@colon@")
        .replaceAll("Players:", "Players@colon@")
        .replaceAll("Escape:", "Escape@colon@")
        .replaceAll("Otherwise:", "Otherwise@colon@")
        .replaceAll("Fight:", "Fight@colon@")
        .replaceAll("final tactic:", "final tactic@colon@")
        .replaceAll("Poland:", "Poland@colon@")
        .replaceAll("France:", "France@colon@")
        .replaceAll("USSR:", "USSR@colon@")
        .replaceAll("England:", "England@colon@")
        .replaceAll("USA:", "USA@colon@")
        .replaceAll("Australia:", "Australia@colon@")
        .replaceAll("Switzerland:", "Switzerland@colon@")
        .replaceAll("a player:", "a player@colon@")
        .replaceAll("1 player:", "1 player@colon@")
        .replaceAll("2 players:", "2 players@colon@")
        .replaceAll("2+ players:", "2+ players@colon@")
        .replaceAll("3 players:", "3 players@colon@")
        .replaceAll("4 players:", "4 players@colon@")
        .replaceAll("5 players:", "5 players@colon@")
        .replaceAll("Class:", "Class@colon@")
        .replaceAll("the game:", "the game@colon@")
        .replaceAll("these colors:", "the game@colon@")
        .replaceAll("following:", "following@colon@")
        .replaceAll("yet:", "yet@colon@")
        .replaceAll("Lilith:", "Lilith@colon@")
        .replaceAll("Bystander:", "Bystander@colon@")
        .replaceAll("Twist:", "Twist@colon@")
        .replaceAll("Master Strike:", "Master Strike@colon@")
        .replaceAll("Villain:", "Villain@colon@")
        .replaceAll("the ability:", "the ability@colon@")
        .replaceAll("these places:", "these places@colon@")

        // UTF-8 quote
        .replaceAll("“", "@special_quote@")
        //Fix other weird cases
        .replaceAll("!0", "false")

        // Replace ":" with "@colon@" if it's between double-quotes
        .replace(/:\s*"([^"{]*)"/g, function (match, p1) {
          return ': "' + p1.replace(/:/g, "@colon@") + '"';
        })

        // Replace ":" with "@colon@" if it's between single-quotes
        .replace(/:\s*'([^'{]*)'/g, function (match, p1) {
          return ': "' + p1.replace(/:/g, "@colon@") + '"';
        })

        // Add double-quotes around any tokens before the remaining ":"
        .replace(/(['"])?([a-z0-9A-Z_]+)(['"])?\s*:/g, '"$2": ')

        // Turn "@colon@" back into ":"
        .replace(/@colon@/g, ":")

        // Turn special quotes back into "“"
        .replaceAll("@special_quote@", "“");

      prettyString = stripJsonTrailingCommas.default(prettyString, {
        stripWhitespace: true,
      });

      // console.log(prettyString);

      const json = extractJSONArray(prettyString);
      if (json !== null) {
        console.log("...transforming raw json data");
        json.packName = pack.name;

        console.log("...writing raw json data");
        fs.writeFileSync(
          path.join(setsRawJSONDir, `${pack.name}.json`),
          JSON.stringify(json, null, 4)
        );
        console.log("...done");

        // Go through and update set data
        json.heroes.forEach((i) => {
          setData.push({
            name: `${pack.name}_heroes_${i.filterName || i.name}`,
            setTypeCode: "heroes",
          });
        });

        json.masterminds?.forEach((i) => {
          setData.push({
            name: `${pack.name}_masterminds_${i.filterName || i.name}`,
            setTypeCode: "masterminds",
          });
        });

        json.henchmen?.forEach((i) => {
          setData.push({
            name: `${pack.name}_henchmen_${i.filterName || i.name}`,
            setTypeCode: "henchmen",
          });
        });

        json.villains?.forEach((i) => {
          setData.push({
            name: `${pack.name}_villains_${i.filterName || i.name}`,
            setTypeCode: "villains",
          });
        });

        json.schemes?.forEach((i) => {
          setData.push({
            name: `${pack.name}_schemes_${i.filterName || i.name}`,
            setTypeCode: "schemes",
          });
        });

        json.bystanders?.forEach((i) => {
          setData.push({
            name: `${pack.name}_bystanders_${i.filterName || i.name}`,
            setTypeCode: "bystanders",
          });
        });
      } else {
        console.log("... ******* PROBLEM EXTRACTING JSON");
        fs.writeFileSync(
          path.join(setsRawJSONDir, `${pack.name}_PRETTY.json`),
          prettyString
        );
      }
    });

    setData.push({
      name: `GeneralCards_starter_Starter Deck`,
      setTypeCode: "starter",
    });

    setData.push({
      name: `GeneralCards_misc_S.H.I.E.L.D. Officer, Maria Hill`,
      setTypeCode: "misc",
    });
    setData.push({
      name: `GeneralCards_misc_Master Strike`,
      setTypeCode: "misc",
    });
    setData.push({
      name: `GeneralCards_misc_Scheme Twist`,
      setTypeCode: "misc",
    });
    setData.push({
      name: `GeneralCards_misc_Wound`,
      setTypeCode: "misc",
    });

    // Write set data
    fs.writeFileSync(
      path.join(setsRawJSONDir, `sets.json`),
      JSON.stringify(setData, null, 2)
    );

    // Use Cheerio to parse the HTML
    // const $ = cheerio.load(document);
    // const cardGroups = $(".card-group");
    // console.log(cardGroups);
  } catch (error) {
    console.log("ERROR", error);
  }
};

doWork("heroes");
// doWork("masterminds");
// doWork("villains");
// doWork("schemes");
// doWork("henchmen");
