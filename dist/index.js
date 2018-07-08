"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var kOverwriteCompareFuncs = {
    eldestAccess: function (a, b) { return b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime(); },
    eldest: function (a, b) { return b.createdAt.getTime() - a.createdAt.getTime(); },
    minSize: function (a, b) { return b.size - a.size; },
    maxSize: function (a, b) { return a.size - b.size; }
};
var Memlim = /** @class */ (function () {
    function Memlim(size, opts) {
        if (opts === void 0) { opts = {
            overwrite: "eldestAccess"
        }; }
        this.size = size;
        this.opts = opts;
        this.data = {};
        this.timers = {};
        this._freeSize = size;
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
            return Object.values(this.data).length;
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
        }
        this.data[key] = {
            key: key,
            data: data,
            size: size,
            lastAccessedAt: now,
            createdAt: createdAt
        };
        this._freeSize -= size - prevSize;
        this.clearTimer(key);
        if (ttlMsec > 0) {
            this.timers[key] = setTimeout(function () {
                _this.delete(key);
            }, ttlMsec);
        }
    };
    Memlim.prototype.get = function (key) {
        if (this.data[key] === undefined)
            return;
        this.data[key].lastAccessedAt = new Date;
        return this.data[key].data;
    };
    Memlim.prototype.delete = function (key) {
        if (this.data[key] === undefined)
            return;
        var size = this.data[key].size;
        delete this.data[key];
        this._freeSize += size;
        this.clearTimer(key);
    };
    Memlim.prototype.clearTimer = function (key) {
        if (this.timers[key]) {
            clearTimeout(this.timers[key]);
            delete this.timers[key];
        }
    };
    Memlim.prototype.clear = function () {
        Object.values(this.timers).forEach(clearTimeout);
        this._freeSize = this.size;
        this.timers = {};
        this.data = {};
    };
    Memlim.prototype.ensureSize = function (size) {
        if (this.size < size) {
            throw new Error("size to be ensured exceeds cache size: " + size + " > " + this.size);
        }
        var compareFunc;
        if (typeof this.opts.overwrite === "string") {
            compareFunc = kOverwriteCompareFuncs[this.opts.overwrite];
        }
        else if (typeof this.opts.overwrite === "function") {
            compareFunc = this.opts.overwrite;
        }
        if (!compareFunc) {
            throw new Error("there are no extra space for data: size=" + size);
        }
        var list = Object.values(this.data).sort(compareFunc);
        while (list.length > 0 && this.freeSize < size) {
            var key = list.pop().key;
            this.delete(key);
        }
    };
    return Memlim;
}());
exports.Memlim = Memlim;
