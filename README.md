# memlim
![npm](https://img.shields.io/npm/v/memlim.svg?style=flat-square)
![CircleCI](https://img.shields.io/circleci/project/github/keroxp/memlim.svg?style=flat-square)
![Codecov](https://img.shields.io/codecov/c/github/keroxp/memlim.svg?style=flat-square)

memlim is a tiny in-memory cache library that can be used on limited size of memory.  

## Usage

```js

import {Memlim} from "memlim"

const memlim = new Memlim(1024 * 1000 * 1000 * 10); // 10MB cache at the most

memlim.put("a", "aaa"); // put cache with no ttl
memlim.put("b", "bbb", 1000); // with ttl (msec)
memlim.put("bindata", new ArrayBuffer(100)); // binary data

memlim.get("a"); // get data;
memlim.access("a"); // get data and update the last accessed date.

memlim.delete("a"); // delete

memlim.freeSize; // total free size
memlim.usedSize; // total used size 
memlim.dataCount; // total data count

memlim.clear(); // clear all data
```

## Operations Order

### put(key: string, data: string | ArrayBuffer, ttlMsec:number = 0) 

**Order: O(logN)** 
- *O(1) when overwrite: undefined*  

### get(key: string)
**Order: O(1)**  

### access(key: string)
**Order: O(2logN)**
- *O(1) when overwrite: undefined*    

### delete(key: string)
**Order: O(logN)**
- *O(1): when overwrite: undefined*  

### clear()
**Order: O(1)**


## Overwrite Policies

Memlim will try to reuse space for new data when total used size exceeded the limitation.  
By default, memlim deletes data which was accessed (by `put, access`) on the oldest date.  

This policy can be changed by passing the policy value to constructor.

```js
const overwrite = "___"; // set overwrite policy
const memlim = new Memlim(100, {overwrite})
```

#### "oldestAccess"

`default` policy. Try to delete entries that was accessed on the oldest date.

#### "oldest"

Try to delete entries that was put on the oldest date. 

#### "minSize"

Try to delete entries that has the minimum size in all data.

#### "maxSize"

Try to delete entries that has the maximum size in all data.

#### "clear"

Clear all entries.

#### undefined

Throw Error.

#### custom hash function

You can pass arbitrary hash function as `overwrite`.  
When hash function was given, memlim will keep entries sorted on insertion and deletion by this function's hashcode.  
Memlim will delete entries that have **minimum** hashcode value.

```js
const memlim = new Memlim(12, {
    overwrite: a => parseInt(a.data)
});
memlim.put("a", "11");
memlim.put("b", "22");
memlim.put("c", "01");
// will delete c("01")
memlim.put("d", "33");

```
entry's type schema is as below:
```typescript
type MemlimCacheType = string | ArrayBuffer;
export type MemlimEntry<T extends MemlimCacheType> = {
    key: string,
    data: T,
    size: number,
    lastAccessedAt: Date,
    createdAt: Date
}
```

## About `size`

memlim only limits cache's `content` size.  This means that `key` and associated JS object's sizes are not measured and not included in memlim's size. Be careful to determine size to use for caching.   

## LICENSE

MIT