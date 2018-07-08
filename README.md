# memlim
![npm](https://img.shields.io/npm/v/memlim.svg?style=flat-square)
![CircleCI](https://img.shields.io/circleci/project/github/keroxp/memlim.svg?style=flat-square)
![Codecov](https://img.shields.io/codecov/c/github/keroxp/memlim.svg?style=flat-square)

memlim is a tiny in-memory cache library that can be used on limited size of memory.  

## Installation

```
$ npm install memlim
```

## Usage

```js

import {Memlim} from "memlim"

const memlim = new Memlim(1024 * 1000 * 1000 * 10); // 10MB cache at the most

memlim.put("a", "aaa"); // put cache with no ttl
memlim.put("b", "bbb", 1000); // with ttl (msec)
memlim.put("bindata", new ArrayBuffer(100)); // binary data

memlim.get("a"); // get data;

memlim.delete("a"); // delete

memlim.freeSize; // total free size
memlim.usedSize; // total used size 
memlim.dataCount; // total data count

memlim.clear(); // clear all data
```

## Overwrite Policies

Memlim will try to reuse space for new data when total used size exceeded the limitation.  
By default, memlim deletes data which was accessed (by `put/get`) at the oldest date.  

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

#### custom compare function

You can pass arbitrary compare function between entries.  
When compare function was given, memlim will sort entries by that and delete the last entry recursively until total free size exceeds size to be added.

```js
const memlim = new Memlim(12, {
    overwrite: (a, b) => a.data.localCompare(b.data)
});
memlim.put("a", "11");
memlim.put("b", "22");
memlim.put("c", "01");
// will delete b("22")
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