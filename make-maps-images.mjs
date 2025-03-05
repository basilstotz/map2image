#!/usr/bin/env node

import { XYZTileset } from './xyztileset.mjs';
import { existsSync } from 'node:fs';

/*
let options= {
    template: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    cachedir: './tiles/osm'
}
    

let tileset = new XYZTileset(options);


let bbox= { north: 47.6, south: 47.5, west: 7.5, east: 7.6 };


//await tileset.getImage(bbox,12);
//await tileset.writeImage('bild.png');
//await tileset.writeInfo('info.json');


await tileset.getImageByPos(47.5,7.5,17,512,512);
//await tileset.writeImage('bild2.png');
console.log(await tileset.getInfo());
console.log(await tileset.getPixelPosition(47.5,7.5));
*/

async function processGeojson(geo){

    const width=512;
    const height=512;
    const zoom=17;

    /*
    let esriOpts= {
	template: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
	cachedir: './tiles/esri'
    }
    let esri = new XYZTilset(esriOpts);    
    */
    let osmOpts= {
	template: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
	cachedir: './tiles/osm'
    }
    let tileset = new XYZTileset();

    tileset.setOptions(osmOpts);
    
    let features=geo.features;
    for(let i=0;i<features.length;i++){
	const feature=features[i];
	const id=feature.properties.id;
	const lat=feature.geometry.coordinates[1];
	const lon=feature.geometry.coordinates[0];

	//const bbox = latLngToBounds(lat, lon, zoom, width, height);

	process.stderr.write('.');
              
	if(id!=11309336014){
	    let path='./node/'+id+'/'
	//process.stderr.write(id+' ');
	    if(!existsSync(path+'osm-512.png')){
		await tileset.getImageByPos(lat,lon,zoom,width,height);
		await tileset.writeImage(path+'osm-512.png');
		await tileset.writeInfo(path+'osm-512.json');
	    }
	}
    }
}
    

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



