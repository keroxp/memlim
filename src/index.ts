type MemlimCacheType = string | ArrayBuffer;
export type MemlimOverwriteType = "oldestAccess" | "oldest" | "minSize" | "maxSize" | "clear";
type CompareFunction<T> = (a: T, b: T) => number;
const kOverwriteCompareFuncs: {[key: string]: CompareFunction<MemlimEntry<any>>} = {
    oldestAccess: (a, b) => a.lastAccessedAt.getTime() - b.lastAccessedAt.getTime(),
    oldest: (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    minSize: (a, b) => a.size - b.size,
    maxSize: (a, b) => b.size - a.size
};
export type MemlimEntry<T extends MemlimCacheType> = {
    key: string,
    data: T,
    size: number,
    lastAccessedAt: Date,
    createdAt: Date
}

let values = Object.values;

export class Memlim<T extends MemlimCacheType> {
    private data: { [key: string]: MemlimEntry<T>} = {};
    private timers = {};
    private _freeSize: number;
    get freeSize() {
        return this._freeSize;
    }
    get usedSize() {
        return this.size - this.freeSize;
    }
    get dataCount() {
        return values(this.data).length;
    }
    private generation = 0;
    constructor(
        readonly size: number = 10000000,
        readonly opts: { overwrite: MemlimOverwriteType | CompareFunction<MemlimEntry<T>> } = {
            overwrite: "oldestAccess"
        }) {
            if (typeof size !== "number" || size !== size || size <= 0) {
                throw new Error(`invalid type for "size": ${size}`)
            }
        this._freeSize = size;
    }
    put(key: string, data: T, ttlMsec: number = -1) {
        let size = 0;
        if (typeof data === "string") {
            size = data.length * 2;
        } else if (data instanceof ArrayBuffer) {
            size = data.byteLength;
        } else {
            throw new Error(`data is not string or ArrayBuffer: ${data}`);
        }
        if (this.freeSize < size) {
            this.ensureSize(size);
        }
        const now = new Date;
        let createdAt = now;
        let prevSize = 0;
        const prevData = this.data[key];
        if (prevData !== undefined) {
            prevSize = prevData.size;
            createdAt = prevData.createdAt;
        }
        this.data[key] = {
            key,
            data,
            size,
            lastAccessedAt: now,
            createdAt
        };
        this._freeSize -= size - prevSize;
        this.clearTimer(key);
        if (ttlMsec > 0) {
            const {generation} = this;
            this.timers[key] = setTimeout(() => {
                this.expire(key, generation);
            }, ttlMsec)
        }
    }
    get(key: string): T {
        if (this.data[key] === undefined) return;
        this.data[key].lastAccessedAt = new Date;
        return this.data[key].data;
    }
    delete(key: string) {
        if (this.data[key] === undefined) return;
        const { size } = this.data[key];
        delete this.data[key];
        this._freeSize += size;
        this.clearTimer(key);
    }
    private clearTimer(key) {
        if (this.timers[key]) {
            clearTimeout(this.timers[key]);
            delete this.timers[key];
        }
    }
    clear() {
        this.generation += 1;
        this._freeSize = this.size;
        this.timers = {};
        this.data = {}
    }
    private expire(key, gen) {
        if (this.generation === gen) {
            this.delete(key);
        }
    }
    private ensureSize(size) {
        if (this.size < size) {
            throw new Error(`size to be ensured exceeds cache size: ${size} > ${this.size}`);
        }
        let compareFunc;
        if (this.opts.overwrite === "clear") {
            this.clear();
            return;
        } else if (typeof this.opts.overwrite === "string") {
            compareFunc = kOverwriteCompareFuncs[this.opts.overwrite];
        } else if (typeof this.opts.overwrite === "function") {
            compareFunc = this.opts.overwrite;
        }
        if (!compareFunc) {
            throw new Error(`there are no extra space for data: size=${size}`);
        }
        const list = values(this.data).sort(compareFunc);
        while (list.length > 0 && this.freeSize < size) {
            const { key } = list.shift();
            this.delete(key);
        }
    }
}