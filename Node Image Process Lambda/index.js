/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */



// dependencies
var AWS = require('aws-sdk') //AWS SDK
var gm = require('gm')
 .subClass({ imageMagick: true }) // Enable ImageMagick integration.
var util = require('util') //util lib

// constants
var MAX_WIDTH = 100;
var MAX_HEIGHT = 100;

// get reference to S3 client
var s3 = new AWS.S3();

// Main funciton of the Lambda
exports.handler = async function (event) {
	// Read options from the event.
	console.log('Reading options from event:\n', util.inspect(event, {depth: 5}));
	var srcBucket = event.Records[0].s3.bucket.name;
	// Object key may have spaces or unicode non-ASCII characters.
	var srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
	var dstBucket = srcBucket + 'resized'
	var dstKey = 'resized-' + srcKey
	console.log('Source Key:', srcKey, "Source Bucket:", srcBucket, "Dstr Key:", dstKey, "Dstr Bucket:", dstBucket);
	
	// Infer the image type.
	var typeMatch = srcKey.match(/\.([^.]*)$/);
	if (!typeMatch) {
		console.error('unable to infer image type for key ' + srcKey)
		return
	}
	
	var imageType = typeMatch[1];
	if (imageType !== 'JPG' && imageType !== 'jpg' && imageType !== 'png' && imageType !== 'PNG' && imageType !== 'jpeg' && imageType !== 'JPEG') {
		console.log('skipping non-image ' + srcKey)
		return
	}
	
	// Download the image from S3 var downloadImage = function () {
	var downloadImage = function () {
		console.log('Downloading image: ', srcKey, 'from bucket', srcBucket);
		return new Promise(resolve => {
			var params = {
				Bucket: srcBucket,
				Key: srcKey
			}
			s3.getObject(params, function (err, data) {
				if (err)
					console.log(err, err.stack) // an error occurred
				else {
					resolve(data)
					console.log('Downloaded image')
				}
			})
		})
	}
	
	// Resize image using ImageMagick
	var resizeImage = function () {
		console.log('Resizing image: ', srcKey, 'from bucket', srcBucket);
		return new Promise(resolve => {
			gm(srcObject.Body).size(function (err, size) {
				// Infer the scaling factor to avoid stretching the image unnaturally.
				if (err) { // an error occurred
					console.log(err)
					return 0
				} else {
					var scalingFactor = Math.min(
							MAX_WIDTH / size.width,
							MAX_HEIGHT / size.height
							)
					var width = scalingFactor * size.width
					var height = scalingFactor * size.height
					// Transform the image buffer in memory.
					this.resize(width, height)
							.toBuffer(imageType, function (err, buffer) {
								if (err)
									console.log(err) // an error occurred
								else {
									console.log('Resized image')
									resolve(buffer)
								}
							})
				}
			})
		})
	}
	// Upload the transformed image to a different S3 bucket.
	var uploadImage = function () {
		console.log('Uploading resized image: ', dstKey, 'to bucket', dstBucket);
		console.log(dstBucket)
		return new Promise(resolve => {
			var params = {
				Bucket: dstBucket,
				Key: dstKey,
				Body: dstObject,
				ContentType: srcObject.ContentType
			}
			s3.putObject(params, function (err, data) {
				if (err)
					console.log(err, err.stack) // an error occurred
				else {
					console.log('Uploaded resized image')// successful response
				}
			})
		})
	}
	let srcObject = await downloadImage();
	let dstObject = await resizeImage();
	await uploadImage();
}
