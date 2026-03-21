# 🎨 Electron 圖示設定指南

*配置應用圖示*

---

## 目前狀態

✅ 專案已配置為使用 `public/favicon.ico` 作為 Windows 應用圖示。

---

## 快速步驟

### 1️⃣ 準備：將 SVG 轉換為 ICO

選擇以下任意方法：

#### 方法 A：線上轉換（推薦 - 最簡單）

1. 前往轉換網站
   - https://convertio.co/zh/svg-ico/
   - 或其他線上轉換工具

2. 上傳圖示
   - 選擇 `public/favicon.svg`

3. 轉換設置
   - 輸出格式：ICO
   - 大小：保持默認或選擇 256x256

4. 下載
   - 下載轉換後的 `.ico` 文件

#### 方法 B：使用 ImageMagick（需要安裝）

前提：已安裝 ImageMagick

```bash
convert public/favicon.svg \
  -define icon:auto-resize=256,128,96,64,48,32,16 \
  public/favicon.ico
```

#### 方法 C：使用 Pillow (Python)

前提：已安裝 Python 和 Pillow

```bash
python -c "
from PIL import Image
img = Image.open('public/favicon.svg')
img.save('public/favicon.ico')
"
```

#### 方法 D：其他線上工具

- [CloudConvert](https://cloudconvert.com/svg-to-ico)
- [AnyConv](https://anyconv.com/zh/svg-to-ico/)
- [Online-Convert](https://image.online-convert.com/zh/convert-to-ico)

### 2️⃣ 放置檔案

將轉換後的 `favicon.ico` 複製到：

```
public/
├── favicon.svg      (原始 SVG 圖示)
├── favicon.ico      ← 放在這裡（新增）
└── ... (其他文件)
```

### 3️⃣ 驗證並構建

```bash
# 確認文件存在
ls public/favicon.ico

# 或在 Windows 上
dir public\favicon.ico

# 構建應用
npm run electron-build
```

---

## 配置文件

### package.json 配置

```json
{
  "build": {
    "win": {
      "icon": "public/favicon.ico"
    }
  }
}
```

### electron/main.ts 配置

```typescript
const mainWindow = new BrowserWindow({
  icon: path.join(__dirname, '../public/favicon.ico'),
  // ... 其他配置
});
```

---

## 預期結果

✅ 構建完成後，生成的 `.exe` 文件會使用你的圖示

```
dist/
├── Markdown Live Previewer Setup 0.0.0.exe
│   └─ 圖示：你的 favicon.ico
├── Markdown Live Previewer 0.0.0.exe
│   └─ 圖示：你的 favicon.ico
└── ... (其他文件)
```

### 圖示在以下地方出現

✅ **應用窗口標題欄** - 窗口左上角的小圖示  
✅ **文件管理器** - 雙擊運行時的圖示  
✅ **開始菜單** - Windows 開始菜單中的圖示  
✅ **桌面快捷方式** - 如果創建了快捷方式  
✅ **任務欄** - 應用運行時的任務欄圖示  

---

## 圖示格式要求

### ICO 格式規範

```
推薦規格：
├─ 大小：256x256 像素（或更大）
├─ 格式：ICO
├─ 色深：24-bit 或 32-bit
├─ 透明度：支持
└─ 多分辨率：包含 256, 128, 64, 48, 32, 16 px 版本
```

### 圖示設計建議

```
✅ 簡潔設計
   - 在小尺寸下也能清晰識別
   - 避免過於複雜的細節

✅ 使用顏色
   - 對比度高，易於識別
   - 避免純白或純黑背景

✅ 考慮透明度
   - 透明背景在桌面上看起來更好
   - ICO 支持完整的 Alpha 通道

❌ 避免
   - 過小的文字
   - 過於細的線條
   - 類似系統圖示的設計（避免混淆）
```

---

## 故障排除

### Q1：打包失敗 - 找不到圖示

**錯誤信息：**
```
⨯ open : The system cannot find the file specified
```

**原因：** `public/favicon.ico` 不存在

**解決：**
```bash
# 1. 檢查文件是否存在
ls public/favicon.ico

# 2. 如果不存在，進行轉換
# 使用上面的方法 A/B/C/D 進行轉換

# 3. 確認文件格式
file public/favicon.ico
# 應該輸出: 類似 "MS Windows icon resource"
```

### Q2：圖示質量差

**原因：** ICO 轉換質量問題

**解決：**
1. 確保原始 SVG 質量好
2. 在轉換時選擇較高的分辨率
3. 試試其他轉換工具

### Q3：打開安裝程序後圖示不顯示

**原因：** 可能是 NSIS 安裝程序的配置

**解決：**
```json
{
  "build": {
    "nsis": {
      "installerIcon": "public/favicon.ico",
      "uninstallerIcon": "public/favicon.ico",
      "installerHeaderIcon": "public/favicon.ico"
    }
  }
}
```

### Q4：多平台圖示配置

**對於 macOS：**
```json
{
  "build": {
    "mac": {
      "icon": "public/favicon.icns"
    }
  }
}
```

**對於 Linux：**
```json
{
  "build": {
    "linux": {
      "icon": "public/favicon.png"
    }
  }
}
```

---

## 高級：使用 electron-icon-builder

如果需要一次性生成多個平台的圖示，可以使用工具：

### 安裝工具

```bash
npm install --save-dev electron-icon-builder
```

### 生成圖示

```bash
npx electron-icon-builder --input=public/favicon.svg --output=public/icons
```

### 生成的圖示

```
public/icons/
├── 256x256.png       (Linux)
├── favicon.ico       (Windows)
├── favicon.icns      (macOS)
└── ... (其他尺寸)
```

### 更新配置

```json
{
  "build": {
    "win": {
      "icon": "public/icons/favicon.ico"
    },
    "mac": {
      "icon": "public/icons/favicon.icns"
    },
    "linux": {
      "icon": "public/icons/256x256.png"
    }
  }
}
```

---

## 最小化設置

如果暫時不想配置圖示，可以跳過此步驟：

```bash
# 直接使用默認圖示進行構建
npm run electron-build
```

electron-builder 會使用默認的 Electron 圖示。

---

## 驗證清單

構建前檢查：

- [ ] `public/favicon.ico` 文件存在
- [ ] 文件格式正確（ICO 格式）
- [ ] 文件大小合理（通常 10-100 KB）
- [ ] package.json 中的 `build.win.icon` 指向正確路徑
- [ ] electron/main.ts 中的 icon 路徑正確

構建後驗證：

- [ ] `.exe` 文件生成成功
- [ ] 右鍵查看文件屬性，圖示顯示正確
- [ ] 運行 `.exe`，窗口標題欄顯示圖示
- [ ] 安裝後，開始菜單中顯示正確的圖示

---

## 相關資源

- [Windows ICO 格式規範](https://en.wikipedia.org/wiki/ICO_(file_format))
- [Electron icon-builder](https://github.com/electron-userland/electron-icon-builder)
- [electron-builder 官方文檔](https://www.electron.build/icons)

---

**需要幫助？** 查看 [檢查清單](./electron-setup-checklist.md) 或 [文檔索引](./ELECTRON-INDEX.md)

---

**最後更新：2026 年 3 月 22 日**
