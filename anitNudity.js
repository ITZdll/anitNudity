/*
 * antiNudity - Node.js nudity detector based on Nude.js & nudity
 * 
 * Author: iTZdll
 * Version: 0.1.0
 * License: MIT License
*/

var Canvas = require('canvas');
var Image = Image = Canvas.Image;
var fs = require('fs');

exports.scanFile = function(path, cb) {
	fs.readFile(path, function(err, data) {
		if (err)
			return cb(err);

		exports.scanData(data, cb);
	});
};

exports.scanData = function(data, cbPrimary) {
	var canvas = null,
	ctx = null,
	skinRegions = [],
	initCanvas = () => {
		canvas = Canvas.createCanvas();
		ctx = canvas.getContext('2d');
	},
	loadImage = () =>  {
		var img = new Image;
		img.src = data;
		canvas.width = img.width;
		canvas.height = img.height;
		ctx.drawImage(img, 0, 0);
	},
	scanImage = (cb) => {
		process.nextTick(() =>  {
			var image = ctx.getImageData(0, 0, canvas.width, canvas.height),
			imageData = image.data;
			skinMap = [],
				detectedRegions = [],
				mergeRegions = [],
				width = canvas.width,
				lastFrom = -1,
				lastTo = -1;
			var addMerge = (from, to) => {
				lastFrom = from;
				lastTo = to;
				var len = mergeRegions.length,
				fromIndex = -1,
				toIndex = -1;


				while (len--) {
					var region = mergeRegions[len],
					rlen = region.length;

					while (rlen--) {
						if (region[rlen] == from) {
							fromIndex = len;
						}

						if (region[rlen] == to) {
							toIndex = len;
						}
					}
				}

				if (fromIndex != -1 && toIndex != -1 && fromIndex == toIndex) {
					return;
				}
				if (fromIndex == -1 && toIndex == -1) {
					mergeRegions.push([from, to]);
					return;
				}
				if (fromIndex != -1 && toIndex == -1) {
					mergeRegions[fromIndex].push(to);
					return;
				}
				if (fromIndex == -1 && toIndex != -1) {
					mergeRegions[toIndex].push(from);
					return;
				}
				if (fromIndex != -1 && toIndex != -1 && fromIndex != toIndex) {
					mergeRegions[fromIndex] = mergeRegions[fromIndex].concat(mergeRegions[toIndex]);
					mergeRegions.splice(toIndex, 1);
					return;
				}
			};

			var length = imageData.length,
			width = canvas.width;

			for (var i = 0, u = 1; i < length; i+=4, u++) {
				var r = imageData[i],
				g = imageData[i+1],
				b = imageData[i+2],
				x = (u>width)?((u%width)-1):u,
				y = (u>width)?(Math.ceil(u/width)-1):1;

				if (classifySkin(r, g, b)) {
					skinMap.push({"id": u, "skin": true, "region": 0, "x": x, "y": y, "checked": false});

					var region = -1,
					checkIndexes = [u-2, (u-width)-2, u-width-1, (u-width)],
					checker = false;

					for (var o = 0; o < 4; o++) {
						var index = checkIndexes[o];
						if(skinMap[index] && skinMap[index].skin){
							if(skinMap[index].region!=region && region!=-1 && lastFrom!=region && lastTo!=skinMap[index].region){
								addMerge(region, skinMap[index].region);
							}
							region = skinMap[index].region;
							checker = true;
						}
					}

					if (!checker) {
						skinMap[u-1].region = detectedRegions.length;
						detectedRegions.push([skinMap[u-1]]);
						continue;
					} else {
						if (region > -1) {
							if(!detectedRegions[region]){
								detectedRegions[region] = [];
							}

							skinMap[u-1].region = region;					
							detectedRegions[region].push(skinMap[u-1]);
						}
					}
				} else {
					skinMap.push({"id": u, "skin": false, "region": 0, "x": x, "y": y, "checked": false});
				}
			}
			merge(detectedRegions, mergeRegions);
			return cb(null, analyseRegions());
		}); 
	},
	merge = (detectedRegions, mergeRegions) => {
		var length = mergeRegions.length,
		detRegions = [];

		while (length--) {

			var region = mergeRegions[length],
			rlen = region.length;

			if(!detRegions[length])
				detRegions[length] = [];

			while(rlen--){
				var index = region[rlen];
				detRegions[length] = detRegions[length].concat(detectedRegions[index]);
				detectedRegions[index] = [];
			}
		}

		var l = detectedRegions.length;
		while (l--) {
			if(detectedRegions[l].length > 0){
				detRegions.push(detectedRegions[l]);
			}
		}

		clearRegions(detRegions);
	},
	clearRegions = function(detectedRegions){
		var length = detectedRegions.length;

		for(var i=0; i < length; i++){
			if(detectedRegions[i].length > 30){
				skinRegions.push(detectedRegions[i]);
			}
		}
	},
	analyseRegions = () => {
		var length = skinRegions.length,
		totalPixels = canvas.width * canvas.height,
		totalSkin = 0;

		if(length < 3){
			return false;
		}

		(() => { 
			var sorted = false;
			while (!sorted) {
				sorted = true;
				for (var i = 0; i < length-1; i++) {
					if (skinRegions[i].length < skinRegions[i+1].length) {
						sorted = false;
						var temp = skinRegions[i];
						skinRegions[i] = skinRegions[i+1];
						skinRegions[i+1] = temp;
					}
				}
			}
		})();

		while (length--) {
			totalSkin += skinRegions[length].length;
		}

		if ((totalSkin/totalPixels)*100 < 15) {
			return false;
		}

		if ((skinRegions[0].length/totalSkin)*100 < 35 
				&& (skinRegions[1].length/totalSkin)*100 < 30
				&& (skinRegions[2].length/totalSkin)*100 < 30) {
			return false;
		}

		if ((skinRegions[0].length/totalSkin)*100 < 45) {
			return false;
		}

		if (skinRegions.length > 60) {
			return false;
		}

		return true;
	},
	colorizeRegions = () => {
		var length = skinRegions.length;
		for (var i = 0; i < length; i++) {
			var region = skinRegions[i],
			regionLength = region.length,
			randR = Math.ceil(Math.random()*255),
			randG = Math.ceil(Math.random()*255),
			rangB = Math.ceil(Math.random()*255);

			for (var o = 0; o < regionLength; o++) {
				var pixel = ctx.getImageData(region[o].x, region[o].y, 1,1),
				pdata = pixel.data;

				pdata[0] = randR;
				pdata[1] = randG;
				pdata[2] = rangB;

				pixel.data = pdata;

				ctx.putImageData(pixel, region[o].x, region[o].y);
			}
		}
	}, 
	classifySkin = (r, g, b) => {
		var rgbClassifier = ((r>95) && (g>40 && g <100) && (b>20) && ((Math.max(r,g,b) - Math.min(r,g,b)) > 15) && (Math.abs(r-g)>15) && (r > g) && (r > b)),
		nurgb = toNormalizedRgb(r, g, b),
		nr = nurgb[0],
		ng = nurgb[1],
		nb = nurgb[2],
		normRgbClassifier = (((nr/ng)>1.185) && (((r*b)/(Math.pow(r+g+b,2))) > 0.107) && (((r*g)/(Math.pow(r+g+b,2))) > 0.112)),
		hsv = toHsvTest(r, g, b),
		h = hsv[0],
		s = hsv[1],
		hsvClassifier = (h > 0 && h < 35 && s > 0.23 && s < 0.68);
		return (rgbClassifier || normRgbClassifier || hsvClassifier);
	},
	toYcc = (r, g, b) => {
		r/=255,g/=255,b/=255;
		var y = 0.299*r + 0.587*g + 0.114*b,
		cr = r - y,
		cb = b - y;

		return [y, cr, cb];
	},
	toHsv = (r, g, b) => {
		return [
			Math.acos((0.5*((r-g)+(r-b)))/(Math.sqrt((Math.pow((r-g),2)+((r-b)*(g-b)))))),
			1-(3*((Math.min(r,g,b))/(r+g+b))),
			(1/3)*(r+g+b)
		];
	},
	toHsvTest = (r, g, b) => {
		var h = 0,
		mx = Math.max(r, g, b),
		mn = Math.min(r, g, b),
		dif = mx - mn;

		if(mx == r){
			h = (g - b)/dif;
		}else if(mx == g){
			h = 2+((g - r)/dif)
		}else{
			h = 4+((r - g)/dif);
		}
		h = h*60;
		if(h < 0){
			h = h+360;
		}

		return [h, 1-(3*((Math.min(r,g,b))/(r+g+b))),(1/3)*(r+g+b)] ;	

	},
	toNormalizedRgb = (r, g, b) => {
		var sum = r+g+b;
		return [(r/sum), (g/sum), (b/sum)];
	};
	initCanvas();
	loadImage();
	scanImage((err, result) => {
		if (err)
			return cbPrimary(err);

		return cbPrimary(null, result);
	});
};