"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bintrees_1 = require("bintrees");
var kHashFuncs = {
    oldestAccess: function (a) { return a.lastAccessedAt.getTime(); },
    oldest: function (a) { return a.createdAt.getTime(); },
    minSize: function (a) { return a.size; },
    maxSize: function (a) { return -a.size; }
};
function memlimIndexCompareFunc(a, b) {
    if (a.value === b.value)
        return a.key.localeCompare(b.key);
    return a.value - b.value;
}
var Memlim = /** @class */ (function () {
    function Memlim(size, opts) {
        if (opts === void 0) { opts = {
            overwrite: "oldestAccess"
        }; }
        this.size = size;
        this.opts = opts;
        this.data = {};
        this.timers = {};
        this.generation = 0;
        this._dataCount = 0;
        this._freeSize = size;
        if (typeof opts.overwrite === "string" && kHashFuncs[opts.overwrite]) {
            this.hashFunc = kHashFuncs[opts.overwrite];
        }
        else if (typeof opts.overwrite === "function" && opts.overwrite.length === 1) {
            this.hashFunc = opts.overwrite;
        }
        if (this.hashFunc) {
            this.tree = new bintrees_1.RBTree(memlimIndexCompareFunc);
        }
    }
    Object.defineProperty(Memlim.prototype, "freeSize", {
        get: function () {
            return this._freeSize;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Memlim.prototype, "usedSize", {
        get: function () {
            return this.size - this.freeSize;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Memlim.prototype, "dataCount", {
        get: function () {
            return this._dataCount;
        },
        enumerable: true,
        configurable: true
    });
    Memlim.prototype.put = function (key, data, ttlMsec) {
        var _this = this;
        if (ttlMsec === void 0) { ttlMsec = -1; }
        var size = 0;
        if (typeof data === "string") {
            size = data.length * 2;
        }
        else if (data instanceof ArrayBuffer) {
            size = data.byteLength;
        }
        else {
            throw new Error("data is not string or ArrayBuffer: " + data);
        }
        if (this.freeSize < size) {
            this.ensureSize(size);
        }
        var now = new Date;
        var createdAt = now;
        var prevSize = 0;
        var prevData = this.data[key];
        if (prevData !== undefined) {
            prevSize = prevData.size;
            createdAt = prevData.createdAt;
            if (this.tree) {
                this.tree.remove({ key: key, value: this.hashFunc(prevData) });
            }
        }
        var newData = {
            key: key,
            data: data,
            size: size,
            lastAccessedAt: now,
            createdAt: createdAt
        };
        this.data[key] = newData;
        if (this.tree) {
            this.tree.insert({ key: key, value: this.hashFunc(newData) });
        }
        this._freeSize -= size - prevSize;
        if (!prevData) {
            this._dataCount += 1;
        }
        this.clearTimer(key);
        if (ttlMsec > 0) {
            var gen_1 = this.generation;
            this.timers[key] = setTimeout(function () {
                _this.expire(key, gen_1);
            }, ttlMsec);
        }
    };
    Memlim.prototype.get = function (key) {
        if (this.data[key] === undefined)
            return;
        return this.data[key].data;
    };
    Memlim.prototype.access = function (key) {
        if (this.data[key] === undefined)
            return;
        if (this.tree) {
            this.tree.remove({ key: key, value: this.hashFunc(this.data[key]) });
        }
        this.data[key].lastAccessedAt = new Date;
        if (this.tree) {
            this.tree.insert({ key: key, value: this.hashFunc(this.data[key]) });
        }
        return this.data[key].data;
    };
    Memlim.prototype.delete = function (key) {
        if (this.data[key] === undefined)
            return;
        var data = this.data[key];
        delete this.data[key];
        if (this.tree) {
            this.tree.remove({ key: key, value: this.hashFunc(data) });
        }
        this._freeSize += data.size;
        this._dataCount -= 1;
        this.clearTimer(key);
    };
    Memlim.prototype.expire = function (key, gen) {
        if (this.generation === gen) {
            this.delete(key);
        }
    };
    Memlim.prototype.clearTimer = function (key) {
        if (this.timers[key]) {
            clearTimeout(this.timers[key]);
            delete this.timers[key];
        }
    };
    Memlim.prototype.clear = function () {
        this.generation += 1;
        this._freeSize = this.size;
        this._dataCount = 0;
        if (this.tree) {
            this.tree.clear();
        }
        this.timers = {};
        this.data = {};
    };
    Memlim.prototype.ensureSize = function (size) {
        if (this.size < size) {
            throw new Error("size to be ensured exceeds cache size: " + size + " > " + this.size);
        }
        if (!this.tree) {
            if (this.opts.overwrite === "clear") {
                this.clear();
                return;
            }
            else {
                throw new Error("there are no space for size: " + size + ", usedSize: " + this.usedSize);
            }
        }
        while (this.tree.size > 0 && this.freeSize < size) {
            var key = this.tree.min().key;
            this.delete(key);
        }
    };
    return Memlim;
}());
exports.Memlim = Memlim;
