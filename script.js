
const {google} = require('googleapis')
const fs = require('fs');
const http = require('http');
const express = require('express');
const app = express();
const credentials = require('./credentials.json');
app.use(express.static('public'));

const scopes = [
  'https://www.googleapis.com/auth/drive'
];

const auth = new google.auth.JWT(
  credentials.client_email, null,
  credentials.private_key, scopes
);

const drive = google.drive({ version: "v3", auth });


let handleRequest = (request, response) => {
    response.writeHead(200, {
        'Content-Type': 'text/html'
    });
    fs.readFile('index.html', null, (error, data) => {
      if (error) {
        response.writeHead(404);
        response.write("File not Found");
      }else{
        response.write(data);
      }
      response.end();
    })
};

http.createServer(handleRequest).listen(8000);


async function getBibtex(){
  const res = await drive.files.get({
    fileId: '1_ghA-P4Dsh2o74-ypU4Szm8gczZRJ7kY',
    alt: 'media'
  }, { responseType: 'text'});
  try {
    const content = res.data;
    document.getElementById("bibtex_input").textContent = content;
  } catch (err) {
    console.log(err);[]
  }
}

getBibtex();

// 1_ghA-P4Dsh2o74-ypU4Szm8gczZRJ7kY


