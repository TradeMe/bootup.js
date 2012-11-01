/**
 * Creates a new BootUp instance.
 *
 * @constructor
 * @this {BootUp}
 * @param files An array of file names to download
 * @param options An array of options.
 */
var BootUp = function (files, options) {

    var hasStorage = ("localStorage" in window);
    var threads = 0;
    var maxThreads = 8;
    var loadCheck = 0;
    var fileCount = 0;
    var downloadedCount = 0;

    var storedCache = null;
    var loadedFiles = [];
    var nextQueue = [];
    var hasFailed = false;
    var debugging = false;
    var loadFresh = false;

    var callbackSuccess = null;
    var callbackError = null;
    var callbackLoaded = null;

    /**
     * Begins the loading files loop.
     * @private
     */
    function loadFiles() {
        for (var i = 0; i < files.length; i++) {
            if (hasFailed) {
                return;
            }

            var file = files[i];
            if (typeof (file) === "object") {
                loadedFiles.push({ path: file.url, callback: file.callback });
                downloadFile(file.url);
            } else {
                loadedFiles.push({ path: file, callback: null });
                downloadFile(file);
            }
        }
    }

    /**
     * Processes the options object.
     * @private
     * @param {object} opts The options object.
     */
    function loadOptions(opts) {
        if (!opts) {
            return;
        }
        if (opts.success) {
            callbackSuccess = opts.success;
        }
        if (opts.error) {
            callbackError = opts.error;
        }
        if (opts.loaded) {
            callbackLoaded = opts.loaded;
        }
        if (opts.threads) {
            maxThreads = opts.threads;
        }
        if (opts.debug) {
            debugging = opts.debug;
        }
        if (opts.fresh) {
            loadFresh = opts.fresh;
        }
    }

    /**
     * Initialisation, loads the options, and begins the file load loop.
     * @private
     */
    function init() {
        loadOptions(options);
        fileCount = files.length;
        try {
            if (hasStorage && localStorage.getItem("cache")) {
                storedCache = JSON.parse(localStorage.getItem("cache"));
            }
        } catch (e) {
            localStorage.removeItem("cache");
        }
        loadFiles();
    }

    /**
     * Gets the information for the file with the path.
     * @private
     * @param path the file path to look for
     * @return an object containing the file data, whether or not is cached, and its callback (if available)
     */
    function getFileInfo(path) {
        for (var i = 0; i < loadedFiles.length; i++) {
            if (loadedFiles[i].path == path) {
                return loadedFiles[i];
            }
        }
        return null;
    }

    /**
     * Gets the file in the loaded files cache array.
     * @param path the file path to look for.
     * @return the file data as a string, or null if not found.
     */
    function getFile(path) {
        var file = getFileInfo(path);
        return file ? getFileInfo(path).data : null;
    }

    /**
     * Gets the file from the local storage cache array.
     * @private
     * @param path the path of the file to get
     * @return an object containing the data of the file, or null if it isn't found
     */
    function fromCache(path) {
        if (!storedCache) {
            return;
        }
        for (var i = 0; i < storedCache.objects.length; i++) {
            if (storedCache.objects[i].path === path) {
                return storedCache.objects[i];
            }
        }
        return null;
    }

    /**
     * Runs the scripts, one by one, and then call any relevant callbacks.
     * @private
     */
    function runScripts() {
        for (var i = 0; i < loadedFiles.length; i++) {
            execute(loadedFiles[i]);
        }
        if (callbackSuccess) {
            callbackSuccess.call(this);
        }
    }

    /**
     * A simple check to see if all the files are loaded yet. If it is, it will kick
     * off running the scripts and then storing them in local storage.
     * @private
     */
    function checkCompleted() {
        if (downloadedCount !== fileCount) {
            return;
        }
        runScripts();
        store();
    }

    /**
     * Injects a JS file into the page.
     * @private
     * @param loaded the loaded data object.
     */
    function execute(loaded) {
        if (loaded.path.indexOf(".js") === -1) {
            return;
        }
        var script = document.createElement("script");
        script.type = "text/javascript";
        script.text = loaded.data;
        document.body.appendChild(script);
    }

    /**
     * Stores the downloaded files, and existing cached files, array into local storage,
     * but only if local storage is present.
     * @private
     */
    function store() {
        if (!hasStorage) {
            return;
        }
        var objects = { objects: loadedFiles };
        // remove callbacks
        for (var i = 0; i < objects.objects.length; i++) {
            delete objects.objects[i].callback;
        }
        try {
            localStorage.cache = JSON.stringify(objects);
        } catch (e) {
            debug("Couldn't cache objects this time");
        }
    }

    /**
     * Reloads the file from the cache, calling any callbacks as if
     * it has downloaded via the normal method.
     * @private
     * @param loadedData the object that contains the cached data
     */
    function initiateFileFromCache(loadedData) {
        loadedData.cached = true;

        var item = getFileInfo(loadedData.path);
        item.data = loadedData.data;
        callback = item.callback;

        debug("from cache", loadedData.path);
        downloadedCount++;
        if (callback) {
            callback.call(this, path, data);
        }
        if (callbackLoaded) {
            callbackLoaded.call(this, downloadedCount, fileCount, loadedData.path, loadedData.data);
        }
        checkCompleted();
    }

    /**
     * Processes an AJAX response after a downloading a file. Adding it to the loaded files array,
     * kicking off any callbacks, and loading any new files in the queue.
     * @private
     * @param path the file path that loaded.
     * @param {XMLHttpRequest} request the XMLHttpRequest object with the response.
     */
    function processResponse(path, request) {
        var item = getFileInfo(path);
        item.data = request.responseText;

        downloadedCount++;
        threads--;
        if (item.callback) {
            item.callback.call(this, path);
        }
        if (callbackLoaded) {
            callbackLoaded.call(this, downloadedCount, fileCount, path);
        }
        checkCompleted();
        getNextQueue();
    }

    /**
     * If a file has failed to load (i.e. 404 or whatever), then kill the entire process.
     * @private
     * @param {XMLHTTPRequest} request the XMLHttpRequest object with the response.
     * @param path the file path that has failed.
     */
    function processFailure(request, path) {
        debug("FAILED TO LOAD A FILE", path);
        if (callbackError) {
            callbackError.call(this);
        }
        hasFailed = true;
    }

    /**
     * Create a new XMLHttpRequest object.
     * @private
     * @return a fresh XMLHttpRequest object.
     */
    function getRequest() {
        return window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
    }

    /**
     * Adds the path into the queue.
     * @private
     * @param path the file path to load next.
     */
    function addToNextQueue(path) {
        nextQueue.push(path);
    }

    /**
     * Gets the next file in the next queue, and begins the download.
     * @private
     */
    function getNextQueue() {
        if (nextQueue.length > 0) {
            var item = nextQueue.pop();
            downloadFile(item);
        }
    }

    /**
     * Begins downloading the file in the path, if there is a free slot. If there isn't, then
     * the file is added to the queue to be processed later.
     * @private
     * @param path the file path to download.
     */
    function downloadFile(path) {
        if (threads >= maxThreads) {
            // wait until there is room left in the queue
            addToNextQueue(path);
            return;
        }
        // if we have failed, don't bother
        if (hasFailed) {
            return;
        }

        // get the file from the cache, and return if already present
        var precache = fromCache(path);
        if (precache) {
            initiateFileFromCache(precache);
            return;
        }

        threads++;

        var request = getRequest();
        // handle state loading
        request.onreadystatechange = function () {
            // if we have failed, don't bother
            if (hasFailed) {
                return;
            }
            if (request.readyState == 4 && request.status == 200) {
                processResponse(path, request);
            }else if (request.readyState == 4 && request.status > 400 && request.status < 600) {
                processFailure(request, path);
            }
        };
        request.open("GET", path, true);
        request.send(null);
    }

    /**
     * Output to the console, if the console exists. This function accepts any number of arguments.
     * @private
     */
    function debug() {
        if (debugging && console) {
            console.log.apply(console, arguments);
        }
    }

    init();

    return {
        "getFile": getFile
    };

};