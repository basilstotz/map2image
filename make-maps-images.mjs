#!/usr/bin/env node

import { XYZTileset } from './xyztileset.mjs';
import { existsSync } from 'node:fs';

async function processGeojson(geo){

    const width=512;
    const height=512;
    const zoom=17;

    /*
    let esriOpts= {
	template: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
	cachedir: './tiles/esri'
    }
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

	process.stderr.write('.');
              
	let path='./node/'+id+'/'
	if(!existsSync(path+'osm-512.png')){
	    await tileset.getImageByPos(lat,lon,zoom,width,height);
	    await tileset.writeImage(path+'osm-512.png');
	    await tileset.writeInfo(path+'osm-512.json');
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
