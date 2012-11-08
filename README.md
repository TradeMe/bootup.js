# bootup.js

Cache and load static files from local storage. This makes it easier to manage Javascript and other files for offline use, or just to improve the startup time of your web app.

## How to use

Simply instantiate a new BootUp object with an array of files to load.

        new BootUp(files, options);

Where:

* files: an array of URLs to load,
* options: an object literal (optional)

### Options

#### success: function(Object BootUp)
A callback for when all files have loaded successfully.

#### error: function(Object BootUp)
A callback for when at least one file has failed. 

#### loaded: function(Object BootUp, Number downloadedCount, Number fileCount, String path, String data)
This callback will fired after a file has successfully downloaded.
* downloadedCount returns the number of items that have successfully downloaded so far.
* fileCount returns the number of files remaining.
* path is the path of the file.
* data is the contents of the file.

#### threads: Number
The maximum number of files to download at the same time. The default is 8.

#### debug: Boolean
Set to true to have logged console output.

#### refresh: Boolean
Set to true to delete the local storage cache and redownload everything.

### Functions

#### getFile(string)
Get the contents of the file with the specified file name.

## Examples

### Simple Example

The simplest way to use BootUp is to just specify an array of files to download.

	new BootUp(["jquery.js", "backbone.js", "site.js"]);

This will load in jQuery, Backbone and your site code (in the order that they are specified) and load them into `localStorage` (if available). On the next visit, it will just load them from `localStorage` directly.

### Callbacks

There are three callbacks that you can use and are specified in the `options` object.

`success` is called when all the files specified in the array have been downloaded. It works similar to the `window.onload` event handler.

	new BootUp(
		["jquery.js", "backbone.js", "site.js"],
		{
			success: function() {
				init();
				// call the init function if specified somewhere
			}
		}
	);

`error` is called if there is an issue downloading any of the files. Note, this is not called if `localStorage` is unavailable, or has become corrupt (these are handled silently by BootUp and in most cases would act like nothing happened).

	new BootUp(
		["jquery.js", "backbone.js", "site.js"],
		{
			error: function() {
				alert("There was an error loading the files. Please try again later.");
			}
		}
	);

`loaded` can be used to indicate the download progress of all the files, and is called whenever a file has finished downloading. It provides you with the number of files already downloaded, the total number of files, and even the contents of the last downloaded file if necessary.

	<div id="Progress"></div>
	<script>
		new BootUp(
			["jquery.js", "backbone.js", "site.js"],
			{
				loaded: function(obj, current, maximum) {
					document.getElementById("Progress").innerText = current + " of " + maximum + " downloaded...";
				}
			}
		);
	</script>

### Advanced File Loading

BootUp isn't just limited to loading Javascript files - it can load any file and store it in `localStorage`. While it automatically injects Javascript onto the page, you must use the `getFile` function to get to any other files.

	var cachedFiles = new BootUp(
		["jquery.js", "main_template.html"],
		{
			success: function() {
				init();
			}
		}
	);

	function init() {

		// we have a reference to the BootUp object in cachedFiles
		var source = cachedFiles.getFile("main_template.html");
		// you must use the exact file name that you used to get the file
		// otherwise it will return null

		// we now have the contents of main_template.html in our source variable
		if (source) {
			$("body").append(source);
		}

	}

## License
This project is licensed under the MIT License, see the LICENSE.TXT file for more information.