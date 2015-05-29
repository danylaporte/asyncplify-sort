var Asyncplify = require('asyncplify');
var debug = require('debug')('asyncplify-sort:fileWriter');
var fs = require('fs');
var states = Asyncplify.states;
var temp = require('temp');

function FileWriter(options, on, source) {
    var self = this;
    
    this.comparer = options.comparer;
    this.count = 0;
    this.error = null;
    this.filenames = [];
    this.handleSaveCompleted = function (err) { self.saveCompleted(err); };
    this.items = [];
    this.on = on;
    this.pageSize = options.pageSize;
    this.saving = 0;
    this.source = null;
    this.sourceEnded = false;
    this.state = states.RUNNING;
    
    on.source = this;
    source._subscribe(this);
}

FileWriter.prototype = {
    callEmit: function () {
        var canEmit = this.sourceEnded
            && !this.saving
            && !this.error
            && this.state === states.RUNNING
            && (this.filenames.length || this.items.length);
        
        if (canEmit) {            
            var value = { filenames: this.filenames, items: this.items };
            
            this.filenames = [];
            this.items = [];
            
            debug('emit %d filenames and %d items', value.filenames.length, value.items.length);
            this.on.emit(value);
        }
    },
    callEnd: function () {
        if ((this.sourceEnded && !this.saving) || this.error) {
            
            if (!this.sourceEnded && this.state !== states.CLOSED)
                this.source.setState(states.CLOSED);
            
            if (this.state === states.RUNNING) {
                this.state = states.CLOSED;
                debug(this.error ? 'end with error ($s)' : 'end', this.error && this.error.toString());
                this.on.end(this.error);
            }
        }
    },
    cleanFiles: function () {
        var isAborted = this.state === states.CLOSED && !this.sourceEnded;
        
        if (!this.saving && (this.error || isAborted) && this.filenames.length) {
            debug('deleting %d files', this.filenames.length);
            
            for (var i = 0; i < this.filenames.length; i++) {
                fs.unlink(this.filenames[i]);
            }
            
            this.filenames.length = 0;
        }
    },
    emit: function (item) {
        if (this.items.length === this.pageSize) this.saveItems();
        this.count++;
        this.items.push(item);
    },
    end: function (err) {
        this.error = this.error || err;
        this.sourceEnded = true;
        
        if (err) debug('received an error from the stream');
        if (!this.error) debug('received %d items to sort', this.count);
        if (this.filenames.length) this.saveItems();
        this.update();
    },
    saveCompleted: function(err) {
        this.saving--;
        this.error = this.error || err;        
        this.update();
    },
    saveItems: function() {
        if (!this.error && this.items.length) {
            var filename = temp.path();
            
            this.items.sort(this.comparer);
            
            fs.writeFile(filename, JSON.stringify(this.items), this.handleSaveCompleted);
            
            this.filenames.push(filename);
            this.saving++;
            this.items.length = 0;
        }
    },
    setState: function (state) {
        if (this.state !== state && this.state !== states.CLOSED) {
            this.state = state;
            if (state !== states.PAUSED) this.update();
        }
    },
    update: function () {
        this.callEmit();
        this.callEnd();
        this.cleanFiles();
    }
};

module.exports = function (options) {
    return function (source) {
        return new Asyncplify(FileWriter, options, source);
    };
};