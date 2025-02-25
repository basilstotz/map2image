const { execSync } = require('child_process');

function shell(command){
    //console.log(args);
    let opts= { encoding: 'utf8' };
    return execSync(command, opts);
}



// https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#lon.2Flat_to_tile_numbers_2

const EARTH_CIR_METERS = 40075016.686;
const TILE_SIZE = 256
const degreesPerMeter = 360 / EARTH_CIR_METERS;
const LIMIT_Y = toDegrees(Math.atan(Math.sinh(Math.PI))) // around 85.0511...

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



function bboxToTiles(bbox,zoom){
    
    let top=lat2tile(bbox.north,zoom);
    let left=lon2tile(bbox.west,zoom);
    let bottom=lat2tile(bbox.south,zoom);
    let right=lon2tile(bbox.east,zoom);

    console.log('top='+top+' botton='+bottom+' left='+left+' right='+right);
    
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

function latLonToPixel(lat,lon,bbox, zoom){

    let top=lat2tile(bbox.north,zoom);
    let left=lon2tile(bbox.west,zoom);
    let bottom=lat2tile(bbox.south,zoom);
    let right=lon2tile(bbox.east,zoom);

    let fracX=lon2tileFraction(lon,zoom);
    let fracY=lat2tileFraction(lat,zoom);

    let px=0;
    let py=0;
    let resX;
    let resY;

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

function bboxToDimension(bbox,zoom){

    let top=lat2tile(bbox.north,zoom);
    let left=lon2tile(bbox.west,zoom);
    let bottom=lat2tile(bbox.south,zoom);
    let right=lon2tile(bbox.east,zoom);

    let dimX=Math.abs(left-right)+1;
    let dimY=Math.abs(top-bottom)+1;

    return { dimX: dimX, dimY: dimY }
}
    

function downloadTiles(dir, bbox, zoom){

    let tiles=bboxToTiles(bbox,zoom);
    let switzerland=isBoundInSwitzerland(bbox);
    
    let command=process.cwd()+'/download-tiles.sh ';
    command+=' '+dir;
    command+=' '+switzerland;
    command+=' '+zoom;
    for( const item of tiles)command+=' '+item;
    console.log(command);
    shell(command);

}

function makeImages(dir, id, lat, lon, bbox, zoom){

    let dimension=bboxToDimension(bbox, zoom);
    let tiles=bboxToTiles(bbox, zoom);
    let pixel=latLonToPixel(lat,lon,bbox,zoom);

    
    let command=process.cwd()+'/montage-tiles.sh ';
    command+=' '+dir;
    command+=' '+id;
    command+=' '+pixel.pixelX+' '+pixel.pixelY;
    command+=' '+dimension.dimX+' '+dimension.dimY;
    command+=' '+zoom;
    for( const item of tiles)command+=' '+item;
    
    console.log(command);
    shell(command);

}

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



function processGeojson(geo){

    const width=512;
    const height=512;
    const zoom=17;
    
    let features=geo.features;
    for(let i=0;i<3;i++){
	const feature=features[i];
	const id=feature.properties.id;
	const lat=feature.geometry.coordinates[0];
	const lon=feature.geometry.coordinates[1];

	const bbox = latLngToBounds(lat, lon, zoom, width, height);

	downloadTiles('./tiles', bbox, zoom);
	makeImages('./tiles', id, lat, lon, bbox, zoom);

	
	
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

