#!/usr/bin/env node

/*
const { Jimp } = require('jimp');
const { execSync } = require('child_process');
const { promises as fs } = require('node:fs');
const { existsSync } = require('node:fs');


function shell(command){
    //console.log(args);
    let opts= { encoding: 'utf8' };
    return execSync(command, opts);
}
*/

import { Jimp } from "jimp";
import { promises as fs } from "fs";
import { existsSync, readFileSync } from "fs"

function calculateDistance(coord1, coord2) {
  const { lat: lat1, lon: lon1 } = coord1;
  const { lat: lat2, lon: lon2 } = coord2;

  const earthRadius = 6371; // Earth's radius in kilometers.

  const lat1Rad = (lat1 * Math.PI) / 180;
  const lon1Rad = (lon1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const lon2Rad = (lon2 * Math.PI) / 180;

  const dLat = lat2Rad - lat1Rad;
  const dLon = lon2Rad - lon1Rad;

  // Calculation using the haversine formula (the formula is divided into two parts).

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = earthRadius * c;
    //return distance.toFixed(2); // The distance between two geographic points in kilometers rounded to the hundredths.
    return distance;
}


function getIndices(lat,lon){

    // https://www.swisstopo.admin.ch/en/coordinates-conversion-navref
    let oLat=45.806900086; //y  LV03: 73987.5
    let oLon=5.894943851;  //x  LV03: 479987.5
    let grid=25.0;         // grid is 25m
    
    let dx= 1000.0*calculateDistance( { lat: oLat , lon: oLon }, { lat: oLat, lon: lon }); 
    let dy= 1000.0*calculateDistance( { lat: oLat , lon: lon }, { lat: lat , lon: lon }); 

    
    let x = Math.round(dx/grid);
    let y = dhm.height - Math.round(dy/grid);

    //console.log('latlon: '+lat+' '+lon);
    return { x: x, y:y }
}


async function makeDhmImage(bbox){

    let upperLeft=getIndices(bbox.north,bbox.west);
    let lowerRight=getIndices(bbox.south,bbox.east);

    //console.log(upperLeft,lowerRight);
    
    let x=upperLeft.x;
    let y=upperLeft.y;
    let w=lowerRight.x-x;
    let h=lowerRight.y-y;

	
    let options={ width:w, height:h }
    //console.log(options)
    let out= new Jimp(options);
    out.blit({ src: dhm, x:0, y:0, srcX: x, srcY: y, srcW: w, srcH: h})  
    return out;    
}


async function processGeojson(geo){

    //const width=512;
    //const height=512;
    //const zoom=17;
    
    let features=geo.features;
    for(let i=0;i<features.length;i++){
	const feature=features[i];
	const id=feature.properties.id;
	const lat=feature.geometry.coordinates[1];
	const lon=feature.geometry.coordinates[0];
	const country=feature.properties.tags['addr:country'];

	if(country=='Schweiz/Suisse/Svizzera/Svizra'){
            process.stderr.write('.');

	    //const bbox = latLngToBounds(lat, lon, zoom, width, height);

	    let nodepath='./node/'+id+'/';
            let nodefile;
	    let image;
	    let bbox;
            let width;

	    width=512;
            bbox=JSON.parse( readFileSync(nodepath+'info-'+width+'.json','utf-8') ).bbox
	    //console.log(bbox);
	     nodefile= nodepath+'dhm-'+width+'.png';
	     if(!existsSync(nodefile)){
		 image = await makeDhmImage(bbox);
		  if(image){
		      //await fs.mkdir(nodepath, { recursive: true } );
		      await image.write(nodefile);
		  }
	     }

	    width=768
            bbox=JSON.parse( readFileSync(nodepath+'info-'+width+'.json','utf-8') ).bbox
	    //console.log(bbox);
	     nodefile= nodepath+'dhm-'+width+'.png';
	     if(!existsSync(nodefile)){
		 image = await makeDhmImage(bbox);
		  if(image){
		      //await fs.mkdir(nodepath, { recursive: true } );
		      await image.write(nodefile);
		  }
	     }
	    
	}
    }
}


let dhm = await Jimp.read('dhm25.png');

var chunks = '';

process.stdin.on('readable', () => {
  let chunk;
  while (null !== (chunk = process.stdin.read())) {
      chunks+=chunk;
  }
});

process.stdin.on('end', () => {
    processGeojson(JSON.parse(chunks))
});

