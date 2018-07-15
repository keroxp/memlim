import {Memlim} from "../index"
import * as sinon from "sinon"

describe("memlim", () => {
    describe("basic", () => {
        describe("constructor", () => {
            test("should set 10MB for size if size was not given", () => {
                const memlim =  new Memlim;
                expect(memlim.size).toBe(1000*1000*10);
            })
            test("should throw Error if size is not number", () => {
                expect(() => new Memlim(null)).toThrow();
                expect(() => new Memlim(NaN)).toThrow();
                expect(() => new Memlim(-100));
            });
        });
        test("put() should store data and decrease freeSize", () => {
            const memlim = new Memlim(10);
            expect(memlim.size).toBe(10);
            memlim.put("a", "ほげほげ");
            expect(memlim.get("a")).toBe("ほげほげ");
            expect(memlim.freeSize).toBe(2);
        });
        test("delete() should delete data and increase freeSize", () => {
            const memlim = new Memlim(16);
            memlim.put("a", "ほげほげ");
            memlim.put("b", "ふがふが");
            expect(memlim.freeSize).toBe(0);
            memlim.delete("a");
            expect(memlim.freeSize).toBe(8)
        });
        test("delete() should return undefined if data doesn't exist", () => {
           const memlim = new Memlim(10);
           expect(memlim.delete("a")).toBeUndefined();
        });
        test("put() should throw if data is bigger than freeSize and not set overwrite option", () => {
            const memlim = new Memlim(10, {overwrite: undefined});
            memlim.put("a", "aaaaa");
            expect(() => memlim.put("b", "bbbbb")).toThrow();
        });
        test("put() should throw if data which has bigger size than total size", () => {
           const memlim = new Memlim(10);
           expect(() => memlim.put("a", "aaaaaa")).toThrow();
        });
        test("clear() should clear all data", () => {
           const memlim = new Memlim(12);
           memlim.put("a", "aa");
           memlim.put("b", "bb");
           memlim.put("c", "cc");
           expect(memlim.dataCount).toBe(3);
           memlim.clear();
           expect(memlim.dataCount).toBe(0);
           expect(memlim.freeSize).toBe(12);
        });
        describe("put() should throw ", () => {
            ["[]", "{}", "new Date", "null", "undefined", "0", "new Uint16Array(10)"].forEach(i => {
                test(`if got ${i}`, () => {
                    const memlim = new Memlim(10);
                    expect(() => memlim.put("a", eval(i) as string)).toThrow();
                });
            });
        });
        test("put() should delete arbitrary data if custom compare function given to overwrite option", () => {
            const memlim = new Memlim<string>(6, {overwrite: (a,b) => a.data.localeCompare(b.data)});
            memlim.put("a", "1");
            memlim.put("b", "0");
            memlim.put("c", "2");
            memlim.put("d", "33");
            expect(memlim.dataCount).toBe(2);
            expect(memlim.freeSize).toBe(0);
            expect(memlim.get("a")).toBeUndefined();
            expect(memlim.get("b")).toBeUndefined();
        });
        test("put should clear data if overwrite is 'clear' and size to be added is bigger than freeSize", () => {
           const memlim = new Memlim(10, {overwrite: "clear"});
           memlim.put("a", "aaaaa");
           memlim.put("b", "b");
           expect(memlim.freeSize).toBe(8);
           expect(memlim.dataCount).toBe(1);
           expect(memlim.get("b")).toBe("b");
        });
    });
    describe("array buffer", () => {
        test("put()", () =>{
           const memlim = new Memlim(10);
           const buf = new ArrayBuffer(9);
           memlim.put("a", buf);
           expect(memlim.freeSize).toBe(1);
           expect(memlim.dataCount).toBe(1);
        });
    });
    describe("overwrite options", () => {
        let fakeTimer;
        beforeEach(() => {
            fakeTimer = sinon.useFakeTimers();
        });
        test('"oldestAccess" should delete entry which has the oldest access date', () => {
            const memlim = new Memlim(10, {overwrite: "oldestAccess"});
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
        test('"oldest" should delete entry which was created at the oldest date', () => {
            const memlim = new Memlim(10, {overwrite: "oldest"});
            memlim.put("a", "aa");
            fakeTimer.tick(1000);
            memlim.put("b", "bb");
            fakeTimer.tick(1000);
            memlim.put("c", "cc");
            fakeTimer.tick(1000);
            expect(memlim.dataCount).toBe(2);
            expect(memlim.usedSize).toBe(8);
            expect(memlim.freeSize).toBe(2);
            expect(memlim.get("a")).toBeUndefined()
        });
        test('"minSize" should delete entry which has the minimum size', () => {
            const memlim = new Memlim(12, {overwrite: "minSize"});
            memlim.put("a", "a");
            memlim.put("b", "bb");
            memlim.put("c", "ccc");
            memlim.put("d", "ddd");
            expect(memlim.dataCount).toBe(2);
            expect(memlim.freeSize).toBe(0);
            expect(memlim.get("a")).toBeUndefined();
            expect(memlim.get("b")).toBeUndefined();
        });
        test('"maxSize" should delete entry which has the maximum size', () => {
            const memlim = new Memlim(12, {overwrite: "maxSize"});
            memlim.put("a", "a");
            memlim.put("b", "bb");
            memlim.put("c", "ccc");
            memlim.put("d", "ddddd");
            expect(memlim.dataCount).toBe(2);
            expect(memlim.freeSize).toBe(0);
            expect(memlim.get("b")).toBeUndefined();
            expect(memlim.get("c")).toBeUndefined();
        });
        afterEach(() => {
            fakeTimer.restore();
        })

    });
    describe("timer", () => {
        let fakeTimer;
        beforeEach(() => {
            fakeTimer = sinon.useFakeTimers();
        });
        test("data should be expired after ttl", () => {
            const memlim = new Memlim(100);
            memlim.put("a", "hoge", 1000 * 60);
            fakeTimer.tick(1000 * 61);
            expect(memlim.freeSize).toBe(100);
            expect(memlim.get("a")).toBeUndefined();
        });
        test("data should be stored after ttl if updated", () => {
            const memlim = new Memlim(100);
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
        test("clear()'s clearTimeout should not affect data added after clearing", () => {
            const memlim = new Memlim(12);
            memlim.put("a", "aa", 100);
            memlim.put("b", "bb", 200);
            memlim.clear();
            fakeTimer.tick(200);
            memlim.put("a", "aa",  100);
            memlim.put("b", "bb", 200);
            expect(memlim.get("a")).toBe("aa");
            expect(memlim.get("b")).toBe("bb");
            fakeTimer.tick(101);
            expect(memlim.get("a")).toBeUndefined();
            fakeTimer.tick(101);
            expect(memlim.get("b")).toBeUndefined();
        });
        afterEach(() => {
            fakeTimer.restore();
        })
    });
});