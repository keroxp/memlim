type MemlimCacheType = string | ArrayBuffer;
export class Memlim<T extends MemlimCacheType> {
    data: { [key: string]: { key: string, data: T, size: number, lastAccessedAt: Date, createdAt: Date } } = {}
    freeSize: number;
    timers = {}
    constructor(
        readonly size: number,
        readonly opts: { overwrite: "latestAccess" | "eldestAccess" | "latest" | "eldest" | "minSize" | "maxSize" | "clear" } = {
            overwrite: "eldestAccess"
        }) {
        this.freeSize = size;
    }
    put(key: string, data: T, ttlMsec?: number) {
        let size = 0;
        if (typeof data === "string") {
            const { length } = data;            
            size = data.length * 2;
        } else if (data instanceof ArrayBuffer) {
            size = data.byteLength;
        } else {
            throw new Error(`data is not string or ArrayBuffer: ${data}`);
        }
        if (this.size < this.freeSize + size) {
            this.ensureSize(size);
        }
        const now = new Date;
        this.data[key] = {
            key,
            data,
            size,
            lastAccessedAt: now,
            createdAt: now
        }
        this.freeSize -= size;
        this.clearTimer(key);
        if (ttlMsec > 0) {
            this.timers[key] = setTimeout(() => {
                this.delete(key);
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
        const { data, size } = this.data[key];
        delete this.data[key]
        this.freeSize += size;
        this.clearTimer(key);
    }
    private clearTimer(key) {
        if (this.timers[key]) {
            clearTimeout(this.timers[key])
            delete this.timers[key];
        }
    }
    clear() {
        Object.values(this.timers).forEach(clearTimeout);        
        this.freeSize = this.size;
        this.timers = {}
        this.data = {}
    }
    private ensureSize(size) {
        let list = []
        if (this.opts.overwrite === "latestAccess") {
            list = Object.values(this.data).sort((a, b) => a.lastAccessedAt.getTime() - b.lastAccessedAt.getTime());
        } else if (this.opts.overwrite === "eldestAccess") {
            list = Object.values(this.data).sort((a, b) => b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime());
        } else if (this.opts.overwrite === "latest") {
            list = Object.values(this.data).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        } else if (this.opts.overwrite === "eldest") {
            list = Object.values(this.data).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        } else if (this.opts.overwrite === "minSize") {
            list = Object.values(this.data).sort((a, b) => a.size - b.size);
        } else if (this.opts.overwrite === "maxSize") {
            list = Object.values(this.data).sort((a, b) => b.size - a.size);
        } else if (this.opts.overwrite === "clear") { 
            this.clear();
        } else {
            throw new Error("size over.");
        }
        while (this.size < this.freeSize + size) {
            const { key } = list.pop();
            this.delete(key);
        }
    }
}