const antiNudity = require('./src/anitNudity');
var fs = require('fs');

if (process.argv.length != 3) {
	console.log('Usage: node test.scanData.js [image]');
	process.exit(1);
}

const imagePath = process.argv[2];
fs.readFile(imagePath, function(err, data) {
	if (err)
		return console.log(err);

	antiNudity.scanData(data, function(err, result) {
		if (err) return console.log(err);

		if (result) {
			console.log("This image is nudity");
		} else {
			console.log("I have not found any nudity in this image");
		}
	});
});