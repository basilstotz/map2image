#!/usr/bin/env node

import { XYZTileset  } from './xyztileset.mjs'


let options= {
    template: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    cachedir: './tiles/osm'
}
    

let tileset = new XYZTileset(options);


let bbox= { north: 47.6, south: 47.5, west: 7.5, east: 7.6 };


await tileset.getImage(bbox,12);
await tileset.writeImage('bild.png');
console.log(await tileset.getInfo());
console.log(await tileset.getPixelPosition(47.6,7.5))
console.log(await tileset.getPixelPosition(47.5,7.6))

/*
await tileset.getImageByPos(47.5,7.5,17,512,512);
//await tileset.writeImage('bild2.png');
console.log(await tileset.getInfo());
console.log(await tileset.getPixelPosition(47.5,7.5));

*/

bbox= { north: 48.0, south: 47.0, west: 7.0, east: 8.0 };

//console.log(latLonToPixel(48.0, 7.0, bbox, 10))
//console.log(latLonToPixel(47.5, 7.5, bbox, 10))
//console.log(latLonToPixel(47.0, 8.0, bbox, 10))

