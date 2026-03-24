# Thermal Shift

一个基于 `Java Spring Boot + React` 的摄氏度 / 华氏度转换器。

## 技术栈

- 后端：Spring Boot 3
- 前端：React + Vite
- 风格：实时转换、渐变氛围背景、温度仪表盘、历史记录面板

## 运行方式

### 1. 启动后端

```bash
cd backend
mvn spring-boot:run
```

后端默认地址：`http://localhost:8080`

### 2. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端默认地址：`http://localhost:5173`

如需地图功能，请在 `frontend/.env.local` 中配置：

```bash
VITE_MAPBOX_TOKEN=your_mapbox_token
```

开发环境下，Vite 已代理 `/api` 到后端。

## 可用接口

```bash
GET /api/v1/health
GET /api/v1/convert?value=26&from=C&to=F
```

示例返回：

```json
{
  "inputValue": 26.0,
  "outputValue": 78.8,
  "fromUnit": "CELSIUS",
  "toUnit": "FAHRENHEIT",
  "formula": "F = C x 9 / 5 + 32",
  "climateTag": "Comfort"
}
```
