import {RBTree} from "bintrees";

type MemlimCacheType = string | ArrayBuffer;
export type MemlimOverwriteType = "oldestAccess" | "oldest" | "minSize" | "maxSize" | "clear";

const kHashFuncs: { [key: string]: (a: MemlimEntry<any>) => number } = {
    oldestAccess: (a) => a.lastAccessedAt.getTime(),
    oldest: (a) => a.createdAt.getTime(),
    minSize: (a) => a.size,
    maxSize: (a) => -a.size
};
export type MemlimEntry<T extends MemlimCacheType> = {
    key: string,
    data: T,
    size: number,
    lastAccessedAt: Date,
    createdAt: Date,
}

type MemlimTreeIndex = {
    key: string
    value: number
}

function memlimIndexCompareFunc(a: MemlimTreeIndex, b: MemlimTreeIndex) {
    if (a.value === b.value) return a.key.localeCompare(b.key);
    return a.value - b.value;
}

export type MemlimHashFunc<T extends MemlimCacheType> = (a: MemlimEntry<T>) => number;

export class Memlim<T extends MemlimCacheType> {
    private data: { [key: string]: MemlimEntry<T> } = {};
    private readonly tree: RBTree<MemlimTreeIndex>;
    private timers = {};
    private generation = 0;
    private _freeSize: number;
    get freeSize() {
        return this._freeSize;
    }

    get usedSize() {
        return this.size - this.freeSize;
    }

    private _dataCount = 0;
    get dataCount() {
        return this._dataCount;
    }

    private readonly hashFunc: MemlimHashFunc<T>;

    constructor(
        readonly size: number,
        readonly opts: {
            overwrite: MemlimOverwriteType | MemlimHashFunc<T>
        } = {
            overwrite: "oldestAccess"
        }) {
        this._freeSize = size;
        if (typeof opts.overwrite === "string" && kHashFuncs[opts.overwrite]) {
            this.hashFunc = kHashFuncs[opts.overwrite];
        } else if (typeof opts.overwrite === "function" && opts.overwrite.length === 1) {
            this.hashFunc = opts.overwrite;
        }
        if (this.hashFunc) {
            this.tree = new RBTree<MemlimTreeIndex>(memlimIndexCompareFunc);
        }
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
            if (this.tree) {
                this.tree.remove({key, value: this.hashFunc(prevData)});
            }
        }
        const newData = {
            key,
            data,
            size,
            lastAccessedAt: now,
            createdAt
        };
        this.data[key] = newData;
        if (this.tree) {
            this.tree.insert({key, value: this.hashFunc(newData)});
        }
        this._freeSize -= size - prevSize;
        if (!prevData) {
            this._dataCount += 1;
        }
        this.clearTimer(key);
        if (ttlMsec > 0) {
            const gen = this.generation;
            this.timers[key] = setTimeout(() => {
                this.expire(key, gen);
            }, ttlMsec)
        }
    }

    get(key: string): T {
        if (this.data[key] === undefined) return;
        return this.data[key].data;
    }

    access(key: string): T {
        if (this.data[key] === undefined) return;
        if (this.tree) {
            this.tree.remove({key, value: this.hashFunc(this.data[key])})
        }
        this.data[key].lastAccessedAt = new Date;
        if (this.tree) {
            this.tree.insert({key, value: this.hashFunc(this.data[key])});
        }
        return this.data[key].data;
    }

    delete(key: string) {
        if (this.data[key] === undefined) return;
        const data = this.data[key];
        delete this.data[key];
        if (this.tree) {
            this.tree.remove({key, value: this.hashFunc(data)});
        }
        this._freeSize += data.size;
        this._dataCount -= 1;
        this.clearTimer(key);
    }

    private expire(key: string, gen: number) {
        if (this.generation === gen) {
            this.delete(key);
        }
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
        this._dataCount = 0;
        if (this.tree) {
            this.tree.clear();
        }
        this.timers = {};
        this.data = {}
    }

    private ensureSize(size) {
        if (this.size < size) {
            throw new Error(`size to be ensured exceeds cache size: ${size} > ${this.size}`);
        }
        if (!this.tree) {
            if (this.opts.overwrite === "clear") {
                this.clear();
                return;
            } else {
                throw new Error(`there are no space for size: ${size}, usedSize: ${this.usedSize}`);
            }
        }
        while (this.tree.size > 0 && this.freeSize < size) {
            const {key} = this.tree.min();
            this.delete(key);
        }
    }
}