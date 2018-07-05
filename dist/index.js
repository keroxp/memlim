"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Memlim = /** @class */ (function () {
    function Memlim(size, opts) {
        if (opts === void 0) { opts = {
            overwrite: "eldestAccess"
        }; }
        this.size = size;
        this.opts = opts;
        this.data = {};
        this.timers = {};
        this.freeSize = size;
    }
    Memlim.prototype.put = function (key, data, ttlMsec) {
        var _this = this;
        var size = 0;
        if (typeof data === "string") {
            var length_1 = data.length;
            size = data.length * 2;
        }
        else if (data instanceof ArrayBuffer) {
            size = data.byteLength;
        }
        else {
            throw new Error("data is not string or ArrayBuffer: " + data);
        }
        if (this.size < this.freeSize + size) {
            this.ensureSize(size);
        }
        var now = new Date;
        this.data[key] = {
            key: key,
            data: data,
            size: size,
            lastAccessedAt: now,
            createdAt: now
        };
        this.freeSize -= size;
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
        var _a = this.data[key], data = _a.data, size = _a.size;
        delete this.data[key];
        this.freeSize += size;
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
        this.freeSize = this.size;
        this.timers = {};
        this.data = {};
    };
    Memlim.prototype.ensureSize = function (size) {
        var list = [];
        if (this.opts.overwrite === "latestAccess") {
            list = Object.values(this.data).sort(function (a, b) { return a.lastAccessedAt.getTime() - b.lastAccessedAt.getTime(); });
        }
        else if (this.opts.overwrite === "eldestAccess") {
            list = Object.values(this.data).sort(function (a, b) { return b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime(); });
        }
        else if (this.opts.overwrite === "latest") {
            list = Object.values(this.data).sort(function (a, b) { return a.createdAt.getTime() - b.createdAt.getTime(); });
        }
        else if (this.opts.overwrite === "eldest") {
            list = Object.values(this.data).sort(function (a, b) { return b.createdAt.getTime() - a.createdAt.getTime(); });
        }
        else if (this.opts.overwrite === "minSize") {
            list = Object.values(this.data).sort(function (a, b) { return a.size - b.size; });
        }
        else if (this.opts.overwrite === "maxSize") {
            list = Object.values(this.data).sort(function (a, b) { return b.size - a.size; });
        }
        else if (this.opts.overwrite === "clear") {
            this.clear();
        }
        else {
            throw new Error("size over.");
        }
        while (this.size < this.freeSize + size) {
            var key = list.pop().key;
            this.delete(key);
        }
    };
    return Memlim;
}());
exports.Memlim = Memlim;
