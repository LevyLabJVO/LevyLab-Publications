import express, { json as _json } from "express";
import cors from "cors";
import _ from "lodash";
import { google } from 'googleapis';
import { toJSON } from 'bibtex-parse-js';
import TreeMap from "treemap-js";
import dotenv from 'dotenv'
dotenv.config()

const scopes = [
    'https://www.googleapis.com/auth/drive'
];


const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
const privateKey = process.env.GOOGLE_PRIVATE_KEY;
// console.log(clientEmail, privateKey);
const auth = new google.auth.JWT(
    clientEmail, null,
    privateKey, scopes
);


const drive = google.drive({ version: "v3", auth });
const app = express();
app.use(_json());
app.use(cors());

app.listen(3000, () => console.log("API server is running"));

// Sending AllPubs through server
app.get("/bibtexFile", async (req, res) => {
    const allPubs = await getBibtex();
    res.json(allPubs);
})

export default app;
async function getBibtex(){
    const res = await drive.files.get({
      fileId: '1_ghA-P4Dsh2o74-ypU4Szm8gczZRJ7kY',  // ID of LevyLab Publications
      alt: 'media'  // Getting data of levyPubs.bib
    });
    try{
        // Makking array of each publication
        let allPubs = [];
        let data = '}\n\n' + res.data;
        data = data.replaceAll("% The entry below contains non-ASCII chars that could not be converted% to a LaTeX equivalent.", "");

        // Splitting data by '}\n\n@' instead of '@' as one of publications affiliations includes '@' in an email.
        // This way ensures it is split by each publication
        let publications = data.split('}\n\n@');

        // Deleting first instance as it is empty when splitting data
        publications.shift();

        // fixing formatting of isbn. isbn field is not wrapped in quotes causing issues with node.js bibtex parser.
        publications = publications.map(element => {
            return wrap13DigitIntegers(element);
        })

        // Using bibtex parser to create json object of each publication and pushing into allPubs
        publications.forEach(element => {
            var json = toJSON('@' + element + '}\n\n');
            allPubs.push(json[0]);
        });

        // Sorting map by year. AllPubs now consists of an arrays of publication be year from least to greatest
        allPubs = sortMap(allPubs);
        return allPubs;
    }catch(err){
        console.log(err);
    }
}

function sortMap(publications){
    // Initializing new array and TreeMap which sorts automatically sorts key values
    const sortedPubs = [];
    var map = new TreeMap();

    // Iterating through each publication and inserting into TreeMap
    publications.forEach(publication => {
        const year = Number(publication.entryTags.year);
        // Fixing formatting of title and abstract
        publication.entryTags.title = fixFormatting(publication.entryTags.title);
        if (publication.entryTags.abstract != undefined)
            publication.entryTags.abstract = fixFormatting(publication.entryTags.abstract);

        // Fixing formatting of Authors
        publication.entryTags.author = fixAuthors(publication.entryTags.author);

        // Inserting each publication into TreeMap.
        let yearPubs = map.get(year);
        if (yearPubs == null){
            map.set(year, [publication]);
        }else{
            yearPubs.push(publication);
        }
    });

    // Iterating through TreeMap and putting it into Array
    for (let i = map.getMinKey(); i <= map.getMaxKey(); i++){
        const yearPubList = map.get(i);
        if (yearPubList == null)
            continue;
        sortedPubs.push(yearPubList);
    }

    // Reversing array so most recent year is at start of array
    return sortedPubs.reverse();
}

function fixFormatting(title){

    // Fixing formatting of data
    if (title == undefined)
        return undefined;
    return title.replaceAll("$", "").replaceAll(/\\/g, "").replaceAll("text", "")
    .replaceAll("}", "").replaceAll("{", "").replaceAll("\n", "").replaceAll("_", "")
    .replaceAll(" 3", "3").replace(/\s+/g, ' ').replaceAll(" /", "/").replaceAll("mathrm", "").trim();
}

function fixAuthors(authors){

    // Edge case: One of publication's authors is formatted differently from the rest -> "{author 1, author 2, author 3, author 4...}"
    if (authors.includes("{"))
        return authors.replaceAll("\n", "").replace(/\s+/g, ' ')
        .replaceAll("{", "").replaceAll("}", "").split(", ");

    // Fixing formatting of authors by removing all new lines
    authors = authors.replaceAll("\n", "");

    // Format of authors -> "Last name1, First name1 and Last name2, First name2 and Last name3, Firstname3..."
    // Splitting the authors into "Last name, FirstName" array
    const namesArray = authors.split(" and ");

    // Formatting names into "FirstName LastName"
    const formattedNames = namesArray.map((name) => {
        const trimName = name.split(" ").join("")
        .replace(/([A-Z])/g, ' $1').replaceAll("- ", "-").trim();

        const [lastName, firstName] = trimName.split(",");
        return firstName.slice(1) + " " + lastName;
    });

    // Joining formatted names into single string
    return formattedNames.join(", ");
}

// Fixing isbn not being wrapped in quotes
function wrap13DigitIntegers(inputString) {
    const regex = /(?<=\s|^)\d{13}(?=\s|$)/g;
    return inputString.replace(regex, '"$1"');
}







