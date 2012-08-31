# bootup.js

Cache and load static files from local storage. This makes it easier to manage Javascript and other files for offline use, or just to improve the startup time of your web app.

## How to use

Simply instantiate a new BootUp object with an array of files to load.

        new BootUp(<em>files</em>, <em>options</em>);

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

## License
This project is licensed under the LGPL, see the LICENSE.TXT file for more information.