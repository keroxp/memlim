"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var index_1 = require("../index");
describe("test", function () {
    test("put should store data and decrease freeSize", function () {
        var memlim = new index_1.Memlim(10);
        expect(memlim.size).toBe(10);
        memlim.put("a", "ほげほげ");
        expect(memlim.get("a")).toBe("ほげほげ");
        expect(memlim.freeSize).toBe(2);
    });
    test("delete should delete data and increase freeSize", function () {
        var memlim = new index_1.Memlim(16);
        memlim.put("a", "ほげほげ");
        memlim.put("b", "ふがふが");
        expect(memlim.freeSize).toBe(0);
        memlim.delete("a");
        expect(memlim.freeSize).toBe(8);
    });
});
