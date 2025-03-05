#!/usr/bin/env node

import { Jimp } from 'jimp';
import { promises as fs } from 'fs';
import { existsSync, writeFileSync, mkdirSync } from 'fs'
import * as tilebelt from '@mapbox/tilebelt'

	
// https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#lon.2Flat_to_tile_numbers_2

const TILE_SIZE = 256

function toRadians(degrees) {
  return degrees * Math.PI / 180;
}
function toDegrees(radians) {
  return (radians / Math.PI) * 180
}

// coords to number  
function lon2tile(lon,zoom) {
    return (Math.floor(lon2tileFraction(lon,zoom));
}

function lon2tileFraction(lon,zoom) {
    return (((lon+180)/360*Math.pow(2,zoom)));
}

function lat2tile(lat,zoom)  {
    return Math.floor(lat2tileFraction(lat,zoom));
}

function lat2tileFraction(lat,zoom)  {
    return (((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom)));
}


function tile2long(x,z) {
    let n = Math.pow(2,z);
  return (x/n*360-180);
}

function tile2lat(y,z) {
  const n = Math.pow(2,z);
    const latRad = Math.atan( Math.sinh( Math.PI * ( 1.0 - 2*y/n )))
    return latRad * 180 / Math.PI;
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
 
function isInBbox(lat,lon,bbox){

    // https://gist.github.com/graydon/11198540
    
    let top=bbox.north;
    let left=bbox.west;
    let bottom=bbox.south;
    let right=bbox.east;

    let ans = ( ( lon > left ) && ( lon < right) && (lat > south) && ( lat < north) );

    if(ans){
	return "true"
    }else{
	return "false"
    }
}


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


/////////////////////////////////module//////////////////////////////////////////////////////////

function bboxToTileBbox(bbox,zoom){

    let top=lat2tile(bbox.north,zoom);
    let left=lon2tile(bbox.west,zoom);
    let bottom=lat2tile(bbox.south,zoom) + 1;
    let right=lon2tile(bbox.east,zoom) + 1;

    //console.log(top,left,bottom,right)
    
    let tileTop = tile2lat(top,zoom);
    let tileLeft= tile2long(left,zoom);
    let tileBottom = tile2lat(bottom,zoom);
    let tileRight = tile2long(right,zoom);

    
    let ans = { north: tileTop, west: tileLeft, south: tileBottom, east: tileRight }

    //console.log(ans);
    return ans;
}


function latLngToBounds(lat, lng, zoom, width, height){

    const EARTH_CIR_METERS = 40075016.686;
    const degreesPerMeter = 360 / EARTH_CIR_METERS;
    const LIMIT_Y = toDegrees(Math.atan(Math.sinh(Math.PI))) // around 85.0511...

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

export function latLonToPixel(lat,lon,bbox, zoom){
    /*
    let y=lat2tileFraction(bbox.north,zoom);
    let x=lon2tileFraction(bbox.west,zoom);
    let pointX=lon2tileFraction(lon,zoom);
    let pointY=lat2tileFraction(lat,zoom);
    */

    let topleft=tilebelt.pointToTileFraction(bbox.west, bbox.north, zoom)
    let point=tilebelt.pointToTileFraction(lon, lat, zoom);
    // = [x,y,z]
    
    let x = topleft[0]
    let y = topleft[1]
    let pointX = point[0];
    let pointY = point[1];

    let resX = Math.round( TILE_SIZE*(pointX - x));
    let resY = Math.round( TILE_SIZE*(pointY - y));

    return { x: resX, y: resY }
}

function tilebeltBboxToObject(bbox){
    return { west: bbox[0], south: bbox[1], east: bbox[2], north: bbox[3] }
}


function objectBboxToTilebelt(bbox){
    return [ bbox.west, bbox.south, bbox.east, bbox.north ]
}




function bboxToTiles(bbox,zoom){
    
    let top=lat2tile(bbox.north,zoom);
    let left=lon2tile(bbox.west,zoom);
    let bottom=lat2tile(bbox.south,zoom);
    let right=lon2tile(bbox.east,zoom);
    let tiles=[];
    for(let y=top;y<bottom+1;y++){
	for(let x=left;x<right+1;x++){
	    //tiles.push(zoom);
	    tiles.push(x);
	    tiles.push(y);
	}
    }
    return tiles;
}


function bboxToDimension(bbox,zoom){

    let top=lat2tile(bbox.north,zoom);
    let left=lon2tile(bbox.west,zoom);
    let bottom=lat2tile(bbox.south,zoom);
    let right=lon2tile(bbox.east,zoom);

    let dimX=Math.abs(left-right)+1;
    let dimY=Math.abs(top-bottom)+1;

    return { dimX: dimX, dimY: dimY }
}


export class XYZTileset{

    setOptions(options={}){
	if(options.template){
	    this.template=options.template;
	}else{
	    this.template='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
	}
	if(options.cachedir){
	    this.cachedir=options.cachedir;
	}else{
	    if(this.cachedir){ delete this.cachedir }
	}
	this.tilesSpec=[];
    }


    constructor( options ){
	
	this.TILE_SIZE=256;
	this.setOptions(options);
    }

    
    async getTile(x, y, z){

	let tile;
	let url =  this.template.replace('{s}','a').replace('{x}',x).replace('{y}',y).replace('{z}',z); 
	if(this.cachedir){
	    let path = this.cachedir+'/'+z+'/'+x+'/'+y;
	    if(!this.ext){
		if(existsSync(path+'.png')){
		    this.ext='png';
		}else if(existsSync(path+'.jpeg')){
		    this.ext='jpeg'
		}
	    }
	    if(this.ext && existsSync(path+'.'+this.ext)){
		process.stderr.write('-');
	      	tile = await Jimp.read(path+'.'+this.ext);
	    }else{
		process.stderr.write('+');
		tile = await Jimp.read(url);
		this.ext = tile.mime.slice(tile.mime.indexOf('/')+1)
		if(!existsSync(path.slice(0,path.lastIndexOf('/')))){
		    mkdirSync(path.slice(0,path.lastIndexOf('/')),{ recursive:true});
		}
		await tile.write(path+'.'+this.ext);
	    }
	}else{
	    tile= await Jimp.read(url);
	}
	return tile
    }

    async getTiles(bbox,zoom){
	
	let tilesSpec = bboxToTiles(bbox,zoom);
	let changed=false;
	if(tilesSpec.length==this.tilesSpec.length){
	    for(let i=0;i<tilesSpec.length;i++){
		if(tilesSpec[i]!=this.tilesSpec[i]){
		    changed=true;
		    break;
		}
	    }
	}else{
	    changed=true
	}
	if(changed){
	    this.tilesSpec=tilesSpec;
	    this.zoom=zoom;
	    this.tiles = [];
	    this.bbox = bbox;
	    for(let i=0;i<this.tilesSpec.length;i+=2){	
		let x=this.tilesSpec[i];
		let y=this.tilesSpec[i+1];
		let z=zoom;
		this.tiles.push(await this.getTile(x,y,z))
	    }
	}	
	return this.tiles
    }

    async getImage(bbox,zoom){

	let tileImages = await this.getTiles(bbox,zoom);
	let dimension=bboxToDimension(bbox, zoom);
	let dimX = dimension.dimX;
	let dimY = dimension.dimY;
	let w = dimX*this.TILE_SIZE;
	let h = dimY*this.TILE_SIZE;
	this.image = new Jimp({ width: w, height: h });
	for(let y=0;y<dimY;y++){
	    for(let x=0;x<dimX;x++){
		let posX = x*this.TILE_SIZE;
		let posY = y*this.TILE_SIZE;
		let index = x+y*dimX;
		this.image.composite(tileImages[index],posX,posY);
	    }
	}
	let tilesBbox=bboxToTileBbox(bbox,zoom)
        let pixelTopLeft = latLonToPixel(bbox.north, bbox.west, tilesBbox, zoom);
        let pixelBottomRight = latLonToPixel(bbox.south, bbox.east, tilesBbox, zoom);
	let xc = pixelTopLeft.x;
	let yc = pixelTopLeft.y;
	let wc = pixelBottomRight.x - pixelTopLeft.x;
	let hc = pixelBottomRight.y - pixelTopLeft.y;
	//console.log(xc,yc,wc,hc);
	this.image.crop({x: xc, y:yc, w:wc, h:hc});
	if(this.center){delete this.center}
	this.bbox = bbox;
	//console.log(this.bbox)
	return this.image
    }


    async getImageByPos(lat, lon, zoom, width, height){
        let bbox= latLngToBounds(lat, lon, zoom, width, height)	
        let image = await this.getImage(bbox,zoom)
	this.center = { lat: lat, lon: lon };
	//console.log(this.bbox)
	return image;
    }

    async getPixelPosition(lat,lon){
	console.log(this.bbox);
	return latLonToPixel(lat, lon, this.bbox, this.zoom);
    }
    
    async writeImage(path){
	if(this.image){
	    await this.image.write(path)
	}
    }

 
    
    async getInfo(){
	let info = {
	    zoom: this.zoom,
	    bbox: this.bbox,
	    center: this.center,
	    template: this.template,
	    width: this.image.width,
	    height: this.image.height
	}
	return info;
    }

    async writeInfo(path){
	if(this.image){
	    let info=this.getInfo();
	    writeFileSync(path, JSON.stringify(info,null,2)+'\n','utf-8')
	}
    }
}
		
////////////////////////////////end module/////////////////////////////////////////

//Object.defineProperty(exports, "__esModule", { value: true });
//exports.XYZTileset = XYZTileset;

/*
let tile = await tileset.getTile(5,5,12);
console.log(tile.mime,tile.width,tile.height);
*/
/*



async function makeImage(tiledir, layer, bbox, zoom, width, height){

    let pixel=latLonToPixel(bbox,zoom);
    let tileBbox = bboxToTileBbox(bbox,zoom);

    //console.log(bbox,tileBbox);
    
    let tileImages = await downloadLayer(tiledir, layer, bbox, zoom);

    //console.log(tileImages.length);

    if(tileImages.length>0){
	//console.log(tileImages);
	let dimension=bboxToDimension(bbox, zoom);
	let dimX = dimension.dimX;
	let dimY = dimension.dimY;
	// new image
	let w = dimX*TILE_SIZE;
	let h = dimY*TILE_SIZE;
	let out = new Jimp({ width: w, height: h });
	//compose tiles on image
	for(let y=0;y<dimY;y++){
	    for(let x=0;x<dimX;x++){
		let posX = x*TILE_SIZE;
		let posY = y*TILE_SIZE;
		let index = x+y*dimY;
		out.composite(tileImages[index],posX,posY);
	    }
	}
	//kleines bild
	let bild = new Jimp( { width: width, height: height });
	let pixelX = pixel.pixelX;
	let pixelY = pixel.pixelY;
	let left = pixelX - width/2;
	let top = pixelY- height/2;
	let options = { src: out, x:0, y:0,  srcX: left, srcY: top, srcW: width, srcH: height};
	bild.blit(options);
        let point= { x: pixelX, y: pixelY } 
	
        return  {
	    zoom: zoom,
	    tiles: { image: out, bbox: tileBbox, point: point },
	    bild: { image: bild, bbox: bbox }
	}
		
    }else{
	return false
    }	
}

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

async function processGeojson(geo){

    const width=512;
    const height=512;
    const zoom=17;
    
    let features=geo.features;
    for(let i=0;i<features.length;i++){
	const feature=features[i];
	const id=feature.properties.id;
	const lat=feature.geometry.coordinates[1];
	const lon=feature.geometry.coordinates[0];

	const bbox = latLngToBounds(lat, lon, zoom, width, height);

	process.stderr.write('.');
	
	for(const layer of [ 'osm', 'esri', 'slope' ]){

	    let nodepath='./node/'+id+'/';
	    //let nodefile= nodepath+layer+'-768.png';
	    //if(!existsSync(nodefile)){
		let answer = await makeImage('./tiles', layer, bbox, zoom, width, height);
		if(answer){
		    let info;
		    
		    if(!existsSync(nodepath)){
			await fs.mkdir(nodepath, { recursive: true } );
		    }
		    
		    if(!existsSync(nodepath+layer+'-768.png')){
			await answer.tiles.image.write(nodepath+layer+'-768.png');
		    }
		    
		    if(!existsSync(nodepath+'info-768.json')){
			info =  { zoom: answer.zoom, bbox: answer.tiles.bbox };
			writeFileSync(nodepath+'info-768.json', JSON.stringify(info,null,2),'utf-8');
		    }

		    if(!existsSync(nodepath+layer+'-512.png')){
			await answer.bild.image.write(nodepath+layer+'-512.png');
		    }
		    
		    if(!existsSync(nodepath+'info-512.json')){
			info =   { zoom: answer.zoom, bbox: answer.bild.bbox };
			writeFileSync(nodepath+'info-512.json', JSON.stringify(info,null,2),'utf-8');
		    }
		}
	    //}
	    
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


//////////////////////////////////////////////////////////////////////////////7
////////////////////////////////////////777777////////////////////////////////7

function downloadTiles(tiledir, bbox, zoom){

    let tiles=bboxToTiles(bbox,zoom);
    let switzerland=isBoundInSwitzerland(bbox);
    
    let command=process.cwd()+'/download-tiles.sh ';
    command+=' '+tiledir;
    command+=' '+switzerland;
    command+=' '+zoom;
    for( const item of tiles)command+=' '+item;
    //console.log(command);
    shell(command);

}

function makeImages(tiledir, id, lat, lon, bbox, zoom){

    let dimension=bboxToDimension(bbox, zoom);
    let tiles=bboxToTiles(bbox, zoom);
    let pixel=latLonToPixel(lat,lon,bbox,zoom);

    
    let command=process.cwd()+'/montage-tiles.sh ';
    command+=' '+tiledir;
    command+=' '+id;
    command+=' '+pixel.pixelX+' '+pixel.pixelY;
    command+=' '+dimension.dimX+' '+dimension.dimY;
    command+=' '+zoom;
    for( const item of tiles)command+=' '+item;
    
    //console.log(command);
    shell(command);

}

*/

/*
// 47.511748, 7.7814914
// 	47.4928344, 7.6411131

//exampls
const latitude =  47.4928344 //Number(process.argv[2])
const longitude = 7.6411131 //Number(process.argv[3])
const zoom = 17 //process.argv[4]
const width = 512 //process.argv[5]
const height = 512 //process.argv[5]

console.log(latitude,longitude);

const bbox = latLngToBounds(latitude,longitude,zoom,width,height);

//let tiles=bboxToTiles(bb,zoom);

downloadTiles('./tiles',bbox,zoom);

// https://stackoverflow.com/questions/2853334/glueing-tile-images-together-using-imagemagicks-montage-command-without-resizing
// montage tile*.jpg -tile 3x3 -geometry +0+0 output.jpg

makeImages('./tiles', latitude, longitude, bbox, zoom);
*/


/*
const src = [
  "https://www.openstreetmap.org/export/embed.html?bbox=",
  bb.west,
  ",",
  bb.south,
  ",",
  bb.east,
  ",",
  bb.north,
  "&layer=mapnik&marker=",
  latitude,
  ",",
  longitude,
].join('');


console.log(src);
*/
