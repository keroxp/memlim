declare type MemlimCacheType = string | ArrayBuffer;
export declare type MemlimOverwriteType = "oldestAccess" | "oldest" | "minSize" | "maxSize" | "clear";
declare type CompareFunction<T> = (a: T, b: T) => number;
export declare type MemlimEntry<T extends MemlimCacheType> = {
    key: string;
    data: T;
    size: number;
    lastAccessedAt: Date;
    createdAt: Date;
};
export declare class Memlim<T extends MemlimCacheType> {
    readonly size: number;
    readonly opts: {
        overwrite: MemlimOverwriteType | CompareFunction<MemlimEntry<T>>;
    };
    private data;
    private timers;
    private _freeSize;
    readonly freeSize: number;
    readonly usedSize: number;
    readonly dataCount: number;
    private generation;
    constructor(size: number, opts?: {
        overwrite: MemlimOverwriteType | CompareFunction<MemlimEntry<T>>;
    });
    put(key: string, data: T, ttlMsec?: number): void;
    get(key: string): T;
    delete(key: string): void;
    private clearTimer;
    clear(): void;
    private expire;
    private ensureSize;
}
export {};
