"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var index_1 = require("../index");
var sinon = require("sinon");
describe("memlim", function () {
    describe("basic", function () {
        test("put() should store data and decrease freeSize", function () {
            var memlim = new index_1.Memlim(10);
            expect(memlim.size).toBe(10);
            memlim.put("a", "ほげほげ");
            expect(memlim.get("a")).toBe("ほげほげ");
            expect(memlim.freeSize).toBe(2);
        });
        test("delete() should delete data and increase freeSize", function () {
            var memlim = new index_1.Memlim(16);
            memlim.put("a", "ほげほげ");
            memlim.put("b", "ふがふが");
            expect(memlim.freeSize).toBe(0);
            memlim.delete("a");
            expect(memlim.freeSize).toBe(8);
        });
        test("delete() should return undefined if data doesn't exist", function () {
            var memlim = new index_1.Memlim(10);
            expect(memlim.delete("a")).toBeUndefined();
        });
        test("put() should throw if data is bigger than freeSize and not set overwrite option", function () {
            var memlim = new index_1.Memlim(10, { overwrite: undefined });
            memlim.put("a", "aaaaa");
            expect(function () { return memlim.put("b", "bbbbb"); }).toThrow();
        });
        test("put() should throw if data which has bigger size than total size", function () {
            var memlim = new index_1.Memlim(10);
            expect(function () { return memlim.put("a", "aaaaaa"); }).toThrow();
        });
        test("clear() should clear all data", function () {
            var memlim = new index_1.Memlim(12);
            memlim.put("a", "aa");
            memlim.put("b", "bb");
            memlim.put("c", "cc");
            expect(memlim.dataCount).toBe(3);
            memlim.clear();
            expect(memlim.dataCount).toBe(0);
            expect(memlim.freeSize).toBe(12);
        });
        describe("put() should throw ", function () {
            ["[]", "{}", "new Date", "null", "undefined", "0", "new Uint16Array(10)"].forEach(function (i) {
                test("if got " + i, function () {
                    var memlim = new index_1.Memlim(10);
                    expect(function () { return memlim.put("a", eval(i)); }).toThrow();
                });
            });
        });
        test("put() should delete arbitrary data if custom compare function given to overwrite option", function () {
            var memlim = new index_1.Memlim(6, { overwrite: function (a, b) { return a.data.localeCompare(b.data); } });
            memlim.put("a", "1");
            memlim.put("b", "0");
            memlim.put("c", "2");
            memlim.put("d", "33");
            expect(memlim.dataCount).toBe(2);
            expect(memlim.freeSize).toBe(0);
            expect(memlim.get("a")).toBeUndefined();
            expect(memlim.get("c")).toBeUndefined();
        });
    });
    describe("array buffer", function () {
        test("put()", function () {
            var memlim = new index_1.Memlim(10);
            var buf = new ArrayBuffer(9);
            memlim.put("a", buf);
            expect(memlim.freeSize).toBe(1);
            expect(memlim.dataCount).toBe(1);
        });
    });
    describe("overwrite options", function () {
        var fakeTimer;
        beforeEach(function () {
            fakeTimer = sinon.useFakeTimers();
        });
        test('"oldestAccess" should delete entry which has the oldest access date', function () {
            var memlim = new index_1.Memlim(10, { overwrite: "oldestAccess" });
            memlim.put("a", "aa");
            fakeTimer.tick(1000);
            memlim.put("b", "bb");
            fakeTimer.tick(1000);
            memlim.get("a");
            fakeTimer.tick(1000);
            memlim.put("c", "cc");
            expect(memlim.dataCount).toBe(2);
            expect(memlim.usedSize).toBe(8);
            expect(memlim.freeSize).toBe(2);
            expect(memlim.get("b")).toBeUndefined();
        });
        test('"oldest" should delete entry which was created at the oldest date', function () {
            var memlim = new index_1.Memlim(10, { overwrite: "oldest" });
            memlim.put("a", "aa");
            fakeTimer.tick(1000);
            memlim.put("b", "bb");
            fakeTimer.tick(1000);
            memlim.put("c", "cc");
            fakeTimer.tick(1000);
            expect(memlim.dataCount).toBe(2);
            expect(memlim.usedSize).toBe(8);
            expect(memlim.freeSize).toBe(2);
            expect(memlim.get("a")).toBeUndefined();
        });
        test('"minSize" should delete entry which has the minimum size', function () {
            var memlim = new index_1.Memlim(12, { overwrite: "minSize" });
            memlim.put("a", "a");
            memlim.put("b", "bb");
            memlim.put("c", "ccc");
            memlim.put("d", "ddd");
            expect(memlim.dataCount).toBe(2);
            expect(memlim.freeSize).toBe(0);
            expect(memlim.get("a")).toBeUndefined();
            expect(memlim.get("b")).toBeUndefined();
        });
        test('"maxSize" should delete entry which has the maximum size', function () {
            var memlim = new index_1.Memlim(12, { overwrite: "maxSize" });
            memlim.put("a", "a");
            memlim.put("b", "bb");
            memlim.put("c", "ccc");
            memlim.put("d", "ddddd");
            expect(memlim.dataCount).toBe(2);
            expect(memlim.freeSize).toBe(0);
            expect(memlim.get("b")).toBeUndefined();
            expect(memlim.get("c")).toBeUndefined();
        });
        afterEach(function () {
            fakeTimer.restore();
        });
    });
    describe("timer", function () {
        var fakeTimer;
        beforeEach(function () {
            fakeTimer = sinon.useFakeTimers();
        });
        test("data should be expired after ttl", function () {
            var memlim = new index_1.Memlim(100);
            memlim.put("a", "hoge", 1000 * 60);
            fakeTimer.tick(1000 * 61);
            expect(memlim.freeSize).toBe(100);
            expect(memlim.get("a")).toBeUndefined();
        });
        test("data should be stored after ttl if updated", function () {
            var memlim = new index_1.Memlim(100);
            memlim.put("a", "hoge", 1000 * 60);
            fakeTimer.tick(1000 * 30);
            memlim.put("a", "fuga", 1000 * 60);
            fakeTimer.tick(1000 * 31);
            expect(memlim.freeSize).toBe(92);
            expect(memlim.get("a")).toBe("fuga");
            fakeTimer.tick(1000 * 30);
            expect(memlim.freeSize).toBe(100);
            expect(memlim.get("a")).toBeUndefined();
        });
        test("clear()'s clearTimeout should not affect data added after clearing", function () {
            var memlim = new index_1.Memlim(12);
            memlim.put("a", "aa", 100);
            memlim.put("b", "bb", 200);
            memlim.clear();
            fakeTimer.tick(200);
            memlim.put("a", "aa", 100);
            memlim.put("b", "bb", 200);
            expect(memlim.get("a")).toBe("aa");
            expect(memlim.get("b")).toBe("bb");
            fakeTimer.tick(101);
            expect(memlim.get("a")).toBeUndefined();
            fakeTimer.tick(101);
            expect(memlim.get("b")).toBeUndefined();
        });
        afterEach(function () {
            fakeTimer.restore();
        });
    });
});