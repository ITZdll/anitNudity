const antiNudity = require('../anitNudity');

if (process.argv.length != 3) {
	console.log('Usage: node test.scanFile.js [image]');
	process.exit(1);
}

const imagePath = process.argv[2];
antiNudity.scanFile(imagePath, function(err, result) {
	if (err) return console.log(err);
	
	if (result) {
		console.log("This image is nudity");
	} else {
		console.log("I have not found any nudity in this image");
	}
});