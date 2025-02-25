#!/usr/bin/env node

//const fs = require('fs');

//const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

// The URL of the image to download
//const imageURL = "https://example.com/image.jpg";


function read(name){
    return fs.readFileSync(name,{encoding:'utf8', flag:'r'});
}
function write(name,data){
    fs.writeFileSync(name,data,{encoding:'utf8', flag:'w'});
}


function lon2tile(lon,zoom) {
    return (Math.floor((lon+180)/360*Math.pow(2,zoom)));
}

function lat2tile(lat,zoom)  {
    return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom)));
}

function tile2long(x,z) {
    return (x/Math.pow(2,z)*360-180);
}

function tile2lat(y,z) {
    var n=Math.PI-2*Math.PI*y/Math.pow(2,z);
    return (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
}

let lat=process.argv[2]
let lon=process.argv[3]
let zoom=process.argv[4]

let o=lon2tile(lon,zoom);
let a=lat2tile(lat,zoom);

console.log(a,o);

url='https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.hangneigung-ueber_30/default/current/3857/'+zoom+'/'+a+'/'+o+'.png'

console.log(url);

// The path of the directory to save the image
const dirPath = "./images";

// The name of the image file
const fileName = "image.jpg";

// Create the directory if it does not exist
if (!fs.existsSync(dirPath)) {
  fs.mkdirSync(dirPath);
}

fetch(url).then((res) =>
  res.body.pipe(fs.createWriteStream('image.png'))
);

/*
fetch(url)
  .then((response) => response.arrayBuffer())
  .then((arrayBuffer) => {
      // Write the buffer to a file
      let buffer=Buffer.from(arrayBuffer);
      fs.createWriteStream('image.png').write(buffer);
    //fs.writeFile(path.join(dirPath, fileName), buffer, (err) => {
    */
/*
      if (err) {
        console.error(err);
      } else {
        console.log("Image downloaded successfully");
      }
*/
 

/*
  })
  .catch((error) => {
    console.error(error);
  });
*/
/*
fetch(url)
	.then((resp) => resp.blob())
	.then(function(data) {
	    write('uhu.png',data);
	})
	.catch(function(error) {
	    console.log(error);         
	});

*/


//https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}
//https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
//https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.hangneigung-ueber_30/default/current/3857/{z}/{x}/{y}.png
