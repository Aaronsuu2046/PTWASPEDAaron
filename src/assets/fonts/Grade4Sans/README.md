# Grade4Sans（四年級無注音字型）

- 字型：源泉圓體 TW Medium（GenSenMaruGothicTW-Medium），作者 ButTaiwan
- 版本：1.301（取自 npm 套件 `@fontpkg/gen-sen-maru-gothic-tw-ttf@1.301.0`）
- 授權：SIL Open Font License 1.1（https://openfontlicense.org）
- 原始專案：https://github.com/ButTaiwan/gensen-font

## 子集化

原檔約 14 MB，為了網頁載入速度只保留：

- Big5 常用字與 Big5 符號區
- 專案 `src/`、`public/` 中出現過的所有字元
- ASCII、全形符號與常用標點

並轉成 woff2（約 1 MB）。題庫若加入不在範圍內的罕用字，會改用系統字型顯示該字；
需要時可用 fontTools 重新產生：

```
pip install fonttools brotli
pyftsubset GenSenMaruGothicTW-Medium.ttf --unicodes-file=<字元清單> \
  --flavor=woff2 --layout-features='*' --output-file=GenSenMaruGothicTW-Medium.subset.woff2
```
