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


// https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#lon.2Flat_to_tile_numbers_2

/*
const EARTH_CIR_METERS = 40075016.686;
const TILE_SIZE = 256
const degreesPerMeter = 360 / EARTH_CIR_METERS;
const LIMIT_Y = toDegrees(Math.atan(Math.sinh(Math.PI))) // around 85.0511...
*/

/*
function toRadians(degrees) {
  return degrees * Math.PI / 180;
}
function toDegrees(radians) {
  return (radians / Math.PI) * 180
}

// coords to number  
function lon2tile(lon,zoom) {
    return (Math.floor((lon+180)/360*Math.pow(2,zoom)));
}

function lon2tileFraction(lon,zoom) {
    return (((lon+180)/360*Math.pow(2,zoom)));
}


function lat2tile(lat,zoom)  {
    return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom)));
}

function lat2tileFraction(lat,zoom)  {
    return (((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom)));
}



// number to coords
function tile2long(x,z) {
  return (x/Math.pow(2,z)*360-180);
}

function tile2lat(y,z) {
  const n=Math.PI-2*Math.PI*y/Math.pow(2,z);
  return (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
}


function lonOnTile(lon, zoom) {
  return ((lon + 180) / 360) * Math.pow(2, zoom)
}

function latOnTile(lat, zoom) {
  return (
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
      ) /
        Math.PI) /
      2) *
    Math.pow(2, zoom)
  )
}
 


function latLngToBounds(lat, lng, zoom, width, height){
    
  const metersPerPixelEW = EARTH_CIR_METERS / Math.pow(2, zoom + 8);

  const shiftMetersEW = width/2 * metersPerPixelEW;

  const shiftDegreesEW = shiftMetersEW * degreesPerMeter;
  
  const southTile = (TILE_SIZE * latOnTile(lat, zoom) + height/2) / TILE_SIZE
  const northTile = (TILE_SIZE * latOnTile(lat, zoom) - height/2) / TILE_SIZE


  return {
    south: Math.max(tile2lat(southTile, zoom), -LIMIT_Y),
    west: lng-shiftDegreesEW,
    north: Math.min(tile2lat(northTile, zoom), LIMIT_Y),
    east: lng+shiftDegreesEW
  }
}
*/
/*
function isBoundInSwitzerland(bbox){

    // https://gist.github.com/graydon/11198540

    let sLeft = 6.02260949059;
    let sRight = 10.4427014502;

    let sBottom =45.7769477403;
    let sTop = 47.8308275417;
    
    let top=bbox.north;
    let left=bbox.west;
    let bottom=bbox.south;
    let right=bbox.east;

    let switzerland= ((top < sTop) && (bottom > sBottom) && (left > sLeft) && (right < sRight));

    if(switzerland){
	return "true"
    }else{
	return "false"
    }
}
*/

/*
function bboxToTiles(bbox,zoom){
    
    let top=lat2tile(bbox.north,zoom);
    let left=lon2tile(bbox.west,zoom);
    let bottom=lat2tile(bbox.south,zoom);
    let right=lon2tile(bbox.east,zoom);

    //console.log('top='+top+' botton='+bottom+' left='+left+' right='+right);
    
    let tiles=[];

    // left to right
    // top to bottom
    
    for(let y=top;y<bottom+1;y++){
	for(let x=left;x<right+1;x++){
	    //tiles.push(zoom);
	    tiles.push(x);
	    tiles.push(y);
	}
    }

    return tiles;
}
*/


/*
function latLonToPixel(bbox, zoom){

    let top=lat2tile(bbox.north,zoom);
    let left=lon2tile(bbox.west,zoom);
    let bottom=lat2tile(bbox.south,zoom);
    let right=lon2tile(bbox.east,zoom);

    let lon=(bbox.west+bbox.east)/2.0;
    let lat=(bbox.north+bbox.south)/2.0;
    let fracX=lon2tileFraction(lon,zoom);
    let fracY=lat2tileFraction(lat,zoom);

    let px;
    let py;
    let resX;
    let resY;

    py=0;
    for(let y=top;y<bottom+1;y++){
	px=0;
	for(let x=left;x<right+1;x++){
	    let X=Math.floor(fracX);
	    let Y=Math.floor(fracY);
	    if(x==X && y==Y){
	  	resX=px+Math.round( (fracX-X)*TILE_SIZE );
		resY=py+Math.round( (fracY-Y)*TILE_SIZE );
            }
	    px+=TILE_SIZE;
	}
	py+=TILE_SIZE;
    }

    return { pixelX: resX, pixelY: resY }
}
*/
/*
function bboxToDimension(bbox,zoom){

    let top=lat2tile(bbox.north,zoom);
    let left=lon2tile(bbox.west,zoom);
    let bottom=lat2tile(bbox.south,zoom);
    let right=lon2tile(bbox.east,zoom);

    let dimX=Math.abs(left-right)+1;
    let dimY=Math.abs(top-bottom)+1;

    return { dimX: dimX, dimY: dimY }
}
    

async function getTile(layer,x,y,z){



    return tile;
}
/*
/*
async function downloadLayer(tiledir,layer, bbox,zoom){

    let tiles = bboxToTiles(bbox,zoom);
    let switzerland = isBoundInSwitzerland(bbox);
    let tileImages = [];

    for(let i=0;i<tiles.length;i+=2){	
	let url;
	let ext;
	let x=tiles[i];
	let y=tiles[i+1];
	let z=zoom;
	switch(layer){
	case 'osm':
	    url='https://a.tile.openstreetmap.org/'+z+'/'+x+'/'+y+'.png';
	    ext='png';
	    break;
	case 'slope':
	    if(switzerland=="true" && zoom<=17){
		url='https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.hangneigung-ueber_30/default/current/3857/'+z+'/'+x+'/'+y+'.png';
	    }else{
		url='';
	    }
	    ext='png';
	    break;
	case 'esri':
	    url='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/'+z+'/'+y+'/'+x;
	    ext='jpeg';
	    break;
	default:
	    url=''
	    break;
	}
	let path = tiledir+'/'+layer+'/'+zoom+'/'+x+'/';
	let file = y+'.'+ext;
	let tile;
	if(url!=''){
	    if(existsSync(path+file) ){ 
		tile = await Jimp.read(path+file)
	    }else{
		console.log(path+file);
		tile = await Jimp.read(url);
		await fs.mkdir(path, { recursive: true } );	    
		await tile.write(path+file);
	    }
	    tileImages.push(tile);
	}
    }
    return tileImages
}
*/
