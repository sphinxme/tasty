# tasty

## 概述
使用WebRTC实现“一起看”功能的在线影视项目.(PoC阶段)

文件目录如下:
- `index.ts`: 信令服务器(使用bun构建)
- `index.html`: 前端页面

## 依赖
1. Kurento服务器  
地址要在`index.ts`文件的的全局变量`kurentoServer`中配置
2. [可选]stun/turn服务器  
目前默认使用了google的公共stun服务器(stun:stun.l.google.com:19302)  
如需自定义地址, 需要改动:  
    1. `index.html`中的`var stunServer`的值
    2. `index.ts`中`const stunServer`的值

## 运行
- 启动kurento server:  
请参照kurento官方文档运行

- 运行信令服务器:  
    ``` typescript
    bun install
    bun run index.ts
    ```

- 要访问前端页面:  
浏览器直接打开`./index.html`

