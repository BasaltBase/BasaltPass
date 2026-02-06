# 前端开发指南

## 技术栈

- React 18 + TypeScript
- Vite
- Tailwind CSS

## 多控制台 apps

前端按控制台拆分：
- admin
- tenant
- user

开发脚本启动后常用端口：
- user：5173
- tenant：5174
- admin：5175

## 与后端联调

- 后端默认：`http://localhost:8080`
- 若使用 dev container / 端口转发，注意 CORS 与 AllowCredentials 组合。

> develop 环境下后端 CORS 会更宽松（允许任意 Origin，但会回显 Origin）。
